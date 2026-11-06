-- ==============================================================================
-- SUPABASE MIGRATION: 23_sales_readiness_and_subscription_hardening.sql
-- Academic OS: Sales Readiness, Payment Orders, Admin Auto-Provisioning & Subscription (v3 - Schema Reconciliation)
-- ==============================================================================
-- 1. PAYMENT ORDERS TABLE & COLUMN-LEVEL ACCESS RESTRICTION
-- 2. SCHEMA-VERIFIED PROVISION_INSTITUTIONAL_SCHOOL (UUID school_id preservation)
-- 3. INTER-SCHOOL ADMINISTRATOR OVERWRITE PROTECTION
-- 4. RESTRICTED PAYMENT ORDER SELECT PERMISSIONS (Staff + Relevant Student only)
-- 5. REVENUE & SUBSCRIPTION RENEWAL RPC (Strictly service_role; no session variable bypasses)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. PREREQUISITES: Ensure schools, profiles & licensing tables exist
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.schools
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS subscription_tier text NOT NULL DEFAULT 'enterprise',
  ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz DEFAULT (now() + interval '365 days'),
  ADD COLUMN IF NOT EXISTS institution_mode text DEFAULT 'school';

ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_school_role_code
  ON public.profiles (school_id, role_code);

CREATE TABLE IF NOT EXISTS public.school_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  school_code text NOT NULL,
  license_key text UNIQUE NOT NULL,
  tier text NOT NULL DEFAULT 'enterprise',
  status text NOT NULL DEFAULT 'active',
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '365 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.school_license_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_code text NOT NULL,
  action text NOT NULL,
  previous_status text,
  new_status text,
  performed_by text NOT NULL DEFAULT 'platform_owner',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 1. PAYMENT ORDERS TABLE (Razorpay Order Lifecycle Tracking)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text UNIQUE NOT NULL,
  school_id text NOT NULL,
  student_id text,
  student_name text,
  amount numeric(12,2) NOT NULL,
  currency text DEFAULT 'INR',
  receipt text,
  status text NOT NULL DEFAULT 'created', -- 'created', 'attempted', 'paid', 'failed'
  payment_id text,
  raw_payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE IF EXISTS public.payment_orders
  ALTER COLUMN school_id TYPE text;

CREATE INDEX IF NOT EXISTS idx_payment_orders_school_order 
  ON public.payment_orders (school_id, order_id);

CREATE INDEX IF NOT EXISTS idx_payment_orders_tenant_student 
  ON public.payment_orders (school_id, student_id);

CREATE INDEX IF NOT EXISTS idx_payment_orders_payment_id 
  ON public.payment_orders (payment_id);

ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

-- 1.1 RLS: SELECT restricted to authorized staff (ACC, PRIN, HOD) and relevant student
DROP POLICY IF EXISTS "payment_orders_select" ON public.payment_orders;
CREATE POLICY "payment_orders_select"
  ON public.payment_orders FOR SELECT TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_code())
    AND (
      public.is_financial_manager()
      OR public.is_admin_or_executive()
      OR student_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "payment_orders_service_role" ON public.payment_orders;
CREATE POLICY "payment_orders_service_role"
  ON public.payment_orders FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 1.2 DATA PROTECTION: Revoke raw_payload column access from regular authenticated users
-- Exposes only business columns (id, order_id, school_id, student_id, student_name, amount, currency, receipt, status, payment_id, created_at, updated_at)
REVOKE ALL ON public.payment_orders FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, order_id, school_id, student_id, student_name, amount, currency, receipt, status, payment_id, created_at, updated_at)
  ON public.payment_orders TO authenticated;
GRANT ALL ON public.payment_orders TO service_role;

-- ------------------------------------------------------------------------------
-- 2. SCHEMA-VERIFIED PROVISION_INSTITUTIONAL_SCHOOL (PRESERVES UUID SCHOOL IDENTITY)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.provision_institutional_school(
  p_name text,
  p_code text,
  p_admin_name text,
  p_admin_role_code text DEFAULT 'HOD-01',
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
  v_caller_role text := COALESCE(auth.role(), 'none');
  v_clean_code text := UPPER(TRIM(p_code));
  v_school_id uuid;
  v_admin_profile_id uuid := gen_random_uuid();
  v_expires_at timestamptz := now() + (p_validity_days || ' days')::interval;
  v_license_key text := 'LIC-' || v_clean_code || '-' || floor(extract(epoch from now()))::text;
  v_admin_role text := CASE 
    WHEN UPPER(TRIM(p_admin_role_code)) LIKE 'PRIN%' THEN 'principal'
    ELSE 'trustee'
  END;
  v_admin_email text;
  v_result jsonb;
BEGIN
  -- Strict security gate: Platform owner (service_role) ONLY. No user-settable session variables.
  IF v_caller_role != 'service_role' THEN
    RAISE EXCEPTION 'Access Denied: Only platform owner (service_role) can provision institutions.';
  END IF;

  IF v_clean_code IS NULL OR length(v_clean_code) < 2 THEN
    RAISE EXCEPTION 'School code must be at least 2 characters.';
  END IF;

  v_admin_email := CASE 
    WHEN p_admin_email IS NOT NULL AND TRIM(p_admin_email) != '' THEN TRIM(p_admin_email)
    ELSE LOWER(v_clean_code) || '.' || LOWER(TRIM(p_admin_role_code)) || '@academicos.internal'
  END;

  -- 1. Upsert into public.schools (id is UUID, code is TEXT)
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

  -- 2. Upsert Institutional License
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

  -- 3. Inter-school administrator overwrite protection
  -- If this email is already registered to a different school, disambiguate to prevent collision
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE email = v_admin_email AND school_id != v_school_id
  ) THEN
    v_admin_email := LOWER(v_clean_code) || '.' || LOWER(TRIM(p_admin_role_code)) || '.' || substr(md5(random()::text), 1, 4) || '@academicos.internal';
  END IF;

  -- 4. Create or Update Administrator Profile in public.profiles (PRESERVES UUID school_id)
  INSERT INTO public.profiles (
    id,
    school_id,
    full_name,
    role,
    role_code,
    email,
    phone,
    is_active,
    status,
    created_at
  )
  VALUES (
    v_admin_profile_id,
    v_school_id,
    COALESCE(NULLIF(TRIM(p_admin_name), ''), 'Trustee Administrator'),
    v_admin_role,
    UPPER(TRIM(p_admin_role_code)),
    v_admin_email,
    TRIM(p_admin_phone),
    true,
    'active',
    now()
  )
  ON CONFLICT (school_id, role_code) DO UPDATE
  SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    is_active = true,
    status = 'active'
  RETURNING id INTO v_admin_profile_id;

  -- 5. Record in license audit trail
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
    'Provisioned node: ' || TRIM(p_name) || ' with Master Admin: ' || COALESCE(p_admin_name, '') || ' (' || COALESCE(p_admin_role_code, 'HOD-01') || ')'
  );

  v_result := jsonb_build_object(
    'success', true,
    'school_id', v_school_id,
    'school_code', v_clean_code,
    'school_name', TRIM(p_name),
    'admin_profile_id', v_admin_profile_id,
    'admin_name', p_admin_name,
    'admin_role', v_admin_role,
    'admin_role_code', UPPER(TRIM(p_admin_role_code)),
    'admin_email', v_admin_email,
    'status', 'active',
    'subscription_status', 'active',
    'expires_at', v_expires_at,
    'license_key', v_license_key,
    'auth_account_created', false,
    'onboarding_requirement', 'Application profile provisioned in public.profiles. In Supabase architecture, auth.users credentials must be created via Supabase Auth Admin API or invite link. See OWNER_ACTIONS.md.'
  );

  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.provision_institutional_school(text, text, text, text, text, text, text, text, text, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.provision_institutional_school(text, text, text, text, text, text, text, text, text, int) TO service_role;

-- ------------------------------------------------------------------------------
-- 3. SUBSCRIPTION RENEWAL RPC (SECURITY DEFINER - SERVICE ROLE ONLY)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.renew_school_subscription(
  p_school_code text,
  p_tier text DEFAULT 'enterprise',
  p_validity_days int DEFAULT 365,
  p_payment_ref text DEFAULT '',
  p_amount numeric DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text := COALESCE(auth.role(), 'none');
  v_clean_code text := UPPER(TRIM(p_school_code));
  v_school_id uuid;
  v_current_expiry timestamptz;
  v_new_expiry timestamptz;
BEGIN
  IF v_caller_role != 'service_role' THEN
    RAISE EXCEPTION 'Access Denied: Only platform owner (service_role) can renew subscriptions.';
  END IF;

  SELECT id, subscription_expires_at INTO v_school_id, v_current_expiry
  FROM public.schools
  WHERE code = v_clean_code;

  IF v_school_id IS NULL THEN
    RAISE EXCEPTION 'School code % not found.', v_clean_code;
  END IF;

  -- Extend from current expiry if still active, otherwise from now
  IF v_current_expiry IS NOT NULL AND v_current_expiry > now() THEN
    v_new_expiry := v_current_expiry + (p_validity_days || ' days')::interval;
  ELSE
    v_new_expiry := now() + (p_validity_days || ' days')::interval;
  END IF;

  UPDATE public.schools
  SET
    status = 'active',
    subscription_status = 'active',
    subscription_tier = COALESCE(NULLIF(p_tier, ''), subscription_tier),
    subscription_expires_at = v_new_expiry
  WHERE id = v_school_id;

  UPDATE public.school_licenses
  SET
    status = 'active',
    tier = COALESCE(NULLIF(p_tier, ''), tier),
    expires_at = v_new_expiry,
    updated_at = now()
  WHERE school_code = v_clean_code;

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
    'EXTEND_EXPIRY',
    'active',
    'active',
    'master_operator',
    'Subscription renewed for ' || p_validity_days || ' days (Expires: ' || v_new_expiry || '). Payment Ref: ' || COALESCE(p_payment_ref, 'N/A') || ' Amount: INR ' || p_amount
  );

  RETURN jsonb_build_object(
    'success', true,
    'school_code', v_clean_code,
    'status', 'active',
    'tier', p_tier,
    'new_expiry', v_new_expiry,
    'payment_reference', p_payment_ref
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.renew_school_subscription(text, text, int, text, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.renew_school_subscription(text, text, int, text, numeric) TO service_role;
