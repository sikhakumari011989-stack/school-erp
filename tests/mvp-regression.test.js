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

  // 3. Reports & Analytics are lazy-loaded and registered
  assert.ok(
    appSrc.includes('const Reports = React.lazy(() => import("./pages/Reports"));'),
    "App.jsx must lazy load Reports"
  );
  assert.ok(
    appSrc.includes('const Analytics = React.lazy(() => import("./pages/Analytics"));'),
    "App.jsx must lazy load Analytics"
  );
  assert.ok(
    appSrc.includes('path="/admin/reports"'),
    "App.jsx must register /admin/reports route"
  );
  assert.ok(
    appSrc.includes('path="/admin/analytics"'),
    "App.jsx must register /admin/analytics route"
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

test("MVP Regression: Reports and Analytics real query wiring", async (t) => {
  const reportsSrc = fs.readFileSync("src/pages/Reports.jsx", "utf8").replace(/\r\n/g, "\n");
  const analyticsSrc = fs.readFileSync("src/pages/Analytics.jsx", "utf8").replace(/\r\n/g, "\n");

  // Reports does not call undefined context functions
  assert.ok(
    !reportsSrc.includes("getFeeReport("),
    "Reports must not call non-existent getFeeReport"
  );
  assert.ok(
    !reportsSrc.includes("getAttendanceReport("),
    "Reports must not call non-existent getAttendanceReport"
  );
  assert.ok(
    !reportsSrc.includes("getMarksReport("),
    "Reports must not call non-existent getMarksReport"
  );
  assert.ok(
    reportsSrc.includes('from("fee_ledger")'),
    "Reports must query fee_ledger table directly"
  );
  assert.ok(
    reportsSrc.includes('from("attendance")'),
    "Reports must query attendance table directly"
  );
  assert.ok(
    reportsSrc.includes('from("class_tests")'),
    "Reports must query class_tests table directly"
  );

  // Analytics does not call undefined getSchoolAnalytics
  assert.ok(
    !analyticsSrc.includes("getSchoolAnalytics()"),
    "Analytics must not call non-existent getSchoolAnalytics"
  );
  assert.ok(
    analyticsSrc.includes('from("students")'),
    "Analytics must query students table count"
  );
  assert.ok(
    analyticsSrc.includes('from("teachers")'),
    "Analytics must query teachers table count"
  );
  assert.ok(
    analyticsSrc.includes('from("fee_ledger")'),
    "Analytics must query fee_ledger table sum"
  );
});

test("MVP Regression: Sidebar navigation for executive reports and analytics", async (t) => {
  const sidebarSrc = fs.readFileSync("src/Components/Sidebar.jsx", "utf8").replace(/\r\n/g, "\n");

  assert.ok(
    sidebarSrc.includes('/admin/reports') && sidebarSrc.includes('/admin/analytics'),
    "Sidebar must include /admin/reports and /admin/analytics links"
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
  const verifyPaySrc = fs.readFileSync("api/razorpay/verify-payment.js", "utf8").replace(/\r\n/g, "\n");

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

  // verify-payment requires schoolId
  assert.ok(
    verifyPaySrc.includes("schoolId is required to reconcile payment"),
    "api/razorpay/verify-payment.js must require schoolId"
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
