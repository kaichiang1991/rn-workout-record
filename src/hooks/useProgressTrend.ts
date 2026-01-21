import { useState, useCallback, useEffect } from "react";
import { getDatabase, WorkoutSession, WorkoutSet } from "@/db/client";

export interface ProgressDataPoint {
  date: string;
  maxWeight: number;
  volume: number;
  estimated1RM: number;
}

interface UseProgressTrendParams {
  exerciseId: number;
  startDate: string;
  endDate: string;
}

interface UseProgressTrendResult {
  data: ProgressDataPoint[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useProgressTrend({
  exerciseId,
  startDate,
  endDate,
}: UseProgressTrendParams): UseProgressTrendResult {
  const [data, setData] = useState<ProgressDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!exerciseId || !startDate || !endDate) return;

    setIsLoading(true);
    setError(null);

    try {
      const db = await getDatabase();

      // 查詢指定日期範圍內的 sessions
      const sessions = await db.getAllAsync<WorkoutSession>(
        `SELECT * FROM workout_sessions
         WHERE exerciseId = ? AND date >= ? AND date <= ?
         ORDER BY date ASC`,
        [exerciseId, startDate, endDate]
      );

      const dataPoints: ProgressDataPoint[] = [];

      for (const session of sessions) {
        // 取得該 session 的所有 sets
        const sets = await db.getAllAsync<WorkoutSet>(
          "SELECT * FROM workout_sets WHERE sessionId = ?",
          [session.id]
        );

        // 計算指標
        let maxWeight = session.weight || 0;
        let totalVolume = 0;
        let bestEstimated1RM = 0;

        if (sets.length > 0) {
          for (const set of sets) {
            const weight = set.weight || 0;
            const reps = set.reps || 0;

            if (weight > maxWeight) maxWeight = weight;
            totalVolume += weight * reps;

            // Epley 公式計算 1RM
            if (weight > 0 && reps > 0) {
              const estimated1RM = weight * (1 + reps / 30);
              if (estimated1RM > bestEstimated1RM) bestEstimated1RM = estimated1RM;
            }
          }
        } else {
          // 沒有 sets 資料時，使用 session 的資料
          const weight = session.weight || 0;
          const reps = session.reps || 0;
          const setCount = session.setCount || 1;
          totalVolume = weight * reps * setCount;
          if (weight > 0 && reps > 0) {
            bestEstimated1RM = weight * (1 + reps / 30);
          }
        }

        dataPoints.push({
          date: session.date.split("T")[0],
          maxWeight,
          volume: totalVolume,
          estimated1RM: Math.round(bestEstimated1RM * 10) / 10,
        });
      }

      setData(dataPoints);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, [exerciseId, startDate, endDate]);

  // 初始載入和參數變更時重新載入
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
}
