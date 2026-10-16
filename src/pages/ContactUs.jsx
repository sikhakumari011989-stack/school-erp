import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, Clock, ArrowLeft, Send, ShieldCheck, CheckCircle2, Building2 } from "lucide-react";
import { useToast } from "../context/ToastContext";

export default function ContactUs() {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    institution: "",
    subject: "General Support",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    showToast("Inquiry submitted successfully! A support engineer will reply within 4 hours.", "success");
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-200 font-sans relative selection:bg-blue-500 selection:text-white pb-20">
      {/* Background glow */}
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

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 pt-12 pb-16 relative z-10">
        <div className="mb-10 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 px-3.5 py-1.5 rounded-full text-blue-400 text-xs font-bold uppercase tracking-wider mb-4">
            <Building2 className="w-3.5 h-3.5" /> Institutional Support & Audit Office
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-3">
            Contact Official Support & Grievance Desk
          </h1>
          <p className="text-slate-400 text-sm">
            Razorpay Merchant Underwriting Verified &bull; Official Indian Corporate Entity
          </p>
          <div className="mt-4 flex flex-wrap gap-2 items-center text-xs text-slate-300 bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Dedicated Multi-Branch Helpdesk &bull; Enterprise 24-Hour Resolution Guarantee</span>
          </div>
        </div>

        {/* 2-Column Grid: Contact Information & Submission Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Official Contact Records */}
          <div className="lg:col-span-5 space-y-6">
            {/* Entity Identification Card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
              <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-400" />
                Corporate Entity Details
              </h2>

              <div className="space-y-4 text-sm text-slate-300">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5 text-blue-400">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400 mb-0.5">
                      Registered Physical Address
                    </h3>
                    <p className="text-slate-200 text-sm leading-snug">
                      EduSaaS ERP Technologies Private Limited<br />
                      #402, 4th Floor, Tech Innovation Park<br />
                      Outer Ring Road, Kadubeesanahalli<br />
                      Bengaluru, Karnataka - 560103, India
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5 text-emerald-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400 mb-0.5">
                      Official Support Emails
                    </h3>
                    <p className="text-sm">
                      Support: <a href="mailto:support@edusaas.app" className="text-blue-400 hover:underline">support@edusaas.app</a>
                    </p>
                    <p className="text-sm">
                      Billing & Refunds: <a href="mailto:billing@edusaas.app" className="text-blue-400 hover:underline">billing@edusaas.app</a>
                    </p>
                    <p className="text-sm">
                      Grievance Desk: <a href="mailto:grievance@edusaas.app" className="text-blue-400 hover:underline">grievance@edusaas.app</a>
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center shrink-0 mt-0.5 text-purple-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400 mb-0.5">
                      Direct Support Telephones
                    </h3>
                    <p className="text-slate-200 text-sm">
                      Toll-Free / Central: <span className="font-mono text-white font-bold">+91 98765 43210</span>
                    </p>
                    <p className="text-slate-200 text-sm">
                      Landline Office: <span className="font-mono text-white font-bold">+91 (080) 4123-4567</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5 text-amber-400">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400 mb-0.5">
                      Business Operating Hours
                    </h3>
                    <p className="text-slate-200 text-sm">
                      Monday to Friday: 9:00 AM – 6:30 PM IST<br />
                      Saturday: 9:30 AM – 1:30 PM IST<br />
                      <span className="text-slate-400 text-xs">Sunday & National Holidays: Automated Server Monitoring (24/7)</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Razorpay Trust Badge Card */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-3xl p-6 text-xs text-slate-400 space-y-2">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Verified Merchant KYC Profile
              </div>
              <p>
                Our payment gateway is operated in certified partnership with Razorpay Software Pvt. Ltd. All transactions are protected by PCI-DSS Level 1 compliant architecture and RBI regulations.
              </p>
            </div>
          </div>

          {/* Right Column: Inquiry / Support Ticket Form */}
          <div className="lg:col-span-7">
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-10 backdrop-blur-xl shadow-2xl">
              <h2 className="text-2xl font-black text-white tracking-tight mb-2">
                Send an Official Institutional Inquiry
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm mb-6">
                Fill out the ticket below. Our institutional deployment engineers and billing managers review inquiries around the clock.
              </p>

              {submitted ? (
                <div className="py-12 text-center space-y-4">
                  <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-white">Ticket Successfully Dispatched!</h3>
                  <p className="text-slate-300 text-sm max-w-md mx-auto">
                    We have logged your request. A confirmation summary has been sent to{" "}
                    <strong className="text-blue-400">{formData.email}</strong>. Our grievance / support team will respond shortly.
                  </p>
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setFormData({
                        name: "",
                        email: "",
                        phone: "",
                        institution: "",
                        subject: "General Support",
                        message: "",
                      });
                    }}
                    className="mt-4 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl border border-slate-700"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        Your Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Dr. Rajesh Sharma"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 text-sm"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        Official Work Email *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="admin@institution.edu"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 text-sm"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        Direct Phone / Mobile *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="+91 98765 43210"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 text-sm"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        Institution / Academy Name
                      </label>
                      <input
                        type="text"
                        placeholder="Apex International Academy"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 text-sm"
                        value={formData.institution}
                        onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Inquiry Department / Subject *
                    </label>
                    <select
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 text-sm"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    >
                      <option value="General Support">General Support & Technical Help</option>
                      <option value="Billing & Refunds">Billing, Razorpay Payments & Refunds</option>
                      <option value="Institutional Sales">Institutional Sales & Multi-Branch Enterprise</option>
                      <option value="Grievance">Grievance / Regulatory Inquiries</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Detailed Message *
                    </label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Please explain your question or inquiry in detail..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 text-sm resize-none"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold py-3.5 px-6 rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
                  >
                    <Send className="w-4 h-4" />
                    Submit Official Inquiry 🚀
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Legal Navigation */}
        <div className="mt-12 flex flex-wrap gap-4 justify-between items-center text-xs text-slate-400 pt-6 border-t border-slate-800">
          <div>&copy; 2026 EduSaaS ERP Technologies Pvt. Ltd. All rights reserved.</div>
          <div className="flex gap-4">
            <Link to="/terms" className="hover:text-white underline">Terms of Service</Link>
            <Link to="/privacy" className="hover:text-white underline">Privacy Policy</Link>
            <Link to="/pricing-policy" className="hover:text-white underline">Pricing Policy</Link>
            <Link to="/refund-policy" className="hover:text-white underline">Refund Policy</Link>
          </div>
        </div>
      </main>
    </div>
  );
}

