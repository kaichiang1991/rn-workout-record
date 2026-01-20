import * as SQLite from "expo-sqlite";

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync("workout.db");
  }
  return db;
}

export async function initDatabase(): Promise<void> {
  const database = await getDatabase();

  // 建立 Exercise 表
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      isActive INTEGER DEFAULT 1
    );
  `);

  // 建立 WorkoutSession 表
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS workout_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exerciseId INTEGER NOT NULL,
      date TEXT NOT NULL,
      notes TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (exerciseId) REFERENCES exercises(id) ON DELETE CASCADE
    );
  `);

  // 建立 WorkoutSet 表
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS workout_sets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sessionId INTEGER NOT NULL,
      setNumber INTEGER NOT NULL,
      reps INTEGER,
      weight REAL,
      FOREIGN KEY (sessionId) REFERENCES workout_sessions(id) ON DELETE CASCADE
    );
  `);

  // 建立 ExerciseBodyParts 關聯表
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS exercise_body_parts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exerciseId INTEGER NOT NULL,
      bodyPart TEXT NOT NULL,
      FOREIGN KEY (exerciseId) REFERENCES exercises(id) ON DELETE CASCADE
    );
  `);

  // 建立 TrainingMenu 表
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS training_menus (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 建立 TrainingMenuItem 表
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS training_menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      menuId INTEGER NOT NULL,
      exerciseId INTEGER NOT NULL,
      sortOrder INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (menuId) REFERENCES training_menus(id) ON DELETE CASCADE,
      FOREIGN KEY (exerciseId) REFERENCES exercises(id) ON DELETE CASCADE
    );
  `);

  // 遷移：新增 workout_sessions 欄位
  const columns = await database.getAllAsync<{ name: string }>(
    "PRAGMA table_info(workout_sessions)"
  );
  const columnNames = columns.map((c) => c.name);

  if (!columnNames.includes("weight")) {
    await database.execAsync("ALTER TABLE workout_sessions ADD COLUMN weight REAL");
  }
  if (!columnNames.includes("reps")) {
    await database.execAsync("ALTER TABLE workout_sessions ADD COLUMN reps INTEGER");
  }
  if (!columnNames.includes("setCount")) {
    await database.execAsync("ALTER TABLE workout_sessions ADD COLUMN setCount INTEGER");
  }
  if (!columnNames.includes("difficulty")) {
    await database.execAsync("ALTER TABLE workout_sessions ADD COLUMN difficulty INTEGER");
  }
  if (!columnNames.includes("isBodyweight")) {
    await database.execAsync(
      "ALTER TABLE workout_sessions ADD COLUMN isBodyweight INTEGER DEFAULT 0"
    );
  }

  // 清理可能殘留的暫存表格（從失敗的遷移中留下的）
  await database.execAsync("DROP TABLE IF EXISTS workout_sessions_new;");
  await database.execAsync("DROP TABLE IF EXISTS workout_sets_new;");

  // 遷移：移除 workout_sessions 的 mood 欄位（已被 difficulty 取代）
  const sessionColumns = await database.getAllAsync<{ name: string }>(
    "PRAGMA table_info(workout_sessions)"
  );
  const sessionColumnNames = sessionColumns.map((c) => c.name);

  if (sessionColumnNames.includes("mood")) {
    // 先將 mood 資料複製到 difficulty（如果尚未遷移）
    await database.execAsync(
      "UPDATE workout_sessions SET difficulty = mood WHERE difficulty IS NULL AND mood IS NOT NULL"
    );

    // 使用 SQLite 標準方式移除欄位：重建表格
    await database.execAsync(`
      CREATE TABLE workout_sessions_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        exerciseId INTEGER NOT NULL,
        date TEXT NOT NULL,
        notes TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        weight REAL,
        reps INTEGER,
        setCount INTEGER,
        difficulty INTEGER,
        isBodyweight INTEGER DEFAULT 0,
        FOREIGN KEY (exerciseId) REFERENCES exercises(id) ON DELETE CASCADE
      );
    `);
    await database.execAsync(`
      INSERT INTO workout_sessions_new (id, exerciseId, date, notes, createdAt, weight, reps, setCount, difficulty, isBodyweight)
      SELECT id, exerciseId, date, notes, createdAt, weight, reps, setCount, difficulty, isBodyweight
      FROM workout_sessions;
    `);
    await database.execAsync("DROP TABLE workout_sessions;");
    await database.execAsync("ALTER TABLE workout_sessions_new RENAME TO workout_sessions;");
  }

  // 遷移：移除 workout_sets 的 duration 和 notes 欄位（從未使用）
  const setColumns = await database.getAllAsync<{ name: string }>(
    "PRAGMA table_info(workout_sets)"
  );
  const setColumnNames = setColumns.map((c) => c.name);

  if (setColumnNames.includes("duration") || setColumnNames.includes("notes")) {
    await database.execAsync(`
      CREATE TABLE workout_sets_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sessionId INTEGER NOT NULL,
        setNumber INTEGER NOT NULL,
        reps INTEGER,
        weight REAL,
        FOREIGN KEY (sessionId) REFERENCES workout_sessions(id) ON DELETE CASCADE
      );
    `);
    await database.execAsync(`
      INSERT INTO workout_sets_new (id, sessionId, setNumber, reps, weight)
      SELECT id, sessionId, setNumber, reps, weight
      FROM workout_sets;
    `);
    await database.execAsync("DROP TABLE workout_sets;");
    await database.execAsync("ALTER TABLE workout_sets_new RENAME TO workout_sets;");
  }

  // 檢查是否需要加入預設資料
  const result = await database.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM exercises"
  );

  if (result && result.count === 0) {
    await seedDatabase(database);
  }

  // 清理可能殘留的暫存表格
  await database.execAsync("DROP TABLE IF EXISTS exercises_new;");

  // 遷移：檢查 exercises 表是否還有 category 欄位
  const exerciseColumns = await database.getAllAsync<{ name: string }>(
    "PRAGMA table_info(exercises)"
  );
  const exerciseColumnNames = exerciseColumns.map((c) => c.name);

  if (exerciseColumnNames.includes("category")) {
    // 先確保每個 exercise 都有對應的 body_part 關聯
    // 如果 exercise 存在但沒有 body_part 關聯，則根據 category 建立關聯
    const exercisesWithoutBodyParts = await database.getAllAsync<{ id: number; category: string }>(
      `SELECT e.id, e.category
       FROM exercises e
       LEFT JOIN exercise_body_parts bp ON e.id = bp.exerciseId
       WHERE bp.id IS NULL AND e.category IS NOT NULL`
    );

    for (const exercise of exercisesWithoutBodyParts) {
      await database.runAsync(
        "INSERT INTO exercise_body_parts (exerciseId, bodyPart) VALUES (?, ?)",
        [exercise.id, exercise.category]
      );
    }

    // 移除 category 欄位
    await database.execAsync(`
      CREATE TABLE exercises_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        isActive INTEGER DEFAULT 1
      );
    `);
    await database.execAsync(`
      INSERT INTO exercises_new (id, name, description, createdAt, isActive)
      SELECT id, name, description, createdAt, isActive
      FROM exercises;
    `);
    await database.execAsync("DROP TABLE exercises;");
    await database.execAsync("ALTER TABLE exercises_new RENAME TO exercises;");
  }
}

async function seedDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
  const defaultExercises = [
    { name: "深蹲", bodyParts: ["legs"], description: "經典下肢訓練動作" },
    { name: "臥推", bodyParts: ["chest"], description: "胸部主要訓練動作" },
    { name: "硬舉", bodyParts: ["back", "legs"], description: "全身性複合動作" },
    { name: "肩推", bodyParts: ["shoulders"], description: "肩部訓練動作" },
    { name: "引體向上", bodyParts: ["back", "arms"], description: "背部訓練經典動作" },
    { name: "二頭彎舉", bodyParts: ["arms"], description: "二頭肌孤立訓練" },
    { name: "三頭下壓", bodyParts: ["arms"], description: "三頭肌訓練" },
    { name: "腿推", bodyParts: ["legs"], description: "腿部機械訓練" },
    { name: "划船", bodyParts: ["back"], description: "背部水平拉動作" },
    { name: "平板支撐", bodyParts: ["core"], description: "核心穩定訓練" },
    { name: "跑步", bodyParts: ["cardio"], description: "有氧運動" },
    { name: "飛鳥", bodyParts: ["chest"], description: "胸部孤立訓練" },
  ];

  for (const exercise of defaultExercises) {
    const result = await database.runAsync(
      "INSERT INTO exercises (name, description, isActive) VALUES (?, ?, 1)",
      [exercise.name, exercise.description]
    );

    // 插入部位關聯
    for (const bodyPart of exercise.bodyParts) {
      await database.runAsync(
        "INSERT INTO exercise_body_parts (exerciseId, bodyPart) VALUES (?, ?)",
        [result.lastInsertRowId, bodyPart]
      );
    }
  }
}

// Types
export interface Exercise {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  isActive: boolean;
}

export interface WorkoutSession {
  id: number;
  exerciseId: number;
  date: string;
  weight: number | null;
  reps: number | null;
  setCount: number | null;
  difficulty: number | null;
  isBodyweight: number; // SQLite 使用 0/1
  notes: string | null;
  createdAt: string;
}

export interface ExerciseBodyPart {
  id: number;
  exerciseId: number;
  bodyPart: string;
}

export interface WorkoutSet {
  id: number;
  sessionId: number;
  setNumber: number;
  reps: number | null;
  weight: number | null;
}

export interface WorkoutSessionWithSets extends WorkoutSession {
  sets: WorkoutSet[];
}

export interface TrainingMenu {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
}

export interface TrainingMenuItem {
  id: number;
  menuId: number;
  exerciseId: number;
  sortOrder: number;
}
