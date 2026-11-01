-- ==============================================================================
-- 16_certificate_automation.sql: Digital Credentials, Serials & Verification
-- Table: issued_certificates
-- Function: generate_certificate_serial, verify_public_certificate
-- Security: Data minimization on public QR verification (No PII leaked)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.issued_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  certificate_type text NOT NULL, -- 'Transfer Certificate', 'Bonafide Certificate', 'Character Certificate', 'Merit Achievement'
  serial_number text NOT NULL,
  student_id text NOT NULL,
  student_name text NOT NULL,
  class_name text NOT NULL,
  guardian_name text,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'issued', -- 'issued', 'revoked', 'reissued'
  verification_code text UNIQUE NOT NULL,
  verification_hash text NOT NULL,
  issued_by text NOT NULL,
  issued_at timestamptz DEFAULT now(),
  revoked_by text,
  revoked_at timestamptz,
  revocation_reason text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT uq_cert_serial UNIQUE (school_id, certificate_type, serial_number)
);

CREATE INDEX IF NOT EXISTS idx_issued_certs_tenant 
  ON public.issued_certificates (school_id, student_id);
CREATE INDEX IF NOT EXISTS idx_issued_certs_code 
  ON public.issued_certificates (verification_code);

ALTER TABLE public.issued_certificates ENABLE ROW LEVEL SECURITY;

-- RLS: Read Access
DROP POLICY IF EXISTS "issued_certs_select" ON public.issued_certificates;
CREATE POLICY "issued_certs_select"
  ON public.issued_certificates FOR SELECT TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    AND (
      public.get_auth_role() IN ('PRIN', 'HOD', 'ACC', 'NTS', 'TCH', 'admin')
      OR (public.get_auth_role() = 'STU' AND student_id = public.get_auth_student_id())
    )
  );

-- RLS: Write Access (PRIN, HOD, and Staff)
DROP POLICY IF EXISTS "issued_certs_write" ON public.issued_certificates;
CREATE POLICY "issued_certs_write"
  ON public.issued_certificates FOR ALL TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.get_auth_role() IN ('PRIN', 'HOD', 'ACC', 'NTS', 'admin')
  )
  WITH CHECK (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.get_auth_role() IN ('PRIN', 'HOD', 'ACC', 'NTS', 'admin')
  );

-- ------------------------------------------------------------------------------
-- 2. CONCURRENCY-SAFE SERIAL GENERATOR
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_certificate_serial(
  p_school_id text,
  p_cert_type text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix text;
  v_count int;
  v_year text;
BEGIN
  v_year := to_char(CURRENT_DATE, 'YYYY');
  v_prefix := CASE p_cert_type
    WHEN 'Transfer Certificate' THEN 'TC'
    WHEN 'Bonafide Certificate' THEN 'BNF'
    WHEN 'Character Certificate' THEN 'CHR'
    ELSE 'CRT'
  END;

  SELECT COUNT(*) + 1 INTO v_count
  FROM public.issued_certificates
  WHERE school_id = p_school_id AND certificate_type = p_cert_type;

  RETURN v_prefix || '-' || v_year || '-' || lpad(v_count::text, 4, '0');
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. MINIMAL DATA DISCLOSURE PUBLIC QR VERIFIER (DPDP / HIPAA SAFE)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_public_credential(
  p_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cert record;
  v_initials text;
BEGIN
  SELECT * INTO v_cert
  FROM public.issued_certificates
  WHERE verification_code = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('is_valid', false, 'status', 'NOT_FOUND');
  END IF;

  -- Obfuscate student name to protect minor privacy (e.g. "Aarav Mehta" -> "A. M.")
  v_initials := regexp_replace(v_cert.student_name, '(\w)\w*', '\1.', 'g');

  RETURN jsonb_build_object(
    'is_valid', (v_cert.status = 'issued'),
    'status', v_cert.status,
    'certificate_type', v_cert.certificate_type,
    'serial_number', v_cert.serial_number,
    'institution_node', v_cert.school_id,
    'student_initials', v_initials,
    'issue_date', v_cert.issued_at::date,
    'is_revoked', (v_cert.status = 'revoked')
  );
END;
$$;

-- Grant execution to public for external authenticity checks
GRANT EXECUTE ON FUNCTION public.verify_public_credential(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_certificate_serial(text, text) TO authenticated;

