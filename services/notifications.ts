import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

// How notifications look/sound when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function requestPermissions(): Promise<boolean> {
  if (!Device.isDevice) return false; // simulator — skip

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "BetterChoice",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

async function getExpoPushToken(): Promise<string | null> {
  try {
    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch {
    return null;
  }
}

async function registerTokenWithServer(
  firebaseUid: string,
  pushToken: string,
): Promise<void> {
  await fetch(`${API_BASE}/api/notifications/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ firebaseUid, pushToken }),
  });
}

// ── Scheduled local reminders ─────────────────────────────────────────────────

async function cancelAllScheduled() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

async function scheduleDailyReminders() {
  await cancelAllScheduled();

  const reminders: Array<{
    hour: number;
    minute: number;
    title: string;
    body: string;
    id: string;
  }> = [
    {
      id: "breakfast",
      hour: 8,
      minute: 0,
      title: "Good morning!",
      body: "Log your breakfast to start tracking today's nutrition.",
    },
    {
      id: "lunch",
      hour: 13,
      minute: 0,
      title: "Lunchtime",
      body: "Don't forget to log what you're eating for lunch.",
    },
    {
      id: "dinner",
      hour: 19,
      minute: 30,
      title: "Evening check-in",
      body: "Log your dinner to keep your nutrition data complete.",
    },
    {
      id: "eod",
      hour: 21,
      minute: 0,
      title: "End-of-day recap",
      body: "How did today go? Log any remaining meals before bed.",
    },
  ];

  for (const r of reminders) {
    await Notifications.scheduleNotificationAsync({
      identifier: `daily_${r.id}`,
      content: {
        title: r.title,
        body: r.body,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: r.hour,
        minute: r.minute,
        repeats: true,
      } as Notifications.DailyTriggerInput,
    });
  }
}

// ── Data-driven notifications (call after food is logged) ─────────────────────

export async function checkAndNotifyGoalStatus(
  firebaseUid: string,
): Promise<void> {
  try {
    const res = await fetch(
      `${API_BASE}/api/notifications/status/${firebaseUid}`,
    );
    if (!res.ok) return;

    const { streak, calorieToday, targetCalories, hasLoggedToday } =
      await res.json();

    const pct = targetCalories > 0 ? calorieToday / targetCalories : 0;

    if (pct >= 1.0) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Daily goal reached!",
          body: `You hit your ${targetCalories} kcal target today. Great work!`,
          sound: true,
        },
        trigger: null, // fire immediately
      });
    } else if (pct >= 0.8) {
      const remaining = Math.round(targetCalories - calorieToday);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Almost there",
          body: `Only ${remaining} kcal left to reach your daily goal.`,
          sound: true,
        },
        trigger: null,
      });
    }

    if (streak >= 3) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${streak}-day streak!`,
          body: "You've been logging consistently. Keep it up!",
          sound: true,
        },
        trigger: null,
      });
    }

    if (!hasLoggedToday) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Nothing logged yet",
          body: "Tap to add your first meal of the day.",
          sound: true,
        },
        trigger: null,
      });
    }
  } catch {
    // non-critical — ignore errors
  }
}

// ── Main setup (call once after login) ───────────────────────────────────────

export async function setupNotifications(firebaseUid: string): Promise<void> {
  const granted = await requestPermissions();
  if (!granted) return;

  const token = await getExpoPushToken();
  if (token) {
    await registerTokenWithServer(firebaseUid, token);
  }

  await scheduleDailyReminders();
}
