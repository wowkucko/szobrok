"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "artisanprints-bookmarks";

type Listener = () => void;
const listeners = new Set<Listener>();

// Stabil referencia a szerver-oldali snapshotnak — különben React
// "getServerSnapshot should be cached" végtelen ciklust jelez.
const SERVER_SNAPSHOT: string[] = [];

let cached: string[] | null = null;

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) {
      return parsed.filter((x): x is string => typeof x === "string");
    }
    return [];
  } catch {
    // sérült vagy nem elérhető tároló — üres listával folytatjuk
    return [];
  }
}

function getSnapshot(): string[] {
  if (cached === null) cached = read();
  return cached;
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function update(mutator: (prev: string[]) => string[]) {
  const next = mutator(getSnapshot());
  cached = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // privát módban előfordulhat, hogy nem írható
  }
  listeners.forEach((l) => l());
}

/**
 * Kedvencek / könyvjelzők kezelése localStorage-ban.
 * useSyncExternalStore: a szerver oldali snapshot üres, így nincs
 * hydration eltérés, a kliens oldalon viszont azonnal frissül.
 */
export function useBookmarks() {
  const bookmarks = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => SERVER_SNAPSHOT
  );

  const toggleBookmark = useCallback((id: string) => {
    update((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  }, []);

  const isBookmarked = useCallback(
    (id: string) => bookmarks.includes(id),
    [bookmarks]
  );

  return { bookmarks, toggleBookmark, isBookmarked };
}
