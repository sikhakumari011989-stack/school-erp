-- ==============================================================================
-- 09_ai_timetable_optimizer.sql: AI Timetable Optimizer & Conflict Engine
-- Tables: timetable_versions, room_allocations
-- Enhances: public.timetable with time_window, status, version
-- ==============================================================================

-- 1. ADD OPTIMIZER COLUMNS TO EXISTING TIMETABLE TABLE
ALTER TABLE IF EXISTS public.timetable 
  ADD COLUMN IF NOT EXISTS time_window text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS version int DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_timetable_teacher_slot 
  ON public.timetable (school_id, day, period, teacher_name);
CREATE INDEX IF NOT EXISTS idx_timetable_room_slot 
  ON public.timetable (school_id, day, period, room);

-- ------------------------------------------------------------------------------
-- 2. TIMETABLE VERSIONS & PUBLICATION HISTORY
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.timetable_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  version_number int NOT NULL,
  title text NOT NULL,
  academic_year text NOT NULL DEFAULT '2026-2027',
  snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  conflict_count int DEFAULT 0,
  is_active boolean DEFAULT false,
  published_by text,
  published_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_timetable_versions_tenant 
  ON public.timetable_versions (school_id, version_number DESC);

ALTER TABLE public.timetable_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "timetable_versions_select" ON public.timetable_versions;
CREATE POLICY "timetable_versions_select"
  ON public.timetable_versions FOR SELECT TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
  );

DROP POLICY IF EXISTS "timetable_versions_write" ON public.timetable_versions;
CREATE POLICY "timetable_versions_write"
  ON public.timetable_versions FOR ALL TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.get_auth_role() IN ('PRIN', 'HOD', 'admin')
  )
  WITH CHECK (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.get_auth_role() IN ('PRIN', 'HOD', 'admin')
  );

-- ------------------------------------------------------------------------------
-- 3. ROOM ALLOCATIONS & LAB REGISTRY
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.room_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  room_name text NOT NULL,
  capacity int DEFAULT 40,
  room_type text DEFAULT 'classroom', -- 'classroom', 'lab', 'computer_lab', 'auditorium'
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_room_alloc_tenant 
  ON public.room_allocations (school_id);

ALTER TABLE public.room_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "room_allocations_select" ON public.room_allocations;
CREATE POLICY "room_allocations_select"
  ON public.room_allocations FOR SELECT TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
  );

DROP POLICY IF EXISTS "room_allocations_write" ON public.room_allocations;
CREATE POLICY "room_allocations_write"
  ON public.room_allocations FOR ALL TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.get_auth_role() IN ('PRIN', 'HOD', 'admin')
  )
  WITH CHECK (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.get_auth_role() IN ('PRIN', 'HOD', 'admin')
  );

