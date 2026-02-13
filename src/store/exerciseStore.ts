import { create } from "zustand";
import { getDatabase, Exercise, ExerciseBodyPart } from "@/db/client";
import { BodyPartKey } from "@/utils/constants";

interface CreateExerciseInput {
  name: string;
  bodyParts: string[];
  description: string | null;
}

interface UpdateExerciseInput {
  name?: string;
  bodyParts?: string[];
  description?: string | null;
  isActive?: boolean;
}

interface ExerciseStore {
  exercises: Exercise[];
  exerciseBodyParts: ExerciseBodyPart[];
  loading: boolean;
  error: Error | null;

  fetchExercises: () => Promise<void>;
  createExercise: (input: CreateExerciseInput) => Promise<Exercise>;
  updateExercise: (id: number, input: UpdateExerciseInput) => Promise<void>;
  deleteExercise: (id: number) => Promise<void>;
  getExercisesByBodyPart: (bodyPart: BodyPartKey | null) => Exercise[];
  getBodyPartsForExercise: (exerciseId: number) => string[];
}

export const useExerciseStore = create<ExerciseStore>((set, get) => ({
  exercises: [],
  exerciseBodyParts: [],
  loading: true,
  error: null,

  fetchExercises: async () => {
    try {
      set({ loading: true });
      const db = await getDatabase();
      const results = await db.getAllAsync<Exercise>(
        "SELECT id, name, description, createdAt, isActive FROM exercises ORDER BY name ASC"
      );
      const mappedResults = results.map((r) => ({
        ...r,
        isActive: Boolean(r.isActive),
      }));
      const bodyParts = await db.getAllAsync<ExerciseBodyPart>("SELECT * FROM exercise_body_parts");
      set({
        exercises: mappedResults,
        exerciseBodyParts: bodyParts,
        error: null,
      });
    } catch (err) {
      set({ error: err instanceof Error ? err : new Error("Unknown error") });
    } finally {
      set({ loading: false });
    }
  },

  createExercise: async (input) => {
    const db = await getDatabase();
    const result = await db.runAsync(
      "INSERT INTO exercises (name, description, isActive) VALUES (?, ?, 1)",
      [input.name, input.description]
    );
    for (const bodyPart of input.bodyParts) {
      await db.runAsync("INSERT INTO exercise_body_parts (exerciseId, bodyPart) VALUES (?, ?)", [
        result.lastInsertRowId,
        bodyPart,
      ]);
    }
    const newExercise: Exercise = {
      id: result.lastInsertRowId,
      name: input.name,
      description: input.description,
      createdAt: new Date().toISOString(),
      isActive: true,
    };
    set((state) => ({
      exercises: [...state.exercises, newExercise].sort((a, b) => a.name.localeCompare(b.name)),
      exerciseBodyParts: [
        ...state.exerciseBodyParts,
        ...input.bodyParts.map((bp, idx) => ({
          id: -Date.now() - idx,
          exerciseId: result.lastInsertRowId,
          bodyPart: bp,
        })),
      ],
    }));
    return newExercise;
  },

  updateExercise: async (id, input) => {
    const db = await getDatabase();
    const updates: string[] = [];
    const values: (string | number | null)[] = [];
    if (input.name !== undefined) {
      updates.push("name = ?");
      values.push(input.name);
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
    if (input.bodyParts !== undefined) {
      await db.runAsync("DELETE FROM exercise_body_parts WHERE exerciseId = ?", [id]);
      for (const bodyPart of input.bodyParts) {
        await db.runAsync("INSERT INTO exercise_body_parts (exerciseId, bodyPart) VALUES (?, ?)", [
          id,
          bodyPart,
        ]);
      }
      set((state) => ({
        exerciseBodyParts: [
          ...state.exerciseBodyParts.filter((bp) => bp.exerciseId !== id),
          ...input.bodyParts!.map((bp, idx) => ({
            id: -Date.now() - idx,
            exerciseId: id,
            bodyPart: bp,
          })),
        ],
      }));
    }
    set((state) => ({
      exercises: state.exercises.map((e) =>
        e.id === id
          ? {
              ...e,
              name: input.name ?? e.name,
              description: input.description !== undefined ? input.description : e.description,
              isActive: input.isActive !== undefined ? input.isActive : e.isActive,
            }
          : e
      ),
    }));
  },

  deleteExercise: async (id) => {
    const db = await getDatabase();
    await db.runAsync(
      "DELETE FROM workout_sets WHERE sessionId IN (SELECT id FROM workout_sessions WHERE exerciseId = ?)",
      [id]
    );
    await db.runAsync("DELETE FROM workout_sessions WHERE exerciseId = ?", [id]);
    await db.runAsync("DELETE FROM exercises WHERE id = ?", [id]);
    set((state) => ({
      exercises: state.exercises.filter((e) => e.id !== id),
      exerciseBodyParts: state.exerciseBodyParts.filter((bp) => bp.exerciseId !== id),
    }));
  },

  getExercisesByBodyPart: (bodyPart) => {
    const { exercises, exerciseBodyParts } = get();
    if (!bodyPart) return exercises.filter((e) => e.isActive);
    const exerciseIds = exerciseBodyParts
      .filter((bp) => bp.bodyPart === bodyPart)
      .map((bp) => bp.exerciseId);
    return exercises.filter((e) => e.isActive && exerciseIds.includes(e.id));
  },

  getBodyPartsForExercise: (exerciseId) => {
    return get()
      .exerciseBodyParts.filter((bp) => bp.exerciseId === exerciseId)
      .map((bp) => bp.bodyPart);
  },
}));
