import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

const BACKUP_VERSION = 1;
const BACKUP_FORMAT = 'timesheet-mobile-backup';

type JobBackup = {
  id: number;
  name: string;
  hourly_rate: number;
  overtime_multiplier: number;
  color: string;
  is_active: number;
  created_at: string;
  updated_at: string;
};

type TimeEntryBackup = {
  id: number;
  job_id: number;
  clock_in: string;
  clock_out: string | null;
  notes: string | null;
  unpaid_break_minutes: number;
  created_at: string;
  updated_at: string;
};

type TemplateBackup = {
  id: number;
  name: string;
  job_id: number | null;
  start_time: string;
  end_time: string;
  unpaid_break_minutes: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type SettingBackup = {
  key: string;
  value: string;
};

export type TimesheetBackup = {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  data: {
    jobs: JobBackup[];
    timeEntries: TimeEntryBackup[];
    shiftTemplates: TemplateBackup[];
    settings: SettingBackup[];
  };
};

export type BackupPreview = {
  backup: TimesheetBackup;
  filename: string;
  exportedAt: string;
  jobs: number;
  shifts: number;
  templates: number;
  settings: number;
  activeShiftCount: number;
  earliestShift: string | null;
  latestShift: string | null;
  warnings: string[];
};

function dateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function assertUniqueIds(
  records: Array<{ id: number }>,
  label: string,
): void {
  const ids = new Set<number>();

  for (const record of records) {
    if (!Number.isInteger(record.id) || record.id <= 0) {
      throw new Error(`${label} contains an invalid record identifier.`);
    }

    if (ids.has(record.id)) {
      throw new Error(`${label} contains duplicate record identifiers.`);
    }

    ids.add(record.id);
  }
}

function validateBackup(value: unknown): TimesheetBackup {
  if (!value || typeof value !== 'object') {
    throw new Error('The selected file is not a valid backup.');
  }

  const backup = value as Partial<TimesheetBackup>;

  if (
    backup.format !== BACKUP_FORMAT ||
    backup.version !== BACKUP_VERSION ||
    !backup.data ||
    !Array.isArray(backup.data.jobs) ||
    !Array.isArray(backup.data.timeEntries) ||
    !Array.isArray(backup.data.shiftTemplates) ||
    !Array.isArray(backup.data.settings)
  ) {
    throw new Error('This backup format is unsupported or incomplete.');
  }

  if (
    typeof backup.exportedAt !== 'string' ||
    Number.isNaN(Date.parse(backup.exportedAt))
  ) {
    throw new Error('The backup has an invalid export date.');
  }

  assertUniqueIds(backup.data.jobs, 'Jobs');
  assertUniqueIds(backup.data.timeEntries, 'Time entries');
  assertUniqueIds(backup.data.shiftTemplates, 'Shift templates');

  const jobIds = new Set(backup.data.jobs.map((job) => job.id));

  for (const job of backup.data.jobs) {
    if (!job.name?.trim()) {
      throw new Error('A job in the backup has no name.');
    }

    if (
      !isFiniteNumber(job.hourly_rate) ||
      job.hourly_rate < 0 ||
      !isFiniteNumber(job.overtime_multiplier) ||
      job.overtime_multiplier < 1
    ) {
      throw new Error(`Job "${job.name}" contains an invalid pay rate.`);
    }
  }

  for (const entry of backup.data.timeEntries) {
    if (!jobIds.has(entry.job_id)) {
      throw new Error(
        `A time entry references missing job ID ${entry.job_id}.`,
      );
    }

    if (Number.isNaN(Date.parse(entry.clock_in))) {
      throw new Error('A time entry contains an invalid clock-in date.');
    }

    if (entry.clock_out && Number.isNaN(Date.parse(entry.clock_out))) {
      throw new Error('A time entry contains an invalid clock-out date.');
    }

    if (
      entry.clock_out &&
      Date.parse(entry.clock_out) <= Date.parse(entry.clock_in)
    ) {
      throw new Error('A time entry ends before it starts.');
    }

    if (
      !isFiniteNumber(entry.unpaid_break_minutes) ||
      entry.unpaid_break_minutes < 0
    ) {
      throw new Error('A time entry contains an invalid break duration.');
    }
  }

  for (const template of backup.data.shiftTemplates) {
    if (!template.name?.trim()) {
      throw new Error('A shift template in the backup has no name.');
    }

    if (template.job_id !== null && !jobIds.has(template.job_id)) {
      throw new Error(
        `A shift template references missing job ID ${template.job_id}.`,
      );
    }

    if (
      !isFiniteNumber(template.unpaid_break_minutes) ||
      template.unpaid_break_minutes < 0
    ) {
      throw new Error('A shift template contains an invalid break duration.');
    }
  }

  const settingKeys = new Set<string>();
  for (const setting of backup.data.settings) {
    if (!setting.key || typeof setting.value !== 'string') {
      throw new Error('The backup contains an invalid app setting.');
    }

    if (settingKeys.has(setting.key)) {
      throw new Error('The backup contains duplicate app settings.');
    }

    settingKeys.add(setting.key);
  }

  return backup as TimesheetBackup;
}

export async function createBackup(
  db: SQLiteDatabase,
): Promise<TimesheetBackup> {
  const [jobs, timeEntries, shiftTemplates, settings] = await Promise.all([
    db.getAllAsync<JobBackup>('SELECT * FROM jobs ORDER BY id'),
    db.getAllAsync<TimeEntryBackup>(
      `SELECT id, job_id, clock_in, clock_out, notes,
              unpaid_break_minutes, created_at, updated_at
       FROM time_entries
       ORDER BY id`,
    ),
    db.getAllAsync<TemplateBackup>(
      'SELECT * FROM shift_templates ORDER BY id',
    ),
    db.getAllAsync<SettingBackup>(
      `SELECT key, value
       FROM app_settings
       WHERE key NOT IN (
         'app_lock_enabled',
         'shift_reminder_notification_id'
       )
       ORDER BY key`,
    ),
  ]);

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: { jobs, timeEntries, shiftTemplates, settings },
  };
}

export async function exportBackup(db: SQLiteDatabase): Promise<void> {
  const backup = await createBackup(db);
  const json = JSON.stringify(backup, null, 2);
  const filename = `timesheet-mobile-backup-${dateStamp()}.json`;

  if (Platform.OS === 'web') {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
    return;
  }

  const target = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(target, json, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error('Sharing is not available on this device.');
  }

  await Sharing.shareAsync(target, {
    mimeType: 'application/json',
    dialogTitle: 'Save Timesheet Mobile Backup',
    UTI: 'public.json',
  });
}

export async function pickBackupForPreview(): Promise<BackupPreview | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/json', 'text/plain'],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled) return null;

  const asset = result.assets[0];
  let content: string;

  if (Platform.OS === 'web' && asset.file) {
    content = await asset.file.text();
  } else {
    content = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('The selected file is not valid JSON.');
  }

  const backup = validateBackup(parsed);
  const shiftTimes = backup.data.timeEntries
    .map((entry) => entry.clock_in)
    .sort();

  const warnings: string[] = [];

  const activeShiftCount = backup.data.timeEntries.filter(
    (entry) => !entry.clock_out,
  ).length;

  if (activeShiftCount > 0) {
    warnings.push(
      `${activeShiftCount} active shift${
        activeShiftCount === 1 ? '' : 's'
      } will be restored without a scheduled reminder.`,
    );
  }

  if (backup.data.jobs.length === 0) {
    warnings.push('This backup contains no jobs.');
  }

  if (backup.data.timeEntries.length === 0) {
    warnings.push('This backup contains no time entries.');
  }

  return {
    backup,
    filename: asset.name ?? 'Timesheet Mobile backup',
    exportedAt: backup.exportedAt,
    jobs: backup.data.jobs.length,
    shifts: backup.data.timeEntries.length,
    templates: backup.data.shiftTemplates.length,
    settings: backup.data.settings.length,
    activeShiftCount,
    earliestShift: shiftTimes[0] ?? null,
    latestShift: shiftTimes.at(-1) ?? null,
    warnings,
  };
}

export async function getCurrentDataSummary(
  db: SQLiteDatabase,
): Promise<{
  jobs: number;
  shifts: number;
  templates: number;
}> {
  const [jobs, shifts, templates] = await Promise.all([
    db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM jobs',
    ),
    db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM time_entries',
    ),
    db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM shift_templates',
    ),
  ]);

  return {
    jobs: jobs?.count ?? 0,
    shifts: shifts?.count ?? 0,
    templates: templates?.count ?? 0,
  };
}

export async function restoreBackup(
  db: SQLiteDatabase,
  backup: TimesheetBackup,
): Promise<string> {
  const validated = validateBackup(backup);

  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM time_entries');
    await db.runAsync('DELETE FROM shift_templates');
    await db.runAsync('DELETE FROM jobs');

    for (const job of validated.data.jobs) {
      await db.runAsync(
        `INSERT INTO jobs
          (id, name, hourly_rate, overtime_multiplier, color,
           is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        job.id,
        job.name,
        job.hourly_rate,
        job.overtime_multiplier,
        job.color,
        job.is_active,
        job.created_at,
        job.updated_at,
      );
    }

    for (const entry of validated.data.timeEntries) {
      await db.runAsync(
        `INSERT INTO time_entries
          (id, job_id, clock_in, clock_out, notes,
           unpaid_break_minutes, reminder_notification_id,
           created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
        entry.id,
        entry.job_id,
        entry.clock_in,
        entry.clock_out,
        entry.notes,
        entry.unpaid_break_minutes ?? 0,
        entry.created_at,
        entry.updated_at,
      );
    }

    for (const template of validated.data.shiftTemplates) {
      await db.runAsync(
        `INSERT INTO shift_templates
          (id, name, job_id, start_time, end_time,
           unpaid_break_minutes, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        template.id,
        template.name,
        template.job_id,
        template.start_time,
        template.end_time,
        template.unpaid_break_minutes ?? 0,
        template.notes,
        template.created_at,
        template.updated_at,
      );
    }

    for (const setting of validated.data.settings) {
      if (
        setting.key === 'app_lock_enabled' ||
        setting.key === 'shift_reminder_notification_id'
      ) {
        continue;
      }

      await db.runAsync(
        `INSERT INTO app_settings (key, value)
         VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        setting.key,
        setting.value,
      );
    }
  });

  return `${validated.data.jobs.length} jobs, ${
    validated.data.timeEntries.length
  } shifts, and ${
    validated.data.shiftTemplates.length
  } templates restored.`;
}
