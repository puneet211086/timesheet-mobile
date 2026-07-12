import { usePathname, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import {
  PropsWithChildren,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

export default function OnboardingGate({ children }: PropsWithChildren) {
  const db = useSQLiteContext();
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  const checkOnboarding = useCallback(async () => {
    const row = await db.getFirstAsync<{ value: string }>(
      `SELECT value
       FROM app_settings
       WHERE key = ?`,
      'onboarding_completed',
    );

    const completed = row?.value === 'true';

    if (!completed && pathname !== '/onboarding') {
      router.replace('/onboarding');
    }

    if (completed && pathname === '/onboarding') {
      router.replace('/');
    }

    setReady(true);
  }, [db, pathname, router]);

  useEffect(() => {
    checkOnboarding().catch((error) => {
      console.error('Unable to check onboarding status', error);
      setReady(true);
    });
  }, [checkOnboarding]);

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F8FC',
  },
});
