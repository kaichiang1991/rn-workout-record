import { useState, useEffect, useCallback } from "react";
import { getDatabase, WorkoutSession } from "@/db/client";

interface CreateSessionInput {
  exerciseId: number;
  date: string;
  weight: number | null;
  reps: number;
  setCount: number;
  difficulty: number;
  isBodyweight: boolean;
  notes: string | null;
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

  const getSessionById = useCallback(async (id: number): Promise<WorkoutSession | null> => {
    const db = await getDatabase();
    const session = await db.getFirstAsync<WorkoutSession>(
      "SELECT * FROM workout_sessions WHERE id = ?",
      [id]
    );
    return session || null;
  }, []);

  const getRecentByExerciseId = useCallback(
    async (exerciseId: number, limit: number = 3): Promise<WorkoutSession[]> => {
      const db = await getDatabase();
      const results = await db.getAllAsync<WorkoutSession>(
        "SELECT * FROM workout_sessions WHERE exerciseId = ? ORDER BY date DESC, createdAt DESC LIMIT ?",
        [exerciseId, limit]
      );
      return results;
    },
    []
  );

  const createSession = useCallback(async (input: CreateSessionInput): Promise<WorkoutSession> => {
    const db = await getDatabase();

    const sessionResult = await db.runAsync(
      `INSERT INTO workout_sessions
       (exerciseId, date, weight, reps, setCount, difficulty, isBodyweight, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.exerciseId,
        input.date,
        input.isBodyweight ? null : input.weight,
        input.reps,
        input.setCount,
        input.difficulty,
        input.isBodyweight ? 1 : 0,
        input.notes,
      ]
    );

    const newSession: WorkoutSession = {
      id: sessionResult.lastInsertRowId,
      exerciseId: input.exerciseId,
      date: input.date,
      weight: input.isBodyweight ? null : input.weight,
      reps: input.reps,
      setCount: input.setCount,
      difficulty: input.difficulty,
      isBodyweight: input.isBodyweight ? 1 : 0,
      notes: input.notes,
      createdAt: new Date().toISOString(),
    };

    setSessions((prev) => [newSession, ...prev]);
    return newSession;
  }, []);

  const deleteSession = useCallback(async (id: number): Promise<void> => {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM workout_sessions WHERE id = ?", [id]);

    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return {
    sessions,
    loading,
    error,
    refresh: fetchSessions,
    getSessionById,
    getRecentByExerciseId,
    createSession,
    deleteSession,
  };
}
