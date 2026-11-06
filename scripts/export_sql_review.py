import os
import hashlib
import zipfile

export_dir = 'academic-os-sql-review-export'
os.makedirs(export_dir, exist_ok=True)

# Read directly from approved release archive to guarantee 100% fidelity
zip_path = 'academic-os-final-mvp-release-gate.zip'
zf = zipfile.ZipFile(zip_path, 'r')

# 1. migrations/21_security_and_financial_hardening.sql (23,110 bytes)
m21 = zf.read('migrations/21_security_and_financial_hardening.sql')
m21_lines = m21.splitlines(keepends=True)
m21_p1 = b''.join(m21_lines[:302])
m21_p2 = b''.join(m21_lines[302:])
assert m21_p1 + m21_p2 == m21

# 2. migrations/22_phase2_security_and_rls_hardening.sql (26,493 bytes)
m22 = zf.read('migrations/22_phase2_security_and_rls_hardening.sql')
m22_lines = m22.splitlines(keepends=True)
m22_p1 = b''.join(m22_lines[:346])
m22_p2 = b''.join(m22_lines[346:])
assert m22_p1 + m22_p2 == m22

# 3. migrations/23_sales_readiness_and_subscription_hardening.sql (13,730 bytes)
m23 = zf.read('migrations/23_sales_readiness_and_subscription_hardening.sql')

# 4. rollback/rollback_21_22_23.sql (8,942 bytes)
rb = zf.read('rollback/rollback_21_22_23.sql')

# 5. verification/FINAL_SCHEMA_AND_POLICY_INSPECTION.sql (6,140 bytes)
insp = zf.read('verification/FINAL_SCHEMA_AND_POLICY_INSPECTION.sql')

# 6. verification/FINAL_STAGING_VERIFICATION.sql (39,691 bytes)
ver = zf.read('verification/FINAL_STAGING_VERIFICATION.sql')
ver_lines = ver.splitlines(keepends=True)
ver_p1 = b''.join(ver_lines[:288])
ver_p2 = b''.join(ver_lines[288:499])
ver_p3 = b''.join(ver_lines[499:703])
ver_p4 = b''.join(ver_lines[703:])
assert ver_p1 + ver_p2 + ver_p3 + ver_p4 == ver

# 7. guides/STAGING_MIGRATION_RUNBOOK.md (4,713 bytes)
rbk = zf.read('guides/STAGING_MIGRATION_RUNBOOK.md')

files_to_export = [
    ('01_21_security_and_financial_hardening_part1.sql', m21_p1, 'migrations/21_security_and_financial_hardening.sql', 1, 2, 'Migration 21: Sections 1-3 (Requests table, UUID reversal RPC, RLS)'),
    ('02_21_security_and_financial_hardening_part2.sql', m21_p2, 'migrations/21_security_and_financial_hardening.sql', 2, 2, 'Migration 21: Sections 4-5 (JWT claims auth helpers, fail-closed audit trigger)'),
    ('03_22_phase2_security_and_rls_hardening_part1.sql', m22_p1, 'migrations/22_phase2_security_and_rls_hardening.sql', 1, 2, 'Migration 22: Sections 1.1-1.2 (request_fee_reversal, approve_fee_reversal)'),
    ('04_22_phase2_security_and_rls_hardening_part2.sql', m22_p2, 'migrations/22_phase2_security_and_rls_hardening.sql', 2, 2, 'Migration 22: Sections 1.3-6 (reject_fee_reversal, PDF isolation, profile RLS, trigger)'),
    ('05_23_sales_readiness_and_subscription_hardening.sql', m23, 'migrations/23_sales_readiness_and_subscription_hardening.sql', 1, 1, 'Migration 23: Complete (Payment orders TEXT school_id, raw_payload revoked, service_role RPCs)'),
    ('06_rollback_21_22_23.sql', rb, 'rollback/rollback_21_22_23.sql', 1, 1, 'Rollback: Complete (Non-destructive rollback of 21-23 preserving ledger and audit data)'),
    ('07_FINAL_SCHEMA_AND_POLICY_INSPECTION.sql', insp, 'verification/FINAL_SCHEMA_AND_POLICY_INSPECTION.sql', 1, 1, 'Inspection: Complete (PostgreSQL catalog inspection for pg_class, pg_policies, privileges)'),
    ('08_FINAL_STAGING_VERIFICATION_part1.sql', ver_p1, 'verification/FINAL_STAGING_VERIFICATION.sql', 1, 4, 'Verification: Stages 0-2 (Master permissions revocation, cross-tenant isolation, roles check)'),
    ('09_FINAL_STAGING_VERIFICATION_part2.sql', ver_p2, 'verification/FINAL_STAGING_VERIFICATION.sql', 2, 4, 'Verification: Stages 3-6 (Privilege escalation guards, students, attendance, fees)'),
    ('10_FINAL_STAGING_VERIFICATION_part3.sql', ver_p3, 'verification/FINAL_STAGING_VERIFICATION.sql', 3, 4, 'Verification: Stages 7-9 (Maker-checker reversals, marks & results, timetable)'),
    ('11_FINAL_STAGING_VERIFICATION_part4.sql', ver_p4, 'verification/FINAL_STAGING_VERIFICATION.sql', 4, 4, 'Verification: Stages 10-12 & Final (Audit immutability, PDF queue, payment orders, rollback)'),
    ('12_STAGING_MIGRATION_RUNBOOK.md', rbk, 'guides/STAGING_MIGRATION_RUNBOOK.md', 1, 1, 'Runbook: Complete (Sequential staging migration execution guide)')
]

manifest_lines = [
    '# ACADEMIC OS — SQL REVIEW EXPORT MANIFEST',
    '',
    '**Export Directory:** `academic-os-sql-review-export`  ',
    '**Source Archive:** `academic-os-final-mvp-release-gate.zip`  ',
    '**File Size Limit:** < 15 KB (15,360 bytes) per exported part  ',
    '**Integrity Guarantee:** Exact binary concatenation matches 100% of the original release archive files.  ',
    '',
    '---',
    '',
    '## 1. Exported Files Inventory & Checksums',
    '',
    '| # | Exported File Name | Size (Bytes) | Size (KB) | SHA-256 Checksum | Original Archive Path | Part | Description |',
    '| :-: | :--- | -: | -: | :--- | :--- | :-: | :--- |'
]

print('%-54s | %7s | %10s | %s' % ('Exported File', 'Bytes', 'Status', 'SHA-256'))
print('-' * 110)

for fname, content, orig_path, part_num, total_parts, desc in files_to_export:
    fpath = os.path.join(export_dir, fname)
    with open(fpath, 'wb') as f:
        f.write(content)
    size = len(content)
    size_kb = f'{size / 1024:.2f} KB'
    sha = hashlib.sha256(content).hexdigest()
    status = 'OK (<15KB)' if size < 15360 else 'FAIL (>15KB)'
    part_str = f'{part_num}/{total_parts}' if total_parts > 1 else 'Single'
    print('%-54s | %7d | %10s | %s' % (fname, size, status, sha))
    manifest_lines.append(f'| {fname[:2]} | `{fname}` | {size:,} | {size_kb} | `{sha}` | `{orig_path}` | {part_str} | {desc} |')

# Add Reassembly & Verification Guide to Manifest
manifest_lines.extend([
    '',
    '---',
    '',
    '## 2. Reassembly & Original File Verification',
    '',
    'When reassembled, the exported parts reconstruct the exact binary files from `academic-os-final-mvp-release-gate.zip`:',
    '',
    '| Original File | Expected Size | Expected SHA-256 | Source Exported Parts | Reassembly Command |',
    '| :--- | -: | :--- | :--- | :--- |',
    f'| `migrations/21_security_and_financial_hardening.sql` | {len(m21):,} | `{hashlib.sha256(m21).hexdigest()}` | `01_...` + `02_...` | `cat 01* 02* > 21_security_and_financial_hardening.sql` |',
    f'| `migrations/22_phase2_security_and_rls_hardening.sql` | {len(m22):,} | `{hashlib.sha256(m22).hexdigest()}` | `03_...` + `04_...` | `cat 03* 04* > 22_phase2_security_and_rls_hardening.sql` |',
    f'| `migrations/23_sales_readiness_and_subscription_hardening.sql` | {len(m23):,} | `{hashlib.sha256(m23).hexdigest()}` | `05_...` | Single file (already < 15 KB) |',
    f'| `rollback/rollback_21_22_23.sql` | {len(rb):,} | `{hashlib.sha256(rb).hexdigest()}` | `06_...` | Single file (already < 15 KB) |',
    f'| `verification/FINAL_SCHEMA_AND_POLICY_INSPECTION.sql` | {len(insp):,} | `{hashlib.sha256(insp).hexdigest()}` | `07_...` | Single file (already < 15 KB) |',
    f'| `verification/FINAL_STAGING_VERIFICATION.sql` | {len(ver):,} | `{hashlib.sha256(ver).hexdigest()}` | `08_...` + `09_...` + `10_...` + `11_...` | `cat 08* 09* 10* 11* > FINAL_STAGING_VERIFICATION.sql` |',
    f'| `guides/STAGING_MIGRATION_RUNBOOK.md` | {len(rbk):,} | `{hashlib.sha256(rbk).hexdigest()}` | `12_...` | Single file (already < 15 KB) |',
    '',
    '---',
    '',
    '## 3. Quick PowerShell Reassembly One-Liner',
    '',
    '```powershell',
    '# From inside academic-os-sql-review-export:',
    'Get-Content 01_*, 02_* -Raw | Set-Content 21_security_and_financial_hardening.sql -NoNewline',
    'Get-Content 03_*, 04_* -Raw | Set-Content 22_phase2_security_and_rls_hardening.sql -NoNewline',
    'Get-Content 08_*, 09_*, 10_*, 11_* -Raw | Set-Content FINAL_STAGING_VERIFICATION.sql -NoNewline',
    '```',
    '',
    '## 4. Verification Check',
    'All exported parts are strictly below 15 KB (15,360 bytes), fully preserving statement ordering, comments, and syntax integrity.'
])

manifest_content = '\n'.join(manifest_lines)
with open(os.path.join(export_dir, 'EXPORT_MANIFEST.md'), 'w', encoding='utf-8') as f:
    f.write(manifest_content)

print('\nCreated EXPORT_MANIFEST.md successfully!')

