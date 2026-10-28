import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { StatSkeleton } from "../Components/Skeleton";
import { useToast } from "../context/ToastContext";
import { generateReportCardPDF } from "../utils/pdfGenerator";
import NoticeBanner from "../Components/NoticeBanner";
import CampusPulseCard from "../Components/CampusPulseCard";
import CertificateManagementCard from "../Components/CertificateManagementCard";
import QRScannerModule from "../Components/QRScannerModule";

export default function TeacherDashboard() {
  const { user } = useContext(AppContext);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleGenerateSampleReport = () => {
    generateReportCardPDF({
      tenant: {
        name: user?.institution_name || "Institutional Campus",
        code: user?.institution_code || "CAMPUS-01",
      },
      student: {
        name: user?.name || "Student Member",
        roll_number: user?.personal_code || "ENR-01",
        class: user?.class_name || "Academic Batch",
      },
      academicTerm: "Term Comprehensive Examination",
      attendanceRate: "100%",
    });
    showToast("Official Academic Transcript PDF generated successfully!", "success");
  };

  const [stats, setStats] = useState({
    classesCount: 0,
    studentsCount: 0,
    homeworkCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showScannerModal, setShowScannerModal] = useState(false);

  useEffect(() => {
    const fetchTeacherStats = async () => {
      setLoading(true);
      const schoolId = (user?.institution_code || user?.school_id || "CAMPUS-01").toUpperCase();
      try {
        // 1. Local directory check
        let localDir = [];
        try {
          const raw = localStorage.getItem(`erp_directory_${schoolId}`);
          if (raw) localDir = JSON.parse(raw);
        } catch (e) {}

        const localStudents = localDir.filter((m) => (m.role || "student").toLowerCase() === "student");
        const studentSet = new Set(localStudents.map((s) => s.roll_number || s.personal_code || s.id));

        // 2. Classes set
        const classSet = new Set();
        localStudents.forEach((s) => {
          if (s.class_name) classSet.add(s.class_name);
        });

        let dbHomeworkCount = 0;

        if (supabase) {
          try {
            const [studentsRes, hwRes] = await Promise.all([
              supabase.from("students").select("id, roll_number, class_name").eq("school_id", schoolId),
              supabase.from("homework").select("id", { count: "exact" }).eq("school_id", schoolId),
            ]);
            if (studentsRes.data) {
              studentsRes.data.forEach((s) => {
                if (s.roll_number || s.id) studentSet.add(s.roll_number || s.id);
                if (s.class_name) classSet.add(s.class_name);
              });
            }
            dbHomeworkCount = hwRes.count ?? hwRes.data?.length ?? 0;
          } catch (dbErr) {
            console.warn("Teacher stats query notice:", dbErr);
          }
        }

        setStats({
          classesCount: classSet.size,
          studentsCount: studentSet.size,
          homeworkCount: dbHomeworkCount,
        });
      } catch (err) {
        console.error("Error loading teacher stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherStats();
    window.addEventListener("erp-directory-updated", fetchTeacherStats);
    return () => window.removeEventListener("erp-directory-updated", fetchTeacherStats);
  }, [user?.institution_code, user?.school_id]);

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
      name: "Timed Online Exams",
      desc: "Author MCQ papers & view auto-scores",
      icon: "🎯",
      color: "from-purple-500/20 to-indigo-500/10 text-purple-400 border-purple-500/30",
      path: "/teacher/exams",
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
      name: "Staff Messenger",
      desc: "Direct 1-to-1 faculty & HOD coordination",
      icon: "💬",
      color: "from-blue-500/20 to-indigo-500/10 text-blue-400 border-blue-500/30",
      path: "/teacher/messages",
    },
    {
      name: "Academic Calendar",
      desc: "Campus schedule, terms & holidays",
      icon: "📅",
      color: "from-slate-500/20 to-gray-500/10 text-slate-300 border-slate-500/30",
      path: "/admin/calendar",
    },
    {
      name: "QR Gate & Library Scanner",
      desc: "Camera scan student ID cards for library issue / entry",
      icon: "📷",
      color: "from-cyan-500/20 to-teal-500/10 text-cyan-400 border-cyan-500/30",
      action: "openScanner",
    },
  ];

  return (
    <div className="relative text-slate-200 min-h-full pb-10 font-sans">
      <div className="fixed top-0 right-10 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* INSTITUTIONAL NOTICEBOARD CIRCULAR BANNER */}
        <NoticeBanner role="Teacher" schoolId={user?.school_id || user?.institution_code} />

        {/* HEADER */}
        <div className="bg-slate-900/40 backdrop-blur-2xl border border-slate-800/50 hover:border-cyan-500/30 transition-all duration-500 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] rounded-3xl p-8 shadow-2xl mb-8 flex justify-between items-center flex-wrap gap-4 animate-fade-in-up stagger-1">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                Faculty Portal
              </span>
              <span className="text-xs text-slate-400 font-bold">
                {user?.institution_code || user?.school_id || "Campus Portal"}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400">
              Welcome back, {user?.name || "Faculty Member"} 👋
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Manage student attendance, publish homework tasks, and monitor curriculum progress
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => navigate("/teacher/classes")}
              className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/40 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all flex items-center gap-2 shadow-lg cursor-pointer"
            >
              <span>🗓️</span> Weekly Master Timetable
            </button>
            <button
              onClick={() => setShowScannerModal(true)}
              className="bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/40 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all flex items-center gap-2 shadow-lg cursor-pointer"
            >
              <span>📷</span> Scan ID Card (QR)
            </button>
            <button
              onClick={handleGenerateSampleReport}
              className="bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/40 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all flex items-center gap-2 shadow-lg cursor-pointer"
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

        {/* DAILY CAMPUS PULSE RADAR */}
        <div className="mb-8">
          <CampusPulseCard schoolCode={user?.institution_code || user?.school_id || "CAMPUS-01"} />
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 animate-fade-in-up stagger-2">
          {loading ? (
            <>
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
            </>
          ) : (
            <>
              <div className="bg-slate-900/40 backdrop-blur-2xl border border-slate-800/50 hover:border-cyan-500/30 transition-all duration-500 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] rounded-3xl p-6 shadow-xl flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center justify-center text-2xl shadow-inner shrink-0">
                  🏫
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                      Active Batches
                    </p>
                  </div>
                  <p className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400 tracking-tight">
                    {stats.classesCount} Batches
                  </p>
                  <span className="text-[11px] text-slate-400 block mt-0.5">Assigned curriculum</span>
                </div>
              </div>

              <div className="bg-slate-900/40 backdrop-blur-2xl border border-slate-800/50 hover:border-purple-500/30 transition-all duration-500 hover:shadow-[0_0_30px_rgba(168,85,247,0.15)] rounded-3xl p-6 shadow-xl flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/30 flex items-center justify-center text-2xl shadow-inner shrink-0">
                  👥
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                    </span>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                      Enrolled Students
                    </p>
                  </div>
                  <p className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400 tracking-tight">
                    {stats.studentsCount} Students
                  </p>
                  <span className="text-[11px] text-slate-400 block mt-0.5">Total batch strength</span>
                </div>
              </div>

              <div className="bg-slate-900/40 backdrop-blur-2xl border border-slate-800/50 hover:border-amber-500/30 transition-all duration-500 hover:shadow-[0_0_30px_rgba(245,158,11,0.15)] rounded-3xl p-6 shadow-xl flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center text-2xl shadow-inner shrink-0">
                  ⏳
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                      Assignments
                    </p>
                  </div>
                  <p className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-400 tracking-tight">
                    {stats.homeworkCount} Tasks
                  </p>
                  <span className="text-[11px] text-slate-400 block mt-0.5">Active homework entries</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* QUICK ACTIONS */}
        <h2 className="text-xl font-bold text-white tracking-tight mb-6">Classroom & Academic Controls</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10 animate-fade-in-up stagger-3">
          {teacherActions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (action.action === "openScanner") {
                  setShowScannerModal(true);
                } else if (action.path) {
                  navigate(action.path);
                }
              }}
              className="group relative flex flex-col justify-between p-6 rounded-3xl bg-slate-900/40 backdrop-blur-2xl border border-slate-800/50 hover:border-cyan-500/40 hover:shadow-[0_0_25px_rgba(6,182,212,0.2)] hover:scale-[1.02] transition-all duration-300 w-full text-left cursor-pointer"
            >
              <div>
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-gradient-to-br ${action.color} border group-hover:scale-110 transition-transform shadow-inner mb-4`}
                >
                  {action.icon}
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                  {action.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1">{action.desc}</p>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-slate-400 group-hover:text-cyan-400 transition-colors">
                <span>Launch Tool</span>
                <span>→</span>
              </div>
            </button>
          ))}
        </div>

        {/* STUDENT CERTIFICATE REQUESTS APPROVAL WORKFLOW */}
        <CertificateManagementCard mode="teacher" />

        {/* QR SCANNER MODAL */}
        {showScannerModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="max-w-2xl w-full">
              <QRScannerModule
                schoolCode={user?.institution_code || user?.school_id || "CAMPUS-01"}
                mode="library"
                onClose={() => setShowScannerModal(false)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}