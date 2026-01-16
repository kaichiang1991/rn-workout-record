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
      category TEXT,
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
      mood INTEGER,
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
      duration INTEGER,
      notes TEXT,
      FOREIGN KEY (sessionId) REFERENCES workout_sessions(id) ON DELETE CASCADE
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
    { name: "深蹲", category: "legs", description: "經典下肢訓練動作" },
    { name: "臥推", category: "chest", description: "胸部主要訓練動作" },
    { name: "硬舉", category: "back", description: "全身性複合動作" },
    { name: "肩推", category: "shoulders", description: "肩部訓練動作" },
    { name: "引體向上", category: "back", description: "背部訓練經典動作" },
    { name: "二頭彎舉", category: "arms", description: "二頭肌孤立訓練" },
    { name: "三頭下壓", category: "arms", description: "三頭肌訓練" },
    { name: "腿推", category: "legs", description: "腿部機械訓練" },
    { name: "划船", category: "back", description: "背部水平拉動作" },
    { name: "平板支撐", category: "core", description: "核心穩定訓練" },
    { name: "跑步", category: "cardio", description: "有氧運動" },
    { name: "飛鳥", category: "chest", description: "胸部孤立訓練" },
  ];

  for (const exercise of defaultExercises) {
    await database.runAsync(
      "INSERT INTO exercises (name, category, description, isActive) VALUES (?, ?, ?, 1)",
      [exercise.name, exercise.category, exercise.description]
    );
  }
}

// Types
export interface Exercise {
  id: number;
  name: string;
  category: string | null;
  description: string | null;
  createdAt: string;
  isActive: boolean;
}

export interface WorkoutSession {
  id: number;
  exerciseId: number;
  date: string;
  mood: number | null;
  notes: string | null;
  createdAt: string;
}

export interface WorkoutSet {
  id: number;
  sessionId: number;
  setNumber: number;
  reps: number | null;
  weight: number | null;
  duration: number | null;
  notes: string | null;
}

export interface WorkoutSessionWithSets extends WorkoutSession {
  sets: WorkoutSet[];
}
