'use client';

import { useState, useEffect } from 'react';
import { ColumnConfig } from '@/lib/types';

const STORAGE_KEY_PREFIX = 'analytics-columns-';

export function useColumnConfig(
  panelKey: string,
  defaultColumns: ColumnConfig[]
): [ColumnConfig[], (key: string, visible: boolean) => void] {
  const [columns, setColumns] = useState<ColumnConfig[]>(defaultColumns);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY_PREFIX + panelKey);
    if (stored) {
      try {
        const parsed: Record<string, boolean> = JSON.parse(stored);
        setColumns((prev) =>
          prev.map((col) => ({
            ...col,
            visible: parsed[col.key] !== undefined ? parsed[col.key] : col.visible,
          }))
        );
      } catch {
        // ignore invalid stored data
      }
    }
  }, [panelKey]);

  const toggleColumn = (key: string, visible: boolean) => {
    setColumns((prev) => {
      const updated = prev.map((col) =>
        col.key === key ? { ...col, visible } : col
      );
      const visibilityMap: Record<string, boolean> = {};
      updated.forEach((col) => {
        visibilityMap[col.key] = col.visible;
      });
      localStorage.setItem(
        STORAGE_KEY_PREFIX + panelKey,
        JSON.stringify(visibilityMap)
      );
      return updated;
    });
  };

  return [columns, toggleColumn];
}
