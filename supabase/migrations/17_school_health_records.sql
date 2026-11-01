-- ==============================================================================
-- 17_school_health_records.sql: School Health, Wellness & Clinic Access Vault
-- Tables: student_health_records, clinic_visits, medical_access_logs
-- Security: Strict Least-Privilege RLS (No NTS, No regular TCH)
-- Compliance: DPDP Parental Consent & Immutable Access Audit Trail
-- ==============================================================================

-- 1. HELPER: IS MEDICAL AUTHORIZED
CREATE OR REPLACE FUNCTION public.is_medical_authorized()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.get_auth_role() IN ('PRIN', 'admin', 'principal', 'trustee', 'super_admin')
    OR (auth.jwt() -> 'app_metadata' ->> 'is_medical_officer')::boolean IS TRUE
    OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('NURSE', 'DOCTOR', 'CLINIC_OFFICER', 'MEDICAL_OFFICER');
$$;

GRANT EXECUTE ON FUNCTION public.is_medical_authorized() TO authenticated;

-- ------------------------------------------------------------------------------
-- 2. STUDENT HEALTH RECORDS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_health_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  student_id text NOT NULL,
  student_name text NOT NULL,
  class_name text NOT NULL,
  blood_group text NOT NULL, -- 'O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-'
  critical_allergies text[] DEFAULT '{}',
  chronic_conditions text[] DEFAULT '{}',
  emergency_contact_name text NOT NULL,
  emergency_contact_phone text NOT NULL,
  emergency_contact_relation text NOT NULL DEFAULT 'Parent/Guardian',
  confidential_medical_notes text,
  has_dpdp_consent boolean NOT NULL DEFAULT false,
  consent_parent_name text,
  consent_granted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT uq_student_health UNIQUE (school_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_student_health_tenant 
  ON public.student_health_records (school_id, student_id);

ALTER TABLE public.student_health_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "student_health_select" ON public.student_health_records;
CREATE POLICY "student_health_select"
  ON public.student_health_records FOR SELECT TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    AND (
      public.is_medical_authorized()
      OR (public.get_auth_role() = 'STU' AND student_id = public.get_auth_student_id())
    )
  );

DROP POLICY IF EXISTS "student_health_write" ON public.student_health_records;
CREATE POLICY "student_health_write"
  ON public.student_health_records FOR ALL TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.is_medical_authorized()
  )
  WITH CHECK (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.is_medical_authorized()
  );

-- ------------------------------------------------------------------------------
-- 3. CLINIC VISITS & INCIDENT LOG TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clinic_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  student_id text NOT NULL,
  student_name text NOT NULL,
  class_name text NOT NULL,
  visit_time timestamptz NOT NULL DEFAULT now(),
  symptoms text NOT NULL,
  triage_level text NOT NULL DEFAULT 'routine', -- 'routine', 'urgent', 'emergency'
  vitals jsonb DEFAULT '{}'::jsonb,
  treatment_administered text NOT NULL,
  medication_dispensed text,
  attending_officer text NOT NULL,
  referred_to_hospital boolean NOT NULL DEFAULT false,
  hospital_name text,
  parent_notified boolean NOT NULL DEFAULT false,
  parent_notified_at timestamptz,
  confidential_clinical_notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinic_visits_tenant 
  ON public.clinic_visits (school_id, visit_time DESC);

ALTER TABLE public.clinic_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clinic_visits_select" ON public.clinic_visits;
CREATE POLICY "clinic_visits_select"
  ON public.clinic_visits FOR SELECT TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    AND (
      public.is_medical_authorized()
      OR (public.get_auth_role() = 'STU' AND student_id = public.get_auth_student_id())
    )
  );

DROP POLICY IF EXISTS "clinic_visits_write" ON public.clinic_visits;
CREATE POLICY "clinic_visits_write"
  ON public.clinic_visits FOR ALL TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.is_medical_authorized()
  )
  WITH CHECK (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.is_medical_authorized()
  );

-- ------------------------------------------------------------------------------
-- 4. IMMUTABLE MEDICAL ACCESS AUDIT LOG
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.medical_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  student_id text NOT NULL,
  action_type text NOT NULL, -- 'VIEW_EMERGENCY_SUMMARY', 'VIEW_FULL_CLINICAL_FILE', 'UPDATE_HEALTH_RECORD', 'RECORD_CLINIC_VISIT'
  actor_id text NOT NULL,
  actor_role text NOT NULL,
  actor_email text,
  ip_hash text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medical_logs_tenant 
  ON public.medical_access_logs (school_id, student_id, created_at DESC);

ALTER TABLE public.medical_access_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "medical_logs_select" ON public.medical_access_logs;
CREATE POLICY "medical_logs_select"
  ON public.medical_access_logs FOR SELECT TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.is_medical_authorized()
  );

DROP POLICY IF EXISTS "medical_logs_insert" ON public.medical_access_logs;
CREATE POLICY "medical_logs_insert"
  ON public.medical_access_logs FOR INSERT TO authenticated
  WITH CHECK (
    school_id = (SELECT public.get_current_tenant_id())
  );

-- ------------------------------------------------------------------------------
-- 5. MINIMAL EMERGENCY ALLERGY LOOKUP RPC (DATA MINIMIZATION)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_student_emergency_health_summary(
  p_school_id text,
  p_student_id text
)
RETURNS TABLE (
  student_id text,
  student_name text,
  class_name text,
  blood_group text,
  critical_allergies text[],
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relation text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert immutable audit entry
  INSERT INTO public.medical_access_logs (
    school_id,
    student_id,
    action_type,
    actor_id,
    actor_role
  ) VALUES (
    p_school_id,
    p_student_id,
    'VIEW_EMERGENCY_SUMMARY',
    coalesce(auth.uid()::text, 'system'),
    public.get_auth_role()
  );

  RETURN QUERY
  SELECT 
    h.student_id,
    h.student_name,
    h.class_name,
    h.blood_group,
    h.critical_allergies,
    h.emergency_contact_name,
    h.emergency_contact_phone,
    h.emergency_contact_relation
  FROM public.student_health_records h
  WHERE h.school_id = p_school_id AND h.student_id = p_student_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_student_emergency_health_summary(text, text) TO authenticated;

