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
    <div className="bg-amber-600/90 text-white backdrop-blur-md px-4 py-2 text-center text-xs font-bold tracking-wide fixed top-0 left-0 right-0 z-[9999] shadow-lg flex items-center justify-center gap-2 border-b border-amber-500/50 animate-pulse">
      <span>📡</span>
      <span>
        Offline Mode Active — Operating from Local Device Cache. New records will automatically sync upon reconnecting.
      </span>
    </div>
  );
}

