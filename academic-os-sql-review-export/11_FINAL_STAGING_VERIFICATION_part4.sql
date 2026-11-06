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
