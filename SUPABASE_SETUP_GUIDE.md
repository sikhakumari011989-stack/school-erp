# ACADEMIC OS — SUPABASE BACKEND & DATABASE SETUP GUIDE
**Target Database:** PostgreSQL 15 (Supabase Managed)  
**Security Architecture:** Strict Row-Level Security (RLS) with Cryptographic JWT Tenant Isolation

---

## 1. Supabase Project Initialization

1. Navigate to [Supabase Dashboard](https://supabase.com/dashboard) and create a new project.
2. Choose a production region closest to your target institutions (e.g., `ap-south-1` for India / Mumbai).
3. Note your **Project Reference ID**, **Project URL**, **anon public key**, and **service_role secret key** from **Project Settings** -> **API**.

---

## 2. SQL Migration Sequence

Execute all migrations in exact numeric order via the **Supabase SQL Editor** (`Dashboard -> SQL Editor -> New Query`).

| # | Migration File | Primary Purpose |
| :--- | :--- | :--- |
| **01** | `01_rls_policies.sql` | Core schema (`schools`, `profiles`, `students`, `teachers`, `attendance`, `fee_ledger`). Base RLS. |
| **02** | `02_pre_commercial_hardening.sql` | PDF generation queue (`pdf_jobs`), turnstile logs, statutory consent. |
| **03** | `03_audit_remediation.sql` | Multi-tenant helper functions, student index optimization. |
| **04** | `04_cto_audit_hardening.sql` | Pessimistic locking foundations, biometric attendance logs. |
| **05** | `05_calendar_tests_streaks.sql` | Academic calendar, study streaks, initial test marks tables. |
| **14** | `14_institutional_accreditation.sql` | Accreditation criteria table (`accreditation_criteria`) & statutory Bye-Laws. |
| **19** | `19_master_setup_and_licensing.sql` | School licenses (`school_licenses`), audit logs, institutional mode support. |
| **20** | `20_class_test_marks.sql` | Teacher class tests (`class_tests`) & private student marks portal (`test_scores`). |
| **21** | `21_security_and_financial_hardening.sql` | Initial financial security fixes, idempotency keys. |
| **22** | `22_phase2_security_and_rls_hardening.sql` | **Critical Security Migration:** Database-level maker-checker (`fee_reversal_requests`), `claim_next_pdf_job` tenant checks, anon revoke on provisioning RPCs, drop of legacy permissive policies. |
| **23** | `23_sales_readiness_and_subscription_hardening.sql` | **Phase 3 Migration:** Payment orders table (`payment_orders`), auto-provisioning admin profiles, subscription renewal RPC. |

---

## 3. Storage Bucket Configuration

Academic OS requires two public/private storage buckets in Supabase Storage (`Dashboard -> Storage -> New Bucket`):

1. **`institutional-documents`**
   - **Public:** False (Private)
   - **File Size Limit:** 10 MB
   - **Allowed MIME types:** `application/pdf`, `image/png`, `image/jpeg`
   - **Access Policy:** Authenticated members of the owning school can read; Principal and Admin can upload/delete.

2. **`receipt-proofs`**
   - **Public:** False (Private)
   - **File Size Limit:** 5 MB
   - **Allowed MIME types:** `image/png`, `image/jpeg`, `image/webp`
   - **Access Policy:** Students can upload their own proofs; Accountants and Principals can review.

---

## 4. Authentication Configuration

In the Supabase Dashboard under **Authentication** -> **URL Configuration**:
- **Site URL:** `https://<your-production-domain>`
- **Redirect URLs:**
  - `https://<your-production-domain>/**`
  - `http://localhost:5173/**` (for local development)

Under **Authentication** -> **Providers** -> **Email**:
- Enable Email Signup: **On**
- Confirm Email: Optional for managed institutional logins (can be turned Off if admins provision staff credentials directly).

---

## 5. Staging Database Verification Execution

To verify that your Supabase instance is properly configured and all RLS policies are active:

1. Open **Supabase SQL Editor**.
2. Open the file [`tests/staging-database-verification.sql`](file:///c:/Users/Astik/school-app/tests/staging-database-verification.sql).
3. Copy the contents and execute the script.
4. Verify that all 5 stages pass with zero exceptions:
   ```
   STAGE 1: VERIFYING MASTER PROVISIONING PERMISSIONS REVOCATION -> SUCCESS
   STAGE 2: SETUP TEST FIXTURES (SCHOOL-ALPHA & SCHOOL-BETA) -> SUCCESS
   STAGE 3: VERIFYING DATABASE-LEVEL MAKER-CHECKER REVERSALS -> SUCCESS
   STAGE 4: VERIFYING PDF QUEUE TENANT ISOLATION -> SUCCESS
   STAGE 5: VERIFYING PERMISSIVE RLS POLICY DECONFLICTION -> SUCCESS
   ALL 5 STAGING VERIFICATION STAGES PASSED WITH ZERO VIOLATIONS!
   ```
   *(The script runs inside a transaction and automatically rolls back at the end, leaving your production tables pristine).*

