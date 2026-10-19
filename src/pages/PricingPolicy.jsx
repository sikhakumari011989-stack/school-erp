import React from "react";
import { Link } from "react-router-dom";
import { CreditCard, ArrowLeft, Check, ShieldCheck, Zap } from "lucide-react";

export default function PricingPolicy() {
  const tiers = [
    {
      name: "Starter Campus",
      price: "₹4,999",
      period: "per month",
      desc: "Ideal for boutique tuition centers and single-branch coaching academies up to 300 enrolled students.",
      features: [
        "Up to 300 Active Students",
        "Faculty Attendance & Roll-Call Sync",
        "Teacher Homework & LMS Dispatcher",
        "Student & Parent Web Portals",
        "Standard Email & Helpdesk Support",
      ],
      popular: false,
      accent: "border-slate-800",
    },
    {
      name: "Growth Academy",
      price: "₹12,999",
      period: "per month",
      desc: "For established K-12 private schools, senior colleges, and multi-batch tuition institutes.",
      features: [
        "Up to 1,500 Active Students",
        "Complete Razorpay Fee Collection Engine",
        "Automated WhatsApp & SMS Alerts (Twilio/Wati)",
        "Official PDF Report Cards & Invoices (jsPDF)",
        "Accountant Financial Ledger & Defaulter Vault",
        "Priority 24/7 Technical Support SLA",
      ],
      popular: true,
      accent: "border-blue-500/60 shadow-blue-500/10 shadow-xl",
    },
    {
      name: "Enterprise Network",
      price: "₹24,999",
      period: "per month",
      desc: "Designed for multi-campus educational trusts, franchise coaching chains, and large university networks.",
      features: [
        "Unlimited Students & Multiple Campuses",
        "Master Trustee Multi-School Rollup Analytics",
        "PostgreSQL Row-Level Security Tenant Vault",
        "Custom API Webhooks & ERP Integrations",
        "Dedicated Account Executive & Onboarding",
        "Custom Feature Development Sprints",
      ],
      popular: false,
      accent: "border-purple-500/50",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-200 font-sans relative selection:bg-blue-500 selection:text-white pb-20">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-600/10 rounded-full blur-[160px] pointer-events-none" />

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
      <main className="max-w-5xl mx-auto px-6 pt-12 pb-16 relative z-10">
        <div className="mb-10 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1.5 rounded-full text-emerald-400 text-xs font-bold uppercase tracking-wider mb-4">
            <CreditCard className="w-3.5 h-3.5" /> Commercial Terms
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-3">
            Institutional Pricing Policy
          </h1>
          <p className="text-slate-400 text-sm">
            Transparent, predictable billing in Indian Rupees (INR ₹) &bull; Zero hidden maintenance fees
          </p>
          <div className="mt-4 flex flex-wrap gap-2 items-center text-xs text-slate-300 bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Razorpay Payment Gateway Integration &bull; 100% Tax Compliant GST Invoicing &bull; 7-Day Risk-Free Evaluation</span>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {tiers.map((t, idx) => (
            <div
              key={idx}
              className={`bg-slate-900/80 border rounded-3xl p-6 flex flex-col justify-between relative backdrop-blur-xl ${t.accent}`}
            >
              {t.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[11px] font-extrabold uppercase px-3.5 py-1 rounded-full shadow-lg shadow-blue-600/40">
                  Most Popular
                </div>
              )}
              <div>
                <h3 className="text-xl font-black text-white mb-1">{t.name}</h3>
                <p className="text-slate-400 text-xs mb-4 min-h-[36px]">{t.desc}</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-3xl sm:text-4xl font-black text-white">{t.price}</span>
                  <span className="text-slate-400 text-xs font-semibold">/{t.period}</span>
                </div>
                <div className="border-t border-slate-800 pt-4 space-y-2.5 mb-6">
                  {t.features.map((f, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Link
                to="/contact"
                className={`w-full py-3 rounded-xl font-bold text-xs text-center transition-all ${
                  t.popular
                    ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                }`}
              >
                Inquire for {t.name} →
              </Link>
            </div>
          ))}
        </div>

        {/* Policy Details Accordion / Sections */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl space-y-8 text-sm sm:text-base leading-relaxed text-slate-300">
          <section>
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-emerald-400">1.</span> Currency & Billing Schedule
            </h2>
            <p>
              All prices displayed on this Platform and in official institutional quotations are denominated in{" "}
              <strong>Indian National Rupees (INR ₹)</strong>. Subscriptions are billed automatically on a recurring monthly or
              annual cycle based on the billing frequency chosen during institutional activation. Annual commitments receive a 15%
              prepayment discount.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-emerald-400">2.</span> Student Fee Collections (Zero Platform Commission)
            </h2>
            <p>
              When students or guardians settle tuition fees via EduSaaS ERP, funds are routed directly through Razorpay to the
              institution&apos;s verified bank account. <strong>EduSaaS ERP charges 0% platform commission on student tuition collections.</strong>{" "}
              Standard banking network processing fees (MDR) mandated by Razorpay apply (typically 0% on UPI transactions and standard
              interchange rates for commercial cards).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-emerald-400">3.</span> Accepted Modes of Payment
            </h2>
            <p className="mb-2">Through our Razorpay merchant integration, we accept the following payment channels:</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-400 text-sm">
              <li><strong>Unified Payments Interface (UPI):</strong> Google Pay, PhonePe, Paytm, BHIM, and all major UPI apps.</li>
              <li><strong>Debit & Credit Cards:</strong> RuPay, Visa, MasterCard, and American Express.</li>
              <li><strong>Net Banking:</strong> Direct debit across 50+ Indian commercial banks including SBI, HDFC, ICICI, and Axis Bank.</li>
              <li><strong>Corporate NEFT / RTGS:</strong> Supported for annual enterprise institutional tier settlements.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-emerald-400">4.</span> Applicable Taxes (GST)
            </h2>
            <p>
              In accordance with Indian taxation statutes, Goods & Services Tax (GST) at the standard rate of 18% is applicable to
              all software subscription fees. Educational institutions providing a valid Goods and Services Tax Identification Number
              (GSTIN) at registration will receive official tax invoices eligible for Input Tax Credit (ITC).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-emerald-400">5.</span> Pricing Modifications
            </h2>
            <p>
              We reserve the right to revise institutional subscription rates with a minimum of 30 days prior written notice to
              institutional trustees. Active annual contract terms are rate-locked and will not be altered during the prevailing contract year.
            </p>
          </section>

          {/* Call to action */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-white text-sm">Need a custom quotation for multiple campuses?</h3>
              <p className="text-slate-400 text-xs mt-0.5">
                Our institutional enterprise team will create a tailored proposal matching your campus capacity.
              </p>
            </div>
            <Link
              to="/contact"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-lg shadow-emerald-600/20 whitespace-nowrap"
            >
              Request Custom Quote →
            </Link>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="mt-8 flex flex-wrap gap-4 justify-between items-center text-xs text-slate-400">
          <div>&copy; 2026 EduSaaS ERP Technologies Pvt. Ltd. All rights reserved.</div>
          <div className="flex gap-4">
            <Link to="/terms" className="hover:text-white underline">Terms of Service</Link>
            <Link to="/privacy" className="hover:text-white underline">Privacy Policy</Link>
            <Link to="/refund-policy" className="hover:text-white underline">Refund Policy</Link>
            <Link to="/contact" className="hover:text-white underline">Contact Desk</Link>
          </div>
        </div>
      </main>
    </div>
  );
}

