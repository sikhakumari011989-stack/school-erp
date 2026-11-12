import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";

test("Tuition Mode Integration: StudentDashboard Dynamic Tenant Logic", async (t) => {
  const dashSrc = fs.readFileSync("src/pages/StudentDashboard.jsx", "utf8");

  await t.test("Accesses institution_type flag from AppContext with fallback resilience", () => {
    assert.ok(dashSrc.includes("institution_type"), "Must access institution_type from AppContext");
    assert.ok(dashSrc.includes("isTuition"), "Must derive isTuition flag");
  });

  await t.test("Terminological Swaps: Homework -> Pending DPPs & Assignments; Examinations -> Mock Tests & Performance", () => {
    assert.ok(
      dashSrc.includes("Pending DPPs & Assignments") && dashSrc.includes("Pending Homework"),
      "Must support Pending DPPs & Assignments in tuition mode and Pending Homework in school mode"
    );
    assert.ok(
      dashSrc.includes("Mock Tests & Performance") && (dashSrc.includes("Examinations & Marks") || dashSrc.includes("Timed Assessment Arena")),
      "Must support Mock Tests & Performance in tuition mode and Examinations in school mode"
    );
    assert.ok(
      dashSrc.includes('isTuition ? "Batch" : "Class"') || dashSrc.includes("Batch"),
      "Must map Class labels to Batch for tuition mode"
    );
  });

  await t.test("Bento Grid Re-prioritization: Next Batch vs Full Day Timetable", () => {
    assert.ok(dashSrc.includes("Next Batch"), "Must include Next Batch widget for tuition mode");
    assert.ok(dashSrc.includes("Full Day Timetable"), "Must include Full Day Timetable for school mode");
  });

  await t.test("School Only Modules: Transport & Health cards hidden in tuition mode", () => {
    assert.ok(dashSrc.includes("!isTuition"), "Must conditionally gate modules on !isTuition");
    assert.ok(dashSrc.includes("Institutional Bus Fleet") || dashSrc.includes("Bus Fleet"), "Must render bus fleet only in school mode");
    assert.ok(dashSrc.includes("Campus Health") || dashSrc.includes("Clinic Health"), "Must render health clinic only in school mode");
  });

  await t.test("Performance Focus: Recent Test Scores top-row elevation with neon indigo accent", () => {
    assert.ok(dashSrc.includes("RecentTestScores"), "Must import RecentTestScores");
    assert.ok(dashSrc.includes("border-indigo-500"), "Must style elevated test scores with border-indigo-500 accent");
  });

  await t.test("Razorpay Eradication: /student/pay route eradicated from dashboard actions", () => {
    assert.ok(!dashSrc.includes('navigate("/student/pay")'), "StudentDashboard must not navigate to /student/pay");
    assert.ok(dashSrc.includes('navigate("/student/fees")'), "StudentDashboard must navigate to /student/fees for verified ledger");
  });
});

test("Architecture Simplification: Eradication of Razorpay and Theme Context", async (t) => {
  await t.test("Razorpay files permanently eradicated from disk", () => {
    assert.strictEqual(fs.existsSync("api/razorpay/create-order.js"), false, "create-order.js must be deleted");
    assert.strictEqual(fs.existsSync("api/razorpay/verify-payment.js"), false, "verify-payment.js must be deleted");
    assert.strictEqual(fs.existsSync("api/razorpay-webhook.js"), false, "razorpay-webhook.js must be deleted");
    assert.strictEqual(fs.existsSync("src/pages/StudentRazorpayCheckout.jsx"), false, "StudentRazorpayCheckout.jsx must be deleted");
  });

  await t.test("Theme files permanently eradicated and index.html locked to dark", () => {
    assert.strictEqual(fs.existsSync("src/Components/ThemeToggle.jsx"), false, "ThemeToggle.jsx must be deleted");
    assert.strictEqual(fs.existsSync("src/context/ThemeContext.jsx"), false, "ThemeContext.jsx must be deleted");

    const indexHtml = fs.readFileSync("index.html", "utf8");
    assert.ok(indexHtml.includes('<html lang="en" class="dark">'), "index.html must hardcode dark class on root html");
    assert.ok(!indexHtml.includes("erp_theme_mode"), "index.html must not contain theme mode toggle script");
    assert.ok(!indexHtml.includes("checkout.razorpay.com"), "index.html must not inject Razorpay SDK script");
  });

  await t.test("Vite config does not register razorpay middleware plugin", () => {
    const viteConfig = fs.readFileSync("vite.config.js", "utf8");
    assert.ok(!viteConfig.includes("razorpayDevPlugin"), "vite.config.js must not register razorpayDevPlugin");
    assert.ok(!viteConfig.includes("/api/razorpay/"), "vite.config.js must not handle razorpay endpoints");
  });
});
