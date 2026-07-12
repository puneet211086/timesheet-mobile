import type { TimeEntry } from '../types/models';
import { calculatePayroll } from '../utils/pay';

export type ReportPeriod = 'week' | 'month';

export type JobReport = {
  jobId: number;
  jobName: string;
  jobColor: string;
  workedSeconds: number;
  regularSeconds: number;
  overtimeSeconds: number;
  doubleTimeSeconds: number;
  estimatedPay: number;
  shiftCount: number;
  percentage: number;
};

export type DailyReport = {
  dateKey: string;
  label: string;
  workedSeconds: number;
  regularSeconds: number;
  overtimeSeconds: number;
  doubleTimeSeconds: number;
  estimatedPay: number;
  shiftCount: number;
};

export type ReportSummary = {
  workedSeconds: number;
  regularSeconds: number;
  overtimeSeconds: number;
  doubleTimeSeconds: number;
  estimatedPay: number;
  shiftCount: number;
  workDayCount: number;
  averageSecondsPerWorkDay: number;
  jobs: JobReport[];
  days: DailyReport[];
};

function localDateKey(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

function dayLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function buildReport(
  entries: TimeEntry[],
  _period: ReportPeriod,
): ReportSummary {
  const completed = entries
    .filter((entry) => Boolean(entry.clockOut))
    .sort(
      (a, b) =>
        new Date(a.clockIn).getTime() - new Date(b.clockIn).getTime(),
    );

  const payroll = calculatePayroll(completed);
  const jobMap = new Map<number, Omit<JobReport, 'percentage'>>();
  const dayMap = new Map<string, DailyReport>();

  for (const entry of completed) {
    const allocation = payroll.byEntryId.get(entry.id);
    if (!allocation || allocation.workedSeconds <= 0) continue;

    const job = jobMap.get(entry.jobId) ?? {
      jobId: entry.jobId,
      jobName: entry.jobName,
      jobColor: entry.jobColor ?? '#2563EB',
      workedSeconds: 0,
      regularSeconds: 0,
      overtimeSeconds: 0,
      doubleTimeSeconds: 0,
      estimatedPay: 0,
      shiftCount: 0,
    };

    job.workedSeconds += allocation.workedSeconds;
    job.regularSeconds += allocation.regularSeconds;
    job.overtimeSeconds += allocation.overtimeSeconds;
    job.doubleTimeSeconds += allocation.doubleTimeSeconds;
    job.estimatedPay += allocation.grossPay;
    job.shiftCount += 1;
    jobMap.set(entry.jobId, job);

    const key = localDateKey(entry.clockIn);
    const day = dayMap.get(key) ?? {
      dateKey: key,
      label: dayLabel(key),
      workedSeconds: 0,
      regularSeconds: 0,
      overtimeSeconds: 0,
      doubleTimeSeconds: 0,
      estimatedPay: 0,
      shiftCount: 0,
    };

    day.workedSeconds += allocation.workedSeconds;
    day.regularSeconds += allocation.regularSeconds;
    day.overtimeSeconds += allocation.overtimeSeconds;
    day.doubleTimeSeconds += allocation.doubleTimeSeconds;
    day.estimatedPay += allocation.grossPay;
    day.shiftCount += 1;
    dayMap.set(key, day);
  }

  const jobs = Array.from(jobMap.values())
    .map((job) => ({
      ...job,
      percentage:
        payroll.workedSeconds > 0
          ? (job.workedSeconds / payroll.workedSeconds) * 100
          : 0,
    }))
    .sort((a, b) => b.workedSeconds - a.workedSeconds);

  const days = Array.from(dayMap.values()).sort((a, b) =>
    a.dateKey.localeCompare(b.dateKey),
  );

  return {
    workedSeconds: payroll.workedSeconds,
    regularSeconds: payroll.regularSeconds,
    overtimeSeconds: payroll.overtimeSeconds,
    doubleTimeSeconds: payroll.doubleTimeSeconds,
    estimatedPay: payroll.grossPay,
    shiftCount: completed.length,
    workDayCount: days.length,
    averageSecondsPerWorkDay:
      days.length > 0 ? Math.round(payroll.workedSeconds / days.length) : 0,
    jobs,
    days,
  };
}
