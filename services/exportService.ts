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
  return `"${String(value).replaceAll('"', '""')}"`;
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
  period: ReportPeriod,
): string {
  const rows: Array<Array<string | number>> = [
    ['Timesheet report'],
    ['Period type', period === 'week' ? 'Weekly' : 'Monthly'],
    ['Period', title],
    [],
    ['Summary'],
    ['Total hours', hours(report.workedSeconds)],
    ['Regular hours', hours(report.regularSeconds)],
    ['Overtime hours', hours(report.overtimeSeconds)],
    ['Double-time hours', hours(report.doubleTimeSeconds)],
    ['Estimated gross pay', money(report.estimatedPay)],
    ['Completed shifts', report.shiftCount],
    ['Work days', report.workDayCount],
    ['Average hours per work day', hours(report.averageSecondsPerWorkDay)],
    [],
    ['Jobs'],
    [
      'Job',
      'Hours',
      'Regular hours',
      'Overtime hours',
      'Double-time hours',
      'Estimated pay',
      'Shifts',
    ],
    ...report.jobs.map((job) => [
      job.jobName,
      hours(job.workedSeconds),
      hours(job.regularSeconds),
      hours(job.overtimeSeconds),
      hours(job.doubleTimeSeconds),
      money(job.estimatedPay),
      job.shiftCount,
    ]),
    [],
    ['Daily breakdown'],
    [
      'Date',
      'Hours',
      'Regular hours',
      'Overtime hours',
      'Double-time hours',
      'Estimated pay',
      'Shifts',
    ],
    ...report.days.map((day) => [
      day.label,
      hours(day.workedSeconds),
      hours(day.regularSeconds),
      hours(day.overtimeSeconds),
      hours(day.doubleTimeSeconds),
      money(day.estimatedPay),
      day.shiftCount,
    ]),
  ];

  return rows.map((row) => row.map(csvCell).join(',')).join('\n');
}

export function buildReportHtml(
  report: ReportSummary,
  title: string,
  period: ReportPeriod,
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
              <td>${hours(job.doubleTimeSeconds)}</td>
              <td>${currency.format(job.estimatedPay)}</td>
              <td>${job.shiftCount}</td>
            </tr>`,
        )
        .join('')
    : '<tr><td colspan="7">No completed shifts</td></tr>';

  const dayRows = report.days.length
    ? report.days
        .map(
          (day) => `
            <tr>
              <td>${escapeHtml(day.label)}</td>
              <td>${hours(day.workedSeconds)}</td>
              <td>${hours(day.regularSeconds)}</td>
              <td>${hours(day.overtimeSeconds)}</td>
              <td>${hours(day.doubleTimeSeconds)}</td>
              <td>${currency.format(day.estimatedPay)}</td>
              <td>${day.shiftCount}</td>
            </tr>`,
        )
        .join('')
    : '<tr><td colspan="7">No daily activity</td></tr>';

  return `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif; color: #0f172a; padding: 28px; }
        h1 { margin-bottom: 4px; }
        h2 { margin-top: 28px; }
        .muted { color: #64748b; }
        .summary { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 22px; }
        .card { width: 29%; border: 1px solid #e2e8f0; border-radius: 12px; padding: 13px; }
        .label { font-size: 11px; color: #64748b; text-transform: uppercase; }
        .value { font-size: 20px; font-weight: 700; margin-top: 5px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { border-bottom: 1px solid #e2e8f0; padding: 9px 6px; text-align: left; }
        th { color: #475569; background: #f8fafc; }
      </style>
    </head>
    <body>
      <div class="muted">Timesheet Mobile</div>
      <h1>${period === 'week' ? 'Weekly' : 'Monthly'} Report</h1>
      <div class="muted">${escapeHtml(title)}</div>

      <div class="summary">
        <div class="card"><div class="label">Estimated pay</div><div class="value">${currency.format(report.estimatedPay)}</div></div>
        <div class="card"><div class="label">Total hours</div><div class="value">${hours(report.workedSeconds)}</div></div>
        <div class="card"><div class="label">Regular</div><div class="value">${hours(report.regularSeconds)}</div></div>
        <div class="card"><div class="label">Overtime</div><div class="value">${hours(report.overtimeSeconds)}</div></div>
        <div class="card"><div class="label">Double time</div><div class="value">${hours(report.doubleTimeSeconds)}</div></div>
        <div class="card"><div class="label">Shifts</div><div class="value">${report.shiftCount}</div></div>
      </div>

      <h2>Job breakdown</h2>
      <table>
        <thead>
          <tr><th>Job</th><th>Hours</th><th>Regular</th><th>OT</th><th>DT</th><th>Pay</th><th>Shifts</th></tr>
        </thead>
        <tbody>${jobRows}</tbody>
      </table>

      <h2>Daily breakdown</h2>
      <table>
        <thead>
          <tr><th>Date</th><th>Hours</th><th>Regular</th><th>OT</th><th>DT</th><th>Pay</th><th>Shifts</th></tr>
        </thead>
        <tbody>${dayRows}</tbody>
      </table>

      <p class="muted">Generated ${new Date().toLocaleString()}</p>
    </body>
  </html>`;
}

export async function exportReportPdf(
  report: ReportSummary,
  title: string,
  period: ReportPeriod,
): Promise<void> {
  const html = buildReportHtml(report, title, period);

  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }

  const { uri } = await Print.printToFileAsync({ html });
  if (!(await Sharing.isAvailableAsync())) {
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
  period: ReportPeriod,
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

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }

  await Sharing.shareAsync(uri, {
    dialogTitle: 'Share timesheet CSV',
    mimeType: 'text/csv',
    UTI: 'public.comma-separated-values-text',
  });
}
