import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../constants/theme';
import type { TimeEntry } from '../types/models';
import { formatClockTime, formatHoursMinutes } from '../utils/time';

type Props = { entry: TimeEntry; now?: number };

export function RecentEntry({ entry, now = Date.now() }: Props) {
  const end = entry.clockOut ? new Date(entry.clockOut).getTime() : now;
  const seconds = Math.max(0, (end - new Date(entry.clockIn).getTime()) / 1000);

  return (
    <View style={styles.card}>
      <View style={[styles.dot, { backgroundColor: entry.jobColor ?? colors.primary }]} />
      <View style={styles.details}>
        <Text style={styles.job}>{entry.jobName}</Text>
        <Text style={styles.time}>
          {formatClockTime(entry.clockIn)} –{' '}
          {entry.clockOut ? formatClockTime(entry.clockOut) : 'Running'}
        </Text>
      </View>
      <Text style={styles.duration}>{formatHoursMinutes(seconds)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  dot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    marginRight: 12,
  },
  details: { flex: 1 },
  job: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  time: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 5,
  },
  duration: {
    color: colors.primary,
    fontWeight: '900',
    fontSize: 14,
  },
});
