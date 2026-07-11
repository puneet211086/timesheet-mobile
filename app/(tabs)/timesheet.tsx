import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTimesheet } from '../../hooks/useTimesheet';
import { formatClockTime, formatDuration } from '../../utils/time';

export default function TimesheetScreen() {
  const { todayEntries } = useTimesheet();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Timesheet</Text>
        <Text style={styles.subtitle}>Today’s recorded shifts</Text>

        {todayEntries.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No time recorded yet</Text>
            <Text style={styles.emptyText}>Clock in from the Home tab to create your first entry.</Text>
          </View>
        ) : (
          todayEntries.map((entry) => {
            const end = entry.clockOut ? new Date(entry.clockOut).getTime() : Date.now();
            const seconds = (end - new Date(entry.clockIn).getTime()) / 1000;
            return (
              <View key={entry.id} style={styles.entryCard}>
                <View>
                  <Text style={styles.job}>{entry.jobName}</Text>
                  <Text style={styles.time}>
                    {formatClockTime(entry.clockIn)} – {entry.clockOut ? formatClockTime(entry.clockOut) : 'Running'}
                  </Text>
                </View>
                <Text style={styles.duration}>{formatDuration(seconds)}</Text>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F8FC' },
  container: { padding: 22 },
  title: { fontSize: 32, fontWeight: '800', color: '#111827', marginTop: 14 },
  subtitle: { color: '#6B7280', fontSize: 16, marginTop: 6, marginBottom: 24 },
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: '#E5E7EB' },
  emptyTitle: { color: '#111827', fontWeight: '800', fontSize: 18 },
  emptyText: { color: '#6B7280', marginTop: 8, lineHeight: 21 },
  entryCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  job: { color: '#111827', fontWeight: '800', fontSize: 16 },
  time: { color: '#6B7280', marginTop: 6 },
  duration: { color: '#2563EB', fontWeight: '800' },
});
