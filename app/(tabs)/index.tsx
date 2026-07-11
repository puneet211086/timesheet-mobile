import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MetricCard } from '../../components/MetricCard';
import { useTimesheet } from '../../hooks/useTimesheet';
import { formatClockTime, formatDuration } from '../../utils/time';

export default function HomeScreen() {
  const {
    activeEntry,
    clockIn,
    clockOut,
    jobs,
    loading,
    selectedJob,
    selectedJobId,
    setSelectedJobId,
    summary,
  } = useTimesheet();

  if (loading) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  const displayedJobName = activeEntry?.jobName ?? selectedJob?.name;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.eyebrow}>TIMESHEET</Text>
        <Text style={styles.title}>Good day</Text>
        <Text style={styles.subtitle}>Track your work without the paperwork.</Text>

        {!activeEntry && jobs.length > 0 && (
          <View style={styles.jobPickerSection}>
            <Text style={styles.sectionLabel}>CLOCK INTO</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.jobPicker}
            >
              {jobs.map((job) => {
                const selected = job.id === selectedJobId;
                return (
                  <Pressable
                    key={job.id}
                    onPress={() => setSelectedJobId(job.id)}
                    style={[
                      styles.jobChip,
                      selected && {
                        borderColor: job.color,
                        backgroundColor: `${job.color}14`,
                      },
                    ]}
                  >
                    <View style={[styles.jobColorDot, { backgroundColor: job.color }]} />
                    <View>
                      <Text style={styles.jobChipName}>{job.name}</Text>
                      <Text style={styles.jobChipRate}>${job.hourlyRate.toFixed(2)}/hr</Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        <View style={styles.timerCard}>
          <View style={styles.statusRow}>
            <View style={[styles.dot, activeEntry && styles.dotActive]} />
            <Text style={styles.statusText}>
              {activeEntry
                ? `Clocked in at ${formatClockTime(activeEntry.clockIn)}`
                : 'Not clocked in'}
            </Text>
          </View>

          <Text style={styles.timer}>{formatDuration(summary.workedSeconds)}</Text>
          <Text style={styles.jobName}>{displayedJobName ?? 'Create a job to begin'}</Text>

          <Pressable
            accessibilityRole="button"
            disabled={!selectedJob && !activeEntry}
            onPress={activeEntry ? clockOut : clockIn}
            style={({ pressed }) => [
              styles.primaryButton,
              activeEntry && styles.stopButton,
              pressed && styles.buttonPressed,
              !selectedJob && !activeEntry && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {activeEntry ? 'Clock Out' : 'Clock In'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.metricsRow}>
          <MetricCard
            label="Today"
            value={`${(summary.workedSeconds / 3600).toFixed(2)} hrs`}
          />
          <MetricCard
            label="Estimated pay"
            value={`$${summary.estimatedPay.toFixed(2)}`}
          />
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Selected pay rate</Text>
          <Text style={styles.infoValue}>
            ${selectedJob?.hourlyRate.toFixed(2) ?? '0.00'} / hour
          </Text>
          <Text style={styles.infoHint}>Manage jobs and rates from the Jobs tab.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F8FC' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 22, paddingBottom: 40 },
  eyebrow: {
    color: '#2563EB',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1.8,
    marginTop: 12,
  },
  title: { color: '#111827', fontSize: 34, fontWeight: '800', marginTop: 8 },
  subtitle: { color: '#6B7280', fontSize: 16, marginTop: 6, marginBottom: 22 },
  jobPickerSection: { marginBottom: 18 },
  sectionLabel: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  jobPicker: { gap: 10, paddingRight: 10 },
  jobChip: {
    minWidth: 150,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  jobColorDot: { width: 11, height: 11, borderRadius: 6 },
  jobChipName: { color: '#111827', fontSize: 14, fontWeight: '800' },
  jobChipRate: { color: '#6B7280', fontSize: 12, marginTop: 2 },
  timerCard: { backgroundColor: '#111827', borderRadius: 28, padding: 24 },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6B7280',
    marginRight: 9,
  },
  dotActive: { backgroundColor: '#22C55E' },
  statusText: { color: '#D1D5DB', fontSize: 14, fontWeight: '600' },
  timer: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 28,
  },
  jobName: { color: '#9CA3AF', fontSize: 15, marginTop: 8 },
  primaryButton: {
    backgroundColor: '#2563EB',
    borderRadius: 18,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 30,
  },
  stopButton: { backgroundColor: '#DC2626' },
  buttonPressed: { opacity: 0.82 },
  buttonDisabled: { opacity: 0.45 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  metricsRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoTitle: { color: '#6B7280', fontSize: 13, fontWeight: '600' },
  infoValue: { color: '#111827', fontSize: 22, fontWeight: '800', marginTop: 8 },
  infoHint: { color: '#9CA3AF', fontSize: 13, marginTop: 8 },
});
