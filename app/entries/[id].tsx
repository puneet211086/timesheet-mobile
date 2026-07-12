import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors, radius, spacing } from '../../constants/theme';
import NativeDateTimeField from '../../components/NativeDateTimeField';
import type { Job, TimeEntry } from '../../types/models';
import {
  combineLocalDateAndTime,
  localDateInputValue,
  localTimeInputValue,
  payableDurationSeconds,
} from '../../utils/entry';
import { formatHoursMinutes } from '../../utils/time';

type JobRow = Omit<Job, 'isActive'> & { isActive: number };
type EditableEntry = TimeEntry & { createdAt: string; updatedAt: string };

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export default function EditEntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const entryId = Number(id);
  const router = useRouter();
  const db = useSQLiteContext();

  const [entry, setEntry] = useState<EditableEntry | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobId, setJobId] = useState<number | null>(null);
  const [dateValue, setDateValue] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [breakMinutes, setBreakMinutes] = useState('0');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!Number.isInteger(entryId)) {
        setError('This time entry could not be found.');
        setLoading(false);
        return;
      }

      const [row, jobRows] = await Promise.all([
        db.getFirstAsync<EditableEntry>(
          `SELECT te.id, te.job_id AS jobId, j.name AS jobName,
            j.hourly_rate AS hourlyRate,
            j.overtime_multiplier AS overtimeMultiplier,
            j.color AS jobColor, te.clock_in AS clockIn,
            te.clock_out AS clockOut, te.notes,
            te.unpaid_break_minutes AS unpaidBreakMinutes,
            te.created_at AS createdAt, te.updated_at AS updatedAt
           FROM time_entries te
           JOIN jobs j ON j.id = te.job_id
           WHERE te.id = ?`,
          entryId
        ),
        db.getAllAsync<JobRow>(
          `SELECT id, name, hourly_rate AS hourlyRate,
            overtime_multiplier AS overtimeMultiplier, color,
            is_active AS isActive, created_at AS createdAt,
            updated_at AS updatedAt
           FROM jobs
           ORDER BY is_active DESC, name COLLATE NOCASE`
        ),
      ]);

      if (!row) {
        setError('This time entry could not be found.');
        setLoading(false);
        return;
      }
      if (!row.clockOut) {
        setError('Clock out before editing a running entry.');
        setLoading(false);
        return;
      }

      setEntry(row);
      setJobs(jobRows.map((job) => ({ ...job, isActive: Boolean(job.isActive) })));
      setJobId(row.jobId);
      setDateValue(localDateInputValue(row.clockIn));
      setStartTime(localTimeInputValue(row.clockIn));
      setEndTime(localTimeInputValue(row.clockOut));
      setBreakMinutes(String(row.unpaidBreakMinutes ?? 0));
      setNotes(row.notes ?? '');
      setLoading(false);
    }

    load().catch((loadError) => {
      console.error(loadError);
      setError('The entry could not be loaded.');
      setLoading(false);
    });
  }, [db, entryId]);

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === jobId) ?? null,
    [jobId, jobs]
  );

  const parsedBreakMinutes = Number.parseInt(breakMinutes || '0', 10);

  const preview = useMemo(() => {
    const start = combineLocalDateAndTime(dateValue, startTime);
    const end = combineLocalDateAndTime(dateValue, endTime);
    if (!start || !end || end <= start || !selectedJob) return null;
    if (!Number.isInteger(parsedBreakMinutes) || parsedBreakMinutes < 0) return null;

    const grossSeconds = Math.floor((end.getTime() - start.getTime()) / 1000);
    const seconds = Math.max(0, grossSeconds - parsedBreakMinutes * 60);
    return {
      seconds,
      grossSeconds,
      pay: (seconds / 3600) * selectedJob.hourlyRate,
    };
  }, [dateValue, endTime, parsedBreakMinutes, selectedJob, startTime]);

  const validate = () => {
    if (!selectedJob) return 'Choose a job.';
    const start = combineLocalDateAndTime(dateValue, startTime);
    const end = combineLocalDateAndTime(dateValue, endTime);
    if (!start || !end) return 'Enter a valid date and time.';
    if (end <= start) return 'Clock out must be after clock in.';
    if (!Number.isInteger(parsedBreakMinutes) || parsedBreakMinutes < 0) {
      return 'Break minutes must be a whole number of zero or more.';
    }
    const shiftMinutes = Math.floor((end.getTime() - start.getTime()) / 60000);
    if (parsedBreakMinutes >= shiftMinutes) {
      return 'The unpaid break must be shorter than the shift.';
    }
    return null;
  };

  const save = async () => {
    const validationError = validate();
    if (validationError || !jobId) {
      setError(validationError ?? 'Choose a job.');
      return;
    }

    const start = combineLocalDateAndTime(dateValue, startTime)!;
    const end = combineLocalDateAndTime(dateValue, endTime)!;
    setSaving(true);
    setError(null);

    try {
      await db.runAsync(
        `UPDATE time_entries
         SET job_id = ?, clock_in = ?, clock_out = ?,
             unpaid_break_minutes = ?, notes = ?, updated_at = ?
         WHERE id = ?`,
        jobId,
        start.toISOString(),
        end.toISOString(),
        parsedBreakMinutes,
        notes.trim() || null,
        new Date().toISOString(),
        entryId
      );
      if (Platform.OS !== 'web') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (saveError) {
      console.error(saveError);
      setError('The entry could not be saved.');
      setSaving(false);
    }
  };

  const deleteEntry = async () => {
    setSaving(true);
    setError(null);
    try {
      const result = await db.runAsync('DELETE FROM time_entries WHERE id = ?', entryId);
      if (result.changes === 0) throw new Error('No time entry was deleted.');
      router.back();
    } catch (deleteError) {
      console.error(deleteError);
      setError('The entry could not be deleted.');
      setSaving(false);
    }
  };

  const remove = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Delete this time entry? This action cannot be undone.')) {
        void deleteEntry();
      }
      return;
    }
    Alert.alert('Delete time entry?', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void deleteEntry() },
    ]);
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color={colors.primary} /></View>;
  }

  if (!entry || (error && !dateValue)) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.loadError}>{error}</Text>
          <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
            <Text style={styles.secondaryButtonText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Pressable style={styles.iconButton} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </Pressable>
            <View style={styles.headerText}>
              <Text style={styles.eyebrow}>TIME ENTRY</Text>
              <Text style={styles.title}>Edit shift</Text>
            </View>
          </View>

          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>Paid time after break</Text>
            <Text style={styles.previewDuration}>{preview ? formatHoursMinutes(preview.seconds) : '—'}</Text>
            <Text style={styles.previewPay}>{preview ? currency.format(preview.pay) : 'Check the time range'}</Text>
            {preview && parsedBreakMinutes > 0 ? (
              <Text style={styles.breakPreview}>{parsedBreakMinutes} minutes deducted</Text>
            ) : null}
          </View>

          <View style={styles.formCard}>
            <Text style={styles.label}>Job</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.jobRow}>
              {jobs.map((job) => {
                const selected = job.id === jobId;
                return (
                  <Pressable key={job.id} style={[styles.jobChip, selected && styles.jobChipSelected]} onPress={() => setJobId(job.id)}>
                    <View style={[styles.jobDot, { backgroundColor: job.color }]} />
                    <Text style={[styles.jobChipText, selected && styles.jobChipTextSelected]}>{job.name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <NativeDateTimeField label="Date" mode="date" value={dateValue} onChange={setDateValue} placeholder="YYYY-MM-DD" />

            <View style={styles.timeRow}>
              <View style={styles.timeField}>
                <NativeDateTimeField label="Clock in" mode="time" value={startTime} dateContext={dateValue} onChange={setStartTime} placeholder="08:00" />
              </View>
              <View style={styles.timeField}>
                <NativeDateTimeField label="Clock out" mode="time" value={endTime} dateContext={dateValue} onChange={setEndTime} placeholder="17:00" />
              </View>
            </View>
            {Platform.OS === 'web' ? <Text style={styles.helper}>Use 24-hour time, for example 17:30.</Text> : null}

            <Text style={styles.label}>Unpaid break</Text>
            <View style={styles.breakRow}>
              {[0, 15, 30, 45, 60].map((minutes) => (
                <Pressable
                  key={minutes}
                  style={[styles.breakChip, parsedBreakMinutes === minutes && styles.breakChipSelected]}
                  onPress={() => setBreakMinutes(String(minutes))}
                >
                  <Text style={[styles.breakChipText, parsedBreakMinutes === minutes && styles.breakChipTextSelected]}>
                    {minutes === 0 ? 'None' : `${minutes}m`}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              style={styles.input}
              value={breakMinutes}
              onChangeText={(value) => setBreakMinutes(value.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              placeholder="Custom minutes"
            />
            <Text style={styles.helper}>Unpaid break time is removed from paid hours and earnings.</Text>

            <Text style={styles.label}>Notes</Text>
            <TextInput style={[styles.input, styles.notesInput]} value={notes} onChangeText={setNotes} multiline placeholder="Optional notes" />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable style={[styles.saveButton, saving && styles.disabledButton]} onPress={() => void save()} disabled={saving}>
              {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveButtonText}>Save changes</Text>}
            </Pressable>

            <Pressable style={styles.deleteButton} onPress={remove} disabled={saving}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
              <Text style={styles.deleteButtonText}>Delete entry</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  content: { padding: 20, paddingBottom: 44 },
  header: { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 20 },
  iconButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  headerText: { marginLeft: 14 },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1.3 },
  title: { color: colors.text, fontSize: 30, fontWeight: '900', marginTop: 2 },
  previewCard: { backgroundColor: colors.dark, borderRadius: radius.lg, padding: spacing.xl, marginBottom: spacing.lg },
  previewLabel: { color: colors.textSoft, fontSize: 13, fontWeight: '700' },
  previewDuration: { color: colors.white, fontSize: 36, fontWeight: '900', marginTop: 8 },
  previewPay: { color: '#93C5FD', fontSize: 16, fontWeight: '800', marginTop: 5 },
  breakPreview: { color: '#FBBF24', fontSize: 12, fontWeight: '800', marginTop: 8 },
  formCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  label: { color: colors.text, fontSize: 14, fontWeight: '800', marginBottom: 8, marginTop: 15 },
  jobRow: { gap: 8, paddingRight: 12 },
  jobChip: { flexDirection: 'row', alignItems: 'center', borderRadius: 999, paddingHorizontal: 13, paddingVertical: 10, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border },
  jobChipSelected: { backgroundColor: '#E8EFFF', borderColor: '#AFC5FF' },
  jobDot: { width: 9, height: 9, borderRadius: 5, marginRight: 7 },
  jobChipText: { color: colors.textMuted, fontWeight: '700' },
  jobChipTextSelected: { color: colors.primary },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 13, color: colors.text, fontSize: 16 },
  timeRow: { flexDirection: 'row', gap: 12 },
  timeField: { flex: 1 },
  helper: { color: colors.textSoft, fontSize: 12, marginTop: 7 },
  breakRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  breakChip: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 999, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border },
  breakChipSelected: { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' },
  breakChipText: { color: colors.textMuted, fontWeight: '800', fontSize: 12 },
  breakChipTextSelected: { color: '#B45309' },
  notesInput: { minHeight: 96, textAlignVertical: 'top' },
  error: { color: colors.danger, fontSize: 13, fontWeight: '700', marginTop: 14 },
  saveButton: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 17, alignItems: 'center', marginTop: spacing.lg },
  saveButtonText: { color: colors.white, fontSize: 16, fontWeight: '900' },
  disabledButton: { opacity: 0.6 },
  deleteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 17, gap: 8 },
  deleteButtonText: { color: colors.danger, fontSize: 15, fontWeight: '800' },
  loadError: { color: colors.textMuted, textAlign: 'center', fontSize: 16, marginTop: 12, marginBottom: 18 },
  secondaryButton: { backgroundColor: colors.surface, paddingHorizontal: 20, paddingVertical: 13, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  secondaryButtonText: { color: colors.text, fontWeight: '800' },
});
