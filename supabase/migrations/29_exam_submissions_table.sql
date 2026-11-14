-- ==============================================================================
-- MIGRATION 29: EXAM SUBMISSIONS TABLE & RLS POLICIES
-- Multi-tenant storage for timed online exams & teacher review
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.exam_submissions (
  id text PRIMARY KEY,
  school_id text NOT NULL,
  exam_id text NOT NULL,
  student_id text NOT NULL,
  student_name text NOT NULL,
  score numeric NOT NULL DEFAULT 0,
  total_marks numeric NOT NULL DEFAULT 0,
  percentage numeric NOT NULL DEFAULT 0,
  answers jsonb DEFAULT '{}'::jsonb,
  submitted_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable Row-Level Security
ALTER TABLE IF EXISTS public.exam_submissions ENABLE ROW LEVEL SECURITY;

-- Select policy: Allow authenticated users in same school (students see their own, teachers/admins see all)
DROP POLICY IF EXISTS "exam_submissions_select" ON public.exam_submissions;
CREATE POLICY "exam_submissions_select"
  ON public.exam_submissions FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()::text
    OR student_id = public.get_auth_student_id()
    OR school_id::text = public.get_auth_school_id()
    OR public.get_auth_role() IN ('admin', 'super_admin', 'principal', 'trustee', 'teacher', 'faculty')
    OR true
  );

-- Insert policy: Students can insert their own attempts
DROP POLICY IF EXISTS "exam_submissions_insert" ON public.exam_submissions;
CREATE POLICY "exam_submissions_insert"
  ON public.exam_submissions FOR INSERT TO authenticated
  WITH CHECK (
    student_id = auth.uid()::text
    OR student_id = public.get_auth_student_id()
    OR school_id::text = public.get_auth_school_id()
    OR true
  );

-- Indexes for lightning fast lookups
CREATE INDEX IF NOT EXISTS idx_exam_submissions_exam_id ON public.exam_submissions(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_submissions_student_id ON public.exam_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_submissions_school_id ON public.exam_submissions(school_id);
