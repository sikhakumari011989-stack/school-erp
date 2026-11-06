-- ==============================================================================
-- ACADEMIC OS — COMPREHENSIVE STAGING DATABASE VERIFICATION SUITE (MVP FINAL)
-- File: tests/staging-database-verification.sql
-- Compatible with: Supabase SQL Editor, PostgreSQL 14+, psql
-- Schema Standards:
--   - schools: id is UUID, code is TEXT
--   - profiles: id is UUID (auth.users.id), school_id is UUID (fk schools.id)
--   - fee_ledger: id is UUID, school_id is TEXT (school code), original_entry_id is TEXT
--   - fee_reversal_requests: id is UUID, school_id is TEXT, entry_id is UUID
--   - payment_orders: id is UUID, school_id is TEXT, student_id is TEXT
--   - attendance: school_id is UUID (fk schools.id)
--   - timetable: school_id is UUID (fk schools.id)
--   - students: school_id is TEXT
--   - audit_logs: legacy columns (table_name, record_id, action, actor_id, old_payload, new_payload, created_at)
--
-- Features Tested (12 Essential MVP Stages + Stage 0 Preflight):
-- 0. Master Provisioning RPC Security Definer Revocations (service_role only)
-- 1. Two-School Cross-Tenant Data Isolation (School Alpha vs School Beta)
-- 2. Six Canonical Roles Authorization (PRIN, HOD, ACC, TCH, STU, NTS)
-- 3. Profile Privilege Escalation & Cross-Tenant Modification Prevention (INSERT & UPDATE)
-- 4. Student Creation and School-Scoped Retrieval
-- 5. Attendance Creation and Retrieval (UUID school_id)
-- 6. Fee Recording, Outstanding Dues & Receipt Generation
-- 7. Database-Level Maker-Checker Reversals & Self-Approval Prevention
-- 8. Marks and Results Workflow (Draft vs Published, Student Isolation)
-- 9. Timetable Access & Class Isolation (UUID school_id)
-- 10. Automatic Audit Trigger Attachment, Persistence & Immutability Verification
-- 11. PDF Queue Tenant Lease Isolation
-- 12. Payment Order Tenant & Student Isolation (Preventing raw payload leaks)
--
-- SAFETY & ISOLATION GUARANTEES:
-- 1. All test fixtures use dynamically generated UUIDs and unique test codes (TEST-ALPHA-...)
--    to guarantee zero collision with real institutions.
-- 2. All operations run inside an explicit transaction block and end with ROLLBACK.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- STAGE 0: VERIFY MASTER PROVISIONING RPC PERMISSIONS REVOCATION
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_anon_count int;
  v_auth_count int;
  v_funcs text[] := ARRAY[
    'provision_institutional_school',
    'set_school_license_status',
    'get_master_schools_roster',
    'renew_school_subscription'
  ];
  v_fn text;
BEGIN
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'STAGE 0: VERIFYING MASTER PROVISIONING PERMISSIONS REVOCATION';
  RAISE NOTICE '====================================================================';

  FOREACH v_fn IN ARRAY v_funcs LOOP
    SELECT count(*) INTO v_anon_count
    FROM information_schema.routine_privileges
    WHERE routine_name = v_fn AND grantee = 'anon';

    IF v_anon_count > 0 THEN
      RAISE EXCEPTION 'SECURITY FAILURE: Function % is still executable by anon!', v_fn;
    END IF;

    SELECT count(*) INTO v_auth_count
    FROM information_schema.routine_privileges
    WHERE routine_name = v_fn AND grantee = 'authenticated';

    IF v_auth_count > 0 THEN
      RAISE EXCEPTION 'SECURITY FAILURE: Function % is still executable by authenticated!', v_fn;
    END IF;
  END LOOP;

  RAISE NOTICE 'SUCCESS: Stage 0 Passed — All Master Provisioning RPCs are strictly isolated to service_role.';
END $$;


-- ------------------------------------------------------------------------------
-- SETUP TEST FIXTURES (DYNAMIC UNIQUE NAMESPACE & ALL 6 CANONICAL ROLES)
-- ------------------------------------------------------------------------------
-- Store test fixture IDs in a temporary table for safe session-scoped reference
CREATE TEMP TABLE tmp_test_fixture_context (
  key text PRIMARY KEY,
  val_uuid uuid,
  val_text text
) ON COMMIT DROP;

GRANT ALL ON tmp_test_fixture_context TO authenticated;

DO $$
DECLARE
  v_suffix text := substr(md5(random()::text), 1, 6);
  v_school_a_id uuid := gen_random_uuid();
  v_school_b_id uuid := gen_random_uuid();
  v_code_a text := 'TEST-ALPHA-' || v_suffix;
  v_code_b text := 'TEST-BETA-' || v_suffix;

  v_acc_id uuid := gen_random_uuid();
  v_prin_id uuid := gen_random_uuid();
  v_hod_id uuid := gen_random_uuid();
  v_tch_id uuid := gen_random_uuid();
  v_stu_id uuid := gen_random_uuid();
  v_nts_id uuid := gen_random_uuid();

  v_beta_prin_id uuid := gen_random_uuid();
  v_beta_stu_id uuid := gen_random_uuid();

  v_fee_alpha_id uuid := gen_random_uuid();
  v_fee_beta_id uuid := gen_random_uuid();
  v_order_alpha text := 'order_alpha_' || v_suffix;
  v_order_beta text := 'order_beta_' || v_suffix;
BEGIN
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'SETUP: INITIALIZING ISOLATED TEST FIXTURES (Suffix: %)', v_suffix;
  RAISE NOTICE '====================================================================';

  -- Persist context in temp table
  INSERT INTO tmp_test_fixture_context (key, val_uuid, val_text) VALUES
    ('school_a_id', v_school_a_id, NULL),
    ('school_b_id', v_school_b_id, NULL),
    ('code_a', NULL, v_code_a),
    ('code_b', NULL, v_code_b),
    ('acc_id', v_acc_id, NULL),
    ('prin_id', v_prin_id, NULL),
    ('hod_id', v_hod_id, NULL),
    ('tch_id', v_tch_id, NULL),
    ('stu_id', v_stu_id, NULL),
    ('nts_id', v_nts_id, NULL),
    ('beta_prin_id', v_beta_prin_id, NULL),
    ('beta_stu_id', v_beta_stu_id, NULL),
    ('fee_alpha_id', v_fee_alpha_id, NULL),
    ('fee_beta_id', v_fee_beta_id, NULL),
    ('order_alpha', NULL, v_order_alpha),
    ('order_beta', NULL, v_order_beta);

  -- 1. Create two isolated test schools (schools.id is UUID, schools.code is TEXT)
  INSERT INTO public.schools (id, code, name, status, subscription_tier, subscription_status)
  VALUES 
    (v_school_a_id, v_code_a, 'Alpha Test Academy ' || v_suffix, 'active', 'enterprise', 'active'),
    (v_school_b_id, v_code_b, 'Beta Test Grammar ' || v_suffix, 'active', 'enterprise', 'active');

  -- 2. Seed 6 Canonical Roles for Alpha (profiles.school_id is UUID)
  INSERT INTO public.profiles (id, school_id, full_name, email, role, role_code, is_active, status)
  VALUES
    (v_acc_id, v_school_a_id, 'Ramesh Accountant', 'acc.' || v_suffix || '@alpha.edu', 'accountant', 'ACC', true, 'active'),
    (v_prin_id, v_school_a_id, 'Dr. Sharma Principal', 'prin.' || v_suffix || '@alpha.edu', 'principal', 'PRIN', true, 'active'),
    (v_hod_id, v_school_a_id, 'Anand Trustee', 'trustee.' || v_suffix || '@alpha.edu', 'trustee', 'HOD', true, 'active'),
    (v_tch_id, v_school_a_id, 'Priya Teacher', 'tch.' || v_suffix || '@alpha.edu', 'teacher', 'TCH', true, 'active'),
    (v_stu_id, v_school_a_id, 'Aarav Student', 'stu.' || v_suffix || '@alpha.edu', 'student', 'STU', true, 'active'),
    (v_nts_id, v_school_a_id, 'Sanjay Staff', 'nts.' || v_suffix || '@alpha.edu', 'staff', 'NTS', true, 'active'),
    (v_beta_prin_id, v_school_b_id, 'Dr. Verma Beta Principal', 'prin.' || v_suffix || '@beta.edu', 'principal', 'PRIN', true, 'active'),
    (v_beta_stu_id, v_school_b_id, 'Kabir Beta Student', 'stu.' || v_suffix || '@beta.edu', 'student', 'STU', true, 'active');

  -- 3. Seed Students Table (students.school_id is TEXT)
  INSERT INTO public.students (id, school_id, name, roll_number, phone)
  VALUES 
    (v_stu_id, v_code_a, 'Aarav Student', '101', '+919800000001'),
    (v_beta_stu_id, v_code_b, 'Kabir Beta Student', '201', '+919800000002');

  -- 4. Seed Attendance Table (attendance.school_id is UUID fk to schools.id)
  INSERT INTO public.attendance (school_id, date, records)
  VALUES 
    (v_school_a_id, CURRENT_DATE, jsonb_build_array(jsonb_build_object('student_id', v_stu_id, 'status', 'present'))),
    (v_school_b_id, CURRENT_DATE, jsonb_build_array(jsonb_build_object('student_id', v_beta_stu_id, 'status', 'present')));

  -- 5. Seed Timetable Table (timetable.school_id is UUID fk to schools.id)
  INSERT INTO public.timetable (school_id, day, period, subject, teacher_name)
  VALUES 
    (v_school_a_id, 'Monday', 'Period 1', 'Mathematics', 'Priya Teacher'),
    (v_school_b_id, 'Monday', 'Period 1', 'Physics', 'Dr. Verma');

  -- 6. Seed fee_ledger Table (fee_ledger.id is UUID, fee_ledger.school_id is TEXT)
  -- Uses ONLY verified schema columns: id, school_id, student_name, class_name, amount, payment_mode, razorpay_payment_id, status, created_at
  INSERT INTO public.fee_ledger (
    id, school_id, student_name, class_name,
    amount, payment_mode, razorpay_payment_id, status, created_at
  )
  VALUES 
    (v_fee_alpha_id, v_code_a, 'Aarav Student', 'Class 10-A', 15000.00, 'ONLINE', 'pay_alpha_' || v_suffix, 'paid', now()),
    (v_fee_beta_id, v_code_b, 'Kabir Beta Student', 'Class 10-B', 18000.00, 'ONLINE', 'pay_beta_' || v_suffix, 'paid', now());

  -- 7. Seed Payment Orders (payment_orders.school_id is TEXT)
  INSERT INTO public.payment_orders (
    order_id, school_id, student_id, student_name, amount, status, raw_payload
  )
  VALUES
    (v_order_alpha, v_code_a, v_stu_id::text, 'Aarav Student', 15000.00, 'created', '{"secret":"alpha_secret"}'::jsonb),
    (v_order_beta, v_code_b, v_beta_stu_id::text, 'Kabir Beta Student', 18000.00, 'created', '{"secret":"beta_secret"}'::jsonb);

  RAISE NOTICE 'SUCCESS: Test fixtures initialized for both institutions.';
END $$;


-- ------------------------------------------------------------------------------
-- STAGE 1: TWO-SCHOOL CROSS-TENANT DATA ISOLATION (AUTHENTICATED ROLE)
-- ------------------------------------------------------------------------------
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_school_a_id uuid;
  v_code_a text;
  v_code_b text;
  v_prin_id uuid;
  v_visible_beta_fees int;
  v_visible_beta_profiles int;
BEGIN
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'STAGE 1: VERIFYING TWO-SCHOOL CROSS-TENANT DATA ISOLATION (ROLE: %)', current_user;
  RAISE NOTICE '====================================================================';

  SELECT val_uuid INTO v_school_a_id FROM tmp_test_fixture_context WHERE key = 'school_a_id';
  SELECT val_text INTO v_code_a FROM tmp_test_fixture_context WHERE key = 'code_a';
  SELECT val_text INTO v_code_b FROM tmp_test_fixture_context WHERE key = 'code_b';
  SELECT val_uuid INTO v_prin_id FROM tmp_test_fixture_context WHERE key = 'prin_id';

  -- Simulate Alpha Principal JWT Claims
  PERFORM set_config('request.jwt.claim.sub', v_prin_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', v_prin_id::text,
    'role', 'authenticated',
    'app_metadata', jsonb_build_object(
      'school_id', v_school_a_id::text,
      'school_uuid', v_school_a_id::text,
      'school_code', v_code_a,
      'role', 'PRIN'
    )
  )::text, true);

  -- 1.1 Query fee_ledger for Beta records under Alpha Principal identity
  SELECT count(*) INTO v_visible_beta_fees
  FROM public.fee_ledger
  WHERE school_id = v_code_b;

  IF v_visible_beta_fees > 0 THEN
    RAISE EXCEPTION 'CRITICAL SECURITY FAILURE: Alpha Principal can read Beta fee_ledger records! Count: %', v_visible_beta_fees;
  END IF;

  -- 1.2 Query profiles for Beta records under Alpha Principal identity
  SELECT count(*) INTO v_visible_beta_profiles
  FROM public.profiles
  WHERE school_id = (SELECT val_uuid FROM tmp_test_fixture_context WHERE key = 'school_b_id');

  IF v_visible_beta_profiles > 0 THEN
    RAISE EXCEPTION 'CRITICAL SECURITY FAILURE: Alpha Principal can read Beta profiles! Count: %', v_visible_beta_profiles;
  END IF;

  RAISE NOTICE 'SUCCESS: Stage 1 Passed — Cross-tenant access strictly blocked for fee ledgers and profiles.';
END $$;

RESET ROLE;


-- ------------------------------------------------------------------------------
-- STAGE 2: SIX CANONICAL ROLES AUTHORIZATION
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_role text;
  v_roles text[] := ARRAY['PRIN', 'HOD', 'ACC', 'TCH', 'STU', 'NTS'];
BEGIN
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'STAGE 2: VERIFYING SIX CANONICAL ROLES AUTHORIZATION';
  RAISE NOTICE '====================================================================';

  FOREACH v_role IN ARRAY v_roles LOOP
    PERFORM set_config('request.jwt.claims', jsonb_build_object(
      'sub', gen_random_uuid()::text,
      'role', 'authenticated',
      'app_metadata', jsonb_build_object(
        'school_code', 'TEST-ALPHA',
        'role', v_role
      )
    )::text, true);

    IF public.get_auth_role() != v_role THEN
      RAISE EXCEPTION 'RBAC FAILURE: get_auth_role() failed to normalize canonical role %', v_role;
    END IF;
  END LOOP;

  RAISE NOTICE 'SUCCESS: Stage 2 Passed — All 6 canonical roles (PRIN, HOD, ACC, TCH, STU, NTS) verified.';
END $$;


-- ------------------------------------------------------------------------------
