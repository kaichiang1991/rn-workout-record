import { useState, useEffect, useCallback } from "react";
import { getDatabase, WorkoutSession, WorkoutSet, WorkoutSessionWithSets } from "@/db/client";

interface CreateSetInput {
  setNumber: number;
  reps: number | null;
  weight: number | null;
  duration: number | null;
  notes: string | null;
}

interface CreateSessionInput {
  exerciseId: number;
  date: string;
  mood: number | null;
  notes: string | null;
  sets: CreateSetInput[];
}

interface UseWorkoutSessionsOptions {
  limit?: number;
  exerciseId?: number;
}

export function useWorkoutSessions(options: UseWorkoutSessionsOptions = {}) {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const db = await getDatabase();
      let query = "SELECT * FROM workout_sessions";
      const params: (number | string)[] = [];

      if (options.exerciseId) {
        query += " WHERE exerciseId = ?";
        params.push(options.exerciseId);
      }

      query += " ORDER BY date DESC, createdAt DESC";

      if (options.limit) {
        query += " LIMIT ?";
        params.push(options.limit);
      }

      const results = await db.getAllAsync<WorkoutSession>(query, params);
      setSessions(results);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setLoading(false);
    }
  }, [options.limit, options.exerciseId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const getSessionById = useCallback(async (id: number): Promise<WorkoutSessionWithSets | null> => {
    const db = await getDatabase();
    const session = await db.getFirstAsync<WorkoutSession>(
      "SELECT * FROM workout_sessions WHERE id = ?",
      [id]
    );

    if (!session) return null;

    const sets = await db.getAllAsync<WorkoutSet>(
      "SELECT * FROM workout_sets WHERE sessionId = ? ORDER BY setNumber ASC",
      [id]
    );

    return { ...session, sets };
  }, []);

  const createSession = useCallback(async (input: CreateSessionInput): Promise<WorkoutSession> => {
    const db = await getDatabase();

    // 建立 session
    const sessionResult = await db.runAsync(
      "INSERT INTO workout_sessions (exerciseId, date, mood, notes) VALUES (?, ?, ?, ?)",
      [input.exerciseId, input.date, input.mood, input.notes]
    );

    const sessionId = sessionResult.lastInsertRowId;

    // 建立 sets
    for (const set of input.sets) {
      await db.runAsync(
        "INSERT INTO workout_sets (sessionId, setNumber, reps, weight, duration, notes) VALUES (?, ?, ?, ?, ?, ?)",
        [sessionId, set.setNumber, set.reps, set.weight, set.duration, set.notes]
      );
    }

    const newSession: WorkoutSession = {
      id: sessionId,
      exerciseId: input.exerciseId,
      date: input.date,
      mood: input.mood,
      weight: null,
      reps: null,
      setCount: null,
      difficulty: null,
      isBodyweight: 0,
      notes: input.notes,
      createdAt: new Date().toISOString(),
    };

    setSessions((prev) => [newSession, ...prev]);
    return newSession;
  }, []);

  const deleteSession = useCallback(async (id: number): Promise<void> => {
    const db = await getDatabase();
    // 先刪除相關的 sets
    await db.runAsync("DELETE FROM workout_sets WHERE sessionId = ?", [id]);
    // 刪除 session
    await db.runAsync("DELETE FROM workout_sessions WHERE id = ?", [id]);

    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return {
    sessions,
    loading,
    error,
    refresh: fetchSessions,
    getSessionById,
    createSession,
    deleteSession,
  };
}
