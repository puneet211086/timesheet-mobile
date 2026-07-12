import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../constants/theme';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  caption: string;
};

export function DashboardStat({
  icon,
  label,
  value,
  caption,
}: Props) {
  return (
    <View
      accessibilityLabel={`${caption}: ${value}`}
      style={styles.card}
    >
      <View style={styles.topRow}>
        <View style={styles.icon}>
          <Ionicons name={icon} size={19} color={colors.primary} />
        </View>
        <Text style={styles.label}>{label}</Text>
      </View>

      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        numberOfLines={1}
        style={styles.value}
      >
        {value}
      </Text>
      <Text style={styles.caption}>{caption}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 132,
    borderRadius: radius.lg,
    padding: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    marginRight: 9,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  value: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 15,
  },
  caption: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 5,
  },
});
