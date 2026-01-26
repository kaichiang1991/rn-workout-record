import { useState, useEffect, useCallback } from "react";
import { getDatabase } from "@/db/client";
import { BODY_PARTS, BodyPartKey } from "@/utils/constants";
import { toLocalDateKey } from "@/utils/date";

export interface BodyPartStat {
  bodyPart: BodyPartKey;
  label: string;
  trainingDays: number;
  color: string;
}

interface UseBodyPartDistributionResult {
  data: BodyPartStat[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useBodyPartDistribution(): UseBodyPartDistributionResult {
  const [data, setData] = useState<BodyPartStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const db = await getDatabase();

      // 計算 4 週前的日期（使用 GMT+8 時區）
      const fourWeeksAgo = new Date();
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
      const startDate = toLocalDateKey(fourWeeksAgo);

      // 查詢近 4 週每個身體部位的訓練天數
      const results = await db.getAllAsync<{ bodyPart: string; trainingDays: number }>(
        `SELECT
           ebp.bodyPart,
           COUNT(DISTINCT DATE(ws.date)) as trainingDays
         FROM workout_sessions ws
         JOIN exercise_body_parts ebp ON ws.exerciseId = ebp.exerciseId
         WHERE DATE(ws.date) >= ?
         GROUP BY ebp.bodyPart`,
        [startDate]
      );

      // 建立完整的資料陣列（包含沒有訓練的部位）
      const statsMap = new Map<string, number>();
      for (const result of results) {
        statsMap.set(result.bodyPart, result.trainingDays);
      }

      const allStats: BodyPartStat[] = Object.entries(BODY_PARTS).map(([key, value]) => ({
        bodyPart: key as BodyPartKey,
        label: value.label,
        trainingDays: statsMap.get(key) || 0,
        color: value.color,
      }));

      setData(allStats);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, []);

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
