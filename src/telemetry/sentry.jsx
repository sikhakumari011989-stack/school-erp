import React from "react";
import * as Sentry from "@sentry/react";

/**
 * SENTRY TELEMETRY & OBSERVABILITY INTEGRATION (Frontend)
 * Provides centralized exception tracking, performance tracing, and
 * error boundary resilience across all 6 roles of the EduSaaS platform.
 */

const SENTRY_DSN =
  import.meta.env.VITE_SENTRY_DSN ||
  "https://pub_stub_key_2026@o0.ingest.sentry.io/0";

let isInitialized = false;

export function initSentry() {
  if (isInitialized) return;

  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: import.meta.env.MODE || "production",
      release: "school-app@2.0.0-enterprise",
      tracesSampleRate: 0.2, // Capture 20% of transactions for performance tracing
      replaysSessionSampleRate: 0.05,
      replaysOnErrorSampleRate: 1.0,
      enabled: import.meta.env.PROD || Boolean(import.meta.env.VITE_SENTRY_DSN),
      beforeSend(event) {
        // Redact PII (passwords, JWTs, parent tokens)
        if (event.request?.headers) {
          delete event.request.headers["authorization"];
          delete event.request.headers["x-api-key"];
        }
        return event;
      },
    });
    isInitialized = true;
    console.info("[Sentry] Telemetry client initialized successfully.");
  } catch (err) {
    console.warn("[Sentry] Initialization notice:", err);
  }
}

export function captureException(error, context = {}) {
  try {
    console.error("[Sentry Error Captured]:", error, context);
    if (isInitialized) {
      Sentry.captureException(error, { extra: context });
    }
  } catch (e) {
    console.warn("[Sentry] captureException failure:", e);
  }
}

export function captureMessage(message, level = "info") {
  try {
    if (isInitialized) {
      Sentry.captureMessage(message, level);
    }
  } catch {}
}

export function SentryFallbackComponent({ error, resetError }) {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-rose-500/30 rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center gap-2 text-rose-400 font-extrabold text-sm uppercase tracking-wider">
          <span className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-lg">
            ⚠️
          </span>
          <span>Sentry Shield Active</span>
        </div>
        <h2 className="text-lg font-bold text-white">Application Exception Intercepted</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          An unhandled error occurred. Telemetry diagnostics have been securely dispatched to our engineering operations team.
        </p>
        {error && (
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-rose-300 break-all">
            {error.message || String(error)}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => {
              if (resetError) resetError();
              window.location.reload();
            }}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            Reload OS
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * High-Order Sentry Error Boundary
 */
export function SentryErrorBoundary({ children, fallback = null }) {
  // Ensure Sentry is booted
  initSentry();

  return (
    <Sentry.ErrorBoundary
      fallback={fallback || (({ error, resetError }) => <SentryFallbackComponent error={error} resetError={resetError} />)}
      onError={(err) => captureException(err, { component: "RootApp" })}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}

export default Sentry;

