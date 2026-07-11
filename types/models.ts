export type Job = {
  id: number;
  name: string;
  hourlyRate: number;
  overtimeMultiplier: number;
  color: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TimeEntry = {
  id: number;
  jobId: number;
  jobName: string;
  hourlyRate: number;
  overtimeMultiplier?: number;
  jobColor?: string;
  clockIn: string;
  clockOut: string | null;
  notes: string | null;
  unpaidBreakMinutes: number;
};

export type DashboardSummary = {
  workedSeconds: number;
  estimatedPay: number;
};

export type WeeklySummary = DashboardSummary & {
  regularSeconds: number;
  overtimeSeconds: number;
  targetSeconds: number;
};
