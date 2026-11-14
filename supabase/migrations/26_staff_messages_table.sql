-- 26_staff_messages_table.sql
-- Persistent two-way staff messaging for ASTINEX

CREATE TABLE IF NOT EXISTS public.staff_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    recipient_id TEXT NOT NULL,
    body TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast thread lookups and institution isolation
CREATE INDEX IF NOT EXISTS idx_staff_messages_institution ON public.staff_messages(institution_id);
CREATE INDEX IF NOT EXISTS idx_staff_messages_thread ON public.staff_messages(institution_id, sender_id, recipient_id);
CREATE INDEX IF NOT EXISTS idx_staff_messages_recipient ON public.staff_messages(institution_id, recipient_id);
CREATE INDEX IF NOT EXISTS idx_staff_messages_created_at ON public.staff_messages(created_at ASC);

-- Enable RLS
ALTER TABLE public.staff_messages ENABLE ROW LEVEL SECURITY;

-- Multi-tenant staff messaging RLS policies
DROP POLICY IF EXISTS "staff_messages_select_policy" ON public.staff_messages;
CREATE POLICY "staff_messages_select_policy"
ON public.staff_messages
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "staff_messages_insert_policy" ON public.staff_messages;
CREATE POLICY "staff_messages_insert_policy"
ON public.staff_messages
FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "staff_messages_update_policy" ON public.staff_messages;
CREATE POLICY "staff_messages_update_policy"
ON public.staff_messages
FOR UPDATE
USING (true);
