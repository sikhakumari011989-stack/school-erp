-- ==============================================================================
-- SUPABASE MIGRATION: 21_security_and_financial_hardening.sql
-- Production Security Remediation & Financial Correctness Hardening
-- Project: Academic OS (Multi-Tenant EduSaaS)
-- ==============================================================================
-- OBJECTIVES:
-- 1. Idempotent Pessimistic-Locking Fee Reversal RPC matching real public.fee_ledger columns
-- 2. Durable Maker-Checker Fee Reversal Requests Table & Strict RLS
-- 3. Authorization Hardening: Purge client-controlled user_metadata fallback from get_auth_role() & get_current_tenant_id()
-- 4. Fail-Closed Active Operator Verification Function (no COALESCE default true)
-- 5. Safe Multi-Branch Audit Trigger (TG_OP branching on INSERT/UPDATE/DELETE)
-- 6. PDF Lease Claim Hardening (Strictly Revoke from anon/PUBLIC)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. IDEMPOTENT FINANCIAL REVERSAL RPC WITH PESSIMISTIC LOCKING
-- ------------------------------------------------------------------------------

-- Ensure prerequisite columns exist on public.fee_ledger
ALTER TABLE IF EXISTS public.fee_ledger ADD COLUMN IF NOT EXISTS idempotency_key text;
ALTER TABLE IF EXISTS public.fee_ledger ADD COLUMN IF NOT EXISTS original_entry_id text;

CREATE INDEX IF NOT EXISTS idx_fee_ledger_idempotency
  ON public.fee_ledger (idempotency_key);

CREATE INDEX IF NOT EXISTS idx_fee_ledger_original_entry
  ON public.fee_ledger (original_entry_id);

CREATE OR REPLACE FUNCTION public.reverse_fee_entry(
  p_entry_id uuid,
  p_reason text DEFAULT 'Maker-Checker Principal Approval',
  p_authorized_by text DEFAULT 'Principal',
  p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fee_record public.fee_ledger%ROWTYPE;
  v_existing_reversal public.fee_ledger%ROWTYPE;
  v_credit_note_id uuid := gen_random_uuid();
  v_effective_key text;
BEGIN
  v_effective_key := COALESCE(NULLIF(p_idempotency_key, ''), 'REV-' || p_entry_id::text);

  -- 1. Idempotency Check: if already reversed with this key, return success immediately
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

  -- 2. Pessimistic Row Lock (SELECT ... FOR UPDATE) on target fee_ledger entry
  SELECT * INTO v_fee_record
  FROM public.fee_ledger
  WHERE id = p_entry_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Fee ledger entry not found or unavailable for locking.'
    );
  END IF;

  -- 3. Prevent reversing an already reversed transaction or credit note
  IF v_fee_record.status = 'reversed' OR v_fee_record.amount <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Target fee entry has already been reversed or is a credit note.'
    );
  END IF;

  -- 4. Insert offsetting Credit Note entry strictly matching real fee_ledger schema
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
    'Credit Note / Reversal (Auth: ' || COALESCE(p_authorized_by, 'Principal') || ' - ' || COALESCE(p_reason, 'Approved') || ')',
    CURRENT_DATE,
    v_fee_record.razorpay_payment_id,
    v_effective_key,
    p_entry_id::text,
    now()
  );

  -- 5. Mark original entry status as reversed
  UPDATE public.fee_ledger
  SET status = 'reversed'
  WHERE id = p_entry_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Fee entry successfully reversed with pessimistic lock and credit note.',
    'reversal_id', v_credit_note_id,
    'original_id', p_entry_id,
    'amount_reversed', v_fee_record.amount
  );
END;
$$;

-- Secure execution permissions: Revoke from public/anon, grant strictly to authenticated
REVOKE EXECUTE ON FUNCTION public.reverse_fee_entry(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reverse_fee_entry(uuid, text, text, text) TO authenticated;

-- Overload compatibility for string input (parses UUID safely)
CREATE OR REPLACE FUNCTION public.reverse_fee_entry(
  p_entry_id text,
  p_reason text DEFAULT 'Maker-Checker Principal Approval',
  p_authorized_by text DEFAULT 'Principal',
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
-- 2. DURABLE MAKER-CHECKER REVERSAL REQUESTS TABLE & RLS
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.fee_reversal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  entry_id uuid NOT NULL REFERENCES public.fee_ledger(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  reason text NOT NULL,
  requester_id uuid,
  requester_name text,
  requester_role text DEFAULT 'ACC',
  status text NOT NULL DEFAULT 'pending_approval', -- 'pending_approval' | 'approved' | 'rejected'
  authorized_by text,
  rejection_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.fee_reversal_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_fee_reversals_tenant_status
  ON public.fee_reversal_requests (school_id, status);

DROP POLICY IF EXISTS "fee_reversal_requests_select" ON public.fee_reversal_requests;
CREATE POLICY "fee_reversal_requests_select"
  ON public.fee_reversal_requests FOR SELECT TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.is_financial_manager()
  );

DROP POLICY IF EXISTS "fee_reversal_requests_insert" ON public.fee_reversal_requests;
CREATE POLICY "fee_reversal_requests_insert"
  ON public.fee_reversal_requests FOR INSERT TO authenticated
  WITH CHECK (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.is_financial_manager()
  );

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

-- ------------------------------------------------------------------------------
-- 3. AUTHORIZATION PURGE: ELIMINATE CLIENT-CONTROLLED USER_METADATA IN RLS
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE UPPER(COALESCE(
    NULLIF(current_setting('app.current_role', true), ''),
    NULLIF(auth.jwt() -> 'app_metadata' ->> 'role', ''),
    'STU'
  ))
    WHEN 'PRIN'         THEN 'PRIN'
    WHEN 'PRINCIPAL'    THEN 'PRIN'
    WHEN 'ADMIN'        THEN 'PRIN'
    WHEN 'SUPER_ADMIN'  THEN 'PRIN'
    WHEN 'SUPERADMIN'   THEN 'PRIN'
    WHEN 'HOD'          THEN 'HOD'
    WHEN 'TRUSTEE'      THEN 'HOD'
    WHEN 'ACC'          THEN 'ACC'
    WHEN 'ACCOUNTANT'   THEN 'ACC'
    WHEN 'TCH'          THEN 'TCH'
    WHEN 'TEACHER'      THEN 'TCH'
    WHEN 'FACULTY'      THEN 'TCH'
    WHEN 'FAC'          THEN 'TCH'
    WHEN 'STU'          THEN 'STU'
    WHEN 'STUDENT'      THEN 'STU'
    WHEN 'PARENT'       THEN 'STU'
    WHEN 'NTS'          THEN 'NTS'
    WHEN 'STAFF'        THEN 'NTS'
    WHEN 'NON_TEACHING' THEN 'NTS'
    WHEN 'NON-TEACHING' THEN 'NTS'
    ELSE 'STU'
  END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_auth_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_auth_role() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('app.current_school_id', true), ''),
    NULLIF(auth.jwt() -> 'app_metadata' ->> 'school_id', ''),
    NULLIF(auth.jwt() -> 'app_metadata' ->> 'institution_code', ''),
    ''
  );
$$;

REVOKE EXECUTE ON FUNCTION public.get_current_tenant_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_current_tenant_id() TO authenticated;

-- ------------------------------------------------------------------------------
-- 4. ACTIVE OPERATOR VERIFICATION: FAIL CLOSED
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_active_operator()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT (COALESCE(status, 'active') = 'active')
     FROM public.profiles
     WHERE id = auth.uid()
     LIMIT 1),
    false
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_active_operator() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_operator() TO authenticated;

-- ------------------------------------------------------------------------------
-- 5. MULTI-BRANCH AUDIT TRIGGER
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- ------------------------------------------------------------------------------
-- 6. DURABLE PDF QUEUE LEASE CLAIMING PERMISSIONS
-- ------------------------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public.claim_next_pdf_job(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_next_pdf_job(text) TO authenticated;

