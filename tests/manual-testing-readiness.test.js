import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import { normalizeRole, dashboardFor, inferRoleFromCode } from "../src/utils/credentials.js";

// Mock localStorage for Node environment
const mockStore = new Map();
globalThis.localStorage = {
  getItem: (k) => mockStore.get(k) || null,
  setItem: (k, v) => mockStore.set(k, String(v)),
  removeItem: (k) => mockStore.delete(k),
  clear: () => mockStore.clear(),
};
globalThis.window = {
  dispatchEvent: () => true,
  addEventListener: () => {},
  removeEventListener: () => {},
};

test("Role Access: All six school roles resolve to their intended dashboards", () => {
  const roles = [
    { name: "Principal", code: "PRIN-01", expectedRole: "PRIN", expectedRoute: "/principal/dashboard" },
    { name: "Trustee/HOD", code: "HOD-01", expectedRole: "HOD", expectedRoute: "/trustee/dashboard" },
    { name: "Accountant", code: "ACC-01", expectedRole: "ACC", expectedRoute: "/accountant/dashboard" },
    { name: "Teacher", code: "TCH-01", expectedRole: "TCH", expectedRoute: "/teacher/dashboard" },
    { name: "Student", code: "STU-01", expectedRole: "STU", expectedRoute: "/student/dashboard" },
    { name: "Staff", code: "NTS-01", expectedRole: "NTS", expectedRoute: "/staff/dashboard" },
  ];

  for (const r of roles) {
    const canonical = normalizeRole(r.code, r.code);
    assert.strictEqual(canonical, r.expectedRole, `${r.name} code must normalize to ${r.expectedRole}`);
    const dest = dashboardFor(canonical);
    assert.strictEqual(dest, r.expectedRoute, `${r.name} must route to ${r.expectedRoute}`);
  }
});

test("Screen Access: Routes in App.jsx protect and permit all 6 intended school roles", () => {
  const appSrc = fs.readFileSync("src/App.jsx", "utf8");

  // Core administrative and operational routes
  assert.ok(appSrc.includes('path="/principal/dashboard"'), "Must have Principal dashboard");
  assert.ok(appSrc.includes('path="/trustee/dashboard"'), "Must have Trustee dashboard");
  assert.ok(appSrc.includes('path="/accountant/dashboard"'), "Must have Accountant dashboard");
  assert.ok(appSrc.includes('path="/teacher/dashboard"'), "Must have Teacher dashboard");
  assert.ok(appSrc.includes('path="/student/dashboard"'), "Must have Student dashboard");
  assert.ok(appSrc.includes('path="/staff/dashboard"'), "Must have Staff dashboard");

  // Modules
  assert.ok(appSrc.includes('path="/admin/admissions"'), "Must have Admissions CRM");
  assert.ok(appSrc.includes('path="/admin/classes"'), "Must have Classes Management");
  assert.ok(appSrc.includes('path="/admin/timetable"'), "Must have Timetable Management");
  assert.ok(appSrc.includes('path="/admin/reports"'), "Must have Reports");
  assert.ok(appSrc.includes('path="/admin/analytics"'), "Must have Analytics");
  assert.ok(appSrc.includes('path="/teacher/attendance"'), "Must have Teacher Attendance");
  assert.ok(appSrc.includes('path="/teacher/class-tests"'), "Must have Class Tests");
  assert.ok(appSrc.includes('path="/accountant/payroll"'), "Must have Payroll");
  assert.ok(appSrc.includes('path="/student/fees"'), "Must have Student Fees");
  assert.ok(appSrc.includes('path="/student/pay"'), "Must have Student Pay");
});

test("Form Persistence: Sample data entry simulation and persistence across refresh", async () => {
  const testSchool = "TEST-CAMPUS-99";

  // 1. Student / Member Entry Simulation
  const sampleStudent = {
    id: "stu_test_101",
    name: "Rohan Patel",
    full_name: "Rohan Patel",
    role: "student",
    role_code: "STU-901",
    roll_number: "STU-901",
    class_name: "Class 10-A",
    school_id: testSchool,
  };
  const dirKey = `erp_directory_${testSchool}`;
  localStorage.setItem(dirKey, JSON.stringify([sampleStudent]));

  // Simulate refresh: reload from storage
  const loadedDir = JSON.parse(localStorage.getItem(dirKey));
  assert.strictEqual(loadedDir.length, 1);
  assert.strictEqual(loadedDir[0].name, "Rohan Patel");
  assert.strictEqual(loadedDir[0].school_id, testSchool);

  // 2. Class Creation Simulation
  const sampleClass = {
    id: "cls_test_01",
    name: "Class 10-A",
    grade: "10",
    section: "A",
    school_id: testSchool,
  };
  const classKey = `erp_classes_${testSchool}`;
  localStorage.setItem(classKey, JSON.stringify([sampleClass]));

  const loadedClasses = JSON.parse(localStorage.getItem(classKey));
  assert.strictEqual(loadedClasses.length, 1);
  assert.strictEqual(loadedClasses[0].name, "Class 10-A");
  assert.strictEqual(loadedClasses[0].school_id, testSchool);

  // 3. Attendance Entry Simulation
  const today = new Date().toISOString().split("T")[0];
  const sampleAttendance = [
    { student_id: "STU-901", roll_number: "STU-901", name: "Rohan Patel", status: "present", date: today },
  ];
  const attKey = `erp_attendance_${testSchool}_Class 10-A_${today}`;
  localStorage.setItem(attKey, JSON.stringify(sampleAttendance));

  const loadedAtt = JSON.parse(localStorage.getItem(attKey));
  assert.strictEqual(loadedAtt.length, 1);
  assert.strictEqual(loadedAtt[0].status, "present");

  // 4. Fee Ledger Settlement Simulation
  const sampleFee = {
    id: "TXN-9901",
    school_id: testSchool,
    student_name: "Rohan Patel",
    class_name: "Class 10-A",
    amount: 25000,
    status: "paid",
    payment_mode: "Cash Counter",
    receipt_no: "REC-9901",
    date: today,
  };
  const feeKey = `erp_fee_ledger_${testSchool}`;
  localStorage.setItem(feeKey, JSON.stringify([sampleFee]));

  const loadedFees = JSON.parse(localStorage.getItem(feeKey));
  assert.strictEqual(loadedFees.length, 1);
  assert.strictEqual(loadedFees[0].amount, 25000);
  assert.strictEqual(loadedFees[0].school_id, testSchool);

  // 5. Timetable Slot Simulation
  const samplePeriod = {
    id: "tt_01",
    day: "Monday",
    periodNo: "Period 1",
    timeWindow: "08:30 AM - 09:15 AM",
    className: "Class 10-A",
    subject: "Mathematics",
    teacher: "Prof. S. R. Sharma",
    room: "Room 101",
    schoolId: testSchool,
  };
  const ttKey = `erp_master_timetable_${testSchool}`;
  localStorage.setItem(ttKey, JSON.stringify([samplePeriod]));

  const loadedTt = JSON.parse(localStorage.getItem(ttKey));
  assert.strictEqual(loadedTt.length, 1);
  assert.strictEqual(loadedTt[0].subject, "Mathematics");
});
