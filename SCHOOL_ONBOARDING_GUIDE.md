# ACADEMIC OS — INSTITUTIONAL SCHOOL ONBOARDING GUIDE
**Target Audience:** Platform Owners, Technical Sales Leads, Institutional Implementation Engineers  
**Target Module:** Master Setup Gateway (`/master-setup`)

---

## 1. Onboarding Overview

Academic OS enables instant, zero-downtime onboarding of new educational institutions. A newly provisioned school receives:
1. A permanent multi-tenant record in PostgreSQL `public.schools`.
2. A cryptographic institutional license in `public.school_licenses`.
3. An active master administrator profile (`PRIN` or `HOD`) in `public.profiles`.
4. Dedicated Row-Level Security tenant isolation.

---

## 2. Step-by-Step Onboarding Workflow

### Step 1: Access the Master Provisioning Gateway
1. Navigate to: `https://<your-domain>/master-setup`
2. Enter your **Master Operator Passkey** (configured via `MASTER_SETUP_KEY`).
3. Click **Authenticate & Unlock Gateway**. The system issues an HMAC-signed bearer session token valid for 4 hours.

### Step 2: Input Institutional Information
Fill out the **New Institution Provisioning Form**:

| Field | Example Value | Description |
| :--- | :--- | :--- |
| **Institution Name** | Delhi Public Grammar School | Full official legal name of the school or academy |
| **Institution Code** | `DPS-01` | Unique uppercase alphanumeric code (used by all students/staff) |
| **Institution Mode** | K-12 Formal School | `school` (Full K-12 with CBSE/ICSE terms) or `tuition` (Coaching batch) |
| **Master Admin Name** | Dr. Rajeshwar Sharma | Full legal name of the Chairman, Trustee, or Academic Principal |
| **Admin Role Code** | `HOD-01` or `PRIN-01` | `HOD-01` (Trustee Executive) or `PRIN-01` (Academic Principal) |
| **Admin Email** | `principal@dps-delhi.edu` | Official institutional email for password resets & notices |
| **Admin Phone** | `+91 98201 12345` | Primary mobile contact for SMS & OTP alerts |
| **Default Password** | `School@2026` | Initial temporary password for first-time login |
| **Campus Address** | Sector 4, R.K. Puram, New Delhi | Physical campus address for tax invoices & report cards |
| **Subscription Tier** | Enterprise (Full Suite) | `starter` (up to 500), `growth` (up to 1500), `enterprise` (unlimited) |
| **License Duration** | 365 Days | Number of days until statutory license renewal |

### Step 3: Execute Provisioning
Click **Provision Institutional Node**.
The serverless API executes `provision_institutional_school` inside Supabase PostgreSQL using `service_role`.
Upon success:
- School details are written permanently to PostgreSQL.
- Master administrator profile is created in `public.profiles`.
- An initial license key (`LIC-DPS-01-...`) is generated.

### Step 4: Generate Client Handover Package
Provide the institution leadership with their **Official Onboarding Credential Memo**:

```
============================================================
ACADEMIC OS — INSTITUTIONAL CREDENTIAL HANDOVER MEMO
============================================================
Institution Name:     Delhi Public Grammar School
Institution Code:     DPS-01
Portal URL:           https://app.academicos.com/login

Master Administrator:
  Full Name:          Dr. Rajeshwar Sharma
  Personal ID / Code: HOD-01
  Assigned Role:      Trustee Executive (HOD)
  Login Email:        principal@dps-delhi.edu
  Default Password:   School@2026

First-Time Steps:
  1. Open the Portal URL above.
  2. Input Institution Code: DPS-01
  3. Input Personal ID: HOD-01
  4. Input Password: School@2026
  5. Go to Settings -> Security and update your password.
============================================================
```

---

## 3. Post-Onboarding Institutional Setup Checklist

Once the master admin logs in, they should complete the following 4 initial configurations:

1. **Configure Classes & Sections:**  
   Navigate to **Classes & Sections** and create standard grades (e.g. `Class 1-A`, `Class 10-B`, `Class 11 Science`).
2. **Publish Fee Structures:**  
   Navigate to **Accountant Dashboard -> Fee Structure Configuration** and publish institutional fee heads (e.g. `Term 1 Tuition Fee`, `Annual Laboratory Fee`, `Transportation Fee`).
3. **Configure School UPI / Bank Rails:**  
   Navigate to **Accountant Dashboard -> UPI QR & Merchant Config** and paste the school's official Bank UPI ID (e.g. `dps.delhi@okaxis`) and bank account number.
4. **Publish Academic Calendar:**  
   Navigate to **Academic Calendar** and enter term start dates, mid-term examinations, and statutory holidays.

---

## 4. Bulk Faculty and Student Roster Onboarding

To onboard staff and students in bulk:
1. Navigate to **Admin -> Directory & Admissions**.
2. Click **Import CSV Roster**.
3. Download the CSV template (`student_template.csv` or `staff_template.csv`).
4. Upload the populated roster. The system automatically assigns standardized personal codes (`STU-1001`, `TCH-201`), creates `public.profiles`, and provisions student marks portals.

