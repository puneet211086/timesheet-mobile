import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo, useState } from 'react';
import {
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

const TOTAL_STEPS = 4;

type StepContent = {
  icon: keyof typeof Ionicons.glyphMap;
  eyebrow: string;
  title: string;
  description: string;
};

const STEPS: StepContent[] = [
  {
    icon: 'time-outline',
    eyebrow: 'WELCOME',
    title: 'Track work without the paperwork.',
    description:
      'Clock in, record breaks, calculate earnings, and review your work history from one private app.',
  },
  {
    icon: 'shield-checkmark-outline',
    eyebrow: 'PRIVATE BY DEFAULT',
    title: 'Your timesheet stays on your device.',
    description:
      'No account is required. Jobs, shifts, pay rates, and notes are stored locally unless you choose to export a backup.',
  },
  {
    icon: 'briefcase-outline',
    eyebrow: 'FIRST JOB',
    title: 'Set up your primary job.',
    description:
      'You can add more jobs and configure overtime rules later from the Jobs tab.',
  },
  {
    icon: 'checkmark-circle-outline',
    eyebrow: 'READY',
    title: 'Everything is set.',
    description:
      'Clock in from Home, add missed shifts from Timesheet, and review earnings from Reports.',
  },
];

export default function OnboardingScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [jobName, setJobName] = useState('Main Job');
  const [hourlyRate, setHourlyRate] = useState('25');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const content = STEPS[step];
  const isLastStep = step === TOTAL_STEPS - 1;
  const isJobStep = step === 2;

  const parsedRate = useMemo(() => Number(hourlyRate), [hourlyRate]);

  const finish = async () => {
    const trimmedName = jobName.trim();

    if (!trimmedName) {
      setError('Enter a job name.');
      setStep(2);
      return;
    }

    if (!Number.isFinite(parsedRate) || parsedRate < 0) {
      setError('Enter a valid hourly rate.');
      setStep(2);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const firstJob = await db.getFirstAsync<{ id: number }>(
        'SELECT id FROM jobs ORDER BY id LIMIT 1',
      );

      const now = new Date().toISOString();

      if (firstJob) {
        await db.runAsync(
          `UPDATE jobs
           SET name = ?, hourly_rate = ?, updated_at = ?
           WHERE id = ?`,
          trimmedName,
          parsedRate,
          now,
          firstJob.id,
        );
      } else {
        await db.runAsync(
          `INSERT INTO jobs
            (name, hourly_rate, overtime_multiplier, color,
             is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          trimmedName,
          parsedRate,
          1.5,
          '#2563EB',
          1,
          now,
          now,
        );
      }

      await db.runAsync(
        `INSERT INTO app_settings (key, value)
         VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        'onboarding_completed',
        'true',
      );

      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
      }

      router.replace('/');
    } catch (saveError) {
      console.error(saveError);
      setError('Unable to finish setup. Please try again.');
      setSaving(false);
    }
  };

  const next = () => {
    if (isLastStep) {
      void finish();
      return;
    }

    setError(null);
    setStep((current) => Math.min(current + 1, TOTAL_STEPS - 1));
  };

  const back = () => {
    setError(null);
    setStep((current) => Math.max(current - 1, 0));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.progressRow}>
            {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
              <View
                key={index}
                style={[
                  styles.progressSegment,
                  index <= step && styles.progressSegmentActive,
                ]}
              />
            ))}
          </View>

          <Text style={styles.stepLabel}>
            {step + 1} OF {TOTAL_STEPS}
          </Text>

          <View style={styles.iconBox}>
            <Ionicons name={content.icon} size={38} color="#2563EB" />
          </View>

          <Text style={styles.eyebrow}>{content.eyebrow}</Text>
          <Text style={styles.title}>{content.title}</Text>
          <Text style={styles.description}>{content.description}</Text>

          {isJobStep ? (
            <View style={styles.formCard}>
              <Text style={styles.label}>Job name</Text>
              <TextInput
                value={jobName}
                onChangeText={setJobName}
                placeholder="Main Job"
                placeholderTextColor="#94A3B8"
                autoCapitalize="words"
                style={styles.input}
              />

              <Text style={[styles.label, styles.secondLabel]}>
                Hourly rate
              </Text>
              <View style={styles.rateRow}>
                <Text style={styles.currency}>$</Text>
                <TextInput
                  value={hourlyRate}
                  onChangeText={setHourlyRate}
                  placeholder="25.00"
                  placeholderTextColor="#94A3B8"
                  keyboardType="decimal-pad"
                  style={styles.rateInput}
                />
                <Text style={styles.perHour}>per hour</Text>
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}
            </View>
          ) : null}

          {step === 3 ? (
            <View style={styles.summaryCard}>
              <SummaryRow
                icon="play-circle-outline"
                title="Clock in and out"
                description="Use the Home tab for live tracking."
              />
              <SummaryRow
                icon="calendar-outline"
                title="Review your history"
                description="Calendar and Reports summarize completed shifts."
              />
              <SummaryRow
                icon="cloud-upload-outline"
                title="Protect your data"
                description="Export a backup from Settings."
              />
            </View>
          ) : null}

          <View style={styles.spacer} />

          <Pressable
            disabled={saving}
            onPress={next}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
              saving && styles.disabled,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {isLastStep ? (saving ? 'Finishing…' : 'Start Tracking') : 'Continue'}
            </Text>
            {!isLastStep ? (
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            ) : null}
          </Pressable>

          {step > 0 ? (
            <Pressable
              disabled={saving}
              onPress={back}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.backButtonText}>Back</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SummaryRow({
  icon,
  title,
  description,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.summaryRow}>
      <View style={styles.summaryIcon}>
        <Ionicons name={icon} size={21} color="#2563EB" />
      </View>
      <View style={styles.summaryCopy}>
        <Text style={styles.summaryTitle}>{title}</Text>
        <Text style={styles.summaryDescription}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F8FC',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 30,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 7,
  },
  progressSegment: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
  },
  progressSegmentActive: {
    backgroundColor: '#2563EB',
  },
  stepLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginTop: 17,
  },
  iconBox: {
    width: 78,
    height: 78,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 42,
  },
  eyebrow: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 25,
  },
  title: {
    color: '#0F172A',
    fontSize: 33,
    lineHeight: 40,
    fontWeight: '800',
    marginTop: 8,
  },
  description: {
    color: '#64748B',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginTop: 25,
  },
  label: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
  },
  secondLabel: {
    marginTop: 18,
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 15,
    color: '#0F172A',
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  rateRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 15,
  },
  currency: {
    color: '#475569',
    fontSize: 17,
    fontWeight: '800',
    marginRight: 7,
  },
  rateInput: {
    flex: 1,
    color: '#0F172A',
    fontSize: 16,
  },
  perHour: {
    color: '#94A3B8',
    fontSize: 13,
  },
  error: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 12,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginTop: 25,
    gap: 18,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  summaryCopy: {
    flex: 1,
  },
  summaryTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
  },
  summaryDescription: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 3,
  },
  spacer: {
    flex: 1,
    minHeight: 35,
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 17,
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  backButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 7,
  },
  backButtonText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.78,
  },
  disabled: {
    opacity: 0.55,
  },
});
