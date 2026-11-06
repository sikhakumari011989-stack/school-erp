import os
import zipfile
import hashlib
import shutil

ROOT = os.path.abspath(r"c:\Users\Astik\school-app")
ZIP_NAME = "academic-os-final-mvp.zip"
TARGET_ZIP = os.path.join(ROOT, ZIP_NAME)

FILES_MAP = {
    # migrations/
    "supabase/migrations/01_rls_policies.sql": "migrations/01_rls_policies.sql",
    "supabase/migrations/02_pre_commercial_hardening.sql": "migrations/02_pre_commercial_hardening.sql",
    "supabase/migrations/03_rls_hardening.sql": "migrations/03_rls_hardening.sql",
    "supabase/migrations/18_auth_identity_and_profiles_rls_hardening.sql": "migrations/18_auth_identity_and_profiles_rls_hardening.sql",
    "supabase/migrations/19_master_setup_and_licensing.sql": "migrations/19_master_setup_and_licensing.sql",
    "supabase/migrations/20_class_test_marks.sql": "migrations/20_class_test_marks.sql",
    "supabase/migrations/21_security_and_financial_hardening.sql": "migrations/21_security_and_financial_hardening.sql",
    "supabase/migrations/22_phase2_security_and_rls_hardening.sql": "migrations/22_phase2_security_and_rls_hardening.sql",
    "supabase/migrations/23_sales_readiness_and_subscription_hardening.sql": "migrations/23_sales_readiness_and_subscription_hardening.sql",
    # rollback/
    "supabase/migrations/rollback_21_22_23.sql": "rollback/rollback_21_22_23.sql",
    # verification/
    "tests/staging-database-verification.sql": "verification/staging-database-verification.sql",
    "scripts/inspect-database-schema.sql": "verification/inspect-database-schema.sql",
    # security-tests/
    "tests/security-authorization.test.js": "security-tests/security-authorization.test.js",
    "tests/class-test-marks.test.js": "security-tests/class-test-marks.test.js",
    # guides/
    "STAGING_MIGRATION_RUNBOOK.md": "guides/STAGING_MIGRATION_RUNBOOK.md",
    "STAGING_ROLLBACK_RUNBOOK.md": "guides/STAGING_ROLLBACK_RUNBOOK.md",
    "ENVIRONMENT_VARIABLES_GUIDE.md": "guides/ENVIRONMENT_VARIABLES_GUIDE.md",
    "OWNER_ACTIONS.md": "guides/OWNER_ACTIONS.md",
    "DEPLOYMENT_GUIDE.md": "guides/DEPLOYMENT_GUIDE.md",
    "SUPABASE_SETUP_GUIDE.md": "guides/SUPABASE_SETUP_GUIDE.md",
    "SCHOOL_ONBOARDING_GUIDE.md": "guides/SCHOOL_ONBOARDING_GUIDE.md",
    "BACKUP_AND_RECOVERY.md": "guides/BACKUP_AND_RECOVERY.md",
    # reports/
    "MVP_READINESS_REPORT.md": "reports/MVP_READINESS_REPORT.md",
    "DEFERRED_FEATURES.md": "reports/DEFERRED_FEATURES.md",
    "SALES_READINESS_REPORT.md": "reports/SALES_READINESS_REPORT.md",
    "STAGING_TEST_RESULTS.md": "reports/STAGING_TEST_RESULTS.md",
    "BUILD_AND_TEST_RESULTS.md": "reports/BUILD_AND_TEST_RESULTS.md",
    "UNRESOLVED_ISSUES.md": "reports/UNRESOLVED_ISSUES.md",
    # root docs
    "MVP_READINESS_REPORT.md": "MVP_READINESS_REPORT.md",
    "DEFERRED_FEATURES.md": "DEFERRED_FEATURES.md",
    "STAGING_MIGRATION_RUNBOOK.md": "STAGING_MIGRATION_RUNBOOK.md",
    "STAGING_ROLLBACK_RUNBOOK.md": "STAGING_ROLLBACK_RUNBOOK.md",
    "ENVIRONMENT_VARIABLES_GUIDE.md": "ENVIRONMENT_VARIABLES_GUIDE.md",
}

print(f"Verifying existence of all {len(FILES_MAP)} files...")
missing = []
for src in FILES_MAP:
    full_src = os.path.join(ROOT, src)
    if not os.path.exists(full_src):
        missing.append(full_src)

if missing:
    print("ERROR: Missing files:")
    for m in missing:
        print("  -", m)
    exit(1)

print("All files present. Building ZIP archive...")
with zipfile.ZipFile(TARGET_ZIP, "w", compression=zipfile.ZIP_DEFLATED) as zf:
    for src, arcname in FILES_MAP.items():
        full_src = os.path.join(ROOT, src)
        zf.write(full_src, arcname)
        print(f"  Added: {arcname} ({os.path.getsize(full_src)} bytes)")

# Test integrity
with zipfile.ZipFile(TARGET_ZIP, "r") as zf:
    bad_file = zf.testzip()
    if bad_file:
        print(f"ERROR: Corrupted file in zip: {bad_file}")
        exit(1)
    file_list = zf.namelist()
    print(f"\nZIP archive integrity verified. Total files in zip: {len(file_list)}")

# Calculate SHA-256
sha256 = hashlib.sha256()
with open(TARGET_ZIP, "rb") as f:
    while chunk := f.read(65536):
        sha256.update(chunk)

digest = sha256.hexdigest()
size_bytes = os.path.getsize(TARGET_ZIP)

print(f"\nArchive: {TARGET_ZIP}")
print(f"Size: {size_bytes} bytes ({size_bytes / 1024:.2f} KB)")
print(f"SHA-256: {digest}")

# Copy to additional user-accessible locations
DESTINATIONS = [
    r"C:\Users\Astik\.gemini\antigravity\brain\a04632d4-57d0-466e-a6a7-8a6c0a9030fa\academic-os-final-mvp.zip",
    r"C:\Users\Astik\Downloads\academic-os-final-mvp.zip",
    r"C:\Users\Astik\OneDrive\Desktop\academic-os-final-mvp.zip",
]

print("\nCopying archive to user-accessible locations:")
for dest in DESTINATIONS:
    dest_dir = os.path.dirname(dest)
    if os.path.exists(dest_dir):
        shutil.copy2(TARGET_ZIP, dest)
        print(f"  Copied to: {dest}")
    else:
        print(f"  Skipped (directory not found): {dest}")

print("\nFinal MVP packaging completed successfully.")

