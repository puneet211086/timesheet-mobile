import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  AppearancePreference,
  CURRENCY_OPTIONS,
  CurrencyCode,
  TimeFormat,
  WeekStart,
} from '../constants/appPreferences';
import { formatCurrency, formatTime, usePreferences } from '../components/PreferencesProvider';

type Option<T extends string> = { value: T; label: string; detail?: string };

const WEEK_OPTIONS: Option<WeekStart>[] = [
  { value: 'monday', label: 'Monday', detail: 'Common for workweek reporting' },
  { value: 'sunday', label: 'Sunday', detail: 'Common US calendar layout' },
];

const TIME_OPTIONS: Option<TimeFormat>[] = [
  { value: 'system', label: 'System', detail: 'Follow iPhone settings' },
  { value: '12h', label: '12-hour', detail: '8:30 AM' },
  { value: '24h', label: '24-hour', detail: '08:30' },
];

const APPEARANCE_OPTIONS: Option<AppearancePreference>[] = [
  { value: 'system', label: 'System', detail: 'Follow iPhone appearance' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export default function PreferencesScreen() {
  const { preferences, theme, updatePreference } = usePreferences();

  const styles = createStyles(theme.colors);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: 'Preferences' }} />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Display & formatting</Text>
        <Text style={styles.subtitle}>
          Choose how time, pay, weeks, and appearance should be presented.
        </Text>

        <SectionTitle text="CURRENCY" styles={styles} />
        <View style={styles.card}>
          {CURRENCY_OPTIONS.map((option, index) => (
            <OptionRow
              key={option.code}
              label={`${option.symbol}  ${option.label}`}
              detail={option.code}
              selected={preferences.currency === option.code}
              onPress={() => void updatePreference('currency', option.code as CurrencyCode)}
              showDivider={index < CURRENCY_OPTIONS.length - 1}
              styles={styles}
            />
          ))}
        </View>

        <SectionTitle text="WEEK STARTS ON" styles={styles} />
        <View style={styles.card}>
          {WEEK_OPTIONS.map((option, index) => (
            <OptionRow
              key={option.value}
              label={option.label}
              detail={option.detail}
              selected={preferences.weekStart === option.value}
              onPress={() => void updatePreference('weekStart', option.value)}
              showDivider={index < WEEK_OPTIONS.length - 1}
              styles={styles}
            />
          ))}
        </View>

        <SectionTitle text="TIME FORMAT" styles={styles} />
        <View style={styles.card}>
          {TIME_OPTIONS.map((option, index) => (
            <OptionRow
              key={option.value}
              label={option.label}
              detail={option.detail}
              selected={preferences.timeFormat === option.value}
              onPress={() => void updatePreference('timeFormat', option.value)}
              showDivider={index < TIME_OPTIONS.length - 1}
              styles={styles}
            />
          ))}
        </View>

        <SectionTitle text="APPEARANCE" styles={styles} />
        <View style={styles.card}>
          {APPEARANCE_OPTIONS.map((option, index) => (
            <OptionRow
              key={option.value}
              label={option.label}
              detail={option.detail}
              selected={preferences.appearance === option.value}
              onPress={() => void updatePreference('appearance', option.value)}
              showDivider={index < APPEARANCE_OPTIONS.length - 1}
              styles={styles}
            />
          ))}
        </View>

        <View style={styles.previewCard}>
          <View style={styles.previewIcon}>
            <Ionicons name="eye-outline" size={22} color={theme.colors.primary} />
          </View>
          <View style={styles.previewCopy}>
            <Text style={styles.previewLabel}>Preview</Text>
            <Text style={styles.previewValue}>
              {formatCurrency(1284.5, preferences.currency)} · {formatTime(new Date(2026, 6, 12, 17, 30), preferences.timeFormat)}
            </Text>
            <Text style={styles.previewDetail}>
              Week starts on {preferences.weekStart === 'monday' ? 'Monday' : 'Sunday'}.
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Appearance changes apply immediately. Currency, time, and week settings are now stored centrally for Dashboard, Calendar, Reports, and exports.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionTitle({ text, styles }: { text: string; styles: ReturnType<typeof createStyles> }) {
  return <Text style={styles.sectionTitle}>{text}</Text>;
}

function OptionRow({
  label,
  detail,
  selected,
  onPress,
  showDivider,
  styles,
}: {
  label: string;
  detail?: string;
  selected: boolean;
  onPress: () => void;
  showDivider: boolean;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <>
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ checked: selected }}
        onPress={onPress}
        style={({ pressed }) => [styles.optionRow, pressed && styles.pressed]}
      >
        <View style={styles.optionCopy}>
          <Text style={styles.optionLabel}>{label}</Text>
          {detail ? <Text style={styles.optionDetail}>{detail}</Text> : null}
        </View>
        <Ionicons
          name={selected ? 'checkmark-circle' : 'ellipse-outline'}
          size={23}
          color={selected ? styles.tokens.primary : styles.tokens.textMuted}
        />
      </Pressable>
      {showDivider ? <View style={styles.divider} /> : null}
    </>
  );
}

function createStyles(colors: {
  background: string;
  card: string;
  cardMuted: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  primarySoft: string;
}) {
  return Object.assign(
    StyleSheet.create({
      safeArea: { flex: 1, backgroundColor: colors.background },
      container: { padding: 22, paddingBottom: 44 },
      title: { color: colors.text, fontSize: 29, fontWeight: '800', marginTop: 12 },
      subtitle: { color: colors.textMuted, fontSize: 15, lineHeight: 22, marginTop: 7, marginBottom: 8 },
      sectionTitle: { color: colors.textMuted, fontSize: 12, fontWeight: '800', letterSpacing: 1.2, marginTop: 25, marginBottom: 9 },
      card: { backgroundColor: colors.card, borderRadius: 20, paddingHorizontal: 17, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
      optionRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center' },
      optionCopy: { flex: 1, paddingVertical: 11, paddingRight: 12 },
      optionLabel: { color: colors.text, fontSize: 15, fontWeight: '800' },
      optionDetail: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
      divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
      pressed: { opacity: 0.7 },
      previewCard: { flexDirection: 'row', backgroundColor: colors.cardMuted, borderRadius: 18, padding: 16, marginTop: 25 },
      previewIcon: { width: 43, height: 43, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 13 },
      previewCopy: { flex: 1 },
      previewLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '800', letterSpacing: 0.7 },
      previewValue: { color: colors.text, fontSize: 17, fontWeight: '800', marginTop: 4 },
      previewDetail: { color: colors.textMuted, fontSize: 12, marginTop: 5 },
      footer: { color: colors.textMuted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 20 },
    }),
    { tokens: colors },
  );
}
