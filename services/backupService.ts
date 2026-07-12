import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

const BACKUP_VERSION = 1;

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
  format: 'timesheet-mobile-backup';
  version: number;
  exportedAt: string;
  data: {
    jobs: JobBackup[];
    timeEntries: TimeEntryBackup[];
    shiftTemplates: TemplateBackup[];
    settings: SettingBackup[];
  };
};

function dateStamp(): string {
  return new Date().toISOString().slice(0, 10);
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
       WHERE key NOT IN ('app_lock_enabled')
       ORDER BY key`,
    ),
  ]);

  return {
    format: 'timesheet-mobile-backup',
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
  if (!available) throw new Error('Sharing is not available on this device.');

  await Sharing.shareAsync(target, {
    mimeType: 'application/json',
    dialogTitle: 'Save Timesheet Mobile Backup',
    UTI: 'public.json',
  });
}

function validateBackup(value: unknown): TimesheetBackup {
  if (!value || typeof value !== 'object') {
    throw new Error('The selected file is not a valid backup.');
  }

  const backup = value as Partial<TimesheetBackup>;
  if (
    backup.format !== 'timesheet-mobile-backup' ||
    backup.version !== BACKUP_VERSION ||
    !backup.data ||
    !Array.isArray(backup.data.jobs) ||
    !Array.isArray(backup.data.timeEntries) ||
    !Array.isArray(backup.data.shiftTemplates) ||
    !Array.isArray(backup.data.settings)
  ) {
    throw new Error('This backup format is unsupported or incomplete.');
  }

  return backup as TimesheetBackup;
}

async function readPickedFile(): Promise<TimesheetBackup | null> {
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

  return validateBackup(JSON.parse(content));
}

export async function chooseAndRestoreBackup(
  db: SQLiteDatabase,
): Promise<{ restored: boolean; summary?: string }> {
  const backup = await readPickedFile();
  if (!backup) return { restored: false };

  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM time_entries');
    await db.runAsync('DELETE FROM shift_templates');
    await db.runAsync('DELETE FROM jobs');

    for (const job of backup.data.jobs) {
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

    for (const entry of backup.data.timeEntries) {
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

    for (const template of backup.data.shiftTemplates) {
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

    for (const setting of backup.data.settings) {
      if (setting.key === 'app_lock_enabled') continue;
      await db.runAsync(
        `INSERT INTO app_settings (key, value)
         VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        setting.key,
        setting.value,
      );
    }
  });

  return {
    restored: true,
    summary: `${backup.data.jobs.length} jobs, ${backup.data.timeEntries.length} shifts, and ${backup.data.shiftTemplates.length} templates restored.`,
  };
}
