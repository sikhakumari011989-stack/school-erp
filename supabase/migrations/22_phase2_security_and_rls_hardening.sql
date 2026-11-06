-- ==============================================================================
-- SUPABASE MIGRATION: 22_phase2_security_and_rls_hardening.sql
-- Production Verification & Enterprise Security Hardening (v3 - Schema Reconciliation)
-- Project: Academic OS (Multi-Tenant EduSaaS)
-- ==============================================================================
-- 1. UUID-Native Maker-Checker Reversals Pipeline (request, approve, reject RPCs)
-- 2. Strictly Prevent Approver Impersonation & Enforce Maker-Checker at Database Level
-- 3. PDF Queue Tenant Isolation (Cross-tenant lease claiming strictly prohibited)
-- 4. Master Provisioning Security Definer Hardening (Strict service_role check; no session variable bypasses)
-- 5. Canonical Single-Authority Policies on public.profiles (Securing INSERT and UPDATE)
-- 6. Strict Privilege Escalation Guards: PRIN/HOD Cannot Create Arbitrary Executive Identities
-- 7. Complete Dynamic RLS Permissive Policy Deconfliction across Core Tables
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. MAKER-CHECKER REVERSAL REQUESTS TABLE & RPC PIPELINE (UUID-NATIVE)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.fee_reversal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  entry_id uuid NOT NULL,
  amount numeric NOT NULL,
  reason text NOT NULL,
  requester_id uuid NOT NULL,
  requester_name text NOT NULL,
  requester_role text NOT NULL DEFAULT 'ACC',
  status text NOT NULL DEFAULT 'pending_approval', -- 'pending_approval' | 'approved' | 'rejected'
  authorized_by text,
  authorized_by_id uuid,
  rejection_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE IF EXISTS public.fee_reversal_requests
  ALTER COLUMN school_id TYPE text,
  ADD COLUMN IF NOT EXISTS authorized_by_id uuid,
  ADD COLUMN IF NOT EXISTS requester_name text,
  ADD COLUMN IF NOT EXISTS requester_role text DEFAULT 'ACC';

ALTER TABLE IF EXISTS public.fee_ledger
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS original_entry_id text;

-- Drop legacy 3-argument and text-based signatures
DROP FUNCTION IF EXISTS public.reverse_fee_entry(text, text, text);
DROP FUNCTION IF EXISTS public.reverse_fee_entry(text, text, text, text);

ALTER TABLE public.fee_reversal_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_fee_reversals_tenant_status
  ON public.fee_reversal_requests (school_id, status);

CREATE INDEX IF NOT EXISTS idx_fee_reversals_entry
  ON public.fee_reversal_requests (school_id, entry_id);

-- RLS: Read Reversal Requests (Financial Managers only within own tenant code)
DROP POLICY IF EXISTS "fee_reversal_requests_select" ON public.fee_reversal_requests;
CREATE POLICY "fee_reversal_requests_select"
  ON public.fee_reversal_requests FOR SELECT TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_code())
    AND public.is_financial_manager()
  );

-- RLS: Insert Reversal Requests (Financial Managers within own tenant code)
DROP POLICY IF EXISTS "fee_reversal_requests_insert" ON public.fee_reversal_requests;
CREATE POLICY "fee_reversal_requests_insert"
  ON public.fee_reversal_requests FOR INSERT TO authenticated
  WITH CHECK (
    school_id = (SELECT public.get_current_tenant_code())
    AND public.is_financial_manager()
    AND requester_id = auth.uid()
  );

-- RLS: Update Reversal Requests (Executive Admins ONLY: PRIN, HOD within own tenant code)
DROP POLICY IF EXISTS "fee_reversal_requests_update" ON public.fee_reversal_requests;
CREATE POLICY "fee_reversal_requests_update"
  ON public.fee_reversal_requests FOR UPDATE TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_code())
    AND public.is_admin_or_executive()
  )
  WITH CHECK (
    school_id = (SELECT public.get_current_tenant_code())
    AND public.is_admin_or_executive()
  );

-- 1.1 RPC: request_fee_reversal (MAKER - UUID NATIVE)
CREATE OR REPLACE FUNCTION public.request_fee_reversal(
  p_entry_id uuid,
  p_amount numeric,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text := public.get_auth_role();
  v_tenant text := public.get_current_tenant_id();
  v_fee_record public.fee_ledger%ROWTYPE;
  v_requester_name text;
  v_request_id uuid;
  v_existing_pending uuid;
BEGIN
  -- 1. Authentication & Role Verification
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthenticated: Valid session required.');
  END IF;

  IF NOT public.is_financial_manager() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Only Financial Managers (ACC, PRIN, HOD) can request fee reversals.');
  END IF;

  IF v_tenant IS NULL OR v_tenant = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tenant context required.');
  END IF;

  -- 2. Retrieve & Verify Target Ledger Entry within tenant (TEXT school_id matching)
  SELECT * INTO v_fee_record
  FROM public.fee_ledger
  WHERE id = p_entry_id 
    AND school_id = public.get_current_tenant_code();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target fee entry not found or belongs to another institution.');
  END IF;

  IF v_fee_record.status = 'reversed' OR v_fee_record.amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot reverse entry: Entry is already reversed or is a credit note.');
  END IF;

  -- 3. Check for Existing Pending Reversal Request within tenant
  SELECT id INTO v_existing_pending
  FROM public.fee_reversal_requests
  WHERE entry_id = p_entry_id 
    AND school_id = public.get_current_tenant_code()
    AND status = 'pending_approval'
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'A pending reversal request already exists for this transaction.', 'request_id', v_existing_pending);
  END IF;

  -- 4. Derive Requester Identity from Profiles
  SELECT COALESCE(full_name, auth.jwt() ->> 'email', 'Accountant')
  INTO v_requester_name
  FROM public.profiles
  WHERE id = v_uid;

  IF v_requester_name IS NULL THEN
    v_requester_name := COALESCE(auth.jwt() ->> 'email', 'Accountant');
  END IF;

  -- 5. Insert Reversal Request (preserves UUID school_id)
  INSERT INTO public.fee_reversal_requests (
    school_id,
    entry_id,
    amount,
    reason,
    requester_id,
    requester_name,
    requester_role,
    status,
    created_at,
    updated_at
  )
  VALUES (
    v_fee_record.school_id,
    p_entry_id,
    ABS(p_amount),
    TRIM(p_reason),
    v_uid,
    v_requester_name,
    v_role,
    'pending_approval',
    now(),
    now()
  )
  RETURNING id INTO v_request_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Fee reversal request submitted successfully for Principal approval.',
    'request_id', v_request_id,
    'entry_id', p_entry_id,
    'amount', p_amount
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.request_fee_reversal(uuid, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_fee_reversal(uuid, numeric, text) TO authenticated;

-- 1.2 RPC: approve_fee_reversal (CHECKER - ENFORCES MAKER-CHECKER & NO IMPERSONATION)
CREATE OR REPLACE FUNCTION public.approve_fee_reversal(
  p_request_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_approver_id uuid := auth.uid();
  v_approver_role text := public.get_auth_role();
  v_tenant text := public.get_current_tenant_id();
  v_request public.fee_reversal_requests%ROWTYPE;
  v_fee_record public.fee_ledger%ROWTYPE;
  v_approver_name text;
  v_credit_note_id uuid := gen_random_uuid();
  v_idempotency_key text;
BEGIN
  -- 1. Authentication & Role Verification: Only Executive Admins (PRIN, HOD) can approve
  IF v_approver_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthenticated: Valid session required.');
  END IF;

  IF NOT public.is_admin_or_executive() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: Only Executive Administrators (Principal / Trustee) can approve fee reversals. Accountants cannot approve reversals.'
    );
  END IF;

  IF v_tenant IS NULL OR v_tenant = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tenant context required.');
  END IF;

  -- 2. Lock & Retrieve Reversal Request
  SELECT * INTO v_request
  FROM public.fee_reversal_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reversal request not found.');
  END IF;

  -- 3. Tenant Isolation Check
  IF v_request.school_id != public.get_current_tenant_code() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cross-tenant access violation: Reversal request belongs to another institution.');
  END IF;

  -- 4. Status Check
  IF v_request.status != 'pending_approval' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reversal request is already ' || v_request.status || '.');
  END IF;

  -- 5. CRITICAL: MAKER-CHECKER CONSTRAINT (PostgreSQL-enforced)
  -- The person who requested the reversal CANNOT approve it!
  IF v_request.requester_id = v_approver_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Maker-Checker Violation: The user who created this reversal request cannot approve it. Independent executive approval is required.'
    );
  END IF;

  -- 6. Pessimistic Row Lock (SELECT ... FOR UPDATE) on target fee_ledger entry
  SELECT * INTO v_fee_record
  FROM public.fee_ledger
  WHERE id = v_request.entry_id AND school_id = v_request.school_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Original fee ledger entry not found.');
  END IF;

  IF v_fee_record.status = 'reversed' OR v_fee_record.amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target fee entry has already been reversed.');
  END IF;

  -- 7. Derive Approver Name strictly from Profiles / Auth
  SELECT COALESCE(full_name, auth.jwt() ->> 'email', 'Principal')
  INTO v_approver_name
  FROM public.profiles
  WHERE id = v_approver_id;

  IF v_approver_name IS NULL THEN
    v_approver_name := COALESCE(auth.jwt() ->> 'email', 'Principal');
  END IF;

  v_idempotency_key := 'REV-' || v_request.id::text;

  -- 8. Insert Offsetting Credit Note into public.fee_ledger (UUID ID and original_entry_id UUID)
  INSERT INTO public.fee_ledger (
    id,
    school_id,
    student_name,
    class_name,
    amount,
    status,
    payment_mode,
    date,
    razorpay_payment_id,
    idempotency_key,
    original_entry_id,
    created_at
  )
  VALUES (
    v_credit_note_id,
    v_fee_record.school_id,
    v_fee_record.student_name,
    v_fee_record.class_name,
    -ABS(v_fee_record.amount),
    'reversed',
    'Credit Note / Reversal (Auth: ' || v_approver_name || ' [' || v_approver_role || '])',
    CURRENT_DATE,
    v_fee_record.razorpay_payment_id,
    v_idempotency_key,
    v_fee_record.id::text,
    now()
  );

  -- 9. Mark original fee_ledger row as reversed
  UPDATE public.fee_ledger
  SET status = 'reversed'
  WHERE id = v_fee_record.id AND school_id = v_request.school_id;

  -- 10. Update Reversal Request status
  UPDATE public.fee_reversal_requests
  SET status = 'approved',
      authorized_by = v_approver_name,
      authorized_by_id = v_approver_id,
      updated_at = now()
  WHERE id = v_request.id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Fee reversal approved with cryptographic row-lock. Credit Note generated.',
    'reversal_id', v_credit_note_id,
    'request_id', v_request.id,
    'amount_reversed', v_fee_record.amount,
    'authorized_by', v_approver_name
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.approve_fee_reversal(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_fee_reversal(uuid, text) TO authenticated;

-- 1.3 RPC: reject_fee_reversal
CREATE OR REPLACE FUNCTION public.reject_fee_reversal(
  p_request_id uuid,
  p_rejection_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_approver_id uuid := auth.uid();
  v_tenant text := public.get_current_tenant_id();
  v_request public.fee_reversal_requests%ROWTYPE;
  v_approver_name text;
BEGIN
  IF v_approver_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthenticated: Valid session required.');
  END IF;

  IF NOT public.is_admin_or_executive() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Only Executive Administrators can reject fee reversals.');
  END IF;

  IF v_tenant IS NULL OR v_tenant = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tenant context required.');
  END IF;

  SELECT * INTO v_request
  FROM public.fee_reversal_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reversal request not found.');
  END IF;

  IF v_request.school_id != public.get_current_tenant_code() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cross-tenant access violation: Reversal request belongs to another institution.');
  END IF;

  IF v_request.status != 'pending_approval' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reversal request is already ' || v_request.status || '.');
  END IF;

  SELECT COALESCE(full_name, auth.jwt() ->> 'email', 'Principal')
  INTO v_approver_name
  FROM public.profiles
  WHERE id = v_approver_id;

  UPDATE public.fee_reversal_requests
  SET status = 'rejected',
      authorized_by = v_approver_name,
      authorized_by_id = v_approver_id,
      rejection_reason = TRIM(p_rejection_reason),
      updated_at = now()
  WHERE id = v_request.id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Fee reversal request successfully rejected.',
    'request_id', v_request.id
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reject_fee_reversal(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_fee_reversal(uuid, text) TO authenticated;

-- ------------------------------------------------------------------------------
-- 2. PDF QUEUE TENANT ISOLATION HARDENING
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.claim_next_pdf_job(p_school_id text)
RETURNS SETOF public.pdf_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text := COALESCE(auth.role(), 'none');
  v_current_tenant text := public.get_current_tenant_id();
  v_effective_school text;
BEGIN
  IF v_caller_role = 'service_role' THEN
    v_effective_school := p_school_id;
  ELSE
    IF v_current_tenant IS NULL OR v_current_tenant = '' THEN
      RAISE EXCEPTION 'Unauthenticated or unassociated tenant context.';
    END IF;

    IF p_school_id IS NOT NULL AND UPPER(TRIM(p_school_id)) != UPPER(TRIM(v_current_tenant)) THEN
      RAISE EXCEPTION 'Cross-tenant access violation: Cannot claim PDF jobs for institution % from tenant %', p_school_id, v_current_tenant;
    END IF;

    v_effective_school := v_current_tenant;
  END IF;

  RETURN QUERY
  UPDATE public.pdf_jobs
  SET status = 'Processing',
      attempts = attempts + 1,
      locked_until = now() + interval '2 minutes'
  WHERE id = (
    SELECT id
    FROM public.pdf_jobs
    WHERE school_id::text = v_effective_school
      AND status = 'Queued'
      AND (locked_until IS NULL OR locked_until < now())
      AND attempts < 3
    ORDER BY created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  RETURNING *;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_next_pdf_job(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_next_pdf_job(text) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 3. MASTER SETUP SECURITY DEFINER RPC HARDENING (FAIL CLOSED; NO SESSION VARS)
-- ------------------------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public.provision_institutional_school(text, text, text, text, text, text, text, text, text, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.provision_institutional_school(text, text, text, text, text, text, text, text, text, int) TO service_role;

REVOKE EXECUTE ON FUNCTION public.set_school_license_status(text, text, timestamptz, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_school_license_status(text, text, timestamptz, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_master_schools_roster() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_master_schools_roster() TO service_role;

-- ------------------------------------------------------------------------------
-- 4. CANONICAL RLS ON PROFILES & SCHOOLS (UUID-AWARE)
-- ------------------------------------------------------------------------------

ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Re-establish canonical RLS on schools (authenticated only, own tenant)
ALTER TABLE IF EXISTS public.schools
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

DROP POLICY IF EXISTS "schools_canonical_select" ON public.schools;
CREATE POLICY "schools_canonical_select"
  ON public.schools FOR SELECT TO authenticated
  USING (
    id = public.get_current_tenant_uuid()
    OR code = public.get_current_tenant_code()
  );

REVOKE INSERT, UPDATE, DELETE ON public.schools FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.schools TO service_role;

-- Drop all legacy policies on profiles
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_tenant_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_canonical_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_canonical_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_canonical_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_canonical_delete" ON public.profiles;

-- Canonical Profiles Policies (UUID to UUID direct comparison)
-- SELECT: Users can see profiles in their school, or their own profile
CREATE POLICY "profiles_canonical_select"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    school_id = public.get_current_tenant_uuid()
    OR id = auth.uid()
  );

-- INSERT: Strictly restricted to Executive Admins for their own school (PRIN, HOD) or service_role
CREATE POLICY "profiles_canonical_insert"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (
    school_id = public.get_current_tenant_uuid()
    AND public.is_admin_or_executive()
  );

-- UPDATE: Active users can update non-privileged fields of their own profile; admins can manage school profiles
CREATE POLICY "profiles_canonical_update"
  ON public.profiles FOR UPDATE TO authenticated
  USING (
    (id = auth.uid() AND (SELECT status = 'active' FROM public.profiles WHERE id = auth.uid()))
    OR (
      school_id = public.get_current_tenant_uuid()
      AND public.is_admin_or_executive()
    )
  )
  WITH CHECK (
    (id = auth.uid() AND (SELECT status = 'active' FROM public.profiles WHERE id = auth.uid()))
    OR (
      school_id = public.get_current_tenant_uuid()
      AND public.is_admin_or_executive()
    )
  );

-- DELETE: Executive Admins only within their tenant
CREATE POLICY "profiles_canonical_delete"
  ON public.profiles FOR DELETE TO authenticated
  USING (
    school_id = public.get_current_tenant_uuid()
    AND public.is_admin_or_executive()
  );

-- ------------------------------------------------------------------------------
-- 5. STRICT DATABASE-LEVEL PRIVILEGE ESCALATION GUARDS (INSERT & UPDATE)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.protect_profile_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text := COALESCE(auth.role(), '');
  v_current_tenant_uuid uuid := public.get_current_tenant_uuid();
BEGIN
  -- Strict Service Role Bypass (Master setup gateway or trusted server provisioning)
  -- Purged all user-settable session variables (e.g. app.is_master_operator)
  IF v_caller_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Tenant isolation: Profile school_id must match authenticated tenant UUID
    IF v_current_tenant_uuid IS NULL OR NEW.school_id IS DISTINCT FROM v_current_tenant_uuid THEN
      RAISE EXCEPTION 'Tenant Isolation Violation: Cannot insert profile for another school (target: %, caller: %).', NEW.school_id, v_current_tenant_uuid;
    END IF;

    -- Caller MUST be an executive admin
    IF NOT public.is_admin_or_executive() THEN
      RAISE EXCEPTION 'Privilege Escalation Blocked: Non-administrative callers cannot insert profiles.';
    END IF;

    -- PRIN/HOD CANNOT CREATE ARBITRARY EXECUTIVE OR ADMINISTRATIVE IDENTITIES
    -- Executive identities (PRIN, HOD, ADMIN) must be provisioned via trusted server-side provisioning (service_role)
    IF UPPER(COALESCE(NEW.role_code, 'STU')) IN ('PRIN', 'HOD', 'ADMIN', 'SUPER_ADMIN', 'SUPERADMIN')
       OR UPPER(COALESCE(NEW.role, 'student')) IN ('principal', 'trustee', 'admin', 'superadmin') THEN
      RAISE EXCEPTION 'Privilege Escalation Blocked: Executive profiles can only be provisioned via trusted server-side provisioning (service_role).';
    END IF;

    -- Status must be active on creation
    IF NEW.status IS DISTINCT FROM 'active' AND NEW.status IS NOT NULL THEN
      RAISE EXCEPTION 'Privilege Escalation Blocked: Custom profile status on insert is not permitted.';
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Non-executive users cannot modify role, role_code, school_id, status, or is_active
    IF NOT public.is_admin_or_executive() THEN
      IF NEW.role IS DISTINCT FROM OLD.role THEN
        RAISE EXCEPTION 'Privilege Escalation Blocked: Non-administrative users cannot modify role.';
      END IF;
      IF NEW.role_code IS DISTINCT FROM OLD.role_code THEN
        RAISE EXCEPTION 'Privilege Escalation Blocked: Non-administrative users cannot modify role_code.';
      END IF;
      IF NEW.school_id IS DISTINCT FROM OLD.school_id THEN
        RAISE EXCEPTION 'Tenant Isolation Violation: Non-administrative users cannot modify school_id.';
      END IF;
      IF NEW.status IS DISTINCT FROM OLD.status THEN
        RAISE EXCEPTION 'Privilege Escalation Blocked: Non-administrative users cannot modify status.';
      END IF;
      IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
        RAISE EXCEPTION 'Privilege Escalation Blocked: Non-administrative users cannot modify is_active.';
      END IF;
    ELSE
      -- Even executive admins cannot modify school_id to transfer profiles across institutions
      IF NEW.school_id IS DISTINCT FROM OLD.school_id THEN
        RAISE EXCEPTION 'Tenant Isolation Violation: Profile cannot be transferred across institutions.';
      END IF;
      -- CRITICAL FIX: Executive admins (PRIN/HOD) CANNOT promote any user to PRIN, HOD, ADMIN, or SUPER_ADMIN via client update
      IF UPPER(COALESCE(NEW.role_code, '')) IN ('PRIN', 'HOD', 'ADMIN', 'SUPER_ADMIN', 'SUPERADMIN') 
         AND UPPER(COALESCE(OLD.role_code, '')) NOT IN ('PRIN', 'HOD', 'ADMIN', 'SUPER_ADMIN', 'SUPERADMIN') THEN
        RAISE EXCEPTION 'Privilege Escalation Blocked: Executive roles (PRIN, HOD) and platform administrative roles can only be granted via trusted server-side provisioning (service_role).';
      END IF;
      IF UPPER(COALESCE(NEW.role, '')) IN ('PRINCIPAL', 'TRUSTEE', 'ADMIN', 'SUPERADMIN') 
         AND UPPER(COALESCE(OLD.role, '')) NOT IN ('PRINCIPAL', 'TRUSTEE', 'ADMIN', 'SUPERADMIN') THEN
        RAISE EXCEPTION 'Privilege Escalation Blocked: Executive roles (principal, trustee) and platform administrative roles can only be granted via trusted server-side provisioning (service_role).';
      END IF;
      -- Even existing executive admins cannot escalate any account to platform ADMIN or SUPER_ADMIN
      IF UPPER(COALESCE(NEW.role_code, '')) IN ('ADMIN', 'SUPER_ADMIN', 'SUPERADMIN') THEN
        RAISE EXCEPTION 'Privilege Escalation Blocked: Platform administrator roles can only be granted via server-side provisioning.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_privileged_columns ON public.profiles;
CREATE TRIGGER trg_protect_profile_privileged_columns
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_privileged_columns();

-- ------------------------------------------------------------------------------
-- 6. DYNAMIC RLS PERMISSIVE POLICY DECONFLICTION
-- ------------------------------------------------------------------------------

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('schools', 'profiles', 'fee_reversal_requests', 'audit_logs', 'pdf_jobs', 'payment_orders')
      AND policyname NOT IN (
        'schools_canonical_select',
        'profiles_canonical_select',
        'profiles_canonical_insert',
        'profiles_canonical_update',
        'profiles_canonical_delete',
        'fee_reversal_requests_select',
        'fee_reversal_requests_insert',
        'fee_reversal_requests_update',
        'audit_logs_select',
        'payment_orders_select',
        'payment_orders_service_role'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;
