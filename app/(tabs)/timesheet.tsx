import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../../constants/theme';
import { useTimesheet } from '../../hooks/useTimesheet';
import { entryDurationSeconds } from '../../utils/entry';
import { formatClockTime, formatHoursMinutes } from '../../utils/time';

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export default function TimesheetScreen() {
  const router = useRouter();
  const { todayEntries, refresh } = useTimesheet();

  useFocusEffect(
    useCallback(() => {
      refresh().catch(console.error);
    }, [refresh])
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>TODAY</Text>
        <Text style={styles.title}>Timesheet</Text>
        <Text style={styles.subtitle}>Tap a completed shift to edit or delete it.</Text>

        {todayEntries.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="time-outline" size={28} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No time recorded yet</Text>
            <Text style={styles.emptyText}>Clock in from the Home tab to create your first entry.</Text>
          </View>
        ) : (
          todayEntries.map((entry) => {
            const seconds = entryDurationSeconds(entry.clockIn, entry.clockOut);
            const editable = Boolean(entry.clockOut);
            return (
              <Pressable
                key={entry.id}
                style={({ pressed }) => [styles.entryCard, pressed && editable && styles.pressedCard]}
                onPress={() => editable && router.push(`/entries/${entry.id}`)}
                disabled={!editable}
              >
                <View style={[styles.jobStripe, { backgroundColor: entry.jobColor || colors.primary }]} />
                <View style={styles.entryBody}>
                  <View style={styles.entryTopRow}>
                    <View style={styles.entryText}>
                      <Text style={styles.job}>{entry.jobName}</Text>
                      <Text style={styles.time}>
                        {formatClockTime(entry.clockIn)} – {entry.clockOut ? formatClockTime(entry.clockOut) : 'Running'}
                      </Text>
                    </View>
                    <View style={styles.rightColumn}>
                      <Text style={styles.duration}>{formatHoursMinutes(seconds)}</Text>
                      <Text style={styles.pay}>{currency.format((seconds / 3600) * entry.hourlyRate)}</Text>
                    </View>
                  </View>
                  {entry.notes ? <Text style={styles.notes}>{entry.notes}</Text> : null}
                  {editable ? (
                    <View style={styles.editHint}>
                      <Text style={styles.editHintText}>Edit entry</Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.textSoft} />
                    </View>
                  ) : (
                    <Text style={styles.runningHint}>Clock out before editing</Text>
                  )}
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { padding: 22, paddingBottom: 40 },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1.4, marginTop: 10 },
  title: { fontSize: 34, fontWeight: '900', color: colors.text, marginTop: 4 },
  subtitle: { color: colors.textMuted, fontSize: 15, marginTop: 7, marginBottom: 24 },
  emptyCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 26, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  emptyIcon: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: colors.text, fontWeight: '900', fontSize: 18, marginTop: 14 },
  emptyText: { color: colors.textMuted, marginTop: 8, lineHeight: 21, textAlign: 'center' },
  entryCard: { backgroundColor: colors.surface, borderRadius: radius.md, marginBottom: 12, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', overflow: 'hidden' },
  pressedCard: { opacity: 0.72, transform: [{ scale: 0.995 }] },
  jobStripe: { width: 6 },
  entryBody: { flex: 1, padding: 17 },
  entryTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  entryText: { flex: 1 },
  job: { color: colors.text, fontWeight: '900', fontSize: 16 },
  time: { color: colors.textMuted, marginTop: 6 },
  rightColumn: { alignItems: 'flex-end' },
  duration: { color: colors.primary, fontWeight: '900', fontSize: 15 },
  pay: { color: colors.textMuted, fontSize: 12, fontWeight: '700', marginTop: 5 },
  notes: { color: colors.textMuted, fontSize: 13, marginTop: 10 },
  editHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 12 },
  editHintText: { color: colors.textSoft, fontSize: 12, fontWeight: '700', marginRight: 2 },
  runningHint: { color: colors.success, fontSize: 12, fontWeight: '800', marginTop: 12, textAlign: 'right' },
});
