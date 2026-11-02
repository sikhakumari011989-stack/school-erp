-- ==============================================================================
-- SUPABASE MIGRATION: 19_master_setup_and_licensing.sql
-- Production Master Provisioning Engine, Institutional Licensing & Persistent RLS
-- ==============================================================================

-- 1. ADD INSTITUTIONAL LICENSING & STATUS COLUMNS TO SCHOOLS TABLE
ALTER TABLE IF EXISTS public.schools
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS subscription_tier text NOT NULL DEFAULT 'enterprise',
  ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz DEFAULT (now() + interval '365 days'),
  ADD COLUMN IF NOT EXISTS institution_mode text DEFAULT 'school',
  ADD COLUMN IF NOT EXISTS primary_color text DEFAULT '#3B82F6',
  ADD COLUMN IF NOT EXISTS accent_color text DEFAULT '#8B5CF6',
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS tagline text DEFAULT 'Enterprise Multi-Tenant Node';

-- 2. CREATE SCHOOL LICENSES TABLE
CREATE TABLE IF NOT EXISTS public.school_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  school_code text NOT NULL,
  license_key text UNIQUE NOT NULL,
  tier text NOT NULL DEFAULT 'enterprise',
  status text NOT NULL DEFAULT 'active', -- 'active' | 'suspended' | 'expired'
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '365 days'),
  max_students int DEFAULT 2000,
  max_staff int DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookup by school_code
CREATE INDEX IF NOT EXISTS idx_school_licenses_code ON public.school_licenses(school_code);

-- 3. CREATE SCHOOL LICENSE AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.school_license_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_code text NOT NULL,
  action text NOT NULL, -- 'PROVISION' | 'ACTIVATE' | 'SUSPEND' | 'EXTEND_EXPIRY' | 'TERMINATE'
  previous_status text,
  new_status text,
  performed_by text NOT NULL DEFAULT 'platform_owner',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_school_license_audit_code ON public.school_license_audit_logs(school_code);

-- 4. RLS POLICIES FOR SCHOOLS & LICENSES
ALTER TABLE IF EXISTS public.school_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.school_license_audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow public read of active schools for tenant login resolution and branding
DROP POLICY IF EXISTS "schools_public_select" ON public.schools;
CREATE POLICY "schools_public_select"
  ON public.schools FOR SELECT TO authenticated, anon
  USING (true);

-- Allow authenticated admins to read licenses
DROP POLICY IF EXISTS "school_licenses_admin_select" ON public.school_licenses;
CREATE POLICY "school_licenses_admin_select"
  ON public.school_licenses FOR SELECT TO authenticated
  USING (public.is_admin_or_executive());

-- 5. RPC: provision_institutional_school (SECURITY DEFINER)
-- Allows the master setup portal to atomically create institutional nodes,
-- enforce license creation, and log audit trails directly into PostgreSQL.
CREATE OR REPLACE FUNCTION public.provision_institutional_school(
  p_name text,
  p_code text,
  p_admin_name text,
  p_admin_role_code text,
  p_admin_email text DEFAULT '',
  p_admin_phone text DEFAULT '',
  p_address text DEFAULT '',
  p_mode text DEFAULT 'school',
  p_tier text DEFAULT 'enterprise',
  p_validity_days int DEFAULT 365
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school_id uuid;
  v_clean_code text := UPPER(TRIM(p_code));
  v_expires_at timestamptz := now() + (p_validity_days || ' days')::interval;
  v_license_key text := 'LIC-' || v_clean_code || '-' || floor(extract(epoch from now()))::text;
  v_result jsonb;
BEGIN
  IF v_clean_code IS NULL OR length(v_clean_code) < 2 THEN
    RAISE EXCEPTION 'School code must be at least 2 characters.';
  END IF;

  -- 1. Upsert into public.schools
  INSERT INTO public.schools (
    code,
    name,
    phone,
    address,
    status,
    subscription_status,
    subscription_tier,
    subscription_expires_at,
    institution_mode,
    created_at
  )
  VALUES (
    v_clean_code,
    TRIM(p_name),
    TRIM(p_admin_phone),
    TRIM(p_address),
    'active',
    'active',
    p_tier,
    v_expires_at,
    p_mode,
    now()
  )
  ON CONFLICT (code) DO UPDATE
  SET
    name = EXCLUDED.name,
    phone = COALESCE(NULLIF(EXCLUDED.phone, ''), public.schools.phone),
    address = COALESCE(NULLIF(EXCLUDED.address, ''), public.schools.address),
    status = 'active',
    subscription_status = 'active',
    subscription_tier = EXCLUDED.subscription_tier,
    subscription_expires_at = EXCLUDED.subscription_expires_at,
    institution_mode = EXCLUDED.institution_mode
  RETURNING id INTO v_school_id;

  -- 2. Create or update license row
  INSERT INTO public.school_licenses (
    school_id,
    school_code,
    license_key,
    tier,
    status,
    starts_at,
    expires_at,
    updated_at
  )
  VALUES (
    v_school_id,
    v_clean_code,
    v_license_key,
    p_tier,
    'active',
    now(),
    v_expires_at,
    now()
  )
  ON CONFLICT (license_key) DO UPDATE
  SET
    status = 'active',
    expires_at = v_expires_at,
    updated_at = now();

  -- 3. Record in audit trail
  INSERT INTO public.school_license_audit_logs (
    school_code,
    action,
    previous_status,
    new_status,
    performed_by,
    notes
  )
  VALUES (
    v_clean_code,
    'PROVISION',
    'unregistered',
    'active',
    'master_operator',
    'Provisioned institutional node: ' || TRIM(p_name) || ' with Master Admin: ' || COALESCE(p_admin_name, '') || ' (' || COALESCE(p_admin_role_code, 'HOD-01') || ')'
  );

  v_result := jsonb_build_object(
    'success', true,
    'school_id', v_school_id,
    'school_code', v_clean_code,
    'school_name', TRIM(p_name),
    'status', 'active',
    'subscription_status', 'active',
    'expires_at', v_expires_at,
    'license_key', v_license_key
  );

  RETURN v_result;
END;
$$;

-- 6. RPC: set_school_license_status (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.set_school_license_status(
  p_school_code text,
  p_status text,
  p_expires_at timestamptz DEFAULT NULL,
  p_notes text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_code text := UPPER(TRIM(p_school_code));
  v_old_status text;
  v_school_id uuid;
BEGIN
  SELECT id, subscription_status INTO v_school_id, v_old_status
  FROM public.schools
  WHERE code ILIKE v_clean_code
  LIMIT 1;

  IF v_school_id IS NULL THEN
    RAISE EXCEPTION 'School code % not found', v_clean_code;
  END IF;

  UPDATE public.schools
  SET
    status = p_status,
    subscription_status = p_status,
    subscription_expires_at = COALESCE(p_expires_at, subscription_expires_at)
  WHERE id = v_school_id;

  UPDATE public.school_licenses
  SET
    status = p_status,
    expires_at = COALESCE(p_expires_at, expires_at),
    updated_at = now()
  WHERE school_id = v_school_id;

  INSERT INTO public.school_license_audit_logs (
    school_code,
    action,
    previous_status,
    new_status,
    performed_by,
    notes
  )
  VALUES (
    v_clean_code,
    CASE WHEN p_status = 'active' THEN 'ACTIVATE' ELSE 'SUSPEND' END,
    v_old_status,
    p_status,
    'master_operator',
    p_notes
  );

  RETURN jsonb_build_object(
    'success', true,
    'school_code', v_clean_code,
    'status', p_status,
    'updated_at', now()
  );
END;
$$;

-- 7. RPC: get_master_schools_roster (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_master_schools_roster()
RETURNS TABLE (
  id uuid,
  code text,
  name text,
  address text,
  city text,
  state text,
  phone text,
  status text,
  subscription_status text,
  subscription_tier text,
  subscription_expires_at timestamptz,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id,
    s.code,
    s.name,
    s.address,
    s.city,
    s.state,
    s.phone,
    COALESCE(s.status, 'active') AS status,
    COALESCE(s.subscription_status, 'active') AS subscription_status,
    COALESCE(s.subscription_tier, 'enterprise') AS subscription_tier,
    COALESCE(s.subscription_expires_at, now() + interval '365 days') AS subscription_expires_at,
    s.created_at
  FROM public.schools s
  ORDER BY s.created_at DESC;
$$;

-- 8. GRANT PRIVILEGES
GRANT EXECUTE ON FUNCTION public.provision_institutional_school(text, text, text, text, text, text, text, text, text, int) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.set_school_license_status(text, text, timestamptz, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_master_schools_roster() TO authenticated, anon;

