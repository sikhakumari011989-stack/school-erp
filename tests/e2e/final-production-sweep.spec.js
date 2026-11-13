import { test, expect } from "@playwright/test";

/**
 * ============================================================================
 * ASTINEX — PRODUCTION READINESS & FULL-SYSTEM MULTI-ROLE E2E VERIFICATION SUITE
 * ============================================================================
 * 
 * Verifies minute-to-minute operational reality across all platform roles:
 * - Test 1 (Master Owner): Entry via Master Setup Barrier with passkey ASK&1412.
 * - Test 2 (Principal/HOD): AI Briefing zero-hallucination & Operational Approval Inbox.
 * - Test 3 (Accountant): Fee Ledger access, Maker-Checker reversal, & PDF Fee Receipt.
 * - Test 4 (Teacher): Attendance marking & Class Tests max_marks ceiling validation.
 * - Test 5 (Student): Peer attendance privacy & Report Card PDF generation.
 * - Test 6 (Non-Teaching Staff): Privilege barrier preventing access to /accountant & /principal.
 */

test.describe("ASTINEX — Comprehensive Production Sweep", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.evaluate(async () => {
      localStorage.clear();
      sessionStorage.clear();
      const { seedMockTenants } = await import("/src/utils/seedMockTenants.js");
      seedMockTenants(true);
    });
  });

  // --------------------------------------------------------------------------
  // TEST 1: MASTER OWNER GATEWAY
  // --------------------------------------------------------------------------
  test("Test 1 (Master Owner): Gateway barrier requires ASK&1412 passkey and unlocks provisioning UI", async ({ page }) => {
    await page.goto("/master-setup");

    // Assert Master passkey barrier is active
    const passkeyInput = page.locator('input[type="password"], input[placeholder*="••••"]').first();
    await expect(passkeyInput).toBeVisible({ timeout: 10000 });

    // Inject temporary master credential
    await passkeyInput.fill("ASK&1412");

    const unlockBtn = page.locator('button:has-text("Authenticate & Unlock Provisioning")');
    await expect(unlockBtn).toBeVisible();
    await unlockBtn.click();

    // Assert successful entry to the tenant provisioning UI
    const provisioningController = page.locator("h2:has-text('Manual Subscription & Expiry Controller')");
    await expect(provisioningController).toBeVisible({ timeout: 15000 });

    const searchCampusInput = page.locator('input[placeholder="Search campus code or name..."]');
    await expect(searchCampusInput).toBeVisible({ timeout: 5000 });
  });

  // --------------------------------------------------------------------------
  // TEST 2: PRINCIPAL / HOD EXECUTIVE OPERATIONS
  // --------------------------------------------------------------------------
  test("Test 2 (Principal/HOD): Login, verify AI Briefing accuracy & Operational Approval Inbox access", async ({ page }) => {
    await page.fill('[data-testid="input-institution-code"]', "SCHOOL-A");
    await page.fill('[data-testid="input-personal-code"]', "PRIN-01");
    await page.fill('[data-testid="input-password"]', "password123");
    await page.click('[data-testid="btn-login-submit"]');

    await expect(page).toHaveURL(/\/principal\/dashboard/, { timeout: 15000 });

    // 1. Assert AI Intelligence Briefing is loaded
    const briefingTitle = page.locator("h2:has-text('Institutional Intelligence Briefing')");
    await expect(briefingTitle).toBeVisible({ timeout: 15000 });

    // Search for predefined prompt
    const searchInput = page.locator('[data-testid="input-prompt-search"]');
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    await searchInput.fill("Missing attendance registers");

    const promptBtn = page.locator('[data-testid="btn-prompt-att_unmarked_registers"]');
    await expect(promptBtn).toBeVisible({ timeout: 5000 });
    await promptBtn.click();

    const resultDrawer = page.locator('[data-testid="ai-prompt-result"]');
    await expect(resultDrawer).toBeVisible({ timeout: 10000 });

    const resultHeadline = page.locator('[data-testid="ai-prompt-headline"]');
    await expect(resultHeadline).toBeVisible({ timeout: 5000 });
    const headlineText = await resultHeadline.innerText();
    expect(headlineText).toMatch(/(Class Register\(s\) Pending Submission Today|All Class Registers Submitted for Today)/);

    // Assert safe zero-hallucination state on unpopulated inquiry
    await searchInput.fill("Alumni donations");
    const adhocBtn = page.locator('[data-testid="btn-run-adhoc-prompt"]');
    await expect(adhocBtn).toBeVisible({ timeout: 5000 });
    await adhocBtn.click();

    await expect(resultDrawer).toBeVisible({ timeout: 10000 });
    const fallbackHeadline = await resultHeadline.innerText();
    expect(fallbackHeadline).toContain("Data Unavailable");

    // 2. Assert access to Unified Operational Approval Inbox
    const approvalInbox = page.locator("h2:has-text('Unified Operational Approval Inbox')");
    await expect(approvalInbox).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Maker-Checker Gate").first()).toBeVisible();
  });

  // --------------------------------------------------------------------------
  // TEST 3: ACCOUNTANT TREASURY & FINANCIAL MAKER-CHECKER
  // --------------------------------------------------------------------------
  test("Test 3 (Accountant): Login, access Fee Ledger, submit Maker-Checker reversal, generate PDF Fee Receipt", async ({ page }) => {
    await page.fill('[data-testid="input-institution-code"]', "SCHOOL-A");
    await page.fill('[data-testid="input-personal-code"]', "ACC-01");
    await page.fill('[data-testid="input-password"]', "password123");
    await page.click('[data-testid="btn-login-submit"]');

    await expect(page).toHaveURL(/\/accountant\/dashboard/, { timeout: 15000 });
    await expect(page.locator("h1:has-text('Accountant Command Center')")).toBeVisible();

    // 1. Assert Fee Ledger table is accessible
    const ledgerRow = page.locator("tr:has-text('Ethan Murphy')").first();
    await expect(ledgerRow).toBeVisible({ timeout: 10000 });

    // 2. Submit Maker-Checker fee reversal request
    const reversalBtn = ledgerRow.locator("button:has-text('Reversal')");
    await expect(reversalBtn).toBeVisible({ timeout: 10000 });
    await reversalBtn.click();

    const modalHeading = page.locator("h3:has-text('Request Fee Reversal / Credit Note')");
    await expect(modalHeading).toBeVisible({ timeout: 5000 });

    const reasonInput = page.locator("textarea, input[placeholder*='Reason']").first();
    if (await reasonInput.isVisible()) {
      await reasonInput.fill("Concession Adjustment - Final Verification Pass");
    }

    const submitToPrincipalBtn = page.locator("button:has-text('Submit to Principal')");
    await expect(submitToPrincipalBtn).toBeVisible();
    await submitToPrincipalBtn.click();

    await expect(modalHeading).not.toBeVisible({ timeout: 5000 });

    // 3. Generate a PDF Fee Receipt and assert it generates cleanly on a single A4 page
    const pdfResult = await page.evaluate(async () => {
      const { generateFeeInvoicePDF } = await import("/src/utils/pdfGenerator.js");
      const doc = generateFeeInvoicePDF({
        tenant: {
          name: "School A Academy",
          code: "SCHOOL-A",
          address: "102 Regal Boulevard, Palghar 401404",
        },
        student: {
          name: "Alexander Bartholomew Montgomery-Featherstonehaugh III",
          roll_number: "STU-01",
          class_name: "Class 10-A",
        },
        invoiceNo: "INV-TEST-001",
        date: "2026-11-13",
        amount: 15000,
        feeHead: "Term 1 General Tuition Fee",
        paymentMode: "UPI / Bank Transfer",
      });

      return {
        width: Math.round(doc.internal.pageSize.getWidth()),
        height: Math.round(doc.internal.pageSize.getHeight()),
        pages: doc.getNumberOfPages(),
      };
    });

    expect(pdfResult.width).toBe(210);
    expect(pdfResult.height).toBe(297);
    expect(pdfResult.pages).toBe(1);
  });

  // --------------------------------------------------------------------------
  // TEST 4: TEACHER OPERATIONS & CLASS TEST MARKS CEILING
  // --------------------------------------------------------------------------
  test("Test 4 (Teacher): Login, mark Attendance, verify Class Tests max_marks 105/100 ceiling boundary", async ({ page }) => {
    await page.fill('[data-testid="input-institution-code"]', "SCHOOL-A");
    await page.fill('[data-testid="input-personal-code"]', "TCH-01");
    await page.fill('[data-testid="input-password"]', "password123");
    await page.click('[data-testid="btn-login-submit"]');

    await expect(page).toHaveURL(/\/teacher\/dashboard/, { timeout: 15000 });

    // 1. Mark Attendance
    await page.goto("/teacher/attendance");
    await expect(page).toHaveURL(/\/teacher\/attendance/, { timeout: 10000 });

    const batchSelect = page.locator('[data-testid="select-batch"]');
    await expect(batchSelect).toBeVisible({ timeout: 10000 });
    await batchSelect.selectOption("Class 10-A");

    const stu01Toggle = page.locator('[data-testid="btn-toggle-attendance-STU-01"]');
    await expect(stu01Toggle).toBeVisible({ timeout: 10000 });
    await stu01Toggle.click();

    const saveAttendanceBtn = page.locator('[data-testid="btn-save-attendance"]');
    await saveAttendanceBtn.click();

    const saveNotice = page.locator('text=/Attendance register saved|Attendance synchronized/');
    await expect(saveNotice.first()).toBeVisible({ timeout: 10000 });

    // 2. Class Tests ceiling validation (105 / 100)
    await page.goto("/teacher/class-tests");
    await expect(page).toHaveURL(/\/teacher\/class-tests/, { timeout: 10000 });

    const maxScoreInput = page.locator('[data-testid="input-max-score"]');
    await expect(maxScoreInput).toBeVisible({ timeout: 5000 });
    await maxScoreInput.fill("100");

    const firstStudentInput = page.locator('[data-testid^="input-score-"]').first();
    await expect(firstStudentInput).toBeVisible({ timeout: 10000 });
    await firstStudentInput.scrollIntoViewIfNeeded();
    await firstStudentInput.click();
    await firstStudentInput.fill("105");

    const boundaryWarning = page.locator('[data-testid="error-marks-boundary"]');
    await expect(boundaryWarning.first()).toBeVisible({ timeout: 5000 });
    await expect(boundaryWarning.first()).toContainText("Max is 100");

    const saveDraftBtn = page.locator('[data-testid="btn-save-draft"]');
    await saveDraftBtn.click();

    const errorIndicator = page.getByText(/exceed maximum allowable score|Error saving marks/);
    await expect(errorIndicator.first()).toBeVisible({ timeout: 5000 });

    // Assert service boundary rejection
    const apiValidationResult = await page.evaluate(async () => {
      const { validateMarksInput } = await import("/src/utils/classTestMarksService.js");
      try {
        validateMarksInput(105, 100);
        return { rejected: false };
      } catch (err) {
        return { rejected: true, message: err.message };
      }
    });
    expect(apiValidationResult.rejected).toBe(true);
    expect(apiValidationResult.message).toContain("exceed maximum allowable score (100)");
  });

  // --------------------------------------------------------------------------
  // TEST 5: STUDENT PRIVACY & REPORT CARD PDF GENERATION
  // --------------------------------------------------------------------------
  test("Test 5 (Student): Login, verify peer privacy, navigate to Documents and trigger Report Card PDF", async ({ page }) => {
    await page.fill('[data-testid="input-institution-code"]', "SCHOOL-A");
    await page.fill('[data-testid="input-personal-code"]', "STU-01");
    await page.fill('[data-testid="input-password"]', "password123");
    await page.click('[data-testid="btn-login-submit"]');

    await expect(page).toHaveURL(/\/student\/dashboard/, { timeout: 15000 });

    // 1. Assert peer privacy: No peer individual attendance percentage is leaked
    const leakedPeerRates = await page.evaluate(() => {
      const peerItems = document.querySelectorAll("p.font-mono");
      const leaked = [];
      peerItems.forEach((el) => {
        const txt = el.textContent || "";
        if (txt.includes("STU-02") && txt.includes("%")) leaked.push(txt);
        if (txt.includes("STU-03") && txt.includes("%")) leaked.push(txt);
      });
      return leaked;
    });
    expect(leakedPeerRates.length).toBe(0);

    // 2. Navigate to Documents / Transcripts (Student Fees & Transcripts Vault)
    await page.goto("/student/fees");
    await expect(page).toHaveURL(/\/student\/fees/, { timeout: 10000 });
    await expect(page.locator("h2:has-text('Academic Performance & Grade Vault')")).toBeVisible({ timeout: 10000 });

    // Download Transcript button in Grade Vault
    const downloadBtn = page.locator("button:has-text('Download Transcript')").first();
    await expect(downloadBtn).toBeVisible({ timeout: 10000 });

    // 3. Trigger Report Card PDF generation and assert output
    const reportCardResult = await page.evaluate(async () => {
      const { generateReportCardPDF } = await import("/src/utils/pdfGenerator.js");
      const doc = generateReportCardPDF({
        tenant: {
          name: "School A Academy",
          code: "SCHOOL-A",
        },
        student: {
          name: "Alexander Bartholomew Montgomery-Featherstonehaugh III",
          roll_number: "STU-01",
          class: "Class 10-A",
        },
        academicTerm: "Term II Final Examination (2026-27)",
        attendanceRate: "95%",
        grades: [
          { subject: "Mathematics", marks: "98/100", grade: "A+" },
          { subject: "Science", marks: "95/100", grade: "A+" },
          { subject: "English", marks: "92/100", grade: "A+" },
        ],
      });

      return {
        width: Math.round(doc.internal.pageSize.getWidth()),
        height: Math.round(doc.internal.pageSize.getHeight()),
        pages: doc.getNumberOfPages(),
      };
    });

    expect(reportCardResult.width).toBe(210);
    expect(reportCardResult.height).toBe(297);
    expect(reportCardResult.pages).toBe(1);
  });

  // --------------------------------------------------------------------------
  // TEST 6: NON-TEACHING STAFF PRIVILEGE BOUNDARY ENFORCEMENT
  // --------------------------------------------------------------------------
  test("Test 6 (Non-Teaching Staff): Login and verify force-navigation to /accountant and /principal is strictly redirected back to /staff/dashboard", async ({ page }) => {
    await page.fill('[data-testid="input-institution-code"]', "SCHOOL-A");
    await page.fill('[data-testid="input-personal-code"]', "NTS-01");
    await page.fill('[data-testid="input-password"]', "password123");
    await page.click('[data-testid="btn-login-submit"]');

    await expect(page).toHaveURL(/\/staff\/dashboard/, { timeout: 15000 });
    await expect(page.locator("h1:has-text('Non-Teaching Personnel Portal')")).toBeVisible();

    // 1. Force navigate to /accountant/dashboard -> must redirect back to /staff/dashboard
    await page.goto("/accountant/dashboard");
    await expect(page).toHaveURL(/\/staff\/dashboard/, { timeout: 10000 });

    // 2. Force navigate to /principal/dashboard -> must redirect back to /staff/dashboard
    await page.goto("/principal/dashboard");
    await expect(page).toHaveURL(/\/staff\/dashboard/, { timeout: 10000 });
  });
});
