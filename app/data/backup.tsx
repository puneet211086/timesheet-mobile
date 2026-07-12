import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  type BackupPreview,
  exportBackup,
  getCurrentDataSummary,
  pickBackupForPreview,
  restoreBackup,
} from '../../services/backupService';

type LocalSummary = {
  jobs: number;
  shifts: number;
  templates: number;
};

function formatDate(value: string | null): string {
  if (!value) return 'None';

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function BackupRestoreScreen() {
  const db = useSQLiteContext();
  const [exporting, setExporting] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [localSummary, setLocalSummary] = useState<LocalSummary | null>(null);

  const refreshLocalSummary = async () => {
    setLocalSummary(await getCurrentDataSummary(db));
  };

  useEffect(() => {
    refreshLocalSummary().catch(console.error);
  }, []);

  const handleExport = async () => {
    setExporting(true);

    try {
      await exportBackup(db);
      Alert.alert(
        'Backup ready',
        Platform.OS === 'web'
          ? 'The backup was downloaded.'
          : 'Choose where you want to save or share the backup.',
      );
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

  const chooseBackup = async () => {
    setSelecting(true);

    try {
      const nextPreview = await pickBackupForPreview();
      if (nextPreview) setPreview(nextPreview);
    } catch (error) {
      console.error(error);
      setPreview(null);
      Alert.alert(
        'Backup rejected',
        error instanceof Error
          ? error.message
          : 'The selected file could not be validated.',
      );
    } finally {
      setSelecting(false);
    }
  };

  const performRestore = async () => {
    if (!preview) return;

    setRestoring(true);

    try {
      const summary = await restoreBackup(db, preview.backup);
      await refreshLocalSummary();
      setPreview(null);

      Alert.alert(
        'Restore complete',
        `${summary}\n\nFace ID and scheduled notification identifiers were not restored.`,
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
    if (!preview) return;

    Alert.alert(
      'Replace local data?',
      `This will replace ${localSummary?.jobs ?? 0} jobs, ${
        localSummary?.shifts ?? 0
      } shifts, and ${
        localSummary?.templates ?? 0
      } templates currently on this device.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore Backup',
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
          <Ionicons name="shield-checkmark-outline" size={32} color="#2563EB" />
        </View>

        <Text style={styles.title}>Protect your timesheets</Text>
        <Text style={styles.subtitle}>
          Export a complete local backup or inspect a backup before restoring
          it onto this device.
        </Text>

        <View style={styles.currentCard}>
          <Text style={styles.sectionLabel}>CURRENT DEVICE</Text>
          <View style={styles.countRow}>
            <Count value={localSummary?.jobs ?? 0} label="Jobs" />
            <Count value={localSummary?.shifts ?? 0} label="Shifts" />
            <Count value={localSummary?.templates ?? 0} label="Templates" />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Export backup</Text>
          <Text style={styles.cardDescription}>
            Save jobs, shifts, templates, breaks, and most preferences to a
            portable JSON file.
          </Text>

          <Pressable
            disabled={exporting || selecting || restoring}
            onPress={() => void handleExport()}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
              (exporting || selecting || restoring) && styles.disabled,
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
          <Text style={styles.cardTitle}>Inspect a backup</Text>
          <Text style={styles.cardDescription}>
            Choose a backup file. Nothing is changed until you review the
            contents and confirm the restore.
          </Text>

          <Pressable
            disabled={selecting || exporting || restoring}
            onPress={() => void chooseBackup()}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.pressed,
              (selecting || exporting || restoring) && styles.disabled,
            ]}
          >
            {selecting ? (
              <ActivityIndicator color="#2563EB" />
            ) : (
              <Ionicons name="folder-open-outline" size={21} color="#2563EB" />
            )}
            <Text style={styles.secondaryText}>Choose backup file</Text>
          </Pressable>
        </View>

        {preview ? (
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <View style={styles.previewIcon}>
                <Ionicons
                  name="document-text-outline"
                  size={24}
                  color="#2563EB"
                />
              </View>
              <View style={styles.previewCopy}>
                <Text style={styles.previewTitle}>Backup preview</Text>
                <Text style={styles.previewFilename} numberOfLines={1}>
                  {preview.filename}
                </Text>
              </View>
            </View>

            <Detail label="Exported" value={formatDateTime(preview.exportedAt)} />
            <Detail label="Jobs" value={String(preview.jobs)} />
            <Detail label="Shifts" value={String(preview.shifts)} />
            <Detail label="Templates" value={String(preview.templates)} />
            <Detail
              label="Shift range"
              value={`${formatDate(preview.earliestShift)} – ${formatDate(
                preview.latestShift,
              )}`}
            />

            {preview.warnings.map((warning) => (
              <View key={warning} style={styles.warning}>
                <Ionicons name="warning-outline" size={19} color="#92400E" />
                <Text style={styles.warningText}>{warning}</Text>
              </View>
            ))}

            <Pressable
              disabled={restoring}
              onPress={confirmRestore}
              style={({ pressed }) => [
                styles.restoreButton,
                pressed && styles.pressed,
                restoring && styles.disabled,
              ]}
            >
              {restoring ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Ionicons name="refresh-outline" size={21} color="#FFFFFF" />
              )}
              <Text style={styles.restoreText}>Replace data with this backup</Text>
            </Pressable>

            <Pressable
              disabled={restoring}
              onPress={() => setPreview(null)}
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.cancelText}>Clear selection</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.notice}>
          <Ionicons name="lock-closed-outline" size={21} color="#475569" />
          <Text style={styles.noticeText}>
            Backup files may contain pay rates and notes. Store them somewhere
            private. Face ID settings and scheduled notification identifiers
            are intentionally excluded.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Count({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.count}>
      <Text style={styles.countValue}>{value}</Text>
      <Text style={styles.countLabel}>{label}</Text>
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
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
  currentCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    padding: 18,
    marginTop: 14,
  },
  sectionLabel: {
    color: '#2563EB',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  countRow: {
    flexDirection: 'row',
    marginTop: 15,
  },
  count: {
    flex: 1,
  },
  countValue: {
    color: '#0F172A',
    fontSize: 24,
    fontWeight: '800',
  },
  countLabel: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 3,
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
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  previewIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    marginRight: 12,
  },
  previewCopy: { flex: 1 },
  previewTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
  },
  previewFilename: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
    paddingVertical: 11,
    gap: 16,
  },
  detailLabel: {
    color: '#64748B',
    fontSize: 13,
  },
  detailValue: {
    flex: 1,
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
  warning: {
    flexDirection: 'row',
    gap: 9,
    backgroundColor: '#FFFBEB',
    borderRadius: 13,
    padding: 12,
    marginTop: 10,
  },
  warningText: {
    flex: 1,
    color: '#92400E',
    fontSize: 12,
    lineHeight: 18,
  },
  restoreButton: {
    minHeight: 52,
    borderRadius: 15,
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    marginTop: 18,
  },
  restoreText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  cancelButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
  },
  cancelText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '700',
  },
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
