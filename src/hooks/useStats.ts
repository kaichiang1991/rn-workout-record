import { useState, useEffect, useCallback } from "react";
import { getDatabase, WorkoutSession, WorkoutSet } from "@/db/client";

interface ExerciseProgress {
  date: string;
  maxWeight: number;
  totalReps: number;
  totalSets: number;
}

interface WeekDayStatus {
  day: string; // "日", "一", "二" 等
  date: string; // YYYY-MM-DD 格式
  hasWorkout: boolean;
  isToday: boolean;
}

interface Stats {
  thisWeekCount: number;
  thisMonthCount: number;
  totalCount: number;
  averageDifficulty: number;
  difficultyDistribution: number[];
  weeklyWorkouts: { day: string; count: number }[];
  weeklyStatus: WeekDayStatus[];
}

export function useStats() {
  const [stats, setStats] = useState<Stats>({
    thisWeekCount: 0,
    thisMonthCount: 0,
    totalCount: 0,
    averageDifficulty: 0,
    difficultyDistribution: [0, 0, 0, 0, 0],
    weeklyWorkouts: [],
    weeklyStatus: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const db = await getDatabase();

      // 取得所有 sessions
      const sessions = await db.getAllAsync<WorkoutSession>(
        "SELECT * FROM workout_sessions ORDER BY date DESC"
      );

      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const thisWeekDays = new Set<string>();
      const thisMonthDays = new Set<string>();
      const totalDays = new Set<string>();
      let totalDifficulty = 0;
      let difficultyCount = 0;
      const difficultyDistribution = [0, 0, 0, 0, 0];
      const dailyCount: Record<string, number> = {};

      for (const session of sessions) {
        const sessionDate = new Date(session.date);
        // 使用 YYYY-MM-DD 格式作為日期的唯一識別
        const dateKey = session.date.split("T")[0];
        totalDays.add(dateKey);

        if (sessionDate >= weekStart) {
          thisWeekDays.add(dateKey);

          // 統計每天運動次數（本週）
          const dayKey = sessionDate.toLocaleDateString("zh-TW", { weekday: "short" });
          dailyCount[dayKey] = (dailyCount[dayKey] || 0) + 1;
        }

        if (sessionDate >= monthStart) {
          thisMonthDays.add(dateKey);
        }

        if (session.difficulty) {
          totalDifficulty += session.difficulty;
          difficultyCount++;
          difficultyDistribution[session.difficulty - 1]++;
        }
      }

      // 建立一週的數據
      const days = ["日", "一", "二", "三", "四", "五", "六"];
      const weeklyWorkouts = days.map((day) => ({
        day,
        count: dailyCount[`週${day}`] || 0,
      }));

      // 建立本週每日狀態（週日到週六）
      const todayStr = now.toISOString().split("T")[0];
      const weeklyStatus: WeekDayStatus[] = days.map((day, index) => {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + index);
        const dateStr = date.toISOString().split("T")[0];
        return {
          day,
          date: dateStr,
          hasWorkout: thisWeekDays.has(dateStr),
          isToday: dateStr === todayStr,
        };
      });

      setStats({
        thisWeekCount: thisWeekDays.size,
        thisMonthCount: thisMonthDays.size,
        totalCount: totalDays.size,
        averageDifficulty: difficultyCount > 0 ? totalDifficulty / difficultyCount : 0,
        difficultyDistribution,
        weeklyWorkouts,
        weeklyStatus,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const getExerciseProgress = useCallback(
    async (exerciseId: number, limit = 10): Promise<ExerciseProgress[]> => {
      const db = await getDatabase();

      const sessions = await db.getAllAsync<WorkoutSession>(
        "SELECT * FROM workout_sessions WHERE exerciseId = ? ORDER BY date DESC LIMIT ?",
        [exerciseId, limit]
      );

      const progress: ExerciseProgress[] = [];

      for (const session of sessions) {
        const sets = await db.getAllAsync<WorkoutSet>(
          "SELECT * FROM workout_sets WHERE sessionId = ?",
          [session.id]
        );

        const maxWeight = Math.max(...sets.map((s) => s.weight || 0), 0);
        const totalReps = sets.reduce((sum, s) => sum + (s.reps || 0), 0);

        progress.push({
          date: session.date,
          maxWeight,
          totalReps,
          totalSets: sets.length,
        });
      }

      return progress.reverse(); // 從舊到新
    },
    []
  );

  return {
    stats,
    loading,
    refresh: fetchStats,
    getExerciseProgress,
  };
}
