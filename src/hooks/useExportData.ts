import { useState, useCallback } from "react";
import { getDatabase, WorkoutSession, WorkoutSet, Exercise } from "@/db/client";
import { toLocalDateKey } from "@/utils/date";

// 圖表統計用的資料結構
export interface ExerciseExportStat {
  exerciseId: number;
  exerciseName: string;
  totalSets: number;
  totalReps: number;
}

export interface ExportStats {
  startDate: string;
  endDate: string;
  totalDays: number;
  totalSets: number;
  exerciseStats: ExerciseExportStat[];
}

// 每日明細用的資料結構
export interface DailyDetailItem {
  exerciseName: string;
  sets: number;
  reps: number;
  weight: number | null;
  notes: string | null;
}

export interface DailyDetail {
  date: string;
  dayOfWeek: string;
  items: DailyDetailItem[];
}

export interface ExportData {
  stats: ExportStats;
  dailyDetails: DailyDetail[];
}

const DAY_NAMES = ["日", "一", "二", "三", "四", "五", "六"];

export function useExportData() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExportData = useCallback(
    async (startDate: Date, endDate: Date): Promise<ExportData | null> => {
      try {
        setLoading(true);
        setError(null);

        const db = await getDatabase();

        // 取得所有運動項目
        const exercises = await db.getAllAsync<Exercise>("SELECT * FROM exercises");
        const exerciseMap = new Map(exercises.map((e) => [e.id, e.name]));

        // 設定日期範圍（包含結束日期的整天）
        const startStr = startDate.toISOString();
        const endDateEnd = new Date(endDate);
        endDateEnd.setHours(23, 59, 59, 999);
        const endStr = endDateEnd.toISOString();

        // 查詢時段內的所有 sessions
        const sessions = await db.getAllAsync<WorkoutSession>(
          `SELECT * FROM workout_sessions
           WHERE date >= ? AND date <= ?
           ORDER BY date DESC`,
          [startStr, endStr]
        );

        if (sessions.length === 0) {
          return {
            stats: {
              startDate: toLocalDateKey(startDate),
              endDate: toLocalDateKey(endDate),
              totalDays: 0,
              totalSets: 0,
              exerciseStats: [],
            },
            dailyDetails: [],
          };
        }

        // 取得所有 sets
        const sessionIds = sessions.map((s) => s.id);
        const sets = await db.getAllAsync<WorkoutSet>(
          `SELECT * FROM workout_sets WHERE sessionId IN (${sessionIds.join(",")})`
        );

        // 建立 session -> sets 的對應
        const setsBySession = new Map<number, WorkoutSet[]>();
        for (const set of sets) {
          const existing = setsBySession.get(set.sessionId) || [];
          existing.push(set);
          setsBySession.set(set.sessionId, existing);
        }

        // ===== 計算圖表統計 =====
        const uniqueDays = new Set<string>();
        const exerciseStatsMap = new Map<
          number,
          { exerciseName: string; totalSets: number; totalReps: number }
        >();

        let totalSets = 0;

        for (const session of sessions) {
          const dateKey = toLocalDateKey(session.date);
          uniqueDays.add(dateKey);

          const sessionSets = setsBySession.get(session.id) || [];
          const setCount = sessionSets.length || session.setCount || 0;
          const repsCount =
            sessionSets.reduce((sum, s) => sum + (s.reps || 0), 0) || session.reps || 0;

          totalSets += setCount;

          const existing = exerciseStatsMap.get(session.exerciseId);
          if (existing) {
            existing.totalSets += setCount;
            existing.totalReps += repsCount;
          } else {
            exerciseStatsMap.set(session.exerciseId, {
              exerciseName: exerciseMap.get(session.exerciseId) || "未知項目",
              totalSets: setCount,
              totalReps: repsCount,
            });
          }
        }

        const exerciseStats: ExerciseExportStat[] = Array.from(exerciseStatsMap.entries())
          .map(([exerciseId, data]) => ({
            exerciseId,
            ...data,
          }))
          .sort((a, b) => b.totalSets - a.totalSets);

        // ===== 計算每日明細 =====
        // 依日期分組，再依 exerciseId + weight 分組
        const dailyMap = new Map<
          string,
          {
            date: Date;
            items: Map<
              string,
              {
                exerciseName: string;
                sets: number;
                reps: number;
                weight: number | null;
                notes: string | null;
              }
            >;
          }
        >();

        for (const session of sessions) {
          const dateKey = toLocalDateKey(session.date);
          const sessionSets = setsBySession.get(session.id) || [];

          if (!dailyMap.has(dateKey)) {
            dailyMap.set(dateKey, {
              date: new Date(session.date),
              items: new Map(),
            });
          }

          const dayData = dailyMap.get(dateKey)!;

          // 依據每組的重量分組
          if (sessionSets.length > 0) {
            // 依重量分組
            const weightGroups = new Map<number | null, { sets: number; reps: number }>();
            for (const set of sessionSets) {
              const weight = set.weight;
              const existing = weightGroups.get(weight);
              if (existing) {
                existing.sets += 1;
                existing.reps += set.reps || 0;
              } else {
                weightGroups.set(weight, { sets: 1, reps: set.reps || 0 });
              }
            }

            // 將每個重量組別加入 items
            for (const [weight, data] of weightGroups) {
              const itemKey = `${session.exerciseId}-${weight ?? "null"}`;
              const exerciseName = exerciseMap.get(session.exerciseId) || "未知項目";

              const existingItem = dayData.items.get(itemKey);
              if (existingItem) {
                existingItem.sets += data.sets;
                existingItem.reps += data.reps;
                if (session.notes && !existingItem.notes) {
                  existingItem.notes = session.notes;
                }
              } else {
                dayData.items.set(itemKey, {
                  exerciseName,
                  sets: data.sets,
                  reps: data.reps,
                  weight,
                  notes: session.notes,
                });
              }
            }
          } else {
            // 沒有詳細 sets 資料，使用 session 的 weight
            const weight = session.weight;
            const itemKey = `${session.exerciseId}-${weight ?? "null"}`;
            const exerciseName = exerciseMap.get(session.exerciseId) || "未知項目";

            const existingItem = dayData.items.get(itemKey);
            if (existingItem) {
              existingItem.sets += session.setCount || 1;
              existingItem.reps += session.reps || 0;
              if (session.notes && !existingItem.notes) {
                existingItem.notes = session.notes;
              }
            } else {
              dayData.items.set(itemKey, {
                exerciseName,
                sets: session.setCount || 1,
                reps: session.reps || 0,
                weight,
                notes: session.notes,
              });
            }
          }
        }

        // 轉換為陣列格式
        const dailyDetails: DailyDetail[] = Array.from(dailyMap.entries())
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([dateKey, data]) => {
            const dayIndex = data.date.getDay();
            return {
              date: dateKey,
              dayOfWeek: DAY_NAMES[dayIndex],
              items: Array.from(data.items.values()),
            };
          });

        return {
          stats: {
            startDate: toLocalDateKey(startDate),
            endDate: toLocalDateKey(endDate),
            totalDays: uniqueDays.size,
            totalSets,
            exerciseStats,
          },
          dailyDetails,
        };
      } catch (err) {
        console.error("Error fetching export data:", err);
        setError("載入資料失敗");
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    fetchExportData,
    loading,
    error,
  };
}
