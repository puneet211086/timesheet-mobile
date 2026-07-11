import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import type { TimeEntry } from "../types/models";
import {
  buildReport,
  type ReportPeriod,
  type ReportSummary,
} from "../services/reportService";

function startOfWeek(date: Date): Date {
  const value = new Date(date);
  const day = value.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  value.setDate(value.getDate() + mondayOffset);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfWeek(date: Date): Date {
  const value = startOfWeek(date);
  value.setDate(value.getDate() + 7);
  return value;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1, 0, 0, 0, 0);
}

export function useReports() {
  const db = useSQLiteContext();
  const [period, setPeriod] = useState<ReportPeriod>("week");
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const range = useMemo(() => {
    const start =
      period === "week" ? startOfWeek(anchorDate) : startOfMonth(anchorDate);
    const end =
      period === "week" ? endOfWeek(anchorDate) : endOfMonth(anchorDate);
    return { start, end };
  }, [anchorDate, period]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const rows = await db.getAllAsync<TimeEntry>(
      `
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
        WHERE te.clock_out IS NOT NULL
          AND te.clock_in >= ?
          AND te.clock_in < ?
        ORDER BY te.clock_in ASC
      `,
      range.start.toISOString(),
      range.end.toISOString(),
    );
    setEntries(rows);
    setLoading(false);
  }, [db, range.end, range.start]);

  useFocusEffect(
    useCallback(() => {
      refresh().catch(console.error);
    }, [refresh]),
  );

  const report: ReportSummary = useMemo(
    () => buildReport(entries, period),
    [entries, period],
  );

  const movePeriod = useCallback(
    (direction: -1 | 1) => {
      setAnchorDate((current) => {
        const next = new Date(current);
        if (period === "week") next.setDate(next.getDate() + direction * 7);
        else next.setMonth(next.getMonth() + direction);
        return next;
      });
    },
    [period],
  );

  const resetToCurrentPeriod = useCallback(() => {
    setAnchorDate(new Date());
  }, []);

  const title = useMemo(() => {
    if (period === "month") {
      return range.start.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      });
    }

    const inclusiveEnd = new Date(range.end);
    inclusiveEnd.setDate(inclusiveEnd.getDate() - 1);
    return `${range.start.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    })} – ${inclusiveEnd.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;
  }, [period, range.end, range.start]);

  return {
    anchorDate,
    loading,
    movePeriod,
    period,
    refresh,
    report,
    resetToCurrentPeriod,
    setPeriod,
    title,
  };
}
