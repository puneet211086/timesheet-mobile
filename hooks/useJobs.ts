import { useCallback, useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import type { Job } from '../types/models';

type JobRow = Omit<Job, 'isActive'> & { isActive: number };

export type JobInput = {
  name: string;
  hourlyRate: number;
  overtimeMultiplier: number;
  color: string;
};

export function useJobs() {
  const db = useSQLiteContext();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const rows = await db.getAllAsync<JobRow>(`
      SELECT id, name, hourly_rate AS hourlyRate,
             overtime_multiplier AS overtimeMultiplier,
             color, is_active AS isActive,
             created_at AS createdAt, updated_at AS updatedAt
      FROM jobs
      ORDER BY is_active DESC, name COLLATE NOCASE
    `);

    setJobs(rows.map((row) => ({ ...row, isActive: Boolean(row.isActive) })));
    setLoading(false);
  }, [db]);

  useEffect(() => {
    refresh().catch(console.error);
  }, [refresh]);

  const saveJob = useCallback(
    async (input: JobInput, id?: number) => {
      const now = new Date().toISOString();
      if (id) {
        await db.runAsync(
          `UPDATE jobs
           SET name = ?, hourly_rate = ?, overtime_multiplier = ?,
               color = ?, updated_at = ?
           WHERE id = ?`,
          input.name.trim(),
          input.hourlyRate,
          input.overtimeMultiplier,
          input.color,
          now,
          id
        );
      } else {
        await db.runAsync(
          `INSERT INTO jobs
           (name, hourly_rate, overtime_multiplier, color, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, 1, ?, ?)`,
          input.name.trim(),
          input.hourlyRate,
          input.overtimeMultiplier,
          input.color,
          now,
          now
        );
      }
      await refresh();
    },
    [db, refresh]
  );

  const setJobActive = useCallback(
    async (id: number, isActive: boolean) => {
      await db.runAsync(
        `UPDATE jobs SET is_active = ?, updated_at = ? WHERE id = ?`,
        isActive ? 1 : 0,
        new Date().toISOString(),
        id
      );
      await refresh();
    },
    [db, refresh]
  );

  return { jobs, loading, refresh, saveJob, setJobActive };
}
