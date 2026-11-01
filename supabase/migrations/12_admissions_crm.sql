-- ==============================================================================
-- 12_admissions_crm.sql: Enterprise Admission CRM & Lead Pipeline
-- Tables: admission_leads, lead_interactions
-- RPC: convert_admission_lead_to_student
-- ==============================================================================

-- 1. ADMISSION LEADS TABLE
CREATE TABLE IF NOT EXISTS public.admission_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  name text NOT NULL,
  parent_name text NOT NULL,
  phone text NOT NULL,
  email text,
  target_class text NOT NULL,
  source text NOT NULL DEFAULT 'Campus Walk-in',
  stage text NOT NULL DEFAULT 'new', -- 'new', 'followup', 'campus_visit', 'offer_extended', 'enrolled', 'lost'
  follow_up_date date,
  notes text,
  student_id text, -- Populated with allocated roll_number (TEXT) upon enrollment
  assigned_counselor text,
  created_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admission_leads_tenant 
  ON public.admission_leads (school_id);
CREATE INDEX IF NOT EXISTS idx_admission_leads_stage 
  ON public.admission_leads (school_id, stage);
CREATE INDEX IF NOT EXISTS idx_admission_leads_followup 
  ON public.admission_leads (school_id, follow_up_date);

ALTER TABLE public.admission_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admission_leads_select" ON public.admission_leads;
CREATE POLICY "admission_leads_select"
  ON public.admission_leads FOR SELECT TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.get_auth_role() IN ('PRIN', 'HOD', 'ACC', 'NTS')
  );

DROP POLICY IF EXISTS "admission_leads_insert" ON public.admission_leads;
CREATE POLICY "admission_leads_insert"
  ON public.admission_leads FOR INSERT TO authenticated
  WITH CHECK (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.get_auth_role() IN ('PRIN', 'HOD', 'ACC', 'NTS')
  );

DROP POLICY IF EXISTS "admission_leads_update" ON public.admission_leads;
CREATE POLICY "admission_leads_update"
  ON public.admission_leads FOR UPDATE TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.get_auth_role() IN ('PRIN', 'HOD', 'ACC', 'NTS')
  )
  WITH CHECK (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.get_auth_role() IN ('PRIN', 'HOD', 'ACC', 'NTS')
  );

DROP POLICY IF EXISTS "admission_leads_delete" ON public.admission_leads;
CREATE POLICY "admission_leads_delete"
  ON public.admission_leads FOR DELETE TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    AND (public.is_admin_or_executive() OR public.is_financial_manager())
  );

-- ------------------------------------------------------------------------------
-- 2. LEAD INTERACTIONS / ACTIVITY TIMELINE TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lead_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  lead_id uuid NOT NULL REFERENCES public.admission_leads(id) ON DELETE CASCADE,
  interaction_type text NOT NULL DEFAULT 'note', -- 'call', 'visit', 'whatsapp', 'email', 'note', 'status_change'
  details text NOT NULL,
  conducted_by text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_interactions_lead_id 
  ON public.lead_interactions (lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_interactions_tenant 
  ON public.lead_interactions (school_id);

ALTER TABLE public.lead_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lead_interactions_select" ON public.lead_interactions;
CREATE POLICY "lead_interactions_select"
  ON public.lead_interactions FOR SELECT TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.get_auth_role() IN ('PRIN', 'HOD', 'ACC', 'NTS')
  );

DROP POLICY IF EXISTS "lead_interactions_insert" ON public.lead_interactions;
CREATE POLICY "lead_interactions_insert"
  ON public.lead_interactions FOR INSERT TO authenticated
  WITH CHECK (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.get_auth_role() IN ('PRIN', 'HOD', 'ACC', 'NTS')
    -- Prevent cross-tenant lead reference tampering
    AND EXISTS (
      SELECT 1 FROM public.admission_leads l
      WHERE l.id = lead_id AND l.school_id = (SELECT public.get_current_tenant_id())
    )
  );

-- ------------------------------------------------------------------------------
-- 3. ATOMIC ENROLLMENT TRANSACTION RPC
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.convert_admission_lead_to_student(
  p_lead_id uuid,
  p_roll_number text,
  p_class_name text,
  p_enrolled_by text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id text;
  v_lead record;
  v_new_student_id uuid;
BEGIN
  v_tenant_id := public.get_current_tenant_id();
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Tenant context missing.';
  END IF;

  -- Validate authorized roles: PRIN, HOD, ACC, or NTS
  IF public.get_auth_role() NOT IN ('PRIN', 'HOD', 'ACC', 'NTS') THEN
    RAISE EXCEPTION 'Unauthorized: Insufficient privileges to enroll student.';
  END IF;

  -- Lock lead row within tenant boundary
  SELECT * INTO v_lead
  FROM public.admission_leads
  WHERE id = p_lead_id AND school_id = v_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Admission lead not found or cross-tenant access denied.';
  END IF;

  IF v_lead.stage = 'enrolled' THEN
    RAISE EXCEPTION 'Candidate is already enrolled with Student ID %', v_lead.student_id;
  END IF;

  -- Check roll number duplicate
  IF EXISTS (
    SELECT 1 FROM public.students 
    WHERE school_id = v_tenant_id AND roll_number = p_roll_number
  ) THEN
    RAISE EXCEPTION 'Roll number % is already allocated in active student roster.', p_roll_number;
  END IF;

  -- 1. Insert into public.students
  INSERT INTO public.students (
    school_id,
    name,
    roll_number,
    class_name,
    guardian_name,
    phone,
    email
  ) VALUES (
    v_tenant_id,
    v_lead.name,
    p_roll_number,
    COALESCE(p_class_name, v_lead.target_class),
    v_lead.parent_name,
    v_lead.phone,
    v_lead.email
  ) RETURNING id INTO v_new_student_id;

  -- 2. Update admission lead status
  UPDATE public.admission_leads
  SET 
    stage = 'enrolled',
    student_id = p_roll_number,
    updated_at = now()
  WHERE id = p_lead_id;

  -- 3. Record interaction log entry
  INSERT INTO public.lead_interactions (
    school_id,
    lead_id,
    interaction_type,
    details,
    conducted_by
  ) VALUES (
    v_tenant_id,
    p_lead_id,
    'status_change',
    'Candidate converted to active student roster with ID: ' || p_roll_number,
    COALESCE(p_enrolled_by, auth.uid()::text)
  );

  RETURN jsonb_build_object(
    'success', true,
    'student_id', v_new_student_id,
    'roll_number', p_roll_number
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.convert_admission_lead_to_student(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.convert_admission_lead_to_student(uuid, text, text, text) TO authenticated;

