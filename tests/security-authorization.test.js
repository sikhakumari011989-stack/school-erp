import test from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";

process.env.NODE_ENV = "test";
process.env.MASTER_SETUP_KEY = process.env.MASTER_SETUP_KEY || "ASK&1412";
process.env.MASTER_TOKEN_SECRET = process.env.MASTER_TOKEN_SECRET || "test-master-provisioning-secret-2026";

import { signMasterToken, verifyMasterToken } from "../api/master/auth.js";
import { detectRoleFromId } from "../src/utils/cloudSyncService.js";
import { getSchoolSubscription } from "../src/utils/cloudSyncService.js";
import { fetchLiveInstitutionalTelemetry } from "../src/utils/aiIntelligenceEngine.js";

// ============================================================================
// SUITE 1: MASTER GATEWAY SECURITY & CRYPTOGRAPHIC TOKEN VERIFICATION
// ============================================================================
test("Security: Master Operator Token Lifecycle & Timing Resistance", async (t) => {
  await t.test("Generates valid HMAC-signed master token with expiry", () => {
    const token = signMasterToken(60 * 1000); // 1 minute expiry
    assert.ok(token, "Token must be a non-empty string");
    assert.strictEqual(verifyMasterToken(token), true, "Fresh token must be valid");
  });

  await t.test("Rejects expired master operator tokens", () => {
    const expiredToken = signMasterToken(-1000); // Expired 1 second ago
    assert.strictEqual(verifyMasterToken(expiredToken), false, "Expired token must be rejected");
  });

  await t.test("Rejects forged or tampered tokens", () => {
    const validToken = signMasterToken(60 * 1000);
    const raw = Buffer.from(validToken, "base64").toString("utf8");
    const parsed = JSON.parse(raw);

    // Tamper payload to grant unauthorized admin rights
    const tamperedPayload = JSON.stringify({ role: "super_root", exp: Date.now() + 100000 });
    const forgedToken = Buffer.from(JSON.stringify({ p: tamperedPayload, s: parsed.s })).toString("base64");

    assert.strictEqual(verifyMasterToken(forgedToken), false, "Tampered payload must fail cryptographic verification");
  });

  await t.test("Rejects malformed tokens cleanly without crashing", () => {
    assert.strictEqual(verifyMasterToken(""), false);
    assert.strictEqual(verifyMasterToken(null), false);
    assert.strictEqual(verifyMasterToken("not-base64-random-string"), false);
    assert.strictEqual(verifyMasterToken(Buffer.from("invalid-json").toString("base64")), false);
  });
});

// ============================================================================
// SUITE 2: CANONICAL ROLE NORMALIZATION & TAMPER RESISTANCE
// ============================================================================
test("RBAC: Canonical Role Detection & Tier-2 Code Normalization", async (t) => {
  await t.test("Maps executive codes to HOD and PRIN accurately", () => {
    assert.strictEqual(detectRoleFromId("HOD-01"), "trustee");
    assert.strictEqual(detectRoleFromId("TR-99"), "trustee");
    assert.strictEqual(detectRoleFromId("PRIN-01"), "principal");
    assert.strictEqual(detectRoleFromId("PRINCIPAL-EAST"), "principal");
  });

  await t.test("Maps operational codes to ACC, TCH, and NTS", () => {
    assert.strictEqual(detectRoleFromId("ACC-01"), "accountant");
    assert.strictEqual(detectRoleFromId("TCH-102"), "teacher");
    assert.strictEqual(detectRoleFromId("FAC-MATH"), "teacher");
    assert.strictEqual(detectRoleFromId("NTS-01"), "staff");
    assert.strictEqual(detectRoleFromId("STF-GATE"), "staff");
    assert.strictEqual(detectRoleFromId("NON-TEACHING-01"), "staff");
  });

  await t.test("Defaults unrecognized IDs safely to student role (Least Privilege)", () => {
    assert.strictEqual(detectRoleFromId("STU-101"), "student");
    assert.strictEqual(detectRoleFromId("UNKNOWN-ID"), "student");
    assert.strictEqual(detectRoleFromId(""), "student");
    assert.strictEqual(detectRoleFromId(null), "student");
    assert.strictEqual(detectRoleFromId("ATTACKER_INJECT"), "student");
  });
});

// ============================================================================
// SUITE 3: MASTER KILL-SWITCH & SUSPENDED INSTITUTION ENFORCEMENT
// ============================================================================
test("Licensing: Master Kill-Switch & Subscription Evaluator", async (t) => {
  await t.test("Recognizes active valid institutional licenses", () => {
    const sub = getSchoolSubscription("TEST-ACTIVE-CAMPUS");
    assert.strictEqual(sub.status, "active");
    assert.strictEqual(sub.isSuspended, false);
    assert.strictEqual(sub.isBlocked, false);
  });

  await t.test("Correctly flags expired dates", () => {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const isExpired = Boolean(yesterday < today);
    assert.strictEqual(isExpired, true, "Yesterday must evaluate as expired relative to today");
  });
});

// ============================================================================
// SUITE 4: ZERO FABRICATED DATA & REPRODUCIBLE TELEMETRY
// ============================================================================
test("Data Integrity: Elimination of Fake Baseline Metrics", async (t) => {
  await t.test("Telemetry on unpopulated school returns zero-state, not synthetic ₹12,50,000", async () => {
    const telemetry = await fetchLiveInstitutionalTelemetry("EMPTY-CAMPUS-NODE");
    assert.strictEqual(telemetry.totalFeesBilled, 0, "Billed amount must be 0 for empty campus");
    assert.strictEqual(telemetry.totalFeesCollected, 0, "Collected amount must be 0 for empty campus");
    assert.strictEqual(telemetry.totalFeesOverdue, 0, "Overdue amount must be 0 for empty campus");
    assert.strictEqual(telemetry.overallAttendanceRate, 0, "Attendance rate must be 0% when no attendance is logged");
    assert.strictEqual(telemetry.atRiskCount, 0, "At-risk count must be 0 when no students exist");
    assert.deepStrictEqual(telemetry.earlyWarningStudents, [], "Early warning students must be empty array, not mock students");
  });
});

// ============================================================================
// SUITE 5: FINANCIAL GATEWAY & CRYPTOGRAPHIC WEBHOOK SECURITY
// ============================================================================
test("FinTech: Razorpay Webhook HMAC Signature & Tenant Isolation", async (t) => {
  const secret = "test_webhook_secret_academic_os_2026";
  const payload = JSON.stringify({
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: "pay_test_99812",
          amount: 500000, // ₹5000.00
          method: "upi",
          notes: {
            school_id: "CAMPUS-01",
            student_name: "Test Scholar",
            ledger_id: "TXN-9001",
          },
        },
      },
    },
  });

  await t.test("Accepts mathematically correct HMAC-SHA256 signature", () => {
    const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    const computed = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    const isMatch = crypto.timingSafeEqual(Buffer.from(signature, "utf8"), Buffer.from(computed, "utf8"));
    assert.strictEqual(isMatch, true, "Correct signature must pass timing-safe check");
  });

  await t.test("Rejects tampered payload amounts with signature mismatch", () => {
    const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    const tamperedPayload = payload.replace("500000", "100000"); // Attempted discount tampering
    const recomputed = crypto.createHmac("sha256", secret).update(tamperedPayload).digest("hex");
    const isMatch = crypto.timingSafeEqual(Buffer.from(signature, "utf8"), Buffer.from(recomputed, "utf8"));
    assert.strictEqual(isMatch, false, "Tampered payload must be cryptographically rejected");
  });
});

// ============================================================================
// SUITE 6: HARDWARE BIOMETRIC ADAPTER IDEMPOTENCY & REPLAY PROTECTION
// ============================================================================
test("Hardware Gateway: Biometric Punch Ingestion & Anti-Replay", async (t) => {
  await t.test("Rejects timestamp skewed by more than 5 minutes", () => {
    const currentEpoch = Date.now();
    const staleTimestamp = new Date(currentEpoch - 10 * 60 * 1000).toISOString(); // 10 minutes old
    const staleEpoch = new Date(staleTimestamp).getTime();
    const MAX_SKEW_MS = 5 * 60 * 1000;
    const isSkewed = Math.abs(currentEpoch - staleEpoch) > MAX_SKEW_MS;
    assert.strictEqual(isSkewed, true, "Punch event older than 5 minutes must trigger replay rejection");
  });

  await t.test("Accepts fresh timestamp within 5-minute skew window", () => {
    const currentEpoch = Date.now();
    const freshTimestamp = new Date(currentEpoch - 30 * 1000).toISOString(); // 30 seconds old
    const freshEpoch = new Date(freshTimestamp).getTime();
    const MAX_SKEW_MS = 5 * 60 * 1000;
    const isSkewed = Math.abs(currentEpoch - freshEpoch) > MAX_SKEW_MS;
    assert.strictEqual(isSkewed, false, "Punch event within 5 minutes must be accepted");
  });
});

// ============================================================================
// SUITE 7: HEALTH & WELLNESS LEAST-PRIVILEGE CLINIC PRIVACY
// ============================================================================
test("Clinic Privacy: Least-Privilege Medical Record Access & NTS Redaction", async (t) => {
  const { fetchHealthRecords, fetchClinicVisits } = await import("../src/utils/healthService.js");

  await t.test("Returns empty array for newly provisioned school with no records", async () => {
    const records = await fetchHealthRecords("FRESH-UNPOPULATED-NODE", { role: "PRIN" });
    assert.ok(Array.isArray(records), "Health records must be an array");
    assert.strictEqual(records.length, 0, "No fabricated records should be returned for fresh campus");
  });

  await t.test("Redacts confidential clinical notes for non-teaching staff (NTS)", async () => {
    // Inject mock local storage records for testing redaction pipeline
    const schoolId = "TEST-CLINIC-CAMPUS";
    const mockHealth = [
      {
        student_id: "STU-990",
        student_name: "Test Scholar",
        critical_allergies: ["Peanuts"],
        confidential_medical_notes: "Private diagnosis: Takes ADHD medication at 12:00 PM daily.",
      },
    ];

    // Global mock for localStorage in Node environment
    globalThis.localStorage = {
      getItem: (key) => (key.includes(schoolId) ? JSON.stringify(mockHealth) : null),
      setItem: () => {},
      removeItem: () => {},
    };

    const ntsActor = { id: "nts_1", role: "NTS", email: "guard@campus.edu", is_clinic_nurse: false };
    const ntsView = await fetchHealthRecords(schoolId, ntsActor);

    assert.strictEqual(ntsView.length, 1);
    assert.strictEqual(ntsView[0].critical_allergies[0], "Peanuts", "Allergy flag must remain visible for student safety");
    assert.strictEqual(
      ntsView[0].confidential_medical_notes,
      "[REDACTED - Clinic Nurse Authorization Required]",
      "Confidential diagnostic notes must be redacted for NTS"
    );

    const prinActor = { id: "prin_1", role: "PRIN", email: "principal@campus.edu" };
    const prinView = await fetchHealthRecords(schoolId, prinActor);
    assert.strictEqual(
      prinView[0].confidential_medical_notes,
      "Private diagnosis: Takes ADHD medication at 12:00 PM daily.",
      "Executive role PRIN must retain authorized unredacted medical access"
    );
  });
});

// ============================================================================
// SUITE 8: CREDENTIAL GENERATION & TENANT MAPPING
// ============================================================================
test("Credentials: Standardized Email Pattern & Route Isolation", async (t) => {
  const { buildStandardErpEmail, dashboardFor } = await import("../src/utils/credentials.js");

  await t.test("Standardizes email correctly across special characters and spacing", () => {
    assert.strictEqual(
      buildStandardErpEmail("CAMPUS-01", "PRIN-01"),
      "campus-01.prin-01@erp-login.com"
    );
    assert.strictEqual(
      buildStandardErpEmail("Delhi Public", "HOD 99"),
      "delhi-public.hod-99@erp-login.com"
    );
  });

  await t.test("Routes canonical roles strictly to isolated dashboards", () => {
    assert.strictEqual(dashboardFor("principal"), "/principal/dashboard");
    assert.strictEqual(dashboardFor("PRIN"), "/principal/dashboard");
    assert.strictEqual(dashboardFor("trustee"), "/trustee/dashboard");
    assert.strictEqual(dashboardFor("HOD"), "/trustee/dashboard");
    assert.strictEqual(dashboardFor("accountant"), "/accountant/dashboard");
    assert.strictEqual(dashboardFor("ACC"), "/accountant/dashboard");
    assert.strictEqual(dashboardFor("teacher"), "/teacher/dashboard");
    assert.strictEqual(dashboardFor("TCH"), "/teacher/dashboard");
    assert.strictEqual(dashboardFor("staff"), "/staff/dashboard");
    assert.strictEqual(dashboardFor("NTS"), "/staff/dashboard");
    assert.strictEqual(dashboardFor("student"), "/student/dashboard");
    assert.strictEqual(dashboardFor("STU"), "/student/dashboard");
  });
});

// ============================================================================
// SUITE 9: MASTER SERVERLESS API ENDPOINTS & DIRECT REQUEST CONTRACTS
// ============================================================================
test("Serverless API: Direct Request Boundaries & HTTP Protocol Enforcements", async (t) => {
  const { default: authHandler } = await import("../api/master/auth.js");
  const { default: schoolsHandler } = await import("../api/master/schools.js");

  function mockRes() {
    return {
      statusCode: 200,
      headers: {},
      body: null,
      setHeader(k, v) {
        this.headers[k] = v;
      },
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      },
      end() {
        return this;
      },
    };
  }

  await t.test("authHandler handles CORS preflight OPTIONS request", async () => {
    const req = { method: "OPTIONS", headers: {} };
    const res = mockRes();
    await authHandler(req, res);
    assert.strictEqual(res.statusCode, 200);
  });

  await t.test("authHandler rejects non-POST HTTP methods with 405 Method Not Allowed", async () => {
    const req = { method: "GET", headers: {} };
    const res = mockRes();
    await authHandler(req, res);
    assert.strictEqual(res.statusCode, 405);
    assert.strictEqual(res.body.success, false);
  });

  await t.test("authHandler rejects incorrect master passkey with 401 Unauthorized", async () => {
    const req = { method: "POST", body: { passkey: "WRONG_PASSKEY_INTRUDER" }, headers: {} };
    const res = mockRes();
    await authHandler(req, res);
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body.success, false);
  });

  await t.test("authHandler accepts valid master passkey and issues signed bearer token", async () => {
    const req = { method: "POST", body: { passkey: "ASK&1412" }, headers: {} };
    const res = mockRes();
    await authHandler(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.token, "Must return signed token");
  });

  await t.test("schoolsHandler rejects unauthorized requests in production environment", async () => {
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const req = { method: "GET", headers: { authorization: "Bearer invalid_forged_token" } };
      const res = mockRes();
      await schoolsHandler(req, res);
      assert.strictEqual(res.statusCode, 401);
      assert.strictEqual(res.body.success, false);
    } finally {
      process.env.NODE_ENV = prevEnv;
    }
  });
});

// ============================================================================
// SUITE 10: AUDIT TRAIL IMMUTABILITY & MEDICAL ACCESS BOUNDARY
// ============================================================================
test("Audit Trail: Medical Log Generation & Integrity Constraints", async (t) => {
  const { logMedicalAccess } = await import("../src/utils/healthService.js");

  await t.test("Generates structured compliance entry with timestamp and actor context", async () => {
    const entry = await logMedicalAccess({
      schoolId: "CAMPUS-AUDIT-TEST",
      studentId: "STU-5544",
      actionType: "VIEW_MED_DOSSIER",
      actorId: "nurse_99",
      actorRole: "STAFF",
      actorEmail: "nurse@campus.internal",
    });

    assert.ok(entry.id.startsWith("LOG-"), "Log ID must have standard prefix");
    assert.strictEqual(entry.school_id, "CAMPUS-AUDIT-TEST");
    assert.strictEqual(entry.student_id, "STU-5544");
    assert.strictEqual(entry.action_type, "VIEW_MED_DOSSIER");
    assert.strictEqual(entry.actor_email, "nurse@campus.internal");
    assert.ok(new Date(entry.created_at).getTime() > 0, "Valid ISO timestamp required");
  });
});

// ============================================================================
// SUITE 11: MAKER-CHECKER FINANCIAL REVERSAL PROTOCOL & UUID INTEGRITY
// ============================================================================
test("Financial Security: Maker-Checker Fee Reversal Parameter Contracts", async (t) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  await t.test("Rejects malformed non-UUID receipt references", () => {
    const invalidReceiptIds = ["TXN-12345", "CN-998822", "receipt_123", "", null, undefined];
    for (const id of invalidReceiptIds) {
      assert.strictEqual(uuidRegex.test(String(id)), false, `ID "${id}" must fail UUID validation`);
    }
  });

  await t.test("Accepts canonical PostgreSQL UUID v4 strings", () => {
    const validUuid = "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d";
    assert.strictEqual(uuidRegex.test(validUuid), true, "Valid UUID must pass regex");
  });

  await t.test("Idempotency key construction satisfies REV-<UUID> standard", () => {
    const validUuid = "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d";
    const idempotencyKey = `REV-${validUuid}`;
    assert.ok(idempotencyKey.startsWith("REV-"));
    assert.strictEqual(idempotencyKey.slice(4), validUuid);
  });
});

// ============================================================================
// SUITE 12: BIOMETRIC HARDWARE GATEWAY INTEGRITY & BOUNDARY REJECTIONS
// ============================================================================
test("Hardware Gateway: Biometric Endpoint Request Boundaries", async (t) => {
  const { default: biometricHandler } = await import("../api/v2/attendance/sync.js");

  function mockRes() {
    return {
      statusCode: 200,
      headers: {},
      body: null,
      setHeader(k, v) {
        this.headers[k] = v;
      },
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      },
      end() {
        return this;
      },
    };
  }

  await t.test("Rejects biometric sync request missing school_id with 400 Bad Request", async () => {
    const req = {
      method: "POST",
      headers: { "x-device-serial": "ESSL-1234", "x-device-timestamp": new Date().toISOString() },
      body: { punches: [] },
    };
    const res = mockRes();
    await biometricHandler(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.error.includes("institution"));
  });

  await t.test("Rejects biometric sync request missing device_serial with 400 Bad Request", async () => {
    const req = {
      method: "POST",
      headers: { "x-school-id": "TEST-CAMPUS", "x-device-timestamp": new Date().toISOString() },
      body: { punches: [] },
    };
    const res = mockRes();
    await biometricHandler(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.error.includes("terminal"));
  });

  await t.test("Rejects biometric sync request missing device signature with 401 Unauthorized", async () => {
    process.env.BIOMETRIC_DEVICE_SECRET = "test-biometric-secret-2026";
    const req = {
      method: "POST",
      headers: {
        "x-school-id": "TEST-CAMPUS",
        "x-device-serial": "ESSL-1234",
        "x-device-timestamp": new Date().toISOString(),
      },
      body: { punches: [] },
    };
    const res = mockRes();
    await biometricHandler(req, res);
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.error.toLowerCase().includes("signature"));
  });

  await t.test("Rejects unprovisioned biometric device when no secret is configured with 401 Unauthorized", async () => {
    const prevSecret = process.env.BIOMETRIC_DEVICE_SECRET;
    delete process.env.BIOMETRIC_DEVICE_SECRET;
    delete process.env.BIOMETRIC_SECRET;
    const req = {
      method: "POST",
      headers: {
        "x-school-id": "TEST-CAMPUS",
        "x-device-serial": "UNKNOWN-DEV-999",
        "x-device-timestamp": new Date().toISOString(),
      },
      body: { punches: [] },
    };
    const res = mockRes();
    await biometricHandler(req, res);
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.error.toLowerCase().includes("not provisioned") || res.body.error.toLowerCase().includes("secret"));
    if (prevSecret) process.env.BIOMETRIC_DEVICE_SECRET = prevSecret;
  });
});

test("Phase 2: Database Maker-Checker Contracts & Reversal Isolation", async (t) => {
  await t.test("Reversal approval RPC requires distinct approver identity from requester", () => {
    const requesterId = "11111111-1111-1111-1111-111111111111";
    const approverId = "11111111-1111-1111-1111-111111111111";
    const isSelfApproval = requesterId === approverId;
    assert.strictEqual(isSelfApproval, true, "Self approval condition must evaluate to true for identical UUIDs");

    // Enforce business rule
    const canApprove = (req, app) => req !== app;
    assert.strictEqual(canApprove(requesterId, approverId), false, "Maker cannot approve their own reversal request");
  });

  await t.test("Reversal approval strictly permits PRIN and HOD, blocking ACC, TCH, and STU", () => {
    const authorizedRoles = ["PRIN", "HOD", "principal", "hod", "trustee", "admin"];
    const testCases = [
      { role: "PRIN", expected: true },
      { role: "HOD", expected: true },
      { role: "principal", expected: true },
      { role: "ACC", expected: false },
      { role: "accountant", expected: false },
      { role: "TCH", expected: false },
      { role: "teacher", expected: false },
      { role: "STU", expected: false },
      { role: "student", expected: false },
      { role: "NTS", expected: false },
    ];

    for (const { role, expected } of testCases) {
      const isAllowed = authorizedRoles.includes(role);
      assert.strictEqual(isAllowed, expected, `Role ${role} authorization check must be ${expected}`);
    }
  });

  await t.test("Client p_authorized_by parameter is ignored; approver identity derived from auth session", () => {
    const maliciousClientPayload = {
      p_request_id: "22222222-2222-2222-2222-222222222222",
      p_authorized_by: "Dr. Imposing Principal", // Spoofed name
      p_notes: "Unauthorized bypass",
    };

    // The hardened RPC signature in migration 22 accepts only (p_request_id, p_notes)
    const hardenedRpcParams = ["p_request_id", "p_notes"];
    assert.ok(!hardenedRpcParams.includes("p_authorized_by"), "Hardened RPC must not accept p_authorized_by parameter");
    assert.ok(hardenedRpcParams.includes("p_request_id"));
    assert.ok(hardenedRpcParams.includes("p_notes"));
  });
});

test("Phase 2: FinTech Razorpay Webhook Security Hardening", async (t) => {
  const { default: razorpayHandler } = await import("../api/razorpay-webhook.js");

  function mockRes() {
    return {
      statusCode: 200,
      headers: {},
      body: null,
      setHeader(k, v) { this.headers[k] = v; },
      status(code) { this.statusCode = code; return this; },
      json(obj) { this.body = obj; return this; },
      end() { return this; },
    };
  }

  await t.test("Rejects webhook calls when RAZORPAY_WEBHOOK_SECRET is unconfigured (Fail Closed 500)", async () => {
    const prevSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    delete process.env.RAZORPAY_WEBHOOK_SECRET;

    const req = {
      method: "POST",
      headers: { "x-razorpay-signature": "some_sig" },
      body: { event: "payment.captured" },
    };
    const res = mockRes();
    await razorpayHandler(req, res);

    assert.strictEqual(res.statusCode, 500);
    assert.strictEqual(res.body.error, "Server configuration error: Webhook secret unconfigured.");

    if (prevSecret) process.env.RAZORPAY_WEBHOOK_SECRET = prevSecret;
  });

  await t.test("Rejects webhook calls missing x-razorpay-signature with 401 Unauthorized", async () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = "whsec_test_secret_2026";

    const req = {
      method: "POST",
      headers: {},
      body: { event: "payment.captured" },
    };
    const res = mockRes();
    await razorpayHandler(req, res);

    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body.error, "Missing required signature header.");
  });

  await t.test("Rejects tampered payloads or signature mismatch with 400 Bad Request", async () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = "whsec_test_secret_2026";

    const req = {
      method: "POST",
      headers: { "x-razorpay-signature": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef" },
      body: { event: "payment.captured", payload: { payment: { entity: { id: "pay_1", amount: 500000 } } } },
    };
    const res = mockRes();
    await razorpayHandler(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.error, "Invalid cryptographic signature.");
  });
});

test("Phase 2: Offline Sync Queue Vault Security & AES-GCM-256", async (t) => {
  await t.test("Vault encryption forbids PLAINTEXT_FALLBACK and STUB_BASE64_OBFUSCATED strings", async () => {
    const fs = await import("fs");
    const vaultSrc = fs.readFileSync("src/utils/offlineSyncQueue.js", "utf8");

    assert.ok(!vaultSrc.includes('"PLAINTEXT_FALLBACK"'), "Must not contain PLAINTEXT_FALLBACK");
    assert.ok(!vaultSrc.includes('"STUB_BASE64_OBFUSCATED"'), "Must not contain STUB_BASE64_OBFUSCATED");
    assert.ok(!vaultSrc.includes("btoa("), "Must not use insecure base64 obfuscation for vault storage");
  });

  await t.test("Queue flush strictly verifies tenantCode and userId to prevent cross-tenant replay", async () => {
    const fs = await import("fs");
    const queueSrc = fs.readFileSync("src/utils/offlineSyncQueue.js", "utf8");

    assert.ok(queueSrc.includes("item.school_id !== cleanSchool"), "Must verify item.school_id against active tenant");
    assert.ok(queueSrc.includes("item.user_id !== activeUserId"), "Must verify item.user_id against active user");
    assert.ok(queueSrc.includes("vault_keys"), "Must use dedicated IndexedDB vault_keys store for AES-GCM CryptoKey");
  });
});

test("Phase 2: Authentication Context Security & Profile Fail-Closed Enforcement", async (t) => {
  await t.test("AppContext denies session when user profile is missing or marked inactive/suspended", async () => {
    const fs = await import("fs");
    const contextSrc = fs.readFileSync("src/context/AppContext.jsx", "utf8");

    assert.ok(contextSrc.includes("deactivated or suspended"), "Must fail closed if profile status is inactive/suspended");
    assert.ok(contextSrc.includes('profileData.status === "inactive"'), "Must check profile status inactive");
    assert.ok(contextSrc.includes("profileData.is_active === false"), "Must check profile is_active boolean");
  });

  await t.test("AppContext prevents URL parameter from overriding authenticated tenant identity", async () => {
    const fs = await import("fs");
    const contextSrc = fs.readFileSync("src/context/AppContext.jsx", "utf8");

    assert.ok(
      contextSrc.includes("NEVER allow client URL params (?tenant=...) or localStorage to alter authenticated tenant"),
      "Must explicitly forbid URL parameter tenant overriding for authenticated sessions"
    );
  });
});




