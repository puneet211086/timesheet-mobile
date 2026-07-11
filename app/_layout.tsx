import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { migrateDatabase } from '../database/db';

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="timesheet.db" onInit={migrateDatabase}>
      <Stack screenOptions={{ headerShown: false }} />
    </SQLiteProvider>
  );
}
