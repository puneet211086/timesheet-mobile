import { StyleSheet, Text, View } from 'react-native';

type Props = {
  label: string;
  value: string;
};

export function MetricCard({ label, value }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 104,
    borderRadius: 20,
    padding: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  label: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
  },
  value: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 12,
  },
});
