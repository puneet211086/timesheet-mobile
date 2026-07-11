import { Ionicons } from '@expo/vector-icons';
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
import { ProgressCard } from '../../components/ProgressCard';
import { RecentEntry } from '../../components/RecentEntry';
import { colors, radius } from '../../constants/theme';
import { useTimesheet } from '../../hooks/useTimesheet';
import {
  formatClockTime,
  formatDuration,
  formatHoursMinutes,
  greetingForNow,
} from '../../utils/time';

export default function HomeScreen() {
  const {
    activeEntry,
    clockIn,
    clockOut,
    jobs,
    loading,
    now,
    selectedJob,
    selectedJobId,
    setSelectedJobId,
    summary,
    todayEntries,
    weeklySummary,
  } = useTimesheet();

  if (loading) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  const displayedJobName = activeEntry?.jobName ?? selectedJob?.name;
  const recentEntries = todayEntries.slice(0, 3);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>{greetingForNow()}</Text>
            <Text style={styles.title}>Your workday</Text>
          </View>
          <View style={styles.avatar}>
            <Ionicons name="time-outline" size={24} color={colors.primary} />
          </View>
        </View>

        {!activeEntry && jobs.length > 0 ? (
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
                        backgroundColor: `${job.color}12`,
                      },
                    ]}
                  >
                    <View style={[styles.jobDot, { backgroundColor: job.color }]} />
                    <View>
                      <Text style={styles.jobChipName}>{job.name}</Text>
                      <Text style={styles.jobChipRate}>
                        ${job.hourlyRate.toFixed(2)}/hr
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.timerCard}>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, activeEntry && styles.statusDotActive]} />
            <Text style={styles.statusText}>
              {activeEntry
                ? `Working since ${formatClockTime(activeEntry.clockIn)}`
                : 'Ready when you are'}
            </Text>
          </View>

          <Text style={styles.timer}>{formatDuration(summary.workedSeconds)}</Text>
          <Text style={styles.timerCaption}>
            {displayedJobName ?? 'Create a job to begin'}
          </Text>

          <Pressable
            disabled={!selectedJob && !activeEntry}
            onPress={activeEntry ? clockOut : clockIn}
            style={({ pressed }) => [
              styles.clockButton,
              activeEntry && styles.clockOutButton,
              pressed && styles.pressed,
              !selectedJob && !activeEntry && styles.disabled,
            ]}
          >
            <Ionicons
              name={activeEntry ? 'stop-circle-outline' : 'play-circle-outline'}
              size={22}
              color={colors.white}
            />
            <Text style={styles.clockButtonText}>
              {activeEntry ? 'Clock Out' : 'Clock In'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.metricsRow}>
          <MetricCard
            label="Today’s hours"
            value={formatHoursMinutes(summary.workedSeconds)}
            icon={<Ionicons name="time-outline" size={20} color={colors.primary} />}
          />
          <MetricCard
            label="Today’s earnings"
            value={`$${summary.estimatedPay.toFixed(2)}`}
            icon={<Ionicons name="wallet-outline" size={20} color={colors.success} />}
          />
        </View>

        <ProgressCard
          workedSeconds={weeklySummary.workedSeconds}
          targetSeconds={weeklySummary.targetSeconds}
          estimatedPay={weeklySummary.estimatedPay}
        />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent entries</Text>
          <Text style={styles.sectionMeta}>{todayEntries.length} today</Text>
        </View>

        {recentEntries.length > 0 ? (
          recentEntries.map((entry) => (
            <RecentEntry key={entry.id} entry={entry} now={now} />
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={24} color={colors.textSoft} />
            <Text style={styles.emptyTitle}>No entries yet</Text>
            <Text style={styles.emptyText}>
              Choose a job and clock in to start tracking today.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  container: { padding: 22, paddingBottom: 44, gap: 16 },
  header: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eyebrow: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 14,
  },
  title: {
    color: colors.text,
    fontSize: 33,
    fontWeight: '900',
    marginTop: 4,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  jobPickerSection: { marginTop: 6 },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  jobPicker: { gap: 10, paddingRight: 10 },
  jobChip: {
    minWidth: 150,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  jobDot: { width: 11, height: 11, borderRadius: 6 },
  jobChipName: { color: colors.text, fontSize: 14, fontWeight: '800' },
  jobChipRate: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  timerCard: {
    backgroundColor: colors.dark,
    borderRadius: radius.xl,
    padding: 24,
    overflow: 'hidden',
  },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6B7280',
    marginRight: 9,
  },
  statusDotActive: { backgroundColor: '#4ADE80' },
  statusText: { color: '#D1D5DB', fontSize: 14, fontWeight: '700' },
  timer: {
    color: colors.white,
    fontSize: 50,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 28,
  },
  timerCaption: { color: '#9CA3AF', fontSize: 15, marginTop: 7 },
  clockButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 9,
    marginTop: 28,
  },
  clockOutButton: { backgroundColor: colors.danger },
  clockButtonText: { color: colors.white, fontSize: 17, fontWeight: '900' },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.45 },
  metricsRow: { flexDirection: 'row', gap: 12 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: '900' },
  sectionMeta: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  emptyTitle: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 17,
    marginTop: 12,
  },
  emptyText: {
    color: colors.textMuted,
    marginTop: 6,
    lineHeight: 20,
    textAlign: 'center',
  },
});
