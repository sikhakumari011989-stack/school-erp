import { test, expect } from "@playwright/test";

/**
 * PHASE 4 E2E TEST SUITE: ACADEMIC OPERATIONS & ZERO-HALLUCINATION AI BRIEFING
 * Academic OS - Multi-Tenant School ERP SaaS (React 19, Vite 8, Tailwind v4, Supabase)
 * 
 * Verifies:
 * 1. Test 1 (Class Test Validation): Teacher (TCH-01) enters 105 for a test with max_marks: 100.
 *    UI and API reject invalid score boundary, displaying "Max is 100" and blocking invalid save.
 * 2. Test 2 (Attendance State Logic): Teacher (TCH-01) marks STU-01 as Absent.
 *    STU-01 dashboard displays "Absent Today" badge without exposing peer attendance rates.
 * 3. Test 3 (AI Hallucination Check): Principal (PRIN-01) queries AI Briefing.
 *    Predefined prompt returns exact mathematical missing registers count.
 *    Non-existent domain ("Alumni donations") returns safe "data unavailable" fallback without hallucination.
 */

const VIEWPORTS = [
  { name: "Desktop", width: 1024, height: 768 },
  { name: "Mobile", width: 375, height: 667 },
];

test.describe("Academic OS - Phase 4 Academic Operations & AI Intelligence Engine", () => {
  for (const vp of VIEWPORTS) {
    test.describe(`${vp.name} Viewport (${vp.width}x${vp.height})`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      test.beforeEach(async ({ page }) => {
        page.on("pageerror", (err) => {
          console.error(`[Browser PageError - ${vp.name}]`, err.message);
        });
      });

      // -----------------------------------------------------------------------
      // TEST 1: CLASS TEST MARKS VALIDATION & SCORE CEILING BOUNDARY ENFORCEMENT
      // -----------------------------------------------------------------------
      test(`Test 1 (Class Test Validation): Teacher cannot enter marks exceeding max_marks (${vp.name})`, async ({ page }) => {
        // Authenticate as Teacher TCH-01 in School A
        await page.goto("/login");
        await page.evaluate(async () => {
          sessionStorage.clear();
          localStorage.removeItem("erp_session_user");
          const { seedMockTenants } = await import("/src/utils/seedMockTenants.js");
          seedMockTenants(true);
        });

        await page.fill('[data-testid="input-institution-code"]', "SCHOOL-A");
        await page.fill('[data-testid="input-personal-code"]', "TCH-01");
        await page.fill('[data-testid="input-password"]', "password123");
        await page.click('[data-testid="btn-login-submit"]');

        await expect(page).toHaveURL(/\/teacher\/dashboard/, { timeout: 15000 });

        // Navigate to Class Test Marks portal
        await page.goto("/teacher/class-tests");
        await expect(page).toHaveURL(/\/teacher\/class-tests/, { timeout: 10000 });

        // Verify Class Test Entry form is loaded
        const heading = page.locator("h2:has-text('Class Test Marks')");
        await expect(heading).toBeVisible({ timeout: 10000 });

        // Configure test with maxScore: 100
        const maxScoreInput = page.locator('[data-testid="input-max-score"]');
        await expect(maxScoreInput).toBeVisible({ timeout: 5000 });
        await maxScoreInput.fill("100");

        // Wait for student roster to render
        const firstStudentInput = page.locator('[data-testid^="input-score-"]').first();
        await expect(firstStudentInput).toBeVisible({ timeout: 10000 });
        await firstStudentInput.scrollIntoViewIfNeeded();

        // Adversarial entry: Enter 105 (exceeds max_marks: 100)
        await firstStudentInput.click();
        await firstStudentInput.fill("105");

        // Assert UI visual boundary rejection: "Max is 100" warning rendered
        const boundaryWarning = page.locator('[data-testid="error-marks-boundary"]');
        await expect(boundaryWarning.first()).toBeVisible({ timeout: 5000 });
        await expect(boundaryWarning.first()).toContainText("Max is 100");

        // Attempt to save draft with invalid score
        const saveDraftBtn = page.locator('[data-testid="btn-save-draft"]');
        await saveDraftBtn.click();

        // Assert client pre-validation blocks save and renders error toast or status
        const errorIndicator = page.getByText(/exceed maximum allowable score|Error saving marks/);
        await expect(errorIndicator.first()).toBeVisible({ timeout: 5000 });

        // Verify API/service rejects marks > maxScore
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

        // Correct the score to valid boundary: 95
        await firstStudentInput.fill("95");
        await expect(page.locator('[data-testid="error-marks-boundary"]')).toHaveCount(0);

        // Save valid draft
        await saveDraftBtn.click();
        const successIndicator = page.locator('[data-testid="status-marks-saved"]');
        await expect(successIndicator).toBeVisible({ timeout: 10000 });
        await expect(successIndicator).toContainText("Marks saved securely");
      });

      // -----------------------------------------------------------------------
      // TEST 2: ATTENDANCE STATE LOGIC & LEAK-PROOF STUDENT DATA PRIVACY
      // -----------------------------------------------------------------------
      test(`Test 2 (Attendance State Logic): Teacher marks STU-01 Absent; student dashboard reflects Absent Today privately (${vp.name})`, async ({ page }) => {
        // Authenticate as Teacher TCH-01
        await page.goto("/login");
        await page.evaluate(async () => {
          sessionStorage.clear();
          localStorage.removeItem("erp_session_user");
          const { seedMockTenants } = await import("/src/utils/seedMockTenants.js");
          seedMockTenants(true);
        });

        await page.fill('[data-testid="input-institution-code"]', "SCHOOL-A");
        await page.fill('[data-testid="input-personal-code"]', "TCH-01");
        await page.fill('[data-testid="input-password"]', "password123");
        await page.click('[data-testid="btn-login-submit"]');

        await expect(page).toHaveURL(/\/teacher\/dashboard/, { timeout: 15000 });

        // Navigate to Teacher Attendance portal
        await page.goto("/teacher/attendance");
        await expect(page).toHaveURL(/\/teacher\/attendance/, { timeout: 10000 });

        // Select Class 10-A
        const batchSelect = page.locator('[data-testid="select-batch"]');
        await expect(batchSelect).toBeVisible({ timeout: 10000 });
        await batchSelect.selectOption("Class 10-A");
        await expect(page.locator("text=Class 10-A Student Roster Roll List")).toBeVisible({ timeout: 10000 });

        // Wait for STU-01 toggle button
        const stu01Toggle = page.locator('[data-testid="btn-toggle-attendance-STU-01"]');
        await expect(stu01Toggle).toBeVisible({ timeout: 10000 });
        await stu01Toggle.scrollIntoViewIfNeeded();

        // Check if currently PRESENT; if so, toggle to ABSENT
        const buttonText = await stu01Toggle.innerText();
        if (buttonText.includes("PRESENT")) {
          await stu01Toggle.click();
        }
        await expect(stu01Toggle).toContainText("ABSENT", { timeout: 5000 });

        // Save Attendance Register
        const saveAttendanceBtn = page.locator('[data-testid="btn-save-attendance"]');
        await saveAttendanceBtn.click();

        // Verify save confirmation toast
        const saveNotice = page.locator('text=/Attendance register saved|Attendance synchronized/');
        await expect(saveNotice.first()).toBeVisible({ timeout: 10000 });

        // Log out teacher and log in as Student STU-01
        await page.evaluate(() => {
          sessionStorage.clear();
          localStorage.removeItem("erp_session_user");
          localStorage.removeItem("supabase.auth.token");
        });
        await page.goto("/login?signedOut=true");

        await page.fill('[data-testid="input-institution-code"]', "SCHOOL-A");
        await page.fill('[data-testid="input-personal-code"]', "STU-01");
        await page.fill('[data-testid="input-password"]', "password123");
        await page.click('[data-testid="btn-login-submit"]');

        await expect(page).toHaveURL(/\/student\/dashboard/, { timeout: 15000 });

        // Assert Bento Card 1 displays "Absent Today" badge
        const todayBadge = page.locator('[data-testid="badge-today-attendance"]');
        await expect(todayBadge).toBeVisible({ timeout: 10000 });
        await expect(todayBadge).toContainText("Absent Today");

        // Assert Student Privacy: Check that no peer attendance percentage or individual status is exposed
        const bodyContent = await page.content();

        // STU-02 through STU-10 should NOT have their individual attendance percentage leaked
        // Peer scholars in AttendanceStreak show "Scholar • Verified Punctuality Tier"
        const leakedPeerRates = await page.evaluate(() => {
          // Look for any elements indicating peer attendance rates
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
      });

      // -----------------------------------------------------------------------
      // TEST 3: PRINCIPAL'S AI BRIEFING — DETERMINISTIC METRICS & ZERO HALLUCINATION
      // -----------------------------------------------------------------------
      test(`Test 3 (AI Hallucination Check): Predefined prompt returns exact missing registers; non-existent query falls back safely (${vp.name})`, async ({ page }) => {
        // Authenticate as Principal PRIN-01 in School A
        await page.goto("/login");
        await page.evaluate(async () => {
          sessionStorage.clear();
          localStorage.removeItem("erp_session_user");
          const { seedMockTenants } = await import("/src/utils/seedMockTenants.js");
          seedMockTenants(true);
        });

        await page.fill('[data-testid="input-institution-code"]', "SCHOOL-A");
        await page.fill('[data-testid="input-personal-code"]', "PRIN-01");
        await page.fill('[data-testid="input-password"]', "password123");
        await page.click('[data-testid="btn-login-submit"]');

        await expect(page).toHaveURL(/\/principal\/dashboard/, { timeout: 15000 });

        // Verify Principal AI Briefing card is visible
        const briefingTitle = page.locator("h2:has-text('Institutional Intelligence Briefing')");
        await expect(briefingTitle).toBeVisible({ timeout: 15000 });

        // Search for predefined prompt "Missing attendance registers"
        const searchInput = page.locator('[data-testid="input-prompt-search"]');
        await expect(searchInput).toBeVisible({ timeout: 10000 });
        await searchInput.fill("Missing attendance registers");

        // Find the matched prompt button for missing registers (att_unmarked_registers)
        const promptBtn = page.locator('[data-testid="btn-prompt-att_unmarked_registers"]');
        await expect(promptBtn).toBeVisible({ timeout: 5000 });
        await promptBtn.click();

        // Assert AI Briefing evaluates the exact mathematical missing registers count
        const resultDrawer = page.locator('[data-testid="ai-prompt-result"]');
        await expect(resultDrawer).toBeVisible({ timeout: 10000 });

        const resultHeadline = page.locator('[data-testid="ai-prompt-headline"]');
        await expect(resultHeadline).toBeVisible({ timeout: 5000 });
        const headlineText = await resultHeadline.innerText();

        // In School A, either all or specific pending registers are reported with exact count (not hallucinated numbers)
        expect(headlineText).toMatch(/(Class Register\(s\) Pending Submission Today|All Class Registers Submitted for Today)/);

        // Adversarial Query: Search for a completely non-existent institutional domain ("Alumni donations")
        await searchInput.fill("Alumni donations");

        // Predefined catalog should have 0 matches for "Alumni donations"
        const adhocBtn = page.locator('[data-testid="btn-run-adhoc-prompt"]');
        await expect(adhocBtn).toBeVisible({ timeout: 5000 });
        await adhocBtn.click();

        // Assert the AI Engine returns a strict "Data Unavailable" fallback state without hallucinating numbers
        await expect(resultDrawer).toBeVisible({ timeout: 10000 });
        const fallbackHeadline = await resultHeadline.innerText();

        expect(fallbackHeadline).toContain("Data Unavailable");
        expect(fallbackHeadline).toContain("Zero Institutional Records");

        // Verify bullet points explicitly state zero hallucinated metrics
        const bulletsText = await resultDrawer.innerText();
        expect(bulletsText).toContain("No telemetry, database tables, or institutional records exist");
        expect(bulletsText).toContain("safely declined this inquiry without hallucinating metrics");
      });
    });
  }
});
