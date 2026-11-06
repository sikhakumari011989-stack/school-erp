# ACADEMIC OS — UNRESOLVED ISSUES & OPERATIONAL PREREQUISITES (FINAL)
**Classification:** Technical Disclosure & Staging Prerequisites  
**Target Reviewer:** Independent Security & Database Migration Reviewer  
**Status Date:** 2026-11-05  
**Pass:** Final MVP Engineering Correction Pass  

---

## 1. Supabase Auth (`auth.users`) vs. Application Profiles (`public.profiles`)
* **Finding:**  
  In the Supabase architecture, user authentication credentials (`auth.users`) exist in an internal schema managed by Supabase GoTrue, while application profiles exist in `public.profiles`.
* **Current Behavior:**  
  When an institution is provisioned via `/master-setup` or the `provision_institutional_school` RPC, a row is created in `public.schools`, `public.school_licenses`, and `public.profiles` (with `role = 'principal'` or `'trustee'`, and `role_code = 'PRIN-01'` or `'HOD-01'`).
* **Requirement for Live Sign-in:**  
  Inserting a row into `public.profiles` does NOT automatically register a hashed password in `auth.users`. To enable password-based login through Supabase Auth, the platform administrator must either:
  1. Invite the user via Supabase Dashboard -> **Authentication** -> **Users** -> **Invite User**; or
  2. Trigger the Supabase Auth Admin API (`supabase.auth.admin.createUser`) using `SUPABASE_SERVICE_ROLE_KEY` in a secure server-side script; or
  3. Have the user sign up with the provisioned email and bind their profile UUID to `auth.users.id`.
* **Resolution in Staging Package:**  
  The RPC return value and `OWNER_ACTIONS.md` explicitly document this separation (`auth_account_created: false`) so operators do not assume `public.profiles` insertion creates a GoTrue password credential. A complete Node.js script is provided in `OWNER_ACTIONS.md` Section 5.

---

## 2. Remote Live Database Verification Pending Owner Execution
* **Finding:**  
  By strict mandate, the AI assistant does not possess credentials to execute DDL or DML against the owner's remote live Supabase database.
* **Status:**  
  The verification script `tests/staging-database-verification.sql` has been completely rebuilt with 13 isolated test suites (Stage 0 to Stage 12). It uses dynamically generated UUIDs and unique school codes (`TEST-ALPHA-<random>`) to prevent collision with real data, runs inside a transaction block, and concludes with an explicit `ROLLBACK;`.
* **Requirement:**  
  The repository owner must copy and execute `tests/staging-database-verification.sql` in their Supabase SQL Editor and confirm that all 13 stages output their respective `NOTICE` lines.

---

## 3. Live Gateway Key Provisioning (Test Mode vs Live Mode)
* **Finding:**  
  Serverless online fee collection endpoints (`/api/razorpay/create-order` and `/api/razorpay/verify-payment`) operate in test mode when provided valid Razorpay test keys.
* **Requirement:**  
  The owner must register a Razorpay account, obtain `rzp_test_...` credentials, and configure `VITE_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` in Vercel Preview/Development environment scope before live payment verification can occur.

---

## 4. Reconciled Database Schema Standards (Final Corrected Contracts)
* **Fact 1 (`fee_ledger.id` is UUID; `school_id` is TEXT):**  
  Primary key is `uuid`. Offsetting credit notes are generated as native UUIDs (`gen_random_uuid()`), and `original_entry_id` stores the referenced entry's UUID string in a TEXT column.
* **Fact 2 (`fee_reversal_requests.school_id` is TEXT; `entry_id` is UUID):**  
  Corrected to match `fee_ledger.school_id` (TEXT) and `fee_ledger.id` (UUID). All joins and tenant comparisons are direct TEXT comparisons.
* **Fact 3 (`payment_orders.school_id` is TEXT):**  
  Corrected to match serverless API payloads (`cleanSchool`). Column-level permissions protect `raw_payload` from authenticated clients.
* **Fact 4 (`profiles.school_id` is UUID; `schools.id` is UUID):**  
  Reconciled across all RLS helper functions, provisioning RPCs, and verification fixtures. Profiles RLS compares UUID to UUID using `get_current_tenant_uuid()`.
* **Fact 5 (Profile Escalation Loophole Closed):**  
  Database trigger blocks ordinary users from updating roles or school IDs, and blocks executive admins from promoting any user to `PRIN` or `HOD` via client updates.
* **Fact 6 (Zero Exposed Client Secrets):**  
  Third-party bearer tokens (`VITE_WATI_ACCESS_TOKEN`, `VITE_TWILIO_AUTH_TOKEN`) have been purged from the client bundle.
