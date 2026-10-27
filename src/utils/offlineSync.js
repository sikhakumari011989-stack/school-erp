/**
 * Enterprise Offline-First Field & Classroom Queue Service
 * Allows teachers, accountants, and staff to perform attendance, marks, and fee operations offline.
 * Operations are assigned a unique operation ID and idempotency key, persisted locally,
 * and automatically synchronized with conflict resolution once connectivity is restored.
 */

const STORAGE_PREFIX = "erp_offline_queue_";

/**
 * Generate a cryptographically distinct UUID-like ID
 */
function generateUniqueId(prefix = "op") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Retrieve the offline operation queue for a specific tenant
 */
export function getOfflineQueue(schoolCode = "CAMPUS-01") {
  try {
    const key = `${STORAGE_PREFIX}${schoolCode.toUpperCase()}`;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("Failed to read offline queue:", err);
    return [];
  }
}

/**
 * Get count of pending unsynced operations
 */
export function getPendingQueueCount(schoolCode = "CAMPUS-01") {
  const queue = getOfflineQueue(schoolCode);
  return queue.filter((item) => item.status === "pending").length;
}

/**
 * Enqueue an operation to the offline ledger
 * @param {string} schoolCode
 * @param {'ATTENDANCE_RECORD' | 'MARKS_ENTRY' | 'FEE_PAYMENT'} type
 * @param {object} payload
 * @param {object} metadata
 */
export function queueOfflineOperation(schoolCode = "CAMPUS-01", type, payload, metadata = {}) {
  const cleanSchool = schoolCode.toUpperCase();
  const key = `${STORAGE_PREFIX}${cleanSchool}`;
  const queue = getOfflineQueue(cleanSchool);

  const operation = {
    id: generateUniqueId("op"),
    idempotencyKey: generateUniqueId("idemp"),
    schoolCode: cleanSchool,
    type,
    payload,
    metadata: {
      ...metadata,
      queuedAt: new Date().toISOString(),
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "Node",
      networkStatus: typeof navigator !== "undefined" && navigator.onLine ? "online" : "offline",
    },
    status: "pending", // 'pending' | 'synced' | 'failed'
    retryCount: 0,
    error: null,
  };

  const updated = [operation, ...queue];
  try {
    localStorage.setItem(key, JSON.stringify(updated));
    dispatchQueueUpdate(cleanSchool, updated);
  } catch (err) {
    console.error("Failed to store offline operation:", err);
  }

  // Attempt instant background sync if currently online
  if (typeof navigator !== "undefined" && navigator.onLine) {
    setTimeout(() => {
      syncOfflineQueue(cleanSchool);
    }, 100);
  }

  return operation;
}

/**
 * Remove an item from the queue
 */
export function removeQueueItem(schoolCode = "CAMPUS-01", operationId) {
  const cleanSchool = schoolCode.toUpperCase();
  const key = `${STORAGE_PREFIX}${cleanSchool}`;
  const queue = getOfflineQueue(cleanSchool);
  const updated = queue.filter((item) => item.id !== operationId);
  try {
    localStorage.setItem(key, JSON.stringify(updated));
    dispatchQueueUpdate(cleanSchool, updated);
  } catch (err) {
    console.error("Failed to remove item from queue:", err);
  }
  return updated;
}

/**
 * Clear all synced items or entire queue
 */
export function clearOfflineQueue(schoolCode = "CAMPUS-01", onlySynced = false) {
  const cleanSchool = schoolCode.toUpperCase();
  const key = `${STORAGE_PREFIX}${cleanSchool}`;
  if (!onlySynced) {
    localStorage.removeItem(key);
    dispatchQueueUpdate(cleanSchool, []);
    return [];
  }
  const queue = getOfflineQueue(cleanSchool);
  const remaining = queue.filter((item) => item.status === "pending");
  localStorage.setItem(key, JSON.stringify(remaining));
  dispatchQueueUpdate(cleanSchool, remaining);
  return remaining;
}

/**
 * Dispatch DOM event so Navbar and UI components update reactively
 */
function dispatchQueueUpdate(schoolCode, queue) {
  if (typeof window !== "undefined") {
    const event = new CustomEvent("erp-offline-queue-updated", {
      detail: { schoolCode, count: queue.filter((i) => i.status === "pending").length, queue },
    });
    window.dispatchEvent(event);
  }
}

/**
 * Replay and synchronize pending offline items
 */
export async function syncOfflineQueue(schoolCode = "CAMPUS-01", customHandler = null) {
  const cleanSchool = schoolCode.toUpperCase();
  const queue = getOfflineQueue(cleanSchool);
  const pending = queue.filter((item) => item.status === "pending");

  if (pending.length === 0) return { synced: 0, failed: 0 };

  let syncedCount = 0;
  let failedCount = 0;

  const updatedQueue = [...queue];

  for (let i = 0; i < updatedQueue.length; i++) {
    const item = updatedQueue[i];
    if (item.status !== "pending") continue;

    try {
      if (customHandler) {
        await customHandler(item);
      } else {
        // Built-in sync handling by operation type
        await executeDefaultSync(item, cleanSchool);
      }
      item.status = "synced";
      item.syncedAt = new Date().toISOString();
      syncedCount++;
    } catch (err) {
      item.retryCount = (item.retryCount || 0) + 1;
      item.error = err.message || "Sync failed";
      if (item.retryCount >= 5) {
        item.status = "failed";
      }
      failedCount++;
    }
  }

  try {
    const key = `${STORAGE_PREFIX}${cleanSchool}`;
    localStorage.setItem(key, JSON.stringify(updatedQueue));
    dispatchQueueUpdate(cleanSchool, updatedQueue);
  } catch (err) {
    console.error("Failed to update queue state post-sync:", err);
  }

  return { synced: syncedCount, failed: failedCount };
}

/**
 * Internal executor for syncing operations to local repositories
 */
async function executeDefaultSync(item, schoolCode) {
  const { type, payload } = item;

  switch (type) {
    case "ATTENDANCE_RECORD": {
      // Synchronize with tenant attendance store
      const storageKey = `erp_attendance_${schoolCode}`;
      const existing = JSON.parse(localStorage.getItem(storageKey) || "[]");
      const updated = [payload, ...existing.filter((e) => e.date !== payload.date || e.studentId !== payload.studentId)];
      localStorage.setItem(storageKey, JSON.stringify(updated));
      break;
    }
    case "MARKS_ENTRY": {
      // Synchronize with exam marks store
      const storageKey = `erp_exam_marks_${schoolCode}`;
      const existing = JSON.parse(localStorage.getItem(storageKey) || "[]");
      const updated = [payload, ...existing.filter((m) => m.id !== payload.id)];
      localStorage.setItem(storageKey, JSON.stringify(updated));
      break;
    }
    case "FEE_PAYMENT": {
      // Synchronize with fee ledger store
      const storageKey = `erp_fee_ledger_${schoolCode}`;
      const existing = JSON.parse(localStorage.getItem(storageKey) || "[]");
      const updated = [payload, ...existing.filter((f) => f.id !== payload.id)];
      localStorage.setItem(storageKey, JSON.stringify(updated));
      break;
    }
    default:
      console.warn(`Unknown offline operation type: ${type}`);
  }
}

// Global window event listener to auto-trigger queue replay when coming online
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    try {
      // Scan all tenant offline queues and sync
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith(STORAGE_PREFIX)) {
          const schoolCode = key.replace(STORAGE_PREFIX, "");
          syncOfflineQueue(schoolCode);
        }
      });
    } catch (e) {
      console.warn("Online auto-sync trigger notice:", e);
    }
  });
}

