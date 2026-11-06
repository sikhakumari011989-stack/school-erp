# ACADEMIC OS — STAGING HANDOVER & OPERATIONAL RUNBOOK (v3)
**Target Environment:** Supabase PostgreSQL + Vercel Serverless + Razorpay Test Gateway  
**Document Classification:** Confidential — Platform Owner Operational Manual  
**Security Guarantee:** Contains NO hardcoded secrets or sensitive credentials.

---

## 1. PRE-DEPLOYMENT SCHEMA INSPECTION & AUDIT REPORT

Before executing migrations on your live staging instance, verify the following findings from the v3 independent architectural inspection:

### A. Reconciled Schema Facts & Deconflictions
1. **UUID Primary Key & Fee Reversal Reconciliations (Migration 21):**  
   - `public.fee_ledger.id` is verified as native `UUID`.
   - `reverse_fee_entry`, `request_fee_reversal`, and `approve_fee_reversal` strictly take UUID parameters for `entry_id`.
   - Offsetting credit note generation generates native UUIDs via `gen_random_uuid()` and stores the target entry's UUID in `original_entry_id`.
   - Reversal idempotency keys use `'REV-' || p_entry_id::text`, scoped to the authenticated tenant (`school_id = v_tenant`).
   - Approver identity is derived strictly from `auth.uid()` and session profile — client-supplied `p_authorized_by` is ignored.
   - **Direct reversal cannot bypass maker-checker:** An independent pending reversal request (`requester_id != auth.uid()`) must exist in `fee_reversal_requests`.
2. **Purging of User-Settable Session Variables:**  
   - All legacy fallback checks using `current_setting('app.current_role', true)` and `current_setting('app.is_master_operator', true)` have been completely purged from `get_auth_role()`, `get_current_tenant_id()`, `is_admin_or_executive()`, and all trigger functions.
   - Authenticated sessions derive identity strictly from cryptographically signed JWT claims (`auth.jwt() -> 'app_metadata'`), preventing client-side `set_config()` privilege escalation.
3. **Automatic Audit Trigger Attachment & Fail-Closed Logging (Migration 21):**  
   - Triggers `trg_audit_fee_ledger`, `trg_audit_fee_reversal_requests`, and `trg_audit_profiles` are explicitly attached to their respective tables.
   - `log_audit_event()` performs real `INSERT INTO public.audit_logs` capturing actor identity, action type, old data, and new data.
   - `log_audit_event()` fails closed (`RAISE EXCEPTION`) if insertion encounters any error, preventing unaudited transactions.
   - `public.audit_logs` is immutable: `INSERT`, `UPDATE`, `DELETE`, and `TRUNCATE` privileges are revoked from `authenticated`, `anon`, and `PUBLIC`.
4. **Database-Level Profile Column Protection & Client Creation Restrictions (Migration 22):**  
   - `protect_profile_privileged_columns()` is attached to `BEFORE INSERT OR UPDATE ON public.profiles`.
   - `profiles_canonical_insert` policy strictly forbids client-side insertion of executive/administrative identities (`PRIN`, `HOD`, `principal`, `trustee`). Executive accounts must be provisioned via server-side endpoints.
   - Ordinary authenticated users cannot modify their own `role`, `role_code`, `school_id`, or `status`.
   - Even executive administrators are prevented from altering `school_id` to migrate users across institutions.
5. **UUID Administrator Provisioning & Inter-School Isolation (Migration 23):**  
   - `provision_institutional_school` accepts UUID `v_school_id` and binds it cleanly to `profiles.school_id` (UUID), matching `schools.id` (UUID).
   - Prevents overwriting or reassigning an existing administrator profile belonging to another institution.
   - Platform-owner checks strictly enforce `auth.role() = 'service_role'`.
6. **Payment Orders Restricted Access & Payload Protection (Migration 23):**  
   - `payment_orders` SELECT access is restricted to authorized financial staff (`ACC`, `PRIN`, `HOD`) and the customer (`student_id = auth.uid()::text`).
   - Column-level grants revoke access to `raw_payload` from regular users.
7. **Safe, Non-Destructive Rollback (rollback_21_22_23.sql):**  
   - Executable in Supabase SQL Editor via PL/pgSQL `DO $$ ... $$` blocks.
   - Preserves all transaction and audit tables (`fee_ledger`, `fee_reversal_requests`, `audit_logs`, `payment_orders`) to prevent permanent data loss.
   - Drops audit triggers cleanly before dropping functions.

### B. Complete `SECURITY DEFINER` Permissions Matrix

| Function Signature | search_path | anon | authenticated | service_role | Enforced Caller Checks |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `provision_institutional_school(uuid, text, text, text, text, text, text, text)` | `public` | ❌ REVOKED | ❌ REVOKED | ✅ GRANTED | `auth.role() = 'service_role'` |
| `renew_school_subscription(uuid, text, timestamptz)` | `public` | ❌ REVOKED | ❌ REVOKED | ✅ GRANTED | `auth.role() = 'service_role'` |
| `set_school_license_status(uuid, text)` | `public` | ❌ REVOKED | ❌ REVOKED | ✅ GRANTED | `auth.role() = 'service_role'` |
| `get_master_schools_roster()` | `public` | ❌ REVOKED | ❌ REVOKED | ✅ GRANTED | `auth.role() = 'service_role'` |
| `claim_next_pdf_job(text)` | `public` | ❌ REVOKED | ✅ GRANTED | ✅ GRANTED | Authenticated tenant match enforced |
| `request_fee_reversal(uuid, numeric, text)` | `public` | ❌ REVOKED | ✅ GRANTED | ✅ GRANTED | `is_financial_manager()` + tenant isolation |
| `approve_fee_reversal(uuid, text)` | `public` | ❌ REVOKED | ✅ GRANTED | ✅ GRANTED | `is_admin_or_executive()` + Maker != Checker |
| `reject_fee_reversal(uuid, text)` | `public` | ❌ REVOKED | ✅ GRANTED | ✅ GRANTED | `is_admin_or_executive()` + tenant match |
| `reverse_fee_entry(uuid, text, text, text)` | `public` | ❌ REVOKED | ✅ GRANTED | ✅ GRANTED | `is_admin_or_executive()` + Maker-Checker enforced |

---

## 2. PRE-DEPLOYMENT SCHEMA INSPECTION SCRIPT

Before running migrations on staging, open Supabase SQL Editor, run [`scripts/inspect-database-schema.sql`](file:///c:/Users/Astik/school-app/scripts/inspect-database-schema.sql), and inspect your existing columns, constraints, and policies.

---

## 3. SAFE SEQUENTIAL STAGING EXECUTION RUNBOOK

Execute the following migrations in your Supabase project in the exact order specified below:

### Step 3.1: Open Supabase SQL Editor
1. Log in to [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your staging project.
3. In the left navigation, click **SQL Editor**, then click **New Query**.

### Step 3.2: Execute Migration 21 (Financial & Base Security Hardening)
1. Open [`supabase/migrations/21_security_and_financial_hardening.sql`](file:///c:/Users/Astik/school-app/supabase/migrations/21_security_and_financial_hardening.sql).
2. Copy the entire file contents into the Supabase SQL Editor.
3. Click **Run** (or press `Ctrl+Enter`).
4. Verify the output message: `Success. No rows returned`.

### Step 3.3: Execute Migration 22 (Maker-Checker & RLS Hardening)
1. Open [`supabase/migrations/22_phase2_security_and_rls_hardening.sql`](file:///c:/Users/Astik/school-app/supabase/migrations/22_phase2_security_and_rls_hardening.sql).
2. Copy the entire file contents into the Supabase SQL Editor.
3. Click **Run**.
4. Verify the output message: `Success. No rows returned`.

### Step 3.4: Execute Migration 23 (Sales Readiness & Subscriptions)
1. Open [`supabase/migrations/23_sales_readiness_and_subscription_hardening.sql`](file:///c:/Users/Astik/school-app/supabase/migrations/23_sales_readiness_and_subscription_hardening.sql).
2. Copy the entire file contents into the Supabase SQL Editor.
3. Click **Run**.
4. Verify the output message: `Success. No rows returned`.

---

## 4. EXECUTABLE DATABASE VALIDATION

Run the automated PostgreSQL verification script in Supabase SQL Editor:

1. In **Supabase SQL Editor**, open a **New Query**.
2. Open [`tests/staging-database-verification.sql`](file:///c:/Users/Astik/school-app/tests/staging-database-verification.sql).
3. Copy all lines into the query editor and click **Run**.
4. Confirm that the execution log completes with:
   ```text
   NOTICE: ====================================================================
   NOTICE: STAGE 1: VERIFYING MASTER PROVISIONING PERMISSIONS REVOCATION
   NOTICE: ====================================================================
   NOTICE: SUCCESS: All Master Provisioning RPCs are strictly isolated to service_role.
   NOTICE: ====================================================================
   NOTICE: STAGE 2: SETUP ISOLATED TEST FIXTURES (ALPHA & BETA SCHOOLS)
   NOTICE: ====================================================================
   NOTICE: SUCCESS: Test fixtures initialized for all 6 canonical roles and 2 schools with native UUIDs.
   NOTICE: ====================================================================
   NOTICE: STAGE 3: VERIFYING CROSS-TENANT DATA ISOLATION (AS AUTHENTICATED ROLE)
   NOTICE: ====================================================================
   NOTICE: SUCCESS: RLS strictly blocks cross-tenant access to fee ledgers and profiles.
   NOTICE: ====================================================================
   NOTICE: STAGE 4: VERIFYING MAKER-CHECKER REVERSALS & SELF-APPROVAL BLOCKS (UUID)
   NOTICE: ====================================================================
   NOTICE: VERIFIED: Step 1 (Maker) - Reversal request submitted with ID ...
   NOTICE: VERIFIED: Step 2 - Maker self-approval strictly rejected: ...
   NOTICE: VERIFIED: Step 3 - Cross-tenant approval strictly rejected: ...
   NOTICE: VERIFIED: Step 4 (Checker) - Principal approved reversal. UUID Credit Note created and original marked reversed.
   NOTICE: VERIFIED: Step 5 - Direct reversal without independent maker request strictly rejected: ...
   NOTICE: ====================================================================
   NOTICE: STAGE 5: VERIFYING PROFILE PRIVILEGE ESCALATION BLOCKS (INSERT & UPDATE)
   NOTICE: ====================================================================
   NOTICE: VERIFIED: 5.1 - Student profile privilege escalation on UPDATE strictly rejected.
   NOTICE: VERIFIED: 5.2 - Non-administrative profile creation on INSERT strictly rejected.
   NOTICE: VERIFIED: 5.3 - Executive identity creation restricted strictly to trusted server-side provisioning.
   NOTICE: VERIFIED: 5.4 - Cross-tenant profile migration strictly rejected.
   NOTICE: ====================================================================
   NOTICE: STAGE 6: VERIFYING PDF QUEUE TENANT ISOLATION
   NOTICE: ====================================================================
   NOTICE: VERIFIED: Cross-tenant PDF queue lease claim strictly rejected.
   NOTICE: ====================================================================
   NOTICE: STAGE 7: VERIFYING AUDIT TRIGGER ATTACHMENTS & IMMUTABILITY
   NOTICE: ====================================================================
   NOTICE: VERIFIED: 7.1 - Audit trigger automatically recorded ... entries on fee_ledger.
   NOTICE: VERIFIED: 7.2 - Direct audit log insertion by authenticated users strictly rejected.
   NOTICE: VERIFIED: 7.3 - audit_logs table is immutable. Modifications and deletions strictly rejected.
   NOTICE: ====================================================================
   NOTICE: STAGE 8: VERIFYING PAYMENT ORDER ISOLATION
   NOTICE: ====================================================================
   NOTICE: VERIFIED: Payment orders are strictly tenant-isolated and customer-restricted.
   NOTICE: ====================================================================
   NOTICE: ALL 8 STAGING VERIFICATION TEST SUITES PASSED SUCCESSFULLY!
   NOTICE: ROLLING BACK TRANSACTION TO LEAVE STAGING ENVIRONMENT PRISTINE.
   NOTICE: ====================================================================
   ```
   *(Note: The verification script runs inside an explicit `BEGIN ... ROLLBACK;` block, leaving your staging database completely clean).*

---

## 5. SUPABASE AUTH (`auth.users`) ADMINISTRATOR ONBOARDING

When a school is provisioned via `/master-setup`, its application profile is created in `public.profiles`. In Supabase architecture, password login through GoTrue requires creating an authenticated user in `auth.users`:

### Step 5.1: Create Admin in Supabase Auth (via Dashboard)
1. Go to **Authentication** -> **Users** -> **Add User** -> **Create User**.
2. Enter the administrator's email (e.g., `gw-01.hod-01@academicos.internal`).
3. Set a temporary password and click **Create User**.
4. Set User Metadata / App Metadata:
   ```json
   {
     "school_id": "a0000000-0000-0000-0000-000000000001",
     "role": "HOD"
   }
   ```

### Step 5.2: Automated Script (Optional Node.js)
```javascript
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

await supabase.auth.admin.createUser({
  email: "gw-01.hod-01@academicos.internal",
  password: "SecurePassword123!",
  email_confirm: true,
  app_metadata: { school_id: "a0000000-0000-0000-0000-000000000001", role: "HOD" },
});
```

---

## 6. VERCEL ENVIRONMENT VARIABLES CONFIGURATION

In your [Vercel Project Settings](https://vercel.com) under **Environment Variables**, configure the following keys:

| Variable Name | Environment Scope | Secret? | Source / Description |
| :--- | :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Production, Preview | No | Supabase Dashboard -> Project Settings -> API -> Project URL |
| `VITE_SUPABASE_ANON_KEY` | Production, Preview | No | Supabase Dashboard -> Project Settings -> API -> `anon` public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview | **YES** | Supabase Dashboard -> Project Settings -> API -> `service_role` secret key |
| `VITE_RAZORPAY_KEY_ID` | Production, Preview | No | Razorpay Dashboard -> Settings -> API Keys (`rzp_test_...` or `rzp_live_...`) |
| `RAZORPAY_KEY_ID` | Production, Preview | No | Same value as `VITE_RAZORPAY_KEY_ID` (used by serverless API) |
| `RAZORPAY_KEY_SECRET` | Production, Preview | **YES** | Razorpay Dashboard -> Settings -> API Keys -> Key Secret |
| `RAZORPAY_WEBHOOK_SECRET` | Production, Preview | **YES** | Webhook secret configured in Razorpay Webhooks dashboard |
| `MASTER_SETUP_KEY` | Production, Preview | **YES** | Custom passkey (min 20 characters) for unlocking `/master-setup` |
| `MASTER_TOKEN_SECRET` | Production, Preview | **YES** | 64-char hex string (generate via `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |
| `BIOMETRIC_DEVICE_SECRET`| Production, Preview | **YES** | Shared secret for biometric turnstile hardware |
| `VITE_SENTRY_DSN` | Production, Preview | No | Sentry.io Client Key (DSN) for error reporting |

After updating environment variables, click **Deployments** -> **Redeploy** on the latest commit.

---

## 7. SAFE ROLLBACK PROCEDURE

If rollback is ever required:
1. Open **Supabase SQL Editor** -> **New Query**.
2. Open [`supabase/migrations/rollback_21_22_23.sql`](file:///c:/Users/Astik/school-app/supabase/migrations/rollback_21_22_23.sql).
3. Paste the contents into the query editor and click **Run**.
4. Confirm:
   `NOTICE: SAFE ROLLBACK COMPLETED SUCCESSFULLY. DATABASE RESTORED SAFELY.`
5. **Changes that cannot safely be rolled back automatically:**
   - Table columns (`idempotency_key`, `original_entry_id`) and tables `payment_orders`, `fee_reversal_requests`, and `audit_logs` are explicitly preserved to prevent permanent data loss of transaction and audit history.
