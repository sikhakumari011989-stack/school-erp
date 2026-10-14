import React, { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "success", duration = 4000) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Notification Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-md w-full pointer-events-none px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-5 py-4 rounded-2xl shadow-2xl backdrop-blur-xl border transition-all duration-300 animate-slide-up ${
              toast.type === "success"
                ? "bg-emerald-950/90 border-emerald-500/40 text-emerald-100 shadow-emerald-950/50"
                : toast.type === "error"
                ? "bg-rose-950/90 border-rose-500/40 text-rose-100 shadow-rose-950/50"
                : "bg-blue-950/90 border-blue-500/40 text-blue-100 shadow-blue-950/50"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">
                {toast.type === "success" ? "✅" : toast.type === "error" ? "⚠️" : "ℹ️"}
              </span>
              <p className="text-sm font-semibold leading-snug">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-white transition-colors text-lg leading-none p-1"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      showToast: (msg) => console.log("[Toast fallback]:", msg),
    };
  }
  return ctx;
};

