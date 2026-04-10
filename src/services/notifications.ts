/**
 * Push Notification Service for SkySync
 *
 * Handles:
 * - Streak reminder notifications (evening reminder to maintain streak)
 * - Astronomical event alerts (meteor showers, eclipses, oppositions)
 * - Challenge reminders (uncompleted daily challenges)
 * - Room activity notifications
 *
 * Uses Expo Notifications API for cross-platform support.
 * Notifications are scheduled locally - no backend push server needed.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const NOTIF_PREFS_KEY = "@skysync/notification_prefs";
const SCHEDULED_KEY = "@skysync/scheduled_notifications";
const PUSH_TOKEN_KEY = "@skysync/push_token";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

export type NotificationPrefs = {
  streakReminders: boolean;
  eventAlerts: boolean;
  challengeReminders: boolean;
  roomActivity: boolean;
  quietHoursStart: number; // hour 0-23
  quietHoursEnd: number; // hour 0-23
};

export type ScheduledNotification = {
  id: string;
  type: "streak" | "event" | "challenge" | "room";
  title: string;
  body: string;
  scheduledFor: number; // timestamp
  fired: boolean;
};

const DEFAULT_PREFS: NotificationPrefs = {
  streakReminders: true,
  eventAlerts: true,
  challengeReminders: true,
  roomActivity: false,
  quietHoursStart: 23,
  quietHoursEnd: 7,
};

// ------------------------------------------------------------------
// Notification permission and scheduling
// ------------------------------------------------------------------

// expo-notifications is an optional dependency.
// When installed, it provides local notification scheduling.
// When not installed, all notification operations are no-ops.
let expoNotifications: any = null;

async function loadExpoNotifications(): Promise<any> {
  if (expoNotifications) return expoNotifications;
  try {
    // Dynamic require to avoid hard dependency
    expoNotifications = require("expo-notifications");
    return expoNotifications;
  } catch {
    // expo-notifications not installed, use fallback
    return null;
  }
}

async function requestPermissions(): Promise<boolean> {
  const notifications = await loadExpoNotifications();
  if (!notifications) return false;

  try {
    const { status: existingStatus } = await notifications.getPermissionsAsync();
    if (existingStatus === "granted") return true;

    const { status } = await notifications.requestPermissionsAsync();
    return status === "granted";
  } catch {
    return false;
  }
}

async function scheduleLocalNotification(
  title: string,
  body: string,
  triggerDate: Date,
  data?: Record<string, string>,
): Promise<string | null> {
  const notifications = await loadExpoNotifications();
  if (!notifications) return null;

  const hasPermission = await requestPermissions();
  if (!hasPermission) return null;

  try {
    // Check quiet hours
    const prefs = await notificationService.getPrefs();
    const hour = triggerDate.getHours();
    if (hour >= prefs.quietHoursStart || hour < prefs.quietHoursEnd) {
      // Adjust to after quiet hours
      triggerDate.setHours(prefs.quietHoursEnd, 0, 0, 0);
      if (triggerDate.getTime() < Date.now()) {
        triggerDate.setDate(triggerDate.getDate() + 1);
      }
    }

    const id = await notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data ?? {},
        sound: true,
      },
      trigger: {
        type: notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });
    return id;
  } catch {
    return null;
  }
}

async function cancelAllScheduled(): Promise<void> {
  const notifications = await loadExpoNotifications();
  if (!notifications) return;
  try {
    await notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // ignore
  }
}

// ------------------------------------------------------------------
// Notification scheduling logic
// ------------------------------------------------------------------

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function getTomorrowEvening(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(20, 0, 0, 0); // 8 PM
  return d;
}

function getTodayEvening(): Date {
  const d = new Date();
  d.setHours(20, 30, 0, 0); // 8:30 PM
  if (d.getTime() < Date.now()) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

// ------------------------------------------------------------------
// Push notification registration
// ------------------------------------------------------------------

async function registerForPushNotifications(): Promise<string | null> {
  const notifications = await loadExpoNotifications();
  if (!notifications) return null;

  // Check for physical device (push tokens require a real device)
  let Device: any = null;
  try {
    Device = require("expo-device");
  } catch {
    // expo-device not available
  }
  if (Device && !Device.isDevice) {
    console.warn("[SkySync Notifications] Push tokens require a physical device");
    return null;
  }

  // Request permissions
  const hasPermission = await requestPermissions();
  if (!hasPermission) return null;

  try {
    // Get Expo push token
    const tokenData = await notifications.getExpoPushTokenAsync({
      projectId: undefined, // Uses the project ID from app config
    });
    const token = tokenData.data;

    // Store locally
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);

    // If Firebase is enabled, save to Firestore
    try {
      const { isFirebaseEnabled } = require("./roomSyncService");
      if (isFirebaseEnabled) {
        const { authService } = require("./firebase/authService");
        const uid = authService.getCurrentUserId();
        if (uid) {
          const { doc, setDoc } = require("firebase/firestore");
          const { db } = require("./firebase/config");
          await setDoc(
            doc(db, "users", uid),
            { pushToken: token, pushTokenUpdatedAt: new Date().toISOString() },
            { merge: true },
          );
        }
      }
    } catch {
      // Firebase not available or not configured, token saved locally only
    }

    return token;
  } catch (error) {
    console.warn("[SkySync Notifications] Failed to get push token:", error);
    return null;
  }
}

function handleNotificationReceived(notification: any): void {
  // Extract notification data for in-app handling
  const data = notification?.request?.content?.data;
  const title = notification?.request?.content?.title;
  const body = notification?.request?.content?.body;

  console.log("[SkySync Notifications] Foreground notification:", { title, body, data });

  // Type-specific handling
  if (data?.type === "streak") {
    // Could trigger an in-app toast or animation
  } else if (data?.type === "event") {
    // Could navigate to the sky map / event details
  } else if (data?.type === "room") {
    // Could navigate to the room
  }
}

// ------------------------------------------------------------------
// Public API
// ------------------------------------------------------------------

export const notificationService = {
  /**
   * Initialize notifications and configure channel (Android).
   */
  async init(): Promise<void> {
    const notifications = await loadExpoNotifications();
    if (!notifications) return;

    // Set up Android notification channels
    if (Platform.OS === "android") {
      try {
        await Promise.all([
          notifications.setNotificationChannelAsync("default", {
            name: "SkySync",
            importance: notifications.AndroidImportance.DEFAULT,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#73fbd3",
          }),
          notifications.setNotificationChannelAsync("events", {
            name: "Astronomical Events",
            description: "Alerts for meteor showers, eclipses, and other events",
            importance: notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#73fbd3",
          }),
          notifications.setNotificationChannelAsync("streaks", {
            name: "Streak Reminders",
            description: "Daily reminders to maintain your stargazing streak",
            importance: notifications.AndroidImportance.DEFAULT,
            lightColor: "#ffb15f",
          }),
        ]);
      } catch {
        // ignore
      }
    }

    // Register for push notifications
    await registerForPushNotifications();
  },

  /**
   * Get notification preferences.
   */
  async getPrefs(): Promise<NotificationPrefs> {
    try {
      const raw = await AsyncStorage.getItem(NOTIF_PREFS_KEY);
      if (!raw) return DEFAULT_PREFS;
      return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_PREFS;
    }
  },

  /**
   * Save notification preferences.
   */
  async savePrefs(prefs: NotificationPrefs): Promise<void> {
    await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(prefs));
    // Reschedule based on new prefs
    await this.rescheduleAll(prefs);
  },

  /**
   * Schedule streak reminder for tonight or tomorrow.
   * Called after each session.
   */
  async scheduleStreakReminder(currentStreak: number): Promise<void> {
    const prefs = await this.getPrefs();
    if (!prefs.streakReminders) return;

    const messages = [
      { title: "Keep your streak alive! \u{1F525}", body: `You're on a ${currentStreak}-day streak. Open SkySync to keep it going!` },
      { title: "The stars are calling \u2728", body: `${currentStreak} days and counting! Don't break your streak tonight.` },
      { title: "Don't forget to stargaze! \u{1F30C}", body: `Your ${currentStreak}-day streak is at stake. Explore the sky for just a minute.` },
    ];
    const msg = messages[currentStreak % messages.length];
    await scheduleLocalNotification(msg.title, msg.body, getTodayEvening(), { type: "streak" });
  },

  /**
   * Schedule alerts for upcoming astronomical events.
   */
  async scheduleEventAlerts(events: { title: string; date: string; description: string }[]): Promise<void> {
    const prefs = await this.getPrefs();
    if (!prefs.eventAlerts) return;

    const today = getToday();
    for (const event of events.slice(0, 5)) {
      if (event.date <= today) continue;
      const eventDate = new Date(event.date + "T18:00:00");
      // Schedule alert 1 day before
      const alertDate = new Date(eventDate.getTime() - 86400000);
      if (alertDate.getTime() > Date.now()) {
        await scheduleLocalNotification(
          `Tomorrow: ${event.title} \u{1F320}`,
          event.description.slice(0, 100),
          alertDate,
          { type: "event" },
        );
      }
    }
  },

  /**
   * Schedule a challenge reminder if challenges are incomplete.
   */
  async scheduleChallengeReminder(completedCount: number, totalCount: number): Promise<void> {
    const prefs = await this.getPrefs();
    if (!prefs.challengeReminders) return;
    if (completedCount >= totalCount) return;

    const remaining = totalCount - completedCount;
    await scheduleLocalNotification(
      `${remaining} challenge${remaining > 1 ? "s" : ""} remaining! \u{1F3AF}`,
      "Complete your daily challenges before midnight to earn bonus XP.",
      getTodayEvening(),
      { type: "challenge" },
    );
  },

  /**
   * Cancel and reschedule all notifications based on current prefs.
   */
  async rescheduleAll(prefs?: NotificationPrefs): Promise<void> {
    await cancelAllScheduled();
    // Notifications will be rescheduled on next app open based on current state
  },

  /**
   * Check if notifications are supported and permitted.
   */
  async isAvailable(): Promise<boolean> {
    return requestPermissions();
  },

  /**
   * Get pending notification count (for UI badge).
   */
  async getPendingCount(): Promise<number> {
    const notifications = await loadExpoNotifications();
    if (!notifications) return 0;
    try {
      const scheduled = await notifications.getAllScheduledNotificationsAsync();
      return scheduled.length;
    } catch {
      return 0;
    }
  },

  /**
   * Register for push notifications and return the token.
   * Called automatically during init(), but can be called again
   * (e.g., after login to update the Firestore token).
   */
  registerForPushNotifications,

  /**
   * Handle a notification received while the app is in the foreground.
   * Attach this to the notification received listener in the root layout.
   */
  handleNotificationReceived,

  /**
   * Get the locally stored push token (or null if not registered).
   */
  async getPushToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  /**
   * Set up the foreground notification handler.
   * Call this once in the root layout on mount.
   */
  async setupNotificationHandler(): Promise<void> {
    const notifications = await loadExpoNotifications();
    if (!notifications) return;

    notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  },
};
