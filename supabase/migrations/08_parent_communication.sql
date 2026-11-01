-- ==============================================================================
-- 08_parent_communication.sql: Parent Communication Automation
-- Tables: communication_templates, parent_notifications, parent_communication_preferences
-- ==============================================================================

-- 1. TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS public.communication_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  name text NOT NULL,
  category text NOT NULL, -- 'absence', 'fee_reminder', 'exam_result', 'homework', 'announcement', 'event'
  channel text NOT NULL DEFAULT 'whatsapp', -- 'whatsapp', 'sms', 'in_app'
  template_body text NOT NULL,
  variables text[] DEFAULT ARRAY[]::text[],
  is_system boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comm_templates_tenant 
  ON public.communication_templates (school_id, category);

ALTER TABLE public.communication_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comm_templates_select" ON public.communication_templates;
CREATE POLICY "comm_templates_select"
  ON public.communication_templates FOR SELECT TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
  );

DROP POLICY IF EXISTS "comm_templates_write" ON public.communication_templates;
CREATE POLICY "comm_templates_write"
  ON public.communication_templates FOR ALL TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.get_auth_role() IN ('PRIN', 'HOD', 'ACC', 'NTS', 'admin')
  )
  WITH CHECK (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.get_auth_role() IN ('PRIN', 'HOD', 'ACC', 'NTS', 'admin')
  );

-- ------------------------------------------------------------------------------
-- 2. NOTIFICATIONS & DISPATCH AUDIT LOG
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.parent_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  recipient_phone text NOT NULL,
  recipient_name text,
  student_id text,
  channel text NOT NULL DEFAULT 'whatsapp',
  category text NOT NULL,
  message text NOT NULL,
  delivery_status text NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed', 'queued'
  provider_response jsonb,
  retry_count int DEFAULT 0,
  scheduled_at timestamptz DEFAULT now(),
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parent_notifications_tenant 
  ON public.parent_notifications (school_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_parent_notifications_status 
  ON public.parent_notifications (school_id, delivery_status);

ALTER TABLE public.parent_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parent_notifs_select" ON public.parent_notifications;
CREATE POLICY "parent_notifs_select"
  ON public.parent_notifications FOR SELECT TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    AND (
      public.get_auth_role() IN ('PRIN', 'HOD', 'ACC', 'NTS', 'TCH', 'admin')
      OR (public.get_auth_role() = 'STU' AND student_id = public.get_auth_student_id())
    )
  );

DROP POLICY IF EXISTS "parent_notifs_insert" ON public.parent_notifications;
CREATE POLICY "parent_notifs_insert"
  ON public.parent_notifications FOR INSERT TO authenticated
  WITH CHECK (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.get_auth_role() IN ('PRIN', 'HOD', 'ACC', 'NTS', 'TCH', 'admin')
  );

DROP POLICY IF EXISTS "parent_notifs_update" ON public.parent_notifications;
CREATE POLICY "parent_notifs_update"
  ON public.parent_notifications FOR UPDATE TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.get_auth_role() IN ('PRIN', 'HOD', 'ACC', 'NTS', 'admin')
  )
  WITH CHECK (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.get_auth_role() IN ('PRIN', 'HOD', 'ACC', 'NTS', 'admin')
  );

-- ------------------------------------------------------------------------------
-- 3. PARENT COMMUNICATION PREFERENCES & CONSENT
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.parent_communication_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  student_id text NOT NULL,
  preferred_channel text NOT NULL DEFAULT 'whatsapp',
  allow_absence_alerts boolean DEFAULT true,
  allow_fee_alerts boolean DEFAULT true,
  allow_exam_alerts boolean DEFAULT true,
  allow_announcements boolean DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT uq_parent_comm_pref UNIQUE (school_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_parent_pref_tenant 
  ON public.parent_communication_preferences (school_id, student_id);

ALTER TABLE public.parent_communication_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parent_pref_select" ON public.parent_communication_preferences;
CREATE POLICY "parent_pref_select"
  ON public.parent_communication_preferences FOR SELECT TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
  );

DROP POLICY IF EXISTS "parent_pref_write" ON public.parent_communication_preferences;
CREATE POLICY "parent_pref_write"
  ON public.parent_communication_preferences FOR ALL TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.get_auth_role() IN ('PRIN', 'HOD', 'ACC', 'NTS', 'STU', 'admin')
  )
  WITH CHECK (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.get_auth_role() IN ('PRIN', 'HOD', 'ACC', 'NTS', 'STU', 'admin')
  );

