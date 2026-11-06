-- ============================================================================
-- SUPABASE MIGRATION: 24_institutional_subscription_lifecycle.sql
-- Academic OS — Institutional Subscription Lifecycle & Suspension Engine
-- ============================================================================

-- 1. Ensure Indexing on School Code and Expiry Timestamp for Fast Tenant Lookups
CREATE INDEX IF NOT EXISTS idx_schools_code_upper ON public.schools (UPPER(code));
CREATE INDEX IF NOT EXISTS idx_schools_subscription_expiry ON public.schools (subscription_expires_at);

-- 2. RPC: resolve_public_school(p_school_code)
-- Tenant resolution RPC with automated real-time licensing & expiration check.
-- When any user from a school logs in or resolves their tenant, this evaluates:
--   IF now() > subscription_expires_at THEN auto-suspend school node.
-- All data remains safely preserved in PostgreSQL.
CREATE OR REPLACE FUNCTION public.resolve_public_school(
  p_school_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_code text := UPPER(TRIM(p_school_code));
  v_school record;
  v_is_expired boolean := false;
  v_is_suspended boolean := false;
  v_is_blocked boolean := false;
BEGIN
  IF v_clean_code IS NULL OR v_clean_code = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Institutional school code is required.'
    );
  END IF;

  -- 1. Query School Record
  SELECT 
    id,
    code,
    name,
    address,
    city,
    state,
    phone,
    primary_color,
    accent_color,
    logo_url,
    tagline,
    COALESCE(status, 'active') AS status,
    COALESCE(subscription_status, 'active') AS subscription_status,
    COALESCE(subscription_tier, 'enterprise') AS subscription_tier,
    subscription_expires_at,
    created_at
  INTO v_school
  FROM public.schools
  WHERE UPPER(code) = v_clean_code
  LIMIT 1;

  IF v_school.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Institution node not found for code: ' || v_clean_code
    );
  END IF;

  -- 2. Expiration Evaluation (current_timestamp > subscription_expires_at)
  IF v_school.subscription_expires_at IS NOT NULL AND now() > v_school.subscription_expires_at THEN
    v_is_expired := true;

    -- Automated status update in database if currently marked active
    IF v_school.subscription_status != 'suspended' OR v_school.status != 'suspended' THEN
      UPDATE public.schools
      SET 
        status = 'suspended',
        subscription_status = 'suspended'
      WHERE id = v_school.id;

      v_school.status := 'suspended';
      v_school.subscription_status := 'suspended';
    END IF;
  END IF;

  -- 3. Suspension Evaluation
  IF LOWER(v_school.status) = 'suspended' OR LOWER(v_school.subscription_status) = 'suspended' THEN
    v_is_suspended := true;
  END IF;

  v_is_blocked := v_is_expired OR v_is_suspended;

  -- 4. Return Tenant Resolution Payload
  RETURN jsonb_build_object(
    'success', true,
    'id', v_school.id,
    'code', v_school.code,
    'name', v_school.name,
    'city', v_school.city,
    'state', v_school.state,
    'phone', v_school.phone,
    'primary_color', COALESCE(v_school.primary_color, '#3B82F6'),
    'accent_color', COALESCE(v_school.accent_color, '#8B5CF6'),
    'logo_url', v_school.logo_url,
    'tagline', COALESCE(v_school.tagline, 'Premier Multi-Tenant Academic Institution'),
    'status', v_school.status,
    'subscription_status', v_school.subscription_status,
    'subscription_tier', v_school.subscription_tier,
    'subscription_expires_at', v_school.subscription_expires_at,
    'is_expired', v_is_expired,
    'is_suspended', v_is_suspended,
    'is_blocked', v_is_blocked,
    'today', now()
  );
END;
$$;

-- 3. Batch / Scheduled Maintenance RPC: evaluate_all_school_expirations()
-- Can be triggered on a recurring schedule or cron to batch suspend expired nodes.
CREATE OR REPLACE FUNCTION public.evaluate_all_school_expirations()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  WITH updated AS (
    UPDATE public.schools
    SET 
      status = 'suspended',
      subscription_status = 'suspended'
    WHERE subscription_expires_at < now()
      AND (status != 'suspended' OR subscription_status != 'suspended')
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM updated;

  RETURN jsonb_build_object(
    'success', true,
    'schools_suspended', v_count,
    'evaluated_at', now()
  );
END;
$$;

-- 4. Reactivation RPC: reactivate_school_subscription()
-- Used when platform owner extends license or marks school Active in /master-setup.
CREATE OR REPLACE FUNCTION public.reactivate_school_subscription(
  p_school_code text,
  p_new_expiry timestamptz,
  p_tier text DEFAULT 'enterprise'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_code text := UPPER(TRIM(p_school_code));
  v_school_id uuid;
BEGIN
  SELECT id INTO v_school_id
  FROM public.schools
  WHERE UPPER(code) = v_clean_code
  LIMIT 1;

  IF v_school_id IS NULL THEN
    RAISE EXCEPTION 'School code % not found.', v_clean_code;
  END IF;

  UPDATE public.schools
  SET
    status = 'active',
    subscription_status = 'active',
    subscription_tier = COALESCE(NULLIF(p_tier, ''), subscription_tier),
    subscription_expires_at = p_new_expiry
  WHERE id = v_school_id;

  RETURN jsonb_build_object(
    'success', true,
    'school_code', v_clean_code,
    'status', 'active',
    'subscription_expires_at', p_new_expiry
  );
END;
$$;

-- 5. Grant Permissions
REVOKE ALL ON FUNCTION public.resolve_public_school(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_public_school(text) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.evaluate_all_school_expirations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.evaluate_all_school_expirations() TO service_role;

REVOKE ALL ON FUNCTION public.reactivate_school_subscription(text, timestamptz, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reactivate_school_subscription(text, timestamptz, text) TO service_role, authenticated;
