import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useReports } from '../../hooks/useReports';
import { exportReportCsv, exportReportPdf } from '../../services/exportService';

function formatHours(seconds: number): string {
  return `${(seconds / 3600).toFixed(seconds >= 36000 ? 1 : 2)}h`;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

export default function ReportsScreen() {
  const {
    loading,
    movePeriod,
    period,
    report,
    resetToCurrentPeriod,
    setPeriod,
    title,
  } = useReports();
  const [exporting, setExporting] = useState<'pdf' | 'csv' | null>(null);

  const runExport = async (type: 'pdf' | 'csv') => {
    if (report.shiftCount === 0) {
      Alert.alert('Nothing to export', 'Complete at least one shift in this period first.');
      return;
    }

    setExporting(type);
    try {
      if (type === 'pdf') await exportReportPdf(report, title, period);
      else await exportReportCsv(report, title, period);
    } catch (error) {
      console.error(error);
      Alert.alert('Export failed', 'The report could not be exported. Please try again.');
    } finally {
      setExporting(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.eyebrow}>INSIGHTS</Text>
            <Text style={styles.title}>Reports</Text>
          </View>
          <Pressable style={styles.todayButton} onPress={resetToCurrentPeriod}>
            <Text style={styles.todayButtonText}>Current</Text>
          </Pressable>
        </View>

        <View style={styles.segmentedControl}>
          {(['week', 'month'] as const).map((value) => (
            <Pressable
              key={value}
              style={[styles.segment, period === value && styles.segmentActive]}
              onPress={() => setPeriod(value)}
            >
              <Text style={[styles.segmentText, period === value && styles.segmentTextActive]}>
                {value === 'week' ? 'Weekly' : 'Monthly'}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.periodNavigator}>
          <Pressable style={styles.iconButton} onPress={() => movePeriod(-1)}>
            <Ionicons name="chevron-back" size={21} color="#111827" />
          </Pressable>
          <Text style={styles.periodTitle}>{title}</Text>
          <Pressable style={styles.iconButton} onPress={() => movePeriod(1)}>
            <Ionicons name="chevron-forward" size={21} color="#111827" />
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator style={styles.loader} size="large" color="#2563EB" />
        ) : (
          <>
            <View style={styles.exportRow}>
              <Pressable
                style={({ pressed }) => [styles.exportButton, pressed && styles.pressed]}
                disabled={exporting !== null}
                onPress={() => void runExport('pdf')}
              >
                {exporting === 'pdf' ? (
                  <ActivityIndicator color="#2563EB" />
                ) : (
                  <Ionicons name="document-text-outline" size={20} color="#2563EB" />
                )}
                <Text style={styles.exportButtonText}>PDF</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.exportButton, pressed && styles.pressed]}
                disabled={exporting !== null}
                onPress={() => void runExport('csv')}
              >
                {exporting === 'csv' ? (
                  <ActivityIndicator color="#2563EB" />
                ) : (
                  <Ionicons name="grid-outline" size={20} color="#2563EB" />
                )}
                <Text style={styles.exportButtonText}>CSV</Text>
              </Pressable>
            </View>

            <View style={styles.heroCard}>
              <Text style={styles.heroLabel}>ESTIMATED GROSS PAY</Text>
              <Text style={styles.heroValue}>{formatCurrency(report.estimatedPay)}</Text>
              <View style={styles.heroDivider} />
              <View style={styles.heroStats}>
                <View>
                  <Text style={styles.heroStatValue}>{formatHours(report.workedSeconds)}</Text>
                  <Text style={styles.heroStatLabel}>Total hours</Text>
                </View>
                <View>
                  <Text style={styles.heroStatValue}>{report.shiftCount}</Text>
                  <Text style={styles.heroStatLabel}>Completed shifts</Text>
                </View>
                <View>
                  <Text style={styles.heroStatValue}>{report.workDayCount}</Text>
                  <Text style={styles.heroStatLabel}>Work days</Text>
                </View>
              </View>
            </View>

            <View style={styles.metricGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Regular</Text>
                <Text style={styles.metricValue}>{formatHours(report.regularSeconds)}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Overtime</Text>
                <Text style={styles.metricValue}>{formatHours(report.overtimeSeconds)}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Daily average</Text>
                <Text style={styles.metricValue}>{formatDuration(report.averageSecondsPerWorkDay)}</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Jobs</Text>
            <View style={styles.sectionCard}>
              {report.jobs.length === 0 ? (
                <Text style={styles.emptyText}>No completed shifts in this period.</Text>
              ) : (
                report.jobs.map((job, index) => (
                  <View
                    key={job.jobId}
                    style={[styles.breakdownItem, index < report.jobs.length - 1 && styles.itemBorder]}
                  >
                    <View style={styles.breakdownHeader}>
                      <View style={styles.jobIdentity}>
                        <View style={[styles.jobDot, { backgroundColor: job.jobColor }]} />
                        <View>
                          <Text style={styles.itemTitle}>{job.jobName}</Text>
                          <Text style={styles.itemSubtitle}>
                            {job.shiftCount} shift{job.shiftCount === 1 ? '' : 's'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.itemValues}>
                        <Text style={styles.itemValue}>{formatHours(job.workedSeconds)}</Text>
                        <Text style={styles.itemPay}>{formatCurrency(job.estimatedPay)}</Text>
                      </View>
                    </View>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${Math.min(100, job.percentage)}%`, backgroundColor: job.jobColor },
                        ]}
                      />
                    </View>
                  </View>
                ))
              )}
            </View>

            <Text style={styles.sectionTitle}>Daily breakdown</Text>
            <View style={styles.sectionCard}>
              {report.days.length === 0 ? (
                <Text style={styles.emptyText}>
                  Your daily totals will appear here after you complete a shift.
                </Text>
              ) : (
                report.days.map((day, index) => (
                  <View
                    key={day.dateKey}
                    style={[styles.dayRow, index < report.days.length - 1 && styles.itemBorder]}
                  >
                    <View>
                      <Text style={styles.itemTitle}>{day.label}</Text>
                      <Text style={styles.itemSubtitle}>
                        {day.shiftCount} shift{day.shiftCount === 1 ? '' : 's'}
                      </Text>
                    </View>
                    <View style={styles.itemValues}>
                      <Text style={styles.itemValue}>{formatHours(day.workedSeconds)}</Text>
                      <Text style={styles.itemPay}>{formatCurrency(day.estimatedPay)}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F8FC' },
  container: { padding: 20, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  eyebrow: { fontSize: 12, fontWeight: '800', color: '#2563EB', letterSpacing: 1.3 },
  title: { fontSize: 32, fontWeight: '800', color: '#111827', marginTop: 3 },
  todayButton: { backgroundColor: '#E8EEFF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9 },
  todayButtonText: { color: '#2563EB', fontWeight: '700' },
  segmentedControl: { flexDirection: 'row', backgroundColor: '#E5E7EB', borderRadius: 14, padding: 4, marginTop: 22 },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 11 },
  segmentActive: { backgroundColor: '#FFFFFF' },
  segmentText: { color: '#6B7280', fontWeight: '700' },
  segmentTextActive: { color: '#111827' },
  periodNavigator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 18 },
  iconButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  periodTitle: { color: '#111827', fontSize: 16, fontWeight: '800', textAlign: 'center', flex: 1 },
  loader: { marginTop: 80 },
  exportRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  exportButton: { flex: 1, minHeight: 48, borderRadius: 15, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DBEAFE', flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  exportButtonText: { color: '#2563EB', fontSize: 15, fontWeight: '800' },
  pressed: { opacity: 0.7 },
  heroCard: { backgroundColor: '#1D4ED8', borderRadius: 24, padding: 22 },
  heroLabel: { color: '#BFDBFE', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  heroValue: { color: '#FFFFFF', fontSize: 40, fontWeight: '800', marginTop: 8 },
  heroDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.22)', marginVertical: 20 },
  heroStats: { flexDirection: 'row', justifyContent: 'space-between' },
  heroStatValue: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  heroStatLabel: { color: '#BFDBFE', fontSize: 12, marginTop: 4 },
  metricGrid: { flexDirection: 'row', gap: 10, marginTop: 12 },
  metricCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 18, padding: 14, minHeight: 96 },
  metricLabel: { color: '#6B7280', fontSize: 12, fontWeight: '700' },
  metricValue: { color: '#111827', fontSize: 19, fontWeight: '800', marginTop: 12 },
  sectionTitle: { color: '#111827', fontSize: 20, fontWeight: '800', marginTop: 26, marginBottom: 10 },
  sectionCard: { backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 16 },
  breakdownItem: { paddingVertical: 16 },
  itemBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  breakdownHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  jobIdentity: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  jobDot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  itemTitle: { color: '#111827', fontSize: 15, fontWeight: '700' },
  itemSubtitle: { color: '#9CA3AF', fontSize: 12, marginTop: 3 },
  itemValues: { alignItems: 'flex-end', marginLeft: 12 },
  itemValue: { color: '#111827', fontSize: 15, fontWeight: '800' },
  itemPay: { color: '#6B7280', fontSize: 12, marginTop: 3 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: '#EEF2F7', marginTop: 12, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  dayRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15 },
  emptyText: { color: '#6B7280', fontSize: 14, lineHeight: 21, paddingVertical: 22, textAlign: 'center' },
});
