import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { StatSkeleton } from "../Components/Skeleton";
import { useToast } from "../context/ToastContext";
import { generateReportCardPDF } from "../utils/pdfGenerator";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import NoticeBanner from "../Components/NoticeBanner";
import CampusPulseCard from "../Components/CampusPulseCard";
import CertificateManagementCard from "../Components/CertificateManagementCard";
import QRScannerModule from "../Components/QRScannerModule";
import SchoolCalendar from "../Components/SchoolCalendar";
import ClassTestEntry from "../Components/ClassTestEntry";
import { getClassTestsForTeacher } from "../utils/classTestMarksService";

export default function TeacherDashboard() {
  const { user } = useContext(AppContext);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    classesCount: 0,
    studentsCount: 0,
    homeworkCount: 0,
    testsCreated: 0,
    testsAwaitingMarks: 0,
    testsPublished: 0,
  });
  const [classAttendanceTrend, setClassAttendanceTrend] = useState([]);
  const [examPerformanceData, setExamPerformanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);

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

        // Fetch real class tests for teacher
        let teacherTests = [];
        try {
          teacherTests = await getClassTestsForTeacher({ schoolId, actor: user });
        } catch {}

        const createdCount = teacherTests.length;
        const awaitingCount = teacherTests.filter((t) => t.status !== "published").length;
        const publishedCount = teacherTests.filter((t) => t.status === "published").length;

        setStats({
          classesCount: classSet.size,
          studentsCount: studentSet.size,
          homeworkCount: dbHomeworkCount,
          testsCreated: createdCount,
          testsAwaitingMarks: awaitingCount,
          testsPublished: publishedCount,
        });

        // 1. Fetch Class Attendance Trend
        let attPoints = [];
        try {
          const rawAtt = localStorage.getItem(`erp_attendance_${schoolId}`);
          if (rawAtt) {
            const parsed = JSON.parse(rawAtt);
            const byDate = {};
            parsed.forEach((item) => {
              const d = item.date || item.created_at?.split("T")[0] || "Recent";
              if (!byDate[d]) byDate[d] = { date: d, present: 0, total: 0 };
              byDate[d].total += 1;
              if (String(item.status).toLowerCase() === "present") byDate[d].present += 1;
            });
            attPoints = Object.values(byDate)
              .slice(-7)
              .map((b) => ({
                date: b.date.length > 5 ? b.date.slice(5) : b.date,
                rate: b.total > 0 ? Math.round((b.present / b.total) * 100) : 0,
              }));
          }
        } catch {}
        setClassAttendanceTrend(attPoints);

        // 2. Fetch Examination Performance & Subject Marks from real tests
        const examPoints = teacherTests.slice(-6).map((t) => ({
          testName: t.title || t.subject || "Test",
          classAvg: t.highest_score !== null && t.max_score ? Math.round((Number(t.highest_score) / Number(t.max_score)) * 100) : 0,
        }));
        setExamPerformanceData(examPoints);
      } catch (err) {
        console.error("Error loading teacher stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherStats();
    window.addEventListener("erp-directory-updated", fetchTeacherStats);
    window.addEventListener("erp-tests-updated", fetchTeacherStats);
    return () => {
      window.removeEventListener("erp-directory-updated", fetchTeacherStats);
      window.removeEventListener("erp-tests-updated", fetchTeacherStats);
    };
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
      name: "Class Tests & Marks",
      desc: "Rapid grading grid & publish test scores",
      icon: "📝",
      color: "from-cyan-500/20 to-blue-500/10 text-cyan-400 border-cyan-500/30",
      action: "openTestEntry",
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
              onClick={() => setShowTestModal(true)}
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border border-cyan-400/30 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer"
            >
              <span>📝</span> Record Class Test Marks
            </button>
            <button
              onClick={() => navigate("/teacher/classes")}
              className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/40 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all flex items-center gap-2 shadow-lg cursor-pointer"
            >
              <span>🗓️</span> Weekly Timetable
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
              <span>📜</span> Report Card (PDF)
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-10 animate-fade-in-up stagger-2">
          {loading ? (
            <>
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
            </>
          ) : (
            <>
              <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800/50 hover:border-cyan-400 dark:hover:border-cyan-500/30 transition-all duration-300 hover:-translate-y-0.5 rounded-3xl p-5 shadow-sm dark:shadow-xl flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30 flex items-center justify-center text-xl shadow-inner shrink-0">
                  🏫
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    Batches
                  </p>
                  <p className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 tracking-tight">
                    {stats.classesCount}
                  </p>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">Assigned classes</span>
                </div>
              </div>

              <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800/50 hover:border-purple-400 dark:hover:border-purple-500/30 transition-all duration-300 hover:-translate-y-0.5 rounded-3xl p-5 shadow-sm dark:shadow-xl flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 border border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/30 flex items-center justify-center text-xl shadow-inner shrink-0">
                  👥
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    Students
                  </p>
                  <p className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 tracking-tight">
                    {stats.studentsCount}
                  </p>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">Enrolled scholars</span>
                </div>
              </div>

              <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800/50 hover:border-amber-400 dark:hover:border-amber-500/30 transition-all duration-300 hover:-translate-y-0.5 rounded-3xl p-5 shadow-sm dark:shadow-xl flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30 flex items-center justify-center text-xl shadow-inner shrink-0">
                  ⏳
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    Homework
                  </p>
                  <p className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-400 tracking-tight">
                    {stats.homeworkCount}
                  </p>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">Active tasks</span>
                </div>
              </div>

              <div
                onClick={() => setShowTestModal(true)}
                className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800/50 hover:border-cyan-400 dark:hover:border-cyan-500/40 transition-all duration-300 hover:-translate-y-0.5 rounded-3xl p-5 shadow-sm dark:shadow-xl flex items-center gap-3 cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 border border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/30 flex items-center justify-center text-xl shadow-inner shrink-0">
                  📝
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    Tests Created
                  </p>
                  <p className="text-xl font-black text-cyan-600 dark:text-cyan-400 tracking-tight">
                    {stats.testsCreated}
                  </p>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">Unit assessments</span>
                </div>
              </div>

              <div
                onClick={() => setShowTestModal(true)}
                className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800/50 hover:border-amber-400 dark:hover:border-amber-500/40 transition-all duration-300 hover:-translate-y-0.5 rounded-3xl p-5 shadow-sm dark:shadow-xl flex items-center gap-3 cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30 flex items-center justify-center text-xl shadow-inner shrink-0">
                  📋
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    Awaiting Marks
                  </p>
                  <p className="text-xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
                    {stats.testsAwaitingMarks}
                  </p>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">Draft tests</span>
                </div>
              </div>

              <div
                onClick={() => setShowTestModal(true)}
                className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800/50 hover:border-emerald-400 dark:hover:border-emerald-500/40 transition-all duration-300 hover:-translate-y-0.5 rounded-3xl p-5 shadow-sm dark:shadow-xl flex items-center gap-3 cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30 flex items-center justify-center text-xl shadow-inner shrink-0">
                  ✅
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    Published
                  </p>
                  <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                    {stats.testsPublished}
                  </p>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">Results visible</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* TEACHER DATA VISUALIZATIONS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10 animate-fade-in-up stagger-3">
          {/* CHART 1: ATTENDANCE TREND */}
          <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800/50 hover:border-cyan-400 dark:hover:border-cyan-500/30 transition-all duration-300 hover:-translate-y-0.5 rounded-3xl p-6 shadow-sm dark:shadow-2xl">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-500/10 dark:border-cyan-400/30 dark:text-cyan-300 text-[10px] font-bold uppercase tracking-wider mb-1">
                  <span>📅</span> Roll Call Telemetry
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">Class Attendance Pacing</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Daily class attendance percentage across the last 7 sessions</p>
              </div>
            </div>

            {classAttendanceTrend.length === 0 ? (
              <div className="h-56 flex flex-col items-center justify-center text-center text-slate-500 dark:text-slate-400 p-6 space-y-2 bg-slate-50/50 dark:bg-tech-grid rounded-2xl">
                <span className="text-2xl opacity-60">📅</span>
                <p className="text-xs font-bold text-slate-900 dark:text-white">No Roll Call Submitted Yet</p>
                <p className="text-[11px] text-slate-500 max-w-xs">Mark attendance for assigned batches to view attendance trends.</p>
              </div>
            ) : (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={classAttendanceTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                    <XAxis dataKey="date" stroke="#94A3B8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0F172A",
                        borderColor: "rgba(255,255,255,0.15)",
                        borderRadius: "1rem",
                        fontSize: "12px",
                        color: "#FFFFFF",
                      }}
                      formatter={(v) => [`${v}% Attendance`, "Rate"]}
                    />
                    <Line type="monotone" dataKey="rate" stroke="#06B6D4" strokeWidth={3} dot={{ r: 4, fill: "#06B6D4" }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* CHART 2: RECENT CLASS TEST PERFORMANCE */}
          <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800/50 hover:border-purple-400 dark:hover:border-purple-500/30 transition-all duration-300 hover:-translate-y-0.5 rounded-3xl p-6 shadow-sm dark:shadow-2xl">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/10 dark:border-purple-500/30 dark:text-purple-300 text-[10px] font-bold uppercase tracking-wider mb-1">
                  <span>📝</span> Evaluation Marks
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">Class Examination Performance</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Average score percentage across recent tests</p>
              </div>
            </div>

            {examPerformanceData.length === 0 ? (
              <div className="h-56 flex flex-col items-center justify-center text-center text-slate-500 dark:text-slate-400 p-6 space-y-2 bg-slate-50/50 dark:bg-tech-grid rounded-2xl">
                <span className="text-2xl opacity-60">📝</span>
                <p className="text-xs font-bold text-slate-900 dark:text-white">No Test Records Logged</p>
                <p className="text-[11px] text-slate-500 max-w-xs">Record class tests to monitor score averages across terms.</p>
              </div>
            ) : (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={examPerformanceData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                    <XAxis dataKey="testName" stroke="#94A3B8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0F172A",
                        borderColor: "rgba(255,255,255,0.15)",
                        borderRadius: "1rem",
                        fontSize: "12px",
                        color: "#FFFFFF",
                      }}
                      formatter={(v) => [`${v}% Average`, "Score"]}
                    />
                    <Bar dataKey="classAvg" name="Average %" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-6">Classroom & Academic Controls</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10 animate-fade-in-up stagger-3">
          {teacherActions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (action.action === "openScanner") {
                  setShowScannerModal(true);
                } else if (action.action === "openTestEntry") {
                  setShowTestModal(true);
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

        {/* INTERACTIVE ACADEMIC CALENDAR & ATTENDANCE ALERTS */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></span>
            <h2 className="text-xl font-bold text-white tracking-tight">Faculty Academic Calendar & Attendance Alerts</h2>
          </div>
          <SchoolCalendar viewMode="teacher" assignedClass={user?.class_name || "Class 10-A"} />
        </div>

        {/* STUDENT CERTIFICATE REQUESTS APPROVAL WORKFLOW */}
        <CertificateManagementCard mode="teacher" />

        {/* RAPID-ENTRY CLASS TEST EVALUATION MODAL */}
        <ClassTestEntry
          isOpen={showTestModal}
          onClose={() => setShowTestModal(false)}
        />

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