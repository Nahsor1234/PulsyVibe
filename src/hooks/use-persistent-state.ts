'use client';

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

/**
 * Client-only localStorage state with SSR-safe hydration.
 * The initial value is rendered first, then replaced with stored data after mount.
 */
export function usePersistentState<T>(
  key: string,
  initialValue: T | (() => T),
): [T, Dispatch<SetStateAction<T>>, boolean] {
  const [value, setValue] = useState<T>(initialValue);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored !== null) {
        setValue(JSON.parse(stored) as T);
      }
    } catch {
      // Ignore malformed or unavailable localStorage data and keep defaults.
    } finally {
      setHydrated(true);
    }
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage can be unavailable or full; app state should still work in memory.
    }
  }, [key, value, hydrated]);

  return [value, setValue, hydrated];
}
