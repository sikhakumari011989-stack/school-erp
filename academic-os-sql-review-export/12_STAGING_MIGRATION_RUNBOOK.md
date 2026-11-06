# ACADEMIC OS — ORDERED STAGING MIGRATION RUNBOOK (FINAL)
**Execution Sequence:** Preflight -> 21 -> 22 -> 23 -> Verification -> Rollback (if needed)  
**Target Platform:** Supabase SQL Editor / PostgreSQL 14+  
**Classification:** Lead Architect Staging Execution Manual  
**Status:** MVP Final Hardened  

---

## 1. Schema Preflight Inspection

Before applying migrations, execute [`scripts/inspect-database-schema.sql`](file:///c:/Users/Astik/school-app/scripts/inspect-database-schema.sql) in your Supabase SQL Editor.

Verify that your staging database conforms to known core table contracts:
- `schools` (id: uuid, code: text)
- `profiles` (id: uuid, school_id: uuid)
- `fee_ledger` (id: uuid, school_id: text, original_entry_id: text)
- `attendance` (school_id: uuid, references schools.id)
- `timetable` (school_id: uuid, references schools.id)

---

## 2. Ordered Sequential Migration Plan

Execute each migration in order in the **Supabase SQL Editor**:

### Step 2.1: Migration 21 — Base Security & Financial Hardening
* **File:** [`supabase/migrations/21_security_and_financial_hardening.sql`](file:///c:/Users/Astik/school-app/supabase/migrations/21_security_and_financial_hardening.sql)
* **What it does:**
  - Adds `idempotency_key` (TEXT) and `original_entry_id` (TEXT) to `fee_ledger`.
  - Creates `fee_reversal_requests` table with `school_id text` and `entry_id uuid`.
  - Purges user-settable session variables (`current_setting('app....')`).
  - Installs canonical tenant helpers: `get_current_tenant_uuid()`, `get_current_tenant_code()`, `get_current_tenant_id()`.
  - Reconciles `audit_logs` (both legacy columns and metadata columns).
  - Installs fail-closed `log_audit_event()` trigger and attaches to `fee_ledger`, `fee_reversal_requests`, and `profiles`.
  - Revokes direct `INSERT, UPDATE, DELETE, TRUNCATE` on `audit_logs` from authenticated users.
* **Expected Output:** `Success. No rows returned.`

### Step 2.2: Migration 22 — Phase 2 Security & RLS Hardening
* **File:** [`supabase/migrations/22_phase2_security_and_rls_hardening.sql`](file:///c:/Users/Astik/school-app/supabase/migrations/22_phase2_security_and_rls_hardening.sql)
* **What it does:**
  - Reconciles `fee_reversal_requests.school_id` to `text` matching `fee_ledger.school_id`.
  - Installs Maker-Checker RPCs: `request_fee_reversal`, `approve_fee_reversal`, `reject_fee_reversal`.
  - Attaches `protect_profile_privileged_columns` trigger to `BEFORE INSERT OR UPDATE ON public.profiles`.
  - Prohibits client-side executive creation (`PRIN`, `HOD`) and client-side promotion of any user to `PRIN` or `HOD`.
  - Tightens `schools` RLS policy to authenticated users within own tenant (removes blanket `anon` access).
  - Sweeps unlisted permissive policies from `schools`, `profiles`, `fee_reversal_requests`, `audit_logs`, `pdf_jobs`, `payment_orders`.
* **Expected Output:** `Success. No rows returned.`

### Step 2.3: Migration 23 — Sales Readiness & Provisioning Hardening
* **File:** [`supabase/migrations/23_sales_readiness_and_subscription_hardening.sql`](file:///c:/Users/Astik/school-app/supabase/migrations/23_sales_readiness_and_subscription_hardening.sql)
* **What it does:**
  - Creates `payment_orders` with `school_id text` matching serverless API payloads (`cleanSchool`).
  - Creates `school_licenses` and `school_license_audit_logs` prerequisite tables.
  - Hardens `provision_institutional_school` to bind UUID `v_school_id` cleanly to `profiles.school_id`.
  - Enforces inter-school administrator overwrite prevention.
  - Revokes platform provisioning RPCs from `anon` and `authenticated`; grants strictly to `service_role`.
  - Restricts `payment_orders` SELECT to authorized staff and customer students; revokes `raw_payload`.
* **Expected Output:** `Success. No rows returned.`

---

## 3. Post-Migration Verification

Execute the complete 13-stage automated verification suite:

1. Open [`tests/staging-database-verification.sql`](file:///c:/Users/Astik/school-app/tests/staging-database-verification.sql).
2. Paste the full file contents into the **Supabase SQL Editor**.
3. Click **Run**.
4. Confirm that all 13 stages output success NOTICE messages. The script concludes with `ROLLBACK;` to guarantee zero test data remains in your staging database.

---

## 4. Safe Rollback Procedure

If rollback is ever required:
1. Open [`supabase/migrations/rollback_21_22_23.sql`](file:///c:/Users/Astik/school-app/supabase/migrations/rollback_21_22_23.sql).
2. Paste into the **Supabase SQL Editor** and click **Run**.
3. The script reverts RPCs, triggers, and policies safely **WITHOUT** dropping tables, **WITHOUT** deleting ledger data, and **WITHOUT** restoring insecure policies.
