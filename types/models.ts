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
  clockIn: string;
  clockOut: string | null;
  notes: string | null;
};

export type DashboardSummary = {
  workedSeconds: number;
  estimatedPay: number;
};
