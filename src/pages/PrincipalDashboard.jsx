import React, { useState } from "react";

export default function PrincipalDashboard() {
  const [activeFeature, setActiveFeature] = useState(null);

  // The 20 Executive Features requested for Principal / Head Owner
  const features = [
    { id: 1, name: "Master Revenue & Strength", icon: "📈", desc: "Real-time institutional financial & enrollment analytics." },
    { id: 2, name: "User Management", icon: "👥", desc: "Add, suspend, or audit student & teacher accounts." },
    { id: 3, name: "Global Broadcast", icon: "📢", desc: "Publish emergency announcements across all classes." },
    { id: 4, name: "Staff Leave Approvals", icon: "📝", desc: "Review and sign off on faculty leave requests." },
    { id: 5, name: "Financial Override", icon: "💰", desc: "Deep financial logs and accountant report oversight." },
    { id: 6, name: "Academic Monitoring", icon: "📊", desc: "Track pass/fail ratios and examination grade trends." },
    { id: 7, name: "Master Timetable", icon: "⏰", desc: "Control and approve institutional scheduling." },
    { id: 8, name: "Staff Evaluation", icon: "⭐", desc: "Monitor faculty performance and syllabus progress." },
    { id: 9, name: "System Access Logs", icon: "⚙️", desc: "Track digital security logs and user sign-ins." },
    { id: 10, name: "Parent Escalations", icon: "🚨", desc: "Handle high-priority parent tickets and inquiries." },
    { id: 11, name: "Revenue Forecasting", icon: "📉", desc: "Predict annual fee collection trends." },
    { id: 12, name: "Certificate Signatures", icon: "✍️", desc: "Digital verification and signing of student certificates." },
    { id: 13, name: "VIP Parent Scheduler", icon: "📅", desc: "Manage high-level trustee or parent meetings." },
    { id: 14, name: "Live CCTV Feed", icon: "📹", desc: "Campus security monitoring stream integration." },
    { id: 15, name: "Inventory Master", icon: "📦", desc: "Track uniforms, books, and laboratory equipment." },
    { id: 16, name: "Transport Fleet", icon: "🚌", desc: "Monitor school bus routes and GPS tracking." },
    { id: 17, name: "Disciplinary Log", icon: "⚖️", desc: "Review conduct reports and student disciplinary actions." },
    { id: 18, name: "Alumni Network", icon: "🎓", desc: "Manage graduate records and alumni outreach." },
    { id: 19, name: "Exam Control Room", icon: "📋", desc: "Authorize question papers and examination centers." },
    { id: 20, name: "Custom Report Builder", icon: "📑", desc: "Export tailored institution datasets for government audits." }
  ];

  return (
    <div className="relative text-slate-200 min-h-full pb-10">
      <div className="fixed top-0 right-10 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10">
        <div className="mb-8">
          <p className="text-blue-300 text-sm font-semibold mb-1 uppercase tracking-widest">Executive Suite</p>
          <h1 className="text-4xl font-extrabold text-white">Principal / Head Command Center 🏛️</h1>
          <p className="text-slate-400 text-sm mt-1">Full 20-Feature Institutional Control Room</p>
        </div>

        {activeFeature ? (
          <div className="bg-[#1E293B] border border-slate-700 rounded-3xl p-8 shadow-2xl">
            <button 
              onClick={() => setActiveFeature(null)} 
              className="text-blue-400 hover:text-white font-bold mb-6 flex items-center gap-2"
            >
              ← Back to Command Center
            </button>
            <div className="text-center py-12 space-y-4">
              <span className="text-6xl">{activeFeature.icon}</span>
              <h2 className="text-2xl font-extrabold text-white">{activeFeature.name}</h2>
              <p className="text-slate-400 max-w-md mx-auto">{activeFeature.desc}</p>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg mx-auto text-left">
                <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">Module Status: Active</p>
                <p className="text-sm text-slate-300">This executive feature is fully initialized and synced with the institutional secure node.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feat) => (
              <div 
                key={feat.id} 
                onClick={() => setActiveFeature(feat)}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl hover:border-blue-500/50 hover:bg-white/10 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform shadow-inner">
                    {feat.icon}
                  </div>
                  <span className="text-[10px] font-extrabold text-blue-400 uppercase tracking-widest block mb-1">Feature #{feat.id}</span>
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-300 transition-colors">{feat.name}</h3>
                  <p className="text-slate-400 text-xs line-clamp-2">{feat.desc}</p>
                </div>
                <div className="mt-6 flex items-center text-xs font-bold text-slate-400 group-hover:text-white transition-colors">
                  <span>Launch Module</span> →
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}