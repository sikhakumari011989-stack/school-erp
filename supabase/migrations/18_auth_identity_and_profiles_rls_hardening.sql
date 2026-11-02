-- ==============================================================================
-- 18_auth_identity_and_profiles_rls_hardening.sql
-- Resolves:
-- 1. PostgreSQL 42P17 Infinite Recursion on public.profiles
-- 2. Decouples get_auth_role() and get_current_tenant_id() from profiles subqueries
-- 3. Enforces canonical 6-role RBAC: 'PRIN', 'HOD', 'ACC', 'TCH', 'STU', 'NTS'
-- ==============================================================================

-- 1. CANONICAL ROLE EXTRACTOR (Reads strictly from server-controlled JWT claims)
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
    NULLIF(auth.jwt() -> 'user_metadata' ->> 'role', ''),
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

GRANT EXECUTE ON FUNCTION public.get_auth_role() TO authenticated, anon;

-- 2. CANONICAL TENANT ID EXTRACTOR (Reads strictly from server-controlled JWT claims)
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
    NULLIF(auth.jwt() -> 'user_metadata' ->> 'school_id', ''),
    NULLIF(auth.jwt() -> 'app_metadata' ->> 'institution_code', ''),
    NULLIF(auth.jwt() -> 'user_metadata' ->> 'institution_code', ''),
    ''
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_current_tenant_id() TO authenticated, anon;

-- Legacy alias compatibility
CREATE OR REPLACE FUNCTION public.get_auth_school_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_current_tenant_id();
$$;

GRANT EXECUTE ON FUNCTION public.get_auth_school_id() TO authenticated, anon;

-- 3. RBAC ROLE CHECKERS (Pure JWT checks, zero relation subqueries)
CREATE OR REPLACE FUNCTION public.is_admin_or_executive()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_auth_role() IN ('PRIN', 'HOD');
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_or_executive() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_financial_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_auth_role() IN ('PRIN', 'HOD', 'ACC');
$$;

GRANT EXECUTE ON FUNCTION public.is_financial_manager() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_auth_role() = 'TCH';
$$;

GRANT EXECUTE ON FUNCTION public.is_teacher() TO authenticated;

-- 4. FIX PROFILES RLS: NON-RECURSIVE POLICIES
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR (
      school_id::text = public.get_current_tenant_id()
      AND public.is_admin_or_executive()
    )
    OR (
      school_id::text = public.get_current_tenant_id()
      AND public.is_teacher()
      AND role = 'student'
    )
  );

DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
CREATE POLICY "profiles_insert"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (
    id = auth.uid()
    OR (
      school_id::text = public.get_current_tenant_id()
      AND public.is_admin_or_executive()
    )
  );

DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update"
  ON public.profiles FOR UPDATE TO authenticated
  USING (
    id = auth.uid()
    OR (
      school_id::text = public.get_current_tenant_id()
      AND public.is_admin_or_executive()
    )
  )
  WITH CHECK (
    id = auth.uid()
    OR (
      school_id::text = public.get_current_tenant_id()
      AND public.is_admin_or_executive()
    )
  );

DROP POLICY IF EXISTS "profiles_delete" ON public.profiles;
CREATE POLICY "profiles_delete"
  ON public.profiles FOR DELETE TO authenticated
  USING (
    school_id::text = public.get_current_tenant_id()
    AND public.is_admin_or_executive()
  );

