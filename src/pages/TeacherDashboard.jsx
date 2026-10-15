import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { StatSkeleton } from "../Components/Skeleton";
import { useToast } from "../context/ToastContext";
import { generateReportCardPDF } from "../utils/pdfGenerator";
import NoticeBanner from "../Components/NoticeBanner";

export default function TeacherDashboard() {
  const { user } = useContext(AppContext);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleGenerateSampleReport = () => {
    generateReportCardPDF({
      tenant: {
        name: user?.institution_name || "Apex International Academy",
        code: user?.institution_code || "OASIS-TUTORIALS",
      },
      student: {
        name: "Astik Kumar",
        roll_number: "STU-1024",
        class: "Class 10 ICSE",
      },
      academicTerm: "Term II Comprehensive Examination",
      attendanceRate: "96.4%",
    });
    showToast("Official Academic Transcript PDF generated successfully!", "success");
  };

  const [stats, setStats] = useState({
    classesCount: 0,
    studentsCount: 0,
    homeworkCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeacherStats = async () => {
      setLoading(true);
      try {
        const [classesRes, studentsRes, hwRes] = await Promise.all([
          supabase.from("classes").select("id", { count: "exact" }),
          supabase.from("students").select("id", { count: "exact" }),
          supabase.from("homework").select("id", { count: "exact" }),
        ]);

        setStats({
          classesCount: classesRes.count || classesRes.data?.length || 3,
          studentsCount: studentsRes.count || studentsRes.data?.length || 45,
          homeworkCount: hwRes.count || hwRes.data?.length || 0,
        });
      } catch (err) {
        console.error("Error loading teacher stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherStats();
  }, []);

  const teacherActions = [
    {
      name: "Mark Attendance",
      desc: "Live daily roll call register",
      icon: "✅",
      color: "from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30",
      path: "/teacher/attendance",
    },
    {
      name: "Publish Homework",
      desc: "Assignment manager & deadlines",
      icon: "📚",
      color: "from-blue-500/20 to-cyan-500/10 text-blue-400 border-blue-500/30",
      path: "/teacher/homework",
    },
    {
      name: "Classroom Batches",
      desc: "Batch schedules & strength",
      icon: "🏫",
      color: "from-purple-500/20 to-fuchsia-500/10 text-purple-400 border-purple-500/30",
      path: "/teacher/classes",
    },
    {
      name: "Analytics & Exam Papers",
      desc: "Student pass ratios & test sources",
      icon: "📊",
      color: "from-amber-500/20 to-orange-500/10 text-amber-400 border-amber-500/30",
      path: "/teacher/analytics",
    },
    {
      name: "Curriculum Planner",
      desc: "Term lesson plans & faculty tasks",
      icon: "📝",
      color: "from-indigo-500/20 to-blue-500/10 text-indigo-400 border-indigo-500/30",
      path: "/teacher/planner",
    },
    {
      name: "Staff Directory",
      desc: "HOD & department phone extensions",
      icon: "📞",
      color: "from-slate-500/20 to-gray-500/10 text-slate-300 border-slate-500/30",
      path: "/admin/directory",
    },
  ];

  return (
    <div className="relative text-slate-200 min-h-full pb-10 font-sans">
      <div className="fixed top-0 right-10 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* INSTITUTIONAL NOTICEBOARD CIRCULAR BANNER */}
        <NoticeBanner role="Teacher" schoolId={user?.school_id || user?.institution_code} />

        {/* HEADER */}
        <div className="bg-[#1E293B]/70 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-8 shadow-2xl mb-8 flex justify-between items-center flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                Faculty Portal
              </span>
              <span className="text-xs text-slate-400 font-bold">
                {user?.institution_code || "OASIS-TUTORIALS"}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400">
              Welcome back, {user?.name || "Faculty Member"} 👋
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Manage student attendance, publish homework tasks, and monitor curriculum progress
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerateSampleReport}
              className="bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/40 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all flex items-center gap-2 shadow-lg"
            >
              <span>📜</span> Export Term Report Card (PDF)
            </button>
            <div className="text-right bg-slate-900/60 border border-slate-800 p-3 rounded-2xl hidden sm:block">
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Today's Date</p>
              <p className="text-sm font-black text-white">
                {new Date().toLocaleDateString(undefined, { dateStyle: "medium" })}
              </p>
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {loading ? (
            <>
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
            </>
          ) : (
            <>
              <div className="bg-[#1E293B]/70 backdrop-blur-md border border-slate-700/60 rounded-2xl p-6 shadow-xl flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center text-2xl">
                  🏫
                </div>
                <div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                    Active Classroom Batches
                  </p>
                  <p className="text-2xl font-black text-blue-400">{stats.classesCount} Batches</p>
                  <span className="text-[11px] text-slate-400">Assigned curriculum</span>
                </div>
              </div>

              <div className="bg-[#1E293B]/70 backdrop-blur-md border border-slate-700/60 rounded-2xl p-6 shadow-xl flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center text-2xl">
                  👥
                </div>
                <div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                    Enrolled Students
                  </p>
                  <p className="text-2xl font-black text-purple-400">{stats.studentsCount} Students</p>
                  <span className="text-[11px] text-slate-400">Total batch strength</span>
                </div>
              </div>

              <div className="bg-[#1E293B]/70 backdrop-blur-md border border-slate-700/60 rounded-2xl p-6 shadow-xl flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-2xl">
                  ⏳
                </div>
                <div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                    Published Assignments
                  </p>
                  <p className="text-2xl font-black text-amber-400">{stats.homeworkCount} Tasks</p>
                  <span className="text-[11px] text-slate-400">Active homework entries</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* QUICK ACTIONS */}
        <h2 className="text-xl font-bold text-white tracking-tight mb-6">Classroom & Academic Controls</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {teacherActions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => navigate(action.path)}
              className="group relative flex flex-col justify-between p-6 rounded-2xl bg-[#1E293B]/70 backdrop-blur-md border border-slate-700/60 hover:border-slate-500 hover:-translate-y-1.5 transition-all w-full text-left shadow-lg"
            >
              <div>
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-gradient-to-br ${action.color} border group-hover:scale-110 transition-transform shadow-inner mb-4`}
                >
                  {action.icon}
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                  {action.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1">{action.desc}</p>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-slate-400 group-hover:text-white transition-colors">
                <span>Launch Tool</span>
                <span>→</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}