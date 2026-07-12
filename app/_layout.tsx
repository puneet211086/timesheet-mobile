import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import AppLockGate from '../components/AppLockGate';
import PreferencesProvider, {
  usePreferences,
} from '../components/PreferencesProvider';
import { migrateDatabase } from '../database/db';

function AppNavigator() {
  const { theme } = usePreferences();

  return (
    <AppLockGate>
      <Stack
        screenOptions={{
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: theme.colors.card },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </AppLockGate>
  );
}

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="timesheet.db" onInit={migrateDatabase}>
      <PreferencesProvider>
        <AppNavigator />
      </PreferencesProvider>
    </SQLiteProvider>
  );
}
