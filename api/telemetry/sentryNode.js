import * as SentryNode from "@sentry/node";

/**
 * SENTRY TELEMETRY & OBSERVABILITY INTEGRATION (Backend / Node.js)
 * Provides centralized exception tracking, performance metrics, and request profiling
 * for Vercel Serverless Functions, Biometric Gateway APIs, and Webhook listeners.
 */

const SENTRY_DSN =
  process.env.SENTRY_DSN ||
  process.env.VITE_SENTRY_DSN ||
  "https://pub_stub_key_2026@o0.ingest.sentry.io/0";

let isNodeInitialized = false;

export function initNodeSentry() {
  if (isNodeInitialized) return;

  try {
    SentryNode.init({
      dsn: SENTRY_DSN,
      environment: process.env.NODE_ENV || "production",
      release: "school-app-api@2.0.0-enterprise",
      tracesSampleRate: 0.2,
      enabled: Boolean(process.env.SENTRY_DSN || process.env.VITE_SENTRY_DSN),
    });
    isNodeInitialized = true;
    console.info("[Sentry Node] Serverless telemetry initialized.");
  } catch (err) {
    console.warn("[Sentry Node] Init notice:", err);
  }
}

export function captureNodeException(error, context = {}) {
  try {
    console.error("[Sentry Node Error Caught]:", error, context);
    if (!isNodeInitialized) initNodeSentry();
    SentryNode.captureException(error, { extra: context });
  } catch (e) {
    console.warn("[Sentry Node] Failed to capture exception:", e);
  }
}

export function captureNodeMessage(message, level = "info") {
  try {
    if (!isNodeInitialized) initNodeSentry();
    SentryNode.captureMessage(message, level);
  } catch {}
}

export default SentryNode;

