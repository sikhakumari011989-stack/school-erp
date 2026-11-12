# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: finance-documents.spec.js >> Academic OS - Phase 3 Financial Ledger & Document Engine >> Desktop Viewport (1024x768) >> Test 1 (Payment & Ledger): Student views fee ledger & offline guidance; Razorpay is eradicated (Desktop)
- Location: tests\e2e\finance-documents.spec.js:45:7

# Error details

```
Error: page.reload: net::ERR_ABORTED; maybe frame was detached?
Call log:
  - waiting for navigation until "load"

```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | import crypto from "crypto";
  3   | 
  4   | /**
  5   |  * PHASE 3 E2E TEST SUITE: FINANCIAL LEDGER, RECONCILIATION, MAKER-CHECKER & PDF DOCUMENTS
  6   |  * Academic OS - Multi-Tenant School ERP SaaS (React 19, Vite 8, Tailwind v4, Supabase)
  7   |  * 
  8   |  * Verifies:
  9   |  * 1. Test 1 (Payment Initiation & Ledger): Student (STU) cannot spoof payment amounts.
  10  |  *    Server-side API (/api/razorpay/create-order) recalculates and enforces authoritative database amount.
  11  |  * 2. Test 2 (Maker-Checker Reversal): Accountant (ACC) cannot directly reverse or delete paid fee records.
  12  |  *    Accountant submits a Reversal Request, and Principal (PRIN) independently approves it.
  13  |  *    Ledger accurately reflects the reversal and offsetting credit note.
  14  |  * 3. Test 3 (Document Layout & Accuracy): Generates PDF Fee Receipt & Student Report Card.
  15  |  *    Verifies correct school_logo rendering, exact numeric totals, and strict A4 print boundary containment.
  16  |  */
  17  | 
  18  | const VIEWPORTS = [
  19  |   { name: "Desktop", width: 1024, height: 768 },
  20  |   { name: "Mobile", width: 375, height: 667 },
  21  | ];
  22  | 
  23  | test.describe("Academic OS - Phase 3 Financial Ledger & Document Engine", () => {
  24  |   for (const vp of VIEWPORTS) {
  25  |     test.describe(`${vp.name} Viewport (${vp.width}x${vp.height})`, () => {
  26  |       test.use({ viewport: { width: vp.width, height: vp.height } });
  27  | 
  28  |       test.beforeEach(async ({ page }) => {
  29  |         page.on("pageerror", (err) => {
  30  |           console.error(`[Browser PageError - ${vp.name}]`, err.message);
  31  |         });
  32  |         await page.goto("/login");
  33  |         await page.evaluate(async () => {
  34  |           sessionStorage.clear();
  35  |           localStorage.clear();
  36  |           const { seedMockTenants } = await import("/src/utils/seedMockTenants.js");
  37  |           seedMockTenants(true);
  38  |         });
> 39  |         await page.reload();
      |                    ^ Error: page.reload: net::ERR_ABORTED; maybe frame was detached?
  40  |       });
  41  | 
  42  |       // -----------------------------------------------------------------------
  43  |       // TEST 1: STUDENT FEE LEDGER, OFFLINE GUIDANCE & RAZORPAY ERADICATION
  44  |       // -----------------------------------------------------------------------
  45  |       test(`Test 1 (Payment & Ledger): Student views fee ledger & offline guidance; Razorpay is eradicated (${vp.name})`, async ({ page }) => {
  46  |         // Authenticate as School A Student STU-01
  47  |         await page.fill('[data-testid="input-institution-code"]', "SCHOOL-A");
  48  |         await page.fill('[data-testid="input-personal-code"]', "STU-01");
  49  |         await page.fill('[data-testid="input-password"]', "password123");
  50  |         await page.click('[data-testid="btn-login-submit"]');
  51  | 
  52  |         await expect(page).toHaveURL(/\/student\/dashboard/, { timeout: 15000 });
  53  | 
  54  |         // Navigate to student fees portal
  55  |         await page.goto("/student/fees");
  56  |         await expect(page).toHaveURL(/\/student\/fees/, { timeout: 10000 });
  57  | 
  58  |         // Verify fee vault & offline guidance cards are rendered in Voyager Dark theme
  59  |         const ledgerHeader = page.locator("h1:has-text('Fee Records & Official Transcripts')");
  60  |         await expect(ledgerHeader).toBeVisible({ timeout: 10000 });
  61  | 
  62  |         const campusSettlementCard = page.locator("text=Campus Settlement Mode");
  63  |         await expect(campusSettlementCard).toBeVisible({ timeout: 10000 });
  64  | 
  65  |         // Confirm Razorpay checkout /student/pay is completely eradicated
  66  |         await page.goto("/student/pay");
  67  |         // Should redirect away from /student/pay (either to dashboard or login or root)
  68  |         await page.waitForTimeout(1000);
  69  |         expect(page.url()).not.toContain("/student/pay");
  70  |       });
  71  | 
  72  |       // -----------------------------------------------------------------------
  73  |       // TEST 2: MAKER-CHECKER REVERSAL WORKFLOW & RLS HARDENING
  74  |       // -----------------------------------------------------------------------
  75  |       test(`Test 2 (Maker-Checker Reversal): Accountant cannot direct-reverse; Principal approves reversal into ledger (${vp.name})`, async ({ page }) => {
  76  |         // Step A: Login as Accountant in School A
  77  |         await page.fill('[data-testid="input-institution-code"]', "SCHOOL-A");
  78  |         await page.fill('[data-testid="input-personal-code"]', "ACC-01");
  79  |         await page.fill('[data-testid="input-password"]', "password123");
  80  |         await page.click('[data-testid="btn-login-submit"]');
  81  | 
  82  |         await expect(page).toHaveURL(/\/accountant\/dashboard/, { timeout: 15000 });
  83  |         await expect(page.locator("h1:has-text('Accountant Command Center')")).toBeVisible();
  84  | 
  85  |         // Negative Test: Direct ledger delete / reversal by Accountant is blocked
  86  |         const directDeleteBlocked = await page.evaluate(async () => {
  87  |           try {
  88  |             // Attempt direct deletion without Principal authorization
  89  |             const { supabase } = await import("/src/supabaseClient.js");
  90  |             if (supabase) {
  91  |               const { error } = await supabase
  92  |                 .from("fee_ledger")
  93  |                 .delete()
  94  |                 .eq("id", "a0000000-0000-0000-0000-000000000005");
  95  |               return Boolean(error);
  96  |             }
  97  |             return true;
  98  |           } catch {
  99  |             return true;
  100 |           }
  101 |         });
  102 |         expect(directDeleteBlocked).toBe(true);
  103 | 
  104 |         // Step B: Accountant initiates a Maker-Checker Reversal Request
  105 |         // Find row for Ethan Murphy (STU-05) in fee ledger with settled ₹25,000
  106 |         const ethanRow = page
  107 |           .locator("tr:has-text('Ethan Murphy')")
  108 |           .filter({ has: page.locator("button:has-text('Reversal')") })
  109 |           .first();
  110 |         await expect(ethanRow).toBeVisible({ timeout: 10000 });
  111 |         const reversalBtn = ethanRow.locator("button:has-text('Reversal')");
  112 |         await expect(reversalBtn).toBeVisible({ timeout: 10000 });
  113 |         await reversalBtn.click();
  114 | 
  115 |         // Modal opens: "Request Fee Reversal / Credit Note"
  116 |         const modalHeading = page.locator("h3:has-text('Request Fee Reversal / Credit Note')");
  117 |         await expect(modalHeading).toBeVisible();
  118 | 
  119 |         // Fill reason and submit to Principal
  120 |         const reasonInput = page.locator("textarea, input[placeholder*='Reason']").first();
  121 |         if (await reasonInput.isVisible()) {
  122 |           await reasonInput.fill("Scholarship Concession Adjustment - Principal Approval Requested");
  123 |         }
  124 | 
  125 |         const submitToPrincipalBtn = page.locator("button:has-text('Submit to Principal')");
  126 |         await expect(submitToPrincipalBtn).toBeVisible();
  127 |         await submitToPrincipalBtn.click();
  128 | 
  129 |         // Verify modal closes
  130 |         await expect(modalHeading).not.toBeVisible({ timeout: 5000 });
  131 | 
  132 |         // Step C: Accountant signs out; Principal logs in
  133 |         await page.evaluate(() => {
  134 |           localStorage.removeItem("erp_session_user");
  135 |           sessionStorage.clear();
  136 |         });
  137 |         await page.goto("/login");
  138 | 
  139 |         await page.fill('[data-testid="input-institution-code"]', "SCHOOL-A");
```