import { useState, useEffect, useCallback } from "react";
import { getDatabase, Exercise } from "@/db/client";

interface CreateExerciseInput {
  name: string;
  category: string;
  description: string | null;
}

interface UpdateExerciseInput {
  name?: string;
  category?: string;
  description?: string | null;
  isActive?: boolean;
}

export function useExercises() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchExercises = useCallback(async () => {
    try {
      setLoading(true);
      const db = await getDatabase();
      const results = await db.getAllAsync<Exercise>(
        "SELECT id, name, category, description, createdAt, isActive FROM exercises ORDER BY name ASC"
      );
      // Convert SQLite integer to boolean
      const mappedResults = results.map((r) => ({
        ...r,
        isActive: Boolean(r.isActive),
      }));
      setExercises(mappedResults);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  const createExercise = useCallback(async (input: CreateExerciseInput): Promise<Exercise> => {
    const db = await getDatabase();
    const result = await db.runAsync(
      "INSERT INTO exercises (name, category, description, isActive) VALUES (?, ?, ?, 1)",
      [input.name, input.category, input.description]
    );

    const newExercise: Exercise = {
      id: result.lastInsertRowId,
      name: input.name,
      category: input.category,
      description: input.description,
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    setExercises((prev) => [...prev, newExercise].sort((a, b) => a.name.localeCompare(b.name)));
    return newExercise;
  }, []);

  const updateExercise = useCallback(
    async (id: number, input: UpdateExerciseInput): Promise<void> => {
      const db = await getDatabase();
      const updates: string[] = [];
      const values: (string | number | null)[] = [];

      if (input.name !== undefined) {
        updates.push("name = ?");
        values.push(input.name);
      }
      if (input.category !== undefined) {
        updates.push("category = ?");
        values.push(input.category);
      }
      if (input.description !== undefined) {
        updates.push("description = ?");
        values.push(input.description);
      }
      if (input.isActive !== undefined) {
        updates.push("isActive = ?");
        values.push(input.isActive ? 1 : 0);
      }

      if (updates.length > 0) {
        values.push(id);
        await db.runAsync(`UPDATE exercises SET ${updates.join(", ")} WHERE id = ?`, values);

        setExercises((prev) =>
          prev.map((e) =>
            e.id === id
              ? {
                  ...e,
                  ...input,
                  isActive: input.isActive !== undefined ? input.isActive : e.isActive,
                }
              : e
          )
        );
      }
    },
    []
  );

  const deleteExercise = useCallback(async (id: number): Promise<void> => {
    const db = await getDatabase();
    // 先刪除相關的 workout sets
    await db.runAsync(
      "DELETE FROM workout_sets WHERE sessionId IN (SELECT id FROM workout_sessions WHERE exerciseId = ?)",
      [id]
    );
    // 刪除相關的 workout sessions
    await db.runAsync("DELETE FROM workout_sessions WHERE exerciseId = ?", [id]);
    // 刪除 exercise
    await db.runAsync("DELETE FROM exercises WHERE id = ?", [id]);

    setExercises((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return {
    exercises,
    loading,
    error,
    refresh: fetchExercises,
    createExercise,
    updateExercise,
    deleteExercise,
  };
}
