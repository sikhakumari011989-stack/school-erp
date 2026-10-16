import React from "react";
import { Link } from "react-router-dom";
import { Lock, ArrowLeft, ShieldCheck, Database, EyeOff } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-200 font-sans relative selection:bg-blue-500 selection:text-white pb-20">
      {/* Ambient background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-purple-600/10 rounded-full blur-[160px] pointer-events-none" />

      {/* Top Header */}
      <header className="max-w-6xl mx-auto px-6 py-6 flex justify-between items-center border-b border-slate-800/80 relative z-10">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30 text-xl border border-white/10 group-hover:scale-105 transition-transform">
            🏫
          </div>
          <div>
            <span className="text-lg font-black text-white tracking-tight block">EduSaaS ERP</span>
            <span className="text-[9px] text-blue-400 font-extrabold uppercase tracking-widest block">
              Multi-Tenant Institution OS
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 px-3.5 py-2 rounded-xl transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </Link>
          <Link
            to="/login"
            className="text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl shadow-md shadow-blue-600/20 transition-all"
          >
            Portal Sign In
          </Link>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-4xl mx-auto px-6 pt-12 pb-16 relative z-10">
        <div className="mb-10 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 px-3.5 py-1.5 rounded-full text-purple-400 text-xs font-bold uppercase tracking-wider mb-4">
            <Lock className="w-3.5 h-3.5" /> Data Protection & Privacy
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-3">
            Institutional Privacy Policy
          </h1>
          <p className="text-slate-400 text-sm">
            Effective Date: October 1, 2026 &bull; Compliant with Digital Personal Data Protection (DPDP) Act, 2023
          </p>
          <div className="mt-4 flex flex-wrap gap-2 items-center text-xs text-slate-300 bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>256-Bit SSL Encryption &bull; PCI-DSS Level 1 Razorpay Security &bull; PostgreSQL RLS Vault</span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl space-y-8 text-sm sm:text-base leading-relaxed text-slate-300">
          <section>
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-purple-400">1.</span> Commitment to Data Privacy
            </h2>
            <p>
              At <strong>EduSaaS ERP Technologies Pvt. Ltd.</strong>, we understand that educational institutions, trustees,
              educators, and guardians place immense trust in us. We are committed to safeguarding all student academic
              records, guardian contact information, and institutional financial transactions through stringent security
              frameworks and zero data commercialization.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-purple-400">2.</span> Categories of Information We Collect
            </h2>
            <p className="mb-2">We process institutional data solely for the provision of educational administration:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-2xl">
                <h3 className="font-bold text-white text-sm mb-1 flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-400" /> Institutional & Student Data
                </h3>
                <p className="text-xs text-slate-400">
                  Student full names, roll numbers, assigned batches, parent contact phone numbers, email addresses, and class
                  attendance logs submitted by authorized teachers.
                </p>
              </div>
              <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-2xl">
                <h3 className="font-bold text-white text-sm mb-1 flex items-center gap-2">
                  <EyeOff className="w-4 h-4 text-emerald-400" /> Financial & Transaction Metadata
                </h3>
                <p className="text-xs text-slate-400">
                  Razorpay payment order IDs, transaction timestamps, payment modes (UPI / Card), fee ledger amounts, and digital
                  invoice numbers. We <strong>never</strong> store sensitive credit card CVVs, PINs, or net banking passwords.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-purple-400">3.</span> How We Process Payment Data (Razorpay PCI-DSS)
            </h2>
            <p>
              All online fee checkouts and institutional SaaS subscription billings are mediated directly by{" "}
              <strong>Razorpay</strong>, which holds <strong>PCI-DSS Level 1 Certification</strong> (the highest international
              security standard for payment processors). Payment data is submitted directly to Razorpay through secure tokenized
              iframes and encrypted API endpoints.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-purple-400">4.</span> Tenant Isolation & PostgreSQL Row-Level Security
            </h2>
            <p>
              Our multi-tenant database infrastructure utilizes PostgreSQL Row-Level Security (RLS). Every query executed against
              the database enforces a cryptographically verified <code>school_id</code> match derived from the authenticated user&apos;s
              profile. No institution can view, alter, or query another institution&apos;s student records or financial ledgers under any circumstances.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-purple-400">5.</span> Automated Notifications (SMS & WhatsApp)
            </h2>
            <p>
              Institutional administrators and teachers may trigger automated notifications (e.g. &quot;Student Absent Alert&quot; or &quot;Fee Payment Receipt&quot;)
              dispatched via enterprise communication providers (such as Twilio and Wati). These dispatches occur strictly to guardian phone
              numbers pre-registered by the institution and solely for legitimate institutional communication.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-purple-400">6.</span> Data Retention & Right to Erasure
            </h2>
            <p>
              Institutional records are maintained for the active tenure of the institution&apos;s service agreement and any statutory
              audit retention period mandated by Indian educational or financial regulations. Institutional trustees may request export
              or certified cryptographic purge of historical data upon formal written notice.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-purple-400">7.</span> Grievance Officer Details
            </h2>
            <p className="mb-3">
              In accordance with the Information Technology Act, 2000 and Digital Personal Data Protection Act, 2023, the details of our
              appointed Grievance Officer are provided below:
            </p>
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 text-xs space-y-1.5 text-slate-300">
              <div><strong>Name:</strong> Rajesh M. Nair, Grievance Officer</div>
              <div><strong>Entity:</strong> EduSaaS ERP Technologies Pvt. Ltd.</div>
              <div><strong>Address:</strong> #402, 4th Floor, Tech Innovation Park, Outer Ring Road, Bengaluru, Karnataka - 560103, India</div>
              <div><strong>Email:</strong> <a href="mailto:grievance@edusaas.app" className="text-blue-400 underline">grievance@edusaas.app</a></div>
              <div><strong>Phone:</strong> +91 (080) 4123-4567 (Mon - Fri, 10 AM to 5 PM IST)</div>
            </div>
          </section>

          {/* Quick Contact Box */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-white text-sm">Need help or want to export your data?</h3>
              <p className="text-slate-400 text-xs mt-0.5">
                Reach out to our privacy compliance desk for verified data handling inquiries.
              </p>
            </div>
            <Link
              to="/contact"
              className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-4 py-2 rounded-xl border border-slate-700 whitespace-nowrap"
            >
              Contact Privacy Desk →
            </Link>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="mt-8 flex flex-wrap gap-4 justify-between items-center text-xs text-slate-400">
          <div>&copy; 2026 EduSaaS ERP Technologies Pvt. Ltd. All rights reserved.</div>
          <div className="flex gap-4">
            <Link to="/terms" className="hover:text-white underline">Terms of Service</Link>
            <Link to="/pricing-policy" className="hover:text-white underline">Pricing Policy</Link>
            <Link to="/refund-policy" className="hover:text-white underline">Refund Policy</Link>
            <Link to="/contact" className="hover:text-white underline">Contact Desk</Link>
          </div>
        </div>
      </main>
    </div>
  );
}

