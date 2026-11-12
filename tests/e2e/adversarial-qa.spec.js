import { test, expect } from "@playwright/test";

/**
 * ADVERSARIAL QA & RECURSIVE VERIFICATION SUITE
 * Multi-Tenant School ERP SaaS (React 19, Vite 8, Tailwind v4, Supabase)
 * 
 * Verifies:
 * 1. SEED TENANT DEMO DATA: School A & School B isolation & edge cases
 * 2. ADVERSARIAL TESTING across Mobile (375px) and Desktop (1024px):
 *    - Test 1 (Tenancy): Cross-tenant navigation & storage/URL tampering rejection
 *    - Test 2 (Role Auth): Role privilege escalation attempts & unauthorized redirection
 *    - Test 3 (UI/UX): Empty form submissions & zero-overflow layout clipping checks
 */

const VIEWPORTS = [
  { name: "Desktop", width: 1024, height: 768 },
  { name: "Mobile", width: 375, height: 667 },
];

test.describe("Academic OS - Adversarial Bug-Bash Loop", () => {
  for (const vp of VIEWPORTS) {
    test.describe(`${vp.name} Viewport (${vp.width}x${vp.height})`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      test.beforeEach(async ({ page }) => {
        // Capture browser errors
        page.on("pageerror", (err) => {
          console.error(`[Browser PageError - ${vp.name}]`, err.message);
        });
      });

      // -----------------------------------------------------------------------
      // TEST 1: TENANCY ISOLATION & STORAGE / URL TAMPERING ATTACK
      // -----------------------------------------------------------------------
      test(`Test 1 (Tenancy): Login as Student in School A -> attempt route to School B or alter tenant ID (${vp.name})`, async ({ page }) => {
        await page.goto("/login");

        // Authenticate as School A Student (Edge case: extremely long name)
        await page.fill('[data-testid="input-institution-code"]', "SCHOOL-A");
        await page.fill('[data-testid="input-personal-code"]', "STU-01");
        await page.fill('[data-testid="input-password"]', "password123");
        await page.click('[data-testid="btn-login-submit"]');

        // Verify successful navigation to student dashboard
        await expect(page).toHaveURL(/\/student\/dashboard/, { timeout: 15000 });

        // Confirm dashboard rendered the long student name without crash
        const welcomeHeading = page.locator("h1");
        await expect(welcomeHeading).toBeVisible();
        await expect(welcomeHeading).toContainText(/Welcome Back/i);

        // Adversarial Attack 1: Modify tenant ID in localStorage to School B
        await page.evaluate(() => {
          localStorage.setItem("erp_active_tenant", "SCHOOL-B");
        });

        // Adversarial Attack 2: Attempt navigation with ?tenant=SCHOOL-B injection
        await page.goto("/student/dashboard?tenant=SCHOOL-B");
        await expect(page).toHaveURL(/\/student\/dashboard/, { timeout: 15000 });

        // Verify Tenant Isolation Barrier: School A session is preserved; School B data is NOT leaked
        const pageContent = await page.textContent("body");
        expect(pageContent).not.toContain("Student Bob");
        expect(pageContent).not.toContain("Student Brenda");
        expect(pageContent).not.toContain("Grade 12-IB");
        expect(pageContent).not.toContain("INV-SCHB-001");

        // Verify stored session still belongs to SCHOOL-A
        const sessionUser = await page.evaluate(() => {
          try {
            return JSON.parse(localStorage.getItem("erp_session_user"));
          } catch {
            return null;
          }
        });
        expect(sessionUser).not.toBeNull();
        expect(sessionUser.school_id).toBe("SCHOOL-A");
      });

      // -----------------------------------------------------------------------
      // TEST 2: ROLE AUTH & PRIVILEGE ESCALATION ATTACK
      // -----------------------------------------------------------------------
      test(`Test 2 (Role Auth): Login as Teacher -> attempt access to Accountant dashboard & fee reversals (${vp.name})`, async ({ page }) => {
        await page.goto("/login");

        // Authenticate as Teacher in School A
        await page.fill('[data-testid="input-institution-code"]', "SCHOOL-A");
        await page.fill('[data-testid="input-personal-code"]', "TCH-01");
        await page.fill('[data-testid="input-password"]', "password123");
        await page.click('[data-testid="btn-login-submit"]');

        // Confirm teacher reaches teacher dashboard
        await expect(page).toHaveURL(/\/teacher\/dashboard/, { timeout: 15000 });
        await expect(page.locator("h1")).toContainText(/Welcome back/i);

        // Adversarial Attack: Teacher attempts direct route to Accountant Dashboard
        await page.goto("/accountant/dashboard");

        // ProtectedRoute MUST reject role 'teacher' and redirect back to teacher's authorized portal
        await expect(page).toHaveURL(/\/teacher\/dashboard/, { timeout: 15000 });
        expect(page.url()).not.toContain("/accountant/dashboard");

        // Confirm teacher cannot view accountant treasury or fee approval controls
        const bodyText = await page.textContent("body");
        expect(bodyText).not.toContain("Approve Fee Reversal");
      });

      // -----------------------------------------------------------------------
      // TEST 3: UI/UX EMPTY FORM SUBMISSIONS & LAYOUT CLIPPING CHECK
      // -----------------------------------------------------------------------
      test(`Test 3 (UI/UX): Trigger empty form submissions in AddStudentModal & FeeStructureConfigurator (${vp.name})`, async ({ page }) => {
        const unhandledRejections = [];
        const fatalConsoleErrors = [];

        page.on("pageerror", (err) => unhandledRejections.push(err.message));
        page.on("console", (msg) => {
          if (msg.type() === "error") {
            const txt = msg.text();
            // Filter out expected network abort notices if any
            if (!txt.includes("net::ERR_") && !txt.includes("favicon")) {
              fatalConsoleErrors.push(txt);
            }
          }
        });

        await page.goto("/qa-workbench");
        await page.waitForLoadState("domcontentloaded");

        // 1. Stress Test: FeeStructureConfigurator empty form submit
        const publishFeeBtn = page.locator('button:has-text("Publish Fee Head")');
        await expect(publishFeeBtn).toBeVisible({ timeout: 10000 });

        // Submit completely empty fee form
        await publishFeeBtn.click();
        await page.waitForTimeout(500);

        // Verify zero unhandled promise rejections on empty fee form submit
        expect(unhandledRejections.length).toBe(0);

        // 2. Stress Test: AddStudentModal empty form submit
        const openModalBtn = page.locator('[data-testid="btn-open-add-student-modal"]');
        await expect(openModalBtn).toBeVisible();
        await openModalBtn.click();

        // Modal should open
        const addStudentBtn = page.getByRole("button", { name: "Add Student", exact: true });
        await expect(addStudentBtn).toBeVisible({ timeout: 5000 });

        // Submit empty student form
        await addStudentBtn.click();
        await page.waitForTimeout(500);

        // Verify zero unhandled promise rejections on empty modal submit
        expect(unhandledRejections.length).toBe(0);

        // Safely close modal using Cancel
        const cancelBtn = page.getByRole("button", { name: "Cancel", exact: true });
        await expect(cancelBtn).toBeVisible();
        await cancelBtn.click();
        await expect(addStudentBtn).not.toBeVisible();

        // 3. Viewport Horizontal Layout Clipping Check
        const isLayoutClipped = await page.evaluate(() => {
          // Verify body does not have horizontal overflow
          return document.documentElement.scrollWidth > window.innerWidth + 2;
        });

        expect(isLayoutClipped).toBe(false);
      });
    });
  }
});
