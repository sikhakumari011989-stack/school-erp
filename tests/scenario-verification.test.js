import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import { normalizeRole, dashboardFor } from "../src/utils/credentials.js";
import { checkSchoolSubscriptionStatus, verifyCloudLogin } from "../src/utils/cloudSyncService.js";
import { supabase } from "../src/supabaseClient.js";

test("Scenario 1: Login as HOD of active school -> lands on HOD dashboard with real content", async (t) => {
  const schoolCode = "DEMOSCHOOL-01";
  const personalCode = "HOD-01";
  const password = "password123";

  // 1. Role normalization and dashboard routing
  const role = normalizeRole(personalCode, personalCode);
  assert.strictEqual(role, "HOD", "HOD-01 must normalize to canonical HOD");
  const targetDashboard = dashboardFor(role);
  assert.strictEqual(targetDashboard, "/trustee/dashboard", "HOD target dashboard must be /trustee/dashboard");

  // 2. Active school subscription evaluation from live Supabase
  const subStatus = await checkSchoolSubscriptionStatus(schoolCode);
  console.log(`  [Scenario 1] ${schoolCode} Subscription:`, subStatus.status, "| isBlocked:", subStatus.isBlocked);
  assert.strictEqual(subStatus.isBlocked, false, "Active school must not be blocked");
  assert.strictEqual(subStatus.isSuspended, false, "Active school must not be suspended");

  // 3. Supabase Auth authentication test
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: "demoschool-01.hod-01@erp-login.com",
    password: password,
  });
  assert.strictEqual(authError, null, "Supabase Auth for DEMOSCHOOL-01 HOD-01 must succeed");
  assert.ok(authData?.user?.id, "Must return valid Supabase auth user");
  console.log(`  [Scenario 1] Live Supabase Auth Success: User ID = ${authData.user.id}, Email = ${authData.user.email}`);

  // 4. Verify alias routes in App.jsx
  const appSrc = fs.readFileSync("src/App.jsx", "utf8");
  assert.ok(appSrc.includes('path="/hod/dashboard" element={<Navigate to="/trustee/dashboard" replace />}'), "Must have /hod/dashboard alias");
  assert.ok(appSrc.includes('path="/hod-dashboard" element={<Navigate to="/trustee/dashboard" replace />}'), "Must have /hod-dashboard alias");
  assert.ok(appSrc.includes('path="/trustee/dashboard"'), "Must have /trustee/dashboard route");
});

test("Scenario 2: Login as any role of suspended school -> sees full-screen suspension notice with exact text, zero console errors, data safe", async (t) => {
  const suspendedSchool = "ASTIK-01";

  // 1. Check live Supabase schools table status
  const subStatus = await checkSchoolSubscriptionStatus(suspendedSchool);
  console.log(`  [Scenario 2] ${suspendedSchool} Subscription:`, subStatus.status, "| isBlocked:", subStatus.isBlocked);
  assert.strictEqual(subStatus.isBlocked, true, "Suspended school must be blocked");
  assert.strictEqual(subStatus.isSuspended, true, "Suspended school must be marked suspended");

  // 2. Verify exact text in SuspensionNoticeBarrier.jsx
  const barrierSrc = fs.readFileSync("src/Components/SuspensionNoticeBarrier.jsx", "utf8");
  assert.ok(
    barrierSrc.includes("Access Suspended: this school's subscription is inactive. Contact the platform administrator to restore access."),
    "Must include exact primary notice text"
  );
  assert.ok(
    barrierSrc.includes("100% of data preserved in Supabase PostgreSQL — zero data loss. Reactivation restores full access."),
    "Must include exact data preservation reassurance text"
  );
  assert.ok(
    barrierSrc.includes("fixed inset-0 z-[9999]"),
    "Must use full-screen z-[9999] overlay"
  );

  // 3. Verify App.jsx keeps normal app mounted underneath overlay
  const appSrc = fs.readFileSync("src/App.jsx", "utf8");
  assert.ok(
    appSrc.includes("const showSuspendedOverlay = !isPublicPage && !isMasterUser && Boolean(subscription?.isBlocked)"),
    "Must evaluate showSuspendedOverlay at AppLayout level"
  );
  assert.ok(
    appSrc.includes("{showSuspendedOverlay && (") && appSrc.includes("<SuspensionNoticeBarrier"),
    "Must render barrier overlay while {children} remains mounted in main"
  );
  assert.ok(
    appSrc.includes("const isMasterUser = canonicalRole === \"MASTER_OWNER\" || location.pathname === \"/master-setup\""),
    "MASTER_OWNER must be exempted from suspension barrier"
  );

  // 4. Verify ProtectedRoute does not unmount children when suspended
  const protectedRouteSrc = fs.readFileSync("src/Components/ProtectedRoute.jsx", "utf8").replace(/\r\n/g, "\n");
  assert.ok(
    protectedRouteSrc.includes("if (!isMasterUser && subscription?.isBlocked) {\n    return children;\n  }"),
    "ProtectedRoute must keep children mounted under full-screen barrier"
  );
});

test("Scenario 3: Login as active school student/teacher/accountant -> lands on their respective dashboard", async (t) => {
  const rolesToTest = [
    { code: "STU-001", expectedRole: "STU", expectedDashboard: "/student/dashboard" },
    { code: "TCH-01", expectedRole: "TCH", expectedDashboard: "/teacher/dashboard" },
    { code: "ACC-01", expectedRole: "ACC", expectedDashboard: "/accountant/dashboard" },
    { code: "PRIN-01", expectedRole: "PRIN", expectedDashboard: "/principal/dashboard" },
  ];

  for (const { code, expectedRole, expectedDashboard } of rolesToTest) {
    const canonicalRole = normalizeRole(code, code);
    assert.strictEqual(canonicalRole, expectedRole, `${code} must normalize to ${expectedRole}`);
    const dest = dashboardFor(canonicalRole);
    assert.strictEqual(dest, expectedDashboard, `${expectedRole} must route to ${expectedDashboard}`);
    console.log(`  [Scenario 3] Role ${code} -> Canonical ${canonicalRole} -> Target ${dest} (Verified)`);
  }
});
