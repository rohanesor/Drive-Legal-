import PushNotification from 'react-native-push-notification';
import { Platform } from 'react-native';
import { store } from '../store';

export const notificationService = {
  /**
   * Configures the push notification listener and registers token.
   */
  configure(): void {
    PushNotification.configure({
      onRegister: function (token) {
        console.log('[NotificationService] FCM Token registered:', token);
      },

      onNotification: function (notification) {
        console.log('[NotificationService] Notification received:', notification);
        
        // Handle tapping of notifications here
        if (notification.userInteraction) {
          const data = notification.data || {};
          const screen = data.screen;
          const alertId = data.alertId;

          // Note: In a production app, we would dispatch navigation actions here.
          console.log(`[NotificationService] User tapped notification to open screen: ${screen} with ID: ${alertId}`);
        }

        // Required on iOS
        if (Platform.OS === 'ios') {
          // notification.finish(PushNotificationIOS.FetchResult.NoData);
        }
      },

      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },

      popInitialNotification: true,
      requestPermissions: Platform.OS === 'ios',
    });
  },

  /**
   * Creates required Android notification channels.
   */
  createChannels(): void {
    if (Platform.OS !== 'android') return;

    // 1. Zone Alerts
    PushNotification.createChannel(
      {
        channelId: 'zone_alerts',
        channelName: 'Zone Alerts',
        channelDescription: 'Notifications for school zones, speed cameras, and state borders',
        importance: 4, // High importance
        vibrate: true,
      },
      (created) => console.log(`[NotificationService] Channel 'zone_alerts' created: ${created}`)
    );

    // 2. Speed Warnings
    PushNotification.createChannel(
      {
        channelId: 'speed_warnings',
        channelName: 'Speed Warnings',
        channelDescription: 'Notifications for overspeeding alerts',
        importance: 3, // Default importance
        vibrate: true,
      },
      (created) => console.log(`[NotificationService] Channel 'speed_warnings' created: ${created}`)
    );

    // 3. Reminders
    PushNotification.createChannel(
      {
        channelId: 'reminders',
        channelName: 'Reminders',
        channelDescription: 'Notifications for license renewal and insurance reminders',
        importance: 2, // Low importance
        vibrate: false,
      },
      (created) => console.log(`[NotificationService] Channel 'reminders' created: ${created}`)
    );

    // 4. Emergency Alerts
    PushNotification.createChannel(
      {
        channelId: 'emergency',
        channelName: 'Emergency Alerts',
        channelDescription: 'High priority notifications for crash detection and SOS alerts',
        importance: 4, // High importance
        vibrate: true,
      },
      (created) => console.log(`[NotificationService] Channel 'emergency' created: ${created}`)
    );
  },

  /**
   * Triggers permission requests dynamically.
   */
  requestPermissions(): void {
    PushNotification.requestPermissions();
  },

  /**
   * Schedules a local notification.
   */
  scheduleLocalNotification(options: {
    channelId: 'zone_alerts' | 'speed_warnings' | 'reminders' | 'emergency';
    title: string;
    message: string;
    data?: Record<string, unknown>;
  }): void {
    try {
      const state = store.getState().settings;

      // 1. Check master notifications setting
      if (!state.notificationsEnabled) {
        console.log('[NotificationService] Notifications are disabled globally');
        return;
      }

      // 2. Check category-specific switch
      if (options.channelId === 'zone_alerts' && !state.zoneAlertsNotificationEnabled) {
        console.log('[NotificationService] Zone Alerts notifications are disabled');
        return;
      }
      if (options.channelId === 'speed_warnings' && !state.speedWarningsNotificationEnabled) {
        console.log('[NotificationService] Speed Warnings notifications are disabled');
        return;
      }
      if (options.channelId === 'reminders' && !state.remindersNotificationEnabled) {
        console.log('[NotificationService] Reminders notifications are disabled');
        return;
      }

      // 3. Dispatch local notification
      console.log(`[NotificationService] Scheduling notification: ${options.title}`);
      PushNotification.localNotification({
        channelId: options.channelId,
        title: options.title,
        message: options.message,
        userInfo: options.data || {},
        playSound: true,
        soundName: 'default',
        vibrate: options.channelId !== 'reminders',
      });
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      console.warn('[NotificationService] Failed to schedule notification:', err.message);
    }
  }
};
