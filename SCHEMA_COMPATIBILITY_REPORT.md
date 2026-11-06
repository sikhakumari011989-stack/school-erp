# ACADEMIC OS — SCHEMA COMPATIBILITY & TENANT MAPPING REPORT
**Classification:** Database Architecture Specification  
**Status:** MVP Final Reconciled  
**Target:** Staging Review  

---

## 1. Executive Summary

This document establishes the canonical schema architecture and tenant isolation mapping across the Academic OS PostgreSQL database. It reconciles every historical migration (01–20) with the hardening migrations (21–23) and verified live schema facts.

---

## 2. Canonical Tenant Mapping Table

| Database Table | Primary Key | `school_id` Column Type | Associated Key / Semantic Reference | Authoritative Tenant Helper |
| :--- | :---: | :---: | :--- | :--- |
| `public.schools` | `id` (UUID) | — | `code` (TEXT UNIQUE) | `get_current_tenant_uuid()` / `code()` |
| `public.profiles` | `id` (UUID) | **UUID** | References `schools(id)` | `get_current_tenant_uuid()` |
| `public.attendance` | `id` (UUID) | **UUID** | References `schools(id)` (Foreign Key) | `get_current_tenant_uuid()` |
| `public.timetable` | `id` (UUID) | **UUID** | References `schools(id)` (Foreign Key) | `get_current_tenant_uuid()` |
| `public.homework` | `id` (UUID) | **UUID** | References `schools(id)` (Foreign Key) | `get_current_tenant_uuid()` |
| `public.notifications` | `id` (UUID) | **UUID** | References `schools(id)` (Foreign Key) | `get_current_tenant_uuid()` |
| `public.email_notifications` | `id` (UUID) | **UUID** | References `schools(id)` (Foreign Key) | `get_current_tenant_uuid()` |
| `public.sms_notifications` | `id` (UUID) | **UUID** | References `schools(id)` (Foreign Key) | `get_current_tenant_uuid()` |
| `public.fee_ledger` | `id` (UUID) | **TEXT** | Stores school code (e.g. `GW-01`); `original_entry_id` is TEXT | `get_current_tenant_code()` |
| `public.fee_reversal_requests` | `id` (UUID) | **TEXT** | Stores school code; `entry_id` is UUID | `get_current_tenant_code()` |
| `public.payment_orders` | `id` (UUID) | **TEXT** | Stores school code; `student_id` is TEXT | `get_current_tenant_code()` |
| `public.students` | `id` (UUID) | **TEXT** | Stores school code; `roll_number` | `get_current_tenant_code()` |
| `public.teachers` | `id` (UUID) | **TEXT** | Stores school code; `email` | `get_current_tenant_code()` |
| `public.classes` | `id` (UUID) | **TEXT** | Stores school code; `grade`, `section` | `get_current_tenant_code()` |
| `public.notices` | `id` (UUID) | **TEXT** | Stores school code; `audience` | `get_current_tenant_code()` |
| `public.pdf_jobs` | `id` (UUID) | **TEXT** | Stores school code; `status`, `attempts` | `get_current_tenant_code()` |
| `public.audit_logs` | `id` (UUID) | **TEXT** | Legacy: `table_name`, `record_id`, `actor_id` | `get_current_tenant_code()` |

---

## 3. Reconciled Schema Issues & Resolution

### A. UUID vs. TEXT Tenant Column Types
- **Issue:** Previous migration drafts intermittently treated `school_id` as UUID or TEXT across different tables, causing `invalid input syntax for type uuid` errors during joins or comparisons.
- **Resolution:**
  - All tables referencing `schools.id` by foreign key (`profiles`, `attendance`, `timetable`, `homework`, `notifications`) strictly use `UUID`.
  - All operational domain tables created in early migrations (`fee_ledger`, `fee_reversal_requests`, `payment_orders`, `students`, `teachers`, `classes`, `notices`, `pdf_jobs`) strictly use `TEXT` storing the unique school code.
  - Dedicated tenant resolution helpers (`get_current_tenant_uuid()` vs `get_current_tenant_code()`) eliminate type-casting ambiguities in RLS policies.

### B. Fee Ledger Columns Reconciled
- **Issue:** Unverified columns (`student_id`, `roll_number`, `term`, `student_email`, `fee_type`, `reference_number`, `receipt_tag`, `notes`) were assumed to exist in earlier test files.
- **Resolution:** All financial queries, reversal RPCs, and verification tests strictly query verified columns: `id`, `school_id`, `student_name`, `class_name`, `amount`, `payment_mode`, `razorpay_payment_id`, `status`, `idempotency_key`, `original_entry_id`, `date`, `created_at`.

### C. Fee Reversal Request School ID Reconciled
- **Issue:** Migration 22 defined `fee_reversal_requests.school_id` as UUID, but `fee_ledger.school_id` is TEXT.
- **Resolution:** `fee_reversal_requests.school_id` is standardized to `TEXT NOT NULL`, matching `fee_ledger.school_id`. `entry_id` remains UUID matching `fee_ledger.id`.

### D. Payment Orders School ID Reconciled
- **Issue:** Migration 23 defined `payment_orders.school_id` as UUID, but API endpoints `/api/razorpay/create-order` and `/api/razorpay/verify-payment` submit text school codes.
- **Resolution:** `payment_orders.school_id` is standardized to `TEXT NOT NULL`. Column-level grants revoke `raw_payload` from authenticated clients.

