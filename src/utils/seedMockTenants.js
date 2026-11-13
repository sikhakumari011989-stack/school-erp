import { safeStorage } from "./safeStorage.js";

/**
 * MOCK TENANT DEMO DATA SEEDER
 * Generates two isolated multi-tenant schools:
 * 1. SCHOOL-A (School A Academy): 1 PRIN, 1 ACC, 2 TCH, 10 STU
 *    - Edge cases: Extremely long student names, null address fields,
 *      boundary numeric values in fee dues (₹0.00, ₹1.00, ₹99,999,999.00).
 *    - Mixed fee_ledger records (paid and pending) & attendance states.
 * 2. SCHOOL-B (School B International): 1 PRIN, 1 ACC, 1 TCH, 2 STU
 *    - Strict isolated partition to verify tenancy isolation barriers.
 */

export const MOCK_TENANTS = {
  SCHOOL_A: {
    code: "SCHOOL-A",
    name: "School A Academy",
    adminName: "Dr. Eleanor Vance",
    adminId: "PRIN-01",
    institutionMode: "school",
    subscriptionStatus: "active",
    expiryDate: "2028-12-31",
  },
  SCHOOL_B: {
    code: "SCHOOL-B",
    name: "School B International",
    adminName: "Principal Beatrice",
    adminId: "PRIN-B01",
    institutionMode: "school",
    subscriptionStatus: "active",
    expiryDate: "2028-12-31",
  },
};

export const SCHOOL_A_STUDENTS = [
  {
    id: "stu-a-01",
    name: "Alexander Bartholomew Montgomery-Featherstonehaugh III", // Edge case: extremely long name (>50 chars)
    full_name: "Alexander Bartholomew Montgomery-Featherstonehaugh III",
    role: "student",
    role_code: "STU-01",
    roll_number: "STU-01",
    personal_code: "STU-01",
    class_name: "Class 10-A",
    class_id: "class-10-a",
    school_id: "SCHOOL-A",
    institution_code: "SCHOOL-A",
    institution_name: "School A Academy",
    email: "school-a.stu-01@academicos.internal",
    address: "102 Regal Boulevard, Palghar 401404",
    default_password: "password123",
  },
  {
    id: "stu-a-02",
    name: "Liam Chen",
    full_name: "Liam Chen",
    role: "student",
    role_code: "STU-02",
    roll_number: "STU-02",
    personal_code: "STU-02",
    class_name: "Class 10-A",
    class_id: "class-10-a",
    school_id: "SCHOOL-A",
    institution_code: "SCHOOL-A",
    institution_name: "School A Academy",
    email: "school-a.stu-02@academicos.internal",
    address: null, // Edge case: null address field
    default_password: "password123",
  },
  {
    id: "stu-a-03",
    name: "Aarav Sharma",
    full_name: "Aarav Sharma",
    role: "student",
    role_code: "STU-03",
    roll_number: "STU-03",
    personal_code: "STU-03",
    class_name: "Class 10-A",
    class_id: "class-10-a",
    school_id: "SCHOOL-A",
    institution_code: "SCHOOL-A",
    institution_name: "School A Academy",
    email: "school-a.stu-03@academicos.internal",
    address: "Flat 402, Sunshine Heights, Mumbai",
    default_password: "password123",
  },
  {
    id: "stu-a-04",
    name: "Zara Khan",
    full_name: "Zara Khan",
    role: "student",
    role_code: "STU-04",
    roll_number: "STU-04",
    personal_code: "STU-04",
    class_name: "Class 10-A",
    class_id: "class-10-a",
    school_id: "SCHOOL-A",
    institution_code: "SCHOOL-A",
    institution_name: "School A Academy",
    email: "school-a.stu-04@academicos.internal",
    address: "Plot 12, Green Park Avenue",
    default_password: "password123",
  },
  {
    id: "stu-a-05",
    name: "Ethan Murphy",
    full_name: "Ethan Murphy",
    role: "student",
    role_code: "STU-05",
    roll_number: "STU-05",
    personal_code: "STU-05",
    class_name: "Class 10-B",
    class_id: "class-10-b",
    school_id: "SCHOOL-A",
    institution_code: "SCHOOL-A",
    institution_name: "School A Academy",
    email: "school-a.stu-05@academicos.internal",
    address: "Building 3, Ocean View Residency",
    default_password: "password123",
  },
  {
    id: "stu-a-06",
    name: "Priya Patel",
    full_name: "Priya Patel",
    role: "student",
    role_code: "STU-06",
    roll_number: "STU-06",
    personal_code: "STU-06",
    class_name: "Class 10-B",
    class_id: "class-10-b",
    school_id: "SCHOOL-A",
    institution_code: "SCHOOL-A",
    institution_name: "School A Academy",
    email: "school-a.stu-06@academicos.internal",
    address: "77 Station Road, Boisar",
    default_password: "password123",
  },
  {
    id: "stu-a-07",
    name: "Noah Williams",
    full_name: "Noah Williams",
    role: "student",
    role_code: "STU-07",
    roll_number: "STU-07",
    personal_code: "STU-07",
    class_name: "Class 10-B",
    class_id: "class-10-b",
    school_id: "SCHOOL-A",
    institution_code: "SCHOOL-A",
    institution_name: "School A Academy",
    email: "school-a.stu-07@academicos.internal",
    address: "12 Riverfront Colony",
    default_password: "password123",
  },
  {
    id: "stu-a-08",
    name: "Ananya Gupta",
    full_name: "Ananya Gupta",
    role: "student",
    role_code: "STU-08",
    roll_number: "STU-08",
    personal_code: "STU-08",
    class_name: "Class 11-Science",
    class_id: "class-11-sci",
    school_id: "SCHOOL-A",
    institution_code: "SCHOOL-A",
    institution_name: "School A Academy",
    email: "school-a.stu-08@academicos.internal",
    address: null, // Edge case: null address field
    default_password: "password123",
  },
  {
    id: "stu-a-09",
    name: "Lucas Silva",
    full_name: "Lucas Silva",
    role: "student",
    role_code: "STU-09",
    roll_number: "STU-09",
    personal_code: "STU-09",
    class_name: "Class 11-Science",
    class_id: "class-11-sci",
    school_id: "SCHOOL-A",
    institution_code: "SCHOOL-A",
    institution_name: "School A Academy",
    email: "school-a.stu-09@academicos.internal",
    address: "56 Highland Crescent",
    default_password: "password123",
  },
  {
    id: "stu-a-10",
    name: "Diya Joshi",
    full_name: "Diya Joshi",
    role: "student",
    role_code: "STU-10",
    roll_number: "STU-10",
    personal_code: "STU-10",
    class_name: "Class 11-Science",
    class_id: "class-11-sci",
    school_id: "SCHOOL-A",
    institution_code: "SCHOOL-A",
    institution_name: "School A Academy",
    email: "school-a.stu-10@academicos.internal",
    address: "89 Lake District",
    default_password: "password123",
  },
];

export const SCHOOL_A_STAFF = [
  {
    id: "prin-a-01",
    name: "Dr. Eleanor Vance",
    full_name: "Dr. Eleanor Vance",
    role: "principal",
    role_code: "PRIN-01",
    personal_code: "PRIN-01",
    roll_number: "PRIN-01",
    school_id: "SCHOOL-A",
    institution_code: "SCHOOL-A",
    institution_name: "School A Academy",
    email: "school-a.prin-01@academicos.internal",
    default_password: "password123",
    department: "Executive Leadership",
  },
  {
    id: "acc-a-01",
    name: "Marcus Sterling",
    full_name: "Marcus Sterling",
    role: "accountant",
    role_code: "ACC-01",
    personal_code: "ACC-01",
    roll_number: "ACC-01",
    school_id: "SCHOOL-A",
    institution_code: "SCHOOL-A",
    institution_name: "School A Academy",
    email: "school-a.acc-01@academicos.internal",
    default_password: "password123",
    department: "Finance & Accounts",
  },
  {
    id: "tch-a-01",
    name: "Prof. Alan Turing",
    full_name: "Prof. Alan Turing",
    role: "teacher",
    role_code: "TCH-01",
    personal_code: "TCH-01",
    roll_number: "TCH-01",
    school_id: "SCHOOL-A",
    institution_code: "SCHOOL-A",
    institution_name: "School A Academy",
    email: "school-a.tch-01@academicos.internal",
    default_password: "password123",
    subject: "Computer Science & Mathematics",
  },
  {
    id: "tch-a-02",
    name: "Dr. Rosalind Franklin",
    full_name: "Dr. Rosalind Franklin",
    role: "teacher",
    role_code: "TCH-02",
    personal_code: "TCH-02",
    roll_number: "TCH-02",
    school_id: "SCHOOL-A",
    institution_code: "SCHOOL-A",
    institution_name: "School A Academy",
    email: "school-a.tch-02@academicos.internal",
    default_password: "password123",
    subject: "Biochemistry & Genetics",
  },
  {
    id: "nts-a-01",
    name: "Naveen Sharma",
    full_name: "Naveen Sharma",
    role: "staff",
    role_code: "NTS-01",
    personal_code: "NTS-01",
    roll_number: "NTS-01",
    school_id: "SCHOOL-A",
    institution_code: "SCHOOL-A",
    institution_name: "School A Academy",
    email: "school-a.nts-01@academicos.internal",
    default_password: "password123",
    department: "Operations & Facilities",
  },
];

export const SCHOOL_A_FEES = [
  // STU-01: Boundary value ₹0.00 Paid
  {
    id: "a0000000-0000-0000-0000-000000000001",
    school_id: "SCHOOL-A",
    roll_number: "STU-01",
    student_name: "Alexander Bartholomew Montgomery-Featherstonehaugh III",
    class_name: "Class 10-A",
    title: "Term 1 General Tuition Fee",
    term: "Term 1",
    amount: 0.0,
    status: "paid",
    date: "2026-03-01",
    payment_mode: "Institutional Scholarship (Full Waiver)",
    invoice_no: "INV-SCHA-001",
  },
  // STU-02: Boundary value ₹1.00 Pending (minimum non-zero numeric boundary)
  {
    id: "a0000000-0000-0000-0000-000000000002",
    school_id: "SCHOOL-A",
    roll_number: "STU-02",
    student_name: "Liam Chen",
    class_name: "Class 10-A",
    title: "Library Overdue Re-issue Fee",
    term: "Term 1",
    amount: 1.0,
    status: "pending",
    date: "2026-03-02",
    payment_mode: "School UPI QR",
    invoice_no: "INV-SCHA-002",
  },
  // STU-03: Boundary value ₹99,999,999.00 Pending (extreme upper numeric boundary)
  {
    id: "a0000000-0000-0000-0000-000000000003",
    school_id: "SCHOOL-A",
    roll_number: "STU-03",
    student_name: "Aarav Sharma",
    class_name: "Class 10-A",
    title: "Advanced Quantum Computing & Robotics Endowment Fund",
    term: "Annual",
    amount: 99999999.0,
    status: "pending",
    date: "2026-03-03",
    payment_mode: "Wire Transfer / RTGS",
    invoice_no: "INV-SCHA-003",
  },
  // STU-04: Boundary value ₹25,000.00 Pending
  {
    id: "a0000000-0000-0000-0000-000000000004",
    school_id: "SCHOOL-A",
    roll_number: "STU-04",
    student_name: "Zara Khan",
    class_name: "Class 10-A",
    title: "Term 1 Standard Tuition Fee",
    term: "Term 1",
    amount: 25000.0,
    status: "pending",
    date: "2026-03-04",
    payment_mode: "Razorpay Netbanking",
    invoice_no: "INV-SCHA-004",
  },
  // STU-05: ₹25,000.00 Paid
  {
    id: "a0000000-0000-0000-0000-000000000005",
    school_id: "SCHOOL-A",
    roll_number: "STU-05",
    student_name: "Ethan Murphy",
    class_name: "Class 10-B",
    title: "Term 1 Standard Tuition Fee",
    term: "Term 1",
    amount: 25000.0,
    status: "paid",
    date: "2026-03-05",
    payment_mode: "School UPI QR",
    invoice_no: "INV-SCHA-005",
    utr: "UPI98765432101",
  },
  // STU-06: ₹15,500.00 Pending
  {
    id: "a0000000-0000-0000-0000-000000000006",
    school_id: "SCHOOL-A",
    roll_number: "STU-06",
    student_name: "Priya Patel",
    class_name: "Class 10-B",
    title: "Laboratory & Practical Assessment Fee",
    term: "Term 1",
    amount: 15500.0,
    status: "pending",
    date: "2026-03-06",
    payment_mode: "School UPI QR",
    invoice_no: "INV-SCHA-006",
  },
  // STU-07: ₹1,200.00 Paid
  {
    id: "a0000000-0000-0000-0000-000000000007",
    school_id: "SCHOOL-A",
    roll_number: "STU-07",
    student_name: "Noah Williams",
    class_name: "Class 10-B",
    title: "Annual Sports Kit & Uniform Settlement",
    term: "Annual",
    amount: 1200.0,
    status: "paid",
    date: "2026-03-07",
    payment_mode: "Razorpay Card",
    invoice_no: "INV-SCHA-007",
    utr: "PAY_NW1200CARD",
  },
  // STU-08: ₹50,000.00 Pending
  {
    id: "a0000000-0000-0000-0000-000000000008",
    school_id: "SCHOOL-A",
    roll_number: "STU-08",
    student_name: "Ananya Gupta",
    class_name: "Class 11-Science",
    title: "Senior Secondary Tuition & Coaching",
    term: "Term 1",
    amount: 50000.0,
    status: "pending",
    date: "2026-03-08",
    payment_mode: "Bank Demand Draft",
    invoice_no: "INV-SCHA-008",
  },
  // STU-09: ₹500.00 Pending
  {
    id: "a0000000-0000-0000-0000-000000000009",
    school_id: "SCHOOL-A",
    roll_number: "STU-09",
    student_name: "Lucas Silva",
    class_name: "Class 11-Science",
    title: "Identity Smartcard & RFID Badge Replacement",
    term: "Incidental",
    amount: 500.0,
    status: "pending",
    date: "2026-03-09",
    payment_mode: "School UPI QR",
    invoice_no: "INV-SCHA-009",
  },
  // STU-10: ₹25,000.00 Paid
  {
    id: "a0000000-0000-0000-0000-000000000010",
    school_id: "SCHOOL-A",
    roll_number: "STU-10",
    student_name: "Diya Joshi",
    class_name: "Class 11-Science",
    title: "Senior Secondary Science Laboratory & Tuition",
    term: "Term 1",
    amount: 25000.0,
    status: "paid",
    date: "2026-03-10",
    payment_mode: "School UPI QR",
    invoice_no: "INV-SCHA-010",
    utr: "UPI10987654321",
  },
];

export const SCHOOL_A_FEE_STRUCTURES = [
  {
    id: "b0000000-0000-0000-0000-000000000001",
    school_id: "SCHOOL-A",
    title: "Annual Tuition Fee",
    term: "Term 1",
    amount: 25000,
    target_classes: "ALL",
    description: "Standard tuition and classroom instructional development fee.",
  },
  {
    id: "b0000000-0000-0000-0000-000000000002",
    school_id: "SCHOOL-A",
    title: "Laboratory & Technology Fee",
    term: "Annual",
    amount: 15000,
    target_classes: "ALL",
    description: "Science labs, computer hardware, and digital learning portal access.",
  },
];

export const SCHOOL_A_ATTENDANCE = [
  { student_id: "stu-a-01", roll_number: "STU-01", name: "Alexander Bartholomew Montgomery-Featherstonehaugh III", status: "present" },
  { student_id: "stu-a-02", roll_number: "STU-02", name: "Liam Chen", status: "absent" },
  { student_id: "stu-a-03", roll_number: "STU-03", name: "Aarav Sharma", status: "late" },
  { student_id: "stu-a-04", roll_number: "STU-04", name: "Zara Khan", status: "excused" },
  { student_id: "stu-a-05", roll_number: "STU-05", name: "Ethan Murphy", status: "present" },
  { student_id: "stu-a-06", roll_number: "STU-06", name: "Priya Patel", status: "present" },
  { student_id: "stu-a-07", roll_number: "STU-07", name: "Noah Williams", status: "absent" },
  { student_id: "stu-a-08", roll_number: "STU-08", name: "Ananya Gupta", status: "late" },
  { student_id: "stu-a-09", roll_number: "STU-09", name: "Lucas Silva", status: "present" },
  { student_id: "stu-a-10", roll_number: "STU-10", name: "Diya Joshi", status: "present" },
];

export const SCHOOL_A_EXAM_MARKS = [
  {
    id: "em-a-01",
    roll_number: "STU-01",
    student_name: "Alexander Bartholomew Montgomery-Featherstonehaugh III",
    class_name: "Class 10-A",
    term: "Term II Final Examination (2026-27)",
    maths: 98,
    science: 95,
    english: 92,
  },
  {
    id: "em-a-02",
    roll_number: "STU-02",
    student_name: "Liam Chen",
    class_name: "Class 10-A",
    term: "Term II Final Examination (2026-27)",
    maths: 88,
    science: 90,
    english: 85,
  },
];

export const SCHOOL_B_MEMBERS = [
  {
    id: "prin-b-01",
    name: "Principal Beatrice",
    full_name: "Principal Beatrice",
    role: "principal",
    role_code: "PRIN-B01",
    personal_code: "PRIN-B01",
    roll_number: "PRIN-B01",
    school_id: "SCHOOL-B",
    institution_code: "SCHOOL-B",
    institution_name: "School B International",
    email: "school-b.prin-b01@academicos.internal",
    default_password: "password123",
  },
  {
    id: "acc-b-01",
    name: "Accountant Bailey",
    full_name: "Accountant Bailey",
    role: "accountant",
    role_code: "ACC-B01",
    personal_code: "ACC-B01",
    roll_number: "ACC-B01",
    school_id: "SCHOOL-B",
    institution_code: "SCHOOL-B",
    institution_name: "School B International",
    email: "school-b.acc-b01@academicos.internal",
    default_password: "password123",
  },
  {
    id: "tch-b-01",
    name: "Teacher Bernard",
    full_name: "Teacher Bernard",
    role: "teacher",
    role_code: "TCH-B01",
    personal_code: "TCH-B01",
    roll_number: "TCH-B01",
    school_id: "SCHOOL-B",
    institution_code: "SCHOOL-B",
    institution_name: "School B International",
    email: "school-b.tch-b01@academicos.internal",
    default_password: "password123",
  },
  {
    id: "stu-b-01",
    name: "Student Bob",
    full_name: "Student Bob",
    role: "student",
    role_code: "STU-B01",
    personal_code: "STU-B01",
    roll_number: "STU-B01",
    class_name: "Grade 12-IB",
    school_id: "SCHOOL-B",
    institution_code: "SCHOOL-B",
    institution_name: "School B International",
    email: "school-b.stu-b01@academicos.internal",
    default_password: "password123",
  },
  {
    id: "stu-b-02",
    name: "Student Brenda",
    full_name: "Student Brenda",
    role: "student",
    role_code: "STU-B02",
    personal_code: "STU-B02",
    roll_number: "STU-B02",
    class_name: "Grade 12-IB",
    school_id: "SCHOOL-B",
    institution_code: "SCHOOL-B",
    institution_name: "School B International",
    email: "school-b.stu-b02@academicos.internal",
    default_password: "password123",
  },
];

export const SCHOOL_B_FEES = [
  {
    id: "fee-b-01",
    school_id: "SCHOOL-B",
    roll_number: "STU-B01",
    student_name: "Student Bob",
    class_name: "Grade 12-IB",
    title: "International Baccalaureate Annual Dues",
    term: "Annual",
    amount: 45000.0,
    status: "paid",
    date: "2026-03-01",
    payment_mode: "Wire Transfer",
    invoice_no: "INV-SCHB-001",
  },
  {
    id: "fee-b-02",
    school_id: "SCHOOL-B",
    roll_number: "STU-B02",
    student_name: "Student Brenda",
    class_name: "Grade 12-IB",
    title: "International Baccalaureate Annual Dues",
    term: "Annual",
    amount: 45000.0,
    status: "pending",
    date: "2026-03-02",
    payment_mode: "School UPI QR",
    invoice_no: "INV-SCHB-002",
  },
];

/**
 * Executes idempotent seeding of School A and School B demo datasets into safeStorage.
 */
export function seedMockTenants(force = false) {
  if (typeof window === "undefined") return;

  const alreadySeeded = safeStorage.getItem("erp_mock_seeded_v4");
  if (alreadySeeded === "true" && !force) {
    return;
  }

  try {
    // 1. Seed Registered Schools List
    const existingRaw = safeStorage.getItem("erp_registered_schools");
    let schoolsList = [];
    if (existingRaw) {
      try {
        schoolsList = JSON.parse(existingRaw);
      } catch {}
    }
    const filteredSchools = schoolsList.filter(
      (s) => s.code !== "SCHOOL-A" && s.code !== "SCHOOL-B" && s.code !== "OASIS-TUTORIALS"
    );
    filteredSchools.unshift({
      code: "OASIS-TUTORIALS",
      name: "Oasis Tutorials",
      adminName: "Institutional Administrator",
      adminId: "HOD-01",
      institutionMode: "tuition",
      subscriptionStatus: "active",
      expiryDate: "2028-12-31",
    });
    filteredSchools.unshift(MOCK_TENANTS.SCHOOL_B);
    filteredSchools.unshift(MOCK_TENANTS.SCHOOL_A);
    safeStorage.setItem("erp_registered_schools", JSON.stringify(filteredSchools));

    // 2. Seed School A Directory (PRIN-01, ACC-01, TCH-01, TCH-02, STU-01..STU-10)
    const schoolADirectory = [...SCHOOL_A_STAFF, ...SCHOOL_A_STUDENTS];
    safeStorage.setItem("erp_directory_SCHOOL-A", JSON.stringify(schoolADirectory));

    // 3. Seed School A Fees (including edge case ₹0.00, ₹1.00, ₹99,999,999.00)
    safeStorage.setItem("erp_fee_ledger_SCHOOL-A", JSON.stringify(SCHOOL_A_FEES));

    // 4. Seed School A Attendance with mixed states
    const today = new Date().toISOString().split("T")[0];
    safeStorage.setItem(`erp_attendance_SCHOOL-A_${today}`, JSON.stringify(SCHOOL_A_ATTENDANCE));
    safeStorage.setItem("erp_attendance_SCHOOL-A", JSON.stringify(SCHOOL_A_ATTENDANCE));
    safeStorage.setItem("erp_exam_marks_SCHOOL-A", JSON.stringify(SCHOOL_A_EXAM_MARKS));
    safeStorage.setItem("erp_exam_marks_OASIS-TUTORIALS", JSON.stringify(SCHOOL_A_EXAM_MARKS));

    // 5. Seed School A Active Subscription & Fee Structures & Logo
    safeStorage.setItem(
      "erp_school_sub_SCHOOL-A",
      JSON.stringify({ status: "active", expiryDate: "2028-12-31", isBlocked: false })
    );
    safeStorage.setItem("erp_fee_structure_SCHOOL-A", JSON.stringify(SCHOOL_A_FEE_STRUCTURES));
    safeStorage.setItem("erp_fee_structure_OASIS-TUTORIALS", JSON.stringify(SCHOOL_A_FEE_STRUCTURES));

    // Transparent 1x1 test PNG logo
    const testLogo = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    safeStorage.setItem("erp_logo_SCHOOL-A", testLogo);
    safeStorage.setItem("erp_school_logo_SCHOOL-A", testLogo);
    safeStorage.setItem("erp_logo_OASIS-TUTORIALS", testLogo);

    // 6. Seed School B Directory & Data (Strict Tenant Isolation)
    safeStorage.setItem("erp_directory_SCHOOL-B", JSON.stringify(SCHOOL_B_MEMBERS));
    safeStorage.setItem("erp_fee_ledger_SCHOOL-B", JSON.stringify(SCHOOL_B_FEES));
    safeStorage.setItem(
      "erp_school_sub_SCHOOL-B",
      JSON.stringify({ status: "active", expiryDate: "2028-12-31", isBlocked: false })
    );

    // 7. Seed Legacy OASIS-TUTORIALS Tenant for Institutional Suite Compatibility
    const oasisMembers = [
      {
        id: "hod-oasis",
        name: "Institutional Administrator",
        full_name: "Institutional Administrator",
        role: "trustee",
        role_code: "HOD-01",
        personal_code: "HOD-01",
        school_id: "OASIS-TUTORIALS",
        institution_code: "OASIS-TUTORIALS",
        default_password: "password123",
      },
      {
        id: "tch-oasis",
        name: "Senior Faculty",
        full_name: "Senior Faculty",
        role: "teacher",
        role_code: "TCH-01",
        personal_code: "TCH-01",
        school_id: "OASIS-TUTORIALS",
        institution_code: "OASIS-TUTORIALS",
        default_password: "password123",
      },
      {
        id: "stu-oasis-1024",
        name: "Student Scholar",
        full_name: "Student Scholar",
        role: "student",
        role_code: "STU-1024",
        personal_code: "STU-1024",
        roll_number: "STU-1024",
        school_id: "OASIS-TUTORIALS",
        institution_code: "OASIS-TUTORIALS",
        default_password: "password123",
      },
      {
        id: "stu-oasis-01",
        name: "Student Member",
        full_name: "Student Member",
        role: "student",
        role_code: "STU-01",
        personal_code: "STU-01",
        roll_number: "STU-01",
        school_id: "OASIS-TUTORIALS",
        institution_code: "OASIS-TUTORIALS",
        default_password: "password123",
      },
    ];
    safeStorage.setItem("erp_directory_OASIS-TUTORIALS", JSON.stringify(oasisMembers));
    safeStorage.setItem(
      "erp_school_sub_OASIS-TUTORIALS",
      JSON.stringify({ status: "active", expiryDate: "2028-12-31", isBlocked: false })
    );

    // 8. Mark Seeding Flag
    safeStorage.setItem("erp_mock_seeded_v4", "true");
  } catch (err) {
    console.warn("[MockSeeder] Failed to seed mock tenants into safeStorage:", err);
  }
}

export function isMockTenantsSeeded() {
  return safeStorage.getItem("erp_mock_seeded_v4") === "true";
}
