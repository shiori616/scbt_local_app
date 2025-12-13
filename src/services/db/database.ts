import * as SQLite from 'expo-sqlite';

// Open or create database
const db = SQLite.openDatabase('app.db');

type SQLResult = {
  rowsAffected: number;
  insertId?: number | null;
  rows: {
    length: number;
    item: (index: number) => any;
    _array: any[];
  };
};

function executeSql(sql: string, params: any[] = []): Promise<SQLResult> {
  return new Promise((resolve, reject) => {
    db.transaction(
      tx => {
        tx.executeSql(
          sql,
          params,
          (_, result) => resolve(result as unknown as SQLResult),
          (_, err) => {
            reject(err);
            return false;
          }
        );
      },
      reject
    );
  });
}

export async function initDatabase(): Promise<void> {
  // Create table with latest schema
  await executeSql(`
    CREATE TABLE IF NOT EXISTS user_daily_condition_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recorded_date TEXT NOT NULL,
      memo TEXT,

      headache_level INTEGER NOT NULL,
      seizure_level INTEGER NOT NULL,
      right_hand_level INTEGER NOT NULL,
      right_leg_level INTEGER NOT NULL,
      left_hand_level INTEGER NOT NULL,
      left_leg_level INTEGER NOT NULL,
      speech_impairment_level INTEGER NOT NULL,
      memory_impairment_level INTEGER NOT NULL,

      physical_condition INTEGER NOT NULL,
      mental_condition INTEGER NOT NULL,

      blood_pressure_systolic INTEGER,
      blood_pressure_diastolic INTEGER,

      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Add missing columns for existing installations
  const info = await executeSql(`PRAGMA table_info(user_daily_condition_logs);`);
  const existingColumns = new Set(
    (info.rows?._array ?? []).map((r: any) => String(r.name))
  );
  if (!existingColumns.has('blood_pressure_systolic')) {
    await executeSql(
      `ALTER TABLE user_daily_condition_logs ADD COLUMN blood_pressure_systolic INTEGER;`
    );
  }
  if (!existingColumns.has('blood_pressure_diastolic')) {
    await executeSql(
      `ALTER TABLE user_daily_condition_logs ADD COLUMN blood_pressure_diastolic INTEGER;`
    );
  }
}

export type DailyConditionLog = {
  recordedDate: string;
  memo?: string | null;

  headacheLevel: number;
  seizureLevel: number;
  rightHandLevel: number;
  rightLegLevel: number;
  leftHandLevel: number;
  leftLegLevel: number;
  speechImpairmentLevel: number;
  memoryImpairmentLevel: number;

  physicalCondition: number;
  mentalCondition: number;

  bloodPressureSystolic?: number | null;
  bloodPressureDiastolic?: number | null;
};

export async function saveDailyConditionLog(log: DailyConditionLog): Promise<void> {
  await initDatabase();

  const nowIso = new Date().toISOString();

  // Check if record exists for recorded_date
  const select = await executeSql(
    `SELECT id FROM user_daily_condition_logs WHERE recorded_date = ? LIMIT 1;`,
    [log.recordedDate]
  );
  const existingId: number | undefined =
    select.rows.length > 0 ? select.rows.item(0).id : undefined;

  if (existingId != null) {
    // UPDATE existing
    await executeSql(
      `
      UPDATE user_daily_condition_logs
      SET
        memo = ?,
        headache_level = ?,
        seizure_level = ?,
        right_hand_level = ?,
        right_leg_level = ?,
        left_hand_level = ?,
        left_leg_level = ?,
        speech_impairment_level = ?,
        memory_impairment_level = ?,
        physical_condition = ?,
        mental_condition = ?,
        blood_pressure_systolic = ?,
        blood_pressure_diastolic = ?,
        updated_at = ?
      WHERE id = ?;
      `,
      [
        log.memo ?? null,
        log.headacheLevel,
        log.seizureLevel,
        log.rightHandLevel,
        log.rightLegLevel,
        log.leftHandLevel,
        log.leftLegLevel,
        log.speechImpairmentLevel,
        log.memoryImpairmentLevel,
        log.physicalCondition,
        log.mentalCondition,
        log.bloodPressureSystolic ?? null,
        log.bloodPressureDiastolic ?? null,
        nowIso,
        existingId,
      ]
    );
    return;
  }

  // INSERT new
  await executeSql(
    `
    INSERT INTO user_daily_condition_logs (
      recorded_date,
      memo,
      headache_level,
      seizure_level,
      right_hand_level,
      right_leg_level,
      left_hand_level,
      left_leg_level,
      speech_impairment_level,
      memory_impairment_level,
      physical_condition,
      mental_condition,
      blood_pressure_systolic,
      blood_pressure_diastolic,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    [
      log.recordedDate,
      log.memo ?? null,
      log.headacheLevel,
      log.seizureLevel,
      log.rightHandLevel,
      log.rightLegLevel,
      log.leftHandLevel,
      log.leftLegLevel,
      log.speechImpairmentLevel,
      log.memoryImpairmentLevel,
      log.physicalCondition,
      log.mentalCondition,
      log.bloodPressureSystolic ?? null,
      log.bloodPressureDiastolic ?? null,
      nowIso,
      nowIso,
    ]
  );
}


