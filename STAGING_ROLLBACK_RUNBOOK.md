# ACADEMIC OS — SAFE STAGING ROLLBACK & RECOVERY RUNBOOK
**Target Environment:** Supabase PostgreSQL Staging  
**Document Classification:** Operational Safety Manual  
**Status:** MVP Final  

---

## 1. Rollback Philosophy & Data Preservation Guarantee

The rollback procedure is designed to be **non-destructive to institutional business and audit data**:
- **Triggers & Functions:** Hardened `SECURITY DEFINER` functions and triggers are dropped cleanly in reverse dependency order.
- **Data Preservation:** Core transactional and compliance tables are **never dropped**:
  - `public.fee_ledger` is preserved with all transaction history.
  - `public.fee_reversal_requests` is preserved to maintain auditability of financial requests.
  - `public.audit_logs` is preserved to ensure permanent compliance records under DPDP Act 2023.
  - `public.payment_orders` is preserved to prevent losing payment tracking.
- **Tenant Lease Safety:** Tenant isolation in `claim_next_pdf_job` is maintained; wide-open unisolated versions are never restored.

---

## 2. Pre-Rollback Preflight Checklist

Before executing rollback:
1. Log in to [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your staging project.
3. Verify database backup status under **Settings** -> **Database** -> **Backups**.
4. Run preflight verification in **SQL Editor**:
   ```sql
   SELECT count(*) AS total_transactions FROM public.fee_ledger;
   SELECT count(*) AS total_audit_entries FROM public.audit_logs;
   ```

---

## 3. Sequential Execution Steps

### Step 3.1: Open Supabase SQL Editor
1. In the Supabase Dashboard navigation, click **SQL Editor**.
2. Click **New Query**.

### Step 3.2: Execute `rollback_21_22_23.sql`
1. Copy the contents of [`supabase/migrations/rollback_21_22_23.sql`](file:///c:/Users/Astik/school-app/supabase/migrations/rollback_21_22_23.sql).
2. Paste the script into the query editor and click **Run**.
3. Confirm output message:
   `NOTICE: SAFE ROLLBACK COMPLETED SUCCESSFULLY. DATABASE RESTORED SAFELY.`

---

## 4. Post-Rollback Sanity Verification

Run the following query to confirm that triggers and functions were dropped, while tables remain intact:

```sql
DO $$
BEGIN
  -- Verify tables still exist
  ASSERT (SELECT count(*) FROM information_schema.tables WHERE table_name = 'fee_ledger') = 1, 'fee_ledger missing';
  ASSERT (SELECT count(*) FROM information_schema.tables WHERE table_name = 'audit_logs') = 1, 'audit_logs missing';
  ASSERT (SELECT count(*) FROM information_schema.tables WHERE table_name = 'fee_reversal_requests') = 1, 'fee_reversal_requests missing';
  
  -- Verify triggers were dropped cleanly
  ASSERT (SELECT count(*) FROM information_schema.triggers WHERE trigger_name = 'trg_audit_fee_ledger') = 0, 'trg_audit_fee_ledger not dropped';
  ASSERT (SELECT count(*) FROM information_schema.triggers WHERE trigger_name = 'trg_protect_profile_privileged_columns') = 0, 'profile trigger not dropped';

  RAISE NOTICE 'POST-ROLLBACK VERIFICATION SUCCESS: All historical tables intact, triggers cleanly dropped.';
END $$;
```

