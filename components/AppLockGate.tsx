import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useSQLiteContext } from 'expo-sqlite';
import { PropsWithChildren, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  AppStateStatus,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function AppLockGate({ children }: PropsWithChildren) {
  const db = useSQLiteContext();
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const authenticating = useRef(false);
  const [checking, setChecking] = useState(Platform.OS !== 'web');
  const [enabled, setEnabled] = useState(false);
  const [locked, setLocked] = useState(false);
  const [message, setMessage] = useState('Authenticate to open your timesheet.');

  const readEnabledSetting = useCallback(async () => {
    if (Platform.OS === 'web') {
      setEnabled(false);
      setLocked(false);
      setChecking(false);
      return false;
    }

    const row = await db.getFirstAsync<{ value: string }>(
      `SELECT value FROM app_settings WHERE key = ?`,
      'app_lock_enabled',
    );
    const isEnabled = row?.value === 'true';
    setEnabled(isEnabled);
    setChecking(false);
    return isEnabled;
  }, [db]);

  const authenticate = useCallback(async () => {
    if (Platform.OS === 'web' || authenticating.current) return;

    authenticating.current = true;
    setMessage('Authenticate to open your timesheet.');

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Timesheet Mobile',
        fallbackLabel: 'Use Passcode',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        setLocked(false);
        setMessage('Authenticate to open your timesheet.');
      } else {
        setLocked(true);
        setMessage('Authentication was not completed. Tap below to try again.');
      }
    } catch (error) {
      console.error('App unlock failed', error);
      setLocked(true);
      setMessage('Unable to authenticate. Tap below to try again.');
    } finally {
      authenticating.current = false;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      const isEnabled = await readEnabledSetting();
      if (!mounted || !isEnabled) return;
      setLocked(true);
      await authenticate();
    })();

    return () => {
      mounted = false;
    };
  }, [authenticate, readEnabledSetting]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const subscription = AppState.addEventListener('change', (nextState) => {
      const wasInactive = /inactive|background/.test(appState.current);
      appState.current = nextState;

      if (nextState !== 'active' || !wasInactive) return;

      void (async () => {
        const isEnabled = await readEnabledSetting();
        if (!isEnabled) {
          setLocked(false);
          return;
        }

        setLocked(true);
        await authenticate();
      })();
    });

    return () => subscription.remove();
  }, [authenticate, readEnabledSetting]);

  if (checking) {
    return (
      <SafeAreaView style={styles.screen}>
        <ActivityIndicator size="large" color="#2563EB" />
      </SafeAreaView>
    );
  }

  if (!enabled || !locked) return <>{children}</>;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.iconBox}>
        <Ionicons name="lock-closed-outline" size={38} color="#2563EB" />
      </View>
      <Text style={styles.title}>Timesheet Locked</Text>
      <Text style={styles.message}>{message}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => void authenticate()}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Ionicons name="scan-outline" size={21} color="#FFFFFF" />
        <Text style={styles.buttonText}>Unlock</Text>
      </Pressable>
      <Text style={styles.privacyText}>
        Your timesheet remains stored locally on this device.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F7F8FC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  iconBox: {
    width: 82,
    height: 82,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
  },
  title: {
    color: '#0F172A',
    fontSize: 27,
    fontWeight: '800',
    marginTop: 20,
  },
  message: {
    color: '#64748B',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 9,
    maxWidth: 330,
  },
  button: {
    minWidth: 190,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    marginTop: 24,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  privacyText: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 22,
  },
  pressed: {
    opacity: 0.78,
  },
});
