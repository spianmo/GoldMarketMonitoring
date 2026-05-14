import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

let initialized = false;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function ensurePermission(): Promise<boolean> {
  if (initialized) {
    const cur = await Notifications.getPermissionsAsync();
    return cur.granted || cur.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  }
  initialized = true;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('gold-alerts', {
      name: '金价提醒',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#E0A82E',
    });
  }

  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

export async function fire(title: string, body: string, opts?: { sound?: boolean }): Promise<void> {
  const ok = await ensurePermission();
  if (!ok) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: opts?.sound ? 'default' : undefined,
    },
    trigger: null,
  });
}
