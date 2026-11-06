-- ==============================================================================
-- ROLLBACK SCRIPT: rollback_21_22_23.sql
-- Academic OS: Safe, Non-Destructive Rollback for Migrations 23, 22, and 21 (v3)
-- Purpose: Safely revert function signatures and policies in staging/production
--          WITHOUT destroying payment history, reversal logs, or tenant data,
--          and WITHOUT restoring known-insecure permissive policies.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- PRE-ROLLBACK VERIFICATION: Pre-Flight Safety Checks
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'STARTING PRE-ROLLBACK VERIFICATION';
  RAISE NOTICE '====================================================================';

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fee_ledger') THEN
    RAISE EXCEPTION 'PRE-ROLLBACK SAFETY FAILURE: public.fee_ledger table does not exist!';
  END IF;

  RAISE NOTICE 'SUCCESS: Pre-rollback sanity checks passed.';
END $$;

-- ------------------------------------------------------------------------------
-- 1. ROLLBACK MIGRATION 23 (Sales Readiness & Subscription Hardening)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  RAISE NOTICE 'Reverting Migration 23 functions and permissions...';
END $$;

DROP FUNCTION IF EXISTS public.renew_school_subscription(text, text, int, text, numeric);

-- Revert provision_institutional_school back to phase 2 definition
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
  IF COALESCE(auth.role(), '') != 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized: Platform Owner service-role authority required for institutional provisioning.';
  END IF;

  IF v_clean_code IS NULL OR length(v_clean_code) < 2 THEN
    RAISE EXCEPTION 'School code must be at least 2 characters.';
  END IF;

  INSERT INTO public.schools (
    code, name, phone, address, status, subscription_status, subscription_tier, subscription_expires_at, institution_mode, created_at
  )
  VALUES (
    v_clean_code, TRIM(p_name), TRIM(p_admin_phone), TRIM(p_address), 'active', 'active', p_tier, v_expires_at, p_mode, now()
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

  INSERT INTO public.school_licenses (
    school_id, school_code, license_key, tier, status, starts_at, expires_at, updated_at
  )
  VALUES (
    v_school_id, v_clean_code, v_license_key, p_tier, 'active', now(), v_expires_at, now()
  )
  ON CONFLICT (license_key) DO UPDATE
  SET status = 'active', expires_at = v_expires_at, updated_at = now();

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

-- NOTE: public.payment_orders is PRESERVED to protect transaction records and payment history.
-- We do NOT execute DROP TABLE on payment_orders.

-- ------------------------------------------------------------------------------
-- 2. ROLLBACK MIGRATION 22 (Phase 2 Security & RLS Hardening)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  RAISE NOTICE 'Reverting Migration 22 Phase 2 RPCs and triggers...';
END $$;

-- Drop Phase 2 Maker-Checker RPCs
DROP FUNCTION IF EXISTS public.request_fee_reversal(uuid, numeric, text);
DROP FUNCTION IF EXISTS public.approve_fee_reversal(uuid, text);
DROP FUNCTION IF EXISTS public.reject_fee_reversal(uuid, text);

-- Drop profile privileged columns protection trigger
DROP TRIGGER IF EXISTS trg_protect_profile_privileged_columns ON public.profiles;
DROP FUNCTION IF EXISTS public.protect_profile_privileged_columns();

-- PDF queue claim: PRESERVE TENANT ISOLATION (Do not restore insecure unscoped function)
CREATE OR REPLACE FUNCTION public.claim_next_pdf_job(p_school_id text)
RETURNS SETOF public.pdf_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text := COALESCE(auth.role(), 'none');
  v_current_tenant text := public.get_current_tenant_id();
  v_effective_school text;
BEGIN
  IF v_caller_role = 'service_role' THEN
    v_effective_school := p_school_id;
  ELSE
    IF v_current_tenant IS NULL OR v_current_tenant = '' THEN
      RAISE EXCEPTION 'Unauthenticated or unassociated tenant context.';
    END IF;

    IF p_school_id IS NOT NULL AND UPPER(TRIM(p_school_id)) != UPPER(TRIM(v_current_tenant)) THEN
      RAISE EXCEPTION 'Cross-tenant access violation: Cannot claim PDF jobs for institution % from tenant %', p_school_id, v_current_tenant;
    END IF;

    v_effective_school := v_current_tenant;
  END IF;

  RETURN QUERY
  UPDATE public.pdf_jobs
  SET status = 'Processing',
      attempts = attempts + 1,
      locked_until = now() + interval '2 minutes'
  WHERE id = (
    SELECT id
    FROM public.pdf_jobs
    WHERE school_id::text = v_effective_school
      AND status = 'Queued'
      AND (locked_until IS NULL OR locked_until < now())
      AND attempts < 3
    ORDER BY created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  RETURNING *;
END;
$$;

-- Secure schools policy: tenant-scoped for authenticated users (DO NOT restore known-insecure USING (true) or blanket anon access)
DROP POLICY IF EXISTS "schools_canonical_select" ON public.schools;
CREATE POLICY "schools_canonical_select"
  ON public.schools FOR SELECT TO authenticated
  USING (
    id = public.get_current_tenant_uuid()
    OR code = public.get_current_tenant_code()
  );

-- ------------------------------------------------------------------------------
-- 3. ROLLBACK MIGRATION 21 (Security & Financial Hardening)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  RAISE NOTICE 'Reverting Migration 21 financial functions and audit triggers...';
END $$;

-- Drop audit triggers attached to tables
DROP TRIGGER IF EXISTS trg_audit_fee_ledger ON public.fee_ledger;
DROP TRIGGER IF EXISTS trg_audit_fee_reversal_requests ON public.fee_reversal_requests;
DROP TRIGGER IF EXISTS trg_audit_profiles ON public.profiles;

-- NOTE: public.fee_reversal_requests and public.audit_logs are PRESERVED
-- We do NOT execute DROP TABLE on fee_reversal_requests or audit_logs.

-- Drop reverse_fee_entry functions
DROP FUNCTION IF EXISTS public.reverse_fee_entry(uuid, text, text, text);

-- ------------------------------------------------------------------------------
-- POST-ROLLBACK VERIFICATION
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_ledger_count int;
  v_audit_count int;
BEGIN
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'STARTING POST-ROLLBACK VERIFICATION';
  RAISE NOTICE '====================================================================';

  SELECT count(*) INTO v_ledger_count FROM public.fee_ledger;
  RAISE NOTICE 'VERIFIED: public.fee_ledger intact with % records.', v_ledger_count;

  SELECT count(*) INTO v_audit_count FROM public.audit_logs;
  RAISE NOTICE 'VERIFIED: public.audit_logs intact with % records.', v_audit_count;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'schools' AND policyname = 'schools_canonical_select'
  ) THEN
    RAISE EXCEPTION 'POST-ROLLBACK SAFETY FAILURE: schools_canonical_select policy missing!';
  END IF;

  RAISE NOTICE 'SUCCESS: All post-rollback verifications passed. Database state safe and consistent.';
END $$;

COMMIT;
