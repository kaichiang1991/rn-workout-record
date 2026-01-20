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

  // 建立 ExerciseBodyParts 關聯表
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS exercise_body_parts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exerciseId INTEGER NOT NULL,
      bodyPart TEXT NOT NULL,
      FOREIGN KEY (exerciseId) REFERENCES exercises(id) ON DELETE CASCADE
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
      weight REAL,
      reps INTEGER,
      setCount INTEGER,
      difficulty INTEGER,
      isBodyweight INTEGER DEFAULT 0,
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

  // 檢查是否需要加入預設資料
  const result = await database.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM exercises"
  );

  if (result && result.count === 0) {
    await seedDatabase(database);
  }
}

async function seedDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
  const defaultExercises = [
    // 腿部 & 蹲系列
    { name: "深蹲", bodyParts: ["legs"], description: "經典下肢訓練動作" },
    { name: "腿推", bodyParts: ["legs"], description: "腿部機械訓練" },
    // 推系列
    { name: "臥推", bodyParts: ["chest"], description: "胸部主要訓練動作" },
    { name: "啞鈴臥推", bodyParts: ["chest"], description: "使用啞鈴的胸部推舉動作" },
    { name: "肩推", bodyParts: ["shoulders"], description: "肩部訓練動作" },
    { name: "器材肩推", bodyParts: ["shoulders"], description: "使用器材的肩部推舉動作" },
    { name: "飛鳥", bodyParts: ["chest"], description: "胸部孤立訓練" },
    { name: "側平舉", bodyParts: ["shoulders"], description: "肩部側三角肌孤立訓練" },
    // 拉系列
    { name: "划船", bodyParts: ["back"], description: "背部水平拉動作" },
    { name: "坐姿划船", bodyParts: ["back"], description: "坐姿背部水平拉動作" },
    { name: "高拉划船", bodyParts: ["back"], description: "高位划船動作" },
    { name: "引體向上", bodyParts: ["back", "arms"], description: "背部訓練經典動作" },
    { name: "滑輪下拉", bodyParts: ["back"], description: "背部垂直拉動作" },
    // 鉸鏈系列
    { name: "硬舉", bodyParts: ["back", "legs"], description: "全身性複合動作" },
    { name: "傳統硬舉", bodyParts: ["back", "legs"], description: "傳統姿勢的硬舉動作" },
    { name: "羅馬尼亞硬舉", bodyParts: ["back", "legs"], description: "針對後鏈肌群的硬舉變化式" },
    // 手臂
    { name: "二頭彎舉", bodyParts: ["arms"], description: "二頭肌孤立訓練" },
    { name: "三頭下壓", bodyParts: ["arms"], description: "三頭肌訓練" },
    { name: "過頭三頭伸展", bodyParts: ["arms"], description: "三頭肌過頭伸展動作" },
    // 核心
    { name: "平板支撐", bodyParts: ["core"], description: "核心穩定訓練" },
    { name: "碰肩", bodyParts: ["core"], description: "核心抗旋轉訓練動作" },
    { name: "反向捲腹", bodyParts: ["core"], description: "下腹部核心訓練" },
    { name: "側棒式", bodyParts: ["core"], description: "核心側向穩定訓練" },
    // 有氧
    { name: "跑步", bodyParts: ["cardio"], description: "有氧運動" },
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
