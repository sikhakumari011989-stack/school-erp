-- ==============================================================================
-- 10_substitute_teacher_management.sql: Smart Relief Matrix & Substitutes
-- Table: substitute_assignments
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.substitute_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  period_no text NOT NULL,
  class_name text NOT NULL,
  subject text NOT NULL,
  room text,
  absent_teacher_id text,
  absent_teacher_name text NOT NULL,
  substitute_teacher_id text,
  substitute_teacher_name text NOT NULL,
  assignment_reason text DEFAULT 'Teacher Absence / Approved Leave',
  status text NOT NULL DEFAULT 'assigned', -- 'assigned', 'accepted', 'completed', 'declined'
  assigned_by text,
  notified_at timestamptz,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT uq_substitute_period UNIQUE (school_id, date, period_no, substitute_teacher_name)
);

CREATE INDEX IF NOT EXISTS idx_substitute_tenant_date 
  ON public.substitute_assignments (school_id, date);
CREATE INDEX IF NOT EXISTS idx_substitute_teacher 
  ON public.substitute_assignments (school_id, substitute_teacher_name);

ALTER TABLE public.substitute_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "substitute_select" ON public.substitute_assignments;
CREATE POLICY "substitute_select"
  ON public.substitute_assignments FOR SELECT TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
  );

DROP POLICY IF EXISTS "substitute_write" ON public.substitute_assignments;
CREATE POLICY "substitute_write"
  ON public.substitute_assignments FOR ALL TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.get_auth_role() IN ('PRIN', 'HOD', 'TCH', 'admin')
  )
  WITH CHECK (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.get_auth_role() IN ('PRIN', 'HOD', 'admin')
  );

