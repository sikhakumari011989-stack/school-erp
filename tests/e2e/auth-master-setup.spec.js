import { test, expect } from "@playwright/test";

/**
 * PHASE 2 E2E TEST SUITE: AUTHENTICATION FLOW & MASTER SETUP BARRIER
 * Academic OS - Multi-Tenant School ERP SaaS (React 19, Vite 8, Tailwind v4, Supabase)
 * 
 * Verifies across Desktop (1024x768) and Mobile (375x667):
 * 1. Root URL Redirect: Immediate, flicker-free redirection from `/` to `/login`
 *    without loading protected application layouts or sidebars.
 * 2. Master Setup Entry: Strict password barrier on `/master-setup`, rejection of invalid keys,
 *    and successful unlocking with master credential (`ASK&1412`).
 * 3. Privilege Escalation Block: Student (`STU-01`) and Teacher (`TCH-01`) accounts attempting
 *    force-navigation to `/master-setup` via URL injection are strictly rejected and bounced
 *    back to their role dashboards.
 */

const VIEWPORTS = [
  { name: "Desktop", width: 1024, height: 768 },
  { name: "Mobile", width: 375, height: 667 },
];

test.describe("Academic OS - Phase 2 Auth & Master Setup Barrier Suite", () => {
  for (const vp of VIEWPORTS) {
    test.describe(`${vp.name} Viewport (${vp.width}x${vp.height})`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      test.beforeEach(async ({ page }) => {
        page.on("pageerror", (err) => {
          console.error(`[Browser PageError - ${vp.name}]`, err.message);
        });
      });

      // -----------------------------------------------------------------------
      // TEST 1: ROOT REDIRECT & PROTECTED LAYOUT SHIELD
      // -----------------------------------------------------------------------
      test(`Test 1 (Root Redirect): Navigate to '/' -> assert immediate redirect to '/login' without mounting protected layouts (${vp.name})`, async ({ page }) => {
        // Clear any lingering session before navigating to root
        await page.goto("/login");
        await page.evaluate(() => {
          localStorage.clear();
          sessionStorage.clear();
        });

        // Navigate directly to root URL
        await page.goto("/");

        // 1. Assert immediate, flicker-free redirection to /login
        await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

        // 2. Assert login form components are visible and interactive
        const instCodeInput = page.locator('[data-testid="input-institution-code"]');
        const submitBtn = page.locator('[data-testid="btn-login-submit"]');
        await expect(instCodeInput).toBeVisible({ timeout: 10000 });
        await expect(submitBtn).toBeVisible();

        // 3. Verify that NO protected application layouts or role navigation elements are mounted
        const sidebarNav = page.locator("aside, [data-testid='sidebar']");
        await expect(sidebarNav).not.toBeVisible();

        const roleLinks = page.locator('a[href*="/principal/dashboard"], a[href*="/student/dashboard"], a[href*="/teacher/dashboard"], a[href*="/trustee/dashboard"]');
        await expect(roleLinks).toHaveCount(0);
      });

      // -----------------------------------------------------------------------
      // TEST 2: MASTER SETUP PASSWORD BARRIER & UNLOCK FLOW
      // -----------------------------------------------------------------------
      test(`Test 2 (Master Setup Entry): Navigate to '/master-setup' -> assert strict barrier -> unlock with ASK&1412 (${vp.name})`, async ({ page }) => {
        // Clear session and master unlock state
        await page.goto("/login");
        await page.evaluate(() => {
          localStorage.clear();
          sessionStorage.clear();
        });

        // Navigate directly to /master-setup as an unauthenticated platform operator
        await page.goto("/master-setup");
        await expect(page).toHaveURL(/\/master-setup/, { timeout: 10000 });

        // 1. Assert password barrier exists
        const passkeyHeading = page.locator("h2:has-text('Master Engineering Gateway')");
        await expect(passkeyHeading).toBeVisible({ timeout: 10000 });

        const passkeyInput = page.locator('input[type="password"]');
        await expect(passkeyInput).toBeVisible();

        const unlockBtn = page.locator('button:has-text("Authenticate & Unlock Provisioning")');
        await expect(unlockBtn).toBeVisible();

        // 2. Assert provisioning roster and controller are NOT visible before entering key
        const provisioningController = page.locator("h2:has-text('Manual Subscription & Expiry Controller')");
        await expect(provisioningController).not.toBeVisible();

        // 3. Negative Test: Test rejection of invalid passkey
        await passkeyInput.fill("INVALID_SECRET_KEY");
        await unlockBtn.click();

        // Expect error alert / toast to be displayed
        const errorNotice = page.locator("text=/Access Denied|Invalid Master Passkey/i").first();
        await expect(errorNotice).toBeVisible({ timeout: 5000 });
        await expect(provisioningController).not.toBeVisible();

        // 4. Positive Test: Inject valid master credential (ASK&1412)
        await passkeyInput.fill("ASK&1412");
        await unlockBtn.click();

        // 5. Verify successful entry to the platform provisioning roster
        await expect(provisioningController).toBeVisible({ timeout: 15000 });

        const searchCampusInput = page.locator('input[placeholder="Search campus code or name..."]');
        await expect(searchCampusInput).toBeVisible();

        const lockBtn = page.locator('button:has-text("Lock Terminal")');
        await expect(lockBtn).toBeVisible();

        // 6. Test Lock Terminal functionality
        await lockBtn.click();
        await expect(passkeyHeading).toBeVisible({ timeout: 5000 });
        await expect(provisioningController).not.toBeVisible();
      });

      // -----------------------------------------------------------------------
      // TEST 3: PRIVILEGE ESCALATION BLOCK (STUDENT & TEACHER)
      // -----------------------------------------------------------------------
      test(`Test 3 (Privilege Escalation): Login as Student or Teacher -> force-nav to '/master-setup' is strictly blocked (${vp.name})`, async ({ page }) => {
        // Clear existing session
        await page.goto("/login");
        await page.evaluate(() => {
          localStorage.clear();
          sessionStorage.clear();
        });

        // --- SUB-TEST 3A: STUDENT ACCOUNT ---
        await page.goto("/login");
        await page.fill('[data-testid="input-institution-code"]', "SCHOOL-A");
        await page.fill('[data-testid="input-personal-code"]', "STU-01");
        await page.fill('[data-testid="input-password"]', "password123");
        await page.click('[data-testid="btn-login-submit"]');

        // Verify successful entry to student dashboard
        await expect(page).toHaveURL(/\/student\/dashboard/, { timeout: 15000 });
        await expect(page.locator("h1")).toContainText(/Welcome Back/i);

        // Adversarial URL injection attack: Student attempts direct navigation to /master-setup
        await page.goto("/master-setup");

        // MasterRouteGuard MUST block Student and redirect them back to /student/dashboard
        await expect(page).toHaveURL(/\/student\/dashboard/, { timeout: 10000 });
        expect(page.url()).not.toContain("/master-setup");

        // Confirm student cannot see master engineering barrier or controls
        const passkeyHeading = page.locator("h2:has-text('Master Engineering Gateway')");
        await expect(passkeyHeading).not.toBeVisible();
        const provisioningController = page.locator("h2:has-text('Manual Subscription & Expiry Controller')");
        await expect(provisioningController).not.toBeVisible();

        // --- SUB-TEST 3B: TEACHER ACCOUNT ---
        // Clear session and return to login
        await page.evaluate(() => {
          localStorage.clear();
          sessionStorage.clear();
        });
        await page.goto("/login");

        await page.fill('[data-testid="input-institution-code"]', "SCHOOL-A");
        await page.fill('[data-testid="input-personal-code"]', "TCH-01");
        await page.fill('[data-testid="input-password"]', "password123");
        await page.click('[data-testid="btn-login-submit"]');

        // Verify successful entry to teacher dashboard
        await expect(page).toHaveURL(/\/teacher\/dashboard/, { timeout: 15000 });
        await expect(page.locator("h1")).toContainText(/Welcome back/i);

        // Adversarial URL injection attack: Teacher attempts direct navigation to /master-setup
        await page.goto("/master-setup");

        // MasterRouteGuard MUST block Teacher and redirect them back to /teacher/dashboard
        await expect(page).toHaveURL(/\/teacher\/dashboard/, { timeout: 10000 });
        expect(page.url()).not.toContain("/master-setup");

        // Confirm teacher cannot see master gateway or controls
        await expect(passkeyHeading).not.toBeVisible();
        await expect(provisioningController).not.toBeVisible();
      });
    });
  }
});
