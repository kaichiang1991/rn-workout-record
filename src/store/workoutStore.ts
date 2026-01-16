import { create } from "zustand";

interface WorkoutState {
  // 當前正在進行的運動紀錄狀態
  currentExerciseId: number | null;
  currentMood: number;
  currentNotes: string;

  // Actions
  setCurrentExercise: (id: number | null) => void;
  setCurrentMood: (mood: number) => void;
  setCurrentNotes: (notes: string) => void;
  resetCurrentWorkout: () => void;
}

export const useWorkoutStore = create<WorkoutState>((set) => ({
  currentExerciseId: null,
  currentMood: 3,
  currentNotes: "",

  setCurrentExercise: (id) => set({ currentExerciseId: id }),
  setCurrentMood: (mood) => set({ currentMood: mood }),
  setCurrentNotes: (notes) => set({ currentNotes: notes }),
  resetCurrentWorkout: () =>
    set({
      currentExerciseId: null,
      currentMood: 3,
      currentNotes: "",
    }),
}));
