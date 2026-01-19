import { useState, useCallback, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY_PREFIX = "menu_session_";

interface SessionRecord {
  exerciseId: number;
  sessionIds: number[];
}

interface MenuSessionProgress {
  menuId: number;
  startedAt: string;
  records: SessionRecord[];
}

interface UseMenuSessionOptions {
  menuId: number;
}

export function useMenuSession({ menuId }: UseMenuSessionOptions) {
  const [progress, setProgress] = useState<MenuSessionProgress | null>(null);
  const [loading, setLoading] = useState(true);

  const storageKey = `${STORAGE_KEY_PREFIX}${menuId}`;

  // 載入進度
  const loadProgress = useCallback(async () => {
    try {
      setLoading(true);
      const stored = await AsyncStorage.getItem(storageKey);
      if (stored) {
        setProgress(JSON.parse(stored));
      } else {
        setProgress(null);
      }
    } finally {
      setLoading(false);
    }
  }, [storageKey]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  // 開始新訓練
  const startSession = useCallback(async () => {
    const newProgress: MenuSessionProgress = {
      menuId,
      startedAt: new Date().toISOString(),
      records: [],
    };
    await AsyncStorage.setItem(storageKey, JSON.stringify(newProgress));
    setProgress(newProgress);
    return newProgress;
  }, [menuId, storageKey]);

  // 記錄完成的項目
  const recordExercise = useCallback(
    async (exerciseId: number, sessionId: number) => {
      if (!progress) return;

      const existingRecord = progress.records.find((r) => r.exerciseId === exerciseId);
      let updatedRecords: SessionRecord[];

      if (existingRecord) {
        updatedRecords = progress.records.map((r) =>
          r.exerciseId === exerciseId ? { ...r, sessionIds: [...r.sessionIds, sessionId] } : r
        );
      } else {
        updatedRecords = [...progress.records, { exerciseId, sessionIds: [sessionId] }];
      }

      const updatedProgress: MenuSessionProgress = {
        ...progress,
        records: updatedRecords,
      };

      await AsyncStorage.setItem(storageKey, JSON.stringify(updatedProgress));
      setProgress(updatedProgress);
    },
    [progress, storageKey]
  );

  // 檢查項目是否已完成
  const isExerciseCompleted = useCallback(
    (exerciseId: number): boolean => {
      if (!progress) return false;
      return progress.records.some((r) => r.exerciseId === exerciseId);
    },
    [progress]
  );

  // 取得項目的 session IDs
  const getExerciseSessionIds = useCallback(
    (exerciseId: number): number[] => {
      if (!progress) return [];
      const record = progress.records.find((r) => r.exerciseId === exerciseId);
      return record?.sessionIds || [];
    },
    [progress]
  );

  // 清除進度
  const clearProgress = useCallback(async () => {
    await AsyncStorage.removeItem(storageKey);
    setProgress(null);
  }, [storageKey]);

  // 取得完成數量
  const completedCount = progress?.records.length || 0;

  // 取得開始時間
  const startedAt = progress?.startedAt || null;

  // 是否有進行中的訓練
  const hasActiveSession = progress !== null;

  return {
    loading,
    progress,
    hasActiveSession,
    completedCount,
    startedAt,
    startSession,
    recordExercise,
    isExerciseCompleted,
    getExerciseSessionIds,
    clearProgress,
    refresh: loadProgress,
  };
}
