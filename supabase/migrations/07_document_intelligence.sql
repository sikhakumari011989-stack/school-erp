-- ==============================================================================
-- 07_document_intelligence.sql: AI Document Intelligence & OCR Vault
-- Table: digitized_documents
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.digitized_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  document_name text NOT NULL,
  document_type text NOT NULL DEFAULT 'admission_form', -- 'admission_form', 'marksheet', 'student_id', 'fee_receipt', 'other'
  storage_path text,
  file_size_bytes bigint,
  mime_type text,
  ocr_provider text NOT NULL DEFAULT 'configurable_pending',
  extraction_status text NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'extracted', 'human_verified', 'rejected'
  confidence_score numeric(5,2) DEFAULT 0.00,
  extracted_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  verified_data jsonb,
  validation_errors text[] DEFAULT ARRAY[]::text[],
  target_student_id text,
  uploaded_by text,
  verified_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_digitized_documents_tenant 
  ON public.digitized_documents (school_id);
CREATE INDEX IF NOT EXISTS idx_digitized_documents_status 
  ON public.digitized_documents (school_id, extraction_status);
CREATE INDEX IF NOT EXISTS idx_digitized_documents_type 
  ON public.digitized_documents (school_id, document_type);

ALTER TABLE public.digitized_documents ENABLE ROW LEVEL SECURITY;

-- RLS: Read Access
DROP POLICY IF EXISTS "digitized_docs_select" ON public.digitized_documents;
CREATE POLICY "digitized_docs_select"
  ON public.digitized_documents FOR SELECT TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    AND (
      public.get_auth_role() IN ('PRIN', 'HOD', 'ACC', 'NTS', 'admin')
      OR (public.get_auth_role() = 'TCH' AND document_type = 'marksheet')
      OR (public.get_auth_role() = 'STU' AND target_student_id = public.get_auth_student_id())
    )
  );

-- RLS: Insert Access (Staff and Admins)
DROP POLICY IF EXISTS "digitized_docs_insert" ON public.digitized_documents;
CREATE POLICY "digitized_docs_insert"
  ON public.digitized_documents FOR INSERT TO authenticated
  WITH CHECK (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.get_auth_role() IN ('PRIN', 'HOD', 'ACC', 'NTS', 'admin')
  );

-- RLS: Update Access (Human verification and status changes)
DROP POLICY IF EXISTS "digitized_docs_update" ON public.digitized_documents;
CREATE POLICY "digitized_docs_update"
  ON public.digitized_documents FOR UPDATE TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.get_auth_role() IN ('PRIN', 'HOD', 'ACC', 'NTS', 'admin')
  )
  WITH CHECK (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.get_auth_role() IN ('PRIN', 'HOD', 'ACC', 'NTS', 'admin')
  );

-- RLS: Delete Access (Strictly PRIN and HOD)
DROP POLICY IF EXISTS "digitized_docs_delete" ON public.digitized_documents;
CREATE POLICY "digitized_docs_delete"
  ON public.digitized_documents FOR DELETE TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.is_admin_or_executive()
  );

