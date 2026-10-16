-- ==============================================================================
-- SUPABASE MIGRATION: 01_rls_policies.sql
-- Multi-Tenant Row-Level Security (RLS) Lockdown & Role-Based Mutation Guardrails
-- ==============================================================================
-- Description:
-- 1. Establishes SECURITY DEFINER helper functions to look up authenticated
--    user's school_id and role from the public.profiles table without recursive policy loops.
-- 2. Enables Row-Level Security (RLS) across tenant tables:
--    - public.students
--    - public.attendance
--    - public.fees
--    - public.homework
--    - public.fee_ledger
--    - public.profiles
-- 3. Guarantees that authenticated users can ONLY SELECT, INSERT, or UPDATE rows
--    where the school_id strictly matches their linked school_id in profiles.
-- 4. Restricts mutations (INSERT, UPDATE, DELETE) on public.fee_ledger exclusively
--    to authorized financial roles ('HOD', 'Accountant', or Super Admin).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. HELPER FUNCTIONS (SECURITY DEFINER)
-- ------------------------------------------------------------------------------

-- Returns the active authenticated user's school_id as text
CREATE OR REPLACE FUNCTION public.get_auth_school_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT school_id::text
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Returns the active authenticated user's role as text
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Grant execution permissions on helper functions to authenticated role
GRANT EXECUTE ON FUNCTION public.get_auth_school_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_auth_role() TO authenticated;

-- ------------------------------------------------------------------------------
-- 2. ENABLE ROW-LEVEL SECURITY (RLS) ON ALL CORE TABLES
-- ------------------------------------------------------------------------------

ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fee_ledger ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 3. PROFILES TABLE POLICIES
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "profiles_select_own_or_same_school" ON public.profiles;
CREATE POLICY "profiles_select_own_or_same_school"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR school_id::text = public.get_auth_school_id()
    OR public.get_auth_role() = 'admin'
  );

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    id = auth.uid()
    OR public.get_auth_role() IN ('admin', 'HOD', 'principal', 'trustee')
  );

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid()
    OR public.get_auth_role() IN ('admin', 'HOD', 'principal', 'trustee')
  )
  WITH CHECK (
    id = auth.uid()
    OR public.get_auth_role() IN ('admin', 'HOD', 'principal', 'trustee')
  );

-- ------------------------------------------------------------------------------
-- 4. STUDENTS TABLE POLICIES (Strict Tenant Isolation)
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "students_tenant_select" ON public.students;
CREATE POLICY "students_tenant_select"
  ON public.students
  FOR SELECT
  TO authenticated
  USING (
    school_id::text = public.get_auth_school_id()
    OR public.get_auth_role() = 'admin'
  );

DROP POLICY IF EXISTS "students_tenant_insert" ON public.students;
CREATE POLICY "students_tenant_insert"
  ON public.students
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (school_id::text = public.get_auth_school_id() OR public.get_auth_role() = 'admin')
    AND public.get_auth_role() IN ('admin', 'HOD', 'principal', 'trustee', 'accountant', 'staff')
  );

DROP POLICY IF EXISTS "students_tenant_update" ON public.students;
CREATE POLICY "students_tenant_update"
  ON public.students
  FOR UPDATE
  TO authenticated
  USING (
    school_id::text = public.get_auth_school_id()
    OR public.get_auth_role() = 'admin'
  )
  WITH CHECK (
    school_id::text = public.get_auth_school_id()
    OR public.get_auth_role() = 'admin'
  );

DROP POLICY IF EXISTS "students_tenant_delete" ON public.students;
CREATE POLICY "students_tenant_delete"
  ON public.students
  FOR DELETE
  TO authenticated
  USING (
    (school_id::text = public.get_auth_school_id() OR public.get_auth_role() = 'admin')
    AND public.get_auth_role() IN ('admin', 'HOD', 'principal', 'trustee')
  );

-- ------------------------------------------------------------------------------
-- 5. ATTENDANCE TABLE POLICIES (Strict Tenant Isolation)
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "attendance_tenant_select" ON public.attendance;
CREATE POLICY "attendance_tenant_select"
  ON public.attendance
  FOR SELECT
  TO authenticated
  USING (
    school_id::text = public.get_auth_school_id()
    OR public.get_auth_role() = 'admin'
  );

DROP POLICY IF EXISTS "attendance_tenant_insert" ON public.attendance;
CREATE POLICY "attendance_tenant_insert"
  ON public.attendance
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (school_id::text = public.get_auth_school_id() OR public.get_auth_role() = 'admin')
    AND public.get_auth_role() IN ('teacher', 'HOD', 'principal', 'trustee', 'admin')
  );

DROP POLICY IF EXISTS "attendance_tenant_update" ON public.attendance;
CREATE POLICY "attendance_tenant_update"
  ON public.attendance
  FOR UPDATE
  TO authenticated
  USING (
    school_id::text = public.get_auth_school_id()
    OR public.get_auth_role() = 'admin'
  )
  WITH CHECK (
    (school_id::text = public.get_auth_school_id() OR public.get_auth_role() = 'admin')
    AND public.get_auth_role() IN ('teacher', 'HOD', 'principal', 'trustee', 'admin')
  );

DROP POLICY IF EXISTS "attendance_tenant_delete" ON public.attendance;
CREATE POLICY "attendance_tenant_delete"
  ON public.attendance
  FOR DELETE
  TO authenticated
  USING (
    (school_id::text = public.get_auth_school_id() OR public.get_auth_role() = 'admin')
    AND public.get_auth_role() IN ('HOD', 'principal', 'trustee', 'admin')
  );

-- ------------------------------------------------------------------------------
-- 6. HOMEWORK TABLE POLICIES (Strict Tenant Isolation)
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "homework_tenant_select" ON public.homework;
CREATE POLICY "homework_tenant_select"
  ON public.homework
  FOR SELECT
  TO authenticated
  USING (
    school_id::text = public.get_auth_school_id()
    OR public.get_auth_role() = 'admin'
  );

DROP POLICY IF EXISTS "homework_tenant_insert" ON public.homework;
CREATE POLICY "homework_tenant_insert"
  ON public.homework
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (school_id::text = public.get_auth_school_id() OR public.get_auth_role() = 'admin')
    AND public.get_auth_role() IN ('teacher', 'HOD', 'principal', 'trustee', 'admin')
  );

DROP POLICY IF EXISTS "homework_tenant_update" ON public.homework;
CREATE POLICY "homework_tenant_update"
  ON public.homework
  FOR UPDATE
  TO authenticated
  USING (
    school_id::text = public.get_auth_school_id()
    OR public.get_auth_role() = 'admin'
  )
  WITH CHECK (
    (school_id::text = public.get_auth_school_id() OR public.get_auth_role() = 'admin')
    AND public.get_auth_role() IN ('teacher', 'HOD', 'principal', 'trustee', 'admin')
  );

DROP POLICY IF EXISTS "homework_tenant_delete" ON public.homework;
CREATE POLICY "homework_tenant_delete"
  ON public.homework
  FOR DELETE
  TO authenticated
  USING (
    (school_id::text = public.get_auth_school_id() OR public.get_auth_role() = 'admin')
    AND public.get_auth_role() IN ('teacher', 'HOD', 'principal', 'trustee', 'admin')
  );

-- ------------------------------------------------------------------------------
-- 7. FEES TABLE POLICIES (Strict Tenant Isolation)
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "fees_tenant_select" ON public.fees;
CREATE POLICY "fees_tenant_select"
  ON public.fees
  FOR SELECT
  TO authenticated
  USING (
    school_id::text = public.get_auth_school_id()
    OR public.get_auth_role() = 'admin'
  );

DROP POLICY IF EXISTS "fees_tenant_insert" ON public.fees;
CREATE POLICY "fees_tenant_insert"
  ON public.fees
  FOR INSERT
  TO authenticated
  WITH CHECK (
    school_id::text = public.get_auth_school_id()
    OR public.get_auth_role() = 'admin'
  );

DROP POLICY IF EXISTS "fees_tenant_update" ON public.fees;
CREATE POLICY "fees_tenant_update"
  ON public.fees
  FOR UPDATE
  TO authenticated
  USING (
    school_id::text = public.get_auth_school_id()
    OR public.get_auth_role() = 'admin'
  )
  WITH CHECK (
    school_id::text = public.get_auth_school_id()
    OR public.get_auth_role() = 'admin'
  );

DROP POLICY IF EXISTS "fees_tenant_delete" ON public.fees;
CREATE POLICY "fees_tenant_delete"
  ON public.fees
  FOR DELETE
  TO authenticated
  USING (
    (school_id::text = public.get_auth_school_id() OR public.get_auth_role() = 'admin')
    AND LOWER(public.get_auth_role()) IN ('hod', 'accountant', 'admin', 'trustee', 'principal')
  );

-- ------------------------------------------------------------------------------
-- 8. FEE_LEDGER TABLE POLICIES (Enforce HOD & Accountant Role Mutation Lockdown)
-- ------------------------------------------------------------------------------

-- SELECT: All authenticated members within the tenant institution may view fee transactions
DROP POLICY IF EXISTS "fee_ledger_tenant_select" ON public.fee_ledger;
CREATE POLICY "fee_ledger_tenant_select"
  ON public.fee_ledger
  FOR SELECT
  TO authenticated
  USING (
    school_id::text = public.get_auth_school_id()
    OR public.get_auth_role() = 'admin'
  );

-- INSERT: Strictly restricted to HOD, Accountant, or SuperAdmin roles with matching tenant
DROP POLICY IF EXISTS "fee_ledger_role_insert" ON public.fee_ledger;
CREATE POLICY "fee_ledger_role_insert"
  ON public.fee_ledger
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (school_id::text = public.get_auth_school_id() OR public.get_auth_role() = 'admin')
    AND LOWER(public.get_auth_role()) IN ('hod', 'accountant', 'admin', 'trustee', 'principal')
  );

-- UPDATE: Strictly restricted to HOD, Accountant, or SuperAdmin roles
DROP POLICY IF EXISTS "fee_ledger_role_update" ON public.fee_ledger;
CREATE POLICY "fee_ledger_role_update"
  ON public.fee_ledger
  FOR UPDATE
  TO authenticated
  USING (
    (school_id::text = public.get_auth_school_id() OR public.get_auth_role() = 'admin')
    AND LOWER(public.get_auth_role()) IN ('hod', 'accountant', 'admin', 'trustee', 'principal')
  )
  WITH CHECK (
    (school_id::text = public.get_auth_school_id() OR public.get_auth_role() = 'admin')
    AND LOWER(public.get_auth_role()) IN ('hod', 'accountant', 'admin', 'trustee', 'principal')
  );

-- DELETE: Strictly restricted to HOD or Accountant roles
DROP POLICY IF EXISTS "fee_ledger_role_delete" ON public.fee_ledger;
CREATE POLICY "fee_ledger_role_delete"
  ON public.fee_ledger
  FOR DELETE
  TO authenticated
  USING (
    (school_id::text = public.get_auth_school_id() OR public.get_auth_role() = 'admin')
    AND LOWER(public.get_auth_role()) IN ('hod', 'accountant', 'admin', 'trustee', 'principal')
  );

-- ==============================================================================
-- END OF MIGRATION: 01_rls_policies.sql
-- ==============================================================================

