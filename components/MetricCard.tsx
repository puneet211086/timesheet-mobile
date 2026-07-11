import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../constants/theme';

type Props = {
  label: string;
  value: string;
  icon?: ReactNode;
  hint?: string;
};

export function MetricCard({ label, value, icon, hint }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        {icon}
      </View>
      <Text style={styles.value}>{value}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 124,
    borderRadius: radius.lg,
    padding: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  value: {
    color: colors.text,
    fontSize: 25,
    fontWeight: '900',
    marginTop: 16,
  },
  hint: {
    color: colors.textSoft,
    fontSize: 12,
    marginTop: 6,
  },
});
