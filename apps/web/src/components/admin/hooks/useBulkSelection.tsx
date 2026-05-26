"use client";

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY_PREFIX = 'robohatch-admin-selection-';

export function useBulkSelection(initialIds: string[] = [], persistenceKey?: string) {
  const storageKey = persistenceKey ? STORAGE_KEY_PREFIX + persistenceKey : null;
  const [selectedMap, setSelectedMap] = useState<Record<string, boolean>>(() => {
    try {
      if (storageKey) {
        const raw = window.localStorage.getItem(storageKey);
        if (raw) return JSON.parse(raw);
      }
    } catch (e) {
      // ignore
    }

    const map: Record<string, boolean> = {};
    initialIds.forEach((id) => (map[id] = false));
    return map;
  });

  useEffect(() => {
    if (!storageKey) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(selectedMap));
    } catch (e) {
      // ignore
    }
  }, [selectedMap, storageKey]);

  const toggle = useCallback((id: string, value?: boolean) => {
    setSelectedMap((s) => ({ ...s, [id]: typeof value === 'boolean' ? value : !s[id] }));
  }, []);

  const setAll = useCallback((ids: string[], checked: boolean) => {
    setSelectedMap((s) => {
      const next = { ...s };
      ids.forEach((id) => (next[id] = checked));
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelectedMap({}), []);

  const selectedCount = Object.values(selectedMap).filter(Boolean).length;

  return {
    selectedMap,
    toggle,
    setAll,
    clear,
    selectedCount,
  } as const;
}

export default useBulkSelection;
