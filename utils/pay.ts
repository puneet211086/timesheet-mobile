import type { TimeEntry, WeeklySummary } from '../types/models';
import { payableDurationSeconds } from './entry';

export type PayAllocation = {
  workedSeconds: number;
  regularSeconds: number;
  overtimeSeconds: number;
  doubleTimeSeconds: number;
  regularPay: number;
  overtimePay: number;
  doubleTimePay: number;
  grossPay: number;
};

export type PayrollResult = PayAllocation & {
  byEntryId: Map<number, PayAllocation>;
};

const ZERO: PayAllocation = {
  workedSeconds: 0,
  regularSeconds: 0,
  overtimeSeconds: 0,
  doubleTimeSeconds: 0,
  regularPay: 0,
  overtimePay: 0,
  doubleTimePay: 0,
  grossPay: 0,
};

function dayKey(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

function add(a: PayAllocation, b: PayAllocation): PayAllocation {
  return {
    workedSeconds: a.workedSeconds + b.workedSeconds,
    regularSeconds: a.regularSeconds + b.regularSeconds,
    overtimeSeconds: a.overtimeSeconds + b.overtimeSeconds,
    doubleTimeSeconds: a.doubleTimeSeconds + b.doubleTimeSeconds,
    regularPay: a.regularPay + b.regularPay,
    overtimePay: a.overtimePay + b.overtimePay,
    doubleTimePay: a.doubleTimePay + b.doubleTimePay,
    grossPay: a.grossPay + b.grossPay,
  };
}

export function calculatePayroll(
  entries: TimeEntry[],
  now = Date.now(),
): PayrollResult {
  const sorted = [...entries].sort(
    (a, b) => new Date(a.clockIn).getTime() - new Date(b.clockIn).getTime(),
  );

  const byEntryId = new Map<number, PayAllocation>();
  const dailyWorkedByJob = new Map<string, number>();
  const weeklyRegularByJob = new Map<number, number>();
  let total = { ...ZERO };

  for (const entry of sorted) {
    const workedSeconds = payableDurationSeconds(
      entry.clockIn,
      entry.clockOut,
      entry.unpaidBreakMinutes ?? 0,
      now,
    );

    if (workedSeconds <= 0) {
      byEntryId.set(entry.id, { ...ZERO });
      continue;
    }

    const overtimeEnabled = entry.overtimeEnabled !== false;
    const dailyEnabled = overtimeEnabled && entry.dailyOvertimeEnabled;
    const doubleEnabled = overtimeEnabled && entry.doubleTimeEnabled;
    const weeklyEnabled = overtimeEnabled && entry.weeklyOvertimeEnabled;

    const dayMapKey = `${entry.jobId}:${dayKey(entry.clockIn)}`;
    const dailyBefore = dailyWorkedByJob.get(dayMapKey) ?? 0;
    const dailyAfter = dailyBefore + workedSeconds;

    const dailyOtThreshold = Math.max(0, entry.dailyOvertimeHours || 8) * 3600;
    const doubleThreshold = Math.max(
      dailyOtThreshold,
      (entry.doubleTimeHours || 12) * 3600,
    );

    let doubleTimeSeconds = 0;
    if (doubleEnabled) {
      doubleTimeSeconds =
        Math.max(0, dailyAfter - doubleThreshold) -
        Math.max(0, dailyBefore - doubleThreshold);
    }

    let dailyOvertimeSeconds = 0;
    if (dailyEnabled) {
      const upper = doubleEnabled ? doubleThreshold : Number.POSITIVE_INFINITY;
      const beforeBand = Math.max(
        0,
        Math.min(dailyBefore, upper) - dailyOtThreshold,
      );
      const afterBand = Math.max(
        0,
        Math.min(dailyAfter, upper) - dailyOtThreshold,
      );
      dailyOvertimeSeconds = Math.max(0, afterBand - beforeBand);
    }

    let regularSeconds =
      workedSeconds - dailyOvertimeSeconds - doubleTimeSeconds;

    if (weeklyEnabled && regularSeconds > 0) {
      const used = weeklyRegularByJob.get(entry.jobId) ?? 0;
      const threshold = Math.max(0, entry.weeklyOvertimeHours || 40) * 3600;
      const capacity = Math.max(0, threshold - used);
      const promoted = Math.max(0, regularSeconds - capacity);
      regularSeconds -= promoted;
      dailyOvertimeSeconds += promoted;
      weeklyRegularByJob.set(entry.jobId, used + regularSeconds);
    } else {
      weeklyRegularByJob.set(
        entry.jobId,
        (weeklyRegularByJob.get(entry.jobId) ?? 0) + regularSeconds,
      );
    }

    dailyWorkedByJob.set(dayMapKey, dailyAfter);

    const regularPay = (regularSeconds / 3600) * entry.hourlyRate;
    const overtimePay =
      (dailyOvertimeSeconds / 3600) *
      entry.hourlyRate *
      (entry.overtimeMultiplier || 1.5);
    const doubleTimePay =
      (doubleTimeSeconds / 3600) *
      entry.hourlyRate *
      (entry.doubleTimeMultiplier || 2);

    const allocation: PayAllocation = {
      workedSeconds,
      regularSeconds,
      overtimeSeconds: dailyOvertimeSeconds,
      doubleTimeSeconds,
      regularPay,
      overtimePay,
      doubleTimePay,
      grossPay: regularPay + overtimePay + doubleTimePay,
    };

    byEntryId.set(entry.id, allocation);
    total = add(total, allocation);
  }

  return { ...total, byEntryId };
}

export function calculateWeeklySummary(
  entries: TimeEntry[],
  now = Date.now(),
): WeeklySummary {
  const result = calculatePayroll(entries, now);
  const firstJob = entries[0];
  const targetHours =
    firstJob?.weeklyOvertimeEnabled && firstJob.overtimeEnabled !== false
      ? firstJob.weeklyOvertimeHours || 40
      : 40;

  return {
    workedSeconds: result.workedSeconds,
    estimatedPay: result.grossPay,
    regularSeconds: result.regularSeconds,
    overtimeSeconds: result.overtimeSeconds,
    doubleTimeSeconds: result.doubleTimeSeconds,
    targetSeconds: targetHours * 3600,
  };
}
