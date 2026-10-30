import React, { useContext, useState, useEffect } from "react";
import { AppContext } from "../context/AppContext";
import { EduSaaSVectorEmblem } from "./BrandLogo";
import { getPendingQueueCount, syncOfflineQueue } from "../utils/offlineSync";
import ThemeToggle from "./ThemeToggle";

/**
 * Top Institutional Navigation Bar - Voyager Tier
 * Features high-contrast Light mode and immersive Glassmorphic Dark mode.
 * Contains the Stealth Theme Toggle, offline sync status, and active user profile.
 */
export default function Navbar({ onMenuToggle, title, subtitle, className = "" }) {
  const { user, tenant } = useContext(AppContext) || {};
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
    <header
      className={`w-full bg-white/95 dark:bg-slate-950/85 backdrop-blur-2xl border-b border-slate-200 dark:border-white/10 px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm dark:shadow-2xl dark:shadow-cyan-500/5 transition-colors duration-200 ${className}`}
    >
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <button
            type="button"
            onClick={onMenuToggle}
            className="md:hidden p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-all duration-200 ease-in-out cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            ☰
          </button>
        )}

        {/* Dynamic School Brand / Master Brand Icon */}
        <div className="flex items-center gap-3">
          {schoolLogo && !logoError ? (
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-1 flex items-center justify-center overflow-hidden shadow-sm dark:shadow-lg">
              <img
                src={schoolLogo}
                alt={`${tenant?.name || schoolCode} Logo`}
                className="w-full h-full object-contain"
                onError={() => setLogoError(true)}
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm dark:shadow-lg dark:shadow-cyan-500/10">
              <EduSaaSVectorEmblem className="w-full h-full" />
            </div>
          )}

          <div>
            <h1 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight truncate max-w-[180px] sm:max-w-xs transition-colors">
              {title || tenant?.name || "EduSaaS ERP"}
            </h1>
            <p className="text-[10px] font-mono font-bold text-indigo-600 dark:text-cyan-400 uppercase tracking-wider">
              {subtitle || schoolCode}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Stealth Theme Toggle */}
        <ThemeToggle />

        {/* Glowing Offline / Queue Status Badge */}
        {(!isOnline || pendingQueueCount > 0) && (
          <button
            type="button"
            onClick={handleManualSync}
            disabled={!isOnline || isSyncing}
            className={`flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-[11px] font-bold border transition-all duration-200 ${
              !isOnline
                ? "bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300"
                : "bg-amber-400/20 border-amber-400/50 text-amber-700 dark:text-amber-300 hover:bg-amber-400/30 cursor-pointer shadow-sm animate-pulse"
            }`}
            title={isOnline ? "Click to trigger manual sync of queued offline transactions" : "You are currently offline. Operations will queue safely."}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
            <span className="hidden sm:inline">Queue:</span>
            <span>({pendingQueueCount})</span>
            <span className="text-[10px] uppercase font-mono">{isSyncing ? "Syncing..." : isOnline ? "Pending" : "Offline"}</span>
          </button>
        )}

        {user && (
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-3 py-1.5 rounded-full backdrop-blur-xl transition-colors">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 hidden sm:inline">
              {user.name || user.full_name}
            </span>
            <span className="text-[10px] uppercase font-bold text-indigo-700 dark:text-cyan-300 px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-cyan-500/20 border border-indigo-200 dark:border-cyan-400/30">
              {user.role}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
