import type { TimeEntry } from '../types/models';
import { payableDurationSeconds } from '../utils/entry';

export type ReportPeriod = 'week' | 'month';
export type JobReport = {
  jobId: number;
  jobName: string;
  jobColor: string;
  workedSeconds: number;
  regularSeconds: number;
  overtimeSeconds: number;
  estimatedPay: number;
  shiftCount: number;
  percentage: number;
};
export type DailyReport = {
  dateKey: string;
  label: string;
  workedSeconds: number;
  estimatedPay: number;
  shiftCount: number;
};
export type ReportSummary = {
  workedSeconds: number;
  regularSeconds: number;
  overtimeSeconds: number;
  estimatedPay: number;
  shiftCount: number;
  workDayCount: number;
  averageSecondsPerWorkDay: number;
  jobs: JobReport[];
  days: DailyReport[];
};

const WEEKLY_OVERTIME_SECONDS = 40 * 60 * 60;

export function getEntryDurationSeconds(entry: TimeEntry): number {
  if (!entry.clockOut) return 0;
  return payableDurationSeconds(
    entry.clockIn,
    entry.clockOut,
    entry.unpaidBreakMinutes
  );
}

function localDateKey(iso: string): string {
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dayLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

export function buildReport(entries: TimeEntry[], period: ReportPeriod): ReportSummary {
  const completed = entries
    .filter((entry) => Boolean(entry.clockOut))
    .sort((a, b) => new Date(a.clockIn).getTime() - new Date(b.clockIn).getTime());

  const jobMap = new Map<number, Omit<JobReport, 'percentage'>>();
  const dayMap = new Map<string, DailyReport>();
  let workedSeconds = 0;
  let regularSeconds = 0;
  let overtimeSeconds = 0;
  let estimatedPay = 0;
  let weeklyRegularUsed = 0;

  for (const entry of completed) {
    const seconds = getEntryDurationSeconds(entry);
    if (seconds <= 0) continue;

    let entryRegularSeconds = seconds;
    let entryOvertimeSeconds = 0;
    if (period === 'week') {
      const regularCapacity = Math.max(0, WEEKLY_OVERTIME_SECONDS - weeklyRegularUsed);
      entryRegularSeconds = Math.min(seconds, regularCapacity);
      entryOvertimeSeconds = Math.max(0, seconds - entryRegularSeconds);
      weeklyRegularUsed += entryRegularSeconds;
    }

    const multiplier = entry.overtimeMultiplier ?? 1.5;
    const entryPay =
      (entryRegularSeconds / 3600) * entry.hourlyRate +
      (entryOvertimeSeconds / 3600) * entry.hourlyRate * multiplier;

    workedSeconds += seconds;
    regularSeconds += entryRegularSeconds;
    overtimeSeconds += entryOvertimeSeconds;
    estimatedPay += entryPay;

    const existingJob = jobMap.get(entry.jobId) ?? {
      jobId: entry.jobId,
      jobName: entry.jobName,
      jobColor: entry.jobColor ?? '#2563EB',
      workedSeconds: 0,
      regularSeconds: 0,
      overtimeSeconds: 0,
      estimatedPay: 0,
      shiftCount: 0,
    };
    existingJob.workedSeconds += seconds;
    existingJob.regularSeconds += entryRegularSeconds;
    existingJob.overtimeSeconds += entryOvertimeSeconds;
    existingJob.estimatedPay += entryPay;
    existingJob.shiftCount += 1;
    jobMap.set(entry.jobId, existingJob);

    const dateKey = localDateKey(entry.clockIn);
    const existingDay = dayMap.get(dateKey) ?? {
      dateKey,
      label: dayLabel(dateKey),
      workedSeconds: 0,
      estimatedPay: 0,
      shiftCount: 0,
    };
    existingDay.workedSeconds += seconds;
    existingDay.estimatedPay += entryPay;
    existingDay.shiftCount += 1;
    dayMap.set(dateKey, existingDay);
  }

  const jobs = Array.from(jobMap.values())
    .map((job) => ({
      ...job,
      percentage: workedSeconds > 0 ? (job.workedSeconds / workedSeconds) * 100 : 0,
    }))
    .sort((a, b) => b.workedSeconds - a.workedSeconds);

  const days = Array.from(dayMap.values()).sort((a, b) =>
    a.dateKey.localeCompare(b.dateKey)
  );

  return {
    workedSeconds,
    regularSeconds,
    overtimeSeconds,
    estimatedPay,
    shiftCount: completed.length,
    workDayCount: days.length,
    averageSecondsPerWorkDay: days.length ? Math.round(workedSeconds / days.length) : 0,
    jobs,
    days,
  };
}
