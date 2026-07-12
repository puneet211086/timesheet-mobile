import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const CHANNEL_ID = 'shift-reminders';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Shift reminders',
    description: 'Reminders for shifts that may still be running.',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    sound: 'default',
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  await ensureAndroidChannel();

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function scheduleForgottenClockOutReminder(
  hours: number,
  jobName: string
): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  const allowed = await requestNotificationPermission();
  if (!allowed) return null;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Still clocked in?',
      body: `Your ${jobName} shift has been running for ${hours} hours. Open the app to review or clock out.`,
      sound: 'default',
      data: { url: '/' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(60, Math.round(hours * 60 * 60)),
      channelId: Platform.OS === 'android' ? CHANNEL_ID : undefined,
    },
  });
}

export async function cancelScheduledReminder(
  identifier?: string | null
): Promise<void> {
  if (Platform.OS === 'web' || !identifier) return;

  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch (error) {
    console.warn('Unable to cancel scheduled shift reminder.', error);
  }
}

export async function sendTestNotification(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const allowed = await requestNotificationPermission();
  if (!allowed) return false;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Timesheet reminders are ready',
      body: 'You will be reminded when a shift runs longer than your selected limit.',
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 2,
      channelId: Platform.OS === 'android' ? CHANNEL_ID : undefined,
    },
  });

  return true;
}
