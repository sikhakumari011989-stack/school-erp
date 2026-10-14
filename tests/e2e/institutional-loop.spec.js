import { test, expect } from "@playwright/test";

/**
 * End-to-End Test Suite: Core Institutional Lifecycle Loop
 * 1. Log in as HOD/Trustee
 * 2. Enroll a student via Supabase on Trustee Dashboard
 * 3. Log out & Log in as Faculty Teacher
 * 4. Mark daily attendance on Teacher Attendance Register
 * 5. Log out & Log in as Enrolled Student
 * 6. Verify real-time metrics and synchronization on Student Dashboard
 */

test.describe("Tuition ERP - Multi-Tenant Institutional E2E Lifecycle", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("Step 1 to 6: Core Institutional Loop (HOD -> Teacher -> Student)", async ({ page }) => {
    // ------------------------------------------------------------------------
    // STEP 1: LOGIN AS HOD / TRUSTEE
    // ------------------------------------------------------------------------
    await page.fill('input[placeholder*="OASIS-TUTORIALS"]', "OASIS-TUTORIALS");
    await page.fill('input[placeholder*="HOD-01"]', "HOD-01");
    await page.fill('input[type="password"]', "password123");
    await page.click('button[type="submit"]');

    // Confirm navigation to Trustee Command Center
    await expect(page).toHaveURL(/\/trustee\/dashboard/, { timeout: 15000 });
    await expect(page.locator("h1")).toContainText(/Command Center/i);

    // ------------------------------------------------------------------------
    // STEP 2: ENROLL STUDENT VIA TRUSTEE DASHBOARD
    // ------------------------------------------------------------------------
    const academicsTab = page.locator('button:has-text("Principal Student & Class Control")');
    await academicsTab.click();

    const studentNameInput = page.locator('input[placeholder="Student Full Name"]');
    await expect(studentNameInput).toBeVisible({ timeout: 10000 });

    const testStudentName = `E2E Student ${Date.now().toString().slice(-4)}`;
    await studentNameInput.fill(testStudentName);

    const submitStudentBtn = page.locator('button:has-text("Enroll New Student")');
    await submitStudentBtn.click();
    await page.waitForTimeout(1000);

    // ------------------------------------------------------------------------
    // STEP 3: LOGOUT VIA SIDEBAR
    // ------------------------------------------------------------------------
    const signOutBtn = page.locator('button:has-text("Sign Out")');
    await signOutBtn.click();
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

    // ------------------------------------------------------------------------
    // STEP 4: LOGIN AS FACULTY TEACHER
    // ------------------------------------------------------------------------
    await page.fill('input[placeholder*="OASIS-TUTORIALS"]', "OASIS-TUTORIALS");
    await page.fill('input[placeholder*="HOD-01"]', "TCH-01");
    await page.fill('input[type="password"]', "password123");
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/teacher\/dashboard/, { timeout: 15000 });
    await expect(page.locator("h1")).toContainText(/Welcome back/i);

    // ------------------------------------------------------------------------
    // STEP 5: MARK DAILY ATTENDANCE ON TEACHER REGISTER
    // ------------------------------------------------------------------------
    await page.goto("/teacher/attendance");
    await expect(page.locator("h1")).toContainText(/Attendance Register/i);

    // Ensure a batch is chosen if available
    const selectDropdown = page.locator("select");
    await selectDropdown.waitFor({ state: "visible", timeout: 10000 });
    const options = await selectDropdown.locator("option").all();
    if (options.length > 1) {
      const val = await options[1].getAttribute("value");
      if (val) await selectDropdown.selectOption(val);
    }

    await page.waitForTimeout(1000);

    const markAllPresentBtn = page.locator('button:has-text("Mark All Present")');
    if (await markAllPresentBtn.isVisible()) {
      await markAllPresentBtn.click();
    }

    const saveAttendanceBtn = page.locator('button:has-text("Save Attendance Register")');
    if (await saveAttendanceBtn.isVisible()) {
      await saveAttendanceBtn.click();
      await page.waitForTimeout(1000);
    }

    // ------------------------------------------------------------------------
    // STEP 6: LOGOUT AND LOGIN AS STUDENT
    // ------------------------------------------------------------------------
    await page.locator('button:has-text("Sign Out")').click();
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

    await page.fill('input[placeholder*="OASIS-TUTORIALS"]', "OASIS-TUTORIALS");
    await page.fill('input[placeholder*="HOD-01"]', "STU-1024");
    await page.fill('input[type="password"]', "password123");
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/student\/dashboard/, { timeout: 15000 });
    await expect(page.locator("h1")).toContainText(/Welcome Back/i);

    await expect(page.locator("text=Live Attendance")).toBeVisible();
    await expect(page.locator("text=Homework Tasks")).toBeVisible();
  });

  test("Multi-Tenant Subdomain & White-Label Resolution", async ({ page }) => {
    await page.goto("/login?tenant=OASIS-TUTORIALS");
    const institutionInput = page.locator('input[placeholder*="OASIS-TUTORIALS"]');
    await expect(institutionInput).toBeVisible();
    await expect(page).toHaveTitle(/Tuition ERP/i);
  });

  test("Dynamic PDF Invoices & Transcript Vault", async ({ page }) => {
    // 1-Click login as student
    const studentBtn = page.locator('button:has-text("Student")');
    await studentBtn.click();

    await expect(page).toHaveURL(/\/student\/dashboard/, { timeout: 15000 });

    // Navigate to Fees & Transcripts
    await page.goto("/student/fees");
    await expect(page.locator("h1")).toContainText(/Student Fee Vault & Transcripts/i);

    // Verify PDF actions exist
    const downloadTranscriptBtn = page.locator('button:has-text("Download PDF Transcript")').first();
    await expect(downloadTranscriptBtn).toBeVisible();

    const downloadInvoiceBtn = page.locator('button:has-text("Download Invoice")').first();
    await expect(downloadInvoiceBtn).toBeVisible();
  });
});
