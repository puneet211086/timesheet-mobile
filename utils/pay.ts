import type { TimeEntry, WeeklySummary } from '../types/models';
import { payableDurationSeconds } from './entry';

const WEEKLY_TARGET_SECONDS = 40 * 60 * 60;

export function calculateWeeklySummary(
  entries: TimeEntry[],
  now = Date.now()
): WeeklySummary {
  let workedSeconds = 0;
  let estimatedPay = 0;
  let regularSecondsUsed = 0;

  const chronologicalEntries = [...entries].sort(
    (a, b) => new Date(a.clockIn).getTime() - new Date(b.clockIn).getTime()
  );

  for (const entry of chronologicalEntries) {
    const seconds = payableDurationSeconds(
      entry.clockIn,
      entry.clockOut,
      entry.unpaidBreakMinutes,
      now
    );
    const regularCapacity = Math.max(
      0,
      WEEKLY_TARGET_SECONDS - regularSecondsUsed
    );
    const regularSeconds = Math.min(seconds, regularCapacity);
    const overtimeSeconds = Math.max(0, seconds - regularSeconds);
    const overtimeMultiplier = entry.overtimeMultiplier ?? 1.5;

    workedSeconds += seconds;
    regularSecondsUsed += regularSeconds;
    estimatedPay += (regularSeconds / 3600) * entry.hourlyRate;
    estimatedPay +=
      (overtimeSeconds / 3600) * entry.hourlyRate * overtimeMultiplier;
  }

  return {
    workedSeconds,
    estimatedPay,
    regularSeconds: Math.min(workedSeconds, WEEKLY_TARGET_SECONDS),
    overtimeSeconds: Math.max(0, workedSeconds - WEEKLY_TARGET_SECONDS),
    targetSeconds: WEEKLY_TARGET_SECONDS,
  };
}
