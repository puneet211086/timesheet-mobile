import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import AppLockGate from '../components/AppLockGate';
import OnboardingGate from '../components/OnboardingGate';
import PreferencesProvider from '../components/PreferencesProvider';
import { migrateDatabase } from '../database/db';

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="timesheet.db" onInit={migrateDatabase}>
      <PreferencesProvider>
        <AppLockGate>
          <OnboardingGate>
            <Stack
              screenOptions={{
                headerBackTitle: 'Back',
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="onboarding"
                options={{
                  headerShown: false,
                  gestureEnabled: false,
                }}
              />
              <Stack.Screen name="entries/new" options={{ title: 'Add Shift' }} />
              <Stack.Screen name="entries/[id]" options={{ title: 'Edit Shift' }} />
              <Stack.Screen name="jobs/new" options={{ title: 'New Job' }} />
              <Stack.Screen name="jobs/[id]" options={{ title: 'Edit Job' }} />
              <Stack.Screen name="templates/index" options={{ title: 'Shift Templates' }} />
              <Stack.Screen name="templates/new" options={{ title: 'New Template' }} />
              <Stack.Screen name="data/backup" options={{ title: 'Backup & Restore' }} />
              <Stack.Screen name="preferences" options={{ title: 'Display & Formatting' }} />
              <Stack.Screen name="legal/privacy" options={{ title: 'Privacy Policy' }} />
              <Stack.Screen name="legal/support" options={{ title: 'Support' }} />
              <Stack.Screen name="legal/about" options={{ title: 'About' }} />
            </Stack>
          </OnboardingGate>
        </AppLockGate>
      </PreferencesProvider>
    </SQLiteProvider>
  );
}
