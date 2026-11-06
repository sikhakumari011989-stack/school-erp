-- ==============================================================================
-- SUPABASE MIGRATION: 21_security_and_financial_hardening.sql
-- Production Security Remediation & Financial Correctness Hardening (v3 - Schema Reconciliation)
-- Project: Academic OS (Multi-Tenant EduSaaS)
-- ==============================================================================
-- 1. UUID-Native Idempotent Pessimistic-Locking Fee Reversals (fee_ledger.id is UUID)
-- 2. Concurrency-Safe Maker-Checker Fee Reversal Requests Table & Strict Tenant RLS
-- 3. Elimination of Direct Reversal Bypass of Maker-Checker (Requires Independent Pending Request)
-- 4. Purge User-Settable Session-Variable Bypasses from get_auth_role() & get_current_tenant_id()
-- 5. Fail-Closed Active Operator Verification Function
-- 6. Schema-Aware public.audit_logs Reconciliation & Safe Trigger Attachment
-- 7. Mandatory Business Transaction Abort on Audit Logging Failure (Fail-Closed)
-- 8. Immutable Audit Trail: Revoke INSERT, UPDATE, DELETE, TRUNCATE from authenticated users
-- 9. PDF Queue Lease Claim Hardening: Revoke from anon/PUBLIC
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. DURABLE MAKER-CHECKER REVERSAL REQUESTS TABLE & RLS
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

-- Ensure prerequisite columns exist on public.fee_reversal_requests even if created previously
ALTER TABLE IF EXISTS public.fee_reversal_requests
  ADD COLUMN IF NOT EXISTS authorized_by_id uuid,
  ADD COLUMN IF NOT EXISTS requester_name text,
  ADD COLUMN IF NOT EXISTS requester_role text DEFAULT 'ACC';

-- Schema-aware conversion in case fee_reversal_requests was previously created with school_id as uuid
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'fee_reversal_requests' AND column_name = 'school_id' AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.fee_reversal_requests ALTER COLUMN school_id TYPE text USING school_id::text;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'fee_ledger' AND column_name = 'original_entry_id' AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.fee_ledger ALTER COLUMN original_entry_id TYPE text USING original_entry_id::text;
  END IF;
END $$;

ALTER TABLE public.fee_reversal_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_fee_reversals_tenant_status
  ON public.fee_reversal_requests (school_id, status);

CREATE INDEX IF NOT EXISTS idx_fee_reversals_entry
  ON public.fee_reversal_requests (school_id, entry_id);

-- ------------------------------------------------------------------------------
-- 2. UUID-NATIVE FEE REVERSAL RPC WITH PESSIMISTIC LOCKING & MAKER-CHECKER ENFORCEMENT
-- ------------------------------------------------------------------------------

-- Ensure prerequisite columns exist on public.fee_ledger (id is UUID, school_id is TEXT, original_entry_id is TEXT)
ALTER TABLE IF EXISTS public.fee_ledger ADD COLUMN IF NOT EXISTS idempotency_key text;
ALTER TABLE IF EXISTS public.fee_ledger ADD COLUMN IF NOT EXISTS original_entry_id text;

CREATE INDEX IF NOT EXISTS idx_fee_ledger_tenant_idempotency
  ON public.fee_ledger (school_id, idempotency_key);

CREATE INDEX IF NOT EXISTS idx_fee_ledger_tenant_original_entry
  ON public.fee_ledger (school_id, original_entry_id);

-- Drop legacy function signatures to prevent overload collisions and bypasses
DROP FUNCTION IF EXISTS public.reverse_fee_entry(text, text, text);
DROP FUNCTION IF EXISTS public.reverse_fee_entry(text, text, text, text);
DROP FUNCTION IF EXISTS public.reverse_fee_entry(uuid, text, text, text);

-- Canonical UUID-native reverse_fee_entry function
CREATE OR REPLACE FUNCTION public.reverse_fee_entry(
  p_entry_id uuid,
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
  -- 1. Authentication & Role Verification: Caller must be an authenticated Executive Administrator (PRIN or HOD)
  IF v_approver_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthenticated: Valid session required.'
    );
  END IF;

  IF NOT public.is_admin_or_executive() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: Only Executive Administrators (Principal / Trustee) can reverse fee entries. Operational staff must submit a reversal request.'
    );
  END IF;

  IF v_tenant IS NULL OR v_tenant = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Tenant Isolation Violation: Active tenant context required.'
    );
  END IF;

  -- 2. Anti-Impersonation: Approver name derived strictly from authenticated user profile, ignoring client parameter
  SELECT COALESCE(full_name, auth.jwt() ->> 'email', 'Principal')
  INTO v_derived_approver
  FROM public.profiles
  WHERE id = v_approver_id;

  IF v_derived_approver IS NULL THEN
    v_derived_approver := COALESCE(auth.jwt() ->> 'email', 'Principal');
  END IF;

  v_effective_key := COALESCE(NULLIF(TRIM(p_idempotency_key), ''), 'REV-' || p_entry_id::text);

  -- 3. Idempotency Check: MUST be scoped strictly to the authenticated tenant (explicit UUID/TEXT comparison)
  SELECT * INTO v_existing_reversal
  FROM public.fee_ledger
  WHERE school_id::text IN (v_tenant, public.get_current_tenant_code(), public.get_current_tenant_uuid()::text)
    AND (
      idempotency_key = v_effective_key
      OR (original_entry_id::text = p_entry_id::text AND status = 'reversed' AND amount < 0)
    )
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Fee entry already reversed with this idempotency key (deduplicated).',
      'reversal_id', v_existing_reversal.id,
      'idempotent', true
    );
  END IF;

  -- 4. Pessimistic Row Lock (SELECT ... FOR UPDATE) on target fee_ledger entry within caller's tenant
  SELECT * INTO v_fee_record
  FROM public.fee_ledger
  WHERE id = p_entry_id 
    AND school_id::text IN (v_tenant, public.get_current_tenant_code(), public.get_current_tenant_uuid()::text)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Fee ledger entry not found or belongs to another institution.'
    );
  END IF;

  -- 5. Prevent reversing an already reversed transaction or credit note
  IF v_fee_record.status = 'reversed' OR v_fee_record.amount <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Target fee entry has already been reversed or is a credit note.'
    );
  END IF;

  -- 6. MANDATORY MAKER-CHECKER ENFORCEMENT:
  -- Direct reversal CANNOT bypass the maker-checker approval workflow.
  -- A pending reversal request submitted by an independent financial operator must exist.
  SELECT * INTO v_existing_req
  FROM public.fee_reversal_requests
  WHERE entry_id = p_entry_id
    AND school_id::text IN (v_tenant, public.get_current_tenant_code(), public.get_current_tenant_uuid()::text)
    AND status = 'pending_approval'
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Maker-Checker Violation: Direct reversal without an independent pending reversal request is prohibited. The accountant or maker must submit a reversal request via request_fee_reversal() first.'
    );
  END IF;

  -- Maker-Checker constraint: Approver CANNOT be the maker
  IF v_existing_req.requester_id = v_approver_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Maker-Checker Violation: The user who created this reversal request cannot approve it. An independent executive must approve.'
    );
  END IF;

  -- 7. Insert offsetting Credit Note entry strictly matching real fee_ledger schema (UUID ID)
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
    'Credit Note / Reversal (Auth: ' || v_derived_approver || ' [' || v_approver_role || '] - ' || COALESCE(p_reason, 'Approved') || ')',
    CURRENT_DATE,
    v_fee_record.razorpay_payment_id,
    v_effective_key,
    p_entry_id::text,
    now()
  );

  -- 8. Mark original entry status as reversed
  UPDATE public.fee_ledger
  SET status = 'reversed'
  WHERE id = p_entry_id AND school_id::text = v_tenant;

  -- 9. Update associated reversal request to approved
  UPDATE public.fee_reversal_requests
  SET status = 'approved',
      authorized_by = v_derived_approver,
      authorized_by_id = v_approver_id,
      updated_at = now()
  WHERE id = v_existing_req.id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Fee entry successfully reversed with pessimistic lock and credit note.',
    'reversal_id', v_credit_note_id,
    'original_id', p_entry_id,
    'request_id', v_existing_req.id,
    'amount_reversed', v_fee_record.amount,
    'authorized_by', v_derived_approver
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reverse_fee_entry(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reverse_fee_entry(uuid, text, text, text) TO authenticated;

-- ------------------------------------------------------------------------------
-- 3. RLS POLICIES FOR FEE REVERSAL REQUESTS
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "fee_reversal_requests_select" ON public.fee_reversal_requests;
CREATE POLICY "fee_reversal_requests_select"
  ON public.fee_reversal_requests FOR SELECT TO authenticated
  USING (
    school_id::text = (SELECT public.get_current_tenant_id())
    AND public.is_financial_manager()
  );

DROP POLICY IF EXISTS "fee_reversal_requests_insert" ON public.fee_reversal_requests;
CREATE POLICY "fee_reversal_requests_insert"
  ON public.fee_reversal_requests FOR INSERT TO authenticated
  WITH CHECK (
    school_id::text = (SELECT public.get_current_tenant_id())
    AND public.is_financial_manager()
    AND requester_id = auth.uid()
  );

DROP POLICY IF EXISTS "fee_reversal_requests_update" ON public.fee_reversal_requests;
CREATE POLICY "fee_reversal_requests_update"
  ON public.fee_reversal_requests FOR UPDATE TO authenticated
  USING (
    school_id::text = (SELECT public.get_current_tenant_id())
    AND public.is_admin_or_executive()
  )
  WITH CHECK (
    school_id::text = (SELECT public.get_current_tenant_id())
    AND public.is_admin_or_executive()
  );

-- ------------------------------------------------------------------------------
-- 4. AUTHORIZATION PURGE: STRICT JWT CLAIMS (NO USER-SETTABLE SESSION VARIABLES)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE UPPER(COALESCE(
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

CREATE OR REPLACE FUNCTION public.get_current_tenant_uuid()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    CASE 
      WHEN (auth.jwt() -> 'app_metadata' ->> 'school_uuid') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN (auth.jwt() -> 'app_metadata' ->> 'school_uuid')::uuid
      WHEN (auth.jwt() -> 'app_metadata' ->> 'school_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN (auth.jwt() -> 'app_metadata' ->> 'school_id')::uuid
      ELSE NULL
    END,
    (SELECT school_id FROM public.profiles WHERE id = auth.uid() LIMIT 1),
    (SELECT id FROM public.schools 
     WHERE code = UPPER(COALESCE(auth.jwt() -> 'app_metadata' ->> 'school_id', auth.jwt() -> 'app_metadata' ->> 'institution_code', ''))
     LIMIT 1)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.get_current_tenant_uuid() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_current_tenant_uuid() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_current_tenant_code()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT UPPER(COALESCE(
    CASE 
      WHEN (auth.jwt() -> 'app_metadata' ->> 'school_code') IS NOT NULL AND (auth.jwt() -> 'app_metadata' ->> 'school_code') != ''
        THEN auth.jwt() -> 'app_metadata' ->> 'school_code'
      WHEN (auth.jwt() -> 'app_metadata' ->> 'institution_code') IS NOT NULL AND (auth.jwt() -> 'app_metadata' ->> 'institution_code') != ''
        THEN auth.jwt() -> 'app_metadata' ->> 'institution_code'
      WHEN (auth.jwt() -> 'app_metadata' ->> 'school_id') IS NOT NULL 
           AND NOT ((auth.jwt() -> 'app_metadata' ->> 'school_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
        THEN auth.jwt() -> 'app_metadata' ->> 'school_id'
      ELSE NULL
    END,
    (SELECT s.code 
     FROM public.schools s 
     JOIN public.profiles p ON p.school_id = s.id 
     WHERE p.id = auth.uid() 
     LIMIT 1),
    (SELECT s.code 
     FROM public.schools s 
     WHERE s.id::text = (auth.jwt() -> 'app_metadata' ->> 'school_id')
     LIMIT 1),
    COALESCE(auth.jwt() -> 'app_metadata' ->> 'school_id', '')
  ));
$$;

REVOKE EXECUTE ON FUNCTION public.get_current_tenant_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_current_tenant_code() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(public.get_current_tenant_code(), ''),
    NULLIF(public.get_current_tenant_uuid()::text, ''),
    NULLIF(auth.jwt() -> 'app_metadata' ->> 'school_id', ''),
    ''
  );
$$;

REVOKE EXECUTE ON FUNCTION public.get_current_tenant_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_current_tenant_id() TO authenticated;

-- ------------------------------------------------------------------------------
-- 5. ACTIVE OPERATOR VERIFICATION: FAIL CLOSED
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_active_operator()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT (COALESCE(status, 'active') = 'active' AND COALESCE(is_active, true) = true)
     FROM public.profiles
     WHERE id = auth.uid()
     LIMIT 1),
    false
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_active_operator() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_operator() TO authenticated;

-- ------------------------------------------------------------------------------
-- 6. SCHEMA-AWARE AUDIT LOGS RECONCILIATION & FAIL-CLOSED MULTI-BRANCH TRIGGER
-- ------------------------------------------------------------------------------

-- Ensure prerequisite columns exist on public.profiles before trigger attachments
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL DEFAULT 'SYSTEM',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE IF EXISTS public.audit_logs
  ADD COLUMN IF NOT EXISTS school_id text,
  ADD COLUMN IF NOT EXISTS table_name text,
  ADD COLUMN IF NOT EXISTS record_id text,
  ADD COLUMN IF NOT EXISTS actor_id text,
  ADD COLUMN IF NOT EXISTS old_payload jsonb,
  ADD COLUMN IF NOT EXISTS new_payload jsonb,
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS user_name text,
  ADD COLUMN IF NOT EXISTS user_role text,
  ADD COLUMN IF NOT EXISTS action text,
  ADD COLUMN IF NOT EXISTS entity_type text DEFAULT 'GENERAL',
  ADD COLUMN IF NOT EXISTS entity_id text,
  ADD COLUMN IF NOT EXISTS details text,
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'Verified',
  ADD COLUMN IF NOT EXISTS old_data jsonb,
  ADD COLUMN IF NOT EXISTS new_data jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_audit_logs_school_created
  ON public.audit_logs (school_id, created_at DESC);

-- Strict Read-Only RLS on audit_logs for Executive Admins
DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
CREATE POLICY "audit_logs_select"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (
    school_id::text IN (public.get_current_tenant_code(), public.get_current_tenant_uuid()::text, public.get_current_tenant_id())
    AND public.is_admin_or_executive()
  );

-- IMMUTABILITY & ANTI-FORGERY: Revoke INSERT, UPDATE, DELETE, TRUNCATE from authenticated users
-- Only the trusted SECURITY DEFINER trigger log_audit_event() or service_role can insert audit rows
DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.audit_logs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

-- Safe Multi-Branch Audit Trigger: ABORTS TRANSACTION IF AUDIT INSERTION FAILS (Fail-Closed)
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school_id text;
  v_entity_id text;
  v_old_data jsonb := NULL;
  v_new_data jsonb := NULL;
  v_action text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_new_data := to_jsonb(NEW);
    v_school_id := COALESCE(NEW.school_id::text, public.get_current_tenant_id(), 'SYSTEM');
    v_entity_id := COALESCE(NEW.id::text, NULL);
    v_action := TG_TABLE_NAME || ' INSERT';
  ELSIF TG_OP = 'UPDATE' THEN
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
    v_school_id := COALESCE(NEW.school_id::text, OLD.school_id::text, public.get_current_tenant_id(), 'SYSTEM');
    v_entity_id := COALESCE(NEW.id::text, OLD.id::text, NULL);
    v_action := TG_TABLE_NAME || ' UPDATE';
  ELSIF TG_OP = 'DELETE' THEN
    v_old_data := to_jsonb(OLD);
    v_school_id := COALESCE(OLD.school_id::text, public.get_current_tenant_id(), 'SYSTEM');
    v_entity_id := COALESCE(OLD.id::text, NULL);
    v_action := TG_TABLE_NAME || ' DELETE';
  END IF;

  BEGIN
    INSERT INTO public.audit_logs (
      school_id,
      table_name,
      record_id,
      actor_id,
      old_payload,
      new_payload,
      user_id,
      user_name,
      user_role,
      action,
      entity_type,
      entity_id,
      details,
      old_data,
      new_data,
      status,
      created_at
    )
    VALUES (
      COALESCE(v_school_id, 'UNKNOWN'),
      TG_TABLE_NAME,
      v_entity_id,
      COALESCE(auth.uid()::text, 'SYSTEM'),
      v_old_data,
      v_new_data,
      auth.uid(),
      COALESCE(auth.jwt() ->> 'email', 'System Trigger'),
      COALESCE(public.get_auth_role(), 'SYSTEM'),
      v_action,
      TG_TABLE_NAME,
      v_entity_id,
      'Trigger recorded ' || TG_OP || ' on table ' || TG_TABLE_NAME,
      v_old_data,
      v_new_data,
      'Verified',
      now()
    );
  EXCEPTION WHEN OTHERS THEN
    -- Strictly abort business transaction on audit failure
    RAISE EXCEPTION 'Audit log insertion failed on %. Operation aborted: % (SQLSTATE: %)',
      TG_TABLE_NAME, SQLERRM, SQLSTATE;
  END;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------------------------
-- 7. EXPLICIT AUDIT TRIGGER ATTACHMENTS TO INTENDED TABLES
-- ------------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_audit_fee_ledger ON public.fee_ledger;
CREATE TRIGGER trg_audit_fee_ledger
  AFTER INSERT OR UPDATE OR DELETE ON public.fee_ledger
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS trg_audit_fee_reversal_requests ON public.fee_reversal_requests;
CREATE TRIGGER trg_audit_fee_reversal_requests
  AFTER INSERT OR UPDATE OR DELETE ON public.fee_reversal_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS trg_audit_profiles ON public.profiles;
CREATE TRIGGER trg_audit_profiles
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- ------------------------------------------------------------------------------
-- 8. PDF QUEUE LEASE CLAIMING PERMISSIONS
-- ------------------------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public.claim_next_pdf_job(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_next_pdf_job(text) TO authenticated;
