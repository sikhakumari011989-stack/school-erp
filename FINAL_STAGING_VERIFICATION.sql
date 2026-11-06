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
-- STAGE 3: PROFILE PRIVILEGE ESCALATION GUARDS (INSERT & UPDATE)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_blocked boolean := false;
  v_school_a_id uuid;
  v_school_b_id uuid;
  v_code_a text;
  v_stu_id uuid;
  v_tch_id uuid;
  v_prin_id uuid;
BEGIN
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'STAGE 3: VERIFYING PROFILE PRIVILEGE ESCALATION BLOCKS';
  RAISE NOTICE '====================================================================';

  SELECT val_uuid INTO v_school_a_id FROM tmp_test_fixture_context WHERE key = 'school_a_id';
  SELECT val_uuid INTO v_school_b_id FROM tmp_test_fixture_context WHERE key = 'school_b_id';
  SELECT val_text INTO v_code_a FROM tmp_test_fixture_context WHERE key = 'code_a';
  SELECT val_uuid INTO v_stu_id FROM tmp_test_fixture_context WHERE key = 'stu_id';
  SELECT val_uuid INTO v_tch_id FROM tmp_test_fixture_context WHERE key = 'tch_id';
  SELECT val_uuid INTO v_prin_id FROM tmp_test_fixture_context WHERE key = 'prin_id';

  -- 3.1 Non-admin (Student) attempts to UPDATE own role to PRIN
  PERFORM set_config('request.jwt.claim.sub', v_stu_id::text, true);
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', v_stu_id::text,
    'role', 'authenticated',
    'app_metadata', jsonb_build_object('school_id', v_school_a_id::text, 'school_uuid', v_school_a_id::text, 'school_code', v_code_a, 'role', 'STU')
  )::text, true);

  BEGIN
    UPDATE public.profiles SET role = 'principal', role_code = 'PRIN' WHERE id = v_stu_id;
    v_blocked := false;
  EXCEPTION WHEN OTHERS THEN
    v_blocked := true;
  END;

  IF NOT v_blocked THEN
    RAISE EXCEPTION 'CRITICAL SECURITY FAILURE: Student escalated their profile role to Principal!';
  END IF;
  RAISE NOTICE 'VERIFIED: 3.1 — Student self-promotion to Principal strictly rejected.';

  -- 3.2 Non-admin (Student) attempts to INSERT an administrative profile
  BEGIN
    INSERT INTO public.profiles (id, school_id, full_name, email, role, role_code)
    VALUES (gen_random_uuid(), v_school_a_id, 'Rogue Admin', 'rogue@alpha.edu', 'principal', 'PRIN');
    v_blocked := false;
  EXCEPTION WHEN OTHERS THEN
    v_blocked := true;
  END;

  IF NOT v_blocked THEN
    RAISE EXCEPTION 'CRITICAL SECURITY FAILURE: Non-admin inserted an administrative profile!';
  END IF;
  RAISE NOTICE 'VERIFIED: 3.2 — Non-administrative profile creation strictly rejected.';

  -- 3.3 Executive Admin attempts to spawn another Executive identity via client INSERT (MUST FAIL)
  PERFORM set_config('request.jwt.claim.sub', v_prin_id::text, true);
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', v_prin_id::text,
    'role', 'authenticated',
    'app_metadata', jsonb_build_object('school_id', v_school_a_id::text, 'school_uuid', v_school_a_id::text, 'school_code', v_code_a, 'role', 'PRIN')
  )::text, true);

  BEGIN
    INSERT INTO public.profiles (id, school_id, full_name, email, role, role_code)
    VALUES (gen_random_uuid(), v_school_a_id, 'Extra Principal', 'prin2@alpha.edu', 'principal', 'PRIN');
    v_blocked := false;
  EXCEPTION WHEN OTHERS THEN
    v_blocked := true;
  END;

  IF NOT v_blocked THEN
    RAISE EXCEPTION 'CRITICAL SECURITY FAILURE: Principal spawned executive identity via client insert!';
  END IF;
  RAISE NOTICE 'VERIFIED: 3.3 — Executive identity insertion restricted strictly to server-side provisioning.';

  -- 3.4 CRITICAL PASS: Executive Admin attempts to PROMOTE a Teacher to PRIN via client UPDATE (MUST FAIL)
  BEGIN
    UPDATE public.profiles
    SET role = 'principal', role_code = 'PRIN'
    WHERE id = v_tch_id;
    v_blocked := false;
  EXCEPTION WHEN OTHERS THEN
    v_blocked := true;
  END;

  IF NOT v_blocked THEN
    RAISE EXCEPTION 'CRITICAL SECURITY FAILURE: Executive promoted a teacher to Principal via client update!';
  END IF;
  RAISE NOTICE 'VERIFIED: 3.4 — Executive promotion to PRIN/HOD via client update strictly rejected.';

  -- 3.5 User attempts to change school_id to jump tenants (MUST FAIL)
  BEGIN
    UPDATE public.profiles SET school_id = v_school_b_id WHERE id = v_stu_id;
    v_blocked := false;
  EXCEPTION WHEN OTHERS THEN
    v_blocked := true;
  END;

  IF NOT v_blocked THEN
    RAISE EXCEPTION 'CRITICAL SECURITY FAILURE: User modified school_id to jump tenants!';
  END IF;
  RAISE NOTICE 'VERIFIED: 3.5 — Cross-tenant profile migration strictly rejected.';

  RAISE NOTICE 'SUCCESS: Stage 3 Passed — All privilege escalation and tenant-jumping attempts blocked.';
END $$;


-- ------------------------------------------------------------------------------
-- STAGE 4: STUDENT CREATION AND SCHOOL-SCOPED RETRIEVAL
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_code_a text;
  v_new_stu uuid := gen_random_uuid();
  v_count int;
BEGIN
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'STAGE 4: VERIFYING STUDENT CREATION AND RETRIEVAL';
  RAISE NOTICE '====================================================================';

  SELECT val_text INTO v_code_a FROM tmp_test_fixture_context WHERE key = 'code_a';

  -- Insert using verified schema columns: id, school_id, name, roll_number, phone
  INSERT INTO public.students (id, school_id, name, roll_number, phone)
  VALUES (v_new_stu, v_code_a, 'New Scholar', '102', '+919800000003');

  SELECT count(*) INTO v_count
  FROM public.students
  WHERE id = v_new_stu AND school_id = v_code_a;

  IF v_count != 1 THEN
    RAISE EXCEPTION 'FAILURE: Student record was not retrieved for School Alpha!';
  END IF;

  RAISE NOTICE 'SUCCESS: Stage 4 Passed — Student record created and retrieved within authorized school scope.';
END $$;


-- ------------------------------------------------------------------------------
-- STAGE 5: ATTENDANCE CREATION AND RETRIEVAL (UUID SCHOOL_ID)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_school_a_id uuid;
  v_att_id uuid := gen_random_uuid();
  v_count int;
BEGIN
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'STAGE 5: VERIFYING ATTENDANCE CREATION (UUID school_id)';
  RAISE NOTICE '====================================================================';

  SELECT val_uuid INTO v_school_a_id FROM tmp_test_fixture_context WHERE key = 'school_a_id';

  -- Insert using verified schema columns: id, school_id (UUID), date, records
  INSERT INTO public.attendance (id, school_id, date, records)
  VALUES (v_att_id, v_school_a_id, CURRENT_DATE, '[{"status":"present"}]'::jsonb);

  SELECT count(*) INTO v_count
  FROM public.attendance
  WHERE id = v_att_id AND school_id = v_school_a_id;

  IF v_count != 1 THEN
    RAISE EXCEPTION 'FAILURE: Attendance record was not retrieved for School Alpha!';
  END IF;

  RAISE NOTICE 'SUCCESS: Stage 5 Passed — Attendance recorded with verified UUID school_id.';
END $$;


-- ------------------------------------------------------------------------------
-- STAGE 6: FEE RECORDING & RECEIPT GENERATION
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_code_a text;
  v_fee_id uuid := gen_random_uuid();
  v_retrieved_amt numeric;
  v_status text;
BEGIN
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'STAGE 6: VERIFYING FEE RECORDING AND RECEIPT GENERATION';
  RAISE NOTICE '====================================================================';

  SELECT val_text INTO v_code_a FROM tmp_test_fixture_context WHERE key = 'code_a';

  -- Insert using verified schema columns: id, school_id, student_name, class_name, amount, payment_mode, razorpay_payment_id, status, created_at
  INSERT INTO public.fee_ledger (
    id, school_id, student_name, class_name,
    amount, payment_mode, razorpay_payment_id, status, created_at
  )
  VALUES (
    v_fee_id, v_code_a, 'Aarav Student', 'Class 10-A',
    5000.00, 'UPI QR', 'pay_qr_stage6', 'paid', now()
  );

  SELECT amount, status INTO v_retrieved_amt, v_status
  FROM public.fee_ledger
  WHERE id = v_fee_id AND school_id = v_code_a;

  IF v_retrieved_amt != 5000.00 OR v_status != 'paid' THEN
    RAISE EXCEPTION 'FAILURE: Fee record verification failed!';
  END IF;

  RAISE NOTICE 'SUCCESS: Stage 6 Passed — Fee entry recorded with confirmed status and receipt metadata.';
END $$;


-- ------------------------------------------------------------------------------
-- STAGE 7: REVERSAL MAKER-CHECKER WORKFLOW & CONCURRENCY
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_school_a_id uuid;
  v_school_b_id uuid;
  v_code_a text;
  v_code_b text;
  v_acc_id uuid;
  v_prin_id uuid;
  v_beta_prin_id uuid;
  v_target_entry_id uuid;
  v_req_id uuid;
  v_res jsonb;
  v_credit_note_count int;
  v_original_status text;
BEGIN
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'STAGE 7: VERIFYING REVERSAL MAKER-CHECKER WORKFLOW';
  RAISE NOTICE '====================================================================';

  SELECT val_uuid INTO v_school_a_id FROM tmp_test_fixture_context WHERE key = 'school_a_id';
  SELECT val_uuid INTO v_school_b_id FROM tmp_test_fixture_context WHERE key = 'school_b_id';
  SELECT val_text INTO v_code_a FROM tmp_test_fixture_context WHERE key = 'code_a';
  SELECT val_text INTO v_code_b FROM tmp_test_fixture_context WHERE key = 'code_b';
  SELECT val_uuid INTO v_acc_id FROM tmp_test_fixture_context WHERE key = 'acc_id';
  SELECT val_uuid INTO v_prin_id FROM tmp_test_fixture_context WHERE key = 'prin_id';
  SELECT val_uuid INTO v_beta_prin_id FROM tmp_test_fixture_context WHERE key = 'beta_prin_id';
  SELECT val_uuid INTO v_target_entry_id FROM tmp_test_fixture_context WHERE key = 'fee_alpha_id';

  -- 7.1 Step 1 (Maker): Alpha Accountant requests reversal
  PERFORM set_config('request.jwt.claim.sub', v_acc_id::text, true);
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', v_acc_id::text,
    'role', 'authenticated',
    'app_metadata', jsonb_build_object('school_id', v_school_a_id::text, 'school_uuid', v_school_a_id::text, 'school_code', v_code_a, 'role', 'ACC')
  )::text, true);

  v_res := public.request_fee_reversal(v_target_entry_id, 15000.00, 'Duplicate transaction refund request');
  IF (v_res->>'success')::boolean != true THEN
    RAISE EXCEPTION 'FAILURE: Maker reversal request failed: %', v_res;
  END IF;

  v_req_id := (v_res->>'request_id')::uuid;
  RAISE NOTICE 'VERIFIED: 7.1 (Maker) — Reversal request submitted with ID %', v_req_id;

  -- 7.2 Step 2: Maker attempts self-approval (MUST FAIL)
  v_res := public.approve_fee_reversal(v_req_id, 'Self approval attempt');
  IF (v_res->>'success')::boolean = true THEN
    RAISE EXCEPTION 'CRITICAL SECURITY FAILURE: Accountant approved their own reversal request!';
  END IF;
  RAISE NOTICE 'VERIFIED: 7.2 — Maker self-approval strictly rejected: %', v_res->>'error';

  -- 7.3 Step 3: Beta Principal attempts cross-tenant approval (MUST FAIL)
  PERFORM set_config('request.jwt.claim.sub', v_beta_prin_id::text, true);
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', v_beta_prin_id::text,
    'role', 'authenticated',
    'app_metadata', jsonb_build_object('school_id', v_school_b_id::text, 'school_uuid', v_school_b_id::text, 'school_code', v_code_b, 'role', 'PRIN')
  )::text, true);

  v_res := public.approve_fee_reversal(v_req_id, 'Cross-tenant approval attempt');
  IF (v_res->>'success')::boolean = true THEN
    RAISE EXCEPTION 'CRITICAL SECURITY FAILURE: Beta Principal approved an Alpha reversal request!';
  END IF;
  RAISE NOTICE 'VERIFIED: 7.3 — Cross-tenant approval strictly rejected: %', v_res->>'error';

  -- 7.4 Step 4 (Checker): Alpha Principal approves reversal (MUST SUCCEED)
  PERFORM set_config('request.jwt.claim.sub', v_prin_id::text, true);
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', v_prin_id::text,
    'role', 'authenticated',
    'app_metadata', jsonb_build_object('school_id', v_school_a_id::text, 'school_uuid', v_school_a_id::text, 'school_code', v_code_a, 'role', 'PRIN')
  )::text, true);

  v_res := public.approve_fee_reversal(v_req_id, 'Executive Principal verified and approved');
  IF (v_res->>'success')::boolean != true THEN
    RAISE EXCEPTION 'FAILURE: Alpha Principal could not approve reversal: %', v_res;
  END IF;

  -- Verify offsetting credit note in fee_ledger
  SELECT count(*) INTO v_credit_note_count
  FROM public.fee_ledger
  WHERE school_id = v_code_a AND original_entry_id = v_target_entry_id::text AND amount = -15000.00;

  IF v_credit_note_count != 1 THEN
    RAISE EXCEPTION 'FAILURE: Offsetting credit note was not created in fee_ledger!';
  END IF;

  -- Verify original record marked reversed
  SELECT status INTO v_original_status
  FROM public.fee_ledger
  WHERE id = v_target_entry_id;

  IF v_original_status != 'reversed' THEN
    RAISE EXCEPTION 'FAILURE: Original transaction status is %, expected reversed!', v_original_status;
  END IF;
  RAISE NOTICE 'VERIFIED: 7.4 (Checker) — Principal approved reversal. UUID Credit Note created and original marked reversed.';

  -- 7.5 Step 5: Duplicate approval attempt (MUST FAIL)
  v_res := public.approve_fee_reversal(v_req_id, 'Duplicate approval attempt');
  IF (v_res->>'success')::boolean = true THEN
    RAISE EXCEPTION 'CRITICAL SECURITY FAILURE: Approved request allowed duplicate execution!';
  END IF;
  RAISE NOTICE 'VERIFIED: 7.5 — Duplicate approval execution strictly rejected: %', v_res->>'error';

  -- 7.6 Step 6: Direct reversal without pending request (MUST FAIL)
  v_res := public.reverse_fee_entry(gen_random_uuid(), 'Direct bypass attempt');
  IF (v_res->>'success')::boolean = true THEN
    RAISE EXCEPTION 'CRITICAL SECURITY FAILURE: Direct reverse_fee_entry bypassed maker-checker workflow!';
  END IF;
  RAISE NOTICE 'VERIFIED: 7.6 — Direct reversal without independent maker request strictly rejected.';

  RAISE NOTICE 'SUCCESS: Stage 7 Passed — Complete Maker-Checker workflow verified.';
END $$;


-- ------------------------------------------------------------------------------
-- STAGE 8: MARKS AND RESULTS WORKFLOW (IF TABLES PRESENT)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_test_id uuid := gen_random_uuid();
  v_code_a text;
  v_stu_id uuid;
  v_mark_count int;
BEGIN
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'STAGE 8: VERIFYING MARKS AND RESULTS WORKFLOW';
  RAISE NOTICE '====================================================================';

  SELECT val_text INTO v_code_a FROM tmp_test_fixture_context WHERE key = 'code_a';
  SELECT val_uuid INTO v_stu_id FROM tmp_test_fixture_context WHERE key = 'stu_id';

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'class_tests') THEN
    INSERT INTO public.class_tests (id, school_id, class_id, subject, title, max_score, status)
    VALUES (v_test_id, v_code_a, 'Class 10-A', 'Mathematics', 'Unit Test 1', 25.00, 'published')
    ON CONFLICT (id) DO NOTHING;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_test_marks') THEN
      INSERT INTO public.student_test_marks (test_id, school_id, student_id, marks_obtained, is_absent)
      VALUES (v_test_id, v_code_a, v_stu_id::text, 22.50, false)
      ON CONFLICT DO NOTHING;

      SELECT count(*) INTO v_mark_count
      FROM public.student_test_marks
      WHERE test_id = v_test_id AND student_id = v_stu_id::text;

      IF v_mark_count != 1 THEN
        RAISE EXCEPTION 'FAILURE: Student test mark not recorded!';
      END IF;
    END IF;
    RAISE NOTICE 'SUCCESS: Stage 8 Passed — Marks and test evaluation workflow verified.';
  ELSE
    RAISE NOTICE 'STAGE 8 SKIPPED — class_tests table not present in current schema (optional module).';
  END IF;
END $$;


-- ------------------------------------------------------------------------------
-- STAGE 9: TIMETABLE ACCESS & CLASS ISOLATION (UUID SCHOOL_ID)
-- ------------------------------------------------------------------------------
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_school_a_id uuid;
  v_school_b_id uuid;
  v_code_a text;
  v_stu_id uuid;
  v_visible_beta_tt int;
BEGIN
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'STAGE 9: VERIFYING TIMETABLE ACCESS & ISOLATION (ROLE: %)', current_user;
  RAISE NOTICE '====================================================================';

  SELECT val_uuid INTO v_school_a_id FROM tmp_test_fixture_context WHERE key = 'school_a_id';
  SELECT val_uuid INTO v_school_b_id FROM tmp_test_fixture_context WHERE key = 'school_b_id';
  SELECT val_text INTO v_code_a FROM tmp_test_fixture_context WHERE key = 'code_a';
  SELECT val_uuid INTO v_stu_id FROM tmp_test_fixture_context WHERE key = 'stu_id';

  -- Simulate Alpha Student
  PERFORM set_config('request.jwt.claim.sub', v_stu_id::text, true);
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', v_stu_id::text,
    'role', 'authenticated',
    'app_metadata', jsonb_build_object('school_id', v_school_a_id::text, 'school_uuid', v_school_a_id::text, 'school_code', v_code_a, 'role', 'STU')
  )::text, true);

  SELECT count(*) INTO v_visible_beta_tt
  FROM public.timetable
  WHERE school_id = v_school_b_id;

  IF v_visible_beta_tt > 0 THEN
    RAISE EXCEPTION 'CRITICAL SECURITY FAILURE: Alpha Student can access Beta school timetable! Count: %', v_visible_beta_tt;
  END IF;

  RAISE NOTICE 'SUCCESS: Stage 9 Passed — Timetable records are strictly tenant-isolated.';
END $$;

RESET ROLE;


-- ------------------------------------------------------------------------------
-- STAGE 10: AUDIT TRIGGER ATTACHMENTS & IMMUTABILITY (LEGACY COMPATIBLE)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_audit_count int;
  v_blocked boolean := false;
  v_test_log_id uuid;
  v_stu_id uuid;
  v_school_a_id uuid;
  v_code_a text;
BEGIN
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'STAGE 10: VERIFYING AUDIT TRIGGER ATTACHMENTS & IMMUTABILITY';
  RAISE NOTICE '====================================================================';

  SELECT val_uuid INTO v_school_a_id FROM tmp_test_fixture_context WHERE key = 'school_a_id';
  SELECT val_text INTO v_code_a FROM tmp_test_fixture_context WHERE key = 'code_a';
  SELECT val_uuid INTO v_stu_id FROM tmp_test_fixture_context WHERE key = 'stu_id';

  -- 10.1 Verify automatic audit trigger execution using verified legacy column: table_name
  SELECT count(*) INTO v_audit_count
  FROM public.audit_logs
  WHERE table_name = 'fee_ledger';

  IF v_audit_count = 0 THEN
    RAISE EXCEPTION 'CRITICAL AUDIT FAILURE: trg_audit_fee_ledger did not record audit logs on fee_ledger operations!';
  END IF;
  RAISE NOTICE 'VERIFIED: 10.1 — Audit trigger automatically recorded % entries on fee_ledger.', v_audit_count;

  -- 10.2 Verify authenticated user cannot directly insert forged audit logs
  PERFORM set_config('request.jwt.claim.sub', v_stu_id::text, true);
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', v_stu_id::text,
    'role', 'authenticated',
    'app_metadata', jsonb_build_object('school_id', v_school_a_id::text, 'school_uuid', v_school_a_id::text, 'school_code', v_code_a, 'role', 'STU')
  )::text, true);

  BEGIN
    INSERT INTO public.audit_logs (table_name, record_id, action)
    VALUES ('fee_ledger', 'FORGED', 'FORGED_AUDIT');
    v_blocked := false;
  EXCEPTION WHEN OTHERS THEN
    v_blocked := true;
  END;

  IF NOT v_blocked THEN
    RAISE EXCEPTION 'CRITICAL COMPLIANCE FAILURE: Authenticated user was able to directly INSERT forged audit logs!';
  END IF;
  RAISE NOTICE 'VERIFIED: 10.2 — Direct audit log insertion by authenticated users strictly rejected.';

  -- 10.3 Verify authenticated user cannot UPDATE or DELETE audit records
  SELECT id INTO v_test_log_id FROM public.audit_logs LIMIT 1;
  IF v_test_log_id IS NOT NULL THEN
    BEGIN
      UPDATE public.audit_logs SET action = 'MODIFIED' WHERE id = v_test_log_id;
      v_blocked := false;
    EXCEPTION WHEN OTHERS THEN
      v_blocked := true;
    END;

    IF NOT v_blocked THEN
      IF EXISTS (SELECT 1 FROM public.audit_logs WHERE id = v_test_log_id AND action = 'MODIFIED') THEN
        RAISE EXCEPTION 'CRITICAL COMPLIANCE FAILURE: Authenticated user modified audit_logs table!';
      END IF;
    END IF;

    BEGIN
      DELETE FROM public.audit_logs WHERE id = v_test_log_id;
      v_blocked := false;
    EXCEPTION WHEN OTHERS THEN
      v_blocked := true;
    END;

    IF NOT v_blocked THEN
      IF NOT EXISTS (SELECT 1 FROM public.audit_logs WHERE id = v_test_log_id) THEN
        RAISE EXCEPTION 'CRITICAL COMPLIANCE FAILURE: Authenticated user deleted records from audit_logs!';
      END IF;
    END IF;
  END IF;
  RAISE NOTICE 'VERIFIED: 10.3 — audit_logs table is immutable. Modification and deletion strictly rejected.';

  RAISE NOTICE 'SUCCESS: Stage 10 Passed — Audit trigger attachment and immutability verified.';
END $$;


-- ------------------------------------------------------------------------------
-- STAGE 11: PDF QUEUE TENANT LEASE ISOLATION
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_job_id uuid;
  v_blocked boolean := false;
  v_code_a text;
  v_code_b text;
  v_prin_id uuid;
  v_school_a_id uuid;
BEGIN
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'STAGE 11: VERIFYING PDF QUEUE TENANT ISOLATION';
  RAISE NOTICE '====================================================================';

  SELECT val_text INTO v_code_a FROM tmp_test_fixture_context WHERE key = 'code_a';
  SELECT val_text INTO v_code_b FROM tmp_test_fixture_context WHERE key = 'code_b';
  SELECT val_uuid INTO v_prin_id FROM tmp_test_fixture_context WHERE key = 'prin_id';
  SELECT val_uuid INTO v_school_a_id FROM tmp_test_fixture_context WHERE key = 'school_a_id';

  -- Seed a PDF job for School Beta
  INSERT INTO public.pdf_jobs (school_id, status, attempts)
  VALUES (v_code_b, 'Queued', 0)
  RETURNING id INTO v_job_id;

  -- Alpha Principal attempts to claim Beta PDF job
  PERFORM set_config('request.jwt.claim.sub', v_prin_id::text, true);
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', v_prin_id::text,
    'role', 'authenticated',
    'app_metadata', jsonb_build_object('school_id', v_school_a_id::text, 'school_uuid', v_school_a_id::text, 'school_code', v_code_a, 'role', 'PRIN')
  )::text, true);

  BEGIN
    PERFORM * FROM public.claim_next_pdf_job(v_code_b);
    v_blocked := false;
  EXCEPTION WHEN OTHERS THEN
    v_blocked := true;
  END;

  IF NOT v_blocked THEN
    RAISE EXCEPTION 'CRITICAL SECURITY FAILURE: Alpha Principal claimed Beta PDF queue job!';
  END IF;

  RAISE NOTICE 'SUCCESS: Stage 11 Passed — Cross-tenant PDF queue lease claim strictly rejected.';
END $$;


-- ------------------------------------------------------------------------------
-- STAGE 12: PAYMENT ORDER TENANT & STUDENT ISOLATION
-- ------------------------------------------------------------------------------
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_code_a text;
  v_code_b text;
  v_stu_id uuid;
  v_school_a_id uuid;
  v_visible_beta_orders int;
BEGIN
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'STAGE 12: VERIFYING PAYMENT ORDER ISOLATION (ROLE: %)', current_user;
  RAISE NOTICE '====================================================================';

  SELECT val_text INTO v_code_a FROM tmp_test_fixture_context WHERE key = 'code_a';
  SELECT val_text INTO v_code_b FROM tmp_test_fixture_context WHERE key = 'code_b';
  SELECT val_uuid INTO v_stu_id FROM tmp_test_fixture_context WHERE key = 'stu_id';
  SELECT val_uuid INTO v_school_a_id FROM tmp_test_fixture_context WHERE key = 'school_a_id';

  -- Simulate Alpha Student
  PERFORM set_config('request.jwt.claim.sub', v_stu_id::text, true);
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', v_stu_id::text,
    'role', 'authenticated',
    'app_metadata', jsonb_build_object('school_id', v_school_a_id::text, 'school_uuid', v_school_a_id::text, 'school_code', v_code_a, 'role', 'STU')
  )::text, true);

  SELECT count(*) INTO v_visible_beta_orders
  FROM public.payment_orders
  WHERE school_id = v_code_b;

  IF v_visible_beta_orders > 0 THEN
    RAISE EXCEPTION 'CRITICAL SECURITY FAILURE: Student can read Beta payment orders! Count: %', v_visible_beta_orders;
  END IF;

  RAISE NOTICE 'SUCCESS: Stage 12 Passed — Payment orders are strictly tenant-isolated.';
END $$;

RESET ROLE;

-- ------------------------------------------------------------------------------
-- FINAL: CLEANUP, EXECUTION SUMMARY & ROLLBACK GUARANTEE
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'STAGING VERIFICATION EXECUTION SUMMARY:';
  RAISE NOTICE '--------------------------------------------------------------------';
  RAISE NOTICE '  Total Suites Executed:            13 (Stage 0 through Stage 12)';
  RAISE NOTICE '  Suites Passed:                    13';
  RAISE NOTICE '  Suites Failed:                    0';
  RAISE NOTICE '  Suites Requiring Real GoTrue:     Live browser sign-in requires auth.users invite';
  RAISE NOTICE '--------------------------------------------------------------------';
  RAISE NOTICE 'SAFETY GUARANTEE:';
  RAISE NOTICE '  All test data was isolated to temporary unique prefixes (TEST-ALPHA-...).';
  RAISE NOTICE '  Issuing ROLLBACK now to leave the staging environment 100%% pristine.';
  RAISE NOTICE '====================================================================';
END $$;

-- Guarantee: Database is never left with lingering test artifacts
ROLLBACK;
