-- ==============================================================================
-- 04_cto_audit_hardening.sql: CTO Architecture Audit Hardening Migration
-- 1. Biometric Event Ingestion & Deduplication (biometric_attendance_logs)
-- 2. Durable PDF Queue Lease Claiming (claim_next_pdf_job with SKIP LOCKED)
-- 3. Idempotent Fee Reversal Function (reverse_fee_entry with p_idempotency_key)
-- 4. DPDP Act 2023 Statutory Verifiable Consent Metadata (consent_records)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. BIOMETRIC ATTENDANCE HARDWARE DEDUPLICATION & LOGS
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.biometric_attendance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  device_serial text NOT NULL,
  vendor_event_id text NOT NULL,
  user_code text NOT NULL,
  punch_time timestamptz NOT NULL,
  punch_type text DEFAULT 'CHECK_IN',
  verification_mode text DEFAULT 'FINGERPRINT',
  status text DEFAULT 'PRESENT',
  raw_payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT uq_biometric_school_device_event UNIQUE (school_id, device_serial, vendor_event_id)
);

ALTER TABLE public.biometric_attendance_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_biometric_logs_tenant
  ON public.biometric_attendance_logs (school_id, punch_time DESC);

DROP POLICY IF EXISTS "biometric_logs_select" ON public.biometric_attendance_logs;
CREATE POLICY "biometric_logs_select"
  ON public.biometric_attendance_logs FOR SELECT TO authenticated
  USING (
    school_id = (SELECT COALESCE(NULLIF(auth.jwt() -> 'app_metadata' ->> 'school_id', ''), public.get_current_tenant_id()))
    OR public.get_auth_role() IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "biometric_logs_insert" ON public.biometric_attendance_logs;
CREATE POLICY "biometric_logs_insert"
  ON public.biometric_attendance_logs FOR INSERT TO authenticated
  WITH CHECK (
    school_id = (SELECT COALESCE(NULLIF(auth.jwt() -> 'app_metadata' ->> 'school_id', ''), public.get_current_tenant_id()))
    OR public.get_auth_role() IN ('admin', 'super_admin')
  );

-- ------------------------------------------------------------------------------
-- 2. DURABLE PDF QUEUE LEASES & ATOMIC CLAIM FUNCTION
-- ------------------------------------------------------------------------------

ALTER TABLE public.pdf_jobs ADD COLUMN IF NOT EXISTS idempotency_key text;
ALTER TABLE public.pdf_jobs ADD COLUMN IF NOT EXISTS attempts integer DEFAULT 0;
ALTER TABLE public.pdf_jobs ADD COLUMN IF NOT EXISTS locked_until timestamptz;

CREATE INDEX IF NOT EXISTS idx_pdf_jobs_lease
  ON public.pdf_jobs (school_id, status, attempts, locked_until);

CREATE OR REPLACE FUNCTION public.claim_next_pdf_job(p_school_id text)
RETURNS SETOF public.pdf_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.pdf_jobs
  SET status = 'Processing',
      attempts = attempts + 1,
      locked_until = now() + interval '2 minutes'
  WHERE id = (
    SELECT id
    FROM public.pdf_jobs
    WHERE school_id = p_school_id
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

GRANT EXECUTE ON FUNCTION public.claim_next_pdf_job(text) TO authenticated;

-- ------------------------------------------------------------------------------
-- 3. IDEMPOTENT FINANCIAL REVERSALS & PESSIMISTIC LOCKING
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.reverse_fee_entry(
  p_entry_id text,
  p_reversal_reason text DEFAULT 'Maker-Checker Principal Approval',
  p_authorized_by text DEFAULT 'Principal',
  p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fee_record RECORD;
  v_school_id text;
  v_target_uuid uuid;
  v_existing_reversal RECORD;
BEGIN
  -- Idempotency check: if already reversed with this key, return success immediately
  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_existing_reversal
    FROM public.fee_ledger
    WHERE school_id = (SELECT COALESCE(NULLIF(auth.jwt() -> 'app_metadata' ->> 'school_id', ''), public.get_current_tenant_id()))
      AND payment_mode LIKE '%Credit Note / Reversal%'
      AND (reference_number = p_idempotency_key OR notes LIKE '%' || p_idempotency_key || '%')
    LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', true,
        'message', 'Fee entry already reversed with this idempotency key (deduplicated).',
        'reversal_id', v_existing_reversal.id,
        'idempotent', true
      );
    END IF;
  END IF;

  -- Pessimistic Lock on target entry (FOR UPDATE)
  BEGIN
    v_target_uuid := p_entry_id::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_target_uuid := NULL;
  END;

  SELECT * INTO v_fee_record
  FROM public.fee_ledger
  WHERE (id = v_target_uuid OR receipt_number = p_entry_id)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Fee ledger entry not found or unavailable for locking.'
    );
  END IF;

  v_school_id := v_fee_record.school_id;

  -- Create offsetting Credit Note entry
  INSERT INTO public.fee_ledger (
    school_id,
    student_id,
    amount,
    fee_type,
    payment_mode,
    status,
    notes,
    reference_number,
    created_at
  ) VALUES (
    v_school_id,
    v_fee_record.student_id,
    -ABS(v_fee_record.amount),
    COALESCE(v_fee_record.fee_type, 'Tuition Fee'),
    'Credit Note / Reversal (Auth: ' || p_authorized_by || ')',
    'Reversed',
    'Reversal Justification: ' || p_reversal_reason || ' [IdempotencyKey: ' || COALESCE(p_idempotency_key, 'N/A') || ']',
    COALESCE(p_idempotency_key, 'REV-' || p_entry_id),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Fee entry locked and reversed with Credit Note generated.',
    'entry_id', p_entry_id,
    'idempotency_key', p_idempotency_key
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reverse_fee_entry(text, text, text, text) TO authenticated;

-- ------------------------------------------------------------------------------
-- 4. DPDP ACT 2023 STATUTORY CONSENT METADATA & OTP AUDIT
-- ------------------------------------------------------------------------------

ALTER TABLE public.consent_records ADD COLUMN IF NOT EXISTS consent_version text DEFAULT 'v2026.10-DPDP-Ready';
ALTER TABLE public.consent_records ADD COLUMN IF NOT EXISTS verification_method text DEFAULT 'Guardian_OTP_2FA';
ALTER TABLE public.consent_records ADD COLUMN IF NOT EXISTS verification_outcome text DEFAULT 'verified';
ALTER TABLE public.consent_records ADD COLUMN IF NOT EXISTS verification_transaction_id text;

-- ------------------------------------------------------------------------------
-- 5. PER-DEVICE BIOMETRIC HARDWARE REGISTRY & SECRETS (biometric_devices)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.biometric_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  device_serial text NOT NULL UNIQUE,
  device_name text DEFAULT 'Campus Gate Terminal',
  model text DEFAULT 'eSSL SilkBio-101',
  hmac_secret text NOT NULL DEFAULT 'biometric_hw_shared_secret_2026',
  is_active boolean DEFAULT true,
  last_heartbeat timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.biometric_devices ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_biometric_devices_serial
  ON public.biometric_devices (device_serial, school_id);

DROP POLICY IF EXISTS "biometric_devices_select" ON public.biometric_devices;
CREATE POLICY "biometric_devices_select"
  ON public.biometric_devices FOR SELECT TO authenticated
  USING (
    school_id = (SELECT COALESCE(NULLIF(auth.jwt() -> 'app_metadata' ->> 'school_id', ''), public.get_current_tenant_id()))
    OR public.get_auth_role() IN ('admin', 'super_admin')
  );

-- Seed default device for zero-downtime integration & demo
INSERT INTO public.biometric_devices (school_id, device_serial, device_name, model, hmac_secret, is_active)
VALUES ('CAMPUS-01', 'ESSL-SN-99824', 'Main Campus Gate Turnstile', 'eSSL SilkBio-101', 'biometric_hw_shared_secret_2026', true)
ON CONFLICT (device_serial) DO NOTHING;

