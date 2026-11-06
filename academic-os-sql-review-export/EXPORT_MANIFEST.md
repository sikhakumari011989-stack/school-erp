# ACADEMIC OS — SQL REVIEW EXPORT MANIFEST

**Export Directory:** `academic-os-sql-review-export`  
**Source Archive:** `academic-os-final-mvp-release-gate.zip`  
**File Size Limit:** < 15 KB (15,360 bytes) per exported part  
**Integrity Guarantee:** Exact binary concatenation matches 100% of the original release archive files.  

---

## 1. Exported Files Inventory & Checksums

| # | Exported File Name | Size (Bytes) | Size (KB) | SHA-256 Checksum | Original Archive Path | Part | Description |
| :-: | :--- | -: | -: | :--- | :--- | :-: | :--- |
| 01 | `01_21_security_and_financial_hardening_part1.sql` | 11,966 | 11.69 KB | `dbfbf48481c875300258998d3055652ace40abb5f7f87298c62ad97537859640` | `migrations/21_security_and_financial_hardening.sql` | 1/2 | Migration 21: Sections 1-3 (Requests table, UUID reversal RPC, RLS) |
| 02 | `02_21_security_and_financial_hardening_part2.sql` | 11,144 | 10.88 KB | `63d4d814478d88da7baf2431e6fe1ff9b401853879ece4a50ab924a42befa014` | `migrations/21_security_and_financial_hardening.sql` | 2/2 | Migration 21: Sections 4-5 (JWT claims auth helpers, fail-closed audit trigger) |
| 03 | `03_22_phase2_security_and_rls_hardening_part1.sql` | 12,207 | 11.92 KB | `474149bc6f117ea27f0aff5bd0c9cbb031d6550537053d4440f3d5d5e39c9c2e` | `migrations/22_phase2_security_and_rls_hardening.sql` | 1/2 | Migration 22: Sections 1.1-1.2 (request_fee_reversal, approve_fee_reversal) |
| 04 | `04_22_phase2_security_and_rls_hardening_part2.sql` | 14,286 | 13.95 KB | `1b12539974560e1d3d4341f3b4f8049f33b34e43421559d49b8af886a4507a1f` | `migrations/22_phase2_security_and_rls_hardening.sql` | 2/2 | Migration 22: Sections 1.3-6 (reject_fee_reversal, PDF isolation, profile RLS, trigger) |
| 05 | `05_23_sales_readiness_and_subscription_hardening.sql` | 13,730 | 13.41 KB | `2b04e323bf581993209b9223c9df8e324eb07babfd27310f65710e4571431a4a` | `migrations/23_sales_readiness_and_subscription_hardening.sql` | Single | Migration 23: Complete (Payment orders TEXT school_id, raw_payload revoked, service_role RPCs) |
| 06 | `06_rollback_21_22_23.sql` | 8,942 | 8.73 KB | `b00f6b777c55ff5511cac7973210b218409f3377279b9f7ded79000795af50ed` | `rollback/rollback_21_22_23.sql` | Single | Rollback: Complete (Non-destructive rollback of 21-23 preserving ledger and audit data) |
| 07 | `07_FINAL_SCHEMA_AND_POLICY_INSPECTION.sql` | 6,140 | 6.00 KB | `4ae970407cbc5e714c45aabff69d1398945637a98eb6df2c14044ca0cbae5947` | `verification/FINAL_SCHEMA_AND_POLICY_INSPECTION.sql` | Single | Inspection: Complete (PostgreSQL catalog inspection for pg_class, pg_policies, privileges) |
| 08 | `08_FINAL_STAGING_VERIFICATION_part1.sql` | 13,296 | 12.98 KB | `ccaa0289cea95d7df12a98fbea8a608984859c562e03137c8d96e9ce0bae7079` | `verification/FINAL_STAGING_VERIFICATION.sql` | 1/4 | Verification: Stages 0-2 (Master permissions revocation, cross-tenant isolation, roles check) |
| 09 | `09_FINAL_STAGING_VERIFICATION_part2.sql` | 8,596 | 8.39 KB | `6bd425b55915e2094fbdde276bca10be28ebdb71dc81fec8467a58430536dc80` | `verification/FINAL_STAGING_VERIFICATION.sql` | 2/4 | Verification: Stages 3-6 (Privilege escalation guards, students, attendance, fees) |
| 10 | `10_FINAL_STAGING_VERIFICATION_part3.sql` | 9,462 | 9.24 KB | `120c67314a1aab097d24edae062389c2d647cd97a579e28476d53386dca0d6a9` | `verification/FINAL_STAGING_VERIFICATION.sql` | 3/4 | Verification: Stages 7-9 (Maker-checker reversals, marks & results, timetable) |
| 11 | `11_FINAL_STAGING_VERIFICATION_part4.sql` | 8,337 | 8.14 KB | `4b32e9b5cb18190301a294220d225afb7e607d957b1cf081143bb89de7bad037` | `verification/FINAL_STAGING_VERIFICATION.sql` | 4/4 | Verification: Stages 10-12 & Final (Audit immutability, PDF queue, payment orders, rollback) |
| 12 | `12_STAGING_MIGRATION_RUNBOOK.md` | 4,713 | 4.60 KB | `07641099f1b50385d558c932cd4dd58c1d9ffae52b0ac6b1d656845424d880e4` | `guides/STAGING_MIGRATION_RUNBOOK.md` | Single | Runbook: Complete (Sequential staging migration execution guide) |

---

## 2. Reassembly & Original File Verification

When reassembled, the exported parts reconstruct the exact binary files from `academic-os-final-mvp-release-gate.zip`:

| Original File | Expected Size | Expected SHA-256 | Source Exported Parts | Reassembly Command |
| :--- | -: | :--- | :--- | :--- |
| `migrations/21_security_and_financial_hardening.sql` | 23,110 | `b29d4bb2b9ad02680bfef6c425361213add8347c499e5e46890946452b1d5114` | `01_...` + `02_...` | `cat 01* 02* > 21_security_and_financial_hardening.sql` |
| `migrations/22_phase2_security_and_rls_hardening.sql` | 26,493 | `a5da9cb37f6cbdd22156e388601f3c3c4a0819dfc67912d98a141d867de0b13b` | `03_...` + `04_...` | `cat 03* 04* > 22_phase2_security_and_rls_hardening.sql` |
| `migrations/23_sales_readiness_and_subscription_hardening.sql` | 13,730 | `2b04e323bf581993209b9223c9df8e324eb07babfd27310f65710e4571431a4a` | `05_...` | Single file (already < 15 KB) |
| `rollback/rollback_21_22_23.sql` | 8,942 | `b00f6b777c55ff5511cac7973210b218409f3377279b9f7ded79000795af50ed` | `06_...` | Single file (already < 15 KB) |
| `verification/FINAL_SCHEMA_AND_POLICY_INSPECTION.sql` | 6,140 | `4ae970407cbc5e714c45aabff69d1398945637a98eb6df2c14044ca0cbae5947` | `07_...` | Single file (already < 15 KB) |
| `verification/FINAL_STAGING_VERIFICATION.sql` | 39,691 | `5b04e338423115a1d784ce7897117e4dd718bcf7841627ad8a184fd5dc29798e` | `08_...` + `09_...` + `10_...` + `11_...` | `cat 08* 09* 10* 11* > FINAL_STAGING_VERIFICATION.sql` |
| `guides/STAGING_MIGRATION_RUNBOOK.md` | 4,713 | `07641099f1b50385d558c932cd4dd58c1d9ffae52b0ac6b1d656845424d880e4` | `12_...` | Single file (already < 15 KB) |

---

## 3. Quick PowerShell Reassembly One-Liner

```powershell
# From inside academic-os-sql-review-export:
Get-Content 01_*, 02_* -Raw | Set-Content 21_security_and_financial_hardening.sql -NoNewline
Get-Content 03_*, 04_* -Raw | Set-Content 22_phase2_security_and_rls_hardening.sql -NoNewline
Get-Content 08_*, 09_*, 10_*, 11_* -Raw | Set-Content FINAL_STAGING_VERIFICATION.sql -NoNewline
```

## 4. Verification Check
All exported parts are strictly below 15 KB (15,360 bytes), fully preserving statement ordering, comments, and syntax integrity.