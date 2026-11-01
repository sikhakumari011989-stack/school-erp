-- ==============================================================================
-- 05_calendar_tests_streaks.sql: Academic Calendar, Class Tests & Streaks
-- 1. Academic Calendar & Institutional Event Registry (calendar_events)
-- 2. Class Test Evaluations & Assessments (class_tests)
-- 3. Student Assessment Marks & Grade Ledger (test_scores)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ACADEMIC CALENDAR & INSTITUTIONAL EVENTS
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  title text NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  event_type text NOT NULL DEFAULT 'holiday', -- 'holiday', 'exam', 'event', 'vacation', 'working_day'
  is_holiday boolean DEFAULT false,
  target_classes text[] DEFAULT ARRAY['ALL'],
  created_by text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_calendar_events_tenant_dates
  ON public.calendar_events (school_id, start_date, end_date);

DROP POLICY IF EXISTS "calendar_events_select" ON public.calendar_events;
CREATE POLICY "calendar_events_select"
  ON public.calendar_events FOR SELECT TO authenticated
  USING (
    school_id = (SELECT COALESCE(NULLIF(auth.jwt() -> 'app_metadata' ->> 'school_id', ''), public.get_current_tenant_id()))
    OR public.get_auth_role() IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "calendar_events_write" ON public.calendar_events;
CREATE POLICY "calendar_events_write"
  ON public.calendar_events FOR ALL TO authenticated
  USING (
    (school_id = (SELECT COALESCE(NULLIF(auth.jwt() -> 'app_metadata' ->> 'school_id', ''), public.get_current_tenant_id()))
     AND public.get_auth_role() IN ('PRIN', 'HOD', 'ACC', 'TCH', 'principal', 'trustee', 'accountant', 'teacher', 'admin'))
    OR public.get_auth_role() IN ('admin', 'super_admin')
  )
  WITH CHECK (
    (school_id = (SELECT COALESCE(NULLIF(auth.jwt() -> 'app_metadata' ->> 'school_id', ''), public.get_current_tenant_id()))
     AND public.get_auth_role() IN ('PRIN', 'HOD', 'ACC', 'TCH', 'principal', 'trustee', 'accountant', 'teacher', 'admin'))
    OR public.get_auth_role() IN ('admin', 'super_admin')
  );

-- ------------------------------------------------------------------------------
-- 2. CLASS TESTS & ASSESSMENTS
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.class_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  class_id text NOT NULL, -- e.g. 'Class 10-A', 'Class 10-ICSE'
  subject text NOT NULL,
  title text NOT NULL,
  test_date date DEFAULT CURRENT_DATE,
  max_score numeric(6, 2) NOT NULL DEFAULT 50.00,
  passing_score numeric(6, 2) DEFAULT 20.00,
  created_by text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.class_tests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_class_tests_tenant_class
  ON public.class_tests (school_id, class_id, test_date DESC);

DROP POLICY IF EXISTS "class_tests_select" ON public.class_tests;
CREATE POLICY "class_tests_select"
  ON public.class_tests FOR SELECT TO authenticated
  USING (
    school_id = (SELECT COALESCE(NULLIF(auth.jwt() -> 'app_metadata' ->> 'school_id', ''), public.get_current_tenant_id()))
    OR public.get_auth_role() IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "class_tests_write" ON public.class_tests;
CREATE POLICY "class_tests_write"
  ON public.class_tests FOR ALL TO authenticated
  USING (
    (school_id = (SELECT COALESCE(NULLIF(auth.jwt() -> 'app_metadata' ->> 'school_id', ''), public.get_current_tenant_id()))
     AND public.get_auth_role() IN ('PRIN', 'HOD', 'TCH', 'principal', 'trustee', 'teacher', 'admin'))
    OR public.get_auth_role() IN ('admin', 'super_admin')
  )
  WITH CHECK (
    (school_id = (SELECT COALESCE(NULLIF(auth.jwt() -> 'app_metadata' ->> 'school_id', ''), public.get_current_tenant_id()))
     AND public.get_auth_role() IN ('PRIN', 'HOD', 'TCH', 'principal', 'trustee', 'teacher', 'admin'))
    OR public.get_auth_role() IN ('admin', 'super_admin')
  );

-- ------------------------------------------------------------------------------
-- 3. TEST SCORES & STUDENT EVALUATION LEDGER
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.test_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.class_tests(id) ON DELETE CASCADE,
  school_id text NOT NULL,
  student_id text NOT NULL,
  student_name text,
  roll_number text NOT NULL,
  marks_obtained numeric(6, 2) NOT NULL DEFAULT 0.00,
  max_score numeric(6, 2) NOT NULL DEFAULT 50.00,
  is_absent boolean DEFAULT false,
  remarks text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT uq_test_student UNIQUE (test_id, student_id)
);

ALTER TABLE public.test_scores ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_test_scores_student
  ON public.test_scores (school_id, student_id, test_id);

CREATE INDEX IF NOT EXISTS idx_test_scores_roll
  ON public.test_scores (school_id, roll_number);

DROP POLICY IF EXISTS "test_scores_select" ON public.test_scores;
CREATE POLICY "test_scores_select"
  ON public.test_scores FOR SELECT TO authenticated
  USING (
    -- Teachers/Admins can see all scores in their school
    (school_id = (SELECT COALESCE(NULLIF(auth.jwt() -> 'app_metadata' ->> 'school_id', ''), public.get_current_tenant_id()))
     AND public.get_auth_role() IN ('PRIN', 'HOD', 'TCH', 'ACC', 'principal', 'trustee', 'teacher', 'accountant', 'admin'))
    -- Students can read their own test scores
    OR (
      school_id = (SELECT COALESCE(NULLIF(auth.jwt() -> 'app_metadata' ->> 'school_id', ''), public.get_current_tenant_id()))
      AND (
        student_id = (SELECT auth.jwt() -> 'app_metadata' ->> 'student_id')
        OR roll_number = (SELECT auth.jwt() -> 'app_metadata' ->> 'student_id')
        OR student_id = (SELECT auth.uid()::text)
      )
    )
    OR public.get_auth_role() IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "test_scores_write" ON public.test_scores;
CREATE POLICY "test_scores_write"
  ON public.test_scores FOR ALL TO authenticated
  USING (
    (school_id = (SELECT COALESCE(NULLIF(auth.jwt() -> 'app_metadata' ->> 'school_id', ''), public.get_current_tenant_id()))
     AND public.get_auth_role() IN ('PRIN', 'HOD', 'TCH', 'principal', 'trustee', 'teacher', 'admin'))
    OR public.get_auth_role() IN ('admin', 'super_admin')
  )
  WITH CHECK (
    (school_id = (SELECT COALESCE(NULLIF(auth.jwt() -> 'app_metadata' ->> 'school_id', ''), public.get_current_tenant_id()))
     AND public.get_auth_role() IN ('PRIN', 'HOD', 'TCH', 'principal', 'trustee', 'teacher', 'admin'))
    OR public.get_auth_role() IN ('admin', 'super_admin')
  );

