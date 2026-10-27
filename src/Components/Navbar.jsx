import React, { useContext, useState, useEffect } from "react";
import { AppContext } from "../context/AppContext";
import BrandLogo, { EduSaaSVectorEmblem } from "./BrandLogo";
import { getPendingQueueCount, syncOfflineQueue } from "../utils/offlineSync";

/**
 * Top Institutional Navigation Bar
 * Dynamically checks for custom base64 logo (localStorage 'erp_logo_' + schoolCode)
 * with graceful fallback to generic academic icon / Master Brand text.
 * Displays real-time offline queue status badge and sync button when pending.
 */
export default function Navbar({ onMenuToggle, title, subtitle, className = "" }) {
  const { user, tenant, handleSignOut, logout } = useContext(AppContext) || {};
  const schoolCode = (user?.institution_code || user?.school_id || tenant?.code || "CAMPUS-01").toUpperCase();

  const [schoolLogo, setSchoolLogo] = useState(null);
  const [logoError, setLogoError] = useState(false);
  const [pendingQueueCount, setPendingQueueCount] = useState(0);
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const fetchLogo = () => {
      try {
        const stored =
          localStorage.getItem(`erp_logo_${schoolCode}`) ||
          localStorage.getItem(`erp_school_logo_${schoolCode}`) ||
          tenant?.logoUrl;
        setSchoolLogo(stored || null);
        setLogoError(false);
      } catch {
        setSchoolLogo(null);
      }
    };

    const updateQueueStatus = () => {
      try {
        setPendingQueueCount(getPendingQueueCount(schoolCode));
      } catch {
        setPendingQueueCount(0);
      }
    };

    const handleOnline = () => {
      setIsOnline(true);
      updateQueueStatus();
    };

    const handleOffline = () => {
      setIsOnline(false);
      updateQueueStatus();
    };

    fetchLogo();
    updateQueueStatus();

    window.addEventListener("erp-logo-updated", fetchLogo);
    window.addEventListener("storage", fetchLogo);
    window.addEventListener("erp-offline-queue-updated", updateQueueStatus);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("erp-logo-updated", fetchLogo);
      window.removeEventListener("storage", fetchLogo);
      window.removeEventListener("erp-offline-queue-updated", updateQueueStatus);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [schoolCode, tenant?.logoUrl]);

  const handleManualSync = async () => {
    if (!isOnline) return;
    setIsSyncing(true);
    try {
      await syncOfflineQueue(schoolCode);
      setPendingQueueCount(getPendingQueueCount(schoolCode));
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <header className={`w-full bg-slate-900/80 backdrop-blur-2xl border-b border-white/10 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-2xl shadow-cyan-500/5 ${className}`}>
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="md:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-all duration-300 ease-in-out hover:scale-[1.02]"
            aria-label="Toggle menu"
          >
            ☰
          </button>
        )}

        {/* Dynamic School Brand / Master Brand Icon */}
        <div className="flex items-center gap-3">
          {schoolLogo && !logoError ? (
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 p-1 flex items-center justify-center overflow-hidden shadow-lg shadow-cyan-500/10">
              <img
                src={schoolLogo}
                alt={`${tenant?.name || schoolCode} Logo`}
                className="w-full h-full object-contain"
                onError={() => setLogoError(true)}
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-cyan-500/10">
              <EduSaaSVectorEmblem className="w-full h-full" />
            </div>
          )}

          <div>
            <h1 className="text-sm sm:text-base font-extrabold text-white tracking-tight truncate max-w-[200px] sm:max-w-xs">
              {title || tenant?.name || "EduSaaS ERP"}
            </h1>
            <p className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider">
              {subtitle || schoolCode}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Glowing Offline / Queue Status Badge */}
        {(!isOnline || pendingQueueCount > 0) && (
          <button
            onClick={handleManualSync}
            disabled={!isOnline || isSyncing}
            className={`flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-[11px] font-bold border transition-all duration-300 ${
              !isOnline
                ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                : "bg-amber-400/20 border-amber-400/50 text-amber-300 hover:bg-amber-400/30 cursor-pointer shadow-lg shadow-amber-500/20 animate-pulse"
            }`}
            title={isOnline ? "Click to trigger manual sync of queued offline transactions" : "You are currently offline. Operations will queue safely."}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            <span className="hidden sm:inline">Offline Queue:</span>
            <span>({pendingQueueCount})</span>
            <span className="text-[10px] uppercase font-mono">{isSyncing ? "Syncing..." : isOnline ? "Sync Pending" : "Offline"}</span>
          </button>
        )}

        {user && (
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full backdrop-blur-xl">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-semibold text-slate-200 hidden sm:inline">{user.name || user.full_name}</span>
            <span className="text-[10px] uppercase font-bold text-cyan-300 px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/30">
              {user.role}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
