import { useState, useEffect, useCallback, useMemo } from "react";
import { getDatabase, Exercise, ExerciseBodyPart } from "@/db/client";
import { BodyPartKey } from "@/utils/constants";

interface CreateExerciseInput {
  name: string;
  bodyParts: string[]; // 改成陣列
  description: string | null;
}

interface UpdateExerciseInput {
  name?: string;
  bodyParts?: string[]; // 改成陣列
  description?: string | null;
  isActive?: boolean;
}

export function useExercises() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exerciseBodyParts, setExerciseBodyParts] = useState<ExerciseBodyPart[]>([]);
  const [selectedBodyPart, setSelectedBodyPart] = useState<BodyPartKey | null>(null);
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

      // 取得所有部位關聯
      const bodyParts = await db.getAllAsync<ExerciseBodyPart>("SELECT * FROM exercise_body_parts");
      setExerciseBodyParts(bodyParts);

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
    const primaryCategory = input.bodyParts[0] || "other";

    const result = await db.runAsync(
      "INSERT INTO exercises (name, category, description, isActive) VALUES (?, ?, ?, 1)",
      [input.name, primaryCategory, input.description]
    );

    // 插入所有部位關聯
    for (const bodyPart of input.bodyParts) {
      await db.runAsync("INSERT INTO exercise_body_parts (exerciseId, bodyPart) VALUES (?, ?)", [
        result.lastInsertRowId,
        bodyPart,
      ]);
    }

    const newExercise: Exercise = {
      id: result.lastInsertRowId,
      name: input.name,
      category: primaryCategory,
      description: input.description,
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    // 更新本地狀態
    setExercises((prev) => [...prev, newExercise].sort((a, b) => a.name.localeCompare(b.name)));
    setExerciseBodyParts((prev) => [
      ...prev,
      ...input.bodyParts.map((bp, idx) => ({
        id: -Date.now() - idx, // 暫時 ID，下次 fetch 會更新
        exerciseId: result.lastInsertRowId,
        bodyPart: bp,
      })),
    ]);

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
      if (input.bodyParts !== undefined && input.bodyParts.length > 0) {
        updates.push("category = ?");
        values.push(input.bodyParts[0]); // 主要分類
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
      }

      // 更新部位關聯
      if (input.bodyParts !== undefined) {
        // 刪除舊的關聯
        await db.runAsync("DELETE FROM exercise_body_parts WHERE exerciseId = ?", [id]);
        // 插入新的關聯
        for (const bodyPart of input.bodyParts) {
          await db.runAsync(
            "INSERT INTO exercise_body_parts (exerciseId, bodyPart) VALUES (?, ?)",
            [id, bodyPart]
          );
        }

        // 更新本地狀態
        setExerciseBodyParts((prev) => {
          const filtered = prev.filter((bp) => bp.exerciseId !== id);
          const newParts = input.bodyParts!.map((bp, idx) => ({
            id: -Date.now() - idx,
            exerciseId: id,
            bodyPart: bp,
          }));
          return [...filtered, ...newParts];
        });
      }

      setExercises((prev) =>
        prev.map((e) =>
          e.id === id
            ? {
                ...e,
                name: input.name ?? e.name,
                category: input.bodyParts?.[0] ?? e.category,
                description: input.description !== undefined ? input.description : e.description,
                isActive: input.isActive !== undefined ? input.isActive : e.isActive,
              }
            : e
        )
      );
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

  // 依部位篩選運動項目
  const getExercisesByBodyPart = useCallback(
    (bodyPart: BodyPartKey | null): Exercise[] => {
      if (!bodyPart) return exercises.filter((e) => e.isActive);

      const exerciseIds = exerciseBodyParts
        .filter((bp) => bp.bodyPart === bodyPart)
        .map((bp) => bp.exerciseId);

      return exercises.filter((e) => e.isActive && exerciseIds.includes(e.id));
    },
    [exercises, exerciseBodyParts]
  );

  // 取得運動項目的所有部位
  const getBodyPartsForExercise = useCallback(
    (exerciseId: number): string[] => {
      return exerciseBodyParts
        .filter((bp) => bp.exerciseId === exerciseId)
        .map((bp) => bp.bodyPart);
    },
    [exerciseBodyParts]
  );

  const filteredExercises = useMemo(
    () => getExercisesByBodyPart(selectedBodyPart),
    [selectedBodyPart, getExercisesByBodyPart]
  );

  return {
    exercises,
    filteredExercises,
    exerciseBodyParts,
    loading,
    error,
    selectedBodyPart,
    setSelectedBodyPart,
    refresh: fetchExercises,
    createExercise,
    updateExercise,
    deleteExercise,
    getExercisesByBodyPart,
    getBodyPartsForExercise,
  };
}
