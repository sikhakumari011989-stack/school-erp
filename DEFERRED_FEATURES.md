# ACADEMIC OS — DEFERRED FEATURES & NON-ESSENTIAL MODULES
**Classification:** Product Scope Boundary & Technical Disclosure  
**Status:** MVP Final (Phase 4 Freeze)  

---

## 1. Rationale for Feature Deferral

To ensure absolute reliability, zero data leakage, and rigorous financial accuracy for the staging-ready MVP, features that are either:
- Dependent on third-party live hardware or unconfigured gateways, or
- Complex enterprise analytics without core operational necessity, or
- Non-authoritative offline financial operations
have been safely deferred or placed in a documented offline-tolerant / manual mode.

---

## 2. Inventory of Deferred & Scoped Features

### A. Live Biometric Hardware Turnstile Ingestion
* **Status:** Scoped / Mock-Tolerant
* **Reason:** Requires physical biometric hardware IP turnstiles configured with `BIOMETRIC_DEVICE_SECRET`.
* **MVP Implementation:** The cryptographic API boundaries (`/api/biometric/sync`) and anti-replay window (5-minute timestamp skew) are fully implemented and verified via unit tests. In the UI, standard digital roll-call attendance register in `TeacherAttendance.jsx` is the primary operational method.

### B. Third-Party Outbound WhatsApp & SMS Gateway Live Dispatch
* **Status:** Queued Mode / Awaiting Institutional API Credentials
* **Reason:** Live dispatch requires active subscriptions to Twilio or WATI (`WATI_ACCESS_TOKEN`, `TWILIO_AUTH_TOKEN`) configured on the server.
* **MVP Implementation:** In `src/utils/notifications.js`, notifications are recorded in `erp_notification_history` with status `queued` (or `delivered` if live credentials are configured). The UI never claims false delivery.

### C. Live Automatic Razorpay Checkout
* **Status:** Test Mode / Gateway Verification Scoped
* **Reason:** Live payment collection requires verified KYC credentials on Razorpay production accounts.
* **MVP Implementation:** School UPI QR code and UTR submission workflow in `StudentRazorpayCheckout.jsx` allows parents to scan and enter UTR. The Accountant reviews and settles payments in `AccountantDashboard.jsx`. Serverless verification endpoints (`/api/razorpay/verify-payment`) operate in test mode with HMAC signature checks.

### D. Offline Financial Ledger Mutation
* **Status:** Blocked from Client-Side Offline Mutation
* **Reason:** Mutating financial ledgers offline introduces split-brain reconciliation risks and breaks maker-checker constraints.
* **MVP Implementation:** Fee recording and maker-checker approvals require active network connectivity and direct PostgreSQL authorization. Offline mode is strictly limited to read-only cached receipts.

### E. Principal's Synthetic AI Telemetry
* **Status:** Clean Slate Enforced (Zero Baseline Fallback)
* **Reason:** Previous versions synthesized ₹12,50,000 in fake baseline revenue when unpopulated.
* **MVP Implementation:** `aiIntelligenceEngine.js` returns honest zero-state metrics (`{ totalRevenue: 0, pendingDues: 0 }`) until real transactions are recorded.

### F. Public Self-Service Institutional Provisioning
* **Status:** Restricted to Platform-Owner Master Endpoint
* **Reason:** Public creation of institutions without contractual payment or master authorization leads to unmanaged database bloat and security exposure.
* **MVP Implementation:** Institutional onboarding is executed via `/master-setup` with HMAC-signed master operator bearer tokens, or via `provision_institutional_school` using `SUPABASE_SERVICE_ROLE_KEY`.

