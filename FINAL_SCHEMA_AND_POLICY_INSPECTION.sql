-- ==============================================================================
-- ACADEMIC OS — FINAL SCHEMA & POLICY STATIC CATALOG INSPECTION SUITE
-- File: FINAL_SCHEMA_AND_POLICY_INSPECTION.sql
-- Compatible with: Supabase SQL Editor, PostgreSQL 14+, psql
-- Purpose: Inspects actual PostgreSQL system catalogs (pg_class, pg_policies,
--          information_schema) to produce a static security and RLS report
--          for all 15 sensitive tables and SECURITY DEFINER routines.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ROW LEVEL SECURITY (RLS) ACTIVATION & FORCED STATUS ON ALL 15 CORE TABLES
-- ------------------------------------------------------------------------------
SELECT 
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced,
  CASE 
    WHEN c.relrowsecurity AND c.relforcerowsecurity THEN 'STRICT_ENFORCED (Owner + Non-Owner)'
    WHEN c.relrowsecurity AND NOT c.relforcerowsecurity THEN 'ACTIVE (Non-Owner Roles Enforced; Owner Bypasses)'
    ELSE 'VULNERABLE (RLS Disabled)'
  END AS rls_security_status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'schools',
    'profiles',
    'students',
    'teachers',
    'classes',
    'attendance',
    'timetable',
    'fee_ledger',
    'fee_reversal_requests',
    'payment_orders',
    'pdf_jobs',
    'audit_logs',
    'homework',
    'notifications',
    'notices'
  )
ORDER BY c.relname;


-- ------------------------------------------------------------------------------
-- 2. COMPLETE ROW LEVEL SECURITY POLICY INVENTORY ACROSS SENSITIVE TABLES
-- ------------------------------------------------------------------------------
SELECT 
  p.tablename,
  p.policyname,
  p.permissive,
  p.roles,
  p.cmd AS operation,
  p.qual AS using_expression,
  p.with_check AS with_check_expression
FROM pg_policies p
WHERE p.schemaname = 'public'
  AND p.tablename IN (
    'schools',
    'profiles',
    'students',
    'teachers',
    'classes',
    'attendance',
    'timetable',
    'fee_ledger',
    'fee_reversal_requests',
    'payment_orders',
    'pdf_jobs',
    'audit_logs',
    'homework',
    'notifications',
    'notices'
  )
ORDER BY p.tablename, p.cmd, p.policyname;


-- ------------------------------------------------------------------------------
-- 3. PERMISSIVE POLICY COLLISION AUDIT (Detects Unintended OR-Bypasses)
-- In PostgreSQL, multiple PERMISSIVE policies on the same table and command
-- combine using logical OR. This query identifies tables with multiple permissive
-- policies on the same command to detect accidental cross-tenant union leaks.
-- ------------------------------------------------------------------------------
SELECT 
  tablename,
  cmd AS command,
  count(*) AS permissive_policy_count,
  array_agg(policyname) AS active_policies,
  CASE 
    WHEN count(*) > 1 THEN 'MULTIPLE_PERMISSIVE_POLICIES (Audit for union bypasses)'
    ELSE 'CANONICAL_SINGLE_AUTHORITY (Clean)'
  END AS conflict_assessment
FROM pg_policies
WHERE schemaname = 'public'
  AND permissive = 'PERMISSIVE'
  AND tablename IN (
    'schools',
    'profiles',
    'students',
    'teachers',
    'classes',
    'attendance',
    'timetable',
    'fee_ledger',
    'fee_reversal_requests',
    'payment_orders',
    'pdf_jobs',
    'audit_logs',
    'homework',
    'notifications',
    'notices'
  )
GROUP BY tablename, cmd
ORDER BY count(*) DESC, tablename;


-- ------------------------------------------------------------------------------
-- 4. TABLE-LEVEL PRIVILEGES & DIRECT DML GRANTS AUDIT
-- ------------------------------------------------------------------------------
SELECT 
  table_name,
  grantee,
  string_agg(privilege_type, ', ' ORDER BY privilege_type) AS granted_privileges
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name IN (
    'schools',
    'profiles',
    'students',
    'teachers',
    'classes',
    'attendance',
    'timetable',
    'fee_ledger',
    'fee_reversal_requests',
    'payment_orders',
    'pdf_jobs',
    'audit_logs',
    'homework',
    'notifications',
    'notices'
  )
  AND grantee IN ('anon', 'authenticated', 'public')
GROUP BY table_name, grantee
ORDER BY table_name, grantee;


-- ------------------------------------------------------------------------------
-- 5. COLUMN-LEVEL PRIVILEGE AUDIT (Payment Orders Payload Protection Check)
-- ------------------------------------------------------------------------------
SELECT 
  table_name,
  column_name,
  grantee,
  privilege_type
FROM information_schema.column_privileges
WHERE table_schema = 'public'
  AND table_name = 'payment_orders'
  AND grantee IN ('anon', 'authenticated', 'public')
ORDER BY column_name, grantee;


-- ------------------------------------------------------------------------------
-- 6. SECURITY DEFINER ROUTINE EXECUTE PRIVILEGES & SEARCH_PATH AUDIT
-- ------------------------------------------------------------------------------
SELECT 
  r.routine_name,
  r.routine_type,
  r.security_type,
  p.grantee,
  p.privilege_type
FROM information_schema.routines r
LEFT JOIN information_schema.routine_privileges p
  ON p.routine_name = r.routine_name 
  AND p.routine_schema = r.routine_schema
WHERE r.routine_schema = 'public'
  AND r.routine_name IN (
    'provision_institutional_school',
    'set_school_license_status',
    'get_master_schools_roster',
    'renew_school_subscription',
    'claim_next_pdf_job',
    'request_fee_reversal',
    'approve_fee_reversal',
    'reject_fee_reversal',
    'reverse_fee_entry',
    'get_auth_role',
    'get_current_tenant_uuid',
    'get_current_tenant_code',
    'get_current_tenant_id',
    'is_admin_or_executive',
    'is_financial_manager',
    'is_teacher',
    'is_active_operator',
    'log_audit_event',
    'protect_profile_privileged_columns'
  )
  AND (p.grantee IN ('anon', 'authenticated', 'public', 'service_role') OR p.grantee IS NULL)
ORDER BY r.routine_name, p.grantee;

