-- ==============================================================================
-- 14_institutional_accreditation.sql: Institutional Accreditation Center
-- Table: accreditation_criteria
-- Frameworks: CBSE Affiliation Bye-Laws, NAAC Manual, RTE Statutory Norms
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.accreditation_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  framework text NOT NULL, -- e.g. 'CBSE Affiliation Bye-Laws 2018', 'NAAC Manual 2024', 'RTE Statutory Norms'
  criterion_code text NOT NULL, -- e.g. 'CBSE-RULE-14.2', 'NAAC-CR-1.1'
  title text NOT NULL,
  description text,
  assigned_officer text,
  compliance_status text NOT NULL DEFAULT 'in_progress', -- 'compliant', 'in_progress', 'non_compliant', 'under_review'
  evidence_documents jsonb NOT NULL DEFAULT '[]'::jsonb,
  score_weightage numeric(5,2) DEFAULT 10.00,
  score_achieved numeric(5,2) DEFAULT 0.00,
  last_reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accreditation_tenant_framework 
  ON public.accreditation_criteria (school_id, framework);
CREATE INDEX IF NOT EXISTS idx_accreditation_status 
  ON public.accreditation_criteria (school_id, compliance_status);

ALTER TABLE public.accreditation_criteria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "accreditation_select" ON public.accreditation_criteria;
CREATE POLICY "accreditation_select"
  ON public.accreditation_criteria FOR SELECT TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
  );

DROP POLICY IF EXISTS "accreditation_write" ON public.accreditation_criteria;
CREATE POLICY "accreditation_write"
  ON public.accreditation_criteria FOR ALL TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.get_auth_role() IN ('PRIN', 'HOD', 'ACC', 'admin')
  )
  WITH CHECK (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.get_auth_role() IN ('PRIN', 'HOD', 'ACC', 'admin')
  );

