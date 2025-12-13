import { Platform } from 'react-native';

// NOTE: Web では SQLite が未提供のため、DB 操作は no-op（必要に応じて localStorage 等に差し替え）
// ネイティブのみ動作させるため、expo-sqlite は動的 import し、web では読み込まない。
let nativeDb: any | null = null;
function getNativeDb() {
  if (nativeDb) return nativeDb;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const SQLite = require('expo-sqlite');
  nativeDb = SQLite.openDatabase('app.db');
  return nativeDb;
}

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
    const db = getNativeDb();
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
  if (Platform.OS === 'web') {
    // Web はスキップ（必要ならここで IndexedDB/localStorage へ移行実装）
    return;
  }
  // Create table with latest schema（ネイティブ）
  await executeSql(`
    CREATE TABLE IF NOT EXISTS user_daily_condition_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recorded_date TEXT NOT NULL,
      memo TEXT,

      headache_level INTEGER NOT NULL,
      seizure_level INTEGER NOT NULL,
      right_side_level INTEGER NOT NULL,
      left_side_level INTEGER NOT NULL,
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
  if (!existingColumns.has('right_side_level')) {
    await executeSql(
      `ALTER TABLE user_daily_condition_logs ADD COLUMN right_side_level INTEGER;`
    );
  }
  if (!existingColumns.has('left_side_level')) {
    await executeSql(
      `ALTER TABLE user_daily_condition_logs ADD COLUMN left_side_level INTEGER;`
    );
  }
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
  rightSideLevel: number;
  leftSideLevel: number;
  speechImpairmentLevel: number;
  memoryImpairmentLevel: number;

  physicalCondition: number;
  mentalCondition: number;

  bloodPressureSystolic?: number | null;
  bloodPressureDiastolic?: number | null;
};

export async function getDailyConditionLog(
  recordedDate: string
): Promise<DailyConditionLog | null> {
  if (Platform.OS === 'web') {
    try {
      // eslint-disable-next-line no-undef
      const raw = localStorage.getItem(`user_daily_condition_logs:${recordedDate}`);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return {
        recordedDate,
        memo: data.memo ?? null,
        headacheLevel: Number(data.headacheLevel ?? data.headache_level ?? 1),
        seizureLevel: Number(data.seizureLevel ?? data.seizure_level ?? 1),
        rightSideLevel: Number(data.rightSideLevel ?? data.right_side_level ?? 1),
        leftSideLevel: Number(data.leftSideLevel ?? data.left_side_level ?? 1),
        speechImpairmentLevel: Number(
          data.speechImpairmentLevel ?? data.speech_impairment_level ?? 1
        ),
        memoryImpairmentLevel: Number(
          data.memoryImpairmentLevel ?? data.memory_impairment_level ?? 1
        ),
        physicalCondition: Number(data.physicalCondition ?? data.physical_condition ?? 100),
        mentalCondition: Number(data.mentalCondition ?? data.mental_condition ?? 100),
        bloodPressureSystolic:
          data.bloodPressureSystolic ?? data.blood_pressure_systolic ?? null,
        bloodPressureDiastolic:
          data.bloodPressureDiastolic ?? data.blood_pressure_diastolic ?? null,
      };
    } catch {
      return null;
    }
  }

  await initDatabase();
  const result = await executeSql(
    `
    SELECT
      recorded_date,
      memo,
      headache_level,
      seizure_level,
      right_side_level,
      left_side_level,
      speech_impairment_level,
      memory_impairment_level,
      physical_condition,
      mental_condition,
      blood_pressure_systolic,
      blood_pressure_diastolic
    FROM user_daily_condition_logs
    WHERE recorded_date = ?
    LIMIT 1;
    `,
    [recordedDate]
  );
  if (result.rows.length === 0) return null;
  const row = result.rows.item(0);
  return {
    recordedDate,
    memo: row.memo ?? null,
    headacheLevel: Number(row.headache_level ?? 1),
    seizureLevel: Number(row.seizure_level ?? 1),
    rightSideLevel: Number(row.right_side_level ?? 1),
    leftSideLevel: Number(row.left_side_level ?? 1),
    speechImpairmentLevel: Number(row.speech_impairment_level ?? 1),
    memoryImpairmentLevel: Number(row.memory_impairment_level ?? 1),
    physicalCondition: Number(row.physical_condition ?? 100),
    mentalCondition: Number(row.mental_condition ?? 100),
    bloodPressureSystolic:
      row.blood_pressure_systolic != null ? Number(row.blood_pressure_systolic) : null,
    bloodPressureDiastolic:
      row.blood_pressure_diastolic != null ? Number(row.blood_pressure_diastolic) : null,
  };
}

export async function saveDailyConditionLog(log: DailyConditionLog): Promise<void> {
  // Web では localStorage に保存する簡易フォールバック
  if (Platform.OS === 'web') {
    const nowIso = new Date().toISOString();
    const key = `user_daily_condition_logs:${log.recordedDate}`;
    const payload = {
      ...log,
      created_at: nowIso,
      updated_at: nowIso,
    };
    try {
      // eslint-disable-next-line no-undef
      localStorage.setItem(key, JSON.stringify(payload));
    } catch {
      // ignore
    }
    return;
  }

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
        right_side_level = ?,
        left_side_level = ?,
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
        log.rightSideLevel,
        log.leftSideLevel,
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
      right_side_level,
      left_side_level,
      speech_impairment_level,
      memory_impairment_level,
      physical_condition,
      mental_condition,
      blood_pressure_systolic,
      blood_pressure_diastolic,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    [
      log.recordedDate,
      log.memo ?? null,
      log.headacheLevel,
      log.seizureLevel,
      log.rightSideLevel,
      log.leftSideLevel,
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


