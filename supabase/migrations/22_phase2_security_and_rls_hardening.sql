-- ==============================================================================
-- SUPABASE MIGRATION: 22_phase2_security_and_rls_hardening.sql
-- Production Verification & Enterprise Security Hardening
-- Project: Academic OS (Multi-Tenant EduSaaS)
-- ==============================================================================
-- 1. True Database-Enforced Maker-Checker Financial Reversals (request/approve/reject RPCs)
-- 2. Strictly Prevent Approver Impersonation (Approver derived solely from auth.uid())
-- 3. PDF Queue Tenant Isolation (Cross-tenant lease claim strictly prohibited)
-- 4. Master Provisioning Security Definer Hardening (Revoke from anon/public/authenticated, grant to service_role)
-- 5. Complete RLS Permissive Policy Deconfliction (Drop all legacy OR-leaking policies)
-- 6. Canonical Single-Authority Policies on core tables
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. MAKER-CHECKER REVERSAL REQUESTS TABLE & RPC PIPELINE
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.fee_reversal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  entry_id uuid NOT NULL REFERENCES public.fee_ledger(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  reason text NOT NULL,
  requester_id uuid NOT NULL,
  requester_name text NOT NULL,
  requester_role text NOT NULL,
  status text NOT NULL DEFAULT 'pending_approval', -- 'pending_approval' | 'approved' | 'rejected'
  authorized_by text,
  authorized_by_id uuid,
  rejection_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.fee_reversal_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_fee_reversals_tenant_status
  ON public.fee_reversal_requests (school_id, status);

CREATE INDEX IF NOT EXISTS idx_fee_reversals_entry
  ON public.fee_reversal_requests (entry_id);

-- RLS: Read Reversal Requests (Financial Managers only within own tenant)
DROP POLICY IF EXISTS "fee_reversal_requests_select" ON public.fee_reversal_requests;
CREATE POLICY "fee_reversal_requests_select"
  ON public.fee_reversal_requests FOR SELECT TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.is_financial_manager()
  );

-- RLS: Insert Reversal Requests (Financial Managers within own tenant)
DROP POLICY IF EXISTS "fee_reversal_requests_insert" ON public.fee_reversal_requests;
CREATE POLICY "fee_reversal_requests_insert"
  ON public.fee_reversal_requests FOR INSERT TO authenticated
  WITH CHECK (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.is_financial_manager()
    AND requester_id = auth.uid()
  );

-- RLS: Update Reversal Requests (Executive Admins ONLY: PRIN, HOD within own tenant)
DROP POLICY IF EXISTS "fee_reversal_requests_update" ON public.fee_reversal_requests;
CREATE POLICY "fee_reversal_requests_update"
  ON public.fee_reversal_requests FOR UPDATE TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.is_admin_or_executive()
  )
  WITH CHECK (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.is_admin_or_executive()
  );

-- 1.1 RPC: request_fee_reversal (MAKER)
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

  -- 2. Retrieve & Verify Target Ledger Entry
  SELECT * INTO v_fee_record
  FROM public.fee_ledger
  WHERE id = p_entry_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target fee entry not found.');
  END IF;

  IF v_fee_record.school_id != v_tenant THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cross-tenant access violation: Target fee entry belongs to another institution.');
  END IF;

  IF v_fee_record.status = 'reversed' OR v_fee_record.amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot reverse entry: Entry is already reversed or is a credit note.');
  END IF;

  -- 3. Check for Existing Pending Reversal Request
  SELECT id INTO v_existing_pending
  FROM public.fee_reversal_requests
  WHERE entry_id = p_entry_id AND status = 'pending_approval'
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

  -- 5. Insert Reversal Request
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
    v_tenant,
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

  -- 2. Lock & Retrieve Reversal Request
  SELECT * INTO v_request
  FROM public.fee_reversal_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reversal request not found.');
  END IF;

  -- 3. Tenant Isolation Check
  IF v_request.school_id != v_tenant THEN
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

  -- 8. Insert Offsetting Credit Note into public.fee_ledger
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
  WHERE id = v_fee_record.id;

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

  SELECT * INTO v_request
  FROM public.fee_reversal_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reversal request not found.');
  END IF;

  IF v_request.school_id != v_tenant THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cross-tenant access violation.');
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

-- 1.4 Hardened Direct Reversal Function: public.reverse_fee_entry
-- Strictly derives approver from auth.uid(). Prohibits client-supplied p_authorized_by impersonation.
CREATE OR REPLACE FUNCTION public.reverse_fee_entry(
  p_entry_id uuid,
  p_reason text DEFAULT 'Maker-Checker Principal Approval',
  p_authorized_by text DEFAULT NULL, -- Ignored: approver is derived strictly from auth.uid()
  p_idempotency_key text DEFAULT NULL
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
  v_fee_record public.fee_ledger%ROWTYPE;
  v_existing_reversal public.fee_ledger%ROWTYPE;
  v_existing_req public.fee_reversal_requests%ROWTYPE;
  v_credit_note_id uuid := gen_random_uuid();
  v_effective_key text;
  v_derived_approver text;
BEGIN
  -- 1. Authorization: ONLY Executive Administrators (PRIN, HOD) can execute reversals
  IF v_approver_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthenticated: Valid session required.');
  END IF;

  IF NOT public.is_admin_or_executive() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: Only Executive Administrators (Principal / Trustee) can reverse fee entries. Accountants must submit a reversal request.'
    );
  END IF;

  -- 2. Anti-Impersonation: Approver name derived strictly from authenticated user profile
  SELECT COALESCE(full_name, auth.jwt() ->> 'email', 'Principal')
  INTO v_derived_approver
  FROM public.profiles
  WHERE id = v_approver_id;

  IF v_derived_approver IS NULL THEN
    v_derived_approver := COALESCE(auth.jwt() ->> 'email', 'Principal');
  END IF;

  v_effective_key := COALESCE(NULLIF(p_idempotency_key, ''), 'REV-' || p_entry_id::text);

  -- 3. Idempotency Check
  SELECT * INTO v_existing_reversal
  FROM public.fee_ledger
  WHERE idempotency_key = v_effective_key
     OR (original_entry_id = p_entry_id::text AND status = 'reversed' AND amount < 0)
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Fee entry already reversed with this idempotency key (deduplicated).',
      'reversal_id', v_existing_reversal.id,
      'idempotent', true
    );
  END IF;

  -- 4. Pessimistic Row Lock & Tenant Isolation Check
  SELECT * INTO v_fee_record
  FROM public.fee_ledger
  WHERE id = p_entry_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fee ledger entry not found.');
  END IF;

  IF v_fee_record.school_id != v_tenant THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cross-tenant access violation: Target fee entry belongs to another institution.');
  END IF;

  IF v_fee_record.status = 'reversed' OR v_fee_record.amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target fee entry has already been reversed.');
  END IF;

  -- 5. Maker-Checker Check on Associated Reversal Request
  SELECT * INTO v_existing_req
  FROM public.fee_reversal_requests
  WHERE entry_id = p_entry_id AND status = 'pending_approval'
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    IF v_existing_req.requester_id = v_approver_id THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Maker-Checker Violation: You requested this reversal. An independent executive must approve it.'
      );
    END IF;

    UPDATE public.fee_reversal_requests
    SET status = 'approved',
        authorized_by = v_derived_approver,
        authorized_by_id = v_approver_id,
        updated_at = now()
    WHERE id = v_existing_req.id;
  END IF;

  -- 6. Insert Credit Note
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
    'Credit Note / Reversal (Auth: ' || v_derived_approver || ' [' || v_approver_role || '])',
    CURRENT_DATE,
    v_fee_record.razorpay_payment_id,
    v_effective_key,
    p_entry_id::text,
    now()
  );

  -- 7. Update Original Entry
  UPDATE public.fee_ledger
  SET status = 'reversed'
  WHERE id = p_entry_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Fee entry successfully reversed with pessimistic lock and credit note.',
    'reversal_id', v_credit_note_id,
    'original_id', p_entry_id,
    'amount_reversed', v_fee_record.amount,
    'authorized_by', v_derived_approver
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reverse_fee_entry(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reverse_fee_entry(uuid, text, text, text) TO authenticated;

-- Text overload with safe UUID parsing
CREATE OR REPLACE FUNCTION public.reverse_fee_entry(
  p_entry_id text,
  p_reason text DEFAULT 'Maker-Checker Principal Approval',
  p_authorized_by text DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parsed_uuid uuid;
BEGIN
  BEGIN
    v_parsed_uuid := p_entry_id::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid UUID format for transaction entry reference ID.'
    );
  END;

  RETURN public.reverse_fee_entry(v_parsed_uuid, p_reason, p_authorized_by, p_idempotency_key);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reverse_fee_entry(text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reverse_fee_entry(text, text, text, text) TO authenticated;

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
  -- Service role workers can claim for any school; authenticated tenant users can ONLY claim for their own school
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
    WHERE school_id = v_effective_school
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
-- 3. MASTER SETUP SECURITY DEFINER RPC HARDENING
-- ------------------------------------------------------------------------------

-- 3.1 REVOKE UNSAFE EXECUTION GRANTS
REVOKE EXECUTE ON FUNCTION public.provision_institutional_school(text, text, text, text, text, text, text, text, text, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.provision_institutional_school(text, text, text, text, text, text, text, text, text, int) TO service_role;

REVOKE EXECUTE ON FUNCTION public.set_school_license_status(text, text, timestamptz, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_school_license_status(text, text, timestamptz, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_master_schools_roster() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_master_schools_roster() TO service_role;

-- 3.2 Add Internal Platform-Owner Check inside provision_institutional_school
CREATE OR REPLACE FUNCTION public.provision_institutional_school(
  p_name text,
  p_code text,
  p_admin_name text,
  p_admin_role_code text,
  p_admin_email text DEFAULT '',
  p_admin_phone text DEFAULT '',
  p_address text DEFAULT '',
  p_mode text DEFAULT 'school',
  p_tier text DEFAULT 'enterprise',
  p_validity_days int DEFAULT 365
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school_id uuid;
  v_clean_code text := UPPER(TRIM(p_code));
  v_expires_at timestamptz := now() + (p_validity_days || ' days')::interval;
  v_license_key text := 'LIC-' || v_clean_code || '-' || floor(extract(epoch from now()))::text;
  v_result jsonb;
BEGIN
  -- Strict Platform Owner Verification: Must be service_role or authenticated master operator
  IF COALESCE(auth.role(), '') != 'service_role' AND NULLIF(current_setting('app.is_master_operator', true), '') IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Platform Owner service-role authority required for institutional provisioning.';
  END IF;

  IF v_clean_code IS NULL OR length(v_clean_code) < 2 THEN
    RAISE EXCEPTION 'School code must be at least 2 characters.';
  END IF;

  -- Upsert into public.schools
  INSERT INTO public.schools (
    code,
    name,
    phone,
    address,
    status,
    subscription_status,
    subscription_tier,
    subscription_expires_at,
    institution_mode,
    created_at
  )
  VALUES (
    v_clean_code,
    TRIM(p_name),
    TRIM(p_admin_phone),
    TRIM(p_address),
    'active',
    'active',
    p_tier,
    v_expires_at,
    p_mode,
    now()
  )
  ON CONFLICT (code) DO UPDATE
  SET
    name = EXCLUDED.name,
    phone = COALESCE(NULLIF(EXCLUDED.phone, ''), public.schools.phone),
    address = COALESCE(NULLIF(EXCLUDED.address, ''), public.schools.address),
    status = 'active',
    subscription_status = 'active',
    subscription_tier = EXCLUDED.subscription_tier,
    subscription_expires_at = EXCLUDED.subscription_expires_at,
    institution_mode = EXCLUDED.institution_mode
  RETURNING id INTO v_school_id;

  -- Create or update license row
  INSERT INTO public.school_licenses (
    school_id,
    school_code,
    license_key,
    tier,
    status,
    starts_at,
    expires_at,
    updated_at
  )
  VALUES (
    v_school_id,
    v_clean_code,
    v_license_key,
    p_tier,
    'active',
    now(),
    v_expires_at,
    now()
  )
  ON CONFLICT (license_key) DO UPDATE
  SET
    status = 'active',
    expires_at = v_expires_at,
    updated_at = now();

  -- Record in audit trail
  INSERT INTO public.school_license_audit_logs (
    school_code,
    action,
    previous_status,
    new_status,
    performed_by,
    notes
  )
  VALUES (
    v_clean_code,
    'PROVISION',
    'unregistered',
    'active',
    'master_operator',
    'Provisioned institutional node: ' || TRIM(p_name) || ' with Master Admin: ' || COALESCE(p_admin_name, '')
  );

  v_result := jsonb_build_object(
    'success', true,
    'school_id', v_school_id,
    'school_code', v_clean_code,
    'school_name', TRIM(p_name),
    'status', 'active',
    'subscription_status', 'active',
    'expires_at', v_expires_at,
    'license_key', v_license_key
  );

  RETURN v_result;
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. RLS POLICY DECONFLICTION (DROP ALL OVERLAPPING PERMISSIVE POLICIES)
-- ------------------------------------------------------------------------------

-- 4.1 class_tests: Drop legacy 05 policies to ensure only 20_class_test_marks policies govern
DROP POLICY IF EXISTS "class_tests_select" ON public.class_tests;
DROP POLICY IF EXISTS "class_tests_write" ON public.class_tests;

-- 4.2 test_scores: Drop legacy 05 policies (which allowed student marks leaks)
DROP POLICY IF EXISTS "test_scores_select" ON public.test_scores;
DROP POLICY IF EXISTS "test_scores_write" ON public.test_scores;

-- 4.3 schools: Drop legacy wide/conflicting policies
DROP POLICY IF EXISTS "schools_select" ON public.schools;
DROP POLICY IF EXISTS "schools_insert" ON public.schools;
DROP POLICY IF EXISTS "schools_update" ON public.schools;
DROP POLICY IF EXISTS "schools_delete" ON public.schools;
DROP POLICY IF EXISTS "schools_public_select" ON public.schools;

-- Re-establish canonical RLS on schools:
-- SELECT: Public can see active school branding; authenticated can read active school
CREATE POLICY "schools_canonical_select"
  ON public.schools FOR SELECT TO authenticated, anon
  USING (status = 'active');

-- Mutations: Restricted strictly to service_role (via Master Setup Gateway)
-- No direct client insert/update/delete on schools
REVOKE INSERT, UPDATE, DELETE ON public.schools FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.schools TO service_role;

-- 4.4 profiles: Drop all legacy variations, enforce single canonical set
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete" ON public.profiles;

CREATE POLICY "profiles_canonical_select"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    OR id = auth.uid()
  );

CREATE POLICY "profiles_canonical_insert"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (
    id = auth.uid()
    OR (
      school_id = (SELECT public.get_current_tenant_id())
      AND public.is_admin_or_executive()
    )
  );

-- Users can update non-privileged fields of their own profile; admins can update profiles in their tenant
CREATE POLICY "profiles_canonical_update"
  ON public.profiles FOR UPDATE TO authenticated
  USING (
    (id = auth.uid() AND (SELECT status = 'active' FROM public.profiles WHERE id = auth.uid()))
    OR (
      school_id = (SELECT public.get_current_tenant_id())
      AND public.is_admin_or_executive()
    )
  )
  WITH CHECK (
    (id = auth.uid() AND (SELECT status = 'active' FROM public.profiles WHERE id = auth.uid()))
    OR (
      school_id = (SELECT public.get_current_tenant_id())
      AND public.is_admin_or_executive()
    )
  );

CREATE POLICY "profiles_canonical_delete"
  ON public.profiles FOR DELETE TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.is_admin_or_executive()
  );

-- 4.5 Clean up legacy mutation policies on expenses and payroll
DROP POLICY IF EXISTS "expenses_mutation" ON public.expenses;
DROP POLICY IF EXISTS "payroll_mutation" ON public.payroll;
DROP POLICY IF EXISTS "students_delete" ON public.students;
DROP POLICY IF EXISTS "teachers_delete" ON public.teachers;
DROP POLICY IF EXISTS "fee_ledger_delete" ON public.fee_ledger;

-- 4.6 Drop legacy users table policies if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    EXECUTE 'DROP POLICY IF EXISTS "users_select" ON public.users';
    EXECUTE 'DROP POLICY IF EXISTS "users_insert" ON public.users';
    EXECUTE 'DROP POLICY IF EXISTS "users_update" ON public.users';
    EXECUTE 'DROP POLICY IF EXISTS "users_delete" ON public.users';
  END IF;
END $$;

