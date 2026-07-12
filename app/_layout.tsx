import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import AppLockGate from '../components/AppLockGate';
import { migrateDatabase } from '../database/db';

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="timesheet.db" onInit={migrateDatabase}>
      <AppLockGate>
        <Stack screenOptions={{ headerBackTitle: 'Back' }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </AppLockGate>
    </SQLiteProvider>
  );
}
