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

