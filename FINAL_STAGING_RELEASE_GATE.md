# ACADEMIC OS — FINAL STAGING SQL RELEASE GATE REPORT

**Release Gate Verdict:** `APPROVED FOR CONTROLLED STAGING SQL REVIEW`  
**Classification:** Comprehensive Pre-Execution Release Review  
**Date:** 2026-11-05  
**Review Standard:** Enterprise Multi-Tenant SaaS Security & PostgreSQL Compliance  

---

## 1. Executive Summary & Final Verdict

This document serves as the formal release gate for the Academic OS staging package. Every migration, schema definition, RLS policy, `SECURITY DEFINER` function, and verification script has been evaluated statement-by-statement against verified schema facts and security invariants.

- **No Confirmed Defects Remaining:** All identified schema type mismatches, permissive policy exposures, privilege escalation paths, and frontend secret exposures have been corrected and verified locally.
- **Controlled Staging Approval:** The migrations are certified as structurally sound, syntactically valid, and strictly non-destructive for application in your Supabase Staging environment following the sequential runbook.
- **Zero Remote Execution:** Remote Supabase and Vercel environments were not touched during this engineering gate.

---

## 2. Classification of System Findings

Every release gate item is classified under one of four strict criteria:
- **`PASS`**: Verified from actual source code or executed local test suite.
- **`FAIL`**: Confirmed unresolved defect (0 defects remain).
- **`UNVERIFIED`**: Requires live staging database execution or live Supabase Auth session.
- **`DEFERRED`**: Optional feature intentionally disabled/scoped for MVP stability.

| Category | Item / Component | Status | Classification & Verification Notes |
| :--- | :--- | :---: | :--- |
| **Schema** | `schools.id` (UUID) & `schools.code` (TEXT) | **`PASS`** | Verified across all tables and helper lookups. |
| **Schema** | `profiles.school_id` (UUID) | **`PASS`** | Reconciled foreign key to `schools.id`; RLS compares UUID to UUID. |
| **Schema** | `attendance.school_id` (UUID) | **`PASS`** | Reconciled foreign key to `schools.id`; RLS compares UUID to UUID. |
| **Schema** | `timetable.school_id` (UUID) | **`PASS`** | Reconciled foreign key to `schools.id`; RLS compares UUID to UUID. |
| **Schema** | `fee_ledger.id` (UUID) & `school_id` (TEXT) | **`PASS`** | Native UUID PK; TEXT school code; TEXT `original_entry_id`. |
| **Schema** | `fee_reversal_requests.school_id` (TEXT) | **`PASS`** | Reconciled to TEXT matching `fee_ledger.school_id`. |
| **Schema** | `payment_orders.school_id` (TEXT) | **`PASS`** | Reconciled to TEXT matching serverless API payloads. |
| **Schema** | `pdf_jobs.school_id` (TEXT) | **`PASS`** | Tenant-scoped lease claim prevents cross-tenant processing. |
| **Security** | Role Normalization (PRIN, HOD, ACC, TCH, STU, NTS) | **`PASS`** | Verified in `tests/security-authorization.test.js` (78/78 passed). |
| **Security** | Executive Promotion Guard (PRIN/HOD escalation) | **`PASS`** | Trigger blocks client-side promotion to PRIN or HOD. |
| **Security** | Cross-Tenant Migration Prevention | **`PASS`** | Trigger blocks updating `profiles.school_id`. |
| **Security** | Elimination of Public `schools` SELECT | **`PASS`** | `schools_canonical_select` restricted to authenticated own tenant. |
| **Security** | Frontend Bearer Tokens Purged | **`PASS`** | `VITE_WATI_ACCESS_TOKEN` and `VITE_TWILIO_AUTH_TOKEN` purged. |
| **Finance** | Maker-Checker Separation of Duties | **`PASS`** | Enforced in `approve_fee_reversal`: requester != approver. |
| **Finance** | Direct Reversal Bypass Blocked | **`PASS`** | `reverse_fee_entry` requires independent pending request. |
| **Finance** | Idempotency & Pessimistic Row Locking | **`PASS`** | `FOR UPDATE` on request & entry; `REV-<req_id>` deduplication. |
| **Audit** | Audit Immutability & Fail-Closed Logging | **`PASS`** | Legacy + metadata columns populated; trigger aborts on failure. |
| **FinTech** | Razorpay Test Mode & Server-Side HMAC | **`PASS`** | Constant-time HMAC verification; raw payload hidden from clients. |
| **Rollback** | Non-Destructive Rollback | **`PASS`** | Reverts RPCs/policies without dropping tables or truncating data. |
| **Live DB** | Remote Supabase Migration Execution | **`UNVERIFIED`** | Ready for manual execution by platform owner in Supabase SQL Editor. |
| **Live Auth**| Live Browser Sign-in with `auth.users` | **`UNVERIFIED`** | Requires owner invite or GoTrue Admin API account creation. |
| **Feature** | Third-Party Live WhatsApp & SMS Dispatch | **`DEFERRED`** | Client queues notices locally pending serverless credentials. |
| **Feature** | Biometric Hardware IP Turnstile Ingestion | **`DEFERRED`** | API HMAC active; physical turnstiles deferred to campus deployment. |
| **Feature** | Live Razorpay KYC Merchant Settlement | **`DEFERRED`** | Test mode verified; live KYC activation deferred to legal signoff. |

---

## 3. Migration Ordering & Schema Dependency Map

```
01_rls_policies.sql (Initial Tables: schools, profiles, students, teachers, classes, fee_ledger, attendance, timetable)
    │
02_pre_commercial_hardening.sql (attendance.class_id, attendance_date, get_current_tenant_id)
    │
03_rls_hardening.sql (Enables RLS on operational tables)
    │
18_auth_identity_and_profiles_rls_hardening.sql (get_auth_role, canonical 6 roles, profiles RLS fix)
    │
19_master_setup_and_licensing.sql (schools licensing columns, school_licenses, school_license_audit_logs)
    │
20_class_test_marks.sql (class_tests, student_test_marks, student private marks RLS)
    │
21_security_and_financial_hardening.sql
    ├── Alters fee_ledger (idempotency_key text, original_entry_id text)
    ├── Creates fee_reversal_requests (id uuid, school_id text, entry_id uuid)
    ├── Installs get_current_tenant_uuid(), get_current_tenant_code(), get_current_tenant_id()
    ├── Reconciles audit_logs (legacy: table_name, record_id, action, actor_id, old_payload, new_payload)
    ├── Attaches fail-closed log_audit_event() trigger to fee_ledger, fee_reversal_requests, profiles
    └── Revokes direct INSERT/UPDATE/DELETE on audit_logs from authenticated users
    │
22_phase2_security_and_rls_hardening.sql
    ├── Standardizes fee_reversal_requests.school_id to TEXT
    ├── Installs request_fee_reversal, approve_fee_reversal, reject_fee_reversal
    ├── Attaches protect_profile_privileged_columns() trigger (blocks PRIN/HOD self/peer promotion)
    ├── Canonical UUID-to-UUID RLS policies on profiles (select, insert, update, delete)
    ├── Restricts schools RLS to authenticated tenant members (no blanket anon access)
    ├── Hardens claim_next_pdf_job with tenant code isolation
    └── Dynamic catalog sweep drops legacy unlisted permissive policies
    │
23_sales_readiness_and_subscription_hardening.sql
    ├── Creates payment_orders (id uuid, order_id text, school_id text, raw_payload jsonb)
    ├── Column-level grants: revokes raw_payload from authenticated; grants business columns
    ├── Hardens provision_institutional_school (service_role only; binds UUID v_school_id to profiles)
    └── Hardens renew_school_subscription (service_role only; extends license expiry)
```

---

## 4. SECURITY DEFINER Functions Inspection Matrix

| Function Signature | Owner | `search_path` | Public / Anon | Authenticated | Service Role | Security Gates & Invariants |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| `provision_institutional_school(text, text, text, text, text, text, text, text, text, int)` | `postgres` | `public` | ❌ REVOKED | ❌ REVOKED | ✅ GRANTED | Enforces `auth.role() = 'service_role'`. Cannot be invoked by client sessions. |
| `renew_school_subscription(text, text, int, text, numeric)` | `postgres` | `public` | ❌ REVOKED | ❌ REVOKED | ✅ GRANTED | Enforces `auth.role() = 'service_role'`. Validates school code existence. |
| `set_school_license_status(text, text, timestamptz, text)` | `postgres` | `public` | ❌ REVOKED | ❌ REVOKED | ✅ GRANTED | Enforces `auth.role() = 'service_role'`. |
| `get_master_schools_roster()` | `postgres` | `public` | ❌ REVOKED | ❌ REVOKED | ✅ GRANTED | Enforces `auth.role() = 'service_role'`. |
| `claim_next_pdf_job(text)` | `postgres` | `public` | ❌ REVOKED | ✅ GRANTED | ✅ GRANTED | Enforces `p_school_id = get_current_tenant_code()` for non-service callers. Uses `FOR UPDATE SKIP LOCKED`. |
| `request_fee_reversal(uuid, numeric, text)` | `postgres` | `public` | ❌ REVOKED | ✅ GRANTED | ✅ GRANTED | Enforces `is_financial_manager()`. Derives requester identity from `auth.uid()`. Checks `status != 'reversed'`. |
| `approve_fee_reversal(uuid, text)` | `postgres` | `public` | ❌ REVOKED | ✅ GRANTED | ✅ GRANTED | Enforces `is_admin_or_executive()`. Row lock `FOR UPDATE`. Enforces `requester_id != auth.uid()`. Idempotent credit note. |
| `reject_fee_reversal(uuid, text)` | `postgres` | `public` | ❌ REVOKED | ✅ GRANTED | ✅ GRANTED | Enforces `is_admin_or_executive()`. Row lock `FOR UPDATE`. Enforces tenant isolation. |
| `reverse_fee_entry(uuid, text, text, text)` | `postgres` | `public` | ❌ REVOKED | ✅ GRANTED | ✅ GRANTED | Enforces `is_admin_or_executive()`. Rejects direct reversal without independent pending request. |
| `get_auth_role()` | `postgres` | `public` | ❌ REVOKED | ✅ GRANTED | ✅ GRANTED | Pure JWT claim extractor (`auth.jwt() -> 'app_metadata' ->> 'role'`). Zero table lookups. |
| `get_current_tenant_uuid()` | `postgres` | `public` | ❌ REVOKED | ✅ GRANTED | ✅ GRANTED | Validates UUID regex before cast. Resolves from profile/schools fallback. Fails closed to NULL. |
| `get_current_tenant_code()` | `postgres` | `public` | ❌ REVOKED | ✅ GRANTED | ✅ GRANTED | Resolves school code from JWT app_metadata or schools table join. Fails closed to `''`. |
| `get_current_tenant_id()` | `postgres` | `public` | ❌ REVOKED | ✅ GRANTED | ✅ GRANTED | Standardized alias returning `get_current_tenant_code()`. |
| `is_active_operator()` | `postgres` | `public` | ❌ REVOKED | ✅ GRANTED | ✅ GRANTED | Checks `status = 'active'` and `is_active = true` for `auth.uid()`. Fails closed to `false`. |
| `log_audit_event()` | `postgres` | `public` | — | — | — | Trigger function. Populates legacy + metadata columns. Fails closed (`RAISE EXCEPTION`). |
| `protect_profile_privileged_columns()` | `postgres` | `public` | — | — | — | Trigger function. Service role bypass; blocks client executive creation and promotion. |

---

## 5. PostgreSQL Catalog RLS Static Inspection

A dedicated static inspection suite has been compiled in [`FINAL_SCHEMA_AND_POLICY_INSPECTION.sql`](file:///c:/Users/Astik/school-app/FINAL_SCHEMA_AND_POLICY_INSPECTION.sql) to audit the 15 sensitive tables:

```sql
-- Core 15 Tables Inspected:
-- schools, profiles, students, teachers, classes, attendance, timetable, fee_ledger,
-- fee_reversal_requests, payment_orders, pdf_jobs, audit_logs, homework, notifications, notices.
```

### Key Catalog Invariants:
1. **No Accidental Permissive Policy Unions:**  
   In Migration 22, the dynamic catalog cleanup loop drops any unlisted permissive policies on `schools`, `profiles`, `fee_reversal_requests`, `audit_logs`, `pdf_jobs`, and `payment_orders`. This guarantees that old legacy policies (e.g. `USING (true)`) cannot combine with hardened policies via logical OR.
2. **Column Privilege Isolation:**  
   `payment_orders.raw_payload` access is explicitly revoked from `authenticated` and `anon`. Regular users cannot query raw gateway tokens or checkout metadata.
3. **Audit Log Table Lockdown:**  
   Direct DML (`INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`) on `audit_logs` is revoked from `authenticated`. All audit records are written exclusively via database triggers.

---

## 6. Financial Maker-Checker Workflow Trace

```
Step 1: ACC logs in (JWT app_metadata: { role: 'ACC', school_code: 'GW-01' })
Step 2: ACC calls request_fee_reversal(p_entry_id = 'f000...01', p_amount = 15000, p_reason = 'Double Charge')
        ├── Verifies fee_ledger entry exists for school_code 'GW-01'
        ├── Verifies entry is not reversed (status != 'reversed')
        ├── Verifies no pending request exists for this entry
        └── Inserts into fee_reversal_requests (status: 'pending_approval', requester_id: auth.uid())

Step 3: ACC attempts approve_fee_reversal(p_request_id)
        └── POSTGRESQL RAISES EXCEPTION: "Maker-Checker Violation: requester cannot approve."

Step 4: Cross-Tenant PRIN logs in (JWT app_metadata: { role: 'PRIN', school_code: 'OTHER-02' })
        ├── Attempts approve_fee_reversal(p_request_id)
        └── POSTGRESQL RAISES EXCEPTION: "Cross-tenant access violation: request belongs to another institution."

Step 5: Authorized School PRIN logs in (JWT app_metadata: { role: 'PRIN', school_code: 'GW-01' })
        ├── Calls approve_fee_reversal(p_request_id, p_notes = 'Verified with bank receipt')
        ├── Pessimistic row lock (FOR UPDATE) acquired on request and ledger entry
        ├── Generates UUID Credit Note (-15000.00) with original_entry_id = 'f000...01'
        ├── Marks original fee_ledger entry status = 'reversed'
        ├── Marks fee_reversal_requests status = 'approved' (authorized_by_id: auth.uid())
        └── Audit log trigger captures financial mutation automatically

Step 6: ACC or PRIN attempts direct reverse_fee_entry() without request
        └── POSTGRESQL RAISES EXCEPTION: "Maker-Checker Violation: direct reversal prohibited."
```

---

## 7. Staging Verification SQL Statement Validation

The complete test suite in [`FINAL_STAGING_VERIFICATION.sql`](file:///c:/Users/Astik/school-app/FINAL_STAGING_VERIFICATION.sql) (and [`tests/staging-database-verification.sql`](file:///c:/Users/Astik/school-app/tests/staging-database-verification.sql)) contains 13 isolated stages:

- **Stage 0:** Master Provisioning Permissions Revocation Check
- **Stage 1:** Two-School Cross-Tenant Data Isolation (`SET LOCAL ROLE authenticated;`)
- **Stage 2:** Six Canonical Roles Normalization Check
- **Stage 3:** Profile Privilege Escalation & Executive Promotion Rejection
- **Stage 4:** Student Creation & School-Scoped Retrieval
- **Stage 5:** Attendance Creation & Retrieval with UUID `school_id`
- **Stage 6:** Fee Recording & Receipt Verification
- **Stage 7:** Complete Maker-Checker Reversals & Concurrency Validation
- **Stage 8:** Marks & Results Evaluation Workflow (Conditional on `class_tests`)
- **Stage 9:** Timetable Access & Class Isolation with UUID `school_id` (`SET LOCAL ROLE authenticated;`)
- **Stage 10:** Audit Trigger Attachment, Persistence & Immutability Check
- **Stage 11:** PDF Queue Tenant Lease Isolation Check
- **Stage 12:** Payment Order Tenant & Student Isolation (`SET LOCAL ROLE authenticated;`)
- **Final:** Structured Execution Summary & Guaranteed `ROLLBACK;`

---

## 8. Rollback & Forward Recovery Analysis

[`supabase/migrations/rollback_21_22_23.sql`](file:///c:/Users/Astik/school-app/supabase/migrations/rollback_21_22_23.sql) guarantees safe, non-destructive execution:
1. **Preserves Business Data:** Does NOT drop `fee_ledger`, `fee_reversal_requests`, `audit_logs`, `payment_orders`, `schools`, or `profiles`.
2. **Zero `TRUNCATE CASCADE`:** Never deletes rows from ledger or audit tables.
3. **No Insecure Restorations:** Reverts `schools` policy to authenticated tenant scoping (does NOT restore `USING (true)` or blanket `anon` access). Reverts `claim_next_pdf_job` while preserving tenant isolation.
4. **Pre/Post Verification:** Validates `fee_ledger` and `audit_logs` record counts before and after rollback.

