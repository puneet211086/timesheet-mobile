export interface Job {
  id: number;
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
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TimeEntry {
  id: number;
  jobId: number;
  jobName: string;
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
  jobColor: string;
  clockIn: string;
  clockOut: string | null;
  notes: string | null;
  unpaidBreakMinutes: number;
  reminderNotificationId?: string | null;
}

export interface DashboardSummary {
  workedSeconds: number;
  estimatedPay: number;
}

export interface WeeklySummary extends DashboardSummary {
  regularSeconds: number;
  overtimeSeconds: number;
  doubleTimeSeconds: number;
  targetSeconds: number;
}
