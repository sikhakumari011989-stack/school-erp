# ACADEMIC OS — PRODUCTION DEPLOYMENT GUIDE
**Target Infrastructure:** Vercel (Edge / Serverless Frontend & API) + Supabase (Managed PostgreSQL & Auth)  
**Evaluation Standard:** Institutional Production Grade

---

## 1. Architecture Overview

Academic OS operates on a decoupled modern cloud architecture:
- **Frontend Application:** React 19 SPA built via Vite 8 and Rolldown, served via Vercel Edge Network with sub-resource integrity and asset hashing.
- **Serverless API Layer:** Vercel Serverless Functions (`/api/*`) executing Node.js 20 for payment orders, webhook reconciliation, master tenant provisioning, and hardware biometric sync.
- **Database & Auth Layer:** Supabase Managed PostgreSQL 15 with native Row Level Security (RLS), Connection Pooling via Supavisor, and JWT Authentication.

---

## 2. Deployment Prerequisites

Before deploying to production, ensure you have:
1. **GitHub Repository:** Push current branch `academic-os-security-remediation` (or `main`) to your GitHub account.
2. **Supabase Project:** A dedicated Supabase project (do not share development database with production).
3. **Vercel Account:** Linked to your GitHub organization or personal profile.
4. **Razorpay Merchant Account:** Live Key ID and Key Secret from the Razorpay Dashboard.

---

## 3. Step-by-Step Vercel Deployment

### Step 3.1: Connect Repository to Vercel
1. Log in to [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** -> **Project**.
3. Import your `school-app` repository.
4. Framework Preset: **Vite** (detected automatically).
5. Build Command: `npm run build`
6. Output Directory: `dist`
7. Install Command: `npm install`

### Step 3.2: Configure Production Environment Variables
In the Vercel Project Settings under **Environment Variables**, configure the following:

| Variable Name | Environment | Description |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Production, Preview | Supabase Project URL (`https://<project-ref>.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Production, Preview | Supabase Public Anonymous Key (safe for browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Production | Supabase Secret Service Role Key (serverless only — never expose) |
| `VITE_RAZORPAY_KEY_ID` | Production, Preview | Razorpay Public Merchant Key (`rzp_live_...` or `rzp_test_...`) |
| `RAZORPAY_KEY_ID` | Production | Razorpay Public Merchant Key (serverless order creation) |
| `RAZORPAY_KEY_SECRET` | Production | Razorpay Secret Merchant Key (serverless signature verification) |
| `RAZORPAY_WEBHOOK_SECRET` | Production | Webhook signing secret configured in Razorpay dashboard |
| `MASTER_SETUP_KEY` | Production | 24+ character passkey for platform owner to access `/master-setup` |
| `MASTER_TOKEN_SECRET` | Production | 256-bit random secret for signing master operator session tokens |
| `BIOMETRIC_DEVICE_SECRET` | Production | Shared HMAC secret for turnstile attendance hardware gateways |
| `VITE_SENTRY_DSN` | Production | Sentry DSN for frontend telemetry & error boundary tracking |

### Step 3.3: Trigger Initial Deployment
Click **Deploy**. The build completes in approximately 1-2 seconds with the code-split bundle:
- Main chunk: `~105 kB`
- Vendor chunks: `vendor-react`, `vendor-supabase`, `vendor-recharts`, `vendor-pdf`

---

## 4. Custom Domain & SSL Setup

1. In Vercel, navigate to **Settings** -> **Domains**.
2. Add your primary production domain (e.g., `app.academicos.com` or `erp.yourschool.edu`).
3. Add DNS records at your domain registrar:
   - Type: `CNAME` | Name: `app` | Value: `cname.vercel-dns.com`
4. Vercel automatically provisions and renews a free Let's Encrypt Wildcard SSL certificate.

---

## 5. Security & CDN Cache Headers

Academic OS includes mandatory anti-caching headers in `vercel.json` and serverless functions to prevent multi-tenant cross-contamination:

```json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "private, no-store, max-age=0, must-revalidate" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" }
      ]
    }
  ]
}
```

---

## 6. Post-Deployment Verification Checklist

After deployment finishes, run the following health checks:

- [ ] **System Health Check:** Open `https://<your-domain>/system-check` to verify client configuration.
- [ ] **Master Gateway:** Open `https://<your-domain>/master-setup` and authenticate with `MASTER_SETUP_KEY`.
- [ ] **Biometric API:** Verify `GET https://<your-domain>/api/v2/attendance/sync` returns HTTP 200 with service status.
- [ ] **Razorpay Webhook:** Verify `GET https://<your-domain>/api/razorpay-webhook` returns HTTP 200 with service status.
- [ ] **Console Inspection:** Ensure zero syntax errors, missing asset 404s, or unhandled promise rejections on `/login`.

