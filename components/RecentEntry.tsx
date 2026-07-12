import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../constants/theme';
import type { TimeEntry } from '../types/models';
import { payableDurationSeconds } from '../utils/entry';
import { formatClockTime, formatHoursMinutes } from '../utils/time';

type Props = {
  entry: TimeEntry;
  now?: number;
  onPress?: () => void;
};

export function RecentEntry({
  entry,
  now = Date.now(),
  onPress,
}: Props) {
  const seconds = payableDurationSeconds(
    entry.clockIn,
    entry.clockOut,
    entry.unpaidBreakMinutes ?? 0,
    now,
  );

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${entry.jobName}, ${formatHoursMinutes(
        seconds,
      )}`}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && onPress && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.dot,
          { backgroundColor: entry.jobColor ?? colors.primary },
        ]}
      />

      <View style={styles.details}>
        <Text style={styles.job}>{entry.jobName}</Text>
        <Text style={styles.time}>
          {formatClockTime(entry.clockIn)} –{' '}
          {entry.clockOut ? formatClockTime(entry.clockOut) : 'Running'}
        </Text>
      </View>

      <View style={styles.right}>
        <Text style={styles.duration}>{formatHoursMinutes(seconds)}</Text>
        {onPress ? (
          <Ionicons
            name="chevron-forward"
            size={17}
            color={colors.textSoft}
          />
        ) : null}
      </View>
    </Pressable>
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
  details: {
    flex: 1,
  },
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
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  duration: {
    color: colors.primary,
    fontWeight: '900',
    fontSize: 14,
  },
  pressed: {
    opacity: 0.76,
  },
});
