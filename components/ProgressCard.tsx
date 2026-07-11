import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../constants/theme';
import { formatHoursMinutes } from '../utils/time';

type Props = {
  workedSeconds: number;
  targetSeconds: number;
  estimatedPay: number;
};

export function ProgressCard({ workedSeconds, targetSeconds, estimatedPay }: Props) {
  const progress = Math.min(1, workedSeconds / Math.max(1, targetSeconds));
  const percent = Math.round(progress * 100);

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View>
          <Text style={styles.label}>THIS WEEK</Text>
          <Text style={styles.value}>{formatHoursMinutes(workedSeconds)}</Text>
        </View>
        <View style={styles.payWrap}>
          <Text style={styles.payLabel}>Estimated pay</Text>
          <Text style={styles.payValue}>${estimatedPay.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${percent}%` }]} />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>{percent}% of 40 hours</Text>
        <Text style={styles.footerText}>
          {formatHoursMinutes(Math.max(0, targetSeconds - workedSeconds))} left
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  label: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  value: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
    marginTop: 7,
  },
  payWrap: {
    alignItems: 'flex-end',
  },
  payLabel: {
    color: colors.textMuted,
    fontSize: 12,
  },
  payValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 6,
  },
  track: {
    height: 10,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 22,
  },
  fill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
});
