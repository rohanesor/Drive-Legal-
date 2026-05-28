package com.drivelegal;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.util.Log;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

/**
 * DriveLegalLocationServiceModule - React Native module bridge for foreground service
 * 
 * It manages start/stop calls for the foreground location service,
 * and maintains a BroadcastReceiver that forwards coordinate broadcasts
 * from the service straight to the React Native JS event listener.
 */
public class DriveLegalLocationServiceModule extends ReactContextBaseJavaModule {

    private static final String MODULE_NAME = "DriveLegalLocationService";
    private static final String TAG = "LocationServiceModule";
    private final ReactApplicationContext reactContext;
    private BroadcastReceiver receiver;

    public DriveLegalLocationServiceModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        setupBroadcastReceiver();
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    private void setupBroadcastReceiver() {
        receiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (intent != null && "com.drivelegal.LOCATION_UPDATE".equals(intent.getAction())) {
                    double latitude = intent.getDoubleExtra("latitude", 0.0);
                    double longitude = intent.getDoubleExtra("longitude", 0.0);
                    float accuracy = intent.getFloatExtra("accuracy", 0.0f);

                    Log.d(TAG, "Received broadcast location: " + latitude + ", " + longitude);

                    WritableMap params = Arguments.createMap();
                    params.putDouble("latitude", latitude);
                    params.putDouble("longitude", longitude);
                    params.putDouble("accuracy", accuracy);

                    if (reactContext.hasActiveReactInstance()) {
                        reactContext
                            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                            .emit("onLocationUpdate", params);
                    }
                }
            }
        };

        IntentFilter filter = new IntentFilter("com.drivelegal.LOCATION_UPDATE");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            reactContext.registerReceiver(receiver, filter, Context.RECEIVER_EXPORTED);
        } else {
            reactContext.registerReceiver(receiver, filter);
        }
    }

    @ReactMethod
    public void startService(Promise promise) {
        try {
            Intent serviceIntent = new Intent(reactContext, DriveLegalLocationService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactContext.startForegroundService(serviceIntent);
            } else {
                reactContext.startService(serviceIntent);
            }
            Log.d(TAG, "Foreground location service start requested");
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Failed to start service", e);
            promise.reject("START_SERVICE_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void stopService(Promise promise) {
        try {
            Intent serviceIntent = new Intent(reactContext, DriveLegalLocationService.class);
            reactContext.stopService(serviceIntent);
            Log.d(TAG, "Foreground location service stop requested");
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Failed to stop service", e);
            promise.reject("STOP_SERVICE_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void addListener(String eventName) {
        // Required for NativeEventEmitter compatibility
    }

    @ReactMethod
    public void removeListeners(Integer count) {
        // Required for NativeEventEmitter compatibility
    }
}
