import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type CalendarEntry = {
  id: number;
  jobId: number;
  jobName: string;
  jobColor: string;
  hourlyRate: number;
  overtimeMultiplier: number;
  clockIn: string;
  clockOut: string | null;
  notes: string | null;
};

type DaySummary = {
  dateKey: string;
  hours: number;
  earnings: number;
  entries: CalendarEntry[];
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CURRENCY = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function monthBounds(month: Date) {
  const start = new Date(month.getFullYear(), month.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 1, 0, 0, 0, 0);
  return { start: start.toISOString(), end: end.toISOString() };
}

function durationHours(entry: CalendarEntry, now = Date.now()) {
  const start = new Date(entry.clockIn).getTime();
  const end = entry.clockOut ? new Date(entry.clockOut).getTime() : now;
  return Math.max(0, end - start) / 3_600_000;
}

function formatHours(value: number) {
  if (value <= 0) return '0h';
  if (value < 10) return `${value.toFixed(1)}h`;
  return `${Math.round(value)}h`;
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDuration(value: number) {
  const totalMinutes = Math.round(value * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!hours) return `${minutes}m`;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

export default function CalendarScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(
    localDateKey(new Date())
  );
  const [loading, setLoading] = useState(true);

  const loadMonth = useCallback(async () => {
    setLoading(true);
    const { start, end } = monthBounds(visibleMonth);
    const rows = await db.getAllAsync<CalendarEntry>(
      `SELECT
        te.id,
        te.job_id AS jobId,
        j.name AS jobName,
        j.color AS jobColor,
        j.hourly_rate AS hourlyRate,
        j.overtime_multiplier AS overtimeMultiplier,
        te.clock_in AS clockIn,
        te.clock_out AS clockOut,
        te.notes
      FROM time_entries te
      JOIN jobs j ON j.id = te.job_id
      WHERE te.clock_in >= ? AND te.clock_in < ?
      ORDER BY te.clock_in ASC`,
      start,
      end
    );
    setEntries(rows);
    setLoading(false);
  }, [db, visibleMonth]);

  useFocusEffect(
    useCallback(() => {
      loadMonth().catch(console.error);
    }, [loadMonth])
  );

  const summaries = useMemo(() => {
    const map = new Map<string, DaySummary>();
    const now = Date.now();

    for (const entry of entries) {
      const key = localDateKey(new Date(entry.clockIn));
      const hours = durationHours(entry, now);
      const existing = map.get(key) ?? {
        dateKey: key,
        hours: 0,
        earnings: 0,
        entries: [],
      };
      existing.hours += hours;
      existing.earnings += hours * entry.hourlyRate;
      existing.entries.push(entry);
      map.set(key, existing);
    }

    return map;
  }, [entries]);

  const monthTotals = useMemo(() => {
    let hours = 0;
    let earnings = 0;
    summaries.forEach((summary) => {
      hours += summary.hours;
      earnings += summary.earnings;
    });
    return { hours, earnings, days: summaries.size };
  }, [summaries]);

  const calendarDays = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<Date | null> = Array.from({ length: firstWeekday }, () => null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(new Date(year, month, day));
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [visibleMonth]);

  const selectedSummary = selectedDateKey ? summaries.get(selectedDateKey) : undefined;
  const selectedDate = selectedDateKey
    ? new Date(`${selectedDateKey}T12:00:00`)
    : null;
  const todayKey = localDateKey(new Date());

  const changeMonth = (offset: number) => {
    setVisibleMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + offset, 1)
    );
    setSelectedDateKey(null);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.eyebrow}>WORK HISTORY</Text>
            <Text style={styles.title}>Calendar</Text>
          </View>
          <Pressable
            style={styles.todayButton}
            onPress={() => {
              const today = new Date();
              setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
              setSelectedDateKey(localDateKey(today));
            }}
          >
            <Text style={styles.todayButtonText}>Today</Text>
          </Pressable>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryMonth}>
            {visibleMonth.toLocaleDateString([], { month: 'long', year: 'numeric' })}
          </Text>
          <View style={styles.summaryMetrics}>
            <View style={styles.summaryMetric}>
              <Text style={styles.summaryValue}>{formatDuration(monthTotals.hours)}</Text>
              <Text style={styles.summaryLabel}>Hours</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryMetric}>
              <Text style={styles.summaryValue}>{CURRENCY.format(monthTotals.earnings)}</Text>
              <Text style={styles.summaryLabel}>Estimated pay</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryMetric}>
              <Text style={styles.summaryValue}>{monthTotals.days}</Text>
              <Text style={styles.summaryLabel}>Work days</Text>
            </View>
          </View>
        </View>

        <View style={styles.calendarCard}>
          <View style={styles.monthNavigation}>
            <Pressable style={styles.navButton} onPress={() => changeMonth(-1)}>
              <Ionicons name="chevron-back" size={22} color="#111827" />
            </Pressable>
            <Text style={styles.monthTitle}>
              {visibleMonth.toLocaleDateString([], { month: 'long', year: 'numeric' })}
            </Text>
            <Pressable style={styles.navButton} onPress={() => changeMonth(1)}>
              <Ionicons name="chevron-forward" size={22} color="#111827" />
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAYS.map((day) => (
              <Text key={day} style={styles.weekday}>{day}</Text>
            ))}
          </View>

          {loading ? (
            <View style={styles.loader}>
              <ActivityIndicator size="large" color="#2563EB" />
            </View>
          ) : (
            <View style={styles.grid}>
              {calendarDays.map((date, index) => {
                if (!date) return <View key={`empty-${index}`} style={styles.dayCell} />;
                const key = localDateKey(date);
                const summary = summaries.get(key);
                const isToday = key === todayKey;
                const isSelected = key === selectedDateKey;
                return (
                  <Pressable
                    key={key}
                    style={[
                      styles.dayCell,
                      isSelected && styles.selectedCell,
                    ]}
                    onPress={() => setSelectedDateKey(key)}
                  >
                    <View style={[styles.dayNumberCircle, isToday && styles.todayCircle]}>
                      <Text style={[styles.dayNumber, isToday && styles.todayNumber]}>
                        {date.getDate()}
                      </Text>
                    </View>
                    {summary ? (
                      <>
                        <Text style={styles.hoursText}>{formatHours(summary.hours)}</Text>
                        <Text style={styles.earningsText}>{CURRENCY.format(summary.earnings)}</Text>
                      </>
                    ) : (
                      <View style={styles.emptyMarker} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        <Text style={styles.hint}>Tap a day to view its shifts and estimated earnings.</Text>
      </ScrollView>

      <Modal
        visible={Boolean(selectedDateKey)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedDateKey(null)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedDateKey(null)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetDate}>
                  {selectedDate?.toLocaleDateString([], {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
                <Text style={styles.sheetSubtitle}>
                  {selectedSummary
                    ? `${formatDuration(selectedSummary.hours)} · ${CURRENCY.format(selectedSummary.earnings)}`
                    : 'No time recorded'}
                </Text>
              </View>
              <Pressable style={styles.closeButton} onPress={() => setSelectedDateKey(null)}>
                <Ionicons name="close" size={22} color="#374151" />
              </Pressable>
            </View>

            <ScrollView style={styles.entryList} showsVerticalScrollIndicator={false}>
              {selectedSummary?.entries.length ? (
                selectedSummary.entries.map((entry) => {
                  const hours = durationHours(entry);
                  return (
                    <Pressable
                      key={entry.id}
                      style={({ pressed }) => [
                        styles.entryCard,
                        pressed && entry.clockOut && styles.entryCardPressed,
                      ]}
                      disabled={!entry.clockOut}
                      onPress={() => {
                        setSelectedDateKey(null);
                        router.push(`/entries/${entry.id}`);
                      }}
                    >
                      <View style={[styles.jobStripe, { backgroundColor: entry.jobColor || '#2563EB' }]} />
                      <View style={styles.entryBody}>
                        <View style={styles.entryTopRow}>
                          <Text style={styles.entryJob}>{entry.jobName}</Text>
                          <Text style={styles.entryPay}>
                            {CURRENCY.format(hours * entry.hourlyRate)}
                          </Text>
                        </View>
                        <Text style={styles.entryTime}>
                          {formatTime(entry.clockIn)} – {entry.clockOut ? formatTime(entry.clockOut) : 'Working now'}
                        </Text>
                        <View style={styles.entryFooter}>
                          <Text style={styles.entryDuration}>{formatDuration(hours)}</Text>
                          {entry.clockOut ? (
                            <View style={styles.editLink}>
                              <Text style={styles.editLinkText}>Edit</Text>
                              <Ionicons name="chevron-forward" size={15} color="#9CA3AF" />
                            </View>
                          ) : (
                            <Text style={styles.runningText}>Working now</Text>
                          )}
                        </View>
                        {entry.notes ? <Text style={styles.entryNotes}>{entry.notes}</Text> : null}
                      </View>
                    </Pressable>
                  );
                })
              ) : (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIcon}>
                    <Ionicons name="calendar-clear-outline" size={28} color="#6B7280" />
                  </View>
                  <Text style={styles.emptyTitle}>No shifts recorded</Text>
                  <Text style={styles.emptyText}>Clocked time for this day will appear here.</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F6F7FB' },
  content: { padding: 20, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 20 },
  eyebrow: { color: '#2563EB', fontSize: 12, fontWeight: '800', letterSpacing: 1.4 },
  title: { color: '#111827', fontSize: 34, fontWeight: '900', marginTop: 4 },
  todayButton: { backgroundColor: '#E8EFFF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999 },
  todayButtonText: { color: '#2563EB', fontWeight: '800' },
  summaryCard: { backgroundColor: '#111827', borderRadius: 24, padding: 20, marginBottom: 16 },
  summaryMonth: { color: '#9CA3AF', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  summaryMetrics: { flexDirection: 'row', alignItems: 'center', marginTop: 18 },
  summaryMetric: { flex: 1 },
  summaryValue: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  summaryLabel: { color: '#9CA3AF', fontSize: 12, marginTop: 5 },
  summaryDivider: { width: 1, height: 42, backgroundColor: '#374151', marginHorizontal: 12 },
  calendarCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  monthNavigation: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2, marginBottom: 16 },
  navButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  monthTitle: { color: '#111827', fontSize: 18, fontWeight: '900' },
  weekRow: { flexDirection: 'row', marginBottom: 6 },
  weekday: { width: '14.2857%', textAlign: 'center', color: '#9CA3AF', fontSize: 11, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.2857%', minHeight: 72, alignItems: 'center', paddingTop: 6, borderRadius: 12 },
  selectedCell: { backgroundColor: '#EFF4FF' },
  dayNumberCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  todayCircle: { backgroundColor: '#2563EB' },
  dayNumber: { color: '#374151', fontSize: 13, fontWeight: '800' },
  todayNumber: { color: '#FFFFFF' },
  hoursText: { color: '#111827', fontSize: 11, fontWeight: '900', marginTop: 5 },
  earningsText: { color: '#6B7280', fontSize: 9, fontWeight: '700', marginTop: 2 },
  emptyMarker: { height: 20 },
  loader: { height: 350, alignItems: 'center', justifyContent: 'center' },
  hint: { color: '#9CA3AF', textAlign: 'center', fontSize: 12, marginTop: 14 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(17,24,39,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#F9FAFB', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: '78%', minHeight: 310 },
  sheetHandle: { width: 44, height: 5, borderRadius: 999, backgroundColor: '#D1D5DB', alignSelf: 'center', marginBottom: 18 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  sheetDate: { color: '#111827', fontSize: 22, fontWeight: '900' },
  sheetSubtitle: { color: '#6B7280', fontSize: 14, marginTop: 5 },
  closeButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  entryList: { flexGrow: 0 },
  entryCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 18, overflow: 'hidden', marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  entryCardPressed: { opacity: 0.72 },
  jobStripe: { width: 6 },
  entryBody: { flex: 1, padding: 16 },
  entryTopRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  entryJob: { color: '#111827', fontSize: 16, fontWeight: '900', flex: 1 },
  entryPay: { color: '#2563EB', fontSize: 16, fontWeight: '900' },
  entryTime: { color: '#4B5563', fontSize: 14, marginTop: 8 },
  entryFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  entryDuration: { color: '#111827', fontSize: 13, fontWeight: '800' },
  editLink: { flexDirection: 'row', alignItems: 'center' },
  editLinkText: { color: '#9CA3AF', fontSize: 12, fontWeight: '700' },
  runningText: { color: '#16A34A', fontSize: 12, fontWeight: '800' },
  entryNotes: { color: '#6B7280', fontSize: 13, marginTop: 8 },
  emptyState: { alignItems: 'center', paddingVertical: 42 },
  emptyIcon: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: '#111827', fontSize: 17, fontWeight: '900', marginTop: 14 },
  emptyText: { color: '#6B7280', fontSize: 13, marginTop: 6, textAlign: 'center' },
});
