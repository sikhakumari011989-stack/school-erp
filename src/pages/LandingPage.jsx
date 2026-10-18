import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import BrandLogo from "../Components/BrandLogo";

export default function LandingPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoFormData, setDemoFormData] = useState({
    institutionName: "",
    contactPerson: "",
    email: "",
    phone: "",
    studentCount: "500-1000",
  });
  const [demoSubmitted, setDemoSubmitted] = useState(false);

  const capabilities = [
    {
      title: "Unified Multi-Tenant Engine",
      badge: "Architecture",
      icon: "🏛️",
      desc: "Complete cryptographic institutional separation powered by PostgreSQL Row-Level Security. Manage independent campuses, custom batch schedules, and executive trust oversight seamlessly.",
      highlights: ["Isolated Database Schemas", "2-Tier Credential Mapping", "Multi-Campus Trust Rollup"],
      color: "from-purple-500/20 to-indigo-500/10 border-purple-500/30 text-purple-400",
    },
    {
      title: "Real-Time Financial Ledger",
      badge: "FinTech & Payments",
      icon: "💰",
      desc: "End-to-end fee accounting with native Razorpay payment gateway integration. Live transaction tracking, automated digital receipt generation, and encrypted defaulter audit vaults.",
      highlights: ["Razorpay Automated Sync", "Instant Fee Status Reconciliation", "Certified PDF Audit Vault"],
      color: "from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400",
    },
    {
      title: "Instant Attendance Sync",
      badge: "Real-Time Operations",
      icon: "✅",
      desc: "One-touch classroom roll call directly synced from faculty tablets to executive dashboards and student portals in real time. Eliminates paper registers and manual reporting delays.",
      highlights: ["Zero-Latency Attendance Sync", "Batch & Class Roster Control", "Automated Parent Presence Logs"],
      color: "from-blue-500/20 to-cyan-500/10 border-blue-500/30 text-blue-400",
    },
    {
      title: "Academic LMS & Homework Hub",
      badge: "Curriculum Suite",
      icon: "📚",
      desc: "Centralized assignment distribution, interactive chapter tests, study material downloads, and real-time homework deadline tracking for students and parents.",
      highlights: ["Faculty Homework Dispatcher", "Interactive Chapter Quizzes", "Automated Grade Book Metric"],
      color: "from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-400",
    },
    {
      title: "Role-Based Executive Suites",
      badge: "Stakeholder Portals",
      icon: "👥",
      desc: "Tailored command centers designed specifically for Trustees, Principals, Accountants, Teachers, and Students with strictly enforced route guards and permissions.",
      highlights: ["Trustee Analytics Command", "Accountant Dues Ledger", "Student Self-Service Portal"],
      color: "from-fuchsia-500/20 to-pink-500/10 border-fuchsia-500/30 text-fuchsia-400",
    },
    {
      title: "Institutional Compliance Vault",
      badge: "Enterprise Security",
      icon: "🛡️",
      desc: "Government audit-ready datasets, faculty evaluation tracking, campus directory broadcast, and secure certificate generation with digital signature verification.",
      highlights: ["Digital Certificate Generator", "Disciplinary & Conduct Audit", "Emergency Notice Broadcaster"],
      color: "from-slate-500/20 to-indigo-500/10 border-slate-500/30 text-slate-300",
    },
  ];

  const handleDemoSubmit = (e) => {
    e.preventDefault();
    setDemoSubmitted(true);
    showToast(`Institutional walkthrough requested for ${demoFormData.institutionName}!`, "success");
    setTimeout(() => {
      setShowDemoModal(false);
      setDemoSubmitted(false);
      navigate("/login");
    }, 2000);
  };

  return (
    <div className="relative text-slate-200 min-h-screen bg-[#0F172A] font-sans selection:bg-blue-500 selection:text-white pb-24 overflow-x-hidden">
      {/* Ambient Lighting Orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-blue-600/15 rounded-full blur-[180px] pointer-events-none"></div>
      <div className="absolute top-[40%] right-[-10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[200px] pointer-events-none"></div>
      <div className="absolute bottom-[10%] left-[-10%] w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[200px] pointer-events-none"></div>

      {/* TOP NAVIGATION BAR */}
      <nav className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center relative z-20 border-b border-slate-800/80">
        <Link to="/" className="cursor-pointer">
          <BrandLogo size="md" showText={true} />
        </Link>

        <div className="flex items-center gap-3">
          <Link
            to="/portal"
            className="text-slate-300 hover:text-white font-bold text-xs sm:text-sm transition-all px-3.5 py-2 cursor-pointer border border-slate-700/80 rounded-xl bg-slate-800/60 hover:bg-slate-800 hidden sm:inline-flex items-center gap-1.5"
          >
            <span>📱</span>
            <span>Direct Portal (/portal)</span>
          </Link>
          <Link
            to="/register"
            className="text-emerald-400 hover:text-emerald-300 font-extrabold text-xs sm:text-sm transition-all px-3 py-2 cursor-pointer"
          >
            Register School
          </Link>
          <Link
            to="/login?demo=true"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-blue-600/30 transition-all border border-blue-500/40 hover:scale-105 inline-flex items-center gap-1.5"
          >
            <span>Launch Live Demo Portal</span>
            <span>🚀</span>
          </Link>
        </div>
      </nav>

      {/* HERO SECTION */}
      <div className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center relative z-10">
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 px-5 py-2 rounded-full text-blue-400 text-xs font-black uppercase tracking-widest mb-6 shadow-inner">
          <span className="animate-pulse">⚡</span> Next-Generation Multi-Tenant Tuition & School ERP
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-white tracking-tight mb-8 leading-[1.1]">
          Run Your Entire Institution on{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
            One Unified Engine
          </span>
        </h1>

        <p className="text-slate-300 text-base sm:text-lg max-w-3xl mx-auto mb-10 leading-relaxed font-medium">
          Eliminate fragmented tools. Empower HODs, trustees, accountants, teachers, and students with
          ultra-fast role-based suites, bank-grade Razorpay fee settlements, and instant Supabase attendance sync.
        </p>

        <div className="flex justify-center items-center gap-4 flex-wrap">
          <Link
            to="/register"
            className="bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold px-8 py-4 rounded-2xl shadow-xl shadow-emerald-600/30 transition-all border border-emerald-400/50 text-base hover:scale-105 inline-flex items-center gap-2 cursor-pointer"
          >
            <span>🚀</span>
            <span>Register New School (2-Min Setup)</span>
          </Link>
          <button
            onClick={() => setShowDemoModal(true)}
            className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-extrabold px-8 py-4 rounded-2xl shadow-xl shadow-blue-600/30 transition-all border border-blue-500/50 text-base hover:scale-105 cursor-pointer"
          >
            Request Institutional Walkthrough 🏛️
          </button>
          <Link
            to="/login?demo=true"
            className="bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white font-bold px-8 py-4 rounded-2xl border border-slate-700 transition-all text-base hover:border-slate-500 cursor-pointer inline-flex items-center justify-center gap-2"
          >
            <span>Launch Live Demo Portal</span>
            <span>→</span>
          </Link>
        </div>

        {/* METRICS STRIP */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Multi-Tenancy</p>
            <p className="text-2xl font-black text-blue-400 mt-1">100% RLS</p>
            <p className="text-xs text-slate-400 mt-0.5">Cryptographic data isolation</p>
          </div>
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Attendance Sync</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">Real-Time</p>
            <p className="text-xs text-slate-400 mt-0.5">Faculty to student sync</p>
          </div>
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fee Settlements</p>
            <p className="text-2xl font-black text-purple-400 mt-1">Razorpay</p>
            <p className="text-xs text-slate-400 mt-0.5">Automated ledger posting</p>
          </div>
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Role Portals</p>
            <p className="text-2xl font-black text-amber-400 mt-1">5 Suites</p>
            <p className="text-xs text-slate-400 mt-0.5">Trustee, faculty, accountant</p>
          </div>
        </div>
      </div>

      {/* CORE CAPABILITIES SHOWCASE */}
      <div className="max-w-7xl mx-auto px-6 py-20 relative z-10">
        <div className="text-center mb-16">
          <p className="text-blue-400 text-xs font-extrabold uppercase tracking-widest mb-2">
            Institutional Capability Highlights
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-white">
            Engineered for Modern Educational Excellence
          </h2>
          <p className="text-slate-400 text-sm max-w-2xl mx-auto mt-2">
            Explore the mission-critical modules powering premier tuition academies and K-12 institutions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {capabilities.map((cap, idx) => (
            <div
              key={idx}
              className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-8 shadow-2xl hover:border-slate-500/80 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between group"
            >
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                    {cap.icon}
                  </div>
                  <span
                    className={`text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full border bg-gradient-to-r ${cap.color}`}
                  >
                    {cap.badge}
                  </span>
                </div>
                <h3 className="text-xl font-black text-white mb-3 group-hover:text-blue-300 transition-colors">
                  {cap.title}
                </h3>
                <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-6 font-medium">
                  {cap.desc}
                </p>
              </div>

              <div className="space-y-2.5 pt-4 border-t border-slate-800/80">
                {cap.highlights.map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-xs text-slate-300">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* INSTITUTIONAL DEMO CTA BANNER */}
      <div className="max-w-5xl mx-auto px-6 py-12 relative z-10">
        <div className="bg-gradient-to-br from-blue-900/40 via-slate-900 to-purple-900/40 border border-slate-700/80 rounded-[2.5rem] p-8 sm:p-14 text-center shadow-2xl relative overflow-hidden">
          <div className="flex justify-center mb-6">
            <BrandLogo size="lg" className="shadow-2xl shadow-indigo-600/40" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
            Ready to Modernize Your Educational Infrastructure?
          </h2>
          <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto mb-8 font-medium">
            Join forward-thinking academy chains and institutions streamlining student admissions, Razorpay fee collections, and real-time faculty attendance.
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <button
              onClick={() => setShowDemoModal(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold px-8 py-4 rounded-xl shadow-lg shadow-blue-600/30 transition-all border border-blue-400/40"
            >
              Request Custom Institutional Walkthrough 📞
            </button>
            <Link
              to="/login"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-8 py-4 rounded-xl border border-slate-600 transition-all cursor-pointer inline-flex items-center justify-center"
            >
              Enter Live Demo Sandbox →
            </Link>
          </div>
        </div>
      </div>

      {/* FOOTER & RAZORPAY COMPLIANCE SECTION */}
      <footer className="border-t border-slate-800 bg-slate-950/80 backdrop-blur-xl relative z-10 mt-16 pt-16 pb-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
            {/* Col 1: Brand Info */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30 text-xl border border-white/10">
                  🏫
                </div>
                <div>
                  <span className="text-xl font-black text-white tracking-tight block">EduSaaS ERP</span>
                  <span className="text-[10px] text-blue-400 font-extrabold uppercase tracking-widest block">
                    Multi-Tenant Institution OS
                  </span>
                </div>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
                Next-generation multi-tenant school and tuition operating platform. Cryptographic institutional tenant isolation, real-time Razorpay financial ledgers, and zero-latency attendance synchronization.
              </p>
              <div className="pt-2">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
                  <span className="text-emerald-400 text-sm font-bold">✓</span>
                  <span>Razorpay Verified Merchant Partner</span>
                </div>
              </div>
            </div>

            {/* Col 2: Platform Portals */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 mb-4">
                Platform Portals
              </h4>
              <ul className="space-y-2.5 text-sm text-slate-400">
                <li>
                  <Link to="/login?demo=true" className="hover:text-white transition-colors">
                    Live Demo Sandbox
                  </Link>
                </li>
                <li>
                  <Link to="/portal" className="hover:text-white transition-colors">
                    Direct Member Portal (/portal)
                  </Link>
                </li>
                <li>
                  <Link to="/system-check" className="hover:text-emerald-400 transition-colors flex items-center gap-1">
                    <span>🩺 System & Isolation Check</span>
                  </Link>
                </li>
                <li>
                  <Link to="/register" className="hover:text-white transition-colors">
                    Register Institution
                  </Link>
                </li>
                <li>
                  <Link to="/join" className="hover:text-white transition-colors">
                    Join with School Code
                  </Link>
                </li>
                <li>
                  <button
                    onClick={() => setShowDemoModal(true)}
                    className="hover:text-blue-400 text-left transition-colors cursor-pointer"
                  >
                    Request Institutional Walkthrough
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 3: Legal & Razorpay Compliance */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 mb-4">
                Legal & Compliance
              </h4>
              <ul className="space-y-2.5 text-sm text-slate-400">
                <li>
                  <Link to="/terms" className="hover:text-white transition-colors">
                    Terms & Conditions
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" className="hover:text-white transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link to="/pricing-policy" className="hover:text-white transition-colors">
                    Pricing Policy
                  </Link>
                </li>
                <li>
                  <Link to="/refund-policy" className="hover:text-white transition-colors flex items-center gap-1.5">
                    <span>Refund & Cancellation</span>
                    <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded font-bold">7-Day</span>
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="hover:text-white transition-colors">
                    Contact & Grievance Desk
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 4: Corporate Office */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 mb-4">
                Operating Office
              </h4>
              <address className="not-italic text-sm text-slate-400 space-y-2 leading-relaxed">
                <p className="text-slate-300 font-medium">
                  EduSaaS ERP
                </p>
                <p>
                  Flat number 201, Jivdani Chaya, near Rajshree Hospital, beside Kalavati Mandir, Mahim Manohar Highway, Palghar 401404
                </p>
                <p className="text-xs pt-1">
                  <span className="text-slate-500 block">Support Desk:</span>
                  <a href="mailto:sikhakumari011989@gmail.com" className="text-blue-400 hover:underline">
                    sikhakumari011989@gmail.com
                  </a>
                </p>
                <p className="text-xs">
                  <span className="text-slate-500 block">Phone Support:</span>
                  <span className="text-slate-300 font-mono">+91 9518388499</span>
                </p>
              </address>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500">
            <div>
              &copy; 2026 EduSaaS ERP. All rights reserved.
            </div>
            <div className="flex flex-wrap items-center gap-4 text-slate-400">
              <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
              <span>&bull;</span>
              <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <span>&bull;</span>
              <Link to="/contact" className="hover:text-white transition-colors">Support Desk</Link>
              <span>&bull;</span>
              <a href="mailto:sikhakumari011989@gmail.com" className="hover:text-white transition-colors">sikhakumari011989@gmail.com</a>
              <span>&bull;</span>
              <span className="font-mono text-slate-300">+91 9518388499</span>
            </div>
          </div>
        </div>
      </footer>

      {/* DEMO REQUEST MODAL */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden p-8 relative animate-fade-in">
            <button
              onClick={() => setShowDemoModal(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-white text-2xl font-bold leading-none"
            >
              &times;
            </button>

            <div className="mb-6">
              <span className="text-blue-400 text-xs font-black uppercase tracking-widest block mb-1">
                Institutional Partnership
              </span>
              <h3 className="text-2xl font-black text-white">Schedule Private Walkthrough</h3>
              <p className="text-slate-400 text-xs mt-1">
                Our solutions engineering team will prepare a tailored sandbox for your campus.
              </p>
            </div>

            {demoSubmitted ? (
              <div className="py-10 text-center space-y-3">
                <span className="text-5xl">🎉</span>
                <h4 className="text-xl font-bold text-white">Request Received Successfully!</h4>
                <p className="text-slate-300 text-sm">
                  Connecting your institution node. Redirecting to live sandbox...
                </p>
              </div>
            ) : (
              <form onSubmit={handleDemoSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Institution / Academy Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex International Academy"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 text-sm"
                    value={demoFormData.institutionName}
                    onChange={(e) => setDemoFormData({ ...demoFormData, institutionName: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Lead Contact / Title
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. Rajesh Sharma"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 text-sm"
                      value={demoFormData.contactPerson}
                      onChange={(e) => setDemoFormData({ ...demoFormData, contactPerson: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Student Capacity
                    </label>
                    <select
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 text-sm"
                      value={demoFormData.studentCount}
                      onChange={(e) => setDemoFormData({ ...demoFormData, studentCount: e.target.value })}
                    >
                      <option value="100-500">100 - 500 Students</option>
                      <option value="500-2000">500 - 2,000 Students</option>
                      <option value="2000+">2,000+ Students (Multi-Branch)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Official Work Email
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="admin@institution.edu"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 text-sm"
                      value={demoFormData.email}
                      onChange={(e) => setDemoFormData({ ...demoFormData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Direct Phone
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 98230 00000"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 text-sm"
                      value={demoFormData.phone}
                      onChange={(e) => setDemoFormData({ ...demoFormData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="pt-3 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowDemoModal(false)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-xl text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl text-sm shadow-lg shadow-blue-600/30"
                  >
                    Confirm Walkthrough 🚀
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}