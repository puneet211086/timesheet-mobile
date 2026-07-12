import { useCallback, useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import type { Job } from '../types/models';

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

export type JobInput = {
  name: string;
  hourlyRate: number;
  overtimeMultiplier: number;
  overtimeEnabled: boolean;
  weeklyOvertimeEnabled: boolean;
  weeklyOvertimeHours: number;
  dailyOvertimeEnabled: boolean;
  dailyOvertimeHours: number;
  doubleTimeEnabled: boolean;
  doubleTimeHours: number;
  doubleTimeMultiplier: number;
  color: string;
};

const SELECT = `
  SELECT id, name,
         hourly_rate AS hourlyRate,
         overtime_multiplier AS overtimeMultiplier,
         overtime_enabled AS overtimeEnabled,
         weekly_overtime_enabled AS weeklyOvertimeEnabled,
         weekly_overtime_hours AS weeklyOvertimeHours,
         daily_overtime_enabled AS dailyOvertimeEnabled,
         daily_overtime_hours AS dailyOvertimeHours,
         double_time_enabled AS doubleTimeEnabled,
         double_time_hours AS doubleTimeHours,
         double_time_multiplier AS doubleTimeMultiplier,
         color,
         is_active AS isActive,
         created_at AS createdAt,
         updated_at AS updatedAt
  FROM jobs
`;

function mapRow(row: JobRow): Job {
  return {
    ...row,
    isActive: Boolean(row.isActive),
    overtimeEnabled: Boolean(row.overtimeEnabled),
    weeklyOvertimeEnabled: Boolean(row.weeklyOvertimeEnabled),
    dailyOvertimeEnabled: Boolean(row.dailyOvertimeEnabled),
    doubleTimeEnabled: Boolean(row.doubleTimeEnabled),
  };
}

export function useJobs() {
  const db = useSQLiteContext();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const rows = await db.getAllAsync<JobRow>(
      `${SELECT} ORDER BY is_active DESC, name COLLATE NOCASE`,
    );
    setJobs(rows.map(mapRow));
    setLoading(false);
  }, [db]);

  useEffect(() => {
    refresh().catch(console.error);
  }, [refresh]);

  const saveJob = useCallback(
    async (input: JobInput, id?: number) => {
      const now = new Date().toISOString();
      const values = [
        input.name.trim(),
        input.hourlyRate,
        input.overtimeMultiplier,
        input.overtimeEnabled ? 1 : 0,
        input.weeklyOvertimeEnabled ? 1 : 0,
        input.weeklyOvertimeHours,
        input.dailyOvertimeEnabled ? 1 : 0,
        input.dailyOvertimeHours,
        input.doubleTimeEnabled ? 1 : 0,
        input.doubleTimeHours,
        input.doubleTimeMultiplier,
        input.color,
        now,
      ] as const;

      if (id) {
        await db.runAsync(
          `UPDATE jobs SET
             name = ?, hourly_rate = ?, overtime_multiplier = ?,
             overtime_enabled = ?,
             weekly_overtime_enabled = ?, weekly_overtime_hours = ?,
             daily_overtime_enabled = ?, daily_overtime_hours = ?,
             double_time_enabled = ?, double_time_hours = ?,
             double_time_multiplier = ?, color = ?, updated_at = ?
           WHERE id = ?`,
          ...values,
          id,
        );
      } else {
        await db.runAsync(
          `INSERT INTO jobs
           (name, hourly_rate, overtime_multiplier, overtime_enabled,
            weekly_overtime_enabled, weekly_overtime_hours,
            daily_overtime_enabled, daily_overtime_hours,
            double_time_enabled, double_time_hours, double_time_multiplier,
            color, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
          input.name.trim(),
          input.hourlyRate,
          input.overtimeMultiplier,
          input.overtimeEnabled ? 1 : 0,
          input.weeklyOvertimeEnabled ? 1 : 0,
          input.weeklyOvertimeHours,
          input.dailyOvertimeEnabled ? 1 : 0,
          input.dailyOvertimeHours,
          input.doubleTimeEnabled ? 1 : 0,
          input.doubleTimeHours,
          input.doubleTimeMultiplier,
          input.color,
          now,
          now,
        );
      }

      await refresh();
    },
    [db, refresh],
  );

  const setJobActive = useCallback(
    async (id: number, isActive: boolean) => {
      await db.runAsync(
        `UPDATE jobs SET is_active = ?, updated_at = ? WHERE id = ?`,
        isActive ? 1 : 0,
        new Date().toISOString(),
        id,
      );
      await refresh();
    },
    [db, refresh],
  );

  return { jobs, loading, refresh, saveJob, setJobActive };
}
