import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { type JobInput, useJobs } from '../../hooks/useJobs';
import type { Job } from '../../types/models';

const COLORS = ['#2563EB', '#7C3AED', '#DB2777', '#EA580C', '#16A34A', '#0891B2'];

const EMPTY_FORM: JobInput = {
  name: '',
  hourlyRate: 25,
  overtimeMultiplier: 1.5,
  overtimeEnabled: true,
  weeklyOvertimeEnabled: true,
  weeklyOvertimeHours: 40,
  dailyOvertimeEnabled: false,
  dailyOvertimeHours: 8,
  doubleTimeEnabled: false,
  doubleTimeHours: 12,
  doubleTimeMultiplier: 2,
  color: COLORS[0],
};

export default function JobsScreen() {
  const { jobs, loading, saveJob, setJobActive } = useJobs();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number>();
  const [form, setForm] = useState<JobInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditingId(undefined);
    setForm(EMPTY_FORM);
    setModalVisible(true);
  };

  const openEdit = (job: Job) => {
    setEditingId(job.id);
    setForm({
      name: job.name,
      hourlyRate: job.hourlyRate,
      overtimeMultiplier: job.overtimeMultiplier,
      overtimeEnabled: job.overtimeEnabled,
      weeklyOvertimeEnabled: job.weeklyOvertimeEnabled,
      weeklyOvertimeHours: job.weeklyOvertimeHours,
      dailyOvertimeEnabled: job.dailyOvertimeEnabled,
      dailyOvertimeHours: job.dailyOvertimeHours,
      doubleTimeEnabled: job.doubleTimeEnabled,
      doubleTimeHours: job.doubleTimeHours,
      doubleTimeMultiplier: job.doubleTimeMultiplier,
      color: job.color,
    });
    setModalVisible(true);
  };

  const setNumber = (key: keyof JobInput, value: string) => {
    setForm((current) => ({ ...current, [key]: Number(value) }));
  };

  const submit = async () => {
    if (!form.name.trim()) {
      Alert.alert('Job name required', 'Enter a name for this job.');
      return;
    }

    const numbers = [
      form.hourlyRate,
      form.overtimeMultiplier,
      form.weeklyOvertimeHours,
      form.dailyOvertimeHours,
      form.doubleTimeHours,
      form.doubleTimeMultiplier,
    ];

    if (numbers.some((value) => !Number.isFinite(value) || value < 0)) {
      Alert.alert('Invalid value', 'Review the pay and overtime values.');
      return;
    }

    if (
      form.doubleTimeEnabled &&
      form.dailyOvertimeEnabled &&
      form.doubleTimeHours <= form.dailyOvertimeHours
    ) {
      Alert.alert(
        'Invalid double-time threshold',
        'Double time must begin after the daily overtime threshold.',
      );
      return;
    }

    setSaving(true);
    try {
      await saveJob(form, editingId);
      setModalVisible(false);
    } catch (error) {
      console.error(error);
      Alert.alert('Unable to save', 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const confirmToggle = (job: Job) => {
    const action = job.isActive ? 'Deactivate' : 'Reactivate';
    const message = job.isActive
      ? 'The job will no longer appear on the clock-in screen. Existing entries will remain.'
      : 'The job will become available for new clock-ins.';

    const update = () =>
      setJobActive(job.id, !job.isActive).catch((error) => {
        console.error(error);
        if (Platform.OS === 'web') window.alert('The job status could not be updated.');
        else Alert.alert('Update failed', 'The job status could not be updated.');
      });

    if (Platform.OS === 'web') {
      if (window.confirm(`${action} ${job.name}?\n\n${message}`)) update();
      return;
    }

    Alert.alert(`${action} ${job.name}?`, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: action,
        style: job.isActive ? 'destructive' : 'default',
        onPress: update,
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>WORK PROFILES</Text>
            <Text style={styles.title}>Jobs</Text>
          </View>
          <Pressable onPress={openCreate} style={styles.addButton}>
            <Ionicons name="add" size={25} color="#FFFFFF" />
          </Pressable>
        </View>

        <Text style={styles.subtitle}>
          Configure pay rates and overtime rules independently for each job.
        </Text>

        {jobs.map((job) => (
          <View key={job.id} style={[styles.card, !job.isActive && styles.inactive]}>
            <View style={[styles.colorBar, { backgroundColor: job.color }]} />
            <View style={styles.cardBody}>
              <View style={styles.cardHeader}>
                <View style={styles.flex}>
                  <Text style={styles.jobName}>{job.name}</Text>
                  <Text style={styles.ruleSummary}>
                    {!job.overtimeEnabled
                      ? 'Overtime disabled'
                      : [
                          job.weeklyOvertimeEnabled
                            ? `Weekly after ${job.weeklyOvertimeHours}h`
                            : null,
                          job.dailyOvertimeEnabled
                            ? `Daily after ${job.dailyOvertimeHours}h`
                            : null,
                          job.doubleTimeEnabled
                            ? `Double after ${job.doubleTimeHours}h`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(' · ') || 'No thresholds enabled'}
                  </Text>
                </View>
                <Pressable onPress={() => openEdit(job)} style={styles.editButton}>
                  <Ionicons name="create-outline" size={20} color="#475569" />
                </Pressable>
              </View>

              <View style={styles.metrics}>
                <Metric label="HOURLY" value={`$${job.hourlyRate.toFixed(2)}`} />
                <Metric label="OVERTIME" value={`${job.overtimeMultiplier.toFixed(2)}×`} />
                <Metric label="DOUBLE" value={`${job.doubleTimeMultiplier.toFixed(2)}×`} />
              </View>

              <Pressable onPress={() => confirmToggle(job)} style={styles.toggleButton}>
                <Text style={styles.toggleText}>
                  {job.isActive ? 'Deactivate job' : 'Reactivate job'}
                </Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide">
        <SafeAreaView style={styles.modalSafe}>
          <ScrollView contentContainerStyle={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setModalVisible(false)}>
                <Text style={styles.cancel}>Cancel</Text>
              </Pressable>
              <Text style={styles.modalTitle}>{editingId ? 'Edit Job' : 'New Job'}</Text>
              <Pressable disabled={saving} onPress={() => void submit()}>
                <Text style={styles.save}>{saving ? 'Saving' : 'Save'}</Text>
              </Pressable>
            </View>

            <Field label="JOB NAME">
              <TextInput
                value={form.name}
                onChangeText={(name) => setForm((c) => ({ ...c, name }))}
                style={styles.input}
              />
            </Field>

            <NumberField
              label="HOURLY RATE"
              value={form.hourlyRate}
              prefix="$"
              onChange={(value) => setNumber('hourlyRate', value)}
            />

            <SettingRow
              title="Enable overtime"
              description="Apply overtime and double-time rules to this job."
              value={form.overtimeEnabled}
              onChange={(value) => setForm((c) => ({ ...c, overtimeEnabled: value }))}
            />

            {form.overtimeEnabled ? (
              <>
                <NumberField
                  label="OVERTIME MULTIPLIER"
                  value={form.overtimeMultiplier}
                  suffix="×"
                  onChange={(value) => setNumber('overtimeMultiplier', value)}
                />

                <SettingRow
                  title="Weekly overtime"
                  description="Promote remaining regular hours after the weekly threshold."
                  value={form.weeklyOvertimeEnabled}
                  onChange={(value) =>
                    setForm((c) => ({ ...c, weeklyOvertimeEnabled: value }))
                  }
                />
                {form.weeklyOvertimeEnabled ? (
                  <NumberField
                    label="WEEKLY OVERTIME AFTER"
                    value={form.weeklyOvertimeHours}
                    suffix="hours"
                    onChange={(value) => setNumber('weeklyOvertimeHours', value)}
                  />
                ) : null}

                <SettingRow
                  title="Daily overtime"
                  description="Apply overtime after a daily threshold."
                  value={form.dailyOvertimeEnabled}
                  onChange={(value) =>
                    setForm((c) => ({ ...c, dailyOvertimeEnabled: value }))
                  }
                />
                {form.dailyOvertimeEnabled ? (
                  <NumberField
                    label="DAILY OVERTIME AFTER"
                    value={form.dailyOvertimeHours}
                    suffix="hours"
                    onChange={(value) => setNumber('dailyOvertimeHours', value)}
                  />
                ) : null}

                <SettingRow
                  title="Double time"
                  description="Apply a higher multiplier after a later daily threshold."
                  value={form.doubleTimeEnabled}
                  onChange={(value) =>
                    setForm((c) => ({ ...c, doubleTimeEnabled: value }))
                  }
                />
                {form.doubleTimeEnabled ? (
                  <>
                    <NumberField
                      label="DOUBLE TIME AFTER"
                      value={form.doubleTimeHours}
                      suffix="hours"
                      onChange={(value) => setNumber('doubleTimeHours', value)}
                    />
                    <NumberField
                      label="DOUBLE-TIME MULTIPLIER"
                      value={form.doubleTimeMultiplier}
                      suffix="×"
                      onChange={(value) => setNumber('doubleTimeMultiplier', value)}
                    />
                  </>
                ) : null}
              </>
            ) : null}

            <Text style={styles.fieldLabel}>COLOR</Text>
            <View style={styles.colors}>
              {COLORS.map((color) => (
                <Pressable
                  key={color}
                  onPress={() => setForm((c) => ({ ...c, color }))}
                  style={[
                    styles.colorChoice,
                    { backgroundColor: color },
                    form.color === color && styles.colorSelected,
                  ]}
                >
                  {form.color === color ? (
                    <Ionicons name="checkmark" size={22} color="#FFFFFF" />
                  ) : null}
                </Pressable>
              ))}
            </View>

            <View style={styles.preview}>
              <Text style={styles.previewTitle}>Example: 13-hour shift</Text>
              <Text style={styles.previewText}>
                The saved thresholds determine how the shift is split into regular,
                overtime, and double-time hours.
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function NumberField({
  label,
  value,
  prefix,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <View style={styles.numberWrap}>
        {prefix ? <Text style={styles.affix}>{prefix}</Text> : null}
        <TextInput
          value={String(value)}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          style={styles.numberInput}
        />
        {suffix ? <Text style={styles.affix}>{suffix}</Text> : null}
      </View>
    </Field>
  );
}

function SettingRow({
  title,
  description,
  value,
  onChange,
}: {
  title: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.flex}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F8FC' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 22, paddingBottom: 42 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  eyebrow: { color: '#2563EB', fontSize: 12, fontWeight: '800', letterSpacing: 1.6 },
  title: { color: '#0F172A', fontSize: 34, fontWeight: '800', marginTop: 5 },
  subtitle: { color: '#64748B', fontSize: 16, lineHeight: 23, marginTop: 8, marginBottom: 20 },
  addButton: { width: 46, height: 46, borderRadius: 15, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center' },
  card: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 14 },
  inactive: { opacity: 0.62 },
  colorBar: { width: 7 },
  cardBody: { flex: 1, padding: 18 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  flex: { flex: 1 },
  jobName: { color: '#0F172A', fontSize: 19, fontWeight: '800' },
  ruleSummary: { color: '#64748B', fontSize: 12, lineHeight: 18, marginTop: 6 },
  editButton: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  metrics: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 21 },
  metricLabel: { color: '#94A3B8', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  metricValue: { color: '#0F172A', fontSize: 17, fontWeight: '800', marginTop: 5 },
  toggleButton: { alignSelf: 'flex-start', marginTop: 18 },
  toggleText: { color: '#64748B', fontSize: 13, fontWeight: '700' },
  modalSafe: { flex: 1, backgroundColor: '#F7F8FC' },
  modalContainer: { padding: 22, paddingBottom: 50 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 },
  cancel: { color: '#64748B', fontSize: 16 },
  save: { color: '#2563EB', fontSize: 16, fontWeight: '800' },
  modalTitle: { color: '#0F172A', fontSize: 18, fontWeight: '800' },
  fieldLabel: { color: '#64748B', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginTop: 18, marginBottom: 8 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 15, paddingHorizontal: 15, paddingVertical: 14, color: '#0F172A', fontSize: 16 },
  numberWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 15, paddingHorizontal: 15 },
  numberInput: { flex: 1, color: '#0F172A', fontSize: 16, paddingVertical: 14 },
  affix: { color: '#64748B', fontSize: 14, fontWeight: '700' },
  settingRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 17, padding: 16, marginTop: 18 },
  settingTitle: { color: '#0F172A', fontSize: 15, fontWeight: '800' },
  settingDescription: { color: '#64748B', fontSize: 12, lineHeight: 18, marginTop: 4, paddingRight: 12 },
  colors: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  colorChoice: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  colorSelected: { borderWidth: 3, borderColor: '#FFFFFF', outlineWidth: 2, outlineColor: '#0F172A' } as any,
  preview: { backgroundColor: '#EFF6FF', borderRadius: 16, padding: 15, marginTop: 24 },
  previewTitle: { color: '#1E3A8A', fontSize: 13, fontWeight: '800' },
  previewText: { color: '#475569', fontSize: 12, lineHeight: 18, marginTop: 5 },
});
