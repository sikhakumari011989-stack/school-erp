import React, { useState, useEffect } from "react";
import { getPendingOfflineCount, flushOfflineMutationQueue } from "../utils/offlineSyncQueue";

/**
 * OfflineBanner Component
 * Monitors navigator.onLine and renders a persistent amber warning banner
 * during network disruptions or degraded Palghar 3G connectivity.
 * Displays the real-time count of pending offline records in erp_offline_mutation_queue.
 */
export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [pendingCount, setPendingCount] = useState(() => getPendingOfflineCount());
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      setIsSyncing(true);
      try {
        await flushOfflineMutationQueue();
      } finally {
        setIsSyncing(false);
        setPendingCount(getPendingOfflineCount());
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setPendingCount(getPendingOfflineCount());
    };

    const handleQueueUpdated = (e) => {
      const count = e?.detail?.pendingCount ?? getPendingOfflineCount();
      setPendingCount(count);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("erp-offline-queue-updated", handleQueueUpdated);
    window.addEventListener("erp-offline-sync-completed", handleQueueUpdated);

    // Initial check
    setPendingCount(getPendingOfflineCount());

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("erp-offline-queue-updated", handleQueueUpdated);
      window.removeEventListener("erp-offline-sync-completed", handleQueueUpdated);
    };
  }, []);

  // When online and no pending syncs, don't show the banner
  if (isOnline && !isSyncing && pendingCount === 0) return null;

  // If online but flushing pending records
  if (isOnline && (isSyncing || pendingCount > 0)) {
    return (
      <div
        role="alert"
        className="bg-blue-600/95 text-white backdrop-blur-xl px-4 py-2 text-center text-xs font-bold tracking-wide fixed top-0 left-0 right-0 z-[9999] shadow-2xl flex items-center justify-center gap-2 border-b border-blue-400 animate-in slide-in-from-top duration-300"
      >
        <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping"></span>
        <span>
          Reconnected! Synchronizing {pendingCount} durable offline mutation(s) to cloud ledger...
        </span>
      </div>
    );
  }

  // Offline amber banner
  return (
    <div
      role="alert"
      className="bg-amber-500/95 text-slate-950 backdrop-blur-xl px-4 py-2.5 text-center text-xs font-black tracking-wide fixed top-0 left-0 right-0 z-[9999] shadow-2xl flex items-center justify-center gap-2 border-b border-amber-400 animate-in slide-in-from-top duration-300 flex-wrap"
    >
      <span className="text-sm">⚠️</span>
      <span>
        Connection lost. Showing cached data —{" "}
        {pendingCount > 0
          ? `${pendingCount} offline record(s) queued in durable store (will auto-sync on reconnect).`
          : "reconnect to sync."}
      </span>
      {pendingCount > 0 && (
        <span className="bg-slate-950 text-amber-300 text-[10px] font-mono px-2 py-0.5 rounded-full border border-amber-400/40 font-bold ml-1">
          {pendingCount} Pending
        </span>
      )}
    </div>
  );
}
