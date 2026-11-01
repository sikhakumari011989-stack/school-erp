-- ==============================================================================
-- 11_transport_intelligence.sql: Fleet Registry, Routes & Manifests
-- Tables: transport_vehicles, transport_routes, student_transport_allocations
-- ==============================================================================

-- 1. VEHICLE & DRIVER REGISTRY
CREATE TABLE IF NOT EXISTS public.transport_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  vehicle_number text NOT NULL,
  capacity int NOT NULL DEFAULT 40,
  vehicle_model text NOT NULL,
  driver_name text NOT NULL,
  driver_phone text NOT NULL,
  driver_license_no text,
  fitness_expiry date,
  insurance_expiry date,
  pollution_expiry date,
  status text NOT NULL DEFAULT 'active', -- 'active', 'maintenance', 'retired'
  gps_device_serial text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transport_vehicles_tenant 
  ON public.transport_vehicles (school_id);

ALTER TABLE public.transport_vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transport_vehicles_select" ON public.transport_vehicles;
CREATE POLICY "transport_vehicles_select"
  ON public.transport_vehicles FOR SELECT TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
  );

DROP POLICY IF EXISTS "transport_vehicles_write" ON public.transport_vehicles;
CREATE POLICY "transport_vehicles_write"
  ON public.transport_vehicles FOR ALL TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.get_auth_role() IN ('PRIN', 'HOD', 'ACC', 'NTS', 'admin')
  )
  WITH CHECK (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.get_auth_role() IN ('PRIN', 'HOD', 'ACC', 'NTS', 'admin')
  );

-- ------------------------------------------------------------------------------
-- 2. TRANSPORT ROUTES & STOPS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transport_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  route_code text NOT NULL,
  route_name text NOT NULL,
  assigned_vehicle_id uuid REFERENCES public.transport_vehicles(id) ON DELETE SET NULL,
  start_location text NOT NULL,
  end_location text NOT NULL,
  morning_departure_time text NOT NULL DEFAULT '07:15 AM',
  afternoon_departure_time text NOT NULL DEFAULT '02:30 PM',
  monthly_transport_fee numeric(10,2) DEFAULT 2500.00,
  stops jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transport_routes_tenant 
  ON public.transport_routes (school_id);

ALTER TABLE public.transport_routes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transport_routes_select" ON public.transport_routes;
CREATE POLICY "transport_routes_select"
  ON public.transport_routes FOR SELECT TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
  );

DROP POLICY IF EXISTS "transport_routes_write" ON public.transport_routes;
CREATE POLICY "transport_routes_write"
  ON public.transport_routes FOR ALL TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.get_auth_role() IN ('PRIN', 'HOD', 'ACC', 'NTS', 'admin')
  )
  WITH CHECK (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.get_auth_role() IN ('PRIN', 'HOD', 'ACC', 'NTS', 'admin')
  );

-- ------------------------------------------------------------------------------
-- 3. STUDENT TRANSPORT ALLOCATION & MANIFEST
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_transport_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  student_id text NOT NULL,
  student_name text NOT NULL,
  class_name text,
  route_id uuid NOT NULL REFERENCES public.transport_routes(id) ON DELETE CASCADE,
  stop_name text NOT NULL,
  pickup_time text,
  drop_time text,
  emergency_parent_phone text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT uq_student_transport UNIQUE (school_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_student_trans_tenant 
  ON public.student_transport_allocations (school_id, route_id);

ALTER TABLE public.student_transport_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "student_trans_select" ON public.student_transport_allocations;
CREATE POLICY "student_trans_select"
  ON public.student_transport_allocations FOR SELECT TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    AND (
      public.get_auth_role() IN ('PRIN', 'HOD', 'ACC', 'NTS', 'TCH', 'admin')
      OR (public.get_auth_role() = 'STU' AND student_id = public.get_auth_student_id())
    )
  );

DROP POLICY IF EXISTS "student_trans_write" ON public.student_transport_allocations;
CREATE POLICY "student_trans_write"
  ON public.student_transport_allocations FOR ALL TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.get_auth_role() IN ('PRIN', 'HOD', 'ACC', 'NTS', 'admin')
  )
  WITH CHECK (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.get_auth_role() IN ('PRIN', 'HOD', 'ACC', 'NTS', 'admin')
  );

