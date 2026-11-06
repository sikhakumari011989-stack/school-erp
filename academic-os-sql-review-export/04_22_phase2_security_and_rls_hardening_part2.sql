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
