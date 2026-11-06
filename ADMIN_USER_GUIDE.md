# ACADEMIC OS — INSTITUTIONAL ADMINISTRATOR & USER GUIDE
**Operating Manual for Principals, Accountants, Teachers, and Students**  
**Design Theme:** Crisp Enterprise (Light) & Voyager Space (Dark)

---

## 1. Role-Based Navigation & Access Index

Academic OS strictly partitions operational access based on the user's canonical institutional role:

| Canonical Role | Primary Dashboard Route | Key Daily Responsibilities |
| :--- | :--- | :--- |
| **`PRIN` (Principal)** | `/principal/dashboard` | Executive oversight, Operational Approvals (Checker), Risk Radar, Calendar |
| **`HOD` (Trustee / HOD)** | `/trustee/dashboard` | Strategic governance, department audits, institutional reports |
| **`ACC` (Accountant)** | `/accountant/dashboard` | Fee collection, UTR verification, Fee Reversal Requests (Maker), Invoices |
| **`TCH` (Teacher)** | `/teacher/dashboard` | Class tests, marks entry, student attendance, homework, lesson planner |
| **`STU` (Student / Parent)** | `/student/dashboard` | Private marks report, fee settlement (UPI/Razorpay), homework, LMS |
| **`NTS` (Non-Teaching)** | `/staff/dashboard` | Turnstile punch tracking, leave applications, campus operations |

---

## 2. Principal Operating Guide (`PRIN`)

### 2.1 Operational Approval Inbox (Maker-Checker Checker)
The Principal serves as the exclusive cryptographic checker for financial reversals and staff leaves:
1. Navigate to **Operational Approval Inbox** on the Principal Dashboard.
2. Review items marked **REVERSAL**:
   - Verify the student name, original fee receipt ID, requested reversal amount, and accountant's reason.
3. Click **Approve**:
   - Executes `approve_fee_reversal` inside PostgreSQL.
   - The database verifies that the Principal is NOT the user who requested the reversal (`requester_id != auth.uid()`).
   - Pessimistic lock locks the original ledger entry and marks it as `reversed`.
   - An offsetting credit note entry (`amount = -X`, `is_reversal = true`) is generated automatically.
4. Click **Reject**:
   - Rejects the request with an explanation forwarded back to the Accountant Dashboard.

### 2.2 Risk Radar & Compliance Monitoring
The **Risk Radar Widget** automatically monitors campus health indicators:
- Attendance anomalies (drop below 75%).
- Uncollected fee dues.
- Impending statutory document expiries (Fire Safety NOC, Drinking Water Quality Lab Reports, Structural Certificates).

### 2.3 Instant Campus Broadcasts
1. Navigate to **Broadcasts**.
2. Compose a message (emergency holiday, event reminder, bus delay).
3. Select recipient audience: `All Campus`, `Faculty Only`, or `Parents & Students`.
4. Dispatches live system notifications and SMS/WhatsApp alerts.

---

## 3. Accountant Operating Guide (`ACC`)

### 3.1 Fee Collection & Gateway Reversals
1. Navigate to `/accountant/dashboard`.
2. View real-time treasury stats: Total Collections, Cleared Receipts, Outstanding Dues, and Pending Verifications.

### 3.2 Reviewing Student Bank Transfer Receipts (Offline UTR Queue)
When parents settle fees via UPI QR or direct NEFT/RTGS bank transfer:
1. Filter ledger table by **Pending Verification**.
2. Click on the student's entry or click **View Receipt**.
3. Inspect the attached bank payment screenshot and 12-digit UTR reference in the lightbox.
4. Compare against your school's bank statement:
   - If credited: Click **Approve Payment**. The system marks the row `completed` and issues an official GST-compliant tax invoice.
   - If not found: Click **Reject Payment** with a remark for the student.

### 3.3 Requesting Fee Reversals (Maker Role)
If a duplicate payment was charged or a student withdrew:
1. Locate the cleared receipt in the **Fee Ledger**.
2. Click the **Request Reversal** button (shield icon).
3. Input the refund amount and statutory justification.
4. Click **Submit Reversal Request**.
5. The request is persisted to `public.fee_reversal_requests` with your user ID and routed directly to the Principal's Approval Inbox.
   *(Accountants cannot approve their own reversals — this is mathematically blocked by PostgreSQL).*

---

## 4. Teacher Operating Guide (`TCH`)

### 4.1 Class Test Marks Entry & Publication
1. Navigate to `/teacher/class-tests` or `/teacher/dashboard -> Class Test Marks`.
2. Select your **Assigned Class** (e.g. `Class 10-A`) and **Subject** (e.g. `Mathematics`).
3. Click **Create New Class Test**:
   - Test Title: `Unit Test 1 - Polynomials`
   - Maximum Marks: `50`
   - Weightage: `10%`
4. Enter student marks in the score roster:
   - System validates `0 <= marks <= max_marks`.
   - Mark students as `Absent` where applicable.
5. Choose Publication Mode:
   - **Save as Draft:** Only visible to teachers and Principal for review.
   - **Publish to Students:** Immediately exposes each student's score in their private portal while computing class highest.

---

## 5. Student & Parent Operating Guide (`STU`)

### 5.1 Private Marks Viewing
1. Navigate to **Student Dashboard -> My Marks**.
2. View your published test scores:
   - You can see your own marks, percentage, grade, and the **Class Highest**.
   - Peer names, roll numbers, and peer scores are mathematically redacted and inaccessible.

### 5.2 Online Fee Payment (UPI & Razorpay)
1. Navigate to **Fees & Receipts**.
2. Choose a fee component (e.g., `Term 2 Tuition Fee`).
3. Choose settlement split:
   - **Full Clearance:** 100% total due payment.
   - **Partial Installment:** Input custom split amount.
4. Choose payment rail:
   - **Option A (Online):** Click **Pay Online via Razorpay Gateway** to pay instantly via Google Pay, PhonePe, Paytm, Debit/Credit Card, or NetBanking. Verification is instantaneous.
   - **Option B (Direct Bank Transfer):** Scan the school's official UPI QR, transfer via your banking app, and submit your 12-digit UTR for Accountant verification.
5. Download your official tax invoice immediately upon clearance.

