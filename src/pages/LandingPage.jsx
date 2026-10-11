import React from "react";
import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const navigate = useNavigate();

  const pricingTiers = [
    {
      name: "Starter Tuition",
      price: "₹4,999",
      period: "/ month",
      desc: "Ideal for independent coaching centers and small tutorial classes.",
      features: ["Up to 200 Students", "2-Tier Authentication", "Attendance & Homework", "Standard Email Support"],
      highlight: false
    },
    {
      name: "Professional School",
      price: "₹14,999",
      period: "/ month",
      desc: "Perfect for K-12 ICSE/CBSE schools seeking complete ERP automation.",
      features: ["Unlimited Students & Teachers", "All Stakeholder Portals", "Razorpay Fee Gateway", "Priority 24/7 Support"],
      highlight: true
    },
    {
      name: "Enterprise Multi-Branch",
      price: "Custom",
      period: "",
      desc: "For educational trusts managing multiple campus branches nationwide.",
      features: ["Multi-Branch Trust Oversight", "Dedicated Supabase Cluster", "Custom Domain & Branding", "Dedicated Account Manager"],
      highlight: false
    }
  ];

  return (
    <div className="relative text-slate-200 min-h-screen bg-[#0F172A] font-sans selection:bg-blue-500 selection:text-white pb-20">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/15 rounded-full blur-[160px] pointer-events-none"></div>

      {/* NAVBAR */}
      <nav className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center relative z-10 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30 text-xl">🏫</div>
          <span className="text-xl font-black text-white tracking-tight">EduSaaS ERP</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/login')}
            className="text-slate-300 hover:text-white font-bold text-sm transition-all px-4 py-2"
          >
            Sign In
          </button>
          <button 
            onClick={() => navigate('/login')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-blue-600/30 transition-all border border-blue-500/50"
          >
            Get Started 🚀
          </button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <div className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center relative z-10">
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 px-4 py-1.5 rounded-full text-blue-400 text-xs font-extrabold uppercase tracking-widest mb-6">
          <span>⚡</span> Next-Generation Multi-Tenant School ERP
        </div>
        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight mb-6 leading-tight">
          Run Your Entire Institution on <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">One Unified Engine</span>
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
          Empower administrators, principals, accountants, teachers, and students with lightning-fast role-based portals, secure Razorpay fee collection, and real-time Supabase attendance sync.
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
          <button 
            onClick={() => navigate('/login')}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold px-8 py-4 rounded-2xl shadow-xl shadow-blue-600/30 transition-all border border-blue-500/50 text-base"
          >
            Launch System Access & Demo 🚀
          </button>
        </div>
      </div>

      {/* PRICING TIERS SECTION */}
      <div className="max-w-7xl mx-auto px-6 py-16 relative z-10">
        <div className="text-center mb-12">
          <p className="text-blue-400 text-xs font-extrabold uppercase tracking-widest mb-2">Transparent Pricing</p>
          <h2 className="text-3xl font-extrabold text-white">Choose Your Institutional Tier</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {pricingTiers.map((tier, idx) => (
            <div 
              key={idx} 
              className={`rounded-[2rem] p-8 flex flex-col justify-between transition-all relative ${
                tier.highlight 
                  ? 'bg-gradient-to-b from-blue-600/20 to-slate-900 border-2 border-blue-500 shadow-2xl shadow-blue-600/20 scale-105' 
                  : 'bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl'
              }`}
            >
              {tier.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white font-extrabold text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">
                  Most Popular Choice ⭐
                </div>
              )}
              <div>
                <h3 className="text-xl font-black text-white mb-2">{tier.name}</h3>
                <p className="text-slate-400 text-xs mb-6 leading-relaxed">{tier.desc}</p>
                <div className="mb-6 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">{tier.price}</span>
                  <span className="text-slate-400 text-sm font-bold">{tier.period}</span>
                </div>
                <div className="space-y-3 mb-8">
                  {tier.features.map((feat, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm text-slate-300">
                      <span className="text-emerald-400 font-bold">✓</span> {feat}
                    </div>
                  ))}
                </div>
              </div>
              <button 
                onClick={() => navigate('/login')}
                className={`w-full font-extrabold py-3.5 rounded-xl shadow-lg transition-all ${
                  tier.highlight 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                }`}
              >
                Select Plan 🚀
              </button>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}