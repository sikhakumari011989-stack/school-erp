import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { supabase } from "../supabaseClient";
import { StatSkeleton } from "../Components/Skeleton";
import NoticeBanner from "../Components/NoticeBanner";

export default function StudentDashboard() {
  const { user } = useContext(AppContext);
  const navigate = useNavigate();

  const [metrics, setMetrics] = useState({
    attendanceRate: "0%",
    totalClassesCount: 0,
    pendingHomework: 0,
    feeStatus: "Up to date",
    grade: "Pending Evaluation",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLiveStudentData = async () => {
      setLoading(true);
      const schoolId = (user?.institution_code || user?.school_id || "CAMPUS-01").toUpperCase();
      try {
        const [attRes, hwRes, feeRes] = await Promise.all([
          supabase.from("attendance").select("records").eq("school_id", schoolId).limit(10),
          supabase.from("homework").select("id", { count: "exact" }).eq("school_id", schoolId),
          supabase.from("fee_ledger").select("status, amount, student_name").eq("school_id", schoolId),
        ]);

        // Calculate attendance
        let totalClasses = 0;
        let attended = 0;
        if (attRes.data && attRes.data.length > 0) {
          attRes.data.forEach((day) => {
            const list = day.records || [];
            if (list.length > 0) {
              totalClasses += 1;
              const myStatus = list[0]?.status;
              if (myStatus === "present" || !myStatus) attended += 1;
            }
          });
        }
        const rate = totalClasses > 0 ? `${Math.round((attended / totalClasses) * 100)}%` : "0%";

        // Pending homework
        const hwCount = hwRes.count ?? hwRes.data?.length ?? 0;

        // Pending fees
        let hasPending = feeRes.data?.some((f) => (f.status || "").toLowerCase() === "pending");
        try {
          const tenantFeeRaw = localStorage.getItem(`erp_fee_ledger_${schoolId}`);
          if (tenantFeeRaw) {
            const tenantFees = JSON.parse(tenantFeeRaw);
            if (tenantFees.some((f) => (f.status || "").toLowerCase() === "pending")) {
              hasPending = true;
            }
          }
        } catch (e) {}

        setMetrics({
          attendanceRate: rate,
          totalClassesCount: totalClasses,
          pendingHomework: hwCount,
          feeStatus: hasPending ? "Dues Pending" : "Up to date",
          grade: "Pending Evaluation",
        });
      } catch (err) {
        console.error("Error fetching student dashboard stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLiveStudentData();
    window.addEventListener("erp-attendance-updated", fetchLiveStudentData);
    window.addEventListener("erp-fee-ledger-updated", fetchLiveStudentData);
    return () => {
      window.removeEventListener("erp-attendance-updated", fetchLiveStudentData);
      window.removeEventListener("erp-fee-ledger-updated", fetchLiveStudentData);
    };
  }, [user?.institution_code, user?.school_id]);

  const studentActions = [
    {
      name: "My Homework",
      desc: "Live faculty assignments & deadlines",
      icon: "📝",
      color: "from-blue-500/20 to-cyan-500/10 text-blue-400 border-blue-500/30",
      path: "/student/homework",
    },
    {
      name: "Pay Dues (Razorpay)",
      desc: "Instant encrypted fee settlement",
      icon: "⚡",
      color: "from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30",
      path: "/student/pay",
    },
    {
      name: "Fee Ledger & Vault",
      desc: "Receipt history & report cards",
      icon: "💳",
      color: "from-purple-500/20 to-fuchsia-500/10 text-purple-400 border-purple-500/30",
      path: "/student/fees",
    },
    {
      name: "LMS & Quizzes",
      desc: "Interactive study notes & test series",
      icon: "📖",
      color: "from-amber-500/20 to-orange-500/10 text-amber-400 border-amber-500/30",
      path: "/student/lms",
    },
    {
      name: "Certificates",
      desc: "Digital merit seals & sports badges",
      icon: "📜",
      color: "from-rose-500/20 to-pink-500/10 text-rose-400 border-rose-500/30",
      path: "/student/certificates",
    },
    {
      name: "Campus Calendar",
      desc: "Institutional timetable & term exams",
      icon: "📅",
      color: "from-indigo-500/20 to-blue-500/10 text-indigo-400 border-indigo-500/30",
      path: "/student/calendar",
    },
    {
      name: "Campus Gallery",
      desc: "Events, seminars & lab moments",
      icon: "📸",
      color: "from-cyan-500/20 to-teal-500/10 text-cyan-400 border-cyan-500/30",
      path: "/student/gallery",
    },
    {
      name: "Campus Bus Routes & Schedule",
      desc: "Daily bus timings, stops & driver contact",
      icon: "🚌",
      color: "from-emerald-500/20 to-green-500/10 text-emerald-400 border-emerald-500/30",
      path: "/student/transport",
    },
  ];

  return (
    <div className="relative text-slate-200 min-h-full pb-10 font-sans">
      <div className="fixed top-0 left-10 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* INSTITUTIONAL NOTICEBOARD CIRCULAR BANNER */}
        <NoticeBanner role="Student" schoolId={user?.school_id || user?.institution_code} />

        {/* WELCOME BANNER */}
        <div className="bg-[#1E293B]/70 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-8 shadow-2xl mb-8 flex justify-between items-center flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                Student Portal
              </span>
              <span className="text-xs text-slate-400 font-bold">
                {user?.institution_code || user?.school_id || "Campus Portal"}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400">
              Welcome Back, {user?.name || user?.full_name || "Student"} 🎓
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Track your daily classroom attendance, assigned homework, and Razorpay fee receipts
            </p>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center gap-4 flex-wrap">
            <div>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Personal ID / Roll No</p>
              <p className="text-sm font-mono font-black text-emerald-400">
                {user?.role_code || user?.roll_number || user?.personal_code || "STU-101"}
              </p>
            </div>
            <div className="border-l border-slate-800 pl-4">
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Classroom Batch</p>
              <p className="text-sm font-black text-white">{user?.class_name || user?.class || "General Batch"}</p>
            </div>
            {user?.guardian_name && (
              <div className="border-l border-slate-800 pl-4 hidden sm:block">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Guardian</p>
                <p className="text-xs font-semibold text-slate-300">{user.guardian_name}</p>
              </div>
            )}
          </div>
        </div>

        {/* PERFORMANCE STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-10">
          {loading ? (
            <>
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
            </>
          ) : (
            <>
              <div className="bg-[#1E293B]/70 backdrop-blur-md border border-slate-700/60 rounded-2xl p-6 shadow-xl flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-2xl">
                  📅
                </div>
                <div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-0.5">
                    Live Attendance
                  </p>
                  <p className="text-2xl font-black text-emerald-400">{metrics.attendanceRate}</p>
                  <span className="text-[10px] text-slate-400">
                    {metrics.totalClassesCount > 0 ? "Synced with roll call" : "No records logged yet"}
                  </span>
                </div>
              </div>

              <div className="bg-[#1E293B]/70 backdrop-blur-md border border-slate-700/60 rounded-2xl p-6 shadow-xl flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-2xl">
                  📚
                </div>
                <div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-0.5">
                    Homework Tasks
                  </p>
                  <p className="text-2xl font-black text-amber-400">{metrics.pendingHomework} Active</p>
                  <span className="text-[10px] text-slate-400">Published by faculty</span>
                </div>
              </div>

              <div className="bg-[#1E293B]/70 backdrop-blur-md border border-slate-700/60 rounded-2xl p-6 shadow-xl flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center text-2xl">
                  💳
                </div>
                <div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-0.5">
                    Tuition Fees
                  </p>
                  <p className="text-lg font-black text-blue-400">{metrics.feeStatus}</p>
                  <span className="text-[10px] text-slate-400">Razorpay integrated</span>
                </div>
              </div>

              <div className="bg-[#1E293B]/70 backdrop-blur-md border border-slate-700/60 rounded-2xl p-6 shadow-xl flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center text-2xl">
                  🏆
                </div>
                <div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-0.5">
                    Academic Evaluation
                  </p>
                  <p className="text-base font-black text-purple-400">{metrics.grade}</p>
                  <span className="text-[10px] text-slate-400">Awaiting term assessment</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* STUDENT ACTIONS */}
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white tracking-tight">Academic Quick Actions</h2>
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
            All Modules Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {studentActions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => navigate(action.path)}
              className="group relative flex flex-col justify-between p-5 rounded-2xl bg-[#1E293B]/70 backdrop-blur-md border border-slate-700/60 hover:border-slate-500/80 hover:-translate-y-1.5 transition-all text-left shadow-lg"
            >
              <div>
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-gradient-to-br ${action.color} border mb-4 group-hover:scale-110 transition-transform shadow-inner`}
                >
                  {action.icon}
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-blue-300 transition-colors">
                  {action.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {action.desc}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-slate-400 group-hover:text-white transition-colors">
                <span>Access Module</span>
                <span>→</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}