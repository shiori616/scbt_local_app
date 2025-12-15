import { Platform } from 'react-native';

// NOTE: Web では SQLite が未提供のため、DB 操作は localStorage に保存
// ネイティブのみ動作させるため、expo-sqlite は動的 import し、web では読み込まない。

let db: any = null;

function getDb() {
  if (db) {
    console.log('[getDb] Returning cached database');
    return db;
  }
  if (Platform.OS === 'web') {
    console.log('[getDb] Web platform, returning null');
    return null;
  }
  // expo-sqlite 14+ uses openDatabaseSync
  console.log('[getDb] Opening database...');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const SQLite = require('expo-sqlite');
  try {
    db = SQLite.openDatabaseSync('app.db');
    console.log('[getDb] Database opened successfully, available methods:', Object.keys(db || {}));
    return db;
  } catch (error) {
    console.error('[getDb] Error opening database:', error);
    return null;
  }
}

export async function initDatabase(): Promise<void> {
  console.log('[initDatabase] Starting initialization, Platform.OS:', Platform.OS);
  if (Platform.OS === 'web') {
    console.log('[initDatabase] Skipping for web platform');
    return;
  }

  const database = getDb();
  if (!database) {
    console.warn('[initDatabase] Database not available');
    return;
  }
  console.log('[initDatabase] Database obtained, creating table...');

  // Create table with latest schema
  database.execSync(`
    CREATE TABLE IF NOT EXISTS user_daily_condition_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recorded_date TEXT NOT NULL UNIQUE,
      memo TEXT,

      headache_level INTEGER NOT NULL DEFAULT 5,
      seizure_level INTEGER NOT NULL DEFAULT 5,
      right_side_level INTEGER NOT NULL DEFAULT 5,
      left_side_level INTEGER NOT NULL DEFAULT 5,
      speech_impairment_level INTEGER NOT NULL DEFAULT 5,
      memory_impairment_level INTEGER NOT NULL DEFAULT 5,

      physical_condition INTEGER NOT NULL DEFAULT 100,
      mental_condition INTEGER NOT NULL DEFAULT 100,

      blood_pressure_systolic INTEGER,
      blood_pressure_diastolic INTEGER,

      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  console.log('[initDatabase] Table created/verified');

  // Add missing columns for existing installations (ignore errors if column exists)
  const columnsToAdd = [
    { name: 'right_side_level', sql: 'ALTER TABLE user_daily_condition_logs ADD COLUMN right_side_level INTEGER DEFAULT 5' },
    { name: 'left_side_level', sql: 'ALTER TABLE user_daily_condition_logs ADD COLUMN left_side_level INTEGER DEFAULT 5' },
    { name: 'blood_pressure_systolic', sql: 'ALTER TABLE user_daily_condition_logs ADD COLUMN blood_pressure_systolic INTEGER' },
    { name: 'blood_pressure_diastolic', sql: 'ALTER TABLE user_daily_condition_logs ADD COLUMN blood_pressure_diastolic INTEGER' },
  ];

  for (const col of columnsToAdd) {
    try {
      database.execSync(col.sql);
      console.log('[initDatabase] Added column:', col.name);
    } catch (e: any) {
      // Ignore "duplicate column" errors
      if (e?.message?.includes('duplicate column')) {
        console.log('[initDatabase] Column already exists:', col.name);
      } else {
        console.warn('[initDatabase] Error adding column', col.name, ':', e);
      }
    }
  }
  console.log('[initDatabase] Initialization complete');
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
        headacheLevel: Number(data.headacheLevel ?? data.headache_level ?? 5),
        seizureLevel: Number(data.seizureLevel ?? data.seizure_level ?? 5),
        rightSideLevel: Number(data.rightSideLevel ?? data.right_side_level ?? 5),
        leftSideLevel: Number(data.leftSideLevel ?? data.left_side_level ?? 5),
        speechImpairmentLevel: Number(
          data.speechImpairmentLevel ?? data.speech_impairment_level ?? 5
        ),
        memoryImpairmentLevel: Number(
          data.memoryImpairmentLevel ?? data.memory_impairment_level ?? 5
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
  const database = getDb();
  if (!database) {
    console.warn('[getDailyConditionLog] Database not available');
    return null;
  }

  let row: any = null;
  try {
    console.log('[getDailyConditionLog] Querying for date:', recordedDate);
    
    // expo-sqlite 16.xでは、getFirstSyncが存在する場合と存在しない場合がある
    if (typeof database.getFirstSync === 'function') {
      console.log('[getDailyConditionLog] Using getFirstSync');
      row = database.getFirstSync(
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
    } else if (typeof database.prepareSync === 'function') {
      // getFirstSyncが存在しない場合は、prepareSyncとexecuteSyncを使う
      console.log('[getDailyConditionLog] Using prepareSync/executeSync');
      const stmt = database.prepareSync(
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
        `
      );
      stmt.bindSync([recordedDate]);
      const result = stmt.executeSync();
      console.log('[getDailyConditionLog] Query result type:', typeof result, 'isArray:', Array.isArray(result));
      console.log('[getDailyConditionLog] Query result:', JSON.stringify(result));
      
      // executeSyncの戻り値は配列またはオブジェクトの可能性がある
      if (result) {
        if (Array.isArray(result)) {
          if (result.length > 0) {
            row = result[0];
          }
        } else if (typeof result === 'object') {
          // オブジェクトの場合、直接使用
          row = result;
        } else if (result.getAll && typeof result.getAll === 'function') {
          // getAllメソッドがある場合
          const all = result.getAll();
          if (all && all.length > 0) {
            row = all[0];
          }
        } else if (result.getFirst && typeof result.getFirst === 'function') {
          // getFirstメソッドがある場合
          row = result.getFirst();
        }
      }
      stmt.finalizeSync();
    } else {
      console.error('[getDailyConditionLog] No supported API found');
      return null;
    }
    
    console.log('[getDailyConditionLog] Row found:', row);
  } catch (error) {
    console.error('[getDailyConditionLog] Error getting daily condition log:', error);
    return null;
  }

  if (!row) {
    console.log('[getDailyConditionLog] No row found for date:', recordedDate);
    return null;
  }

  return {
    recordedDate,
    memo: row.memo ?? null,
    headacheLevel: Number(row.headache_level ?? 5),
    seizureLevel: Number(row.seizure_level ?? 5),
    rightSideLevel: Number(row.right_side_level ?? 5),
    leftSideLevel: Number(row.left_side_level ?? 5),
    speechImpairmentLevel: Number(row.speech_impairment_level ?? 5),
    memoryImpairmentLevel: Number(row.memory_impairment_level ?? 5),
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
  const database = getDb();
  if (!database) return;

  const nowIso = new Date().toISOString();

  console.log('[saveDailyConditionLog] Saving data for date:', log.recordedDate, log);

  // Use INSERT OR REPLACE (UPSERT) since recorded_date is UNIQUE
  try {
    if (typeof database.runSync === 'function') {
      console.log('[saveDailyConditionLog] Using runSync');
      database.runSync(
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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(recorded_date) DO UPDATE SET
          memo = excluded.memo,
          headache_level = excluded.headache_level,
          seizure_level = excluded.seizure_level,
          right_side_level = excluded.right_side_level,
          left_side_level = excluded.left_side_level,
          speech_impairment_level = excluded.speech_impairment_level,
          memory_impairment_level = excluded.memory_impairment_level,
          physical_condition = excluded.physical_condition,
          mental_condition = excluded.mental_condition,
          blood_pressure_systolic = excluded.blood_pressure_systolic,
          blood_pressure_diastolic = excluded.blood_pressure_diastolic,
          updated_at = excluded.updated_at;
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
      console.log('[saveDailyConditionLog] Data saved successfully with runSync');
    } else if (typeof database.prepareSync === 'function') {
      // runSyncが存在しない場合は、prepareSyncとexecuteSyncを使う
      console.log('[saveDailyConditionLog] Using prepareSync/executeSync');
      const stmt = database.prepareSync(
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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(recorded_date) DO UPDATE SET
          memo = excluded.memo,
          headache_level = excluded.headache_level,
          seizure_level = excluded.seizure_level,
          right_side_level = excluded.right_side_level,
          left_side_level = excluded.left_side_level,
          speech_impairment_level = excluded.speech_impairment_level,
          memory_impairment_level = excluded.memory_impairment_level,
          physical_condition = excluded.physical_condition,
          mental_condition = excluded.mental_condition,
          blood_pressure_systolic = excluded.blood_pressure_systolic,
          blood_pressure_diastolic = excluded.blood_pressure_diastolic,
          updated_at = excluded.updated_at;
        `
      );
      stmt.bindSync([
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
      ]);
      stmt.executeSync();
      stmt.finalizeSync();
      console.log('[saveDailyConditionLog] Data saved successfully with prepareSync/executeSync');
    } else {
      console.error('[saveDailyConditionLog] No supported API found');
      throw new Error('No supported database API found');
    }
  } catch (error) {
    console.error('[saveDailyConditionLog] Error saving daily condition log:', error);
    throw error;
  }
}

// Utility: 指定範囲の日付について、未記録ならデフォルト値で作成
export async function ensureDefaultLogsForRange(startDate: Date, endDate: Date): Promise<void> {
  const toIso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const oneDayMs = 24 * 60 * 60 * 1000;
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  for (let t = start.getTime(); t <= end.getTime(); t += oneDayMs) {
    const d = new Date(t);
    const iso = toIso(d);
    const exists = await getDailyConditionLog(iso);
    if (exists) continue;
    await saveDailyConditionLog({
      recordedDate: iso,
      memo: '',
      headacheLevel: 5,
      seizureLevel: 5,
      rightSideLevel: 5,
      leftSideLevel: 5,
      speechImpairmentLevel: 5,
      memoryImpairmentLevel: 5,
      physicalCondition: 100,
      mentalCondition: 100,
      bloodPressureSystolic: null,
      bloodPressureDiastolic: null,
    });
  }
}

// 過去1年分（今日を含む）をデフォルト作成
export async function ensureDefaultLogsForPastYear(): Promise<void> {
  const today = new Date();
  const lastYear = new Date(today);
  lastYear.setFullYear(today.getFullYear() - 1);
  await ensureDefaultLogsForRange(lastYear, today);
}
