-- ==============================================================================
-- SUPABASE MIGRATION: 03_rls_hardening.sql
-- Multi-Tenant Row Level Security (RLS) Hardening & initPlan Caching
-- Project: Academic OS (Multi-Tenant EduSaaS)
-- ==============================================================================
-- NON-NEGOTIABLE COMPLIANCE RULES:
-- 1. school_id is TEXT everywhere. Compare text to text.
-- 2. Authorization reads ONLY auth.jwt() -> 'app_metadata'. Never 'user_metadata'.
-- 3. Deny by default: missing claims yield NULL / false (match 0 rows).
-- 4. Canonical Role Codes: PRIN, HOD, ACC, TCH, STU, NTS.
-- 5. Grants strictly to authenticated. Explicit REVOKE from anon and PUBLIC.
-- 6. Idempotent: safe for repeated execution.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- SECTION 1: HELPER FUNCTIONS (Strict app_metadata JWT Evaluation)
-- ------------------------------------------------------------------------------

-- 1.1 Tenant Context Extractor (returns text, strictly from app_metadata)
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NULLIF(auth.jwt() -> 'app_metadata' ->> 'school_id', '');
$$;

-- 1.2 Canonical Role Normalizer (Deny by default -> returns NULL if unmapped)
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE UPPER(NULLIF(auth.jwt() -> 'app_metadata' ->> 'role', ''))
    WHEN 'PRIN'         THEN 'PRIN'
    WHEN 'PRINCIPAL'    THEN 'PRIN'
    WHEN 'ADMIN'        THEN 'PRIN'
    WHEN 'SUPER_ADMIN'  THEN 'PRIN'
    WHEN 'HOD'          THEN 'HOD'
    WHEN 'TRUSTEE'      THEN 'HOD'
    WHEN 'ACC'          THEN 'ACC'
    WHEN 'ACCOUNTANT'   THEN 'ACC'
    WHEN 'TCH'          THEN 'TCH'
    WHEN 'TEACHER'      THEN 'TCH'
    WHEN 'STU'          THEN 'STU'
    WHEN 'STUDENT'      THEN 'STU'
    WHEN 'NTS'          THEN 'NTS'
    WHEN 'NON_TEACHING' THEN 'NTS'
    ELSE NULL
  END;
$$;

-- 1.3 Authenticated Student ID Extractor (strictly from app_metadata)
CREATE OR REPLACE FUNCTION public.get_auth_student_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NULLIF(auth.jwt() -> 'app_metadata' ->> 'student_id', '');
$$;

-- 1.4 Financial Manager RBAC Check (PRIN, HOD, ACC)
CREATE OR REPLACE FUNCTION public.is_financial_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.get_auth_role() IN ('PRIN', 'HOD', 'ACC'), false);
$$;

-- 1.5 Executive Admin RBAC Check (PRIN, HOD)
CREATE OR REPLACE FUNCTION public.is_admin_or_executive()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.get_auth_role() IN ('PRIN', 'HOD'), false);
$$;

-- 1.6 Strict Permission Hardening: Revoke anon/PUBLIC, Grant authenticated
REVOKE EXECUTE ON FUNCTION public.get_current_tenant_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_auth_role() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_auth_student_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_financial_manager() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin_or_executive() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_current_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_auth_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_auth_student_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_financial_manager() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_executive() TO authenticated;

-- ------------------------------------------------------------------------------
-- SECTION 2: RLS POLICIES (initPlan Subselect Pattern, Text Comparisons)
-- ------------------------------------------------------------------------------

-- Ensure prerequisite columns exist for indexing and policy evaluation
ALTER TABLE IF EXISTS public.attendance ADD COLUMN IF NOT EXISTS class_id text;
ALTER TABLE IF EXISTS public.attendance ADD COLUMN IF NOT EXISTS attendance_date date DEFAULT CURRENT_DATE;

-- ==============================================================================
-- 2.1 FEE_LEDGER (Financial Isolation & Zero Cross-Student Leakage)
-- ==============================================================================
ALTER TABLE public.fee_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fee_ledger_select" ON public.fee_ledger;
CREATE POLICY "fee_ledger_select"
  ON public.fee_ledger FOR SELECT TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    AND (
      public.is_financial_manager()
      OR (
        public.get_auth_role() = 'STU'
        AND student_id = public.get_auth_student_id()
      )
    )
  );

DROP POLICY IF EXISTS "fee_ledger_insert" ON public.fee_ledger;
CREATE POLICY "fee_ledger_insert"
  ON public.fee_ledger FOR INSERT TO authenticated
  WITH CHECK (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.is_financial_manager()
  );

-- NOTICE ON FEE_LEDGER UPDATE:
-- Codebase audit (Step 0a) identified direct client update writes in:
-- 1. src/pages/AccountantDashboard.jsx:351 (approving pending offline payments)
-- 2. src/pages/AccountantDashboard.jsx:442 (rejecting invalid offline payments)
-- Retaining hardened tenant-scoped UPDATE policy pending operator migration to RPC.
DROP POLICY IF EXISTS "fee_ledger_update" ON public.fee_ledger;
CREATE POLICY "fee_ledger_update"
  ON public.fee_ledger FOR UPDATE TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.is_financial_manager()
  )
  WITH CHECK (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.is_financial_manager()
  );

-- Ledger is append-only for standard users (DELETE dropped)
DROP POLICY IF EXISTS "fee_ledger_delete" ON public.fee_ledger;

-- ==============================================================================
-- 2.2 CLASSES
-- ==============================================================================
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "classes_select" ON public.classes;
CREATE POLICY "classes_select"
  ON public.classes FOR SELECT TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
  );

DROP POLICY IF EXISTS "classes_insert" ON public.classes;
CREATE POLICY "classes_insert"
  ON public.classes FOR INSERT TO authenticated
  WITH CHECK (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.is_admin_or_executive()
  );

DROP POLICY IF EXISTS "classes_update" ON public.classes;
CREATE POLICY "classes_update"
  ON public.classes FOR UPDATE TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.is_admin_or_executive()
  )
  WITH CHECK (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.is_admin_or_executive()
  );

DROP POLICY IF EXISTS "classes_delete" ON public.classes;
CREATE POLICY "classes_delete"
  ON public.classes FOR DELETE TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.is_admin_or_executive()
  );

-- ==============================================================================
-- 2.3 PAYROLL
-- ==============================================================================
ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payroll_select" ON public.payroll;
CREATE POLICY "payroll_select"
  ON public.payroll FOR SELECT TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.is_financial_manager()
  );

DROP POLICY IF EXISTS "payroll_insert" ON public.payroll;
CREATE POLICY "payroll_insert"
  ON public.payroll FOR INSERT TO authenticated
  WITH CHECK (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.is_financial_manager()
  );

DROP POLICY IF EXISTS "payroll_update" ON public.payroll;
CREATE POLICY "payroll_update"
  ON public.payroll FOR UPDATE TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.is_financial_manager()
  )
  WITH CHECK (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.is_financial_manager()
  );

DROP POLICY IF EXISTS "payroll_delete" ON public.payroll;
CREATE POLICY "payroll_delete"
  ON public.payroll FOR DELETE TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.is_financial_manager()
  );

-- ==============================================================================
-- 2.4 EXPENSES
-- ==============================================================================
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "expenses_select" ON public.expenses;
CREATE POLICY "expenses_select"
  ON public.expenses FOR SELECT TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.is_financial_manager()
  );

DROP POLICY IF EXISTS "expenses_insert" ON public.expenses;
CREATE POLICY "expenses_insert"
  ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.is_financial_manager()
  );

DROP POLICY IF EXISTS "expenses_update" ON public.expenses;
CREATE POLICY "expenses_update"
  ON public.expenses FOR UPDATE TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.is_financial_manager()
  )
  WITH CHECK (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.is_financial_manager()
  );

DROP POLICY IF EXISTS "expenses_delete" ON public.expenses;
CREATE POLICY "expenses_delete"
  ON public.expenses FOR DELETE TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.is_financial_manager()
  );

-- ==============================================================================
-- 2.5 ATTENDANCE, STUDENTS, TEACHERS (STOP RULE ENFORCED)
-- Base executive & staff access policies below. Additional TCH/STU specific
-- access matrix subject to operator approval before final activation.
-- ==============================================================================
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attendance_select" ON public.attendance;
CREATE POLICY "attendance_select"
  ON public.attendance FOR SELECT TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    AND (
      public.is_admin_or_executive()
      OR public.get_auth_role() IN ('TCH', 'ACC', 'NTS')
    )
  );

DROP POLICY IF EXISTS "attendance_insert" ON public.attendance;
CREATE POLICY "attendance_insert"
  ON public.attendance FOR INSERT TO authenticated
  WITH CHECK (
    school_id = (SELECT public.get_current_tenant_id())
    AND (public.is_admin_or_executive() OR public.get_auth_role() = 'TCH')
  );

DROP POLICY IF EXISTS "attendance_update" ON public.attendance;
CREATE POLICY "attendance_update"
  ON public.attendance FOR UPDATE TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    AND (public.is_admin_or_executive() OR public.get_auth_role() = 'TCH')
  )
  WITH CHECK (
    school_id = (SELECT public.get_current_tenant_id())
    AND (public.is_admin_or_executive() OR public.get_auth_role() = 'TCH')
  );

-- STUDENTS TABLE
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "students_select" ON public.students;
CREATE POLICY "students_select"
  ON public.students FOR SELECT TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    AND (
      public.is_admin_or_executive()
      OR public.is_financial_manager()
      OR public.get_auth_role() IN ('TCH', 'NTS')
      OR (
        public.get_auth_role() = 'STU'
        AND roll_number = public.get_auth_student_id()
      )
    )
  );

DROP POLICY IF EXISTS "students_insert" ON public.students;
CREATE POLICY "students_insert"
  ON public.students FOR INSERT TO authenticated
  WITH CHECK (
    school_id = (SELECT public.get_current_tenant_id())
    AND (public.is_admin_or_executive() OR public.is_financial_manager())
  );

DROP POLICY IF EXISTS "students_update" ON public.students;
CREATE POLICY "students_update"
  ON public.students FOR UPDATE TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    AND (public.is_admin_or_executive() OR public.is_financial_manager())
  )
  WITH CHECK (
    school_id = (SELECT public.get_current_tenant_id())
    AND (public.is_admin_or_executive() OR public.is_financial_manager())
  );

-- TEACHERS TABLE
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teachers_select" ON public.teachers;
CREATE POLICY "teachers_select"
  ON public.teachers FOR SELECT TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
  );

DROP POLICY IF EXISTS "teachers_insert" ON public.teachers;
CREATE POLICY "teachers_insert"
  ON public.teachers FOR INSERT TO authenticated
  WITH CHECK (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.is_admin_or_executive()
  );

DROP POLICY IF EXISTS "teachers_update" ON public.teachers;
CREATE POLICY "teachers_update"
  ON public.teachers FOR UPDATE TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.is_admin_or_executive()
  )
  WITH CHECK (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.is_admin_or_executive()
  );

-- ------------------------------------------------------------------------------
-- SECTION 3: COMPOSITE INDEXES (Tenant-Scoped Query Optimization)
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_fee_ledger_tenant
  ON public.fee_ledger (school_id, student_id, status);

CREATE INDEX IF NOT EXISTS idx_attendance_tenant
  ON public.attendance (school_id, class_id, attendance_date);

CREATE INDEX IF NOT EXISTS idx_students_tenant
  ON public.students (school_id, roll_number);

CREATE INDEX IF NOT EXISTS idx_teachers_tenant
  ON public.teachers (school_id, email);

CREATE INDEX IF NOT EXISTS idx_classes_tenant
  ON public.classes (school_id, grade, section);

CREATE INDEX IF NOT EXISTS idx_payroll_tenant
  ON public.payroll (school_id, month, year);

CREATE INDEX IF NOT EXISTS idx_expenses_tenant
  ON public.expenses (school_id, date);

-- ------------------------------------------------------------------------------
-- SECTION 4: REVERSE_FEE_ENTRY (Pessimistic Row Lock & Double-Reversal Guard)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reverse_fee_entry(
  p_entry_id text,
  p_reason text DEFAULT 'Fee reversal',
  p_authorized_by text DEFAULT 'Principal'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_tenant text := public.get_current_tenant_id();
  v_status        text;
  v_amount        numeric;
  v_row_school    text;
  v_student_name  text;
  v_student_email text;
  v_student_id    text;
  v_cn_id         text;
BEGIN
  -- Strict Financial Manager RBAC Authorization Check
  IF NOT public.is_financial_manager() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized.');
  END IF;

  -- Pessimistic Row Lock: strictly blocks concurrent approvals
  SELECT status, amount, school_id, student_name, student_email, student_id
    INTO v_status, v_amount, v_row_school, v_student_name, v_student_email, v_student_id
    FROM public.fee_ledger
    WHERE id = p_entry_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Entry not found.');
  END IF;

  -- Multi-Tenant Security Check
  IF v_caller_tenant IS NULL OR v_caller_tenant <> v_row_school THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cross-tenant access denied.');
  END IF;

  -- Idempotency Check: block double-reversal
  IF LOWER(COALESCE(v_status, '')) IN ('reversed', 'cancelled') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already reversed. Duplicate blocked.');
  END IF;

  -- Apply reversal status to target entry
  UPDATE public.fee_ledger
     SET status = 'reversed', receipt_tag = 'REVERSED'
   WHERE id = p_entry_id;

  -- Generate unique credit note identifier
  v_cn_id := 'CN-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS') || '-' || substr(md5(random()::text), 1, 6);

  -- Insert matched negative ledger entry
  INSERT INTO public.fee_ledger (
    id, school_id, student_name, student_email, student_id,
    amount, status, payment_mode, receipt_tag, term, date, created_at
  ) VALUES (
    v_cn_id, v_row_school, v_student_name, v_student_email, v_student_id,
    -ABS(v_amount), 'paid',
    'Credit Note (Auth: ' || COALESCE(p_authorized_by, 'Principal') || ') - ' || p_reason,
    'CREDIT_NOTE', 'Reversal Adjustment', CURRENT_DATE, now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'reversal_id', p_entry_id,
    'credit_note_id', v_cn_id,
    'amount_reversed', v_amount
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reverse_fee_entry(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reverse_fee_entry(text, text, text) TO authenticated;

-- ------------------------------------------------------------------------------
-- SECTION 5: PDF_JOBS AND CONSENT_RECORDS (RLS & Realtime Idempotency)
-- ------------------------------------------------------------------------------
ALTER TABLE public.pdf_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_pdf_jobs_tenant
  ON public.pdf_jobs (school_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_consent_records_tenant
  ON public.consent_records (school_id, student_id);

-- PDF JOBS POLICIES
DROP POLICY IF EXISTS "pdf_jobs_select" ON public.pdf_jobs;
CREATE POLICY "pdf_jobs_select"
  ON public.pdf_jobs FOR SELECT TO authenticated
  USING (school_id = (SELECT public.get_current_tenant_id()));

DROP POLICY IF EXISTS "pdf_jobs_insert" ON public.pdf_jobs;
CREATE POLICY "pdf_jobs_insert"
  ON public.pdf_jobs FOR INSERT TO authenticated
  WITH CHECK (school_id = (SELECT public.get_current_tenant_id()));

-- CONSENT RECORDS POLICIES (DPDP Act 2023 Section 9(1))
DROP POLICY IF EXISTS "consent_records_select" ON public.consent_records;
CREATE POLICY "consent_records_select"
  ON public.consent_records FOR SELECT TO authenticated
  USING (school_id = (SELECT public.get_current_tenant_id()));

DROP POLICY IF EXISTS "consent_records_insert" ON public.consent_records;
CREATE POLICY "consent_records_insert"
  ON public.consent_records FOR INSERT TO authenticated
  WITH CHECK (school_id = (SELECT public.get_current_tenant_id()));

-- Realtime Publication Idempotent Injection
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public' AND tablename = 'pdf_jobs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pdf_jobs;
  END IF;
END $$;

-- ==============================================================================
-- SECTION 6: VERIFICATION & AUDIT SUITE (Run manually in SQL Editor)
-- ==============================================================================
-- 1. Check policies on fee_ledger:
--    SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'fee_ledger';
--
-- 2. Inspect active role resolution:
--    SELECT public.get_auth_role(); -- Expects 'PRIN', 'HOD', 'ACC', 'TCH', 'STU', 'NTS' or NULL
--
-- 3. Cross-Tenant query isolation check:
--    SELECT count(*) FROM fee_ledger WHERE school_id = 'NON_EXISTENT_OR_OTHER_SCHOOL'; -- Expects 0
--
-- 4. Audit RLS enforcement across all core tables:
--    SELECT relname, relrowsecurity FROM pg_class WHERE relname IN (
--      'fee_ledger', 'attendance', 'students', 'teachers', 'classes',
--      'payroll', 'expenses', 'pdf_jobs', 'consent_records'
--    );
--    -- Every row MUST have relrowsecurity = true.

