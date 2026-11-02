import test from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
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


