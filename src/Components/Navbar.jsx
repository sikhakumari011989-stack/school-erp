import React, { useContext, useState, useEffect } from "react";
import { AppContext } from "../context/AppContext";
import { EduSaaSVectorEmblem } from "./BrandLogo";
import { getPendingQueueCount, syncOfflineQueue } from "../utils/offlineSync";
import { Search } from "lucide-react";

/**
 * Top Institutional Navigation Bar - Voyager Dark Enterprise Tier
 * Glassmorphic deep slate/charcoal header with high contrast typography and subtle cyan glows.
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
      className={`w-full bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between sticky top-0 z-30 shadow-2xl transition-all duration-200 ${className}`}
    >
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <button
            type="button"
            onClick={onMenuToggle}
            className="md:hidden p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-700/60 transition-all duration-200 ease-in-out cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            ☰
          </button>
        )}

        {/* Dynamic School Brand / Master Brand Icon */}
        <div className="flex items-center gap-3">
          {schoolLogo && !logoError ? (
            <div className="w-10 h-10 rounded-xl bg-slate-800/60 border border-slate-700/60 p-1 flex items-center justify-center overflow-hidden shadow-lg">
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
            <h1 className="text-sm sm:text-base font-extrabold text-slate-100 tracking-tight truncate max-w-[180px] sm:max-w-xs transition-colors">
              {title || tenant?.name || "ASTINEX"}
            </h1>
            <p className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider">
              {subtitle || schoolCode}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Universal Command Palette Trigger (Ctrl + K) */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-300 hover:text-white hover:border-cyan-500/40 text-xs font-semibold transition-all duration-200 shadow-sm cursor-pointer"
          title="Search anything across ASTINEX (Ctrl + K)"
        >
          <Search className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden md:inline">Search ERP...</span>
          <kbd className="hidden sm:inline-flex text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-700">
            Ctrl+K
          </kbd>
        </button>

        {user && (
          <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/60 px-3 py-1.5 rounded-full backdrop-blur-xl transition-all">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-semibold text-slate-200 hidden sm:inline">
              {user.name || user.full_name}
            </span>
            <span className="text-[10px] uppercase font-bold text-cyan-300 px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/30">
              {user.role}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
