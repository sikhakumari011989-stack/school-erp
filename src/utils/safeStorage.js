/**
 * SAFE STORAGE UTILITY FOR RESTRICTED MOBILE & BROWSER ENVIRONMENTS
 * 
 * In restricted mobile browsers (e.g. Safari Private Mode, embedded WebViews,
 * sandboxed iframes, or when third-party cookies/site-data are blocked),
 * accessing `window.localStorage` directly throws a fatal:
 * `SecurityError: Failed to read the 'localStorage' property from 'Window': Access is denied for this document`.
 * 
 * This module provides:
 * 1. An in-memory Map-backed Storage implementation as fallback.
 * 2. Try-catch wrapped safeStorage and safeSession interfaces.
 * 3. An automatic window-level polyfill/patch that prevents `window.localStorage`
 *    and `window.sessionStorage` access from throwing SecurityError.
 * 4. Helper getJSON and setJSON methods.
 */

class MemoryStorage {
  constructor() {
    this._store = new Map();
  }

  getItem(key) {
    const val = this._store.get(String(key));
    return val !== undefined ? String(val) : null;
  }

  setItem(key, value) {
    this._store.set(String(key), String(value));
  }

  removeItem(key) {
    this._store.delete(String(key));
  }

  clear() {
    this._store.clear();
  }

  key(index) {
    const keys = Array.from(this._store.keys());
    return keys[index] || null;
  }

  get length() {
    return this._store.size;
  }
}

// Fallback in-memory stores
const fallbackLocalStorage = new MemoryStorage();
const fallbackSessionStorage = new MemoryStorage();

/**
 * Tests whether standard browser storage is accessible and functional
 */
function isStorageAccessible(type) {
  if (typeof window === "undefined") return false;
  try {
    const storage = window[type];
    if (!storage) return false;
    const testKey = `__erp_storage_probe_${Date.now()}__`;
    storage.setItem(testKey, "1");
    const retrieved = storage.getItem(testKey);
    storage.removeItem(testKey);
    return retrieved === "1";
  } catch {
    return false;
  }
}

const isLocalAccessible = isStorageAccessible("localStorage");
const isSessionAccessible = isStorageAccessible("sessionStorage");

/**
 * Creates a guarded storage wrapper that delegates to real storage if accessible,
 * falling back seamlessly to MemoryStorage if restricted or on error.
 */
function createSafeStorageWrapper(type, fallbackStore) {
  const isAccessible = type === "localStorage" ? isLocalAccessible : isSessionAccessible;

  return {
    getItem(key) {
      if (typeof window === "undefined") {
        return fallbackStore.getItem(key);
      }
      try {
        if (isAccessible && window[type]) {
          return window[type].getItem(key);
        }
      } catch (err) {
        console.warn(`[SafeStorage] ${type}.getItem('${key}') failed; using fallback:`, err?.message);
      }
      return fallbackStore.getItem(key);
    },

    setItem(key, value) {
      const strVal = String(value);
      fallbackStore.setItem(key, strVal); // Always keep fallback in sync

      if (typeof window === "undefined") return;

      try {
        if (isAccessible && window[type]) {
          window[type].setItem(key, strVal);
        }
      } catch (err) {
        console.warn(`[SafeStorage] ${type}.setItem('${key}') failed; persisting to in-memory fallback only:`, err?.message);
      }
    },

    removeItem(key) {
      fallbackStore.removeItem(key);

      if (typeof window === "undefined") return;

      try {
        if (isAccessible && window[type]) {
          window[type].removeItem(key);
        }
      } catch (err) {
        console.warn(`[SafeStorage] ${type}.removeItem('${key}') failed:`, err?.message);
      }
    },

    clear() {
      fallbackStore.clear();

      if (typeof window === "undefined") return;

      try {
        if (isAccessible && window[type]) {
          window[type].clear();
        }
      } catch (err) {
        console.warn(`[SafeStorage] ${type}.clear() failed:`, err?.message);
      }
    },

    key(index) {
      if (typeof window === "undefined") return fallbackStore.key(index);
      try {
        if (isAccessible && window[type]) {
          return window[type].key(index);
        }
      } catch {
        // Fall back
      }
      return fallbackStore.key(index);
    },

    get length() {
      if (typeof window === "undefined") return fallbackStore.length;
      try {
        if (isAccessible && window[type]) {
          return window[type].length;
        }
      } catch {
        // Fall back
      }
      return fallbackStore.length;
    },

    // Convenience helpers
    getJSON(key, defaultValue = null) {
      try {
        const item = this.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      } catch {
        return defaultValue;
      }
    },

    setJSON(key, value) {
      try {
        this.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },

    isRestricted() {
      return !isAccessible;
    },
  };
}

export const safeStorage = createSafeStorageWrapper("localStorage", fallbackLocalStorage);
export const safeSession = createSafeStorageWrapper("sessionStorage", fallbackSessionStorage);

/**
 * Early Window Polyfill:
 * Patches window.localStorage and window.sessionStorage getters if accessing them
 * throws SecurityError in restricted mobile browsers.
 */
export function installStorageProtection() {
  if (typeof window === "undefined") return;

  // Test if accessing window.localStorage throws SecurityError
  let needsLocalPolyfill = false;
  try {
    const test = window.localStorage;
    if (!test) needsLocalPolyfill = true;
  } catch {
    needsLocalPolyfill = true;
  }

  if (needsLocalPolyfill) {
    try {
      Object.defineProperty(window, "localStorage", {
        get: () => safeStorage,
        configurable: true,
        enumerable: true,
      });
      console.info("[SafeStorage] Installed safe window.localStorage polyfill for restricted browser environment.");
    } catch (e) {
      console.warn("[SafeStorage] Could not override window.localStorage:", e?.message);
    }
  }

  // Test if accessing window.sessionStorage throws SecurityError
  let needsSessionPolyfill = false;
  try {
    const test = window.sessionStorage;
    if (!test) needsSessionPolyfill = true;
  } catch {
    needsSessionPolyfill = true;
  }

  if (needsSessionPolyfill) {
    try {
      Object.defineProperty(window, "sessionStorage", {
        get: () => safeSession,
        configurable: true,
        enumerable: true,
      });
      console.info("[SafeStorage] Installed safe window.sessionStorage polyfill for restricted browser environment.");
    } catch (e) {
      console.warn("[SafeStorage] Could not override window.sessionStorage:", e?.message);
    }
  }
}

// Automatically execute early patch on module load
installStorageProtection();

export default safeStorage;
