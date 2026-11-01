-- ==============================================================================
-- 13_procurement_intelligence.sql: Vendors, Purchase Orders & Requisitions
-- Tables: vendors, purchase_requisitions
-- Maker-Checker Rules: separation of duty (creator cannot approve)
-- ==============================================================================

-- 1. VENDORS DIRECTORY TABLE
CREATE TABLE IF NOT EXISTS public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  vendor_name text NOT NULL,
  contact_person text,
  phone text NOT NULL,
  email text,
  category text NOT NULL, -- 'IT & Hardware', 'Lab Chemicals & Apparatus', 'Stationery & Printing', 'Furniture & Maintenance'
  gstin text,
  rating numeric(3,2) DEFAULT 4.50,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendors_tenant 
  ON public.vendors (school_id, category);

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vendors_select" ON public.vendors;
CREATE POLICY "vendors_select"
  ON public.vendors FOR SELECT TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
  );

DROP POLICY IF EXISTS "vendors_write" ON public.vendors;
CREATE POLICY "vendors_write"
  ON public.vendors FOR ALL TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.get_auth_role() IN ('PRIN', 'HOD', 'ACC', 'admin')
  )
  WITH CHECK (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.get_auth_role() IN ('PRIN', 'HOD', 'ACC', 'admin')
  );

-- ------------------------------------------------------------------------------
-- 2. PURCHASE REQUISITIONS & MAKER-CHECKER ORDERS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.purchase_requisitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text NOT NULL,
  po_number text NOT NULL,
  title text NOT NULL,
  category text NOT NULL,
  department text NOT NULL,
  requested_by text NOT NULL,
  requested_by_id text,
  estimated_amount numeric(12,2) NOT NULL,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  quotations jsonb NOT NULL DEFAULT '[]'::jsonb,
  stage text NOT NULL DEFAULT 'pending_approval', -- 'draft', 'pending_approval', 'approved', 'rejected', 'goods_received'
  approved_by text,
  approved_at timestamptz,
  rejection_reason text,
  goods_received_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  -- Maker-Checker constraint: Approver cannot be the Creator where approved
  CONSTRAINT chk_maker_checker CHECK (
    stage != 'approved' OR (approved_by IS NOT NULL AND approved_by != requested_by)
  )
);

CREATE INDEX IF NOT EXISTS idx_purchase_req_tenant 
  ON public.purchase_requisitions (school_id, stage);

ALTER TABLE public.purchase_requisitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "purchase_req_select" ON public.purchase_requisitions;
CREATE POLICY "purchase_req_select"
  ON public.purchase_requisitions FOR SELECT TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
  );

DROP POLICY IF EXISTS "purchase_req_insert" ON public.purchase_requisitions;
CREATE POLICY "purchase_req_insert"
  ON public.purchase_requisitions FOR INSERT TO authenticated
  WITH CHECK (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.get_auth_role() IN ('PRIN', 'HOD', 'ACC', 'NTS', 'TCH', 'admin')
  );

DROP POLICY IF EXISTS "purchase_req_update" ON public.purchase_requisitions;
CREATE POLICY "purchase_req_update"
  ON public.purchase_requisitions FOR UPDATE TO authenticated
  USING (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.get_auth_role() IN ('PRIN', 'HOD', 'ACC', 'admin')
  )
  WITH CHECK (
    school_id = (SELECT public.get_current_tenant_id())
    AND public.get_auth_role() IN ('PRIN', 'HOD', 'ACC', 'admin')
  );

