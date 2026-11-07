import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { safeStorage, safeSession } from "../src/utils/safeStorage.js";
import { dashboardFor, normalizeRole } from "../src/utils/credentials.js";
import {
  PREDEFINED_PROMPTS_CATALOG,
  executePredefinedPrompt,
} from "../src/utils/aiIntelligenceEngine.js";
import {
  getCalendarEvents,
  saveCalendarEvents,
  normalizeDateString,
  parseSparseCalendarCsv,
  formatDisplayDate,
} from "../src/utils/calendarService.js";
import { DEFAULT_PDF_TEMPLATES } from "../src/utils/pdfTemplateService.js";

test("Bug 1: Administration & Audit Route & Sidebar Removal", async (t) => {
  await t.test("Sidebar.jsx does not contain incomplete 'Administration & Audit' entry", () => {
    const sidebarCode = fs.readFileSync(path.resolve("src/Components/Sidebar.jsx"), "utf8");
    assert.strictEqual(
      sidebarCode.includes("Administration & Audit"),
      false,
      "Sidebar must not contain the removed 'Administration & Audit' link"
    );
  });

  await t.test("Sidebar.jsx does not link to incomplete /admin/dashboard for principal or trustee", () => {
    const sidebarCode = fs.readFileSync(path.resolve("src/Components/Sidebar.jsx"), "utf8");
    assert.strictEqual(
      sidebarCode.includes('path: "/admin/dashboard"'),
      false,
      "Sidebar must not route any role to the incomplete /admin/dashboard"
    );
  });

  await t.test("App.jsx redirects /admin/dashboard to /principal/dashboard", () => {
    const appCode = fs.readFileSync(path.resolve("src/App.jsx"), "utf8");
    assert.ok(
      appCode.includes('path="/admin/dashboard" element={<Navigate to="/principal/dashboard" replace />}') ||
      appCode.includes('path="/admin/dashboard" element={<Navigate to="/principal/dashboard"'),
      "App.jsx must redirect /admin/dashboard to /principal/dashboard"
    );
  });

  await t.test("dashboardFor('admin') returns /principal/dashboard instead of /admin/dashboard", () => {
    assert.strictEqual(dashboardFor("admin"), "/principal/dashboard");
    assert.strictEqual(dashboardFor("super_admin"), "/principal/dashboard");
  });
});

test("Bug 2: Mobile SafeStorage & SecurityError Fallback Resilience", async (t) => {
  await t.test("safeStorage performs in-memory storage operations without throwing", () => {
    safeStorage.setItem("test_key_01", "hello_world");
    assert.strictEqual(safeStorage.getItem("test_key_01"), "hello_world");
    safeStorage.removeItem("test_key_01");
    assert.strictEqual(safeStorage.getItem("test_key_01"), null);
  });

  await t.test("safeStorage handles JSON serialization safely", () => {
    const payload = { school: "DEMO-01", count: 42, active: true };
    const success = safeStorage.setJSON("test_json", payload);
    assert.strictEqual(success, true);
    const parsed = safeStorage.getJSON("test_json");
    assert.deepStrictEqual(parsed, payload);
    safeStorage.removeItem("test_json");
  });

  await t.test("safeStorage handles corrupt JSON without throwing", () => {
    safeStorage.setItem("test_corrupt", "not_valid_json{");
    const parsed = safeStorage.getJSON("test_corrupt", { fallback: true });
    assert.deepStrictEqual(parsed, { fallback: true });
    safeStorage.removeItem("test_corrupt");
  });

  await t.test("main.jsx imports safeStorage as first module to install early polyfill", () => {
    const mainCode = fs.readFileSync(path.resolve("src/main.jsx"), "utf8");
    const lines = mainCode.split("\n").map((l) => l.trim()).filter(Boolean);
    assert.ok(
      lines[0].includes("safeStorage"),
      "main.jsx must import safeStorage on line 1 before any other module"
    );
  });

  await t.test("supabaseClient passes safeStorage to auth options", () => {
    const clientCode = fs.readFileSync(path.resolve("src/supabaseClient.js"), "utf8");
    assert.ok(
      clientCode.includes("storage: safeStorage"),
      "supabaseClient must pass safeStorage to createClient auth config"
    );
  });
});

test("Feature: Principal's AI Briefing 25 Predefined Prompts & Zero-Hallucination Telemetry", async (t) => {
  await t.test("PREDEFINED_PROMPTS_CATALOG contains exactly 25 prompts across 6 core categories", () => {
    assert.strictEqual(PREDEFINED_PROMPTS_CATALOG.length, 25);
    const categories = new Set(PREDEFINED_PROMPTS_CATALOG.map((p) => p.categoryKey));
    assert.ok(categories.has("fees"), "Must have fees category");
    assert.ok(categories.has("attendance"), "Must have attendance category");
    assert.ok(categories.has("academics"), "Must have academics category");
    assert.ok(categories.has("exams"), "Must have exams category");
    assert.ok(categories.has("operations"), "Must have operations category");
    assert.ok(categories.has("staff"), "Must have staff category");

    const feesPrompts = PREDEFINED_PROMPTS_CATALOG.filter((p) => p.categoryKey === "fees");
    const attPrompts = PREDEFINED_PROMPTS_CATALOG.filter((p) => p.categoryKey === "attendance");
    const acadPrompts = PREDEFINED_PROMPTS_CATALOG.filter((p) => p.categoryKey === "academics");
    const examPrompts = PREDEFINED_PROMPTS_CATALOG.filter((p) => p.categoryKey === "exams");
    const opsPrompts = PREDEFINED_PROMPTS_CATALOG.filter((p) => p.categoryKey === "operations");
    const staffPrompts = PREDEFINED_PROMPTS_CATALOG.filter((p) => p.categoryKey === "staff");

    assert.strictEqual(feesPrompts.length, 5, "Fees category must have 5 prompts");
    assert.strictEqual(attPrompts.length, 5, "Attendance category must have 5 prompts");
    assert.strictEqual(acadPrompts.length, 5, "Academics category must have 5 prompts");
    assert.strictEqual(examPrompts.length, 3, "Exams category must have 3 prompts");
    assert.strictEqual(opsPrompts.length, 4, "Operations category must have 4 prompts");
    assert.strictEqual(staffPrompts.length, 3, "Staff category must have 3 prompts");
  });

  await t.test("executePredefinedPrompt distinguishes 0 from unavailable data on empty institution", async () => {
    const unpopSchool = "EMPTY-CAMPUS-99";
    const resFee = await executePredefinedPrompt("fee_collection_velocity", unpopSchool);
    assert.strictEqual(resFee.status, "no_data");
    assert.ok(resFee.headline.includes("No Fee Invoices") || resFee.headline.includes("Zero Receipts"));

    const resAtt = await executePredefinedPrompt("att_campus_average", unpopSchool);
    assert.strictEqual(resAtt.status, "no_data");
    assert.ok(resAtt.headline.includes("No Attendance Registers"));

    const resRisk = await executePredefinedPrompt("acad_risk_radar", unpopSchool);
    assert.strictEqual(resRisk.status, "no_data");
  });

  await t.test("executePredefinedPrompt accurately reports 0 defaults when accounts are settled", async () => {
    // Populate mock settled ledger under safeStorage
    const mockSchool = "SETTLED-SCHOOL-01";
    safeStorage.setItem(
      `erp_directory_${mockSchool}`,
      JSON.stringify([
        { id: "s1", name: "Scholar One", role: "student", roll_number: "S-01", class_name: "Grade 10" },
        { id: "t1", name: "Teacher One", role: "teacher", email: "t1@school.com" },
      ])
    );
    safeStorage.setItem(
      `erp_fee_ledger_${mockSchool}`,
      JSON.stringify([
        { id: "f1", student_id: "s1", roll_number: "S-01", amount: 15000, status: "paid" },
      ])
    );

    const res = await executePredefinedPrompt("fee_high_risk_defaulters", mockSchool);
    assert.strictEqual(res.status, "optimal");
    assert.ok(res.headline.includes("0 High-Risk Default Cases"));

    // Clean up
    safeStorage.removeItem(`erp_directory_${mockSchool}`);
    safeStorage.removeItem(`erp_fee_ledger_${mockSchool}`);
  });

  await t.test("PrincipalAIBriefing.jsx enforces role permissions (PRIN/HOD only)", () => {
    const briefingCode = fs.readFileSync(path.resolve("src/Components/PrincipalAIBriefing.jsx"), "utf8");
    assert.ok(briefingCode.includes('canonicalRole === "PRIN"'));
    assert.ok(briefingCode.includes('canonicalRole === "HOD"'));
    assert.ok(briefingCode.includes("Institutional Intelligence Restricted"));
  });
});

test("Feature: School Logo Replacement Multi-Tenant Engine", async (t) => {
  await t.test("BrandLogo accepts schoolCode and loads tenant specific logo", () => {
    const logoCode = fs.readFileSync(path.resolve("src/Components/BrandLogo.jsx"), "utf8");
    assert.ok(logoCode.includes("schoolCode = null"), "BrandLogo must accept schoolCode prop");
    assert.ok(logoCode.includes("erp_school_logo_"), "BrandLogo must check erp_school_logo_ key");
    assert.ok(logoCode.includes("erp_logo_"), "BrandLogo must check erp_logo_ key");
  });

  await t.test("Login.jsx passes typed institution code to BrandLogo for dynamic preview", () => {
    const loginCode = fs.readFileSync(path.resolve("src/pages/Login.jsx"), "utf8");
    assert.ok(
      loginCode.includes("schoolCode={formData.institutionCode}"),
      "Login.jsx must pass institution code to BrandLogo"
    );
  });

  await t.test("Settings.jsx embeds CustomLogoUploader for institution logo configuration", () => {
    const settingsCode = fs.readFileSync(path.resolve("src/pages/Settings.jsx"), "utf8");
    assert.ok(
      settingsCode.includes("<CustomLogoUploader"),
      "Settings.jsx must embed CustomLogoUploader component"
    );
  });

  await t.test("pdfGenerator.js loads school logo safely from safeStorage", () => {
    const pdfCode = fs.readFileSync(path.resolve("src/utils/pdfGenerator.js"), "utf8");
    assert.ok(
      pdfCode.includes("safeStorage.getItem(`erp_logo_${institutionCode}`)"),
      "pdfGenerator must read custom logo from safeStorage"
    );
  });
});

test("Feature: School Calendar Permissions & Extended Event Types", async (t) => {
  await t.test("calendarService supports Exam, Holiday, Function, PTM, Activity", () => {
    const csvContent = `Date,Title,Category,Time,Visibility,Reason / Details
2026-11-20,Mid-Term Math Exam,Exam,09:00 AM - 12:00 PM,Secondary Wing,CBT window
2026-11-25,Parent-Teacher Conference,PTM,10:00 AM - 02:00 PM,All School,Academic review
2026-11-28,Sports Day Track Meet,Activity,08:30 AM - 01:00 PM,All School,Athletics`;

    const parsed = parseSparseCalendarCsv(csvContent);
    assert.strictEqual(parsed.length, 3);
    assert.strictEqual(parsed[0].category, "Exam");
    assert.strictEqual(parsed[1].category, "PTM");
    assert.strictEqual(parsed[2].category, "Activity");
    assert.strictEqual(parsed[0].time, "09:00 AM - 12:00 PM");
    assert.strictEqual(parsed[0].visibility, "Secondary Wing");
  });

  await t.test("AcademicCalendar.jsx restricts write controls to PRIN and HOD", () => {
    const calCode = fs.readFileSync(path.resolve("src/pages/AcademicCalendar.jsx"), "utf8");
    assert.ok(calCode.includes('canonicalRole === "PRIN"'));
    assert.ok(calCode.includes('canonicalRole === "HOD"'));
    assert.ok(calCode.includes("canManageCalendar"));
    assert.ok(calCode.includes("View-Only Calendar Schedule"));
  });

  await t.test("calendarService saves and retrieves events using safeStorage", () => {
    const testSchool = "CAL-TEST-01";
    const testEvents = [
      { id: "e1", date: "2026-12-25", title: "Christmas Holiday", category: "Holiday", time: "All Day", visibility: "All School" },
    ];
    saveCalendarEvents(testSchool, testEvents);
    const retrieved = getCalendarEvents(testSchool);
    assert.strictEqual(retrieved.length, 1);
    assert.strictEqual(retrieved[0].title, "Christmas Holiday");
    safeStorage.removeItem(`erp_calendar_${testSchool}`);
  });
});

test("Feature: Custom PDF Document Templates & Preview Architecture", async (t) => {
  await t.test("DEFAULT_PDF_TEMPLATES contains feeReceipt and reportCard configurations", () => {
    assert.ok(DEFAULT_PDF_TEMPLATES.feeReceipt);
    assert.ok(DEFAULT_PDF_TEMPLATES.reportCard);
    assert.strictEqual(DEFAULT_PDF_TEMPLATES.feeReceipt.receiptPrefix, "REC");
    assert.strictEqual(DEFAULT_PDF_TEMPLATES.reportCard.academicYear, "2025-2026");
  });

  await t.test("Settings.jsx embeds CustomPdfTemplateManager", () => {
    const settingsCode = fs.readFileSync(path.resolve("src/pages/Settings.jsx"), "utf8");
    assert.ok(
      settingsCode.includes("<CustomPdfTemplateManager"),
      "Settings.jsx must embed CustomPdfTemplateManager"
    );
  });

  await t.test("CustomPdfTemplateManager supports preview modal and sample uploads", () => {
    const mgrCode = fs.readFileSync(path.resolve("src/Components/CustomPdfTemplateManager.jsx"), "utf8");
    assert.ok(mgrCode.includes("previewModalOpen"));
    assert.ok(mgrCode.includes("handleSampleFileUpload"));
    assert.ok(mgrCode.includes("erp_pdf_template_"));
  });
});

test("Deployment Pipeline: CI Workflow Hardening & Secrets Purge", async (t) => {
  await t.test("deploy.yml does not swallow linter or test errors with '|| true'", () => {
    const workflowCode = fs.readFileSync(path.resolve(".github/workflows/deploy.yml"), "utf8");
    assert.strictEqual(
      workflowCode.includes("npm run lint || true"),
      false,
      "Linter must fail closed without '|| true'"
    );
    assert.strictEqual(
      workflowCode.includes("npm run test:e2e || true"),
      false,
      "E2E test step must fail closed without '|| true'"
    );
  });

  await t.test("deploy.yml executes automated test suite before build", () => {
    const workflowCode = fs.readFileSync(path.resolve(".github/workflows/deploy.yml"), "utf8");
    assert.ok(
      workflowCode.includes("npm test"),
      "Workflow must run 'npm test' in CI"
    );
  });

  await t.test("package.json contains automated test script", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve("package.json"), "utf8"));
    assert.ok(pkg.scripts.test, "package.json must define 'test' script");
  });
});
