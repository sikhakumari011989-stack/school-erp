-- Migration 28: Staff Attendance and Maintenance Ticketing Tables
-- Enables permanent cloud persistence and RLS for NTS operations

CREATE TABLE IF NOT EXISTS public.staff_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  staff_id text NOT NULL,
  staff_name text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  time text NOT NULL,
  status text NOT NULL DEFAULT 'Present / On Duty',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_attendance_school_date 
  ON public.staff_attendance (school_id, date);

ALTER TABLE IF EXISTS public.staff_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_attendance_select" ON public.staff_attendance;
CREATE POLICY "staff_attendance_select"
  ON public.staff_attendance FOR SELECT TO authenticated
  USING (
    school_id::text = public.get_auth_school_id()
    OR public.get_auth_role() IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "staff_attendance_insert" ON public.staff_attendance;
CREATE POLICY "staff_attendance_insert"
  ON public.staff_attendance FOR INSERT TO authenticated
  WITH CHECK (
    school_id::text = public.get_auth_school_id()
    OR public.get_auth_role() IN ('admin', 'super_admin')
  );

-- Maintenance & Facility Requests Table
CREATE TABLE IF NOT EXISTS public.maintenance_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  reported_by_id text NOT NULL,
  reported_by_name text NOT NULL,
  title text NOT NULL,
  category text NOT NULL,
  location text NOT NULL,
  priority text NOT NULL DEFAULT 'Medium',
  description text,
  status text NOT NULL DEFAULT 'Open',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_school
  ON public.maintenance_tickets (school_id, status);

ALTER TABLE IF EXISTS public.maintenance_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "maintenance_tickets_select" ON public.maintenance_tickets;
CREATE POLICY "maintenance_tickets_select"
  ON public.maintenance_tickets FOR SELECT TO authenticated
  USING (
    school_id::text = public.get_auth_school_id()
    OR public.get_auth_role() IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "maintenance_tickets_insert" ON public.maintenance_tickets;
CREATE POLICY "maintenance_tickets_insert"
  ON public.maintenance_tickets FOR INSERT TO authenticated
  WITH CHECK (
    school_id::text = public.get_auth_school_id()
    OR public.get_auth_role() IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "maintenance_tickets_update" ON public.maintenance_tickets;
CREATE POLICY "maintenance_tickets_update"
  ON public.maintenance_tickets FOR UPDATE TO authenticated
  USING (
    school_id::text = public.get_auth_school_id()
    OR public.get_auth_role() IN ('admin', 'super_admin')
  );
