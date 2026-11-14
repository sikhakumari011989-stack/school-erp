import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";

test("MVP Regression: Provider hierarchy, AppContext loading, and AppLayout hooks", async (t) => {
  const appSrc = fs.readFileSync("src/App.jsx", "utf8").replace(/\r\n/g, "\n");
  const appContextSrc = fs.readFileSync("src/context/AppContext.jsx", "utf8").replace(/\r\n/g, "\n");
  const protectedRouteSrc = fs.readFileSync("src/Components/ProtectedRoute.jsx", "utf8").replace(/\r\n/g, "\n");

  // 1. AppContext does not cut off auth resolution at 800ms
  assert.ok(
    !appContextSrc.includes("}, 800);"),
    "AppContext must not have premature 800ms timeout cutting off auth"
  );
  assert.ok(
    appContextSrc.includes("10000"),
    "AppContext must have 10s network stall fallback"
  );

  // 2. AppLayout has all hooks at top and no stale localStorage auto-router
  assert.ok(
    !appSrc.includes('localStorage.getItem("erp_session_user");\n        if (saved) {\n          const parsed = JSON.parse(saved);'),
    "AppLayout must not have stale localStorage auto-router effect"
  );

  // 3. Reports & Analytics are deleted from App.jsx per Phase 1 specification
  assert.ok(
    !appSrc.includes('path="/admin/reports"'),
    "App.jsx must not register /admin/reports route"
  );
  assert.ok(
    !appSrc.includes('path="/admin/analytics"'),
    "App.jsx must not register /admin/analytics route"
  );

  // 4. ProtectedRoute shows loading spinner and checks context user
  assert.ok(
    protectedRouteSrc.includes("if (loading) {\n    return ("),
    "ProtectedRoute must render spinner while loading is true"
  );
  assert.ok(
    protectedRouteSrc.includes("const resolvedUser = user;"),
    "ProtectedRoute must use authoritative context user"
  );
});

test("MVP Regression: Reports and Analytics removed in Phase 1 cleanup", async (t) => {
  assert.strictEqual(fs.existsSync("src/pages/Reports.jsx"), false, "Reports.jsx must be deleted");
  assert.strictEqual(fs.existsSync("src/pages/Analytics.jsx"), false, "Analytics.jsx must be deleted");
});

test("MVP Regression: Sidebar navigation cleansed of legacy reports and analytics", async (t) => {
  const sidebarSrc = fs.readFileSync("src/Components/Sidebar.jsx", "utf8").replace(/\r\n/g, "\n");

  assert.ok(
    !sidebarSrc.includes('/admin/reports') && !sidebarSrc.includes('/admin/analytics'),
    "Sidebar must not include /admin/reports and /admin/analytics links"
  );
});

test("MVP Regression: Type safety in cloudSyncService and TeacherAttendance", async (t) => {
  const cloudSyncSrc = fs.readFileSync("src/utils/cloudSyncService.js", "utf8").replace(/\r\n/g, "\n");
  const teacherAttSrc = fs.readFileSync("src/pages/TeacherAttendance.jsx", "utf8").replace(/\r\n/g, "\n");

  // cloudSyncService enrollMemberInCloud uses cleanCode (TEXT) for teachers and students
  assert.ok(
    cloudSyncSrc.includes("school_id: cleanCode,"),
    "cloudSyncService must use cleanCode TEXT for teachers and students"
  );

  // TeacherAttendance resolves UUID for attendance table insert
  assert.ok(
    teacherAttSrc.includes("resolveSchoolUuid(activeSchoolId)"),
    "TeacherAttendance must resolve UUID for attendance insert"
  );
  // TeacherAttendance recognizes canonical STU
  assert.ok(
    teacherAttSrc.includes('role === "stu"'),
    "TeacherAttendance must recognize canonical STU role"
  );
});

test("MVP Regression: Secrets elimination and payment validation", async (t) => {
  const masterAuthSrc = fs.readFileSync("api/master/auth.js", "utf8").replace(/\r\n/g, "\n");
  const masterSetupSrc = fs.readFileSync("src/pages/MasterSchoolSetup.jsx", "utf8").replace(/\r\n/g, "\n");

  // Removed fallback master provisioning secret
  assert.ok(
    !masterAuthSrc.includes("academic-os-master-provisioning-secret-2026"),
    "api/master/auth.js must not contain hardcoded fallback secret"
  );

  // MasterSchoolSetup does not default to password123
  assert.ok(
    !masterSetupSrc.includes('password: "password123"'),
    "MasterSchoolSetup must not default to password123"
  );

  // Razorpay payment endpoints eradicated
  assert.ok(
    !fs.existsSync("api/razorpay/verify-payment.js"),
    "api/razorpay/verify-payment.js must be eradicated in favor of offline/manual counter ledger"
  );
});

test("MVP Regression: Non-recursive RLS forward migration exists", async (t) => {
  const migrationPath = "supabase/migrations/25_fix_rls_recursion_and_tenant_isolation.sql";
  assert.ok(fs.existsSync(migrationPath), "Migration 25 must exist");

  const migrationSrc = fs.readFileSync(migrationPath, "utf8").replace(/\r\n/g, "\n");
  assert.ok(
    migrationSrc.includes("profiles_non_recursive_select"),
    "Migration 25 must define non-recursive select policy"
  );
  // Ensure the policy bodies (after DROP statements) don't contain subqueries on public.profiles
  const policyBodyPart = migrationSrc.split("-- 3. CREATE CLEAN, ZERO-RECURSION POLICIES ON public.profiles")[1] || "";
  assert.ok(
    !policyBodyPart.includes("FROM public.profiles"),
    "Migration 25 policy bodies must not contain subqueries on public.profiles"
  );
});
