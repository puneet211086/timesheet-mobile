import type { SQLiteDatabase } from 'expo-sqlite';

async function columnExists(
  db: SQLiteDatabase,
  tableName: string,
  columnName: string,
): Promise<boolean> {
  const columns = await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info(${tableName})`,
  );
  return columns.some((column) => column.name === columnName);
}

async function addColumnIfMissing(
  db: SQLiteDatabase,
  table: string,
  column: string,
  definition: string,
): Promise<void> {
  if (!(await columnExists(db, table, column))) {
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
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
      overtime_enabled INTEGER NOT NULL DEFAULT 1,
      weekly_overtime_enabled INTEGER NOT NULL DEFAULT 1,
      weekly_overtime_hours REAL NOT NULL DEFAULT 40,
      daily_overtime_enabled INTEGER NOT NULL DEFAULT 0,
      daily_overtime_hours REAL NOT NULL DEFAULT 8,
      double_time_enabled INTEGER NOT NULL DEFAULT 0,
      double_time_hours REAL NOT NULL DEFAULT 12,
      double_time_multiplier REAL NOT NULL DEFAULT 2,
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

  await addColumnIfMissing(db, 'jobs', 'color', "TEXT NOT NULL DEFAULT '#2563EB'");
  await addColumnIfMissing(db, 'jobs', 'updated_at', 'TEXT');
  await addColumnIfMissing(db, 'jobs', 'overtime_enabled', 'INTEGER NOT NULL DEFAULT 1');
  await addColumnIfMissing(db, 'jobs', 'weekly_overtime_enabled', 'INTEGER NOT NULL DEFAULT 1');
  await addColumnIfMissing(db, 'jobs', 'weekly_overtime_hours', 'REAL NOT NULL DEFAULT 40');
  await addColumnIfMissing(db, 'jobs', 'daily_overtime_enabled', 'INTEGER NOT NULL DEFAULT 0');
  await addColumnIfMissing(db, 'jobs', 'daily_overtime_hours', 'REAL NOT NULL DEFAULT 8');
  await addColumnIfMissing(db, 'jobs', 'double_time_enabled', 'INTEGER NOT NULL DEFAULT 0');
  await addColumnIfMissing(db, 'jobs', 'double_time_hours', 'REAL NOT NULL DEFAULT 12');
  await addColumnIfMissing(db, 'jobs', 'double_time_multiplier', 'REAL NOT NULL DEFAULT 2');
  await addColumnIfMissing(db, 'time_entries', 'unpaid_break_minutes', 'INTEGER NOT NULL DEFAULT 0');
  await addColumnIfMissing(db, 'time_entries', 'reminder_notification_id', 'TEXT');

  await db.runAsync(
    `UPDATE jobs
     SET updated_at = COALESCE(updated_at, created_at),
         overtime_enabled = COALESCE(overtime_enabled, 1),
         weekly_overtime_enabled = COALESCE(weekly_overtime_enabled, 1),
         weekly_overtime_hours = COALESCE(weekly_overtime_hours, 40),
         daily_overtime_enabled = COALESCE(daily_overtime_enabled, 0),
         daily_overtime_hours = COALESCE(daily_overtime_hours, 8),
         double_time_enabled = COALESCE(double_time_enabled, 0),
         double_time_hours = COALESCE(double_time_hours, 12),
         double_time_multiplier = COALESCE(double_time_multiplier, 2)`,
  );

  const defaults: Array<[string, string]> = [
    ['shift_reminder_enabled', 'false'],
    ['shift_reminder_hours', '8'],
    ['app_lock_enabled', 'false'],
    ['currency_code', 'USD'],
    ['week_start', 'monday'],
    ['time_format', 'system'],
    ['appearance_mode', 'system'],
    ['onboarding_completed', 'false'],
  ];

  for (const [key, value] of defaults) {
    await db.runAsync(
      `INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)`,
      key,
      value,
    );
  }

  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM jobs',
  );

  if (!result?.count) {
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO jobs
       (name, hourly_rate, overtime_multiplier, overtime_enabled,
        weekly_overtime_enabled, weekly_overtime_hours,
        daily_overtime_enabled, daily_overtime_hours,
        double_time_enabled, double_time_hours, double_time_multiplier,
        color, is_active, created_at, updated_at)
       VALUES (?, ?, ?, 1, 1, 40, 0, 8, 0, 12, 2, ?, 1, ?, ?)`,
      'Main Job',
      25,
      1.5,
      '#2563EB',
      now,
      now,
    );
  }
}
