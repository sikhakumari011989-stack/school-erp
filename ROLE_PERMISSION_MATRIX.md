# ACADEMIC OS — ROLE-BASED ACCESS CONTROL (RBAC) MATRIX
**Classification:** Security Architecture & Permissions Specification  
**Status:** MVP Final Hardened  

---

## 1. Six Canonical Roles Overview

Academic OS enforces a strict 6-tier Role-Based Access Control (RBAC) model derived from server-signed JWT claims (`auth.jwt() -> 'app_metadata' ->> 'role'`):

| Role Code | Canonical Role Name | Operational Scope & Responsibilities |
| :--- | :--- | :--- |
| **`PRIN`** | Principal | Campus Executive: Approves fee reversals, views institutional analytics, manages school operations. |
| **`HOD`** | Head of Department / Trustee | Executive Governance: Approves fee reversals, audits academic performance, reviews financial records. |
| **`ACC`** | Accountant | Financial Manager: Records fee payments, requests fee reversals, views revenue ledgers. Cannot approve reversals. |
| **`TCH`** | Teacher / Faculty | Academic Staff: Records classroom attendance, publishes class tests and marks, manages homework. |
| **`STU`** | Student / Learner | Scholar / Parent: Views own attendance, checks published marks, accesses timetable, submits fee payments. |
| **`NTS`** | Non-Teaching Staff | Support Staff: Views staff rosters, general circulars, operational notices. Redacted from medical and finance data. |

---

## 2. Table-Level Permission Matrix

| Table | `PRIN` (Principal) | `HOD` (Trustee) | `ACC` (Accountant) | `TCH` (Teacher) | `STU` (Student) | `NTS` (Staff) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `schools` | Read (Own) | Read (Own) | Read (Own) | Read (Own) | Read (Own) | Read (Own) |
| `profiles` | Read (Own School), Update non-privileged | Read (Own School), Update non-privileged | Read (Own), Update Self | Read (Own), Update Self | Read (Own), Update Self | Read (Own), Update Self |
| `fee_ledger` | Read, Approve Reversals | Read, Approve Reversals | Read, Insert, Request Reversals | **DENIED** | **DENIED** | **DENIED** |
| `fee_reversal_requests` | Read, Approve, Reject | Read, Approve, Reject | Read, Insert (Own) | **DENIED** | **DENIED** | **DENIED** |
| `payment_orders` | Read (Own School) | Read (Own School) | Read (Own School) | **DENIED** | Read (Own Orders Only) | **DENIED** |
| `attendance` | Read, Write (Own School) | Read (Own School) | **DENIED** | Read, Write (Assigned Classes) | Read (Own Attendance) | **DENIED** |
| `timetable` | Read, Write (Own School) | Read (Own School) | **DENIED** | Read (Own School) | Read (Own Class) | Read (General) |
| `students` | Read, Write (Own School) | Read (Own School) | Read (Financial Lookup) | Read (Assigned Classes) | Read (Own Profile) | **DENIED** |
| `teachers` | Read, Write (Own School) | Read (Own School) | Read (Payroll Lookup) | Read (Faculty Roster) | Read (Faculty Roster) | Read (Directory) |
| `classes` | Read, Write (Own School) | Read (Own School) | Read (Own School) | Read (Own School) | Read (Own School) | **DENIED** |
| `notices` | Read, Write (Own School) | Read, Write (Own School) | Read (Own School) | Read, Write (Assigned Classes) | Read (Targeted/Public) | Read (General) |
| `audit_logs` | Read (Own School) | Read (Own School) | **DENIED** | **DENIED** | **DENIED** | **DENIED** |

---

## 3. Database Security Definer RPC Permissions

| Function Signature | Permitted Callers | Purpose & Security Gate |
| :--- | :--- | :--- |
| `request_fee_reversal(uuid, numeric, text)` | `ACC`, `PRIN`, `HOD` | Submits reversal request; enforces tenant isolation; prevents self-approval. |
| `approve_fee_reversal(uuid, text)` | `PRIN`, `HOD` | Approves reversal; locks row; verifies maker != checker; generates UUID credit note. |
| `reject_fee_reversal(uuid, text)` | `PRIN`, `HOD` | Rejects reversal request with notes; marks request rejected. |
| `claim_next_pdf_job(text)` | `authenticated`, `service_role` | Claims next queued job strictly within caller's verified tenant code. |
| `provision_institutional_school(...)` | `service_role` ONLY | Master provisioning; creates school, license, and admin profile. Denied to anon/auth. |
| `renew_school_subscription(...)` | `service_role` ONLY | Subscription renewal and validity extension. Denied to anon/auth. |

