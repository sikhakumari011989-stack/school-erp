# ACADEMIC OS — ENVIRONMENT VARIABLES & DEPLOYMENT RUNBOOK
**Classification:** Staging & Production Configuration Guide  
**Platform:** Vercel Serverless + Supabase PostgreSQL  
**Release Target:** Staging Review (Preview Scope)  
**Status:** MVP Final Hardened  

---

## 1. Security Architecture Principles

1. **Zero Secret Exposure in Frontend:**  
   Vite prefixes variables exposed to the browser bundle with `VITE_`. Under no circumstances should database service-role keys, payment gateway secrets, SMS/WhatsApp bearer tokens, or master encryption keys carry the `VITE_` prefix or be referenced in client code.
2. **Server-Only Execution:**  
   Server-only secrets are read exclusively in Vercel Serverless Functions (`/api/*`) using `process.env.<VARIABLE_NAME>`.
3. **Environment Scope Discipline:**  
   Configure staging values exclusively in the **Preview** and **Development** scopes on Vercel. Do NOT alter production variables for staging review.

---

## 2. Environment Variables Matrix

### A. Public Frontend Configuration (Safe for Browser Bundle)

| Variable Name | Environment Scope | Secret? | Purpose / Description |
| :--- | :--- | :---: | :--- |
| `VITE_SUPABASE_URL` | Production, Preview, Development | **NO** | Supabase Project URL (`https://<project-ref>.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Production, Preview, Development | **NO** | Supabase Public/Anon API Key (Protected by PostgreSQL RLS) |
| `VITE_RAZORPAY_KEY_ID` | Production, Preview, Development | **NO** | Razorpay Public Key ID (`rzp_test_...` for Staging; `rzp_live_...` for Prod) |
| `VITE_SENTRY_DSN` | Production, Preview, Development | **NO** | *(Optional)* Sentry client error reporting DSN |

---

### B. Server-Only Secrets (Restricted to Vercel Serverless `/api/*`)

| Variable Name | Environment Scope | Secret? | Purpose / Description |
| :--- | :--- | :---: | :--- |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview, Development | **YES** | Supabase `service_role` secret key. Used exclusively for administrative server operations (`/api/master/*`, webhook reconciliations). NEVER expose to client. |
| `RAZORPAY_KEY_ID` | Production, Preview, Development | **NO** | Server-side reference to Razorpay Key ID. Must match `VITE_RAZORPAY_KEY_ID`. |
| `RAZORPAY_KEY_SECRET` | Production, Preview, Development | **YES** | Razorpay Merchant Key Secret. Used for HMAC-SHA256 signature verification in `/api/razorpay/verify-payment`. |
| `RAZORPAY_WEBHOOK_SECRET` | Production, Preview, Development | **YES** | Secret token configured in Razorpay Webhooks dashboard for verifying payload signatures in `/api/razorpay-webhook`. |
| `MASTER_SETUP_KEY` | Production, Preview, Development | **YES** | Passkey (minimum 20 characters) required to unlock the institutional onboarding engine at `/master-setup`. |
| `MASTER_TOKEN_SECRET` | Production, Preview, Development | **YES** | 64-character hex secret used for signing and verifying ephemeral Master Operator Bearer Tokens. |
| `BIOMETRIC_DEVICE_SECRET`| Production, Preview, Development | **YES** | Pre-shared HMAC secret key between physical biometric turnstiles and `/api/v2/attendance/sync`. |

---

### C. Optional / Deferred Server Integrations (Server-Only Backend Dispatch)

| Variable Name | Environment Scope | Secret? | Purpose / Description |
| :--- | :--- | :---: | :--- |
| `WATI_API_ENDPOINT` | Preview, Development | **NO** | *(Optional)* WATI WhatsApp Cloud API endpoint URL (Server-side dispatch only). |
| `WATI_ACCESS_TOKEN` | Preview, Development | **YES** | *(Optional)* WATI API bearer token. Kept strictly server-side; NEVER expose as `VITE_WATI_ACCESS_TOKEN`. |
| `TWILIO_ACCOUNT_SID` | Preview, Development | **NO** | *(Optional)* Twilio Account SID (Server-side SMS dispatch only). |
| `TWILIO_AUTH_TOKEN` | Preview, Development | **YES** | *(Optional)* Twilio Auth Token. Kept strictly server-side; NEVER expose as `VITE_TWILIO_AUTH_TOKEN`. |
| `TWILIO_PHONE_NUMBER`| Preview, Development | **NO** | *(Optional)* Twilio registered outgoing phone number. |

---

## 3. Cryptographic Secret Generation

To generate secure cryptographic random secrets for `MASTER_TOKEN_SECRET` and `BIOMETRIC_DEVICE_SECRET`, run:

```bash
node -e "console.log('Secret:', require('crypto').randomBytes(32).toString('hex'))"
```

---

## 4. Staging Configuration Runbook (Vercel)

For the upcoming Staging review:
1. Log in to **Vercel** -> Select the project -> **Settings** -> **Environment Variables**.
2. When adding variables, choose the **Preview** environment scope (and **Development** for local testing).
3. Set `VITE_RAZORPAY_KEY_ID` and `RAZORPAY_KEY_ID` to your Razorpay **Test Mode** key (`rzp_test_...`).
4. Set `RAZORPAY_KEY_SECRET` to your Razorpay **Test Mode** secret.
5. Set `SUPABASE_SERVICE_ROLE_KEY` to your staging Supabase project's service role key.
6. Verify that **Production** is NOT selected when setting temporary staging test keys.
7. Trigger a Preview deployment from your staging git branch. Do not redeploy production.
