import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../constants/theme';
import { formatHoursMinutes } from '../utils/time';

type Props = {
  workedSeconds: number;
  targetSeconds: number;
  overtimeSeconds: number;
  estimatedPay: number;
  percent: number;
  onPress: () => void;
};

function formatMoney(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

export function WeeklyProgressCard({
  workedSeconds,
  targetSeconds,
  overtimeSeconds,
  estimatedPay,
  percent,
  onPress,
}: Props) {
  const remainingSeconds = Math.max(0, targetSeconds - workedSeconds);
  const hasOvertime = overtimeSeconds > 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Weekly progress, ${formatHoursMinutes(
        workedSeconds,
      )} worked, ${formatMoney(estimatedPay)} estimated pay`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>THIS WEEK</Text>
          <Text style={styles.hours}>
            {formatHoursMinutes(workedSeconds)}
          </Text>
        </View>

        <View style={styles.payWrap}>
          <Text style={styles.payLabel}>Estimated pay</Text>
          <Text style={styles.pay}>{formatMoney(estimatedPay)}</Text>
        </View>
      </View>

      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${Math.max(3, percent)}%` },
            hasOvertime && styles.overtimeFill,
          ]}
        />
      </View>

      <View style={styles.footer}>
        <View>
          <Text style={styles.footerStrong}>
            {hasOvertime
              ? `${formatHoursMinutes(overtimeSeconds)} overtime`
              : `${percent}% of 40 hours`}
          </Text>
          <Text style={styles.footerMuted}>
            {hasOvertime
              ? 'You have crossed the weekly target'
              : `${formatHoursMinutes(remainingSeconds)} remaining`}
          </Text>
        </View>

        <View style={styles.openReports}>
          <Text style={styles.openReportsText}>Reports</Text>
          <Ionicons
            name="chevron-forward"
            size={17}
            color={colors.primary}
          />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 19,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  hours: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
    marginTop: 6,
  },
  payWrap: {
    alignItems: 'flex-end',
  },
  payLabel: {
    color: colors.textMuted,
    fontSize: 11,
  },
  pay: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 5,
  },
  track: {
    height: 10,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 20,
  },
  fill: {
    height: '100%',
    maxWidth: '100%',
    backgroundColor: colors.primary,
    borderRadius: 999,
  },
  overtimeFill: {
    backgroundColor: '#F59E0B',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  footerStrong: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  footerMuted: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 3,
  },
  openReports: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  openReportsText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.78,
  },
});
