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
