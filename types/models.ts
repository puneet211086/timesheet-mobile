export interface Job {
  id: number;
  name: string;
  hourlyRate: number;
  overtimeMultiplier: number;
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
