import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import type { Job } from '../../types/models';
import { combineLocalDateAndTime } from '../../utils/entry';
import { formatHoursMinutes } from '../../utils/time';

type JobRow = Omit<Job, 'isActive'> & { isActive: number };

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

function todayInputValue(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function NewEntryScreen() {
  const router = useRouter();
  const db = useSQLiteContext();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobId, setJobId] = useState<number | null>(null);
  const [dateValue, setDateValue] = useState(todayInputValue());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [breakMinutes, setBreakMinutes] = useState('0');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    db.getAllAsync<JobRow>(
      `SELECT id, name, hourly_rate AS hourlyRate,
        overtime_multiplier AS overtimeMultiplier, color,
        is_active AS isActive, created_at AS createdAt,
        updated_at AS updatedAt
       FROM jobs
       WHERE is_active = 1
       ORDER BY name COLLATE NOCASE`
    )
      .then((rows) => {
        const activeJobs = rows.map((job) => ({
          ...job,
          isActive: Boolean(job.isActive),
        }));
        setJobs(activeJobs);
        setJobId(activeJobs[0]?.id ?? null);
      })
      .catch((loadError) => {
        console.error(loadError);
        setError('Jobs could not be loaded.');
      })
      .finally(() => setLoading(false));
  }, [db]);

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
    const paidSeconds = Math.max(0, grossSeconds - parsedBreakMinutes * 60);
    return {
      paidSeconds,
      pay: (paidSeconds / 3600) * selectedJob.hourlyRate,
    };
  }, [dateValue, endTime, parsedBreakMinutes, selectedJob, startTime]);

  const validate = () => {
    if (!selectedJob) return 'Choose an active job.';
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
      setError(validationError ?? 'Choose an active job.');
      return;
    }

    const start = combineLocalDateAndTime(dateValue, startTime)!;
    const end = combineLocalDateAndTime(dateValue, endTime)!;
    setSaving(true);
    setError(null);

    try {
      const overlap = await db.getFirstAsync<{ id: number }>(
        `SELECT id
         FROM time_entries
         WHERE clock_in < ?
           AND COALESCE(clock_out, ?) > ?
         LIMIT 1`,
        end.toISOString(),
        new Date().toISOString(),
        start.toISOString()
      );

      if (overlap) {
        setError('This shift overlaps an existing time entry.');
        setSaving(false);
        return;
      }

      const now = new Date().toISOString();
      await db.runAsync(
        `INSERT INTO time_entries
          (job_id, clock_in, clock_out, notes, unpaid_break_minutes,
           reminder_notification_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, NULL, ?, ?)`,
        jobId,
        start.toISOString(),
        end.toISOString(),
        notes.trim() || null,
        parsedBreakMinutes,
        now,
        now
      );

      router.back();
    } catch (saveError) {
      console.error(saveError);
      setError('The time entry could not be added.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Pressable style={styles.iconButton} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </Pressable>
            <View style={styles.headerText}>
              <Text style={styles.eyebrow}>MANUAL ENTRY</Text>
              <Text style={styles.title}>Add shift</Text>
            </View>
          </View>

          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>Paid time after break</Text>
            <Text style={styles.previewDuration}>
              {preview ? formatHoursMinutes(preview.paidSeconds) : '—'}
            </Text>
            <Text style={styles.previewPay}>
              {preview ? currency.format(preview.pay) : 'Check the time range'}
            </Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.label}>Job</Text>
            {jobs.length === 0 ? (
              <View style={styles.noJobsBox}>
                <Text style={styles.noJobsText}>
                  Create an active job before adding a manual shift.
                </Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.jobRow}
              >
                {jobs.map((job) => {
                  const selected = job.id === jobId;
                  return (
                    <Pressable
                      key={job.id}
                      style={[styles.jobChip, selected && styles.jobChipSelected]}
                      onPress={() => setJobId(job.id)}
                    >
                      <View style={[styles.jobDot, { backgroundColor: job.color }]} />
                      <Text
                        style={[
                          styles.jobChipText,
                          selected && styles.jobChipTextSelected,
                        ]}
                      >
                        {job.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            <Text style={styles.label}>Date</Text>
            <TextInput
              value={dateValue}
              onChangeText={setDateValue}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
              style={styles.input}
            />

            <View style={styles.twoColumns}>
              <View style={styles.column}>
                <Text style={styles.label}>Clock in</Text>
                <TextInput
                  value={startTime}
                  onChangeText={setStartTime}
                  placeholder="09:00"
                  keyboardType="numbers-and-punctuation"
                  style={styles.input}
                />
              </View>
              <View style={styles.column}>
                <Text style={styles.label}>Clock out</Text>
                <TextInput
                  value={endTime}
                  onChangeText={setEndTime}
                  placeholder="17:00"
                  keyboardType="numbers-and-punctuation"
                  style={styles.input}
                />
              </View>
            </View>

            <Text style={styles.label}>Unpaid break</Text>
            <View style={styles.breakOptions}>
              {[0, 15, 30, 45, 60].map((minutes) => {
                const selected = parsedBreakMinutes === minutes;
                return (
                  <Pressable
                    key={minutes}
                    style={[styles.breakChip, selected && styles.breakChipSelected]}
                    onPress={() => setBreakMinutes(String(minutes))}
                  >
                    <Text
                      style={[
                        styles.breakChipText,
                        selected && styles.breakChipTextSelected,
                      ]}
                    >
                      {minutes === 0 ? 'None' : `${minutes}m`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              value={breakMinutes}
              onChangeText={setBreakMinutes}
              placeholder="Custom break minutes"
              keyboardType="number-pad"
              style={styles.input}
            />

            <Text style={styles.label}>Notes</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Optional notes"
              multiline
              textAlignVertical="top"
              style={[styles.input, styles.notesInput]}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              style={({ pressed }) => [
                styles.saveButton,
                (pressed || saving) && styles.buttonPressed,
                (saving || jobs.length === 0) && styles.buttonDisabled,
              ]}
              disabled={saving || jobs.length === 0}
              onPress={() => void save()}
            >
              {saving ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Ionicons name="add-circle-outline" size={20} color={colors.white} />
                  <Text style={styles.saveButtonText}>Add time entry</Text>
                </>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  content: { padding: 22, paddingBottom: 48 },
  header: { flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 22 },
  iconButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  headerText: { marginLeft: 14 },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  title: { color: colors.text, fontSize: 30, fontWeight: '900', marginTop: 3 },
  previewCard: { backgroundColor: colors.dark, borderRadius: radius.lg, padding: 24, marginBottom: 18 },
  previewLabel: { color: '#CBD5E1', fontSize: 13, fontWeight: '700' },
  previewDuration: { color: colors.white, fontSize: 38, fontWeight: '900', marginTop: 8 },
  previewPay: { color: '#93C5FD', fontSize: 16, fontWeight: '800', marginTop: 6 },
  formCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 20 },
  label: { color: colors.text, fontSize: 13, fontWeight: '800', marginTop: 16, marginBottom: 8 },
  jobRow: { gap: 9, paddingRight: 12 },
  jobChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 13, paddingVertical: 10, borderRadius: 999, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border },
  jobChipSelected: { backgroundColor: '#EFF6FF', borderColor: colors.primary },
  jobChipText: { color: colors.textMuted, fontWeight: '800' },
  jobChipTextSelected: { color: colors.primary },
  jobDot: { width: 9, height: 9, borderRadius: 5 },
  input: { minHeight: 50, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 14, backgroundColor: '#FBFCFE', color: colors.text, fontSize: 16 },
  notesInput: { minHeight: 100, paddingTop: 14 },
  twoColumns: { flexDirection: 'row', gap: spacing.md },
  column: { flex: 1 },
  breakOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  breakChip: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 999, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border },
  breakChipSelected: { backgroundColor: '#EFF6FF', borderColor: colors.primary },
  breakChipText: { color: colors.textMuted, fontSize: 13, fontWeight: '800' },
  breakChipTextSelected: { color: colors.primary },
  noJobsBox: { backgroundColor: '#FEF3C7', borderRadius: radius.sm, padding: 14 },
  noJobsText: { color: '#92400E', lineHeight: 20, fontWeight: '700' },
  error: { color: colors.danger, fontWeight: '700', marginTop: 16, lineHeight: 20 },
  saveButton: { minHeight: 54, borderRadius: radius.md, backgroundColor: colors.primary, marginTop: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  saveButtonText: { color: colors.white, fontSize: 16, fontWeight: '900' },
  buttonPressed: { opacity: 0.78 },
  buttonDisabled: { opacity: 0.55 },
});
