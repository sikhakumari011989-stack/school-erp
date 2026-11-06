import os

ROOT = r"c:\Users\Astik\school-app"
OUTPUT_FILE = os.path.join(ROOT, "ACADEMIC_OS_TEXT_REVIEW_BUNDLE.txt")

FILES = [
    ("1. MVP_READINESS_REPORT.md", "MVP_READINESS_REPORT.md"),
    ("2. UNRESOLVED_ISSUES.md", "UNRESOLVED_ISSUES.md"),
    ("3. STAGING_MIGRATION_RUNBOOK.md", "STAGING_MIGRATION_RUNBOOK.md"),
    ("4. ENVIRONMENT_VARIABLES_GUIDE.md", "ENVIRONMENT_VARIABLES_GUIDE.md"),
    ("5. migrations/21_security_and_financial_hardening.sql", "supabase/migrations/21_security_and_financial_hardening.sql"),
    ("6. migrations/22_phase2_security_and_rls_hardening.sql", "supabase/migrations/22_phase2_security_and_rls_hardening.sql"),
    ("7. migrations/23_sales_readiness_and_subscription_hardening.sql", "supabase/migrations/23_sales_readiness_and_subscription_hardening.sql"),
    ("8. tests/staging-database-verification.sql", "tests/staging-database-verification.sql"),
]

with open(OUTPUT_FILE, "w", encoding="utf-8") as out:
    out.write("=" * 80 + "\n")
    out.write("ACADEMIC OS — COMPLETE TEXT-ONLY REVIEW BUNDLE (ALL 8 FILES)\n")
    out.write("Generated for Independent Technical Review\n")
    out.write("=" * 80 + "\n\n")

    for label, rel_path in FILES:
        full_path = os.path.join(ROOT, rel_path)
        out.write("\n" + "#" * 80 + "\n")
        out.write(f"### FILE: {label} (Relative Path: {rel_path})\n")
        out.write("#" * 80 + "\n\n")
        with open(full_path, "r", encoding="utf-8") as fp:
            content = fp.read()
            out.write(content)
        out.write("\n\n")

print(f"Created {OUTPUT_FILE} with size {os.path.getsize(OUTPUT_FILE)} bytes.")

