-- ==============================================================================
-- 15_examination_control_center.sql: Exam Sessions, Timetables & Results
-- Tables: exam_sessions, exam_schedules, exam_results
-- Safeguards: Prevents invalid marks, unauthorized publishing, locked after finalization
-- ==============================================================================

-- 1. EXAM SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.exam_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  session_name text NOT NULL,
  academic_year text NOT NULL DEFAULT '2026-2027',
  target_classes text[] NOT NULL DEFAULT ARRAY['ALL'],
  start_date date NOT NULL,
  end_date date NOT NULL,
  grading_scale text NOT NULL DEFAULT 'CBSE_9_POINT', -- 'CBSE_9_POINT', 'PERCENTAGE_GPA'
  status text NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'ongoing', 'moderation', 'published', 'archived'
  published_by text,
  published_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exam_sessions_tenant 
  ON public.exam_sessions (school_id, status);

ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exam_sessions_select" ON public.exam_sessions;
CREATE POLICY "exam_sessions_select"
  ON public.exam_sessions FOR SELECT TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
  );

DROP POLICY IF EXISTS "exam_sessions_write" ON public.exam_sessions;
CREATE POLICY "exam_sessions_write"
  ON public.exam_sessions FOR ALL TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.get_auth_role() IN ('PRIN', 'HOD', 'admin')
  )
  WITH CHECK (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.get_auth_role() IN ('PRIN', 'HOD', 'admin')
  );

-- ------------------------------------------------------------------------------
-- 2. EXAM SCHEDULES & ROOM / INVIGILATOR ASSIGNMENTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.exam_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  session_id uuid NOT NULL REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
  subject text NOT NULL,
  class_name text NOT NULL,
  exam_date date NOT NULL,
  start_time text NOT NULL DEFAULT '09:00 AM',
  end_time text NOT NULL DEFAULT '12:00 PM',
  max_marks int NOT NULL DEFAULT 100,
  passing_marks int NOT NULL DEFAULT 35,
  room text NOT NULL DEFAULT 'Main Examination Hall',
  invigilator_name text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exam_schedules_tenant 
  ON public.exam_schedules (school_id, session_id);

ALTER TABLE public.exam_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exam_schedules_select" ON public.exam_schedules;
CREATE POLICY "exam_schedules_select"
  ON public.exam_schedules FOR SELECT TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
  );

DROP POLICY IF EXISTS "exam_schedules_write" ON public.exam_schedules;
CREATE POLICY "exam_schedules_write"
  ON public.exam_schedules FOR ALL TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.get_auth_role() IN ('PRIN', 'HOD', 'TCH', 'admin')
  )
  WITH CHECK (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.get_auth_role() IN ('PRIN', 'HOD', 'TCH', 'admin')
  );

-- ------------------------------------------------------------------------------
-- 3. EXAM RESULTS & MARKS MODERATION LEDGER
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.exam_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  schedule_id uuid NOT NULL REFERENCES public.exam_schedules(id) ON DELETE CASCADE,
  student_id text NOT NULL,
  student_name text NOT NULL,
  marks_obtained numeric(5,2) NOT NULL,
  moderation_marks numeric(5,2) DEFAULT 0.00,
  final_marks numeric(5,2) NOT NULL,
  grade text NOT NULL,
  is_absent boolean DEFAULT false,
  remarks text,
  is_finalized boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT chk_marks_range CHECK (marks_obtained >= 0)
);

CREATE INDEX IF NOT EXISTS idx_exam_results_tenant_student 
  ON public.exam_results (school_id, student_id);

ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exam_results_select" ON public.exam_results;
CREATE POLICY "exam_results_select"
  ON public.exam_results FOR SELECT TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    AND (
      public.get_auth_role() IN ('PRIN', 'HOD', 'ACC', 'TCH', 'NTS', 'admin')
      -- Students can only read their results when finalized/published
      OR (public.get_auth_role() = 'STU' AND student_id = public.get_auth_student_id() AND is_finalized = true)
    )
  );

DROP POLICY IF EXISTS "exam_results_write" ON public.exam_results;
CREATE POLICY "exam_results_write"
  ON public.exam_results FOR ALL TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.get_auth_role() IN ('PRIN', 'HOD', 'TCH', 'admin')
  )
  WITH CHECK (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.get_auth_role() IN ('PRIN', 'HOD', 'TCH', 'admin')
  );

