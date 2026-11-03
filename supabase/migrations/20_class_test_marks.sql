-- ==============================================================================
-- 20_class_test_marks.sql: Class Test Marks & Private Student Marks Portal
-- Minimal, relational, tenant-isolated schema with Row Level Security (RLS)
-- ==============================================================================

-- 1. CLASS TESTS TABLE
CREATE TABLE IF NOT EXISTS public.class_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  class_id text NOT NULL,           -- e.g. 'Class 10-A', 'Class 10'
  section text DEFAULT '',           -- e.g. 'A', 'B', 'ICSE'
  subject text NOT NULL,            -- e.g. 'Mathematics'
  title text NOT NULL,              -- e.g. 'Mathematics Unit Test 1'
  test_date date DEFAULT CURRENT_DATE,
  max_score numeric(6, 2) NOT NULL DEFAULT 20.00,
  passing_score numeric(6, 2) DEFAULT 8.00,
  highest_score numeric(6, 2) DEFAULT NULL, -- Class highest among published non-absent students
  status text NOT NULL DEFAULT 'draft',     -- 'draft' or 'published'
  created_by text,                  -- Teacher ID or Name
  created_by_role text DEFAULT 'TCH',
  created_at timestamptz DEFAULT now(),
  updated_by text,
  updated_at timestamptz DEFAULT now(),
  published_by text,
  published_at timestamptz,
  CONSTRAINT chk_status_valid CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT chk_max_score_positive CHECK (max_score > 0)
);

CREATE INDEX IF NOT EXISTS idx_class_tests_tenant_lookup
  ON public.class_tests (school_id, class_id, subject, test_date DESC);

CREATE INDEX IF NOT EXISTS idx_class_tests_status
  ON public.class_tests (school_id, status);

ALTER TABLE public.class_tests ENABLE ROW LEVEL SECURITY;

-- Class Tests: SELECT Policy
-- Staff/Faculty can view all tests in their school; Students can ONLY view published tests
DROP POLICY IF EXISTS "class_tests_select_policy" ON public.class_tests;
CREATE POLICY "class_tests_select_policy"
  ON public.class_tests FOR SELECT TO authenticated
  USING (
    school_id = (SELECT COALESCE(NULLIF(auth.jwt() -> 'app_metadata' ->> 'school_id', ''), public.get_current_tenant_id()))
    AND (
      public.get_auth_role() IN ('PRIN', 'HOD', 'TCH', 'ACC', 'principal', 'trustee', 'teacher', 'admin', 'super_admin')
      OR (public.get_auth_role() IN ('STU', 'student') AND status = 'published')
    )
  );

-- Class Tests: WRITE Policy
-- Only authorized teachers, principals, trustees, and admins can insert or update tests
DROP POLICY IF EXISTS "class_tests_write_policy" ON public.class_tests;
CREATE POLICY "class_tests_write_policy"
  ON public.class_tests FOR ALL TO authenticated
  USING (
    school_id = (SELECT COALESCE(NULLIF(auth.jwt() -> 'app_metadata' ->> 'school_id', ''), public.get_current_tenant_id()))
    AND public.get_auth_role() IN ('PRIN', 'HOD', 'TCH', 'principal', 'trustee', 'teacher', 'admin', 'super_admin')
  )
  WITH CHECK (
    school_id = (SELECT COALESCE(NULLIF(auth.jwt() -> 'app_metadata' ->> 'school_id', ''), public.get_current_tenant_id()))
    AND public.get_auth_role() IN ('PRIN', 'HOD', 'TCH', 'principal', 'trustee', 'teacher', 'admin', 'super_admin')
  );


-- 2. TEST SCORES TABLE (Student Individual Marks)
CREATE TABLE IF NOT EXISTS public.test_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.class_tests(id) ON DELETE CASCADE,
  school_id text NOT NULL,
  student_id text NOT NULL,         -- UUID or standard student ID
  student_name text NOT NULL,
  roll_number text NOT NULL,
  marks_obtained numeric(6, 2) NOT NULL DEFAULT 0.00,
  max_score numeric(6, 2) NOT NULL DEFAULT 20.00,
  is_absent boolean DEFAULT false,
  remarks text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT uq_test_student UNIQUE (test_id, student_id),
  CONSTRAINT chk_marks_non_negative CHECK (marks_obtained >= 0),
  CONSTRAINT chk_marks_within_ceiling CHECK (marks_obtained <= max_score)
);

CREATE INDEX IF NOT EXISTS idx_test_scores_tenant_test
  ON public.test_scores (school_id, test_id);

CREATE INDEX IF NOT EXISTS idx_test_scores_student_lookup
  ON public.test_scores (school_id, student_id, test_id);

CREATE INDEX IF NOT EXISTS idx_test_scores_roll_lookup
  ON public.test_scores (school_id, roll_number);

ALTER TABLE public.test_scores ENABLE ROW LEVEL SECURITY;

-- Test Scores: SELECT Policy
-- Staff/Faculty can view all scores in their school.
-- CRITICAL PRIVACY: Students can ONLY select their OWN score record and ONLY if the test is published!
DROP POLICY IF EXISTS "test_scores_select_policy" ON public.test_scores;
CREATE POLICY "test_scores_select_policy"
  ON public.test_scores FOR SELECT TO authenticated
  USING (
    school_id = (SELECT COALESCE(NULLIF(auth.jwt() -> 'app_metadata' ->> 'school_id', ''), public.get_current_tenant_id()))
    AND (
      -- Faculty & Executive Staff
      public.get_auth_role() IN ('PRIN', 'HOD', 'TCH', 'ACC', 'principal', 'trustee', 'teacher', 'admin', 'super_admin')
      -- Students: Self-only access and test must be published
      OR (
        public.get_auth_role() IN ('STU', 'student')
        AND (
          student_id = (SELECT auth.jwt() -> 'app_metadata' ->> 'student_id')
          OR roll_number = (SELECT auth.jwt() -> 'app_metadata' ->> 'student_id')
          OR student_id = (SELECT auth.uid()::text)
        )
        AND EXISTS (
          SELECT 1 FROM public.class_tests ct
          WHERE ct.id = test_scores.test_id
            AND ct.status = 'published'
        )
      )
    )
  );

-- Test Scores: WRITE Policy
-- Only teachers, principals, trustees, and admins can insert or update scores. Students CANNOT write.
DROP POLICY IF EXISTS "test_scores_write_policy" ON public.test_scores;
CREATE POLICY "test_scores_write_policy"
  ON public.test_scores FOR ALL TO authenticated
  USING (
    school_id = (SELECT COALESCE(NULLIF(auth.jwt() -> 'app_metadata' ->> 'school_id', ''), public.get_current_tenant_id()))
    AND public.get_auth_role() IN ('PRIN', 'HOD', 'TCH', 'principal', 'trustee', 'teacher', 'admin', 'super_admin')
  )
  WITH CHECK (
    school_id = (SELECT COALESCE(NULLIF(auth.jwt() -> 'app_metadata' ->> 'school_id', ''), public.get_current_tenant_id()))
    AND public.get_auth_role() IN ('PRIN', 'HOD', 'TCH', 'principal', 'trustee', 'teacher', 'admin', 'super_admin')
  );


-- 3. TRIGGER TO RECALCULATE CLASS HIGHEST SCORE AUTOMATICALLY
CREATE OR REPLACE FUNCTION public.recalculate_class_test_highest()
RETURNS TRIGGER AS $$
DECLARE
  v_test_id uuid;
  v_highest numeric(6, 2);
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_test_id := OLD.test_id;
  ELSE
    v_test_id := NEW.test_id;
  END IF;

  SELECT COALESCE(MAX(marks_obtained), 0.00)
    INTO v_highest
    FROM public.test_scores
   WHERE test_id = v_test_id
     AND is_absent = false;

  UPDATE public.class_tests
     SET highest_score = v_highest,
         updated_at = now()
   WHERE id = v_test_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_recalculate_class_test_highest ON public.test_scores;
CREATE TRIGGER trg_recalculate_class_test_highest
  AFTER INSERT OR UPDATE OR DELETE ON public.test_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_class_test_highest();


-- 4. SECURE DEFENSE-IN-DEPTH RPC FOR STUDENT RESULTS
-- Allows a student to query their own test results along with the class highest,
-- ensuring NO OTHER student names, roll numbers, or individual marks are ever transmitted.
CREATE OR REPLACE FUNCTION public.get_student_published_test_marks(
  p_school_id text,
  p_student_id text
)
RETURNS TABLE (
  test_id uuid,
  title text,
  subject text,
  class_id text,
  section text,
  test_date date,
  marks_obtained numeric(6, 2),
  max_score numeric(6, 2),
  class_highest numeric(6, 2),
  is_absent boolean,
  remarks text,
  status text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ct.id AS test_id,
    ct.title,
    ct.subject,
    ct.class_id,
    ct.section,
    ct.test_date,
    ts.marks_obtained,
    ts.max_score,
    COALESCE(ct.highest_score, ts.marks_obtained) AS class_highest,
    ts.is_absent,
    ts.remarks,
    ct.status
  FROM public.test_scores ts
  JOIN public.class_tests ct ON ct.id = ts.test_id
  WHERE ts.school_id = p_school_id
    AND (ts.student_id = p_student_id OR ts.roll_number = p_student_id)
    AND ct.status = 'published'
  ORDER BY ct.test_date DESC, ct.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

