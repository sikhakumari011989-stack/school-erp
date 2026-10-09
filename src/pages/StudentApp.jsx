import { useState, useContext } from "react";
import { AppContext } from "../context/AppContext";

export default function StudentApp() {
  const { user, logout } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState("home");

  // Bottom Navigation Items
  const tabs = [
    { id: "home", label: "Home", icon: "🏠" },
    { id: "attendance", label: "Attendance", icon: "✋" },
    { id: "diary", label: "Diary", icon: "📓" },
    { id: "academics", label: "Academics", icon: "🎓" },
    { id: "fees", label: "Fees", icon: "💳" },
    { id: "profile", label: "Profile", icon: "👤" },
  ];

  // Quick Actions from the video
  const quickActions = [
    { label: "Attendance", icon: "✋", color: "bg-emerald-100 text-emerald-600" },
    { label: "Homework", icon: "📝", color: "bg-blue-100 text-blue-600" },
    { label: "Marks", icon: "🎯", color: "bg-purple-100 text-purple-600" },
    { label: "Diary", icon: "📓", color: "bg-orange-100 text-orange-600" },
    { label: "Chat", icon: "💬", color: "bg-pink-100 text-pink-600" },
    { label: "Fees", icon: "💰", color: "bg-teal-100 text-teal-600" },
    { label: "Calendar", icon: "📅", color: "bg-indigo-100 text-indigo-600" },
    { label: "LMS Hub", icon: "💻", color: "bg-violet-100 text-violet-600" },
  ];

  return (
    // Outer wrapper centers the "phone" screen on desktop, full width on mobile
    <div className="min-h-screen bg-slate-900 flex justify-center items-center">
      
      {/* Mobile App Container */}
      <div className="w-full max-w-[400px] h-[100dvh] bg-slate-50 relative overflow-hidden flex flex-col shadow-[0_0_50px_rgba(108,46,185,0.2)] sm:rounded-[40px] sm:h-[850px] sm:border-[8px] sm:border-slate-800">
        
        {/* APP CONTENT (Scrollable) */}
        <div className="flex-1 overflow-y-auto pb-24 hide-scrollbar">
          
          {/* HEADER SECTION - Premium Purple Gradient */}
          <div className="bg-gradient-to-br from-[#5B2D8E] via-[#6C2EB9] to-[#8B5CF6] pt-12 pb-20 px-6 rounded-b-[40px] relative shadow-lg">
            
            {/* Top Bar */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <button className="text-white hover:bg-white/20 p-2 rounded-full transition-all">
                  ☰
                </button>
                <h1 className="text-white font-bold text-xl tracking-wide">Dashboard</h1>
              </div>
              <div className="flex gap-4">
                <div className="relative">
                  <span className="text-white text-xl">🔔</span>
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-[#6C2EB9]">
                    3
                  </span>
                </div>
                <button onClick={logout} className="text-white/80 hover:text-white transition-all text-xl" title="Logout">
                  🚪
                </button>
              </div>
            </div>

            {/* Greeting */}
            <div className="text-white/80 text-sm font-medium mb-1">
              {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short' })}
            </div>
            <h2 className="text-white text-3xl font-bold flex items-center gap-2">
              Good Morning <br/> {user?.name || "Student"} <span className="animate-wave inline-block origin-bottom-right">👋</span>
            </h2>
          </div>

          {/* OVERLAPPING ATTENDANCE CARD - Glassmorphism */}
          <div className="-mt-10 px-6 relative z-10">
            <div className="bg-white/70 backdrop-blur-xl border border-white/50 p-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] flex justify-between items-center transform transition-all hover:scale-[1.02]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-2xl shadow-inner">
                  📅
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Today's Attendance</p>
                  <p className="text-slate-800 font-bold text-lg">Not Marked</p>
                </div>
              </div>
              <div className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">
                {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
              </div>
            </div>
          </div>

          {/* METRICS ROW */}
          <div className="grid grid-cols-3 gap-4 px-6 mt-6">
            {[
              { label: "Homework", count: "0", icon: "📝", color: "text-amber-500" },
              { label: "Exams", count: "0", icon: "🎯", color: "text-blue-500" },
              { label: "Fees Due", count: "₹0", icon: "💰", color: "text-rose-500" }
            ].map((stat, i) => (
              <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-2 hover:shadow-md transition-all cursor-pointer">
                <div className={`text-2xl ${stat.color}`}>{stat.icon}</div>
                <div className="text-xl font-extrabold text-slate-800">{stat.count}</div>
                <div className="text-[11px] font-semibold text-slate-500 uppercase">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* QUICK ACTIONS GRID */}
          <div className="px-6 mt-8">
            <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Quick Actions</h3>
            <div className="grid grid-cols-4 gap-y-6 gap-x-2">
              {quickActions.map((action, i) => (
                <div key={i} className="flex flex-col items-center gap-2 group cursor-pointer">
                  <div className={`w-14 h-14 ${action.color} rounded-[18px] flex items-center justify-center text-2xl shadow-sm group-hover:scale-110 group-hover:shadow-md transition-all duration-300`}>
                    {action.icon}
                  </div>
                  <span className="text-[11px] font-medium text-slate-600 text-center leading-tight">
                    {action.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* NOTICES SECTION */}
          <div className="px-6 mt-8 mb-6">
            <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Today's Updates</h3>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-4 border-b border-slate-50 pb-4">
                <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center text-xl">
                  👩‍🏫
                </div>
                <div>
                  <p className="text-slate-800 font-bold text-sm">No classes today</p>
                  <p className="text-slate-500 text-xs">Take a break! 🎉</p>
                </div>
              </div>
              <div className="flex items-center gap-4 pt-4">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-xl">
                  ✨
                </div>
                <div>
                  <p className="text-slate-800 font-bold text-sm">No pending homework</p>
                  <p className="text-slate-500 text-xs">You're all caught up! 🚀</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM NAVIGATION BAR - Fixed */}
        <div className="absolute bottom-0 w-full bg-white/90 backdrop-blur-md border-t border-slate-200 px-2 py-3 pb-safe flex justify-between shadow-[0_-10px_20px_rgba(0,0,0,0.03)] z-50 rounded-b-[32px] sm:rounded-b-[32px]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center w-full gap-1 transition-all duration-300 ${
                activeTab === tab.id ? "text-[#6C2EB9] scale-110" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className={`text-[10px] font-semibold ${activeTab === tab.id ? "opacity-100" : "opacity-70"}`}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}