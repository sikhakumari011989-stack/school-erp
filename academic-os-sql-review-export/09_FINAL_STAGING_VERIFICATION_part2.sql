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
