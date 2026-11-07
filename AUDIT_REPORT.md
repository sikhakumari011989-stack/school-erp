# Academic OS — Codebase Security, Architecture & Reliability Audit Report

**Date:** November 6, 2026  
**Audited Roots:** `src/`, `api/`, `supabase/`, `scripts/`, `tests/`  
**Total Files Scanned:** 217  
**Build Status:** Clean (`npm run build` exited with code 0, 0 compiler warnings)  
**Files Unreadable:** None (100% of files parsed and inspected)

---

## Executive Summary

A comprehensive architectural and security audit of the Academic OS codebase was conducted across all 217 source, serverless API, database migration, script, and test files. The audit verified:
1. **Context & Hook Import Integrity:** The critical runtime crash `"AppContext is not defined"` has been eliminated across all active and routed components. All React hooks, React Router hooks, and Context hooks are properly imported across active routes.
2. **Login & Session Path:** The primary authentication flow handles Supabase Auth, session caching, role normalization, and routing reliably. However, a pre-authentication subscription interceptor in `Login.jsx` prematurely traps users of suspended schools before session mount.
3. **Role Normalization Discrepancies:** While `normalizeRole` in `src/utils/credentials.js` enforces canonical MVP roles (`HOD`, `PRIN`, `ACC`, `TCH`, `STU`, `NTS`, `MASTER_OWNER`), several legacy components perform raw string comparisons against lowercase aliases (`"teacher"`, `"student"`, `"trustee"`), creating feature visibility bugs.
4. **Database RLS Policy Recursion:** PostgreSQL error `42P17` was traced to direct and indirect recursive self-queries in `01_rls_policies.sql` and `22_phase2_security_and_rls_hardening.sql`.
5. **Hardcoded Secrets:** Fallback JWT anonymous keys and serverless token secrets were identified in client wrappers and serverless authentication routines.

---

## Detailed Findings

### A-001
- **Severity:** Critical
- **File Path & Line Number:** `src/pages/Analytics.jsx:5-6`
- **Category:** runtime crash
- **Exact Problem:**
  > `const { getSchoolAnalytics } = useContext(AppContext);`  
  > `const analytics = getSchoolAnalytics();`
- **Evidence:** `AppContext.jsx` does not implement or export `getSchoolAnalytics`. If `Analytics.jsx` is mounted, executing `getSchoolAnalytics()` throws `TypeError: getSchoolAnalytics is not a function`, causing an unhandled runtime crash caught only by ErrorBoundary. (Note: `Analytics.jsx` is currently an unrouted legacy file).

---

### A-002
- **Severity:** Critical
- **File Path & Line Number:** `src/pages/Reports.jsx:6, 22-27`
- **Category:** runtime crash
- **Exact Problem:**
  > `const { getFeeReport, getAttendanceReport, getMarksReport, classes } = useContext(AppContext);`  
  > `data = getFeeReport(startDate, endDate, classId || null);`
- **Evidence:** `AppContext.jsx` does not define `getFeeReport`, `getAttendanceReport`, `getMarksReport`, or `classes`. Triggering `handleGenerateReport` throws `TypeError: getFeeReport is not a function` at line 22.

---

### A-003
- **Severity:** High
- **File Path & Line Number:** `src/pages/Homework.jsx:35`
- **Category:** role/auth
- **Exact Problem:**
  > `{user?.role === "teacher" && (`  
  > `<div className="bg-slate-700/50 border border-slate-600/50 rounded-xl p-6 mb-8">`  
  > `<h2 className="text-xl font-bold text-white mb-4">Upload Homework</h2>`
- **Evidence:** In `src/context/AppContext.jsx:276, 298`, an authenticated teacher's role is normalized to canonical `"TCH"`. Because `Homework.jsx` strictly checks `user?.role === "teacher"`, the comparison evaluates to `false` for valid teachers, permanently hiding the homework creation form.

---

### A-004
- **Severity:** High
- **File Path & Line Number:** `src/pages/StaffMessenger.jsx:55, 118`
- **Category:** role/auth
- **Exact Problem:**
  > `const isStudent = userRole === "student" || userCode.startsWith("STU-");`  
  > `if (role === "student" || code.startsWith("STU-")) return false;`
- **Evidence:** Student canonical role in AppContext is `"STU"`. Line 52 computes `userRole = (user?.role || "").toLowerCase().trim()`, yielding `"stu"`. The check `"stu" === "student"` is `false`. If a student has a numeric roll number (e.g. `"101"`, `"42"`) without the `"STU-"` prefix, `isStudent` evaluates to `false`, inadvertently bypassing the student restriction gate and granting access to faculty-only messaging.

---

### A-005
- **Severity:** High
- **File Path & Line Number:** `src/Components/NoticeBanner.jsx:45-66`
- **Category:** role/auth
- **Exact Problem:**
  > `if (userRole === "trustee" || userRole === "principal" || userRole === "admin") return true;`  
  > `if (userRole === "teacher") { ... }`  
  > `if (userRole === "student") { ... }`
- **Evidence:** Line 25 computes `userRole = (role || "").toLowerCase().trim()`. If callers pass the canonical MVP role acronyms (`"HOD"`, `"PRIN"`, `"TCH"`, `"STU"`, `"ACC"`, or `user.role`), `userRole` evaluates to `"hod"`, `"prin"`, `"tch"`, `"stu"`, or `"acc"`. None of these match `"trustee"`, `"principal"`, `"teacher"`, or `"student"`, causing role-specific notices to be omitted from the banner.

---

### A-006
- **Severity:** Medium
- **File Path & Line Number:** `src/pages/TeacherAttendance.jsx:188-190`
- **Category:** role/auth
- **Exact Problem:**
  > `const role = (item.role || "student").toLowerCase();`  
  > `return role === "student" && !code.startsWith("HOD-") && !code.startsWith("PRIN-") ...;`
- **Evidence:** For directory records where `item.role` is stored as canonical `"STU"`, `role` evaluates to `"stu"`. The check `role === "student"` evaluates to `false`, causing legitimate student roster items to be filtered out of the attendance marking register.

---

### A-007
- **Severity:** Medium
- **File Path & Line Number:** `src/pages/InstitutionalDirectory.jsx:36-39, 83-87`
- **Category:** role/auth
- **Exact Problem:**
  > `const isHod = p.role === "trustee" || (p.role_code || "").startsWith("HOD");`  
  > `const isPrin = p.role === "principal" || (p.role_code || "").startsWith("PRIN");`  
  > `const isAcc = p.role === "accountant" || (p.role_code || "").startsWith("ACC");`
- **Evidence:** Raw string equality checks against legacy lowercase names (`"trustee"`, `"principal"`, `"accountant"`, `"teacher"`) fail when profile records hold canonical MVP role strings (`"HOD"`, `"PRIN"`, `"ACC"`, `"TCH"`), forcing reliance on ID prefix string matching.

---

### A-008
- **Severity:** Medium
- **File Path & Line Number:** `src/utils/cloudSyncService.js:15-38` vs `src/utils/credentials.js:50-121`
- **Category:** role/auth
- **Exact Problem:**
  > `// cloudSyncService.js:37`  
  > `return "student"; // returns lowercase "principal", "trustee", "teacher"`  
  > `// credentials.js:120`  
  > `return "STU"; // returns canonical "PRIN", "HOD", "TCH", "ACC", "NTS", "STU"`
- **Evidence:** Two distinct role detection helper functions exist in parallel with divergent output sets. `detectRoleFromId` emits lowercase descriptive strings (`"principal"`, `"trustee"`), while `normalizeRole` emits canonical uppercase acronyms (`"PRIN"`, `"HOD"`), leading to casing and alias mismatches across different modules.

---

### A-009
- **Severity:** Critical
- **File Path & Line Number:** `src/pages/Login.jsx:108-124, 550-594`
- **Category:** subscription block
- **Exact Problem:**
  > `const sub = await checkSchoolSubscriptionStatus(cleanInst);`  
  > `if (sub && sub.isBlocked) { setLoading(false); setSuspendedNotice(...); return; }`
- **Evidence:** When a user logs in for a suspended campus, `Login.jsx` intercepts the request prior to Supabase Auth (`supabase.auth.signInWithPassword`), sets local component state `suspendedNotice`, and returns early. This displays an inline `z-50` modal on `/login` and blocks the user from reaching their dashboard, preventing the requirement that the full-screen barrier (`SuspensionNoticeBarrier`, `z-[9999]`) renders while the normal app remains mounted underneath.

---

### A-010
- **Severity:** High
- **File Path & Line Number:** `src/pages/Login.jsx:560-573`
- **Category:** subscription block
- **Exact Problem:**
  > `Access to campus node <strong className="text-white font-mono">{suspendedNotice.schoolCode}</strong> has been suspended by the platform administrator via the master subscription kill-switch.`
- **Evidence:** The inline modal in `Login.jsx` displays custom copy rather than the canonical required text:  
  `"Access Suspended: this school's subscription is inactive. Contact the platform administrator to restore access."` and omits the mandatory guarantee: `"100% of data preserved in Supabase PostgreSQL — zero data loss. Reactivation restores full access."`

---

### A-011
- **Severity:** Medium
- **File Path & Line Number:** `src/App.jsx:93`
- **Category:** subscription block
- **Exact Problem:**
  > `const isMasterUser = canonicalRole === "MASTER_OWNER" || location.pathname === "/master-setup";`
- **Evidence:** `location.pathname === "/master-setup"` grants `isMasterUser` exemption to any unauthenticated visitor on `/master-setup`. While `/master-setup` is independently protected by a serverless master passkey barrier, exempting based on URL pathname rather than authenticated role creates an architectural bypass surface.

---

### A-012
- **Severity:** Critical
- **File Path & Line Number:** `api/master/auth.js:18`
- **Category:** security (secrets or RLS)
- **Exact Problem:**
  > `export function getTokenSecret() {`  
  > `  return process.env.MASTER_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || (process.env.NODE_ENV === "test" ? "test-master-provisioning-secret-2026" : "[REDACTED-FALLBACK-SECRET]");`  
  > `}`
- **Evidence:** When `MASTER_TOKEN_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` are not set in the environment, `getTokenSecret()` falls back to a static hardcoded string in production. An attacker aware of this hardcoded secret could forge HMAC-SHA256 master operator tokens to access `/api/master/schools`.

---

### A-013
- **Severity:** High
- **File Path & Line Number:** `src/supabaseClient.js:16` & `src/lib/supabaseClient.js:9`
- **Category:** security (secrets or RLS)
- **Exact Problem:**
  > `const supabaseAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY || procEnv.VITE_SUPABASE_ANON_KEY || ... || '[REDACTED-JWT-ANON-KEY]';`
- **Evidence:** Both `src/supabaseClient.js` and `src/lib/supabaseClient.js` hardcode a valid Supabase Anonymous JWT token as a fallback default when environment variables are omitted.

---

### A-014
- **Severity:** High
- **File Path & Line Number:** `api/master/schools.js:14`
- **Category:** security (secrets or RLS)
- **Exact Problem:**
  > `const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "[REDACTED-JWT-ANON-KEY]";`
- **Evidence:** `getSupabaseClient()` in `api/master/schools.js` accepts the public frontend anon key as a fallback for `serviceKey`. The anon key lacks administrative privileges to provision auth users (`auth.admin.createUser`) or bypass PostgreSQL RLS, causing serverless master provisioning to fail when the service role key is omitted.

---

### A-015
- **Severity:** Medium
- **File Path & Line Number:** `src/pages/MasterSchoolSetup.jsx:43, 412`
- **Category:** security (secrets or RLS)
- **Exact Problem:**
  > `formData = { ... password: "[REDACTED-DEFAULT-PASSWORD]", ... };`
- **Evidence:** Default institutional onboarding form state populates a hardcoded plain-text password for newly created campus administrator accounts.

---

### A-016
- **Severity:** Medium
- **File Path & Line Number:** `src/Components/ComprehensiveMemberModal.jsx:46, 135, 146, 157, 168, 201`
- **Category:** security (secrets or RLS)
- **Exact Problem:**
  > `password: "[REDACTED-DEFAULT-PASSWORD]",`
- **Evidence:** Member provisioning forms for students, faculty teachers, accountants, and staff default to a static hardcoded password in client state.

---

### A-017
- **Severity:** Low
- **File Path & Line Number:** `scripts/seed-database.js:171`
- **Category:** security (secrets or RLS)
- **Exact Problem:**
  > `console.log("   - Password:          [REDACTED-DEFAULT-PASSWORD]");`
- **Evidence:** Database seeding script logs default account passwords directly to standard output.

---

### A-018
- **Severity:** Critical
- **File Path & Line Number:** `supabase/migrations/22_phase2_security_and_rls_hardening.sql:538-553`
- **Category:** database policy
- **Exact Problem:**
  > `CREATE POLICY "profiles_canonical_update" ON public.profiles FOR UPDATE TO authenticated`  
  > `USING ((id = auth.uid() AND (SELECT status = 'active' FROM public.profiles WHERE id = auth.uid())) OR ...)`
- **Evidence:** Direct policy recursion. The policy expression on `public.profiles` contains `(SELECT status = 'active' FROM public.profiles WHERE id = auth.uid())`. In PostgreSQL, evaluating this subquery inside an RLS policy on `public.profiles` triggers the policy on `public.profiles` again, resulting in Postgres error `42P17: infinite recursion detected in policy for relation "profiles"`.

---

### A-019
- **Severity:** Critical
- **File Path & Line Number:** `supabase/migrations/01_rls_policies.sql:416-437` & `supabase/rls_policies.sql:416-437`
- **Category:** database policy
- **Exact Problem:**
  > `CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated`  
  > `USING (id = auth.uid() OR (... public.is_admin_or_executive() ...) OR public.get_auth_role() IN ('admin', 'super_admin'));`
- **Evidence:** Indirect policy recursion. Policy `profiles_select` calls helper function `public.get_auth_role()`. In `01_rls_policies.sql:241`, `get_auth_role()` contains `(SELECT role::text FROM public.profiles WHERE id = auth.uid() LIMIT 1)`. Querying `profiles` inside a function called by a `profiles` policy induces infinite recursion when JWT app_metadata is unpopulated.

---

### A-020
- **Severity:** Critical
- **File Path & Line Number:** `supabase/migrations/01_rls_policies.sql:467-505` & `supabase/rls_policies.sql:467-505`
- **Category:** database policy
- **Exact Problem:**
  > `CREATE POLICY "users_select" ON public.users FOR SELECT TO authenticated`  
  > `USING (id = auth.uid() OR (... public.get_auth_role() ...));`
- **Evidence:** Indirect policy recursion on table `public.users`. Helper function `public.get_auth_role()` (line 242) queries `(SELECT role::text FROM public.users WHERE id = auth.uid() LIMIT 1)`. Executing `users_select` triggers `get_auth_role()`, which queries `users` and triggers `users_select` indefinitely.

---

### A-021
- **Severity:** High
- **File Path & Line Number:** `supabase/migrations/19_master_setup_and_licensing.sql:38-53`
- **Category:** database policy
- **Exact Problem:**
  > `CREATE TABLE IF NOT EXISTS public.school_license_audit_logs (...);`  
  > `ALTER TABLE IF EXISTS public.school_license_audit_logs ENABLE ROW LEVEL SECURITY;`
- **Evidence:** `school_license_audit_logs` has RLS enabled, but zero `CREATE POLICY` statements were created for it across any migration file. Under PostgreSQL RLS semantics, a table with RLS enabled and zero policies completely denies all `SELECT`, `INSERT`, `UPDATE`, and `DELETE` queries to authenticated users (failing closed). Only `SECURITY DEFINER` routines or service role bypass this.

---

### A-022
- **Severity:** High
- **File Path & Line Number:** `src/pages/SuperAdminDashboard.jsx:20-25`
- **Category:** security (secrets or RLS)
- **Exact Problem:**
  > `const [studentRes, teacherRes, classRes, feeRes] = await Promise.all([`  
  > `  supabase.from('students').select('*', { count: 'exact', head: true }),`  
  > `  supabase.from('teachers').select('*', { count: 'exact', head: true }),`  
  > `  supabase.from('classes').select('*', { count: 'exact', head: true }),`  
  > `  supabase.from('fees').select('amount').eq('status', 'paid')`  
  > `]);`
- **Evidence:** Global query without tenant scoping. None of the four queries include `.eq('school_id', ...)` or institutional filtering. If RLS is relaxed or running with administrative rights, `SuperAdminDashboard` aggregates telemetry across all registered schools in the database, violating tenant isolation.

---

### A-023
- **Severity:** Low
- **File Path & Line Number:** `src/lib/supabaseClient.js:1-26`
- **Category:** other
- **Exact Problem:**
  > `// src/lib/supabaseClient.js is an orphaned duplicate of src/supabaseClient.js`
- **Evidence:** `src/lib/supabaseClient.js` is unreferenced across the entire codebase (zero imports). It duplicates the client configuration in `src/supabaseClient.js` and contains redundant hardcoded fallback credentials.

---

### A-024
- **Severity:** Medium
- **File Path & Line Number:** `src/pages/Settings.jsx:34, 41, 53, 60, 67`
- **Category:** UI/contrast
- **Exact Problem:**
  > `className="w-full p-3 mb-3 rounded-xl bg-white/5 border border-white/10 text-white"`
- **Evidence:** Hardcoded white text (`text-white`) with near-transparent background (`bg-white/5`). Under light mode (`AppLayout` sets `bg-slate-50`), the input fields display white text on a white/light-gray background, rendering user input invisible.

---

### A-025
- **Severity:** Low
- **File Path & Line Number:** `src/pages/DocumentIntelligence.jsx:406` & `src/Components/StaffLeaveManager.jsx:528`
- **Category:** UI/contrast
- **Exact Problem:**
  > `className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-4 ..."`
- **Evidence:** Elements define background switching (`bg-white dark:bg-slate-800`) but omit explicit light-mode text colors (`text-slate-900`), creating contrast degradation if light text is inherited from a parent container.

---

## Unrouted & Orphaned Files Inventory

The audit identified 24 page components and 5 UI widgets that are not imported or routed in `src/App.jsx`:

| File Path | Status | Notes |
|---|---|---|
| `src/pages/Analytics.jsx` | Unrouted | Legacy analytics view; contains undefined context calls (`A-001`) |
| `src/pages/Attendance.jsx` | Unrouted | Legacy static mock attendance page; replaced by `TeacherAttendance.jsx` |
| `src/pages/Classes.jsx` | Unrouted | Legacy static mock class table; replaced by `TeacherClasses.jsx` |
| `src/pages/Dashboard.jsx` | Unrouted | Legacy generic manager overview; replaced by role dashboards |
| `src/pages/Fees.jsx` | Unrouted | Legacy static fee management page; replaced by `AccountantDashboard.jsx` |
| `src/pages/FinanceTracker.jsx` | Unrouted | Legacy financial tracking view |
| `src/pages/Homework.jsx` | Unrouted | Standalone homework view; contains role check bug (`A-003`) |
| `src/pages/IdCardGenerator.jsx` | Unrouted | Standalone ID card generator |
| `src/pages/InstitutionalDirectory.jsx` | Unrouted | Legacy directory page |
| `src/pages/JoinSchool.jsx` | Unrouted | Route redirects to `/login` |
| `src/pages/LandingPage.jsx` | Unrouted | Replaced by direct `/login` portal |
| `src/pages/LeaveManagement.jsx` | Unrouted | Replaced by `StaffLeaveManager.jsx` component |
| `src/pages/MasterSetup.jsx` | Unrouted | Wrapper re-exporting `MasterSchoolSetup.jsx` |
| `src/pages/Notices.jsx` | Unrouted | Replaced by `BroadcastManager.jsx` |
| `src/pages/RegisterInstitution.jsx` | Unrouted | Route redirects to `/login` |
| `src/pages/Reports.jsx` | Unrouted | Legacy report generator; contains undefined context calls (`A-002`) |
| `src/pages/SecurityAuditCenter.jsx` | Unrouted | Detailed security log explorer |
| `src/pages/SecurityAuditVault.jsx` | Unrouted | Wrapper re-exporting `SystemAudit.jsx` |
| `src/pages/Settings.jsx` | Unrouted | Standalone settings page; contains contrast issues (`A-024`) |
| `src/pages/StudentApp.jsx` | Unrouted | Legacy standalone student app |
| `src/pages/StudentAttendance.jsx` | Unrouted | Replaced by unified `StudentDashboard.jsx` tabs |
| `src/pages/StudentCertificates.jsx` | Unrouted | Legacy certificate view |
| `src/pages/StudentTimeTable.jsx` | Unrouted | Replaced by timetable modal |
| `src/pages/SystemAudit.jsx` | Unrouted | Renders `SecurityAuditCenter` |
| `src/pages/TimeTable.jsx` | Unrouted | Replaced by `AcademicCalendar.jsx` |
| `src/Components/AIPrincipalAssistantChat.jsx` | Orphaned | Secondary copilot widget |
| `src/Components/CustomReportBuilder.jsx` | Orphaned | Unused report builder |
| `src/Components/OfflineIndicator.jsx` | Orphaned | Duplicate of `OfflineBanner.jsx` |
| `src/Components/PrincipalNLAssistant.jsx` | Orphaned | Legacy natural language assistant |
| `src/Components/ResponsiveLayout.jsx` | Orphaned | Replaced by `AppLayout` in `App.jsx` |
| `src/layout/MainLayout.jsx` | Orphaned | Legacy layout container |
| `src/lib/supabaseClient.js` | Orphaned | Duplicate client (`A-023`) |

---

## Summary Table

| Category | Critical | High | Medium | Low | Total |
|---|:---:|:---:|:---:|:---:|:---:|
| **Runtime Crash** | 2 | 0 | 0 | 0 | **2** |
| **Import Error** | 0 | 0 | 0 | 0 | **0** |
| **Role / Auth** | 0 | 3 | 3 | 0 | **6** |
| **Subscription Block** | 1 | 1 | 1 | 0 | **3** |
| **Security (Secrets or RLS)** | 1 | 3 | 2 | 1 | **7** |
| **Database Policy** | 3 | 1 | 0 | 0 | **4** |
| **UI / Contrast** | 0 | 0 | 1 | 1 | **2** |
| **Other (Orphaned Code)** | 0 | 0 | 0 | 1 | **1** |
| **TOTALS** | **7** | **8** | **7** | **3** | **25** |

---

## Files That Could Not Be Read

**None.** All 217 files across `src/`, `api/`, `supabase/`, `scripts/`, and `tests/` were opened, inspected, and verified successfully.
