# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: academic-ai.spec.js >> Academic OS - Phase 4 Academic Operations & AI Intelligence Engine >> Desktop Viewport (1024x768) >> Test 3 (AI Hallucination Check): Predefined prompt returns exact missing registers; non-existent query falls back safely (Desktop)
- Location: tests\e2e\academic-ai.spec.js:206:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('h2:has-text(\'Institutional Intelligence Briefing\')')
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('h2:has-text(\'Institutional Intelligence Briefing\')') with timeout 15000ms
  - waiting for locator('h2:has-text(\'Institutional Intelligence Briefing\')')

```

```yaml
- main:
  - img "School Crest"
  - text: Multi-Tenant Enterprise ERP
  - heading "Institutional OS Login" [level=1]
  - paragraph: Enter your institutional credentials to access your isolated role workspace
  - text: Institution Access Code e.g. CAMPUS-01
  - textbox "e.g. PALGHAR-01": SCHOOL-A
  - text: Personal ID or Institutional Email PRIN-01, HOD-01, TCH-01
  - textbox "Personal ID or Institutional Email":
    - /placeholder: PRIN-01 or user@school.com
    - text: PRIN-01
  - text: Security Password
  - textbox "Security Password":
    - /placeholder: ••••••••••••
    - text: password123
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
  125 | 
  126 |         await page.fill('[data-testid="input-institution-code"]', "SCHOOL-A");
  127 |         await page.fill('[data-testid="input-personal-code"]', "TCH-01");
  128 |         await page.fill('[data-testid="input-password"]', "password123");
  129 |         await page.click('[data-testid="btn-login-submit"]');
  130 | 
  131 |         await expect(page).toHaveURL(/\/teacher\/dashboard/, { timeout: 15000 });
  132 | 
  133 |         // Navigate to Teacher Attendance portal
  134 |         await page.goto("/teacher/attendance");
  135 |         await expect(page).toHaveURL(/\/teacher\/attendance/, { timeout: 10000 });
  136 | 
  137 |         // Select Class 10-A
  138 |         const batchSelect = page.locator('[data-testid="select-batch"]');
  139 |         await expect(batchSelect).toBeVisible({ timeout: 10000 });
  140 |         await batchSelect.selectOption("Class 10-A");
  141 |         await expect(page.locator("text=Class 10-A Student Roster Roll List")).toBeVisible({ timeout: 10000 });
  142 | 
  143 |         // Wait for STU-01 toggle button
  144 |         const stu01Toggle = page.locator('[data-testid="btn-toggle-attendance-STU-01"]');
  145 |         await expect(stu01Toggle).toBeVisible({ timeout: 10000 });
  146 |         await stu01Toggle.scrollIntoViewIfNeeded();
  147 | 
  148 |         // Check if currently PRESENT; if so, toggle to ABSENT
  149 |         const buttonText = await stu01Toggle.innerText();
  150 |         if (buttonText.includes("PRESENT")) {
  151 |           await stu01Toggle.click();
  152 |         }
  153 |         await expect(stu01Toggle).toContainText("ABSENT", { timeout: 5000 });
  154 | 
  155 |         // Save Attendance Register
  156 |         const saveAttendanceBtn = page.locator('[data-testid="btn-save-attendance"]');
  157 |         await saveAttendanceBtn.click();
  158 | 
  159 |         // Verify save confirmation toast
  160 |         const saveNotice = page.locator('text=/Attendance register saved|Attendance synchronized/');
  161 |         await expect(saveNotice.first()).toBeVisible({ timeout: 10000 });
  162 | 
  163 |         // Log out teacher and log in as Student STU-01
  164 |         await page.evaluate(() => {
  165 |           sessionStorage.clear();
  166 |           localStorage.removeItem("erp_session_user");
  167 |           localStorage.removeItem("supabase.auth.token");
  168 |         });
  169 |         await page.goto("/login?signedOut=true");
  170 | 
  171 |         await page.fill('[data-testid="input-institution-code"]', "SCHOOL-A");
  172 |         await page.fill('[data-testid="input-personal-code"]', "STU-01");
  173 |         await page.fill('[data-testid="input-password"]', "password123");
  174 |         await page.click('[data-testid="btn-login-submit"]');
  175 | 
  176 |         await expect(page).toHaveURL(/\/student\/dashboard/, { timeout: 15000 });
  177 | 
  178 |         // Assert Bento Card 1 displays "Absent Today" badge
  179 |         const todayBadge = page.locator('[data-testid="badge-today-attendance"]');
  180 |         await expect(todayBadge).toBeVisible({ timeout: 10000 });
  181 |         await expect(todayBadge).toContainText("Absent Today");
  182 | 
  183 |         // Assert Student Privacy: Check that no peer attendance percentage or individual status is exposed
  184 |         const bodyContent = await page.content();
  185 | 
  186 |         // STU-02 through STU-10 should NOT have their individual attendance percentage leaked
  187 |         // Peer scholars in AttendanceStreak show "Scholar • Verified Punctuality Tier"
  188 |         const leakedPeerRates = await page.evaluate(() => {
  189 |           // Look for any elements indicating peer attendance rates
  190 |           const peerItems = document.querySelectorAll("p.font-mono");
  191 |           const leaked = [];
  192 |           peerItems.forEach((el) => {
  193 |             const txt = el.textContent || "";
  194 |             if (txt.includes("STU-02") && txt.includes("%")) leaked.push(txt);
  195 |             if (txt.includes("STU-03") && txt.includes("%")) leaked.push(txt);
  196 |           });
  197 |           return leaked;
  198 |         });
  199 | 
  200 |         expect(leakedPeerRates.length).toBe(0);
  201 |       });
  202 | 
  203 |       // -----------------------------------------------------------------------
  204 |       // TEST 3: PRINCIPAL'S AI BRIEFING — DETERMINISTIC METRICS & ZERO HALLUCINATION
  205 |       // -----------------------------------------------------------------------
  206 |       test(`Test 3 (AI Hallucination Check): Predefined prompt returns exact missing registers; non-existent query falls back safely (${vp.name})`, async ({ page }) => {
  207 |         // Authenticate as Principal PRIN-01 in School A
  208 |         await page.goto("/login");
  209 |         await page.evaluate(async () => {
  210 |           sessionStorage.clear();
  211 |           localStorage.removeItem("erp_session_user");
  212 |           const { seedMockTenants } = await import("/src/utils/seedMockTenants.js");
  213 |           seedMockTenants(true);
  214 |         });
  215 | 
  216 |         await page.fill('[data-testid="input-institution-code"]', "SCHOOL-A");
  217 |         await page.fill('[data-testid="input-personal-code"]', "PRIN-01");
  218 |         await page.fill('[data-testid="input-password"]', "password123");
  219 |         await page.click('[data-testid="btn-login-submit"]');
  220 | 
  221 |         await expect(page).toHaveURL(/\/principal\/dashboard/, { timeout: 15000 });
  222 | 
  223 |         // Verify Principal AI Briefing card is visible
  224 |         const briefingTitle = page.locator("h2:has-text('Institutional Intelligence Briefing')");
> 225 |         await expect(briefingTitle).toBeVisible({ timeout: 15000 });
      |                                     ^ Error: expect(locator).toBeVisible() failed
  226 | 
  227 |         // Search for predefined prompt "Missing attendance registers"
  228 |         const searchInput = page.locator('[data-testid="input-prompt-search"]');
  229 |         await expect(searchInput).toBeVisible({ timeout: 10000 });
  230 |         await searchInput.fill("Missing attendance registers");
  231 | 
  232 |         // Find the matched prompt button for missing registers (att_unmarked_registers)
  233 |         const promptBtn = page.locator('[data-testid="btn-prompt-att_unmarked_registers"]');
  234 |         await expect(promptBtn).toBeVisible({ timeout: 5000 });
  235 |         await promptBtn.click();
  236 | 
  237 |         // Assert AI Briefing evaluates the exact mathematical missing registers count
  238 |         const resultDrawer = page.locator('[data-testid="ai-prompt-result"]');
  239 |         await expect(resultDrawer).toBeVisible({ timeout: 10000 });
  240 | 
  241 |         const resultHeadline = page.locator('[data-testid="ai-prompt-headline"]');
  242 |         await expect(resultHeadline).toBeVisible({ timeout: 5000 });
  243 |         const headlineText = await resultHeadline.innerText();
  244 | 
  245 |         // In School A, either all or specific pending registers are reported with exact count (not hallucinated numbers)
  246 |         expect(headlineText).toMatch(/(Class Register\(s\) Pending Submission Today|All Class Registers Submitted for Today)/);
  247 | 
  248 |         // Adversarial Query: Search for a completely non-existent institutional domain ("Alumni donations")
  249 |         await searchInput.fill("Alumni donations");
  250 | 
  251 |         // Predefined catalog should have 0 matches for "Alumni donations"
  252 |         const adhocBtn = page.locator('[data-testid="btn-run-adhoc-prompt"]');
  253 |         await expect(adhocBtn).toBeVisible({ timeout: 5000 });
  254 |         await adhocBtn.click();
  255 | 
  256 |         // Assert the AI Engine returns a strict "Data Unavailable" fallback state without hallucinating numbers
  257 |         await expect(resultDrawer).toBeVisible({ timeout: 10000 });
  258 |         const fallbackHeadline = await resultHeadline.innerText();
  259 | 
  260 |         expect(fallbackHeadline).toContain("Data Unavailable");
  261 |         expect(fallbackHeadline).toContain("Zero Institutional Records");
  262 | 
  263 |         // Verify bullet points explicitly state zero hallucinated metrics
  264 |         const bulletsText = await resultDrawer.innerText();
  265 |         expect(bulletsText).toContain("No telemetry, database tables, or institutional records exist");
  266 |         expect(bulletsText).toContain("safely declined this inquiry without hallucinating metrics");
  267 |       });
  268 |     });
  269 |   }
  270 | });
  271 | 
```