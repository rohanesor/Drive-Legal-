package com.drivelegal;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.Context;
import android.location.Location;
import android.os.Build;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;

import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;

/**
 * DriveLegalLocationService - Android Foreground Service for continuous GPS monitoring
 * 
 * PURPOSE:
 * Runs in the background to track the user's location and detect when they enter
 * traffic law zones (accident-prone areas, school zones, state borders).
 * 
 * HOW IT WORKS:
 * 1. When user enables "Location Alerts" in settings, this service starts
 * 2. It polls GPS every 30 seconds or every 100 meters (whichever comes first)
 * 3. On each location update, it broadcasts the coordinates to React Native
 * 4. React Native sends the coordinates to Python for zone checking
 * 5. If a zone is detected, a notification is shown to the user
 * 
 * FOREGROUND SERVICE:
 * Android 8+ requires a persistent notification for any background location tracking.
 * This is why users see "DriveLegal is monitoring your location" notification.
 */
public class DriveLegalLocationService extends Service {

    private static final String TAG = "DriveLegalLocation";
    private static final String CHANNEL_ID = "drivelegal_location_channel";
    private static final int NOTIFICATION_ID = 1;

    private FusedLocationProviderClient fusedLocationClient;
    private LocationCallback locationCallback;
    private LocationRequest locationRequest;

    @Override
    public void onCreate() {
        super.onCreate();
        // Initialize the Google location provider
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this);
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "Location service started");

        // Show persistent notification (required by Android for background location)
        Notification notification = createNotification();
        startForeground(NOTIFICATION_ID, notification);

        // Start receiving GPS updates
        startLocationUpdates();
        return START_STICKY; // Auto-restart if system kills the service
    }

    /**
     * Creates the notification channel for Android 8+
     * This channel controls how the persistent notification appears
     */
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "DriveLegal Location Monitoring",
                NotificationManager.IMPORTANCE_LOW // Low = no sound, minimal disruption
            );
            channel.setDescription("Monitoring your location for traffic law alerts");
            channel.setSound(null, null); // Silent notification
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    /**
     * Creates the persistent notification shown while monitoring
     */
    private Notification createNotification() {
        // Tap notification to open the app
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, notificationIntent,
            PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("DriveLegal")
            .setContentText("Monitoring location for traffic alerts")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pendingIntent)
            .setOngoing(true) // Cannot be swiped away
            .build();
    }

    /**
     * Starts GPS location updates
     * Polls every 30 seconds OR every 100 meters moved
     */
    private void startLocationUpdates() {
        locationRequest = new LocationRequest.Builder(
            Priority.PRIORITY_BALANCED_POWER_ACCURACY, // Battery-efficient mode
            30000)  // 30 seconds between updates
            .setMinUpdateDistanceMeters(100)  // Or every 100 meters
            .build();

        locationCallback = new LocationCallback() {
            @Override
            public void onLocationResult(@NonNull LocationResult locationResult) {
                Location location = locationResult.getLastLocation();
                if (location != null) {
                    Log.d(TAG, "Location: " + location.getLatitude() + ", " + location.getLongitude());
                    // Broadcast coordinates to React Native
                    broadcastLocationUpdate(location);
                }
            }
        };

        try {
            fusedLocationClient.requestLocationUpdates(
                locationRequest, locationCallback, Looper.getMainLooper()
            );
        } catch (SecurityException e) {
            Log.e(TAG, "Location permission not granted", e);
        }
    }

    /**
     * Sends location data to React Native via broadcast intent
     * React Native listens for these broadcasts and calls Python for zone checking
     */
    private void broadcastLocationUpdate(Location location) {
        Intent intent = new Intent("com.drivelegal.LOCATION_UPDATE");
        intent.putExtra("latitude", location.getLatitude());
        intent.putExtra("longitude", location.getLongitude());
        intent.putExtra("accuracy", location.getAccuracy());
        sendBroadcast(intent);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        Log.d(TAG, "Location service stopped");
        // Clean up GPS listener to save battery
        if (locationCallback != null) {
            fusedLocationClient.removeLocationUpdates(locationCallback);
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null; // Not a bound service - runs independently
    }
}
