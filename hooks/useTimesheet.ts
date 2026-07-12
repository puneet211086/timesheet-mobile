import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import type { Job, TimeEntry } from '../types/models';
import {
  endOfLocalDayIso,
  endOfLocalWeekIso,
  startOfLocalDayIso,
  startOfLocalWeekIso,
} from '../utils/time';
import { calculatePayroll, calculateWeeklySummary } from '../utils/pay';
import {
  cancelScheduledReminder,
  scheduleForgottenClockOutReminder,
} from '../services/notificationService';

type JobRow = Omit<
  Job,
  | 'isActive'
  | 'overtimeEnabled'
  | 'weeklyOvertimeEnabled'
  | 'dailyOvertimeEnabled'
  | 'doubleTimeEnabled'
> & {
  isActive: number;
  overtimeEnabled: number;
  weeklyOvertimeEnabled: number;
  dailyOvertimeEnabled: number;
  doubleTimeEnabled: number;
};

const JOB_SELECT = `
  SELECT id, name, hourly_rate AS hourlyRate,
         overtime_multiplier AS overtimeMultiplier,
         overtime_enabled AS overtimeEnabled,
         weekly_overtime_enabled AS weeklyOvertimeEnabled,
         weekly_overtime_hours AS weeklyOvertimeHours,
         daily_overtime_enabled AS dailyOvertimeEnabled,
         daily_overtime_hours AS dailyOvertimeHours,
         double_time_enabled AS doubleTimeEnabled,
         double_time_hours AS doubleTimeHours,
         double_time_multiplier AS doubleTimeMultiplier,
         color, is_active AS isActive,
         created_at AS createdAt, updated_at AS updatedAt
  FROM jobs
`;

const ENTRY_SELECT = `
  SELECT te.id, te.job_id AS jobId, j.name AS jobName,
         j.hourly_rate AS hourlyRate,
         j.overtime_multiplier AS overtimeMultiplier,
         j.overtime_enabled AS overtimeEnabled,
         j.weekly_overtime_enabled AS weeklyOvertimeEnabled,
         j.weekly_overtime_hours AS weeklyOvertimeHours,
         j.daily_overtime_enabled AS dailyOvertimeEnabled,
         j.daily_overtime_hours AS dailyOvertimeHours,
         j.double_time_enabled AS doubleTimeEnabled,
         j.double_time_hours AS doubleTimeHours,
         j.double_time_multiplier AS doubleTimeMultiplier,
         j.color AS jobColor,
         te.clock_in AS clockIn, te.clock_out AS clockOut,
         te.notes, te.unpaid_break_minutes AS unpaidBreakMinutes,
         te.reminder_notification_id AS reminderNotificationId
  FROM time_entries te
  JOIN jobs j ON j.id = te.job_id
`;

function mapJob(row: JobRow): Job {
  return {
    ...row,
    isActive: Boolean(row.isActive),
    overtimeEnabled: Boolean(row.overtimeEnabled),
    weeklyOvertimeEnabled: Boolean(row.weeklyOvertimeEnabled),
    dailyOvertimeEnabled: Boolean(row.dailyOvertimeEnabled),
    doubleTimeEnabled: Boolean(row.doubleTimeEnabled),
  };
}

export function useTimesheet() {
  const db = useSQLiteContext();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [todayEntries, setTodayEntries] = useState<TimeEntry[]>([]);
  const [weekEntries, setWeekEntries] = useState<TimeEntry[]>([]);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const rows = await db.getAllAsync<JobRow>(
      `${JOB_SELECT} WHERE is_active = 1 ORDER BY name COLLATE NOCASE`,
    );
    const activeJobs = rows.map(mapJob);
    setJobs(activeJobs);
    setSelectedJobId((current) =>
      current && activeJobs.some((job) => job.id === current)
        ? current
        : activeJobs[0]?.id ?? null,
    );

    setActiveEntry(
      (await db.getFirstAsync<TimeEntry>(
        `${ENTRY_SELECT}
         WHERE te.clock_out IS NULL
         ORDER BY te.clock_in DESC LIMIT 1`,
      )) ?? null,
    );

    setTodayEntries(
      await db.getAllAsync<TimeEntry>(
        `${ENTRY_SELECT}
         WHERE te.clock_in BETWEEN ? AND ?
         ORDER BY te.clock_in ASC`,
        startOfLocalDayIso(),
        endOfLocalDayIso(),
      ),
    );

    setWeekEntries(
      await db.getAllAsync<TimeEntry>(
        `${ENTRY_SELECT}
         WHERE te.clock_in BETWEEN ? AND ?
         ORDER BY te.clock_in ASC`,
        startOfLocalWeekIso(),
        endOfLocalWeekIso(),
      ),
    );

    setLoading(false);
  }, [db]);

  useEffect(() => {
    refresh().catch(console.error);
  }, [refresh]);

  useEffect(() => {
    if (!activeEntry) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [activeEntry]);

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) ?? null,
    [jobs, selectedJobId],
  );

  const clockIn = useCallback(async () => {
    if (!selectedJob || activeEntry) return;
    const timestamp = new Date().toISOString();
    const result = await db.runAsync(
      `INSERT INTO time_entries
       (job_id, clock_in, clock_out, unpaid_break_minutes, created_at, updated_at)
       VALUES (?, ?, NULL, 0, ?, ?)`,
      selectedJob.id,
      timestamp,
      timestamp,
      timestamp,
    );

    const settings = await db.getAllAsync<{ key: string; value: string }>(
      `SELECT key, value FROM app_settings
       WHERE key IN ('shift_reminder_enabled', 'shift_reminder_hours')`,
    );
    const map = Object.fromEntries(settings.map((row) => [row.key, row.value]));

    if (map.shift_reminder_enabled === 'true') {
      const hours = Number(map.shift_reminder_hours ?? '8');
      const id = await scheduleForgottenClockOutReminder(
        Number.isFinite(hours) ? hours : 8,
        selectedJob.name,
      );
      if (id) {
        await db.runAsync(
          `UPDATE time_entries
           SET reminder_notification_id = ?, updated_at = ?
           WHERE id = ?`,
          id,
          new Date().toISOString(),
          result.lastInsertRowId,
        );
      }
    }

    setNow(Date.now());
    await refresh();
  }, [activeEntry, db, refresh, selectedJob]);

  const clockOut = useCallback(async () => {
    if (!activeEntry) return;
    const timestamp = new Date().toISOString();
    await cancelScheduledReminder(activeEntry.reminderNotificationId);
    await db.runAsync(
      `UPDATE time_entries
       SET clock_out = ?, reminder_notification_id = NULL, updated_at = ?
       WHERE id = ?`,
      timestamp,
      timestamp,
      activeEntry.id,
    );
    await refresh();
  }, [activeEntry, db, refresh]);

  const summary = useMemo(() => {
    const result = calculatePayroll(todayEntries, now);
    return {
      workedSeconds: result.workedSeconds,
      estimatedPay: result.grossPay,
    };
  }, [now, todayEntries]);

  const weeklySummary = useMemo(
    () => calculateWeeklySummary(weekEntries, now),
    [now, weekEntries],
  );

  return {
    activeEntry,
    clockIn,
    clockOut,
    jobs,
    loading,
    now,
    refresh,
    selectedJob,
    selectedJobId,
    setSelectedJobId,
    summary,
    todayEntries,
    weekEntries,
    weeklySummary,
  };
}
