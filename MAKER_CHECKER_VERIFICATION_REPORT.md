# ACADEMIC OS — FINANCIAL MAKER-CHECKER REVERSALS REPORT
**Classification:** Financial Security Architecture & Concurrency Report  
**Status:** MVP Final Hardened  

---

## 1. Architectural Principles

1. **Separation of Duties (Maker-Checker):**  
   An operational accountant (`ACC`) or school staff member can identify errors and request a fee transaction reversal. Only an independent campus executive (`PRIN` or `HOD`) can authorize the reversal and execute the credit note.
2. **PostgreSQL-Level Enforcement:**  
   The constraint `v_request.requester_id = v_approver_id` is enforced inside the `approve_fee_reversal` RPC in PostgreSQL. Client-side tampering cannot bypass this rule.
3. **Pessimistic Concurrency (Row-Level Locking):**  
   Reversal requests and target ledger rows are retrieved with `FOR UPDATE` pessimistic locks, eliminating race conditions and double-credit attacks.
4. **Non-Destructive Ledger Invariance:**  
   Original ledger transactions are never deleted or modified in place (except setting `status = 'reversed'`). A counter-balancing credit note with a negative amount (`-ABS(amount)`) is created with an explicit foreign reference (`original_entry_id`).
5. **Idempotency Protection:**  
   Credit notes are bound to an idempotency key `REV-<request_id>`. Duplicate approval retries or network replays are automatically deduplicated.

---

## 2. Maker-Checker State Machine

```
   [Active Fee Entry]
          │
          ▼
   1. request_fee_reversal() ──(ACC/Maker)──► [Status: pending_approval]
                                                    │
                 ┌──────────────────────────────────┴──────────────────────────────────┐
                 ▼                                                                     ▼
   2. approve_fee_reversal() ──(PRIN/Checker)                            3. reject_fee_reversal() ──(PRIN/Checker)
                 │                                                                     │
                 ▼                                                                     ▼
   - Row Lock on target entry                                            - Row Lock on request
   - Verify requester != approver                                        - Mark request: 'rejected'
   - Generate UUID Credit Note                                           - Audit log recorded
   - Original entry: 'reversed'
   - Request: 'approved'
   - Audit log recorded
```

---

## 3. Verified Schema Contracts

| Field | Data Type | Requirement / Constraint |
| :--- | :---: | :--- |
| `fee_ledger.id` | **UUID** | Native UUID Primary Key (`gen_random_uuid()`) |
| `fee_ledger.school_id` | **TEXT** | Human-readable school code (`GW-01`) |
| `fee_ledger.original_entry_id` | **TEXT** | References target entry ID string |
| `fee_reversal_requests.id` | **UUID** | Native UUID Primary Key |
| `fee_reversal_requests.school_id` | **TEXT** | Human-readable school code |
| `fee_reversal_requests.entry_id` | **UUID** | References `fee_ledger.id` |
| `fee_reversal_requests.status` | **TEXT** | `'pending_approval'`, `'approved'`, `'rejected'` |

---

## 4. Test Verification Outcomes

| Verification Case | Execution Role | Expected Outcome | Verification Result |
| :--- | :---: | :---: | :---: |
| 1. Reversal Request Creation | `ACC` | Request created with `pending_approval` | **VERIFIED** |
| 2. Maker Self-Approval Attempt | `ACC` | Rejected with `Maker-Checker Violation` | **VERIFIED** |
| 3. Cross-Tenant Approval Attempt | Cross-Tenant `PRIN` | Rejected with `Cross-tenant access violation` | **VERIFIED** |
| 4. Executive Approval Execution | Independent `PRIN` | Credit Note generated, original marked reversed | **VERIFIED** |
| 5. Duplicate Approval Retry | Independent `PRIN` | Rejected (request already approved) | **VERIFIED** |
| 6. Direct Reversal Without Request | `PRIN` | Rejected with `Maker-Checker Violation` | **VERIFIED** |

