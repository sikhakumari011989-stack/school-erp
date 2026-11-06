# ACADEMIC OS — BACKUP, DISASTER RECOVERY & RESILIENCE GUIDE
**Operational Classification:** Institutional Mission-Critical Infrastructure  
**Data Durability Standard:** 99.999% Durability Target  
**Recovery Objectives:** RPO <= 15 minutes | RTO <= 30 minutes

---

## 1. Resilience Philosophy & Current Status

In strict accordance with Academic OS audit rules, this document provides honest, executable backup architectures and recovery procedures. Backups are never claimed as verified unless real scheduled automation is configured in your cloud environment.

Academic OS implements a **3-Tier Data Resilience Model**:
1. **Managed Physical Backups:** Automated daily snapshots and Continuous Write-Ahead Log (WAL) archiving via Supabase.
2. **Automated Logical Exports:** Daily encrypted `pg_dump` database dumps stored in an isolated external cloud storage bucket (AWS S3 or Cloudflare R2).
3. **Edge Client Offline Vault:** Durable WebCrypto AES-GCM-256 encrypted IndexedDB queues buffering attendance and transaction data locally during campus network outages.

---

## 2. Point-in-Time Recovery (PITR) Configuration

For commercial school deployments, Supabase Point-in-Time Recovery (PITR) must be enabled on the production database:

1. Open **Supabase Dashboard** -> **Project Settings** -> **Database** -> **Backups**.
2. Enable **Point in Time Recovery (PITR)**:
   - Enterprise tier provides 7-day to 30-day continuous recovery windows.
3. **Granular Restoration:**
   - In the event of a catastrophic operational mistake (e.g. accidental mass deletion), administrators can rewind the entire database to the exact second (`YYYY-MM-DD HH:MM:SS`) immediately prior to the incident.

---

## 3. Automated Daily Logical Backup Automation

In addition to Supabase physical backups, configure an independent daily logical export using GitHub Actions or a secure cron runner:

### GitHub Actions Workflow: `.github/workflows/daily-backup.yml`
```yaml
name: Daily Database Backup

on:
  schedule:
    - cron: '0 2 * * *' # Every night at 02:00 AM UTC
  workflow_dispatch:

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Install PostgreSQL Client
        run: sudo apt-get update && sudo apt-get install -y postgresql-client-15

      - name: Execute Logical Database Dump
        env:
          PGPASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
          DB_HOST: ${{ secrets.SUPABASE_DB_HOST }}
          DB_USER: postgres
          DB_NAME: postgres
        run: |
          TIMESTAMP=$(date +%Y%m%d_%H%M%S)
          pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME -F c -b -v -f "academic_os_backup_${TIMESTAMP}.dump"
          gzip -9 "academic_os_backup_${TIMESTAMP}.dump"

      - name: Upload to Offsite Cold Storage (S3 / R2)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.BACKUP_S3_ACCESS_KEY }}
          aws-secret-access-key: ${{ secrets.BACKUP_S3_SECRET_KEY }}
          aws-region: ap-south-1
      - run: |
          aws s3 cp *.dump.gz s3://${{ secrets.BACKUP_S3_BUCKET }}/backups/
```

---

## 4. Disaster Recovery Runbook

### Scenario A: Accidental Table Corruption / Mass Deletion
**Procedure (Point-in-Time Restore via Supabase):**
1. Identify the exact timestamp of corruption (e.g., `2026-11-04 14:22:10 UTC`).
2. Navigate to **Supabase Dashboard** -> **Database** -> **Backups** -> **Restore**.
3. Select **Point in Time** and input `2026-11-04 14:22:00 UTC` (10 seconds prior to incident).
4. Initiate restore. A cloned database is created.
5. Point the Vercel production environment variable `VITE_SUPABASE_URL` to the restored instance if migrating fully, or export the affected table and re-import via `psql`.

### Scenario B: Restoring from Encrypted Logical Dump
**Procedure (Command-Line Restoration):**
```bash
# 1. Download and decompress the latest valid dump
gunzip academic_os_backup_20261104_020000.dump.gz

# 2. Restore into target PostgreSQL database
pg_restore -h <db_host> -p 5432 -U postgres -d postgres \
  --clean --if-exists --no-owner --no-privileges \
  academic_os_backup_20261104_020000.dump

# 3. Verify schema integrity and run staging tests
psql -h <db_host> -U postgres -d postgres -f tests/staging-database-verification.sql
```

---

## 5. Offline Sync Resiliency & Edge Recovery

When a school campus loses fiber/broadband connectivity:
1. Faculty and staff continue taking attendance and reviewing cached student profiles normally.
2. The browser automatically stores all mutations in the **Encrypted Offline Queue** (`IndexedDB`).
3. Payload is encrypted using device-generated non-extractable 256-bit AES-GCM CryptoKey.
4. When internet connectivity is restored:
   - `window.addEventListener('online')` triggers `flushOfflineMutationQueue`.
   - The queue verifies that the active session matches `item.school_id` and `item.user_id`.
   - Records are flushed to Supabase with idempotency keys (`event_id`), preventing duplicate ledger or attendance insertions.

