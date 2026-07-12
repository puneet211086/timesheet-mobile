import type { SQLiteDatabase } from 'expo-sqlite';

async function columnExists(
  db: SQLiteDatabase,
  tableName: string,
  columnName: string
): Promise<boolean> {
  const columns = await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info(${tableName})`
  );
  return columns.some((column) => column.name === columnName);
}

export async function migrateDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      hourly_rate REAL NOT NULL DEFAULT 0,
      overtime_multiplier REAL NOT NULL DEFAULT 1.5,
      color TEXT NOT NULL DEFAULT '#2563EB',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS time_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      clock_in TEXT NOT NULL,
      clock_out TEXT,
      notes TEXT,
      unpaid_break_minutes INTEGER NOT NULL DEFAULT 0,
      reminder_notification_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (job_id) REFERENCES jobs(id)
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS shift_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      job_id INTEGER,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      unpaid_break_minutes INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_time_entries_clock_in
      ON time_entries(clock_in);
  `);

  if (!(await columnExists(db, 'jobs', 'color'))) {
    await db.execAsync(
      `ALTER TABLE jobs ADD COLUMN color TEXT NOT NULL DEFAULT '#2563EB'`
    );
  }

  if (!(await columnExists(db, 'jobs', 'updated_at'))) {
    await db.execAsync(`ALTER TABLE jobs ADD COLUMN updated_at TEXT`);
    await db.runAsync(
      `UPDATE jobs SET updated_at = COALESCE(updated_at, created_at)`
    );
  }

  if (!(await columnExists(db, 'time_entries', 'unpaid_break_minutes'))) {
    await db.execAsync(
      `ALTER TABLE time_entries ADD COLUMN unpaid_break_minutes INTEGER NOT NULL DEFAULT 0`
    );
  }

  if (!(await columnExists(db, 'time_entries', 'reminder_notification_id'))) {
    await db.execAsync(
      `ALTER TABLE time_entries ADD COLUMN reminder_notification_id TEXT`
    );
  }

  await db.runAsync(
    `INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)`,
    'shift_reminder_enabled',
    'false'
  );
  await db.runAsync(
    `INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)`,
    'shift_reminder_hours',
    '8'
  );

  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM jobs'
  );

  if (!result?.count) {
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO jobs
        (name, hourly_rate, overtime_multiplier, color, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      'Main Job',
      25,
      1.5,
      '#2563EB',
      1,
      now,
      now
    );
  }
}
