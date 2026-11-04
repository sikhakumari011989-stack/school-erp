-- ==============================================================================
-- ACADEMIC OS — PHASE 2: COMPREHENSIVE STAGING DATABASE VERIFICATION SUITE
-- File: tests/staging-database-verification.sql
-- Purpose: Rigorous PostgreSQL-level validation of Tenant Isolation,
--          Maker-Checker Fee Reversals, Security Definer Revocations,
--          and Permissive RLS Policy Deconfliction.
-- ==============================================================================

\set ON_ERROR_STOP on

BEGIN;

RAISE NOTICE '====================================================================';
RAISE NOTICE 'STAGE 1: VERIFYING MASTER PROVISIONING PERMISSIONS REVOCATION';
RAISE NOTICE '====================================================================';

-- Verify EXECUTE is revoked from anon and authenticated on master provisioning RPCs
DO $$
DECLARE
  v_anon_count int;
  v_auth_count int;
BEGIN
  SELECT count(*) INTO v_anon_count
  FROM information_schema.routine_privileges
  WHERE routine_name IN ('provision_institutional_school', 'set_school_license_status', 'get_master_schools_roster')
    AND grantee = 'anon';

  IF v_anon_count > 0 THEN
    RAISE EXCEPTION 'SECURITY FAILURE: Master provisioning RPCs are still executable by anon!';
  END IF;

  SELECT count(*) INTO v_auth_count
  FROM information_schema.routine_privileges
  WHERE routine_name IN ('provision_institutional_school', 'set_school_license_status', 'get_master_schools_roster')
    AND grantee = 'authenticated';

  IF v_auth_count > 0 THEN
    RAISE EXCEPTION 'SECURITY FAILURE: Master provisioning RPCs are still executable by authenticated!';
  END IF;

  RAISE NOTICE 'SUCCESS: Master provisioning RPCs are strictly isolated to service_role.';
END $$;


RAISE NOTICE '====================================================================';
RAISE NOTICE 'STAGE 2: SETUP TEST FIXTURES (SCHOOL-ALPHA & SCHOOL-BETA)';
RAISE NOTICE '====================================================================';

-- Create isolated test schools
INSERT INTO public.schools (id, school_id, name, status, license_plan, max_students)
VALUES 
  ('a0000000-0000-0000-0000-000000000001', 'SCHOOL-ALPHA', 'Alpha International Academy', 'active', 'enterprise', 1000),
  ('b0000000-0000-0000-0000-000000000002', 'SCHOOL-BETA', 'Beta Public Grammar School', 'active', 'enterprise', 1000)
ON CONFLICT (school_id) DO UPDATE SET status = 'active';

-- Create test profiles
-- 1. Alpha Accountant (Maker)
INSERT INTO public.profiles (id, school_id, full_name, email, role, is_active)
VALUES ('00000000-0000-0000-0000-000000000001', 'SCHOOL-ALPHA', 'Ramesh Accountant', 'ramesh@alpha.edu', 'accountant', true)
ON CONFLICT (id) DO UPDATE SET is_active = true, role = 'accountant', school_id = 'SCHOOL-ALPHA';

-- 2. Alpha Principal (Checker)
INSERT INTO public.profiles (id, school_id, full_name, email, role, is_active)
VALUES ('00000000-0000-0000-0000-000000000002', 'SCHOOL-ALPHA', 'Dr. Sharma Principal', 'sharma@alpha.edu', 'principal', true)
ON CONFLICT (id) DO UPDATE SET is_active = true, role = 'principal', school_id = 'SCHOOL-ALPHA';

-- 3. Beta Principal (Cross-Tenant Checker)
INSERT INTO public.profiles (id, school_id, full_name, email, role, is_active)
VALUES ('00000000-0000-0000-0000-000000000003', 'SCHOOL-BETA', 'Dr. Verma Beta Principal', 'verma@beta.edu', 'principal', true)
ON CONFLICT (id) DO UPDATE SET is_active = true, role = 'principal', school_id = 'SCHOOL-BETA';

-- 4. Alpha Student
INSERT INTO public.profiles (id, school_id, full_name, email, role, is_active)
VALUES ('00000000-0000-0000-0000-000000000004', 'SCHOOL-ALPHA', 'Aarav Student', 'aarav@alpha.edu', 'student', true)
ON CONFLICT (id) DO UPDATE SET is_active = true, role = 'student', school_id = 'SCHOOL-ALPHA';

-- Seed original fee ledger entry for SCHOOL-ALPHA
INSERT INTO public.fee_ledger (
  id, school_id, student_id, student_name, class_name, roll_number,
  fee_component, amount, payment_mode, transaction_reference,
  status, is_reversal, entry_timestamp
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'SCHOOL-ALPHA',
  '00000000-0000-0000-0000-000000000004',
  'Aarav Student',
  'Class 10-A',
  '101',
  'Term 1 Tuition Fee',
  15000.00,
  'ONLINE',
  'TXN-ALPHA-1001',
  'completed',
  false,
  now()
)
ON CONFLICT (id) DO NOTHING;


RAISE NOTICE '====================================================================';
RAISE NOTICE 'STAGE 3: VERIFYING DATABASE-LEVEL MAKER-CHECKER REVERSALS';
RAISE NOTICE '====================================================================';

-- Test 3.1: Alpha Accountant creates reversal request
DO $$
DECLARE
  v_req_id uuid;
BEGIN
  -- Simulate session context for Alpha Accountant
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  PERFORM set_config('request.jwt.claim.school_id', 'SCHOOL-ALPHA', true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  v_req_id := public.request_fee_reversal(
    '11111111-1111-1111-1111-111111111111',
    15000.00,
    'Duplicate payment charge via gateway'
  );

  IF v_req_id IS NULL THEN
    RAISE EXCEPTION 'FAILURE: request_fee_reversal returned NULL';
  END IF;

  RAISE NOTICE 'SUCCESS: Fee reversal request % created by Alpha Accountant.', v_req_id;
END $$;


-- Test 3.2: Maker-Checker Self-Approval Prevention
-- Alpha Accountant attempts to approve their own request -> MUST FAIL with P0001
DO $$
DECLARE
  v_req_id uuid;
  v_failed boolean := false;
BEGIN
  -- Get active request
  SELECT id INTO v_req_id FROM public.fee_reversal_requests 
  WHERE entry_id = '11111111-1111-1111-1111-111111111111' AND status = 'pending_approval' LIMIT 1;

  -- Alpha Accountant session
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  PERFORM set_config('request.jwt.claim.school_id', 'SCHOOL-ALPHA', true);

  BEGIN
    PERFORM public.approve_fee_reversal(v_req_id, 'Self approval attempt');
  EXCEPTION
    WHEN OTHERS THEN
      v_failed := true;
      RAISE NOTICE 'EXPECTED SUCCESS: Maker self-approval blocked by PostgreSQL constraint: %', SQLERRM;
  END;

  IF NOT v_failed THEN
    RAISE EXCEPTION 'CRITICAL SECURITY FAILURE: Accountant was able to approve their own reversal!';
  END IF;
END $$;


-- Test 3.3: Cross-Tenant Approval Prevention
-- Beta Principal attempts to approve Alpha's reversal request -> MUST FAIL
DO $$
DECLARE
  v_req_id uuid;
  v_failed boolean := false;
BEGIN
  SELECT id INTO v_req_id FROM public.fee_reversal_requests 
  WHERE entry_id = '11111111-1111-1111-1111-111111111111' AND status = 'pending_approval' LIMIT 1;

  -- Beta Principal session
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', true);
  PERFORM set_config('request.jwt.claim.school_id', 'SCHOOL-BETA', true);

  BEGIN
    PERFORM public.approve_fee_reversal(v_req_id, 'Cross-tenant approval attempt');
  EXCEPTION
    WHEN OTHERS THEN
      v_failed := true;
      RAISE NOTICE 'EXPECTED SUCCESS: Cross-tenant approval blocked by PostgreSQL constraint: %', SQLERRM;
  END;

  IF NOT v_failed THEN
    RAISE EXCEPTION 'CRITICAL SECURITY FAILURE: Beta Principal approved Alpha reversal across tenants!';
  END IF;
END $$;


-- Test 3.4: Legitimate Executive Approval by Alpha Principal
DO $$
DECLARE
  v_req_id uuid;
  v_res jsonb;
  v_orig_status text;
  v_credit_count int;
BEGIN
  SELECT id INTO v_req_id FROM public.fee_reversal_requests 
  WHERE entry_id = '11111111-1111-1111-1111-111111111111' AND status = 'pending_approval' LIMIT 1;

  -- Alpha Principal session
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
  PERFORM set_config('request.jwt.claim.school_id', 'SCHOOL-ALPHA', true);

  v_res := public.approve_fee_reversal(v_req_id, 'Approved by Principal Dr. Sharma');

  IF (v_res->>'success')::boolean != true THEN
    RAISE EXCEPTION 'FAILURE: Legitimate approval failed: %', v_res;
  END IF;

  -- Verify original entry is now reversed
  SELECT status INTO v_orig_status FROM public.fee_ledger WHERE id = '11111111-1111-1111-1111-111111111111';
  IF v_orig_status != 'reversed' THEN
    RAISE EXCEPTION 'FAILURE: Original ledger entry status is %, expected reversed', v_orig_status;
  END IF;

  -- Verify credit note exists with negative amount
  SELECT count(*) INTO v_credit_count FROM public.fee_ledger 
  WHERE school_id = 'SCHOOL-ALPHA' AND is_reversal = true AND amount = -15000.00;

  IF v_credit_count = 0 THEN
    RAISE EXCEPTION 'FAILURE: Offsetting credit note entry was not generated in fee_ledger!';
  END IF;

  RAISE NOTICE 'SUCCESS: Fee reversal approved legitimately with credit note generated.';
END $$;


RAISE NOTICE '====================================================================';
RAISE NOTICE 'STAGE 4: VERIFYING PDF QUEUE TENANT ISOLATION';
RAISE NOTICE '====================================================================';

-- Seed a PDF job for Beta School
INSERT INTO public.pdf_jobs (
  id, school_id, job_type, payload, status, created_at
)
VALUES (
  '99999999-9999-9999-9999-999999999999',
  'SCHOOL-BETA',
  'STUDENT_REPORT_CARD',
  '{"student_id": "STU-BETA-01"}'::jsonb,
  'pending',
  now()
)
ON CONFLICT (id) DO NOTHING;

-- Alpha Principal tries to claim Beta School's PDF job -> MUST FAIL OR RETURN NULL
DO $$
DECLARE
  v_claimed jsonb;
  v_failed boolean := false;
BEGIN
  -- Alpha Principal session
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
  PERFORM set_config('request.jwt.claim.school_id', 'SCHOOL-ALPHA', true);

  BEGIN
    v_claimed := public.claim_next_pdf_job('SCHOOL-BETA');
  EXCEPTION
    WHEN OTHERS THEN
      v_failed := true;
      RAISE NOTICE 'EXPECTED SUCCESS: Cross-tenant claim_next_pdf_job blocked with error: %', SQLERRM;
  END;

  IF NOT v_failed AND v_claimed IS NOT NULL THEN
    RAISE EXCEPTION 'CRITICAL SECURITY FAILURE: Alpha Principal claimed Beta School PDF job: %', v_claimed;
  END IF;

  RAISE NOTICE 'SUCCESS: PDF queue tenant isolation verified.';
END $$;


RAISE NOTICE '====================================================================';
RAISE NOTICE 'STAGE 5: VERIFYING PERMISSIVE RLS POLICY DECONFLICTION';
RAISE NOTICE '====================================================================';

-- Ensure legacy permissive policy `test_scores_select` from 05 is gone
DO $$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count
  FROM pg_policies
  WHERE tablename = 'test_scores' AND policyname = 'test_scores_select';

  IF v_count > 0 THEN
    RAISE EXCEPTION 'CRITICAL SECURITY FAILURE: Legacy permissive test_scores_select policy still exists! OR-leakage active.';
  END IF;

  RAISE NOTICE 'SUCCESS: Legacy leaky permissive policies cleanly dropped.';
END $$;

RAISE NOTICE '====================================================================';
RAISE NOTICE 'ALL 5 STAGING VERIFICATION STAGES PASSED WITH ZERO VIOLATIONS!';
RAISE NOTICE '====================================================================';

-- Roll back test transaction to leave staging database pristine
ROLLBACK;

