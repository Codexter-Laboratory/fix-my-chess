import { Platform } from 'react-native';
import type { StateStorage } from 'zustand/middleware';

/**
 * Platform-aware storage adapter for Zustand persist.
 *
 * Web  → IndexedDB via idb-keyval  (virtually unlimited quota)
 * Native → localStorage fallback   (sufficient for insights-only payload)
 */
export function createPlatformStorage(): StateStorage {
  if (Platform.OS === 'web') {
    return createIndexedDBStorage();
  }
  return createLocalStorage();
}

// ---------------------------------------------------------------------------
// IndexedDB (web) — async, large quota
// ---------------------------------------------------------------------------

function createIndexedDBStorage(): StateStorage {
  let idbModule: typeof import('idb-keyval') | null = null;
  let loadPromise: Promise<typeof import('idb-keyval')> | null = null;

  function getIdb(): Promise<typeof import('idb-keyval')> {
    if (idbModule) return Promise.resolve(idbModule);
    if (!loadPromise) {
      loadPromise = import('idb-keyval').then((mod) => {
        idbModule = mod;
        return mod;
      });
    }
    return loadPromise;
  }

  return {
    getItem: async (name: string): Promise<string | null> => {
      const idb = await getIdb();
      const value = await idb.get<string>(name);
      return value ?? null;
    },
    setItem: async (name: string, value: string): Promise<void> => {
      const idb = await getIdb();
      await idb.set(name, value);
    },
    removeItem: async (name: string): Promise<void> => {
      const idb = await getIdb();
      await idb.del(name);
    },
  };
}

// ---------------------------------------------------------------------------
// localStorage (native fallback) — sync, 5 MB typical
// ---------------------------------------------------------------------------

function createLocalStorage(): StateStorage {
  return {
    getItem: (name: string): string | null => {
      try {
        return localStorage.getItem(name);
      } catch {
        return null;
      }
    },
    setItem: (name: string, value: string): void => {
      try {
        localStorage.setItem(name, value);
      } catch {
        // Silently fail if storage is unavailable on native
      }
    },
    removeItem: (name: string): void => {
      try {
        localStorage.removeItem(name);
      } catch {
        // Silently fail
      }
    },
  };
}
