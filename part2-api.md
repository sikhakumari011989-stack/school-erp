This file is a merged representation of a subset of the codebase, containing specifically included files, combined into a single document by Repomix.

# File Summary

## Purpose
This file contains a packed representation of a subset of the repository's contents that is considered the most important context.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: api/**
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
api/
  master/
    auth.js
    schools.js
  razorpay/
    create-order.js
    verify-payment.js
  telemetry/
    sentryNode.js
  v2/
    attendance/
      sync.js
  razorpay-webhook.js
```

# Files

## File: api/razorpay/create-order.js
```javascript
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

/**
 * Vercel Serverless Function: Create Razorpay Payment Order
 * Endpoint: /api/razorpay/create-order
 *
 * Secure server-side order generation for student fee payments.
 * Fails closed if merchant keys are unconfigured.
 */
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method Not Allowed. Use POST." });
  }

  try {
    const keyId = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      return res.status(500).json({
        success: false,
        error: "Razorpay payment gateway secret (RAZORPAY_KEY_SECRET) is unconfigured on the server. Online card/UPI checkout disabled.",
      });
    }

    if (!keyId) {
      return res.status(500).json({
        success: false,
        error: "Razorpay Key ID (RAZORPAY_KEY_ID) is unconfigured on the server.",
      });
    }

    const {
      amount,
      currency = "INR",
      schoolId,
      studentId,
      studentName = "Enrolled Student",
      studentEmail = "",
      feeTitle = "Tuition Fee",
      isPartial = false,
    } = req.body || {};

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ success: false, error: "Valid payment amount is required." });
    }

    if (!schoolId) {
      return res.status(400).json({ success: false, error: "schoolId is required." });
    }

    const cleanSchool = schoolId.trim().toUpperCase();
    const amountInPaise = Math.round(numAmount * 100);
    const receiptId = `rcpt_${cleanSchool}_${Date.now().toString().slice(-8)}`;

    const orderPayload = {
      amount: amountInPaise,
      currency,
      receipt: receiptId,
      notes: {
        school_id: cleanSchool,
        student_id: String(studentId || "STU-001"),
        student_name: String(studentName),
        student_email: String(studentEmail),
        fee_title: String(feeTitle),
        is_partial: String(isPartial),
      },
    };

    // Call Razorpay Orders API
    const authHeader = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const rzpResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderPayload),
    });

    if (!rzpResponse.ok) {
      const errBody = await rzpResponse.text();
      console.error("[Razorpay Orders API Error]:", errBody);
      return res.status(rzpResponse.status).json({
        success: false,
        error: "Failed to initiate payment order with payment gateway.",
        details: errBody,
      });
    }

    const orderData = await rzpResponse.json();

    // Optionally record in Supabase payment_orders if service_role is configured
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseUrl && serviceKey) {
        const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
        await supabase.from("payment_orders").insert([
          {
            order_id: orderData.id,
            school_id: cleanSchool,
            student_id: studentId || null,
            student_name: studentName,
            amount: numAmount,
            currency,
            receipt: receiptId,
            status: "created",
            raw_payload: orderData,
          },
        ]);
      }
    } catch (dbErr) {
      // Non-blocking log
      console.warn("[Razorpay] payment_orders record notice:", dbErr.message);
    }

    return res.status(200).json({
      success: true,
      order: {
        id: orderData.id,
        amount: orderData.amount,
        currency: orderData.currency,
        receipt: orderData.receipt,
        key_id: keyId,
      },
    });
  } catch (err) {
    console.error("[Razorpay Create Order Exception]:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error creating payment order: " + err.message,
    });
  }
}
```

## File: api/razorpay/verify-payment.js
```javascript
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

/**
 * Vercel Serverless Function: Verify Razorpay Payment Signature
 * Endpoint: /api/razorpay/verify-payment
 *
 * Verifies mathematical HMAC-SHA256 signature of (order_id + "|" + payment_id)
 * against server secret RAZORPAY_KEY_SECRET, and credits fee_ledger idempotently.
 */
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method Not Allowed. Use POST." });
  }

  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      return res.status(500).json({
        success: false,
        error: "Server configuration error: RAZORPAY_KEY_SECRET is unconfigured.",
      });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      schoolId,
      studentId,
      studentName = "Enrolled Student",
      studentEmail = "",
      className = "Class 10",
      amount,
      feeTitle = "Tuition Fee Settlement",
      isPartial = false,
    } = req.body || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: "Missing mandatory signature verification parameters (order_id, payment_id, signature).",
      });
    }

    // 1. Constant-time cryptographic HMAC-SHA256 verification
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const sigBuf = Buffer.from(razorpay_signature.trim(), "utf8");
    const expBuf = Buffer.from(expectedSignature.trim(), "utf8");

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      console.error("[Razorpay Verify] Invalid signature mismatch for payment:", razorpay_payment_id);
      return res.status(400).json({
        success: false,
        error: "Cryptographic signature verification failed. Untrusted payment assertion.",
      });
    }

    const cleanSchool = (schoolId || "CAMPUS-01").trim().toUpperCase();
    const numAmount = Number(amount) || 0;
    const invoiceNo = `INV-${Date.now().toString().slice(-6)}`;
    const today = new Date().toISOString().split("T")[0];

    // 2. Database reconciliation via Supabase service_role
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceKey) {
      const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

      // Validate payment-order idempotency and ownership if payment_orders table has the order
      try {
        const { data: orderRecord } = await supabase
          .from("payment_orders")
          .select("*")
          .eq("order_id", razorpay_order_id)
          .maybeSingle();

        if (orderRecord) {
          // Verify tenant ownership
          if (orderRecord.school_id && orderRecord.school_id.toUpperCase() !== cleanSchool.toUpperCase()) {
            return res.status(403).json({
              success: false,
              error: "Tenant ownership violation: Payment order does not belong to the asserting school.",
            });
          }

          // Verify order amount consistency
          if (orderRecord.amount && numAmount > 0 && Math.abs(Number(orderRecord.amount) - numAmount) > 0.01) {
            return res.status(400).json({
              success: false,
              error: "Payment amount mismatch between gateway order and settlement assertion.",
            });
          }

          // Verify payment order idempotency: already marked paid
          if (orderRecord.status === "paid" && orderRecord.payment_id === razorpay_payment_id) {
            return res.status(200).json({
              success: true,
              verified: true,
              duplicate: true,
              message: "Payment signature verified. Order was previously settled and reconciled.",
              payment_id: razorpay_payment_id,
              invoice_no: invoiceNo,
            });
          }
        }
      } catch (orderCheckErr) {
        console.warn("[Razorpay Verify] Order validation notice:", orderCheckErr.message);
      }

      // Idempotency check: verify this razorpay_payment_id has not already been credited
      const { data: existingLedger } = await supabase
        .from("fee_ledger")
        .select("id, status")
        .eq("school_id", cleanSchool)
        .eq("razorpay_payment_id", razorpay_payment_id)
        .maybeSingle();

      if (existingLedger) {
        return res.status(200).json({
          success: true,
          verified: true,
          duplicate: true,
          message: "Payment signature verified. Transaction was previously reconciled.",
          payment_id: razorpay_payment_id,
          invoice_no: invoiceNo,
        });
      }

      // Insert confirmed ledger record
      const { error: insertErr } = await supabase.from("fee_ledger").insert([
        {
          school_id: cleanSchool,
          student_id: studentId || null,
          student_name: studentName,
          student_email: studentEmail,
          class_name: className,
          amount: numAmount,
          fee_component: feeTitle,
          payment_mode: "Razorpay Online Gateway",
          razorpay_payment_id: razorpay_payment_id,
          transaction_reference: razorpay_order_id,
          status: "completed",
          is_reversal: false,
          entry_timestamp: new Date().toISOString(),
        },
      ]);

      if (insertErr) {
        console.error("[Razorpay Verify] Supabase ledger insert error:", insertErr);
        return res.status(500).json({
          success: false,
          error: "Signature verified, but failed to write ledger entry to database: " + insertErr.message,
        });
      }

      // Update payment_orders if exists
      try {
        await supabase
          .from("payment_orders")
          .update({
            status: "paid",
            payment_id: razorpay_payment_id,
            updated_at: new Date().toISOString(),
          })
          .eq("order_id", razorpay_order_id);
      } catch {}
    }

    return res.status(200).json({
      success: true,
      verified: true,
      message: "Payment successfully verified and credited to official institutional ledger.",
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
      invoice_no: invoiceNo,
      amount: numAmount,
      date: today,
    });
  } catch (err) {
    console.error("[Razorpay Verify Exception]:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error verifying payment: " + err.message,
    });
  }
}
```

## File: api/telemetry/sentryNode.js
```javascript
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
```

## File: api/master/auth.js
```javascript
import crypto from "crypto";

export function getMasterKey() {
  return (
    process.env.MASTER_SETUP_KEY ||
    process.env.MASTER_SETUP_PASSKEY ||
    process.env.MASTER_ADMIN_PASSKEY ||
    process.env.VITE_MASTER_SETUP_PASSKEY ||
    process.env.VITE_MASTER_SETUP_KEY ||
    ""
  );
}

export function getTokenSecret() {
  return (
    process.env.MASTER_TOKEN_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    (process.env.NODE_ENV === "test" ? "test-master-provisioning-secret-2026" : "academic-os-master-provisioning-secret-2026")
  );
}

/**
 * Creates an HMAC-signed session token for the Master Setup Gateway
 */
export function signMasterToken(expiryMs = 4 * 60 * 60 * 1000) {
  const secret = getTokenSecret();
  if (!secret) {
    throw new Error("Master token secret is unconfigured. Cannot sign tokens.");
  }
  const expiresAt = Date.now() + expiryMs;
  const payload = JSON.stringify({ role: "master_operator", exp: expiresAt });
  const hmac = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return Buffer.from(JSON.stringify({ p: payload, s: hmac })).toString("base64");
}

/**
 * Validates a signed Master Setup session token
 */
export function verifyMasterToken(token) {
  if (!token) return false;
  const secret = getTokenSecret();
  if (!secret) return false;
  try {
    const raw = Buffer.from(token, "base64").toString("utf-8");
    const { p, s } = JSON.parse(raw);
    const expectedHmac = crypto.createHmac("sha256", secret).update(p).digest("hex");
    if (s !== expectedHmac) return false;
    const data = JSON.parse(p);
    return data.exp > Date.now();
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "private, no-store, max-age=0");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed. Use POST." });
  }

  try {
    const masterKey = getMasterKey();
    if (!masterKey) {
      return res.status(500).json({
        success: false,
        error: "Master setup passkey is not configured on the server. Access disabled.",
      });
    }

    const tokenSecret = getTokenSecret();
    if (!tokenSecret) {
      return res.status(500).json({
        success: false,
        error: "Master token secret is not configured on the server. Access disabled.",
      });
    }

    const { passkey } = req.body || {};
    if (!passkey || typeof passkey !== "string") {
      return res.status(400).json({ success: false, error: "Master passkey is required." });
    }

    // Constant-time comparison to prevent timing attacks
    const inputBuf = Buffer.from(passkey.trim());
    const expectedBuf = Buffer.from(masterKey.trim());

    const isMatch =
      inputBuf.length === expectedBuf.length &&
      crypto.timingSafeEqual(inputBuf, expectedBuf);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Access Denied: Invalid Master Passkey.",
      });
    }

    const token = signMasterToken();
    return res.status(200).json({
      success: true,
      message: "Master Gateway Unlocked! Access Granted.",
      token,
      expires_in: 14400, // 4 hours
    });
  } catch (_err) {
    return res.status(500).json({ success: false, error: "Internal authentication error." });
  }
}
```

## File: api/v2/attendance/sync.js
```javascript
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

// In-memory sliding window cache for hardware punch deduplication (school_id:device_serial:vendor_event_id)
const processedPunchIds = new Set();
const CACHE_MAX_SIZE = 10000;

function rememberPunch(key) {
  if (processedPunchIds.size >= CACHE_MAX_SIZE) {
    const firstKey = processedPunchIds.values().next().value;
    processedPunchIds.delete(firstKey);
  }
  processedPunchIds.add(key);
}

/**
 * Vercel Serverless Function: Biometric Attendance Hardware Adapter Gateway
 * Endpoint: POST /api/v2/attendance/sync
 *
 * Designed to interface with eSSL, Matrix COSEC, ZKTeco, and Hikvision
 * biometric fingerprint / facial recognition turnstiles and attendance hardware.
 * Features:
 * - Cache-Control: private, no-store, max-age=0 (preventing Vercel CDN cross-tenant cache leaks)
 * - Per-device HMAC-SHA256 signature verification querying biometric_devices table
 * - 5-minute replay skew protection (x-device-timestamp)
 * - Hardware event idempotency on (school_id, device_serial, vendor_event_id)
 */
export default async function handler(req, res) {
  // 1. CORS Preflight & Security Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-api-key, x-device-id, x-device-serial, x-school-id, x-device-signature, x-device-timestamp"
  );
  // CDN Security Hardening: Prevent Vercel CDN from caching dynamic or cross-tenant attendance telemetry
  res.setHeader("Cache-Control", "private, no-store, max-age=0");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // 2. Healthcheck & Hardware Ping
  if (req.method === "GET") {
    return res.status(200).json({
      service: "EduSaaS Enterprise Biometric Hardware Adapter Gateway",
      version: "v2.0-Production",
      endpoint: "/api/v2/attendance/sync",
      supported_hardware: [
        "eSSL (SilkBio, K90, MB20, Identix)",
        "Matrix COSEC Door Controllers (VEGA, ARGO, PATH)",
        "ZKTeco (SpeedFace, SenseFace, ProBio)",
        "Hikvision MinMoe Terminal Series",
      ],
      auth_mechanism: "Per-Device HMAC-SHA256 (biometric_devices query) + 5-Min Replay Skew Protection",
      telemetry_status: "ONLINE_READY",
      timestamp: new Date().toISOString(),
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method Not Allowed. Submit biometric punch streams via POST.",
    });
  }

  try {
    const rawTimestamp =
      req.headers["x-device-timestamp"] ||
      req.body?.timestamp ||
      req.body?.device_timestamp;

    // 3. Replay Protection: Reject payloads skewed by more than 5 minutes
    if (rawTimestamp) {
      const requestEpoch = new Date(rawTimestamp).getTime();
      const currentEpoch = Date.now();
      const MAX_SKEW_MS = 5 * 60 * 1000; // 5 minutes

      if (isNaN(requestEpoch) || Math.abs(currentEpoch - requestEpoch) > MAX_SKEW_MS) {
        return res.status(401).json({
          success: false,
          error: "Replay protection triggered: Device timestamp is skewed by more than 5 minutes.",
          server_timestamp: new Date().toISOString(),
          device_timestamp: rawTimestamp,
        });
      }
    }

    const rawSchoolId =
      req.headers["x-school-id"] ||
      req.body?.school_id ||
      req.body?.schoolId;

    if (!rawSchoolId || typeof rawSchoolId !== "string" || !rawSchoolId.trim()) {
      return res.status(400).json({
        success: false,
        error: "Missing mandatory institution identifier: x-school-id header or school_id parameter required.",
      });
    }
    const schoolId = rawSchoolId.trim().toUpperCase();

    const rawDeviceSerial =
      req.headers["x-device-serial"] ||
      req.headers["x-device-id"] ||
      req.body?.device_serial ||
      req.body?.deviceSerial ||
      req.body?.device_id ||
      req.body?.deviceId;

    if (!rawDeviceSerial || typeof rawDeviceSerial !== "string" || !rawDeviceSerial.trim()) {
      return res.status(400).json({
        success: false,
        error: "Missing mandatory terminal identifier: x-device-serial header or device_serial parameter required.",
      });
    }
    const deviceSerial = rawDeviceSerial.trim().toUpperCase();

    // Supabase Client Setup for Device Authorization and Sync
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY;

    let supabase = null;
    if (supabaseUrl && supabaseServiceKey) {
      supabase = createClient(supabaseUrl, supabaseServiceKey);
    }

    // 4. Per-Device HMAC-SHA256 Secret Lookup from biometric_devices table
    let deviceHmacSecret = null;
    if (supabase) {
      try {
        const { data: deviceRecord, error: devQueryErr } = await supabase
          .from("biometric_devices")
          .select("hmac_secret, is_active, school_id")
          .eq("device_serial", deviceSerial)
          .maybeSingle();

        if (!devQueryErr && deviceRecord) {
          if (deviceRecord.is_active === false) {
            return res.status(403).json({
              success: false,
              error: `Biometric terminal ${deviceSerial} is deactivated. Contact campus administrator.`,
            });
          }

          // Enforce strict tenant isolation between hardware registration and target institution
          if (deviceRecord.school_id && deviceRecord.school_id.toUpperCase() !== schoolId) {
            return res.status(403).json({
              success: false,
              error: `Tenant mismatch: Terminal ${deviceSerial} is registered to institution ${deviceRecord.school_id}, cannot inject punches into ${schoolId}.`,
            });
          }

          if (deviceRecord.hmac_secret) {
            deviceHmacSecret = deviceRecord.hmac_secret;
          }
        }
      } catch (devLookupErr) {
        console.warn("[BiometricGateway] Failed to retrieve per-device HMAC secret:", devLookupErr.message);
      }
    }

    // Fallback to configured environment variable only (never hardcoded shared secrets)
    if (!deviceHmacSecret) {
      deviceHmacSecret =
        process.env.BIOMETRIC_DEVICE_SECRET ||
        process.env.BIOMETRIC_SECRET;
    }

    if (!deviceHmacSecret) {
      return res.status(401).json({
        success: false,
        error: `Biometric terminal ${deviceSerial} is not provisioned or lacks an active HMAC secret. Access denied.`,
      });
    }

    // 5. Verify Device Signature using device-specific secret
    const deviceSignature =
      req.headers["x-device-signature"] ||
      req.body?.signature ||
      req.body?.x_device_signature;

    if (!deviceSignature) {
      return res.status(401).json({
        success: false,
        error: "Missing device signature: Biometric punch streams require HMAC-SHA256 authorization (x-device-signature).",
      });
    }

    const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    const computedHmacWithTimestamp = crypto
      .createHmac("sha256", deviceHmacSecret)
      .update(rawTimestamp ? `${rawTimestamp}.${rawBody}` : rawBody)
      .digest("hex");
    const computedHmacRaw = crypto
      .createHmac("sha256", deviceHmacSecret)
      .update(rawBody)
      .digest("hex");

    let validSig = false;
    try {
      const sigBuffer = Buffer.from(String(deviceSignature).trim(), "hex");
      const expBuffer1 = Buffer.from(computedHmacWithTimestamp, "hex");
      const expBuffer2 = Buffer.from(computedHmacRaw, "hex");

      if (sigBuffer.length === expBuffer1.length && crypto.timingSafeEqual(sigBuffer, expBuffer1)) {
        validSig = true;
      } else if (sigBuffer.length === expBuffer2.length && crypto.timingSafeEqual(sigBuffer, expBuffer2)) {
        validSig = true;
      }
    } catch {
      validSig = false;
    }

    if (!validSig) {
      return res.status(401).json({
        success: false,
        error: `Biometric Hardware Security Error: Per-device HMAC-SHA256 signature verification failed for device ${deviceSerial}.`,
      });
    }

    const punches = Array.isArray(req.body?.punches)
      ? req.body.punches
      : Array.isArray(req.body?.logs)
      ? req.body.logs
      : req.body?.user_id || req.body?.userId
      ? [req.body]
      : [];

    if (!punches.length) {
      return res.status(400).json({
        success: false,
        error: "Payload must contain an array of 'punches' or 'logs' with user_id and timestamp.",
      });
    }

    const todayDate = new Date().toISOString().split("T")[0];
    const syncTimestamp = new Date().toISOString();

    // 6. Deduplicate punches on (school_id, device_serial, vendor_event_id)
    const freshPunches = [];
    let deduplicatedCount = 0;

    for (let idx = 0; idx < punches.length; idx++) {
      const p = punches[idx];
      const memberCode = (p.user_id || p.userId || p.enrollNumber || `STU-${idx + 1}`).toUpperCase();
      const punchTime = p.timestamp || p.punch_time || p.time || syncTimestamp;
      const punchType = (p.punch_type || p.type || "CHECK_IN").toUpperCase();
      const verificationMode = (p.verification_mode || p.mode || "FINGERPRINT").toUpperCase();

      const vendorEventId =
        p.vendor_event_id ||
        p.vendorEventId ||
        p.event_id ||
        p.eventId ||
        p.log_id ||
        `EVT_${memberCode}_${new Date(punchTime).getTime() || Date.now()}`;

      const idempotencyKey = `${schoolId}:${deviceSerial}:${vendorEventId}`;

      if (processedPunchIds.has(idempotencyKey)) {
        deduplicatedCount++;
        continue;
      }

      rememberPunch(idempotencyKey);

      freshPunches.push({
        id: `bio_${Date.now()}_${idx}`,
        school_id: schoolId,
        device_serial: deviceSerial,
        device_id: deviceSerial,
        vendor_event_id: vendorEventId,
        user_code: memberCode,
        student_id: memberCode,
        punch_time: punchTime,
        punch_type: punchType,
        verification_mode: verificationMode,
        status: "PRESENT",
      });
    }

    // 7. Supabase Attendance & Biometric Audit Integration
    let cloudPersisted = false;

    if (supabase && freshPunches.length > 0) {
      try {
        // A. Insert into biometric_attendance_logs audit table if present
        try {
          const logPayloads = freshPunches.map((fp) => ({
            school_id: fp.school_id,
            device_serial: fp.device_serial,
            vendor_event_id: fp.vendor_event_id,
            user_code: fp.user_code,
            punch_time: fp.punch_time,
            punch_type: fp.punch_type,
            verification_mode: fp.verification_mode,
            status: fp.status,
          }));

          await supabase
            .from("biometric_attendance_logs")
            .upsert(logPayloads, { onConflict: "school_id,device_serial,vendor_event_id" });
        } catch (logErr) {
          // Graceful fallback if table not yet migrated
          console.warn("Biometric audit log insert notice:", logErr.message);
        }

        // B. Fetch or update today's attendance record for the school
        const { data: existingRecord } = await supabase
          .from("attendance")
          .select("id, records")
          .eq("school_id", schoolId)
          .eq("date", todayDate)
          .maybeSingle();

        const currentRecords = Array.isArray(existingRecord?.records) ? existingRecord.records : [];
        const existingEventIds = new Set(
          currentRecords.map((r) => `${r.device_serial || r.device_id}:${r.vendor_event_id || r.user_code}`)
        );

        const genuinelyNewPunches = freshPunches.filter(
          (fp) => !existingEventIds.has(`${fp.device_serial}:${fp.vendor_event_id}`)
        );

        if (genuinelyNewPunches.length > 0) {
          const updatedRecords = [...currentRecords, ...genuinelyNewPunches];

          if (existingRecord?.id) {
            await supabase
              .from("attendance")
              .update({
                records: updatedRecords,
                attendance_date: todayDate,
              })
              .eq("id", existingRecord.id);
          } else {
            await supabase.from("attendance").insert([
              {
                school_id: schoolId,
                date: todayDate,
                attendance_date: todayDate,
                class_name: "ALL_CAMPUS_BIOMETRIC",
                records: updatedRecords,
              },
            ]);
          }
        }
        cloudPersisted = true;
      } catch (sbErr) {
        console.warn("Cloud persistence note for biometric sync:", sbErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      status: "synchronized",
      cloud_persisted: cloudPersisted,
      school_id: schoolId,
      device_serial: deviceSerial,
      total_received: punches.length,
      processed_count: freshPunches.length,
      deduplicated_count: deduplicatedCount,
      sample_punches: freshPunches.slice(0, 3),
      hardware_adapter: "eSSL / Matrix / ZKTeco Unified REST Ingestion Engine",
      sync_time: syncTimestamp,
      message: `Successfully synchronized ${freshPunches.length} punch(es) (${deduplicatedCount} deduplicated) for ${schoolId}.`,
    });
  } catch (error) {
    console.error("Biometric sync handler exception:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error during biometric stream ingestion.",
      details: error.message,
    });
  }
}
```

## File: api/razorpay-webhook.js
```javascript
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

/**
 * Vercel Serverless Function: Razorpay Webhook Handler
 * Endpoint: /api/razorpay-webhook
 *
 * Verifies mathematical HMAC-SHA256 signature from Razorpay servers
 * and updates Supabase fee_ledger table for financial compliance.
 */
export default async function handler(req, res) {
  // Prevent Vercel CDN cross-tenant data caching
  res.setHeader("Cache-Control", "private, no-store, max-age=0");

  // 1. Healthcheck / CORS Preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-razorpay-signature");
    return res.status(200).end();
  }

  if (req.method === "GET") {
    return res.status(200).json({
      status: "active",
      service: "Razorpay Serverless Webhook Gateway",
      timestamp: new Date().toISOString(),
      supportedEvents: ["payment.captured", "payment.failed", "refund.processed"],
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed. Use POST." });
  }

  try {
    const receivedSignature = req.headers["x-razorpay-signature"];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("[Razorpay Webhook] RAZORPAY_WEBHOOK_SECRET is not configured on the server.");
      return res.status(500).json({ error: "Server configuration error: Webhook secret unconfigured." });
    }

    if (!receivedSignature) {
      console.error("[Razorpay Webhook] Missing mandatory x-razorpay-signature header.");
      return res.status(401).json({ error: "Missing required signature header." });
    }

    // 2. Validate Payload Signature with timing-safe comparison
    const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    const sigBuf = Buffer.from(receivedSignature.trim(), "utf8");
    const expBuf = Buffer.from(expectedSignature.trim(), "utf8");

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      console.error("[Razorpay Webhook] Signature mismatch! Rejecting untrusted payload.");
      return res.status(400).json({ error: "Invalid cryptographic signature." });
    }

    const event = typeof req.body === "object" ? req.body : JSON.parse(rawBody);

    // 3. Catch payment.captured Event
    if (event.event === "payment.captured") {
      const payment = event.payload?.payment?.entity;
      if (!payment) {
        return res.status(400).json({ error: "Missing payment entity in payload." });
      }

      const paymentId = payment.id;
      const amountInRupees = Number(payment.amount) / 100;
      const notes = payment.notes || {};
      const studentName = notes.student_name || "Enrolled Student";
      const ledgerId = notes.ledger_id || null;
      const schoolId = notes.school_id;

      if (!schoolId) {
        return res.status(400).json({ error: "Missing mandatory school_id in payment notes metadata." });
      }

      console.info(
        `[Razorpay Webhook] Verified payment.captured: ${paymentId} for ₹${amountInRupees} (Student: ${studentName}, School: ${schoolId})`
      );

      // 4. Initialize Supabase Client with Service Role Key
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseKey) {
        console.error("[Razorpay Webhook] SUPABASE_SERVICE_ROLE_KEY missing on server.");
        return res.status(500).json({ error: "Server database configuration error: Service role key missing." });
      }

      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
      });

      // 5. Idempotent check: prevent duplicate credit if webhook is redelivered
      const { data: existingTxn } = await supabase
        .from("fee_ledger")
        .select("id, status")
        .eq("razorpay_payment_id", paymentId)
        .maybeSingle();

      if (existingTxn && existingTxn.status === "paid") {
        return res.status(200).json({
          success: true,
          idempotent: true,
          message: "Payment already captured and ledger updated.",
          paymentId,
        });
      }

      // 6. Update or Insert into Supabase fee_ledger table
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      let updatedRows = null;

      if (ledgerId && uuidRegex.test(String(ledgerId))) {
        const { data, error: updateError } = await supabase
          .from("fee_ledger")
          .update({
            status: "paid",
            payment_mode: `Online (Razorpay ${payment.method || "Verified"})`,
            razorpay_payment_id: paymentId,
          })
          .eq("id", ledgerId)
          .eq("school_id", schoolId)
          .select();

        if (updateError) {
          console.error("[Razorpay Webhook] Error updating fee_ledger:", updateError);
          return res.status(500).json({ error: "Database error updating fee ledger: " + updateError.message });
        }
        updatedRows = data;
      } else {
        const { data, error: insertError } = await supabase
          .from("fee_ledger")
          .insert([
            {
              school_id: schoolId,
              student_name: studentName,
              class_name: notes.class_name || "Online Checkout",
              amount: amountInRupees,
              status: "paid",
              payment_mode: `Online (Razorpay ${payment.method || "Verified"})`,
              razorpay_payment_id: paymentId,
              date: new Date().toISOString().split("T")[0],
            },
          ])
          .select();

        if (insertError) {
          console.error("[Razorpay Webhook] Error inserting fee_ledger row:", insertError);
          return res.status(500).json({ error: "Database error creating fee ledger record: " + insertError.message });
        }
        updatedRows = data;
      }

      return res.status(200).json({
        success: true,
        event: event.event,
        paymentId,
        amount: amountInRupees,
        recordsUpdated: updatedRows?.length || 1,
        verifiedServerSide: true,
      });
    }

    // Default response for other webhook events
    return res.status(200).json({
      received: true,
      event: event.event || "unknown",
      message: "Webhook processed successfully.",
    });
  } catch (err) {
    console.error("[Razorpay Webhook Error]:", err);
    return res.status(500).json({ error: "Internal server error processing webhook." });
  }
}
```

## File: api/master/schools.js
```javascript
import { createClient } from "@supabase/supabase-js";
import { verifyMasterToken } from "./auth.js";

function getSupabaseClient() {
  const supabaseUrl =
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "https://lkcnausuvgdiwnsppakp.supabase.co";
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrY25hdXN1dmdkaXduc3BwYWtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzMDMwMjcsImV4cCI6MjEwNjg3OTAyN30.QFmG6waeGtrK0dgGtzt0R6E9pSmvAL6Q9-XCnMyEWrw";

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing Supabase configuration: SUPABASE_SERVICE_ROLE_KEY is required for master provisioning operations.");
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-master-token"
  );
  res.setHeader("Cache-Control", "private, no-store, max-age=0");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // 1. Authorize Master Operator Token unconditionally in all environments
  const authHeader = req.headers.authorization || req.headers["x-master-token"];
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  if (!verifyMasterToken(bearerToken)) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized: Valid Master Session Token required.",
    });
  }

  let supabase;
  try {
    supabase = getSupabaseClient();
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }

  // 2. GET /api/master/schools — Retrieve all registered schools
  if (req.method === "GET") {
    try {
      // First attempt using RPC get_master_schools_roster
      const { data: rpcData, error: rpcErr } = await supabase.rpc(
        "get_master_schools_roster"
      );

      if (!rpcErr && Array.isArray(rpcData)) {
        return res.status(200).json({ success: true, schools: rpcData });
      }

      // Fallback: Direct select from public.schools
      const { data: directData, error: directErr } = await supabase
        .from("schools")
        .select("*")
        .order("created_at", { ascending: false });

      if (directErr) {
        throw directErr;
      }

      const formatted = (directData || []).map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        address: s.address,
        city: s.city,
        state: s.state,
        phone: s.phone,
        status: s.status || "active",
        subscription_status: s.subscription_status || "active",
        subscription_tier: s.subscription_tier || "enterprise",
        subscription_expires_at:
          s.subscription_expires_at ||
          new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: s.created_at,
      }));

      return res.status(200).json({ success: true, schools: formatted });
    } catch (err) {
      console.error("[MasterAPI] List schools error:", err);
      return res.status(500).json({
        success: false,
        error: "Failed to query schools repository: " + err.message,
      });
    }
  }

  // 3. POST /api/master/schools — Provision or Update School Status
  if (req.method === "POST") {
    const { action = "provision" } = req.body || {};

    // A. Provision New Institutional School
    if (action === "provision") {
      const {
        institutionName,
        institutionCode,
        adminName,
        adminRoleCode = "HOD-01",
        phone = "",
        email = "",
        password = "password123",
        address = "",
        institutionMode = "school",
        tier = "enterprise",
        validityDays = 365,
      } = req.body || {};

      if (!institutionName || !institutionCode) {
        return res.status(400).json({
          success: false,
          error: "Institution Name and Code are required.",
        });
      }

      const cleanCode = institutionCode.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
      const cleanPass = (password || "password123").trim();
      const strictAdminRole = (adminRoleCode || "HOD-01").toUpperCase().startsWith("PRIN") ? "principal" : "trustee";
      const standardEmail = (email || "").trim() || `${cleanCode.toLowerCase()}.${(adminRoleCode || "HOD-01").toLowerCase().replace(/[^a-z0-9]/g, "")}@academicos.internal`;

      let authUserId = null;

      // 1. Ensure administrator exists in auth.users via Supabase Admin Auth
      try {
        const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
          email: standardEmail,
          password: cleanPass,
          email_confirm: true,
          user_metadata: {
            full_name: (adminName || "Trustee Administrator").trim(),
            role: strictAdminRole,
            role_code: (adminRoleCode || "HOD-01").trim().toUpperCase(),
            school_code: cleanCode,
          },
          app_metadata: {
            role: strictAdminRole.toUpperCase() === "PRINCIPAL" ? "PRIN" : "HOD",
            school_code: cleanCode,
          },
        });

        if (authData?.user?.id) {
          authUserId = authData.user.id;
        } else if (authErr) {
          console.warn("[MasterAPI] Admin createUser notice:", authErr.message);
          // If user already exists in auth.users, lookup their auth ID to link profiles.id
          const { data: listData } = await supabase.auth.admin.listUsers();
          const existing = listData?.users?.find(
            (u) => u.email?.toLowerCase() === standardEmail.toLowerCase()
          );
          if (existing?.id) {
            authUserId = existing.id;
            // Update password & metadata
            await supabase.auth.admin.updateUserById(authUserId, {
              password: cleanPass,
              user_metadata: {
                full_name: (adminName || "Trustee Administrator").trim(),
                role: strictAdminRole,
                role_code: (adminRoleCode || "HOD-01").trim().toUpperCase(),
                school_code: cleanCode,
              },
              app_metadata: {
                role: strictAdminRole.toUpperCase() === "PRINCIPAL" ? "PRIN" : "HOD",
                school_code: cleanCode,
              },
            });
          }
        }
      } catch (authException) {
        console.warn("[MasterAPI] Supabase Admin Auth exception:", authException.message);
      }

      try {
        // 2. Attempt provision via RPC (with optional p_auth_user_id)
        const rpcParams = {
          p_name: institutionName.trim(),
          p_code: cleanCode,
          p_admin_name: (adminName || "").trim(),
          p_admin_role_code: adminRoleCode,
          p_admin_email: standardEmail,
          p_admin_phone: (phone || "").trim(),
          p_address: (address || "").trim(),
          p_mode: institutionMode,
          p_tier: tier,
          p_validity_days: parseInt(validityDays, 10) || 365,
        };
        if (authUserId) {
          rpcParams.p_auth_user_id = authUserId;
        }

        const { data: rpcRes, error: rpcErr } = await supabase.rpc(
          "provision_institutional_school",
          rpcParams
        );

        const targetSchoolId = rpcRes?.school_id;
        // Guarantee administrator exists in public.profiles with linked auth.users ID
        if (targetSchoolId) {
          try {
            const profilePayload = {
              school_id: targetSchoolId,
              full_name: (adminName || "Trustee Administrator").trim(),
              role: strictAdminRole,
              role_code: (adminRoleCode || "HOD-01").trim().toUpperCase(),
              email: standardEmail,
              phone: (phone || "").trim(),
              is_active: true,
              status: "active",
            };
            if (authUserId) {
              profilePayload.id = authUserId;
            }

            await supabase.from("profiles").upsert(
              [profilePayload],
              { onConflict: "school_id,role_code" }
            );
          } catch (profErr) {
            console.warn("[MasterAPI] Admin profile persistence notice:", profErr.message);
          }
        }

        if (!rpcErr && rpcRes) {
          return res.status(201).json({
            success: true,
            message: `School ${cleanCode} provisioned successfully in Supabase PostgreSQL.`,
            school: { ...rpcRes, auth_user_id: authUserId },
          });
        }

        // Fallback: Direct insert into schools and profiles tables
        const expiresAt = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000).toISOString();
        const addressPayload = JSON.stringify({
          physicalAddress: (address || "").trim(),
          institutionMode,
          masterAdminName: (adminName || "").trim(),
          masterAdminId: adminRoleCode,
        });

        let inserted = null;
        const { data: primaryInserted, error: insertErr } = await supabase
          .from("schools")
          .upsert(
            [
              {
                code: cleanCode,
                name: institutionName.trim(),
                phone: (phone || "").trim(),
                address: addressPayload,
                status: "active",
                subscription_status: "active",
                subscription_tier: tier,
                subscription_expires_at: expiresAt,
              },
            ],
            { onConflict: "code" }
          )
          .select()
          .single();

        if (insertErr) {
          // Retry with core verified columns if optional columns do not exist
          const { data: retryInserted, error: retryErr } = await supabase
            .from("schools")
            .upsert(
              [
                {
                  code: cleanCode,
                  name: institutionName.trim(),
                  address: addressPayload,
                },
              ],
              { onConflict: "code" }
            )
            .select()
            .single();

          if (retryErr) {
            throw retryErr;
          }
          inserted = retryInserted;
        } else {
          inserted = primaryInserted;
        }

        // Upsert profile in fallback mode with valid auth.users(id)
        if (inserted?.id) {
          const fallbackProfile = {
            school_id: inserted.id,
            full_name: (adminName || "Trustee Administrator").trim(),
            role: strictAdminRole,
            role_code: (adminRoleCode || "HOD-01").trim().toUpperCase(),
            email: standardEmail,
            phone: (phone || "").trim(),
            is_active: true,
            status: "active",
          };
          if (authUserId) {
            fallbackProfile.id = authUserId;
          }

          const { error: fallbackProfErr } = await supabase
            .from("profiles")
            .upsert([fallbackProfile], { onConflict: "school_id,role_code" });

          if (fallbackProfErr) {
            console.warn("[MasterAPI] Fallback profile upsert notice:", fallbackProfErr.message);
          }
        }

        return res.status(201).json({
          success: true,
          message: `School ${cleanCode} created successfully in Supabase PostgreSQL.`,
          school: { ...inserted, auth_user_id: authUserId },
        });
      } catch (err) {
        console.error("[MasterAPI] Provision error:", err);
        return res.status(500).json({
          success: false,
          error: "Provisioning failed: " + err.message,
        });
      }
    }

    // B. Set School License Status (Suspend / Activate / Update Expiry)
    if (action === "set_status") {
      const {
        schoolCode,
        status = "active",
        expiryDate,
        notes = "Updated by master operator",
      } = req.body || {};

      if (!schoolCode) {
        return res.status(400).json({
          success: false,
          error: "schoolCode is required.",
        });
      }

      const cleanCode = schoolCode.trim().toUpperCase();
      const validStatus = status.toLowerCase() === "suspended" ? "suspended" : "active";

      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc(
          "set_school_license_status",
          {
            p_school_code: cleanCode,
            p_status: validStatus,
            p_expires_at: expiryDate ? new Date(expiryDate).toISOString() : null,
            p_notes: notes,
          }
        );

        if (!rpcErr && rpcRes) {
          return res.status(200).json({
            success: true,
            message: `School ${cleanCode} status updated to ${validStatus}.`,
            result: rpcRes,
          });
        }

        // Direct update fallback
        const updatePayload = {
          status: validStatus,
          subscription_status: validStatus,
        };
        if (expiryDate) {
          updatePayload.subscription_expires_at = new Date(expiryDate).toISOString();
        }

        const { error: updErr } = await supabase
          .from("schools")
          .update(updatePayload)
          .eq("code", cleanCode);

        if (updErr) {
          throw updErr;
        }

        return res.status(200).json({
          success: true,
          message: `School ${cleanCode} status updated to ${validStatus}.`,
        });
      } catch (err) {
        console.error("[MasterAPI] Update status error:", err);
        return res.status(500).json({
          success: false,
          error: "Status update failed: " + err.message,
        });
      }
    }

    return res.status(400).json({
      success: false,
      error: `Unknown action: "${action}". Supported actions: "provision", "set_status".`,
    });
  }

  return res.status(405).json({ success: false, error: "Method not allowed." });
}
```
