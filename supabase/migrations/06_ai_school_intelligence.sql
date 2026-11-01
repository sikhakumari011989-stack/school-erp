-- ==============================================================================
-- 06_ai_school_intelligence.sql: AI School Intelligence & Executive Copilot
-- Tables: executive_briefings, ai_query_logs
-- Tenant isolation: school_id text NOT NULL
-- Security: initPlan subselects, strict app_metadata RLS
-- ==============================================================================

-- 1. EXECUTIVE BRIEFINGS TABLE (Daily synthesized operational intelligence)
CREATE TABLE IF NOT EXISTS public.executive_briefings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  briefing_date date NOT NULL DEFAULT CURRENT_DATE,
  summary text NOT NULL,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  risk_alerts jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  generated_by text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT uq_school_briefing_date UNIQUE (school_id, briefing_date)
);

CREATE INDEX IF NOT EXISTS idx_exec_briefings_tenant 
  ON public.executive_briefings (school_id);
CREATE INDEX IF NOT EXISTS idx_exec_briefings_date 
  ON public.executive_briefings (school_id, briefing_date DESC);

ALTER TABLE public.executive_briefings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exec_briefings_select" ON public.executive_briefings;
CREATE POLICY "exec_briefings_select"
  ON public.executive_briefings FOR SELECT TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.get_auth_role() IN ('PRIN', 'HOD', 'ACC', 'admin')
  );

DROP POLICY IF EXISTS "exec_briefings_insert" ON public.executive_briefings;
CREATE POLICY "exec_briefings_insert"
  ON public.executive_briefings FOR INSERT TO authenticated
  WITH CHECK (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.get_auth_role() IN ('PRIN', 'HOD', 'ACC', 'admin')
  );

DROP POLICY IF EXISTS "exec_briefings_update" ON public.executive_briefings;
CREATE POLICY "exec_briefings_update"
  ON public.executive_briefings FOR UPDATE TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.get_auth_role() IN ('PRIN', 'HOD', 'ACC', 'admin')
  )
  WITH CHECK (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.get_auth_role() IN ('PRIN', 'HOD', 'ACC', 'admin')
  );

-- ------------------------------------------------------------------------------
-- 2. AI QUERY AUDIT & INTERACTION LOGS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_query_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  user_id text,
  role text,
  query_text text NOT NULL,
  response_text text NOT NULL,
  source text NOT NULL DEFAULT 'deterministic_engine', -- 'deterministic_engine', 'gemini_api', 'openai_api'
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_query_logs_tenant 
  ON public.ai_query_logs (school_id, created_at DESC);

ALTER TABLE public.ai_query_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_query_logs_select" ON public.ai_query_logs;
CREATE POLICY "ai_query_logs_select"
  ON public.ai_query_logs FOR SELECT TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.get_auth_role() IN ('PRIN', 'HOD', 'ACC', 'admin')
  );

DROP POLICY IF EXISTS "ai_query_logs_insert" ON public.ai_query_logs;
CREATE POLICY "ai_query_logs_insert"
  ON public.ai_query_logs FOR INSERT TO authenticated
  WITH CHECK (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.get_auth_role() IN ('PRIN', 'HOD', 'ACC', 'admin')
  );

