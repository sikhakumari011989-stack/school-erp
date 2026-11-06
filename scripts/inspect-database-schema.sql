-- ==============================================================================
-- ACADEMIC OS — READ-ONLY SCHEMA INSPECTION SCRIPT
-- File: scripts/inspect-database-schema.sql
-- Purpose: Safely inspect live Supabase / PostgreSQL database schema without modifications.
--          Run this in your Supabase SQL Editor to verify actual column types,
--          constraints, RLS policies, and routine grants.
-- ==============================================================================

-- 1. INSPECT COLUMN TYPES & DEFINITIONS
SELECT 
  table_name,
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'schools',
    'profiles',
    'fee_ledger',
    'fee_reversal_requests',
    'audit_logs',
    'pdf_jobs',
    'payment_orders',
    'school_licenses'
  )
ORDER BY table_name, ordinal_position;

-- 2. INSPECT PRIMARY KEYS, FOREIGN KEYS & UNIQUE CONSTRAINTS
SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name IN (
    'schools',
    'profiles',
    'fee_ledger',
    'fee_reversal_requests',
    'audit_logs',
    'pdf_jobs',
    'payment_orders'
  )
ORDER BY tc.table_name, tc.constraint_name;

-- 3. INSPECT ROW LEVEL SECURITY (RLS) STATUS & ACTIVE POLICIES
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'schools',
    'profiles',
    'fee_ledger',
    'fee_reversal_requests',
    'audit_logs',
    'pdf_jobs',
    'payment_orders'
  )
ORDER BY tablename, policyname;

-- 4. INSPECT FUNCTION GRANTS & PERMISSIONS
SELECT 
  routine_name,
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name IN (
    'reverse_fee_entry',
    'request_fee_reversal',
    'approve_fee_reversal',
    'reject_fee_reversal',
    'claim_next_pdf_job',
    'provision_institutional_school',
    'renew_school_subscription',
    'get_auth_role',
    'get_current_tenant_id',
    'is_active_operator'
  )
ORDER BY routine_name, grantee;

