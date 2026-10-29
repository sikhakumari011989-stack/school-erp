import React, { useState, useEffect } from "react";

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      role="alert"
      className="bg-amber-500/95 text-slate-950 backdrop-blur-xl px-4 py-2.5 text-center text-xs font-black tracking-wide fixed top-0 left-0 right-0 z-[9999] shadow-2xl flex items-center justify-center gap-2 border-b border-amber-400 animate-in slide-in-from-top duration-300"
    >
      <span className="text-sm">⚠️</span>
      <span>Connection lost. Showing cached data — reconnect to sync.</span>
    </div>
  );
}

