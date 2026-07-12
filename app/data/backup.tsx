import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  chooseAndRestoreBackup,
  createBackup,
  exportBackup,
} from '../../services/backupService';

export default function BackupRestoreScreen() {
  const db = useSQLiteContext();
  const [exporting, setExporting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [counts, setCounts] = useState<{
    jobs: number;
    shifts: number;
    templates: number;
  } | null>(null);

  const refreshCounts = async () => {
    const backup = await createBackup(db);
    setCounts({
      jobs: backup.data.jobs.length,
      shifts: backup.data.timeEntries.length,
      templates: backup.data.shiftTemplates.length,
    });
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportBackup(db);
      await refreshCounts();
    } catch (error) {
      console.error(error);
      Alert.alert(
        'Backup failed',
        error instanceof Error ? error.message : 'Unable to create the backup.',
      );
    } finally {
      setExporting(false);
    }
  };

  const performRestore = async () => {
    setRestoring(true);
    try {
      const result = await chooseAndRestoreBackup(db);
      if (!result.restored) return;

      await refreshCounts();
      Alert.alert(
        'Restore complete',
        `${result.summary}\n\nApp Lock remains disabled or unchanged for your security.`,
      );
    } catch (error) {
      console.error(error);
      Alert.alert(
        'Restore failed',
        error instanceof Error
          ? error.message
          : 'The selected backup could not be restored.',
      );
    } finally {
      setRestoring(false);
    }
  };

  const confirmRestore = () => {
    Alert.alert(
      'Replace local data?',
      'Restoring will replace all current jobs, shifts, templates, and most settings on this device. This cannot be undone unless you export a backup first.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Choose Backup',
          style: 'destructive',
          onPress: () => void performRestore(),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: 'Backup & Restore' }} />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroIcon}>
          <Ionicons name="cloud-download-outline" size={32} color="#2563EB" />
        </View>
        <Text style={styles.title}>Protect your timesheets</Text>
        <Text style={styles.subtitle}>
          Create a portable JSON backup containing your jobs, shifts, templates,
          breaks, and app preferences.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Export backup</Text>
          <Text style={styles.cardDescription}>
            Save the backup to Files, iCloud Drive, email, or another location
            using the iPhone share sheet.
          </Text>
          <Pressable
            disabled={exporting || restoring}
            onPress={() => void handleExport()}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
              (exporting || restoring) && styles.disabled,
            ]}
          >
            {exporting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Ionicons name="share-outline" size={21} color="#FFFFFF" />
            )}
            <Text style={styles.primaryText}>Export complete backup</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Restore backup</Text>
          <Text style={styles.cardDescription}>
            Select a Timesheet Mobile backup file. Current local records will be
            replaced after confirmation.
          </Text>
          <Pressable
            disabled={restoring || exporting}
            onPress={confirmRestore}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.pressed,
              (restoring || exporting) && styles.disabled,
            ]}
          >
            {restoring ? (
              <ActivityIndicator color="#2563EB" />
            ) : (
              <Ionicons name="folder-open-outline" size={21} color="#2563EB" />
            )}
            <Text style={styles.secondaryText}>Choose backup to restore</Text>
          </Pressable>
        </View>

        {counts ? (
          <View style={styles.summary}>
            <Ionicons name="checkmark-circle-outline" size={21} color="#15803D" />
            <Text style={styles.summaryText}>
              Latest export contained {counts.jobs} jobs, {counts.shifts} shifts,
              and {counts.templates} templates.
            </Text>
          </View>
        ) : null}

        <View style={styles.notice}>
          <Ionicons name="shield-checkmark-outline" size={21} color="#475569" />
          <Text style={styles.noticeText}>
            Backup files may contain pay rates and notes. Store them somewhere
            private. Face ID settings and scheduled notification identifiers are
            intentionally not restored.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F8FC' },
  container: { padding: 22, paddingBottom: 44 },
  heroIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  title: {
    color: '#0F172A',
    fontSize: 29,
    lineHeight: 36,
    fontWeight: '800',
    marginTop: 18,
  },
  subtitle: {
    color: '#64748B',
    fontSize: 15,
    lineHeight: 23,
    marginTop: 8,
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginTop: 14,
  },
  cardTitle: { color: '#0F172A', fontSize: 18, fontWeight: '800' },
  cardDescription: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 15,
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    marginTop: 18,
  },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  secondaryButton: {
    minHeight: 52,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    marginTop: 18,
  },
  secondaryText: { color: '#2563EB', fontSize: 15, fontWeight: '800' },
  summary: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 15,
    marginTop: 16,
  },
  summaryText: { flex: 1, color: '#166534', fontSize: 13, lineHeight: 19 },
  notice: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#EEF2F7',
    borderRadius: 16,
    padding: 15,
    marginTop: 16,
  },
  noticeText: { flex: 1, color: '#475569', fontSize: 13, lineHeight: 19 },
  pressed: { opacity: 0.76 },
  disabled: { opacity: 0.5 },
});
