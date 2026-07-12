import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import type { Job, TimeEntry } from '../types/models';
import {
  endOfLocalDayIso,
  endOfLocalWeekIso,
  startOfLocalDayIso,
  startOfLocalWeekIso,
} from '../utils/time';
import { payableDurationSeconds } from '../utils/entry';
import { calculateWeeklySummary } from '../utils/pay';
import {
  cancelScheduledReminder,
  scheduleForgottenClockOutReminder,
} from '../services/notificationService';

type JobRow = Omit<Job, 'isActive'> & { isActive: number };

export function useTimesheet() {
  const db = useSQLiteContext();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [todayEntries, setTodayEntries] = useState<TimeEntry[]>([]);
  const [weekEntries, setWeekEntries] = useState<TimeEntry[]>([]);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);

  const entrySelect = `
    SELECT
      te.id,
      te.job_id AS jobId,
      j.name AS jobName,
      j.hourly_rate AS hourlyRate,
      j.overtime_multiplier AS overtimeMultiplier,
      j.color AS jobColor,
      te.clock_in AS clockIn,
      te.clock_out AS clockOut,
      te.notes,
      te.unpaid_break_minutes AS unpaidBreakMinutes,
      te.reminder_notification_id AS reminderNotificationId
    FROM time_entries te
    JOIN jobs j ON j.id = te.job_id
  `;

  const refresh = useCallback(async () => {
    const jobRows = await db.getAllAsync<JobRow>(`
      SELECT id, name, hourly_rate AS hourlyRate,
        overtime_multiplier AS overtimeMultiplier, color,
        is_active AS isActive, created_at AS createdAt,
        updated_at AS updatedAt
      FROM jobs
      WHERE is_active = 1
      ORDER BY name COLLATE NOCASE
    `);

    const activeJobs = jobRows.map((row) => ({
      ...row,
      isActive: Boolean(row.isActive),
    }));
    setJobs(activeJobs);
    setSelectedJobId((current) => {
      if (current && activeJobs.some((job) => job.id === current)) return current;
      return activeJobs[0]?.id ?? null;
    });

    const running = await db.getFirstAsync<TimeEntry>(`
      ${entrySelect}
      WHERE te.clock_out IS NULL
      ORDER BY te.clock_in DESC
      LIMIT 1
    `);
    setActiveEntry(running ?? null);

    setTodayEntries(
      await db.getAllAsync<TimeEntry>(
        `${entrySelect}
         WHERE te.clock_in BETWEEN ? AND ?
         ORDER BY te.clock_in DESC`,
        startOfLocalDayIso(),
        endOfLocalDayIso()
      )
    );

    setWeekEntries(
      await db.getAllAsync<TimeEntry>(
        `${entrySelect}
         WHERE te.clock_in BETWEEN ? AND ?
         ORDER BY te.clock_in DESC`,
        startOfLocalWeekIso(),
        endOfLocalWeekIso()
      )
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
    [jobs, selectedJobId]
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
      timestamp
    );

    const settings = await db.getAllAsync<{ key: string; value: string }>(
      `SELECT key, value FROM app_settings
       WHERE key IN ('shift_reminder_enabled', 'shift_reminder_hours')`
    );
    const settingMap = Object.fromEntries(
      settings.map((setting) => [setting.key, setting.value])
    );

    if (settingMap.shift_reminder_enabled === 'true') {
      const reminderHours = Number(settingMap.shift_reminder_hours ?? '8');
      const notificationId = await scheduleForgottenClockOutReminder(
        Number.isFinite(reminderHours) ? reminderHours : 8,
        selectedJob.name
      );

      if (notificationId) {
        await db.runAsync(
          `UPDATE time_entries
           SET reminder_notification_id = ?, updated_at = ?
           WHERE id = ?`,
          notificationId,
          new Date().toISOString(),
          result.lastInsertRowId
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
      activeEntry.id
    );
    await refresh();
  }, [activeEntry, db, refresh]);

  const summary = useMemo(() => {
    let workedSeconds = 0;
    let estimatedPay = 0;
    for (const entry of todayEntries) {
      const seconds = payableDurationSeconds(
        entry.clockIn,
        entry.clockOut,
        entry.unpaidBreakMinutes,
        now
      );
      workedSeconds += seconds;
      estimatedPay += (seconds / 3600) * entry.hourlyRate;
    }
    return { workedSeconds, estimatedPay };
  }, [now, todayEntries]);

  const weeklySummary = useMemo(
    () => calculateWeeklySummary(weekEntries, now),
    [now, weekEntries]
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
