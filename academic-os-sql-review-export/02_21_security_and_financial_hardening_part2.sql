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
