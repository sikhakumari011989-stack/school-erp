import { test, expect } from "@playwright/test";

/**
 * PHASE 5 (FINAL PHASE) E2E TEST SUITE: OFFLINE PWA SYNC QUEUE & STAFF/HR LEAVE OPERATIONS
 * Academic OS - Multi-Tenant School ERP SaaS (React 19, Vite 8, Tailwind v4, Supabase)
 * 
 * Verifies:
 * 1. Test 1 (Offline Sync Trap):
 *    - Teacher (TCH-01) disconnects network (offline context).
 *    - Submits class attendance for Class 10-A.
 *    - Asserts UI shows "Saved Offline" toast and mutation is pushed to offlineSyncQueue (IndexedDB).
 *    - Simulates network reconnection (online context).
 *    - Asserts offlineSyncQueue drains completely and pushes to server/storage.
 * 
 * 2. Test 2 (HR Leave Request Routing):
 *    - Teacher (TCH-02) submits a "Sick Leave" request.
 *    - Asserts the request status is "Pending" and teacher is denied approval rights.
 *    - Principal (PRIN-01) logs in and opens OperationalApprovalInbox.
 *    - Asserts the leave request appears with Approve/Reject actions and can be approved.
 * 
 * 3. Test 3 (Staff Access Boundaries):
 *    - Non-Teaching Staff (NTS-01) logs in and lands on /staff/dashboard.
 *    - Direct navigation to /teacher/dashboard is blocked by router and bounced to /staff/dashboard.
 *    - Direct navigation to /accountant/dashboard is blocked by router and bounced to /staff/dashboard.
 */

const VIEWPORTS = [
  { name: "Desktop", width: 1024, height: 768 },
  { name: "Mobile", width: 375, height: 667 },
];

test.describe("Academic OS - Phase 5 Offline PWA Sync Queue & Staff/HR Operations", () => {
  for (const vp of VIEWPORTS) {
    test.describe(`${vp.name} Viewport (${vp.width}x${vp.height})`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      test.beforeEach(async ({ page }) => {
        page.on("pageerror", (err) => {
          console.error(`[Browser PageError - ${vp.name}]`, err.message);
        });
      });

      // -----------------------------------------------------------------------
      // TEST 1: OFFLINE SYNC TRAP & BACKGROUND RECONNECTION DRAIN
      // -----------------------------------------------------------------------
      test(`Test 1 (Offline Sync Trap): Attendance trapped offline, drains upon reconnection (${vp.name})`, async ({ page, context }) => {
        // Ensure starting online
        await context.setOffline(false);

        // 1. Authenticate as Teacher TCH-01 in School A
        await page.goto("/login");
        await page.evaluate(async () => {
          sessionStorage.clear();
          localStorage.removeItem("erp_session_user");
          const { seedMockTenants } = await import("/src/utils/seedMockTenants.js");
          seedMockTenants(true);
          const { purgeOfflineQueue } = await import("/src/utils/offlineSyncQueue.js");
          await purgeOfflineQueue();
        });

        await page.fill('[data-testid="input-institution-code"]', "SCHOOL-A");
        await page.fill('[data-testid="input-personal-code"]', "TCH-01");
        await page.fill('[data-testid="input-password"]', "password123");
        await page.click('[data-testid="btn-login-submit"]');

        await expect(page).toHaveURL(/\/teacher\/dashboard/, { timeout: 15000 });

        // 2. Navigate to Teacher Attendance portal
        await page.goto("/teacher/attendance");
        await expect(page).toHaveURL(/\/teacher\/attendance/, { timeout: 10000 });

        // Select Class 10-A batch
        const batchSelect = page.locator('[data-testid="select-batch"]');
        await expect(batchSelect).toBeVisible({ timeout: 10000 });
        await batchSelect.selectOption("Class 10-A");

        // Wait for roster to load
        const saveBtn = page.locator('[data-testid="btn-save-attendance"]');
        await expect(saveBtn).toBeVisible({ timeout: 10000 });
        await saveBtn.scrollIntoViewIfNeeded();

        // 3. Simulate network disconnection (offline context in Playwright)
        await context.setOffline(true);

        // 4. Submit class attendance while offline
        await saveBtn.click();

        // 5. Assert UI shows "Saved Offline" toast
        const offlineToast = page.locator("text=Saved Offline");
        await expect(offlineToast.first()).toBeVisible({ timeout: 10000 });

        // 6. Assert mutation payload is pushed to offlineSyncQueue
        const pendingCountOffline = await page.evaluate(async () => {
          const { getPendingOfflineCountAsync } = await import("/src/utils/offlineSyncQueue.js");
          return await getPendingOfflineCountAsync();
        });
        expect(pendingCountOffline).toBeGreaterThanOrEqual(1);

        // 7. Simulate network reconnection (online context)
        await context.setOffline(false);
        await page.evaluate(async () => {
          window.dispatchEvent(new Event("online"));
          const { flushOfflineMutationQueue } = await import("/src/utils/offlineSyncQueue.js");
          await flushOfflineMutationQueue("SCHOOL-A");
        });

        // 8. Assert queue drains cleanly
        await expect.poll(async () => {
          return await page.evaluate(async () => {
            const { getPendingOfflineCountAsync } = await import("/src/utils/offlineSyncQueue.js");
            return await getPendingOfflineCountAsync();
          });
        }, { timeout: 10000 }).toBe(0);
      });

      // -----------------------------------------------------------------------
      // TEST 2: HR LEAVE REQUEST ROUTING & PRINCIPAL APPROVAL INBOX
      // -----------------------------------------------------------------------
      test(`Test 2 (HR Leave Request Routing): Teacher submits Sick Leave, routes to Principal Inbox (${vp.name})`, async ({ page, context }) => {
        // Ensure starting online
        await context.setOffline(false);

        // 1. Authenticate as Teacher TCH-02 (Dr. Rosalind Franklin)
        await page.goto("/login");
        await page.evaluate(async () => {
          sessionStorage.clear();
          localStorage.removeItem("erp_session_user");
          const { seedMockTenants } = await import("/src/utils/seedMockTenants.js");
          seedMockTenants(true);
        });

        await page.fill('[data-testid="input-institution-code"]', "SCHOOL-A");
        await page.fill('[data-testid="input-personal-code"]', "TCH-02");
        await page.fill('[data-testid="input-password"]', "password123");
        await page.click('[data-testid="btn-login-submit"]');

        await expect(page).toHaveURL(/\/teacher\/dashboard/, { timeout: 15000 });

        // 2. Navigate to Staff Leave portal
        await page.goto("/teacher/leave");
        await expect(page).toHaveURL(/\/teacher\/leave/, { timeout: 10000 });

        const openModalBtn = page.locator('[data-testid="btn-submit-leave-petition"]');
        await expect(openModalBtn).toBeVisible({ timeout: 10000 });
        await openModalBtn.click();

        // 3. Fill and submit Sick Leave application
        const leaveTypeSelect = page.locator('[data-testid="select-leave-type"]');
        await expect(leaveTypeSelect).toBeVisible({ timeout: 5000 });
        await leaveTypeSelect.selectOption("Sick Leave");

        const reasonInput = page.locator('[data-testid="textarea-reason"]');
        await reasonInput.fill("Severe viral fever and doctor recommended medical rest");

        const submitLeaveBtn = page.locator('[data-testid="btn-submit-leave-form"]');
        await submitLeaveBtn.click();

        // 4. Assert request is pending and standard teacher has NO approval rights
        const pendingStatus = page.locator("text=Pending");
        await expect(pendingStatus.first()).toBeVisible({ timeout: 10000 });

        const nonAdjudicatorNote = page.locator('[data-testid="status-pending-non-adjudicator"]');
        await expect(nonAdjudicatorNote.first()).toBeVisible({ timeout: 5000 });
        await expect(nonAdjudicatorNote.first()).toContainText("Awaiting Principal Decision");

        // Verify standard teacher cannot see approve button
        const teacherApproveBtn = page.locator('[data-testid^="btn-approve-leave-"]');
        await expect(teacherApproveBtn).toHaveCount(0);

        // 5. Log in as Principal PRIN-01 (Dr. Eleanor Vance)
        await page.evaluate(() => {
          sessionStorage.clear();
          localStorage.removeItem("erp_session_user");
          localStorage.removeItem("erp_active_tenant");
        });
        await page.goto("/login?signedOut=true");
        await page.waitForLoadState("domcontentloaded");

        const instInput = page.locator('[data-testid="input-institution-code"]');
        await expect(instInput).toBeVisible({ timeout: 10000 });
        await instInput.fill("SCHOOL-A");

        const personalInput = page.locator('[data-testid="input-personal-code"]');
        await personalInput.fill("PRIN-01");

        const passInput = page.locator('[data-testid="input-password"]');
        await passInput.fill("password123");

        const submitBtn = page.locator('[data-testid="btn-login-submit"]');
        await submitBtn.click();

        await expect(page).toHaveURL(/\/principal\/dashboard/, { timeout: 15000 });

        // 6. Assert leave request appears in OperationalApprovalInbox
        const approvalInbox = page.locator("text=Unified Operational Approval Inbox");
        await expect(approvalInbox).toBeVisible({ timeout: 15000 });
        await approvalInbox.scrollIntoViewIfNeeded();

        // Check applicant name and leave details rendered in approval list
        const applicantEntry = page.locator("text=Dr. Rosalind Franklin");
        await expect(applicantEntry.first()).toBeVisible({ timeout: 10000 });

        const sickLeaveBadge = page.locator("text=Sick Leave");
        await expect(sickLeaveBadge.first()).toBeVisible({ timeout: 10000 });

        // 7. Principal approves the leave request
        const approveBtn = page.locator("button:has-text('Approve')");
        await expect(approveBtn.first()).toBeVisible({ timeout: 5000 });
        await approveBtn.first().scrollIntoViewIfNeeded();
        await approveBtn.first().click();

        // Verify approval confirmation toast
        const approvedToast = page.locator("text=Approved leave application");
        await expect(approvedToast.first()).toBeVisible({ timeout: 10000 });
      });

      // -----------------------------------------------------------------------
      // TEST 3: NON-TEACHING STAFF ACCESS BOUNDARIES & ROUTE PROTECTION
      // -----------------------------------------------------------------------
      test(`Test 3 (Staff Access Boundaries): NTS-01 restricted to /staff/dashboard, blocked from teacher/finance (${vp.name})`, async ({ page }) => {
        // 1. Authenticate as Non-Teaching Staff (NTS-01: Naveen Sharma)
        await page.goto("/login");
        await page.evaluate(async () => {
          sessionStorage.clear();
          localStorage.removeItem("erp_session_user");
          const { seedMockTenants } = await import("/src/utils/seedMockTenants.js");
          seedMockTenants(true);
        });

        await page.fill('[data-testid="input-institution-code"]', "SCHOOL-A");
        await page.fill('[data-testid="input-personal-code"]', "NTS-01");
        await page.fill('[data-testid="input-password"]', "password123");
        await page.click('[data-testid="btn-login-submit"]');

        // 2. Assert initial redirect is strictly to /staff/dashboard
        await expect(page).toHaveURL(/\/staff\/dashboard/, { timeout: 15000 });

        // 3. Attempt direct access to /teacher/dashboard (Faculty Suite)
        await page.goto("/teacher/dashboard");
        // Assert router intercepts and bounces back to /staff/dashboard
        await expect(page).toHaveURL(/\/staff\/dashboard/, { timeout: 10000 });

        // 4. Attempt direct access to /accountant/dashboard (Financial Suite)
        await page.goto("/accountant/dashboard");
        // Assert router intercepts and bounces back to /staff/dashboard
        await expect(page).toHaveURL(/\/staff\/dashboard/, { timeout: 10000 });
      });
    });
  }
});
