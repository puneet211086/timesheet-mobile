import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { DashboardStat } from '../../components/DashboardStat';
import { QuickAction } from '../../components/QuickAction';
import { RecentEntry } from '../../components/RecentEntry';
import { WeeklyProgressCard } from '../../components/WeeklyProgressCard';
import { colors, radius } from '../../constants/theme';
import { useTimesheet } from '../../hooks/useTimesheet';
import {
  formatClockTime,
  formatDuration,
  greetingForNow,
} from '../../utils/time';

function formatMoney(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatLongDate(date = new Date()): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export default function HomeScreen() {
  const router = useRouter();
  const {
    activeEntry,
    clockIn,
    clockOut,
    jobs,
    loading,
    refresh,
    selectedJob,
    selectedJobId,
    setSelectedJobId,
    summary,
    todayEntries,
    weeklySummary,
  } = useTimesheet();

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Preparing your workday…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayedJobName = activeEntry?.jobName ?? selectedJob?.name;
  const recentEntries = todayEntries.slice(0, 3);
  const canClockIn = Boolean(selectedJob) && !activeEntry;
  const weeklyPercent = Math.min(
    100,
    Math.round(
      (weeklySummary.workedSeconds /
        Math.max(1, weeklySummary.targetSeconds)) *
        100,
    ),
  );

  const handleClock = async () => {
    if (activeEntry) {
      await clockOut();
    } else if (selectedJob) {
      await clockIn();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.date}>{formatLongDate()}</Text>
            <Text style={styles.title}>{greetingForNow()}</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open settings"
            onPress={() => router.push('/settings')}
            style={({ pressed }) => [
              styles.settingsButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="settings-outline" size={22} color={colors.primary} />
          </Pressable>
        </View>

        <View
          accessibilityLabel={
            activeEntry
              ? `Active shift for ${displayedJobName}`
              : 'No active shift'
          }
          style={[
            styles.heroCard,
            activeEntry && styles.heroCardActive,
          ]}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.statusPill}>
              <View
                style={[
                  styles.statusDot,
                  activeEntry && styles.statusDotActive,
                ]}
              />
              <Text style={styles.statusText}>
                {activeEntry ? 'SHIFT IN PROGRESS' : 'READY TO START'}
              </Text>
            </View>

            {activeEntry ? (
              <Text style={styles.sinceText}>
                Since {formatClockTime(activeEntry.clockIn)}
              </Text>
            ) : null}
          </View>

          <Text style={styles.timer}>
            {formatDuration(summary.workedSeconds)}
          </Text>

          <Text style={styles.heroJob}>
            {displayedJobName ?? 'Create a job to begin'}
          </Text>

          {!activeEntry && jobs.length > 0 ? (
            <View style={styles.jobSection}>
              <Text style={styles.jobSectionLabel}>CLOCK INTO</Text>

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
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`${job.name}, ${formatMoney(
                        job.hourlyRate,
                      )} per hour`}
                      onPress={() => setSelectedJobId(job.id)}
                      style={({ pressed }) => [
                        styles.jobChip,
                        selected && {
                          borderColor: job.color,
                          backgroundColor: `${job.color}18`,
                        },
                        pressed && styles.pressed,
                      ]}
                    >
                      <View
                        style={[
                          styles.jobDot,
                          { backgroundColor: job.color },
                        ]}
                      />
                      <View>
                        <Text style={styles.jobChipName}>{job.name}</Text>
                        <Text style={styles.jobChipRate}>
                          {formatMoney(job.hourlyRate)}/hr
                        </Text>
                      </View>

                      {selected ? (
                        <Ionicons
                          name="checkmark-circle"
                          size={19}
                          color={job.color}
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={activeEntry ? 'Clock out' : 'Clock in'}
            disabled={!activeEntry && !canClockIn}
            onPress={() => void handleClock()}
            style={({ pressed }) => [
              styles.clockButton,
              activeEntry && styles.clockOutButton,
              pressed && styles.clockButtonPressed,
              !activeEntry && !canClockIn && styles.disabled,
            ]}
          >
            <Ionicons
              name={activeEntry ? 'stop-circle-outline' : 'play-circle-outline'}
              size={23}
              color={colors.white}
            />
            <Text style={styles.clockButtonText}>
              {activeEntry ? 'Clock Out' : 'Clock In'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <DashboardStat
            icon="time-outline"
            label="Today"
            value={formatDuration(summary.workedSeconds).slice(0, 5)}
            caption="Hours worked"
          />
          <DashboardStat
            icon="cash-outline"
            label="Today"
            value={formatMoney(summary.estimatedPay)}
            caption="Estimated earnings"
          />
        </View>

        <WeeklyProgressCard
          workedSeconds={weeklySummary.workedSeconds}
          targetSeconds={weeklySummary.targetSeconds}
          estimatedPay={weeklySummary.estimatedPay}
          overtimeSeconds={weeklySummary.overtimeSeconds}
          percent={weeklyPercent}
          onPress={() => router.push('/reports')}
        />

        <View>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>SHORTCUTS</Text>
              <Text style={styles.sectionTitle}>Quick actions</Text>
            </View>
          </View>

          <View style={styles.actionsGrid}>
            <QuickAction
              icon="add-circle-outline"
              label="Add shift"
              description="Record missed time"
              onPress={() => router.push('/entries/new')}
            />
            <QuickAction
              icon="bar-chart-outline"
              label="Reports"
              description="Review earnings"
              onPress={() => router.push('/reports')}
            />
            <QuickAction
              icon="calendar-outline"
              label="Calendar"
              description="Browse work history"
              onPress={() => router.push('/calendar')}
            />
            <QuickAction
              icon="briefcase-outline"
              label="Jobs"
              description="Manage pay rates"
              onPress={() => router.push('/jobs')}
            />
          </View>
        </View>

        <View>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>TODAY</Text>
              <Text style={styles.sectionTitle}>Recent shifts</Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View all time entries"
              onPress={() => router.push('/timesheet')}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Text style={styles.viewAll}>View all</Text>
            </Pressable>
          </View>

          {recentEntries.length > 0 ? (
            recentEntries.map((entry) => (
              <RecentEntry
                key={entry.id}
                entry={entry}
                onPress={
                  entry.clockOut
                    ? () => router.push(`/entries/${entry.id}`)
                    : undefined
                }
              />
            ))
          ) : (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="sparkles-outline"
                  size={26}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.emptyTitle}>Your day is ready</Text>
              <Text style={styles.emptyText}>
                Choose a job and clock in, or add a completed shift manually.
              </Text>

              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/entries/new')}
                style={({ pressed }) => [
                  styles.emptyAction,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons
                  name="add-outline"
                  size={18}
                  color={colors.primary}
                />
                <Text style={styles.emptyActionText}>Add a shift</Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    gap: 12,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 46,
    gap: 18,
  },
  header: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 31,
    fontWeight: '900',
    marginTop: 4,
  },
  settingsButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#E8F0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    backgroundColor: colors.dark,
    borderRadius: radius.xl,
    padding: 22,
    overflow: 'hidden',
  },
  heroCardActive: {
    borderWidth: 1,
    borderColor: '#334155',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#94A3B8',
    marginRight: 7,
  },
  statusDotActive: {
    backgroundColor: '#4ADE80',
  },
  statusText: {
    color: '#E2E8F0',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.9,
  },
  sinceText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  timer: {
    color: colors.white,
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginTop: 27,
  },
  heroJob: {
    color: '#CBD5E1',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 7,
  },
  jobSection: {
    marginTop: 24,
  },
  jobSectionLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.1,
    marginBottom: 10,
  },
  jobPicker: {
    gap: 9,
    paddingRight: 12,
  },
  jobChip: {
    minWidth: 154,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1F2937',
    borderWidth: 1.5,
    borderColor: '#374151',
    borderRadius: radius.md,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  jobDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  jobChipName: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '800',
  },
  jobChipRate: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  clockButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 9,
    marginTop: 24,
  },
  clockOutButton: {
    backgroundColor: colors.danger,
  },
  clockButtonPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.985 }],
  },
  clockButtonText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '900',
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.76,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 11,
    marginTop: 2,
  },
  sectionEyebrow: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 4,
  },
  viewAll: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
    paddingVertical: 5,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 17,
    marginTop: 13,
  },
  emptyText: {
    color: colors.textMuted,
    marginTop: 6,
    lineHeight: 20,
    textAlign: 'center',
  },
  emptyAction: {
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
  },
  emptyActionText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
});
