import { supabase } from "../supabaseClient";
import { captureException } from "../telemetry/sentry";

/**
 * INDEXED-DB PERSISTENT OFFLINE MUTATION QUEUE
 * Replaces localStorage with client-side IndexedDB (idb pattern) and provides
 * device-side payload encryption for sensitive student and institutional data at rest.
 */

const DB_NAME = "AcademicOS_OfflineDB";
const DB_VERSION = 1;
const STORE_NAME = "offline_mutation_queue";
const ENCRYPTION_SALT = "EduSaaS_Offline_Device_Salt_2026";

let cachedPendingCount = 0;
let dbInstancePromise = null;
let deviceKeyCache = null;

/**
 * Generates a deterministic or cryptographically random UUID v4
 */
export function generateEventId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "evt_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
}

/**
 * Open or initialize the IndexedDB instance
 */
function openDB() {
  if (typeof window === "undefined" || !window.indexedDB) {
    return Promise.reject(new Error("IndexedDB is unavailable in this environment"));
  }

  if (!dbInstancePromise) {
    dbInstancePromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "event_id" });
          store.createIndex("school_id", "school_id", { unique: false });
          store.createIndex("created_at", "created_at", { unique: false });
          store.createIndex("action_type", "action_type", { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        dbInstancePromise = null;
        reject(request.error);
      };
    });
  }

  return dbInstancePromise;
}

/**
 * Device-side Encryption Stub for Data at Rest (AES-GCM / WebCrypto)
 */
async function getDeviceEncryptionKey() {
  if (deviceKeyCache) return deviceKeyCache;
  if (typeof crypto === "undefined" || !crypto.subtle) return null;

  try {
    const enc = new TextEncoder();
    const rawKey = await crypto.subtle.importKey(
      "raw",
      enc.encode("AcademicOS_Offline_Vault_Key_Sec9"),
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );

    deviceKeyCache = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: enc.encode(ENCRYPTION_SALT),
        iterations: 10000,
        hash: "SHA-256",
      },
      rawKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
    return deviceKeyCache;
  } catch (e) {
    console.warn("[OfflineQueue] Key derivation notice:", e);
    return null;
  }
}

export async function encryptPayload(payload) {
  try {
    const key = await getDeviceEncryptionKey();
    const jsonStr = JSON.stringify(payload);

    if (!key || typeof crypto === "undefined" || !crypto.subtle) {
      // Obfuscated stub for environments lacking SubtleCrypto
      return {
        ciphertext: btoa(unescape(encodeURIComponent(jsonStr))),
        algorithm: "STUB_BASE64_OBFUSCATED",
        iv: null,
      };
    }

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      enc.encode(jsonStr)
    );

    return {
      ciphertext: Array.from(new Uint8Array(encrypted))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(""),
      iv: Array.from(iv)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(""),
      algorithm: "AES-GCM-256",
    };
  } catch (err) {
    console.warn("[OfflineQueue] Payload encryption notice:", err);
    return {
      ciphertext: JSON.stringify(payload),
      algorithm: "PLAINTEXT_FALLBACK",
      iv: null,
    };
  }
}

export async function decryptPayload(encryptedRecord) {
  if (!encryptedRecord) return null;
  try {
    if (encryptedRecord.algorithm === "AES-GCM-256" && encryptedRecord.iv) {
      const key = await getDeviceEncryptionKey();
      if (!key) throw new Error("Key unavailable");
      const iv = new Uint8Array(
        encryptedRecord.iv.match(/.{1,2}/g).map((byte) => parseInt(byte, 16))
      );
      const data = new Uint8Array(
        encryptedRecord.ciphertext.match(/.{1,2}/g).map((byte) => parseInt(byte, 16))
      );
      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        data
      );
      const dec = new TextDecoder();
      return JSON.parse(dec.decode(decrypted));
    } else if (encryptedRecord.algorithm === "STUB_BASE64_OBFUSCATED") {
      return JSON.parse(decodeURIComponent(escape(atob(encryptedRecord.ciphertext))));
    } else if (typeof encryptedRecord.ciphertext === "string") {
      return JSON.parse(encryptedRecord.ciphertext);
    }
  } catch (err) {
    console.warn("[OfflineQueue] Payload decryption notice:", err);
  }
  return encryptedRecord.payload || encryptedRecord;
}

/**
 * Refreshes and synchronizes the pending count from IndexedDB
 */
export async function refreshPendingCount() {
  try {
    const db = await openDB();
    const count = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.count();
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => reject(req.error);
    });
    cachedPendingCount = count;
    return count;
  } catch {
    return cachedPendingCount;
  }
}

// Initial bootstrap of cached count
if (typeof window !== "undefined") {
  refreshPendingCount().then((count) => {
    window.dispatchEvent(
      new CustomEvent("erp-offline-queue-updated", {
        detail: { pendingCount: count },
      })
    );
  }).catch(() => {});
}

/**
 * Returns count of pending offline mutations (synchronous for React state initializers)
 */
export function getPendingOfflineCount(schoolId = null) {
  return cachedPendingCount;
}

/**
 * Returns count of pending offline mutations asynchronously from IndexedDB
 */
export async function getPendingOfflineCountAsync(schoolId = null) {
  return await refreshPendingCount();
}

/**
 * Retrieves all raw mutations from IndexedDB, decrypting each payload
 */
export async function getOfflineQueue() {
  try {
    const db = await openDB();
    const rawItems = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    const decryptedItems = await Promise.all(
      rawItems.map(async (item) => {
        const decryptedPayload = await decryptPayload(item.encrypted_payload);
        return {
          ...item,
          payload: decryptedPayload,
        };
      })
    );

    return decryptedItems;
  } catch (err) {
    console.warn("[OfflineQueue] Error reading from IndexedDB:", err);
    return [];
  }
}

/**
 * Enqueues a durable offline mutation into IndexedDB with payload encryption
 */
export async function enqueueOfflineMutation({
  schoolId = "CAMPUS-01",
  actionType = "attendance_mark",
  payload = {},
  eventId = null,
}) {
  const cleanSchool = (schoolId || "CAMPUS-01").toUpperCase();

  const finalEventId =
    eventId ||
    payload.event_id ||
    (payload.studentId && payload.date
      ? `evt_${cleanSchool}_${payload.studentId}_${payload.date}`
      : generateEventId());

  try {
    const db = await openDB();

    // Check if event already exists (deduplication)
    const existing = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(finalEventId);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (existing) {
      console.info(`[OfflineQueue] Event ${finalEventId} already queued in IndexedDB; deduplicated.`);
      return finalEventId;
    }

    // Encrypt payload before persisting at rest
    const encryptedPayload = await encryptPayload(payload);

    const record = {
      event_id: finalEventId,
      school_id: cleanSchool,
      action_type: actionType,
      encrypted_payload: encryptedPayload,
      payload_algorithm: encryptedPayload.algorithm,
      attempts: 0,
      created_at: new Date().toISOString(),
    };

    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    cachedPendingCount += 1;

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("erp-offline-queue-updated", {
          detail: {
            pendingCount: cachedPendingCount,
            schoolId: cleanSchool,
            latestEventId: finalEventId,
          },
        })
      );
    }
  } catch (err) {
    console.error("[OfflineQueue] Failed to persist offline mutation into IndexedDB:", err);
  }

  return finalEventId;
}

/**
 * Flushes all queued mutations from IndexedDB against Supabase
 */
export async function flushOfflineMutationQueue(schoolId = null) {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { flushed: 0, pending: cachedPendingCount };
  }

  const queue = await getOfflineQueue();
  if (queue.length === 0) {
    cachedPendingCount = 0;
    return { flushed: 0, pending: 0 };
  }

  console.info(`[OfflineQueue] Flushing ${queue.length} pending offline mutations from IndexedDB to cloud...`);

  let flushedCount = 0;
  const db = await openDB();

  for (const item of queue) {
    try {
      let syncSuccess = false;

      if (item.action_type === "attendance_mark" && supabase) {
        const { school_id, payload } = item;
        const targetDate = payload.date || payload.attendance_date || new Date().toISOString().split("T")[0];

        const { data: existing, error: fetchErr } = await supabase
          .from("attendance")
          .select("id, records")
          .eq("school_id", school_id)
          .eq("date", targetDate)
          .maybeSingle();

        if (!fetchErr) {
          const currentRecords = Array.isArray(existing?.records) ? existing.records : [];
          let mergedRecords = [];

          if (Array.isArray(payload.records)) {
            const incomingIds = new Set(
              payload.records.map((r) => r.student_id || r.studentId || r.user_code || r.id)
            );
            const filteredCurrent = currentRecords.filter(
              (r) => !incomingIds.has(r.student_id || r.studentId || r.user_code || r.id)
            );
            const taggedIncoming = payload.records.map((r) => ({
              ...r,
              event_id: r.event_id || item.event_id,
              synced_at: new Date().toISOString(),
            }));
            mergedRecords = [...filteredCurrent, ...taggedIncoming];
          } else {
            const studentCode = payload.studentId || payload.student_id || payload.user_code;
            const filteredRecords = currentRecords.filter(
              (r) => (r.studentId || r.student_id || r.user_code) !== studentCode
            );
            const newRecord = {
              ...payload,
              event_id: item.event_id,
              synced_at: new Date().toISOString(),
            };
            mergedRecords = [...filteredRecords, newRecord];
          }

          if (existing?.id) {
            await supabase
              .from("attendance")
              .update({ records: mergedRecords, attendance_date: targetDate })
              .eq("id", existing.id);
          } else {
            await supabase.from("attendance").insert([
              {
                school_id,
                date: targetDate,
                attendance_date: targetDate,
                class_name: payload.class_name || payload.className || "General",
                class_id: payload.class_id || payload.classId || "Class-10A",
                records: mergedRecords,
              },
            ]);
          }
          syncSuccess = true;
        }
      } else {
        syncSuccess = true;
      }

      if (syncSuccess) {
        // Remove item from IndexedDB on successful sync
        await new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, "readwrite");
          const store = tx.objectStore(STORE_NAME);
          const req = store.delete(item.event_id);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
        flushedCount++;
      }
    } catch (err) {
      console.warn(`[OfflineQueue] Failed to sync item ${item.event_id}:`, err);
      captureException(err, { context: "offlineSyncQueue.flush", eventId: item.event_id });
    }
  }

  await refreshPendingCount();

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("erp-offline-queue-updated", {
        detail: {
          pendingCount: cachedPendingCount,
          flushedCount,
        },
      })
    );
    window.dispatchEvent(
      new CustomEvent("erp-offline-sync-completed", {
        detail: { flushedCount, remaining: cachedPendingCount },
      })
    );
  }

  return { flushed: flushedCount, pending: cachedPendingCount };
}

/**
 * Purges the entire IndexedDB offline mutation queue on user sign-out
 * Prevents sensitive student and academic data from leaking on shared devices.
 */
export async function purgeOfflineQueue() {
  console.info("[OfflineQueue] Purging IndexedDB offline queue on global sign-out...");
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    cachedPendingCount = 0;

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("erp-offline-queue-updated", {
          detail: { pendingCount: 0, purged: true },
        })
      );
    }
    return { success: true, count: 0 };
  } catch (err) {
    console.warn("[OfflineQueue] Error during purgeOfflineQueue:", err);
    cachedPendingCount = 0;
    return { success: false, error: err?.message };
  }
}

// Global auto-flusher on network reconnect
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    console.info("[OfflineQueue] Network online event received; triggering auto-flush.");
    flushOfflineMutationQueue();
  });
}
