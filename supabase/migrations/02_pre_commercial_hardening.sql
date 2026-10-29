-- ==============================================================================
-- SUPABASE MIGRATION: 02_pre_commercial_hardening.sql
-- Pre-Commercial Hardening & CTO Audit Resolution Sprint
-- Multi-Tenant EduSaaS Platform
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- PHASE 1: SUPABASE RLS PERFORMANCE & SECURITY FIXES (initPlan Caching)
-- ------------------------------------------------------------------------------

-- Ensure attendance table has class_id and attendance_date columns for biometric and indexing compatibility
ALTER TABLE IF EXISTS public.attendance ADD COLUMN IF NOT EXISTS class_id text;
ALTER TABLE IF EXISTS public.attendance ADD COLUMN IF NOT EXISTS attendance_date date DEFAULT CURRENT_DATE;

-- Helper to extract tenant school_id with subselect initPlan optimization
-- Wrapping calls in (SELECT public.get_current_tenant_id()) forces PostgreSQL
-- to evaluate it once as an InitPlan instead of per-row.
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF((auth.jwt() -> 'app_metadata' ->> 'school_id'), ''),
    NULLIF(current_setting('app.current_school_id', true), ''),
    NULLIF((auth.jwt() -> 'user_metadata' ->> 'school_id'), ''),
    (SELECT school_id::text FROM public.profiles WHERE id = auth.uid() LIMIT 1),
    (SELECT school_id::text FROM public.users WHERE id = auth.uid() LIMIT 1),
    ''
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_current_tenant_id() TO authenticated, anon;

-- Composite Indexes to eliminate table scans and optimize tenant-scoped queries
CREATE INDEX IF NOT EXISTS idx_fee_ledger_tenant ON public.fee_ledger (school_id, student_id, status);
CREATE INDEX IF NOT EXISTS idx_attendance_tenant ON public.attendance (school_id, class_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON public.attendance (school_id, class_name, date);
CREATE INDEX IF NOT EXISTS idx_students_tenant ON public.students (school_id, roll_number);
CREATE INDEX IF NOT EXISTS idx_teachers_tenant ON public.teachers (school_id, email);
CREATE INDEX IF NOT EXISTS idx_classes_tenant ON public.classes (school_id, grade, section);
CREATE INDEX IF NOT EXISTS idx_payroll_tenant ON public.payroll (school_id, month, year);

-- Re-apply RLS on fee_ledger with InitPlan caching pattern
DROP POLICY IF EXISTS "fee_ledger_select" ON public.fee_ledger;
CREATE POLICY "fee_ledger_select"
  ON public.fee_ledger FOR SELECT TO authenticated
  USING (
    (
      school_id = (SELECT COALESCE(NULLIF(auth.jwt() -> 'app_metadata' ->> 'school_id', ''), public.get_current_tenant_id()))
      AND (
        public.is_admin_or_executive()
        OR public.is_financial_manager()
        OR (
          public.is_student() AND (
            roll_number = public.get_auth_student_id()
            OR student_id::text = public.get_auth_student_id()
            OR (LOWER(student_email) = public.get_auth_user_email() AND public.get_auth_user_email() <> '')
          )
        )
      )
    )
    OR public.get_auth_role() IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "fee_ledger_insert" ON public.fee_ledger;
CREATE POLICY "fee_ledger_insert"
  ON public.fee_ledger FOR INSERT TO authenticated
  WITH CHECK (
    school_id = (SELECT COALESCE(NULLIF(auth.jwt() -> 'app_metadata' ->> 'school_id', ''), public.get_current_tenant_id()))
    AND (
      public.is_admin_or_executive()
      OR public.is_financial_manager()
      OR (
        public.is_student() AND (
          roll_number = public.get_auth_student_id()
          OR student_id::text = public.get_auth_student_id()
          OR (LOWER(student_email) = public.get_auth_user_email() AND public.get_auth_user_email() <> '')
        )
      )
    )
  );

DROP POLICY IF EXISTS "fee_ledger_update" ON public.fee_ledger;
CREATE POLICY "fee_ledger_update"
  ON public.fee_ledger FOR UPDATE TO authenticated
  USING (
    school_id = (SELECT COALESCE(NULLIF(auth.jwt() -> 'app_metadata' ->> 'school_id', ''), public.get_current_tenant_id()))
    AND public.is_financial_manager()
  )
  WITH CHECK (
    school_id = (SELECT COALESCE(NULLIF(auth.jwt() -> 'app_metadata' ->> 'school_id', ''), public.get_current_tenant_id()))
    AND public.is_financial_manager()
  );

DROP POLICY IF EXISTS "fee_ledger_delete" ON public.fee_ledger;
CREATE POLICY "fee_ledger_delete"
  ON public.fee_ledger FOR DELETE TO authenticated
  USING (
    school_id = (SELECT COALESCE(NULLIF(auth.jwt() -> 'app_metadata' ->> 'school_id', ''), public.get_current_tenant_id()))
    AND public.is_admin_or_executive()
  );

-- Re-apply RLS on students with InitPlan caching pattern
DROP POLICY IF EXISTS "students_select" ON public.students;
CREATE POLICY "students_select"
  ON public.students FOR SELECT TO authenticated
  USING (
    (
      school_id = (SELECT COALESCE(NULLIF(auth.jwt() -> 'app_metadata' ->> 'school_id', ''), public.get_current_tenant_id()))
      AND (
        public.is_admin_or_executive()
        OR public.is_financial_manager()
        OR public.is_teacher()
        OR public.is_staff()
        OR (
          public.is_student() AND (
            id = auth.uid()
            OR roll_number = public.get_auth_student_id()
            OR LOWER(email) = public.get_auth_user_email()
          )
        )
      )
    )
    OR public.get_auth_role() IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "students_insert" ON public.students;
CREATE POLICY "students_insert"
  ON public.students FOR INSERT TO authenticated
  WITH CHECK (
    school_id = (SELECT COALESCE(NULLIF(auth.jwt() -> 'app_metadata' ->> 'school_id', ''), public.get_current_tenant_id()))
    AND (public.is_admin_or_executive() OR public.is_financial_manager())
  );

DROP POLICY IF EXISTS "students_update" ON public.students;
CREATE POLICY "students_update"
  ON public.students FOR UPDATE TO authenticated
  USING (
    school_id = (SELECT COALESCE(NULLIF(auth.jwt() -> 'app_metadata' ->> 'school_id', ''), public.get_current_tenant_id()))
    AND (public.is_admin_or_executive() OR public.is_financial_manager())
  )
  WITH CHECK (
    school_id = (SELECT COALESCE(NULLIF(auth.jwt() -> 'app_metadata' ->> 'school_id', ''), public.get_current_tenant_id()))
    AND (public.is_admin_or_executive() OR public.is_financial_manager())
  );

-- Re-apply RLS on attendance with InitPlan caching pattern
DROP POLICY IF EXISTS "attendance_select" ON public.attendance;
CREATE POLICY "attendance_select"
  ON public.attendance FOR SELECT TO authenticated
  USING (
    school_id = (SELECT COALESCE(NULLIF(auth.jwt() -> 'app_metadata' ->> 'school_id', ''), public.get_current_tenant_id()))
    OR public.get_auth_role() IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "attendance_insert" ON public.attendance;
CREATE POLICY "attendance_insert"
  ON public.attendance FOR INSERT TO authenticated
  WITH CHECK (
    school_id = (SELECT COALESCE(NULLIF(auth.jwt() -> 'app_metadata' ->> 'school_id', ''), public.get_current_tenant_id()))
    AND (public.is_teacher() OR public.is_admin_or_executive())
  );

DROP POLICY IF EXISTS "attendance_update" ON public.attendance;
CREATE POLICY "attendance_update"
  ON public.attendance FOR UPDATE TO authenticated
  USING (
    school_id = (SELECT COALESCE(NULLIF(auth.jwt() -> 'app_metadata' ->> 'school_id', ''), public.get_current_tenant_id()))
    AND (public.is_teacher() OR public.is_admin_or_executive())
  )
  WITH CHECK (
    school_id = (SELECT COALESCE(NULLIF(auth.jwt() -> 'app_metadata' ->> 'school_id', ''), public.get_current_tenant_id()))
    AND (public.is_teacher() OR public.is_admin_or_executive())
  );

-- ------------------------------------------------------------------------------
-- PHASE 2: CONCURRENT FINANCIAL RACE CONDITION LOCK (Pessimistic Row Lock)
-- ------------------------------------------------------------------------------

-- Maker-Checker Fee Reversal RPC with Pessimistic Row Locking (FOR UPDATE)
CREATE OR REPLACE FUNCTION public.reverse_fee_entry(
  p_entry_id text,
  p_reversal_reason text DEFAULT 'Principal Maker-Checker Reversal Authorization',
  p_authorized_by text DEFAULT 'Principal'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_calling_tenant text;
  v_status text;
  v_orig_amount numeric;
  v_student_name text;
  v_class_name text;
  v_student_id text;
  v_student_email text;
  v_roll_number text;
  v_row_school_id text;
  v_credit_note_id text;
BEGIN
  -- Identify caller tenant
  v_calling_tenant := public.get_current_tenant_id();

  -- 1. PESSIMISTIC ROW LOCKING: Lock row immediately to prevent concurrent approvals
  SELECT status, amount, student_name, class_name, student_id, student_email, roll_number, school_id
  INTO v_status, v_orig_amount, v_student_name, v_class_name, v_student_id, v_student_email, v_roll_number, v_row_school_id
  FROM public.fee_ledger
  WHERE id = p_entry_id
  FOR UPDATE;

  -- 2. Validate existence
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Fee transaction entry does not exist.'
    );
  END IF;

  -- 3. Multi-Tenant isolation verification
  IF v_calling_tenant <> '' AND v_calling_tenant <> v_row_school_id AND NOT public.is_admin_or_executive() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized cross-tenant fee reversal rejection.'
    );
  END IF;

  -- 4. Check for existing reversal
  IF LOWER(v_status) = 'reversed' OR LOWER(v_status) = 'cancelled' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Entry has already been reversed or cancelled. Duplicate reversal blocked.'
    );
  END IF;

  -- 5. Mark original entry as reversed
  UPDATE public.fee_ledger
  SET status = 'reversed',
      receipt_tag = 'REVERSED'
  WHERE id = p_entry_id;

  -- 6. Generate synchronized credit note ledger entry
  v_credit_note_id := 'CN-' || floor(extract(epoch from now()) * 1000)::text;

  INSERT INTO public.fee_ledger (
    id,
    school_id,
    student_name,
    roll_number,
    student_id,
    student_email,
    class_name,
    amount,
    status,
    payment_mode,
    term,
    receipt_tag,
    date
  ) VALUES (
    v_credit_note_id,
    v_row_school_id,
    v_student_name,
    v_roll_number,
    v_student_id,
    v_student_email,
    v_class_name,
    -ABS(v_orig_amount),
    'paid',
    'Credit Note / Reversal (Auth: ' || COALESCE(p_authorized_by, 'Principal') || ') - ' || p_reversal_reason,
    'Reversal Adjustment',
    'CREDIT_NOTE',
    CURRENT_DATE
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Fee entry successfully reversed with row lock.',
    'reversal_id', p_entry_id,
    'credit_note_id', v_credit_note_id,
    'amount_reversed', v_orig_amount
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reverse_fee_entry(text, text, text) TO authenticated, anon;

-- ------------------------------------------------------------------------------
-- PHASE 3: ASYNC PDF BATCH QUEUE TABLE & RLS
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.pdf_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  job_type text NOT NULL, -- 'BATCH_REPORT_CARDS', 'FEE_INVOICES', 'CERTIFICATES'
  status text NOT NULL DEFAULT 'Queued', -- 'Queued', 'Processing', 'Completed', 'Failed'
  file_url text,
  total_records integer DEFAULT 0,
  processed_records integer DEFAULT 0,
  error_message text,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.pdf_jobs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_pdf_jobs_tenant ON public.pdf_jobs (school_id, status, created_at);

DROP POLICY IF EXISTS "pdf_jobs_select" ON public.pdf_jobs;
CREATE POLICY "pdf_jobs_select"
  ON public.pdf_jobs FOR SELECT TO authenticated
  USING (
    school_id = (SELECT COALESCE(NULLIF(auth.jwt() -> 'app_metadata' ->> 'school_id', ''), public.get_current_tenant_id()))
    OR public.get_auth_role() IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "pdf_jobs_insert" ON public.pdf_jobs;
CREATE POLICY "pdf_jobs_insert"
  ON public.pdf_jobs FOR INSERT TO authenticated
  WITH CHECK (
    school_id = (SELECT COALESCE(NULLIF(auth.jwt() -> 'app_metadata' ->> 'school_id', ''), public.get_current_tenant_id()))
  );

DROP POLICY IF EXISTS "pdf_jobs_update" ON public.pdf_jobs;
CREATE POLICY "pdf_jobs_update"
  ON public.pdf_jobs FOR UPDATE TO authenticated
  USING (
    school_id = (SELECT COALESCE(NULLIF(auth.jwt() -> 'app_metadata' ->> 'school_id', ''), public.get_current_tenant_id()))
    OR public.get_auth_role() IN ('admin', 'super_admin')
  )
  WITH CHECK (
    school_id = (SELECT COALESCE(NULLIF(auth.jwt() -> 'app_metadata' ->> 'school_id', ''), public.get_current_tenant_id()))
    OR public.get_auth_role() IN ('admin', 'super_admin')
  );

-- Enable Supabase Realtime replication on pdf_jobs table
ALTER PUBLICATION supabase_realtime ADD TABLE public.pdf_jobs;

-- ------------------------------------------------------------------------------
-- PHASE 5: ENTERPRISE COMPLIANCE - DPDP ACT 2023 CONSENT LEDGER
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.consent_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  student_id text NOT NULL,
  parent_name text NOT NULL,
  parent_phone text,
  parent_email text,
  consent_purpose text NOT NULL,
  ip_address text,
  is_verified boolean DEFAULT true,
  verification_mode text DEFAULT 'Digital Signature / Legal Guardian Affirmation',
  granted_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_consent_records_tenant ON public.consent_records (school_id, student_id);

DROP POLICY IF EXISTS "consent_records_select" ON public.consent_records;
CREATE POLICY "consent_records_select"
  ON public.consent_records FOR SELECT TO authenticated
  USING (
    school_id = (SELECT COALESCE(NULLIF(auth.jwt() -> 'app_metadata' ->> 'school_id', ''), public.get_current_tenant_id()))
    OR public.get_auth_role() IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "consent_records_insert" ON public.consent_records;
CREATE POLICY "consent_records_insert"
  ON public.consent_records FOR INSERT TO authenticated
  WITH CHECK (
    school_id = (SELECT COALESCE(NULLIF(auth.jwt() -> 'app_metadata' ->> 'school_id', ''), public.get_current_tenant_id()))
  );

