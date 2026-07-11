import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import type { DashboardSummary, Job, TimeEntry } from '../types/models';
import {
  endOfLocalDayIso,
  endOfLocalWeekIso,
  startOfLocalDayIso,
  startOfLocalWeekIso,
} from '../utils/time';
import { calculateWeeklySummary } from '../utils/pay';

type JobRow = Omit<Job, 'isActive'> & { isActive: number };

type EntryRow = TimeEntry;

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
      te.notes
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

    const activeJobs: Job[] = jobRows.map((row) => ({
      ...row,
      isActive: Boolean(row.isActive),
    }));

    setJobs(activeJobs);
    setSelectedJobId((current) => {
      if (current && activeJobs.some((job) => job.id === current)) return current;
      return activeJobs[0]?.id ?? null;
    });

    const running = await db.getFirstAsync<EntryRow>(`
      ${entrySelect}
      WHERE te.clock_out IS NULL
      ORDER BY te.clock_in DESC
      LIMIT 1
    `);
    setActiveEntry(running ?? null);

    const today = await db.getAllAsync<EntryRow>(
      `${entrySelect}
       WHERE te.clock_in BETWEEN ? AND ?
       ORDER BY te.clock_in DESC`,
      startOfLocalDayIso(),
      endOfLocalDayIso()
    );
    setTodayEntries(today);

    const week = await db.getAllAsync<EntryRow>(
      `${entrySelect}
       WHERE te.clock_in BETWEEN ? AND ?
       ORDER BY te.clock_in DESC`,
      startOfLocalWeekIso(),
      endOfLocalWeekIso()
    );
    setWeekEntries(week);
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
    await db.runAsync(
      `INSERT INTO time_entries
       (job_id, clock_in, clock_out, created_at, updated_at)
       VALUES (?, ?, NULL, ?, ?)`,
      selectedJob.id,
      timestamp,
      timestamp,
      timestamp
    );
    setNow(Date.now());
    await refresh();
  }, [activeEntry, db, refresh, selectedJob]);

  const clockOut = useCallback(async () => {
    if (!activeEntry) return;
    const timestamp = new Date().toISOString();
    await db.runAsync(
      `UPDATE time_entries SET clock_out = ?, updated_at = ? WHERE id = ?`,
      timestamp,
      timestamp,
      activeEntry.id
    );
    await refresh();
  }, [activeEntry, db, refresh]);

  const summary = useMemo<DashboardSummary>(() => {
    let workedSeconds = 0;
    let estimatedPay = 0;
    for (const entry of todayEntries) {
      const end = entry.clockOut ? new Date(entry.clockOut).getTime() : now;
      const seconds = Math.max(
        0,
        Math.floor((end - new Date(entry.clockIn).getTime()) / 1000)
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
