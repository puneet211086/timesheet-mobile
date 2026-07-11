import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import type { ReportPeriod, ReportSummary } from './reportService';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function csvCell(value: string | number): string {
  const text = String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function hours(seconds: number): string {
  return (seconds / 3600).toFixed(2);
}

function money(value: number): string {
  return value.toFixed(2);
}

function safeFilePart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function buildReportCsv(
  report: ReportSummary,
  title: string,
  period: ReportPeriod
): string {
  const rows: string[][] = [
    ['Timesheet report'],
    ['Period type', period === 'week' ? 'Weekly' : 'Monthly'],
    ['Period', title],
    [],
    ['Summary'],
    ['Total hours', hours(report.workedSeconds)],
    ['Regular hours', hours(report.regularSeconds)],
    ['Overtime hours', hours(report.overtimeSeconds)],
    ['Estimated gross pay', money(report.estimatedPay)],
    ['Completed shifts', String(report.shiftCount)],
    ['Work days', String(report.workDayCount)],
    ['Average hours per work day', hours(report.averageSecondsPerWorkDay)],
    [],
    ['Jobs'],
    ['Job', 'Hours', 'Regular hours', 'Overtime hours', 'Estimated pay', 'Shifts'],
    ...report.jobs.map((job) => [
      job.jobName,
      hours(job.workedSeconds),
      hours(job.regularSeconds),
      hours(job.overtimeSeconds),
      money(job.estimatedPay),
      String(job.shiftCount),
    ]),
    [],
    ['Daily breakdown'],
    ['Date', 'Hours', 'Estimated pay', 'Shifts'],
    ...report.days.map((day) => [
      day.label,
      hours(day.workedSeconds),
      money(day.estimatedPay),
      String(day.shiftCount),
    ]),
  ];

  return rows.map((row) => row.map(csvCell).join(',')).join('\n');
}

export function buildReportHtml(
  report: ReportSummary,
  title: string,
  period: ReportPeriod
): string {
  const currency = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  const jobRows = report.jobs.length
    ? report.jobs
        .map(
          (job) => `
            <tr>
              <td>${escapeHtml(job.jobName)}</td>
              <td>${hours(job.workedSeconds)}</td>
              <td>${hours(job.regularSeconds)}</td>
              <td>${hours(job.overtimeSeconds)}</td>
              <td>${currency.format(job.estimatedPay)}</td>
              <td>${job.shiftCount}</td>
            </tr>`
        )
        .join('')
    : '<tr><td colspan="6" class="empty">No completed shifts</td></tr>';

  const dayRows = report.days.length
    ? report.days
        .map(
          (day) => `
            <tr>
              <td>${escapeHtml(day.label)}</td>
              <td>${hours(day.workedSeconds)}</td>
              <td>${currency.format(day.estimatedPay)}</td>
              <td>${day.shiftCount}</td>
            </tr>`
        )
        .join('')
    : '<tr><td colspan="4" class="empty">No daily activity</td></tr>';

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Timesheet Report</title>
  <style>
    @page { margin: 30px; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #111827; margin: 0; }
    .header { border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 22px; }
    .eyebrow { color: #2563eb; font-size: 11px; font-weight: 800; letter-spacing: 1.3px; text-transform: uppercase; }
    h1 { margin: 5px 0 4px; font-size: 28px; }
    .period { color: #6b7280; font-size: 14px; }
    .hero { background: #eff6ff; border: 1px solid #dbeafe; border-radius: 14px; padding: 18px; margin-bottom: 18px; }
    .hero-label { color: #1d4ed8; font-size: 11px; font-weight: 800; text-transform: uppercase; }
    .hero-value { color: #1d4ed8; font-size: 30px; font-weight: 800; margin-top: 5px; }
    .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 22px; }
    .metric { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; }
    .metric-label { color: #6b7280; font-size: 10px; text-transform: uppercase; }
    .metric-value { font-size: 16px; font-weight: 800; margin-top: 5px; }
    h2 { font-size: 17px; margin: 22px 0 9px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #f3f4f6; color: #374151; text-align: left; padding: 9px; }
    td { border-bottom: 1px solid #e5e7eb; padding: 9px; }
    .empty { color: #6b7280; text-align: center; padding: 18px; }
    .footer { color: #9ca3af; font-size: 10px; margin-top: 28px; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div class="eyebrow">Timesheet Mobile</div>
    <h1>${period === 'week' ? 'Weekly' : 'Monthly'} Report</h1>
    <div class="period">${escapeHtml(title)}</div>
  </div>

  <div class="hero">
    <div class="hero-label">Estimated gross pay</div>
    <div class="hero-value">${currency.format(report.estimatedPay)}</div>
  </div>

  <div class="metrics">
    <div class="metric"><div class="metric-label">Total hours</div><div class="metric-value">${hours(report.workedSeconds)}</div></div>
    <div class="metric"><div class="metric-label">Regular hours</div><div class="metric-value">${hours(report.regularSeconds)}</div></div>
    <div class="metric"><div class="metric-label">Overtime hours</div><div class="metric-value">${hours(report.overtimeSeconds)}</div></div>
    <div class="metric"><div class="metric-label">Completed shifts</div><div class="metric-value">${report.shiftCount}</div></div>
    <div class="metric"><div class="metric-label">Work days</div><div class="metric-value">${report.workDayCount}</div></div>
    <div class="metric"><div class="metric-label">Average daily hours</div><div class="metric-value">${hours(report.averageSecondsPerWorkDay)}</div></div>
  </div>

  <h2>Job breakdown</h2>
  <table>
    <thead><tr><th>Job</th><th>Hours</th><th>Regular</th><th>OT</th><th>Pay</th><th>Shifts</th></tr></thead>
    <tbody>${jobRows}</tbody>
  </table>

  <h2>Daily breakdown</h2>
  <table>
    <thead><tr><th>Date</th><th>Hours</th><th>Pay</th><th>Shifts</th></tr></thead>
    <tbody>${dayRows}</tbody>
  </table>

  <div class="footer">Generated ${new Date().toLocaleString()}</div>
</body>
</html>`;
}

export async function exportReportPdf(
  report: ReportSummary,
  title: string,
  period: ReportPeriod
): Promise<void> {
  const html = buildReportHtml(report, title, period);

  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }

  const { uri } = await Print.printToFileAsync({ html });
  const sharingAvailable = await Sharing.isAvailableAsync();

  if (!sharingAvailable) {
    throw new Error('Sharing is not available on this device.');
  }

  await Sharing.shareAsync(uri, {
    dialogTitle: 'Share timesheet PDF',
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
  });
}

export async function exportReportCsv(
  report: ReportSummary,
  title: string,
  period: ReportPeriod
): Promise<void> {
  const csv = buildReportCsv(report, title, period);
  const filename = `timesheet-${period}-${safeFilePart(title) || 'report'}.csv`;

  if (Platform.OS === 'web') {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    return;
  }

  const uri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(uri, csv, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const sharingAvailable = await Sharing.isAvailableAsync();
  if (!sharingAvailable) {
    throw new Error('Sharing is not available on this device.');
  }

  await Sharing.shareAsync(uri, {
    dialogTitle: 'Share timesheet CSV',
    mimeType: 'text/csv',
    UTI: 'public.comma-separated-values-text',
  });
}
