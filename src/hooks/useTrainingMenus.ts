import { useState, useEffect, useCallback } from "react";
import { getDatabase, TrainingMenu, TrainingMenuItem } from "@/db/client";

interface CreateMenuInput {
  name: string;
  description?: string | null;
}

interface UpdateMenuInput {
  name?: string;
  description?: string | null;
}

export interface MenuItemWithExercise extends TrainingMenuItem {
  exerciseName: string;
}

export function useTrainingMenus() {
  const [menus, setMenus] = useState<TrainingMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMenus = useCallback(async () => {
    try {
      setLoading(true);
      const db = await getDatabase();
      const results = await db.getAllAsync<TrainingMenu>(
        "SELECT id, name, description, createdAt FROM training_menus ORDER BY createdAt DESC"
      );
      setMenus(results);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMenus();
  }, [fetchMenus]);

  const createMenu = useCallback(async (input: CreateMenuInput): Promise<TrainingMenu> => {
    const db = await getDatabase();
    const result = await db.runAsync(
      "INSERT INTO training_menus (name, description) VALUES (?, ?)",
      [input.name, input.description || null]
    );

    const newMenu: TrainingMenu = {
      id: result.lastInsertRowId,
      name: input.name,
      description: input.description || null,
      createdAt: new Date().toISOString(),
    };

    setMenus((prev) => [newMenu, ...prev]);
    return newMenu;
  }, []);

  const updateMenu = useCallback(async (id: number, input: UpdateMenuInput): Promise<void> => {
    const db = await getDatabase();
    const updates: string[] = [];
    const values: (string | null)[] = [];

    if (input.name !== undefined) {
      updates.push("name = ?");
      values.push(input.name);
    }
    if (input.description !== undefined) {
      updates.push("description = ?");
      values.push(input.description);
    }

    if (updates.length > 0) {
      values.push(id.toString());
      await db.runAsync(`UPDATE training_menus SET ${updates.join(", ")} WHERE id = ?`, values);
    }

    setMenus((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              name: input.name ?? m.name,
              description: input.description !== undefined ? input.description : m.description,
            }
          : m
      )
    );
  }, []);

  const deleteMenu = useCallback(async (id: number): Promise<void> => {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM training_menus WHERE id = ?", [id]);
    setMenus((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const getMenuItems = useCallback(async (menuId: number): Promise<MenuItemWithExercise[]> => {
    const db = await getDatabase();
    const results = await db.getAllAsync<MenuItemWithExercise>(
      `SELECT
        tmi.id, tmi.menuId, tmi.exerciseId, tmi.sortOrder,
        e.name as exerciseName
       FROM training_menu_items tmi
       JOIN exercises e ON tmi.exerciseId = e.id
       WHERE tmi.menuId = ?
       ORDER BY tmi.sortOrder ASC`,
      [menuId]
    );
    return results;
  }, []);

  const addMenuItem = useCallback(
    async (menuId: number, exerciseId: number): Promise<TrainingMenuItem> => {
      const db = await getDatabase();

      // 取得目前最大的 sortOrder
      const maxResult = await db.getFirstAsync<{ maxOrder: number | null }>(
        "SELECT MAX(sortOrder) as maxOrder FROM training_menu_items WHERE menuId = ?",
        [menuId]
      );
      const nextOrder = (maxResult?.maxOrder ?? -1) + 1;

      const result = await db.runAsync(
        "INSERT INTO training_menu_items (menuId, exerciseId, sortOrder) VALUES (?, ?, ?)",
        [menuId, exerciseId, nextOrder]
      );

      return {
        id: result.lastInsertRowId,
        menuId,
        exerciseId,
        sortOrder: nextOrder,
      };
    },
    []
  );

  const removeMenuItem = useCallback(async (itemId: number): Promise<void> => {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM training_menu_items WHERE id = ?", [itemId]);
  }, []);

  const updateMenuItemsOrder = useCallback(
    async (menuId: number, items: { id: number; sortOrder: number }[]): Promise<void> => {
      const db = await getDatabase();
      for (const item of items) {
        await db.runAsync("UPDATE training_menu_items SET sortOrder = ? WHERE id = ?", [
          item.sortOrder,
          item.id,
        ]);
      }
    },
    []
  );

  const getMenuItemCount = useCallback(async (menuId: number): Promise<number> => {
    const db = await getDatabase();
    const result = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM training_menu_items WHERE menuId = ?",
      [menuId]
    );
    return result?.count ?? 0;
  }, []);

  return {
    menus,
    loading,
    error,
    refresh: fetchMenus,
    createMenu,
    updateMenu,
    deleteMenu,
    getMenuItems,
    addMenuItem,
    removeMenuItem,
    updateMenuItemsOrder,
    getMenuItemCount,
  };
}
