import React from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, ArrowLeft, FileText, CheckCircle2 } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-200 font-sans relative selection:bg-blue-500 selection:text-white pb-20">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/10 rounded-full blur-[160px] pointer-events-none" />

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
        {/* Document Header */}
        <div className="mb-10 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 px-3.5 py-1.5 rounded-full text-blue-400 text-xs font-bold uppercase tracking-wider mb-4">
            <FileText className="w-3.5 h-3.5" /> Legal & Compliance
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-3">
            Terms & Conditions of Service
          </h1>
          <p className="text-slate-400 text-sm">
            Effective Date: October 1, 2026 &bull; Last Revised: October 16, 2026
          </p>
          <div className="mt-4 flex flex-wrap gap-2 items-center text-xs text-slate-300 bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Merchant KYC Compliant &bull; Governed under the Information Technology Act, 2000 (India)</span>
          </div>
        </div>

        {/* Legal Body Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl space-y-8 text-sm sm:text-base leading-relaxed text-slate-300">
          <section>
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-blue-400">1.</span> Introduction & Acceptance of Terms
            </h2>
            <p>
              Welcome to <strong>EduSaaS ERP</strong> (&quot;the Platform&quot;), owned and operated by{" "}
              <strong>EduSaaS ERP Technologies Pvt. Ltd.</strong> (&quot;Company&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;).
              By registering an institutional account, creating credentials, accessing our APIs, or utilizing the web portals, you
              (&quot;Institution&quot;, &quot;Administrator&quot;, &quot;Faculty&quot;, &quot;Student&quot;, &quot;Parent&quot;, or &quot;User&quot;)
              agree to be unconditionally bound by these Terms of Service. If you do not agree to these terms, you must not access or use
              the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-blue-400">2.</span> Scope of Software-as-a-Service (SaaS)
            </h2>
            <p className="mb-2">
              EduSaaS ERP provides a cloud-native, multi-tenant educational enterprise resource planning platform comprising:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-400 text-sm">
              <li>Multi-tenant institutional administration and batch management</li>
              <li>Teacher roll-call attendance logging and curriculum planning</li>
              <li>Student and parent fee invoicing, payment collection, and digital ledger reconciliation</li>
              <li>Academic homework dispatch, report card generation, and compliance certificate issuance</li>
              <li>Third-party payment gateway integration via Razorpay for digital transactions</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-blue-400">3.</span> Account Registration & Multi-Tenant Security
            </h2>
            <p>
              Access requires valid institutional identification codes and role-based credentials. Institutions are solely responsible
              for maintaining the confidentiality of their master Trustee/HOD access credentials. Any activity occurring under your
              institutional tenant identifier is deemed authorized by your institution. We implement cryptographic tenant isolation
              via PostgreSQL Row-Level Security (RLS) to ensure zero data co-mingling between participating schools.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-blue-400">4.</span> Fee Settlements & Razorpay Payment Processing
            </h2>
            <p>
              Tuition payments, examination fees, and institutional charges made via the Platform are securely processed through our
              certified payment aggregator partner, <strong>Razorpay Software Pvt. Ltd.</strong> By making or receiving payments:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-400 text-sm mt-2">
              <li>
                You authorize Razorpay to tokenize and process transactions across credit/debit cards, UPI, and internet banking rails.
              </li>
              <li>EduSaaS ERP does not store unencrypted cardholder numbers or bank PINs on our servers.</li>
              <li>
                Applicable Merchant Discount Rates (MDR) and banking gateway convenience charges are displayed transparently before payment confirmation.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-blue-400">5.</span> Intellectual Property & Data Rights
            </h2>
            <p>
              All proprietary algorithms, source code, design assets, trademarks, and documentation forming the Platform remain the exclusive
              intellectual property of EduSaaS ERP Technologies Pvt. Ltd. Institutions retain complete ownership over student academic rosters,
              guardian contact registries, and institutional records uploaded to the system.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-blue-400">6.</span> Service Level Agreement (SLA) & Uptime
            </h2>
            <p>
              We endeavor to maintain 99.9% application uptime, excluding scheduled off-peak maintenance windows announced with at least
              48 hours advance institutional notice. In the event of unscheduled downtime exceeding standard service levels, institutional
              customers may request proportional service credit adjustments.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-blue-400">7.</span> Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted under applicable law, EduSaaS ERP shall not be held liable for indirect, incidental, punitive,
              or consequential damages resulting from school administrative disputes, unauthorized third-party credential compromise, or
              temporary payment network gateway outages caused by banking clearing houses.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-blue-400">8.</span> Governing Law & Dispute Resolution
            </h2>
            <p>
              These Terms are governed by and construed in accordance with the laws of the Republic of India. Any disputes arising
              hereunder shall be resolved by binding arbitration in Bengaluru, Karnataka, pursuant to the Arbitration and Conciliation
              Act, 1996, and the courts in Bengaluru shall have exclusive jurisdiction.
            </p>
          </section>

          {/* Quick Contact Highlight */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-white text-sm">Questions regarding our Terms?</h3>
              <p className="text-slate-400 text-xs mt-0.5">
                Our legal compliance desk is available at legal@edusaas.app or via our verified contact desk.
              </p>
            </div>
            <Link
              to="/contact"
              className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-4 py-2 rounded-xl border border-slate-700 whitespace-nowrap"
            >
              Contact Legal Desk →
            </Link>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="mt-8 flex flex-wrap gap-4 justify-between items-center text-xs text-slate-400">
          <div>&copy; 2026 EduSaaS ERP Technologies Pvt. Ltd. All rights reserved.</div>
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:text-white underline">Privacy Policy</Link>
            <Link to="/pricing-policy" className="hover:text-white underline">Pricing Policy</Link>
            <Link to="/refund-policy" className="hover:text-white underline">Refund Policy</Link>
            <Link to="/contact" className="hover:text-white underline">Contact Desk</Link>
          </div>
        </div>
      </main>
    </div>
  );
}

