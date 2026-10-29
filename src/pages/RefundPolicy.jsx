import React from "react";
import { Link } from "react-router-dom";
import { RotateCcw, ArrowLeft, ShieldCheck, CheckCircle2, Clock, AlertCircle } from "lucide-react";

export default function RefundPolicy() {
  return (
    <div className="min-h-[100dvh] bg-[#0F172A] text-slate-200 font-sans relative selection:bg-blue-500 selection:text-white pb-20">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-rose-600/10 rounded-full blur-[160px] pointer-events-none" />

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

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 pt-12 pb-16 relative z-10">
        <div className="mb-10 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 px-3.5 py-1.5 rounded-full text-rose-400 text-xs font-bold uppercase tracking-wider mb-4">
            <RotateCcw className="w-3.5 h-3.5" /> Fair Transparency
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-3">
            Refund & Cancellation Policy
          </h1>
          <p className="text-slate-400 text-sm">
            Standard SaaS 7-Day Money-Back Guarantee &bull; Direct Razorpay Reversals
          </p>
          <div className="mt-4 flex flex-wrap gap-2 items-center text-xs text-slate-300 bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Guaranteed 5-7 Business Day Turnaround &bull; Automated Reversal to Original Payment Method</span>
          </div>
        </div>

        {/* Highlight Banner: 7-Day Policy */}
        <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/40 to-purple-900/40 border border-blue-500/40 rounded-3xl p-6 sm:p-8 mb-8 backdrop-blur-xl">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center shrink-0 text-blue-400 text-2xl font-bold">
              7
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-1">
                7-Day Risk-Free SaaS Trial & Cancellation Guarantee
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                We take immense pride in the reliability and capability of EduSaaS ERP. If your institution is not completely
                satisfied with the platform within the first <strong>7 calendar days</strong> of initial paid subscription
                activation, you may request a <strong>100% full refund</strong> with zero questions asked and zero penalty fees.
              </p>
            </div>
          </div>
        </div>

        {/* Policy Body Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl space-y-8 text-sm sm:text-base leading-relaxed text-slate-300">
          <section>
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-rose-400">1.</span> SaaS Subscription Cancellation Procedure
            </h2>
            <p className="mb-2">
              Institutions can cancel their monthly or annual software subscription at any time:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-400 text-sm">
              <li>
                <strong>Self-Service:</strong> From the Master Trustee Dashboard &gt; Institutional Billing section, by clicking
                &quot;Cancel Subscription Renewal&quot;.
              </li>
              <li>
                <strong>Assisted:</strong> By emailing our dedicated billing desk at{" "}
                <a href="mailto:billing@edusaas.app" className="text-blue-400 underline">billing@edusaas.app</a> with your unique
                Institution Code (e.g., <code>OASIS-TUTORIALS</code>).
              </li>
            </ul>
            <p className="text-xs text-slate-400 mt-2">
              Upon cancellation, access will remain active until the end of the current paid billing cycle unless an immediate 7-day refund is requested.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-rose-400">2.</span> Refund Eligibility Criteria
            </h2>
            <div className="space-y-3">
              <div className="flex items-start gap-2 text-xs sm:text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Full 100% Refund:</strong> Applicable if requested within 7 calendar days of initial subscription activation or onboarding setup.
                </span>
              </div>
              <div className="flex items-start gap-2 text-xs sm:text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Accidental Duplicate Charges:</strong> If a technical glitch results in duplicate debits for the same billing cycle, the duplicate amount is automatically refunded in full.
                </span>
              </div>
              <div className="flex items-start gap-2 text-xs sm:text-sm">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Beyond 7 Days:</strong> Monthly subscription charges incurred beyond the initial 7-day period are non-refundable. For annual contracts cancelled prematurely, prorated refunds may be issued at management discretion.
                </span>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-rose-400">3.</span> Refund Processing & Turnaround Time
            </h2>
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs sm:text-sm">
              <div className="flex items-center gap-2 text-slate-200">
                <Clock className="w-4 h-4 text-blue-400" />
                <strong>Approval & Gateway Trigger:</strong> Within 24 to 48 business hours of ticket verification.
              </div>
              <div className="flex items-center gap-2 text-slate-200">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <strong>Bank Settlement Timeline:</strong> 5 to 7 working days to appear in your bank account or card statement.
              </div>
              <p className="text-slate-400 text-xs pt-1">
                All refunds are initiated directly through our Razorpay merchant gateway back to the <strong>original source of payment</strong> (UPI ID, source credit card, or issuing bank account). Cash or third-party bank transfers are prohibited under anti-money laundering (AML) guidelines.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-rose-400">4.</span> Student Tuition & Academy Fee Payments
            </h2>
            <p>
              Please note that student tuition fee settlements, ancillary development fees, and examination charges paid through the Student
              Portal are credited directly to the respective educational institution&apos;s linked merchant bank account.
            </p>
            <p className="text-slate-400 text-xs mt-2">
              Therefore, all student tuition refund requests are strictly governed by the specific academic institution&apos;s admission
              and fee withdrawal policies. In cases of disputed transactions, chargebacks, or duplicate fee debits, EduSaaS ERP will
              furnish digital receipts, Razorpay Payment IDs, and audit timestamps to assist resolution.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-rose-400">5.</span> How to Initiate a Refund Request
            </h2>
            <p className="mb-2">To submit a refund request, provide the following details to our support desk:</p>
            <ol className="list-decimal pl-5 space-y-1 text-slate-400 text-sm">
              <li>Institution Name and Unique Institution Code</li>
              <li>Razorpay Payment Reference ID (e.g. <code>pay_PxY123...</code>)</li>
              <li>Official invoice or payment receipt timestamp</li>
              <li>Reason for cancellation (for quality enhancement)</li>
            </ol>
          </section>

          {/* Quick Support Ticket Box */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-white text-sm">Need to request a refund or billing clarification?</h3>
              <p className="text-slate-400 text-xs mt-0.5">
                Our finance desk responds within 24 hours: billing@edusaas.app or via phone support.
              </p>
            </div>
            <Link
              to="/contact"
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-lg shadow-rose-600/20 whitespace-nowrap"
            >
              Contact Billing Desk →
            </Link>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="mt-8 flex flex-wrap gap-4 justify-between items-center text-xs text-slate-400">
          <div>&copy; 2026 EduSaaS ERP Technologies Pvt. Ltd. All rights reserved.</div>
          <div className="flex gap-4">
            <Link to="/terms" className="hover:text-white underline">Terms of Service</Link>
            <Link to="/privacy" className="hover:text-white underline">Privacy Policy</Link>
            <Link to="/pricing-policy" className="hover:text-white underline">Pricing Policy</Link>
            <Link to="/contact" className="hover:text-white underline">Contact Desk</Link>
          </div>
        </div>
      </main>
    </div>
  );
}

