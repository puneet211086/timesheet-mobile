import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { Job } from '../../types/models';
import { type JobInput, useJobs } from '../../hooks/useJobs';

const COLORS = ['#2563EB', '#7C3AED', '#DB2777', '#EA580C', '#16A34A', '#0891B2'];

const EMPTY_FORM: JobInput = {
  name: '',
  hourlyRate: 25,
  overtimeMultiplier: 1.5,
  color: COLORS[0],
};

export default function JobsScreen() {
  const { jobs, loading, saveJob, setJobActive } = useJobs();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | undefined>();
  const [form, setForm] = useState<JobInput>(EMPTY_FORM);
  const [rateText, setRateText] = useState('25');
  const [overtimeText, setOvertimeText] = useState('1.5');
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditingId(undefined);
    setForm(EMPTY_FORM);
    setRateText('25');
    setOvertimeText('1.5');
    setModalVisible(true);
  };

  const openEdit = (job: Job) => {
    setEditingId(job.id);
    setForm({
      name: job.name,
      hourlyRate: job.hourlyRate,
      overtimeMultiplier: job.overtimeMultiplier,
      color: job.color,
    });
    setRateText(String(job.hourlyRate));
    setOvertimeText(String(job.overtimeMultiplier));
    setModalVisible(true);
  };

  const submit = async () => {
    const hourlyRate = Number(rateText);
    const overtimeMultiplier = Number(overtimeText);

    if (!form.name.trim()) {
      Alert.alert('Job name required', 'Enter a name for this job.');
      return;
    }
    if (!Number.isFinite(hourlyRate) || hourlyRate < 0) {
      Alert.alert('Invalid rate', 'Enter a valid hourly rate.');
      return;
    }
    if (!Number.isFinite(overtimeMultiplier) || overtimeMultiplier < 1) {
      Alert.alert('Invalid overtime rate', 'Use a multiplier of 1.0 or higher.');
      return;
    }

    setSaving(true);
    try {
      await saveJob(
        { ...form, hourlyRate, overtimeMultiplier },
        editingId
      );
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
    Alert.alert(
      `${action} ${job.name}?`,
      job.isActive
        ? 'The job will no longer appear on the clock-in screen. Existing entries will remain.'
        : 'The job will become available for new clock-ins.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action,
          style: job.isActive ? 'destructive' : 'default',
          onPress: () => setJobActive(job.id, !job.isActive).catch(console.error),
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.eyebrow}>WORK PROFILES</Text>
            <Text style={styles.title}>Jobs</Text>
          </View>
          <Pressable onPress={openCreate} style={styles.addButton}>
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </Pressable>
        </View>

        <Text style={styles.subtitle}>
          Keep separate pay rates and overtime settings for every job.
        </Text>

        <View style={styles.list}>
          {jobs.map((job) => (
            <View key={job.id} style={[styles.card, !job.isActive && styles.cardInactive]}>
              <View style={[styles.colorBar, { backgroundColor: job.color }]} />
              <View style={styles.cardContent}>
                <View style={styles.cardTopRow}>
                  <View style={styles.cardTitleGroup}>
                    <Text style={styles.jobName}>{job.name}</Text>
                    <View style={styles.statusRow}>
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: job.isActive ? '#16A34A' : '#9CA3AF' },
                        ]}
                      />
                      <Text style={styles.statusText}>
                        {job.isActive ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                  </View>
                  <Pressable onPress={() => openEdit(job)} style={styles.iconButton}>
                    <Ionicons name="pencil-outline" size={20} color="#374151" />
                  </Pressable>
                </View>

                <View style={styles.metricsRow}>
                  <View>
                    <Text style={styles.metricLabel}>HOURLY RATE</Text>
                    <Text style={styles.metricValue}>${job.hourlyRate.toFixed(2)}</Text>
                  </View>
                  <View>
                    <Text style={styles.metricLabel}>OVERTIME</Text>
                    <Text style={styles.metricValue}>{job.overtimeMultiplier.toFixed(1)}×</Text>
                  </View>
                </View>

                <Pressable onPress={() => confirmToggle(job)} style={styles.toggleButton}>
                  <Text style={styles.toggleButtonText}>
                    {job.isActive ? 'Deactivate job' : 'Reactivate job'}
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <ScrollView contentContainerStyle={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Text style={styles.modalTitle}>{editingId ? 'Edit Job' : 'New Job'}</Text>
              <Pressable disabled={saving} onPress={submit}>
                <Text style={[styles.saveText, saving && styles.disabledText]}>
                  {saving ? 'Saving' : 'Save'}
                </Text>
              </Pressable>
            </View>

            <Text style={styles.fieldLabel}>JOB NAME</Text>
            <TextInput
              value={form.name}
              onChangeText={(name) => setForm((current) => ({ ...current, name }))}
              placeholder="Main Job"
              style={styles.input}
            />

            <Text style={styles.fieldLabel}>HOURLY RATE</Text>
            <View style={styles.moneyInputWrap}>
              <Text style={styles.inputPrefix}>$</Text>
              <TextInput
                value={rateText}
                onChangeText={setRateText}
                keyboardType="decimal-pad"
                placeholder="25.00"
                style={styles.moneyInput}
              />
            </View>

            <Text style={styles.fieldLabel}>OVERTIME MULTIPLIER</Text>
            <TextInput
              value={overtimeText}
              onChangeText={setOvertimeText}
              keyboardType="decimal-pad"
              placeholder="1.5"
              style={styles.input}
            />

            <Text style={styles.fieldLabel}>COLOR</Text>
            <View style={styles.colorsRow}>
              {COLORS.map((color) => (
                <Pressable
                  key={color}
                  onPress={() => setForm((current) => ({ ...current, color }))}
                  style={[
                    styles.colorChoice,
                    { backgroundColor: color },
                    form.color === color && styles.colorChoiceSelected,
                  ]}
                >
                  {form.color === color && (
                    <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                  )}
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F8FC' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 22, paddingBottom: 40 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  eyebrow: { color: '#2563EB', fontSize: 12, fontWeight: '800', letterSpacing: 1.8 },
  title: { color: '#111827', fontSize: 34, fontWeight: '800', marginTop: 6 },
  subtitle: { color: '#6B7280', fontSize: 16, lineHeight: 23, marginTop: 8, marginBottom: 22 },
  addButton: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { gap: 14 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardInactive: { opacity: 0.65 },
  colorBar: { width: 7 },
  cardContent: { flex: 1, padding: 18 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cardTitleGroup: { flex: 1 },
  jobName: { color: '#111827', fontSize: 19, fontWeight: '800' },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 7 },
  statusDot: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  statusText: { color: '#6B7280', fontSize: 12, fontWeight: '600' },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsRow: { flexDirection: 'row', gap: 46, marginTop: 24 },
  metricLabel: { color: '#9CA3AF', fontSize: 10, fontWeight: '800', letterSpacing: 0.9 },
  metricValue: { color: '#111827', fontSize: 18, fontWeight: '800', marginTop: 5 },
  toggleButton: { alignSelf: 'flex-start', marginTop: 20 },
  toggleButtonText: { color: '#6B7280', fontSize: 13, fontWeight: '700' },
  modalSafeArea: { flex: 1, backgroundColor: '#F7F8FC' },
  modalContainer: { padding: 22, paddingBottom: 50 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 34,
  },
  modalTitle: { color: '#111827', fontSize: 18, fontWeight: '800' },
  cancelText: { color: '#6B7280', fontSize: 16 },
  saveText: { color: '#2563EB', fontSize: 16, fontWeight: '800' },
  disabledText: { opacity: 0.5 },
  fieldLabel: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginBottom: 8,
    marginTop: 20,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 15,
    color: '#111827',
    fontSize: 17,
  },
  moneyInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  inputPrefix: { color: '#6B7280', fontSize: 18, fontWeight: '700', marginRight: 5 },
  moneyInput: { flex: 1, paddingVertical: 15, color: '#111827', fontSize: 17 },
  colorsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 13 },
  colorChoice: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorChoiceSelected: { borderWidth: 3, borderColor: '#FFFFFF', outlineWidth: 2, outlineColor: '#111827' } as any,
});
