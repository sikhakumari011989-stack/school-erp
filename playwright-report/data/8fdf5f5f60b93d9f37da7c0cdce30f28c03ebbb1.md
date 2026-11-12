# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: institutional-loop.spec.js >> Tuition ERP - Multi-Tenant Institutional E2E Lifecycle >> Multi-Tenant Subdomain & White-Label Resolution
- Location: tests\e2e\institutional-loop.spec.js:111:3

# Error details

```
Error: expect(page).toHaveTitle(expected) failed

Expected pattern: /Tuition ERP/i
Received string:  "EduSaaS ERP | Multi-Tenant Tuition & School OS"
Timeout: 10000ms

Call log:
  - Expect "toHaveTitle" with timeout 10000ms
    21 × locator resolved to <html lang="en" class="dark">…</html>
       - unexpected value "EduSaaS ERP | Multi-Tenant Tuition & School OS"

```

```yaml
- main:
  - img "School Crest"
  - text: Multi-Tenant Enterprise ERP
  - heading "Institutional OS Login" [level=1]
  - paragraph: Enter your institutional credentials to access your isolated role workspace
  - text: Institution Access Code e.g. CAMPUS-01
  - textbox "e.g. PALGHAR-01": OASIS-TUTORIALS
  - text: Personal ID or Institutional Email PRIN-01, HOD-01, TCH-01
  - textbox "Personal ID or Institutional Email":
    - /placeholder: PRIN-01 or user@school.com
  - text: Security Password
  - textbox "Security Password":
    - /placeholder: ••••••••••••
  - button "Show password"
  - paragraph: "Quick Role Test Logins (Password: password123)"
  - button "Principal (PRIN-01)"
  - button "Trustee (HOD) (HOD-01)"
  - button "Accountant (ACC-01)"
  - button "Teacher (TCH-01)"
  - button "Student (STU-01)"
  - button "Sign In to Institutional Workspace"
  - text: Multi-Tenant Row-Level Security Protected
  - paragraph:
    - text: "Support:"
    - link "sikhakumari011989@gmail.com":
      - /url: mailto:sikhakumari011989@gmail.com
    - text: • +91 9518388499
  - button "Clear Session Cache & Reset"
  - paragraph: © 2026 Academic OS ERP. All rights reserved.
- button "📲 Install App"
- button "✕"
```

# Test source

```ts
  16  |   });
  17  | 
  18  |   test("Step 1 to 6: Core Institutional Loop (HOD -> Teacher -> Student)", async ({ page }) => {
  19  |     // ------------------------------------------------------------------------
  20  |     // STEP 1: LOGIN AS HOD / TRUSTEE
  21  |     // ------------------------------------------------------------------------
  22  |     await page.fill('[data-testid="input-institution-code"]', "OASIS-TUTORIALS");
  23  |     await page.fill('[data-testid="input-personal-code"]', "HOD-01");
  24  |     await page.fill('[data-testid="input-password"]', "password123");
  25  |     await page.click('[data-testid="btn-login-submit"]');
  26  | 
  27  |     // Confirm navigation to Trustee Command Center
  28  |     await expect(page).toHaveURL(/\/trustee\/dashboard/, { timeout: 15000 });
  29  |     await expect(page.locator("h1")).toContainText(/Command Center/i);
  30  | 
  31  |     // ------------------------------------------------------------------------
  32  |     // STEP 2: ENROLL STUDENT VIA TRUSTEE DASHBOARD
  33  |     // ------------------------------------------------------------------------
  34  |     const academicsTab = page.locator('button:has-text("Principal Student & Class Control")');
  35  |     await academicsTab.click();
  36  | 
  37  |     const studentNameInput = page.locator('input[placeholder="Student Full Name"]');
  38  |     await expect(studentNameInput).toBeVisible({ timeout: 10000 });
  39  | 
  40  |     const testStudentName = `E2E Student ${Date.now().toString().slice(-4)}`;
  41  |     await studentNameInput.fill(testStudentName);
  42  | 
  43  |     const submitStudentBtn = page.locator('button:has-text("Enroll New Student")');
  44  |     await submitStudentBtn.click();
  45  |     await page.waitForTimeout(1000);
  46  | 
  47  |     // ------------------------------------------------------------------------
  48  |     // STEP 3: LOGOUT VIA SIDEBAR
  49  |     // ------------------------------------------------------------------------
  50  |     const signOutBtn = page.locator('button:has-text("Sign Out")');
  51  |     await signOutBtn.click();
  52  |     await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  53  | 
  54  |     // ------------------------------------------------------------------------
  55  |     // STEP 4: LOGIN AS FACULTY TEACHER
  56  |     // ------------------------------------------------------------------------
  57  |     await page.fill('[data-testid="input-institution-code"]', "OASIS-TUTORIALS");
  58  |     await page.fill('[data-testid="input-personal-code"]', "TCH-01");
  59  |     await page.fill('[data-testid="input-password"]', "password123");
  60  |     await page.click('[data-testid="btn-login-submit"]');
  61  | 
  62  |     await expect(page).toHaveURL(/\/teacher\/dashboard/, { timeout: 15000 });
  63  |     await expect(page.locator("h1")).toContainText(/Welcome back/i);
  64  | 
  65  |     // ------------------------------------------------------------------------
  66  |     // STEP 5: MARK DAILY ATTENDANCE ON TEACHER REGISTER
  67  |     // ------------------------------------------------------------------------
  68  |     await page.goto("/teacher/attendance");
  69  |     await expect(page.locator("h1")).toContainText(/Attendance Register/i);
  70  | 
  71  |     // Ensure a batch is chosen if available
  72  |     const selectDropdown = page.locator("select");
  73  |     await selectDropdown.waitFor({ state: "visible", timeout: 10000 });
  74  |     const options = await selectDropdown.locator("option").all();
  75  |     if (options.length > 1) {
  76  |       const val = await options[1].getAttribute("value");
  77  |       if (val) await selectDropdown.selectOption(val);
  78  |     }
  79  | 
  80  |     await page.waitForTimeout(1000);
  81  | 
  82  |     const markAllPresentBtn = page.locator('button:has-text("Mark All Present")');
  83  |     if (await markAllPresentBtn.isVisible()) {
  84  |       await markAllPresentBtn.click();
  85  |     }
  86  | 
  87  |     const saveAttendanceBtn = page.locator('button:has-text("Save Attendance Register")');
  88  |     if (await saveAttendanceBtn.isVisible()) {
  89  |       await saveAttendanceBtn.click();
  90  |       await page.waitForTimeout(1000);
  91  |     }
  92  | 
  93  |     // ------------------------------------------------------------------------
  94  |     // STEP 6: LOGOUT AND LOGIN AS STUDENT
  95  |     // ------------------------------------------------------------------------
  96  |     await page.locator('button:has-text("Sign Out")').click();
  97  |     await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  98  | 
  99  |     await page.fill('[data-testid="input-institution-code"]', "OASIS-TUTORIALS");
  100 |     await page.fill('[data-testid="input-personal-code"]', "STU-1024");
  101 |     await page.fill('[data-testid="input-password"]', "password123");
  102 |     await page.click('[data-testid="btn-login-submit"]');
  103 | 
  104 |     await expect(page).toHaveURL(/\/student\/dashboard/, { timeout: 15000 });
  105 |     await expect(page.locator("h1")).toContainText(/Welcome Back/i);
  106 | 
  107 |     await expect(page.locator("text=Live Attendance")).toBeVisible();
  108 |     await expect(page.locator("text=Homework Tasks")).toBeVisible();
  109 |   });
  110 | 
  111 |   test("Multi-Tenant Subdomain & White-Label Resolution", async ({ page }) => {
  112 |     await page.goto("/login?tenant=OASIS-TUTORIALS");
  113 |     const institutionInput = page.locator('[data-testid="input-institution-code"]');
  114 |     await expect(institutionInput).toBeVisible();
  115 |     await expect(institutionInput).toHaveValue("OASIS-TUTORIALS");
> 116 |     await expect(page).toHaveTitle(/Tuition ERP/i);
      |                        ^ Error: expect(page).toHaveTitle(expected) failed
  117 |   });
  118 | 
  119 |   test("Dynamic PDF Invoices & Transcript Vault", async ({ page }) => {
  120 |     // 1-Click login as student
  121 |     const studentBtn = page.locator('button:has-text("Student")');
  122 |     await studentBtn.click();
  123 |     await page.click('[data-testid="btn-login-submit"]');
  124 | 
  125 |     await expect(page).toHaveURL(/\/student\/dashboard/, { timeout: 15000 });
  126 | 
  127 |     // Navigate to Fees & Transcripts
  128 |     await page.goto("/student/fees");
  129 |     await expect(page.locator("h1")).toContainText(/Student Fee Vault & Transcripts/i);
  130 | 
  131 |     // Verify PDF actions exist
  132 |     const downloadTranscriptBtn = page.locator('button:has-text("Download PDF Transcript")').first();
  133 |     await expect(downloadTranscriptBtn).toBeVisible();
  134 | 
  135 |     const downloadInvoiceBtn = page.locator('button:has-text("Download Invoice")').first();
  136 |     await expect(downloadInvoiceBtn).toBeVisible();
  137 |   });
  138 | });
  139 | 
```