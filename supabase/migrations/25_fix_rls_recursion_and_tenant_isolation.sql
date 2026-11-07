-- ==============================================================================
-- 25_fix_rls_recursion_and_tenant_isolation.sql
-- NON-RECURSIVE RLS FORWARD MIGRATION & TENANT ISOLATION
--
-- PURPOSE:
-- Fixes PostgreSQL Error 42P17 (infinite recursion detected in policy for relation "profiles").
--
-- ROOT CAUSE:
-- Migration 01 (line 417) and Migration 22 (line 538) placed policies on public.profiles
-- that subqueried public.profiles (e.g. `SELECT status = 'active' FROM public.profiles WHERE id = auth.uid()`,
-- or helper functions like get_auth_role() which query public.profiles).
--
-- SOLUTION:
-- 1. Drop all recursive policies on public.profiles.
-- 2. Define clean, non-recursive policies on public.profiles relying purely on auth.uid()
--    and direct JWT claims (auth.jwt() -> 'app_metadata').
-- 3. Never subquery public.profiles inside a policy on public.profiles.
-- ==============================================================================

-- 1. DROP ALL RECURSIVE OR PROBLEMATIC POLICIES ON public.profiles
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
DROP POLICY IF EXISTS "profiles_read_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;

-- 2. ENSURE RLS IS ENABLED
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. CREATE CLEAN, ZERO-RECURSION POLICIES ON public.profiles

-- (A) SELECT: An authenticated user can always read their own profile,
--     or profiles belonging to their own school node.
CREATE POLICY "profiles_non_recursive_select"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    -- Direct identity match: user reading their own profile (ZERO recursion)
    id = auth.uid()
    OR
    -- Master owner has universal visibility across tenant nodes
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'MASTER_OWNER')
    OR
    -- Tenant isolation match using JWT app_metadata or school_id
    school_id::text = (auth.jwt() -> 'app_metadata' ->> 'school_id')
  );

-- (B) INSERT: Service role or authorized campus administrators (PRIN, HOD)
CREATE POLICY "profiles_non_recursive_insert"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (
    -- User provisioning their own initial profile
    id = auth.uid()
    OR
    -- Master owner can provision any profile
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'MASTER_OWNER')
    OR
    -- Executive roles (PRIN / HOD) can provision profiles inside their own tenant
    (
      school_id::text = (auth.jwt() -> 'app_metadata' ->> 'school_id')
      AND (auth.jwt() -> 'app_metadata' ->> 'role' IN ('PRIN', 'HOD', 'ADMIN', 'principal', 'trustee', 'admin'))
    )
  );

-- (C) UPDATE: Users can update their own profile; Executives can update member profiles in their tenant.
-- CRITICAL FIX FOR 42P17: NO subqueries on public.profiles inside this policy!
CREATE POLICY "profiles_non_recursive_update"
  ON public.profiles FOR UPDATE TO authenticated
  USING (
    id = auth.uid()
    OR
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'MASTER_OWNER')
    OR
    (
      school_id::text = (auth.jwt() -> 'app_metadata' ->> 'school_id')
      AND (auth.jwt() -> 'app_metadata' ->> 'role' IN ('PRIN', 'HOD', 'ADMIN', 'principal', 'trustee', 'admin'))
    )
  )
  WITH CHECK (
    id = auth.uid()
    OR
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'MASTER_OWNER')
    OR
    (
      school_id::text = (auth.jwt() -> 'app_metadata' ->> 'school_id')
      AND (auth.jwt() -> 'app_metadata' ->> 'role' IN ('PRIN', 'HOD', 'ADMIN', 'principal', 'trustee', 'admin'))
    )
  );

-- (D) DELETE: Master Owner or Executive Admins within their own school node
CREATE POLICY "profiles_non_recursive_delete"
  ON public.profiles FOR DELETE TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'MASTER_OWNER')
    OR
    (
      school_id::text = (auth.jwt() -> 'app_metadata' ->> 'school_id')
      AND (auth.jwt() -> 'app_metadata' ->> 'role' IN ('PRIN', 'HOD', 'ADMIN', 'principal', 'trustee', 'admin'))
    )
  );

-- 4. GRANT PROPER PRIVILEGES TO authenticated AND service_role
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
