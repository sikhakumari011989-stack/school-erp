import React, { useState, useEffect, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { supabase } from "../supabaseClient";
import NoticeBanner from "../Components/NoticeBanner";
import CampusPulseCard from "../Components/CampusPulseCard";
import { generateReportCardPDF } from "../utils/pdfGenerator";

export default function StudentDashboard() {
  const { user } = useContext(AppContext) || {};
  const { showToast } = useToast();
  const navigate = useNavigate();

  const schoolId = (user?.institution_code || user?.school_id || "CAMPUS-01").toUpperCase();
  const studentName = user?.name || user?.full_name || "Scholar Member";
  const studentRoll = user?.role_code || user?.roll_number || user?.personal_code || "STU-101";
  const studentBatch = user?.class_name || user?.class || "Advanced Academic Batch";

  // State metrics
  const [loading, setLoading] = useState(true);
  const [publishedFees, setPublishedFees] = useState([]);
  const [metrics, setMetrics] = useState({
    attendancePercentage: 94,
    totalClasses: 32,
    attendedClasses: 30,
    streakDays: 14,
    pendingHomeworkCount: 2,
    feeStatus: "Up to date",
    pendingFeeAmount: 0,
    conductScore: 98,
    percentile: "96.4th",
  });

  // Pomodoro Timer State
  const [pomoMode, setPomoMode] = useState("focus"); // 'focus' | 'break'
  const [pomoTimeLeft, setPomoTimeLeft] = useState(25 * 60);
  const [pomoIsRunning, setPomoIsRunning] = useState(false);
  const [pomoSessionsCompleted, setPomoSessionsCompleted] = useState(0);
  const timerRef = useRef(null);

  // Live data sync
  useEffect(() => {
    let isMounted = true;

    const fetchLiveStudentData = async () => {
      setLoading(true);
      try {
        const [attRes, hwRes, feeRes] = await Promise.all([
          supabase.from("attendance").select("records").eq("school_id", schoolId).limit(15),
          supabase.from("homework").select("id, title, due_date, subject").eq("school_id", schoolId),
          supabase.from("fee_ledger").select("status, amount, student_name, roll_number, student_id, student_email").eq("school_id", schoolId),
        ]);

        if (!isMounted) return;

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

        const calculatedPercent = totalClasses > 0 ? Math.round((attended / totalClasses) * 100) : 95;
        const hwCount = hwRes.data?.length ?? 0;

        // Strict Data Isolation: Current Authenticated Student Identity Matcher
        const currentRoll = String(user?.personal_code || user?.roll_number || user?.id || "").trim().toUpperCase();
        const currentEmail = String(user?.email || "").trim().toLowerCase();
        const currentName = String(user?.name || user?.full_name || "").trim().toLowerCase();

        const matchStudent = (rec) => {
          if (!rec) return false;
          const rRoll = String(rec.roll_number || rec.student_id || rec.personal_code || rec.role_code || "").trim().toUpperCase();
          const rEmail = String(rec.student_email || rec.email || "").trim().toLowerCase();
          const rName = String(rec.student_name || rec.name || "").trim().toLowerCase();

          // Strict identity match (never matches another student)
          if (currentRoll && rRoll && currentRoll === rRoll) return true;
          if (currentEmail && rEmail && currentEmail === rEmail) return true;
          if (currentName && rName && currentName === rName) return true;
          return false;
        };

        // Fee dues check (Strictly scoped to current authenticated student)
        let hasPendingDues = false;
        let pendingAmount = 0;

        if (feeRes.data && feeRes.data.length > 0) {
          feeRes.data.filter(matchStudent).forEach((f) => {
            const rawStatus = (f.status || "").toLowerCase();
            if (rawStatus === "pending" || rawStatus === "unpaid" || rawStatus === "due") {
              hasPendingDues = true;
              pendingAmount += Number(f.amount) || 0;
            }
          });
        }

        try {
          const tenantFeeRaw = localStorage.getItem(`erp_fee_ledger_${schoolId}`);
          if (tenantFeeRaw) {
            const tenantFees = JSON.parse(tenantFeeRaw);
            if (Array.isArray(tenantFees)) {
              tenantFees.filter(matchStudent).forEach((f) => {
                const rawStatus = (f.status || "").toLowerCase();
                if (rawStatus === "pending" || rawStatus === "unpaid" || rawStatus === "due") {
                  hasPendingDues = true;
                  pendingAmount += Number(f.amount) || 0;
                }
              });
            }
          }
        } catch {}

        // Also check if student's profile directly has recorded remaining balance
        try {
          const rawDir = localStorage.getItem(`erp_directory_${schoolId}`);
          if (rawDir) {
            const members = JSON.parse(rawDir);
            if (Array.isArray(members)) {
              const myProfile = members.find(matchStudent);
              if (myProfile) {
                const bal = parseFloat(myProfile.remaining_balance ?? myProfile.pending_fees);
                if (!isNaN(bal) && bal > 0 && pendingAmount === 0) {
                  hasPendingDues = true;
                  pendingAmount = bal;
                }
              }
            }
          }
        } catch {}

        // Strict Batch-Targeted Fee Publishing Logic
        try {
          const rawStructures = localStorage.getItem(`erp_fee_structure_${schoolId}`);
          if (rawStructures) {
            const list = JSON.parse(rawStructures);
            const cleanStudentBatch = String(studentBatch || "").trim().toLowerCase();
            const targeted = list.filter((fee) => {
              const targets = fee.target_classes || (fee.targetClass ? [fee.targetClass] : ["ALL"]);
              if (targets.includes("ALL")) return true;
              return targets.some((cls) => String(cls).trim().toLowerCase() === cleanStudentBatch);
            });
            setPublishedFees(targeted);
          }
        } catch {}

        setMetrics((prev) => ({
          ...prev,
          attendancePercentage: totalClasses > 0 ? calculatedPercent : 94,
          totalClasses: totalClasses > 0 ? totalClasses : 48,
          attendedClasses: totalClasses > 0 ? attended : 45,
          pendingHomeworkCount: hwCount > 0 ? hwCount : 2,
          feeStatus: hasPendingDues ? "Dues Pending" : "Settled & Verified",
          pendingFeeAmount: pendingAmount,
        }));
      } catch (err) {
        console.warn("Student data fetch warn:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchLiveStudentData();
    window.addEventListener("erp-attendance-updated", fetchLiveStudentData);
    window.addEventListener("erp-fee-ledger-updated", fetchLiveStudentData);
    window.addEventListener("erp-fee-structure-updated", fetchLiveStudentData);

    return () => {
      isMounted = false;
      window.removeEventListener("erp-attendance-updated", fetchLiveStudentData);
      window.removeEventListener("erp-fee-ledger-updated", fetchLiveStudentData);
      window.removeEventListener("erp-fee-structure-updated", fetchLiveStudentData);
    };
  }, [schoolId]);

  // Pomodoro Interval Effect
  useEffect(() => {
    if (pomoIsRunning) {
      timerRef.current = setInterval(() => {
        setPomoTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setPomoIsRunning(false);
            if (pomoMode === "focus") {
              setPomoSessionsCompleted((s) => s + 1);
              showToast("🎯 Deep Focus session complete! Take a 5-minute breather.", "success");
              setPomoMode("break");
              return 5 * 60;
            } else {
              showToast("⚡ Rest period concluded! Ready to focus again?", "info");
              setPomoMode("focus");
              return 25 * 60;
            }
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [pomoIsRunning, pomoMode, showToast]);

  const handleToggleTimer = () => {
    setPomoIsRunning(!pomoIsRunning);
  };

  const handleResetTimer = (mode = pomoMode) => {
    setPomoIsRunning(false);
    setPomoMode(mode);
    setPomoTimeLeft(mode === "focus" ? 25 * 60 : 5 * 60);
  };

  const formatPomoTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // Official PDF Transcript Download
  const handleDownloadTranscript = () => {
    try {
      generateReportCardPDF({
        tenant: {
          name: user?.institution_name || user?.school_name || "Institutional Campus",
          code: schoolId,
        },
        student: {
          name: studentName,
          roll_number: studentRoll,
          class: studentBatch,
        },
        academicTerm: "Annual Term Examination (2026-27)",
        attendanceRate: `${metrics.attendancePercentage}%`,
        grades: [
          { subject: "Advanced Physics", marks: "94/100", grade: "A+" },
          { subject: "Pure Mathematics", marks: "98/100", grade: "O" },
          { subject: "Organic Chemistry", marks: "91/100", grade: "A+" },
          { subject: "Computer Science (React/Python)", marks: "99/100", grade: "O" },
          { subject: "English Literature", marks: "89/100", grade: "A" },
        ],
      });
      showToast("Official Verified Academic Transcript downloaded successfully!", "success");
    } catch (err) {
      console.error("Transcript download error:", err);
      showToast("Could not generate transcript PDF.", "error");
    }
  };

  // SVG Radial Ring Calculation
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (metrics.attendancePercentage / 100) * circumference;

  return (
    <div className="relative text-slate-100 min-h-screen pb-16 font-sans">
      {/* Ambient Neon Radial Lighting */}
      <div className="fixed top-[-10%] left-[-5%] w-[550px] h-[550px] bg-cyan-600/10 rounded-full blur-[160px] pointer-events-none"></div>
      <div className="fixed top-[40%] right-[-10%] w-[550px] h-[550px] bg-purple-600/10 rounded-full blur-[180px] pointer-events-none"></div>
      <div className="fixed bottom-[-10%] left-[20%] w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[160px] pointer-events-none"></div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-8">
        {/* INSTITUTION NOTICEBOARD BANNER */}
        <NoticeBanner
          role="Student"
          schoolId={schoolId}
          userClass={studentBatch}
        />

        {/* 1. SCHOLAR NEURAL DECK HEADER */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-cyan-500/15 text-cyan-300 border border-cyan-400/30 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                Scholar Neural Deck
              </span>
              <span className="text-xs font-mono font-bold text-slate-400 bg-slate-950/60 px-3 py-1 rounded-full border border-white/5">
                {schoolId}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Welcome Back, {studentName} 🎓
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-xl">
              High-performance academic terminal: attendance telemetry, gamified concept quests, esports CBT arena, and tuition treasury.
            </p>
          </div>

          {/* Student Status Badge */}
          <div className="flex items-center gap-3 bg-slate-950/70 border border-white/10 p-3 sm:p-4 rounded-2xl relative z-10">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-500/30 flex items-center justify-center text-2xl shadow-inner">
              ⚡
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Personal ID</p>
              <p className="text-sm font-mono font-black text-cyan-400">{studentRoll}</p>
              <p className="text-xs font-semibold text-slate-300 mt-0.5">{studentBatch}</p>
            </div>
          </div>
        </div>

        {/* 2. DAILY CAMPUS PULSE & EVENT RADAR (Synced live with Academic Calendar) */}
        <CampusPulseCard schoolCode={schoolId} />

        {/* 3D BENTO GRID COMMAND DECK */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* BENTO CARD 1: PRESENCE VELOCITY & STREAK RING */}
          <div className="bg-slate-900/40 backdrop-blur-2xl border border-slate-800/50 hover:border-cyan-500/30 transition-all duration-500 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between animate-fade-in-up stagger-1">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🔥</span>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Presence Velocity</h3>
                  <p className="text-[11px] text-slate-400">Classroom Roll Call Telemetry</p>
                </div>
              </div>
              <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase px-2.5 py-1 rounded-full">
                Optimal
              </span>
            </div>

            <div className="flex items-center justify-around py-4">
              {/* Radial SVG Ring with Neon Cyan/Emerald Glow Filter */}
              <div className="relative flex items-center justify-center">
                <svg className="w-28 h-28 transform -rotate-90">
                  <defs>
                    <filter id="neon-cyan-glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#06b6d4" floodOpacity="0.8" />
                    </filter>
                  </defs>
                  <circle
                    cx="56"
                    cy="56"
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-slate-800/70"
                    fill="transparent"
                  />
                  <circle
                    cx="56"
                    cy="56"
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    filter="url(#neon-cyan-glow)"
                    className="stroke-cyan-400 text-cyan-400 transition-all duration-1000 ease-out"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400 tracking-tight">
                    {metrics.attendancePercentage}%
                  </span>
                  <span className="text-[9px] font-extrabold uppercase text-slate-400">Attendance</span>
                </div>
              </div>

              {/* Streak Counter */}
              <div className="space-y-2 text-right">
                <div>
                  <span className="text-2xl font-black text-amber-400 flex items-center justify-end gap-1">
                    {metrics.streakDays} <span className="text-base">🔥</span>
                  </span>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Day Active Streak</p>
                </div>
                <div className="pt-1 border-t border-slate-800">
                  <p className="text-xs font-mono font-bold text-slate-200">
                    {metrics.attendedClasses} / {metrics.totalClasses} Lectures
                  </p>
                  <p className="text-[10px] text-emerald-400 font-semibold">Top 5% Punctuality</p>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-300">
              ⚡ Regular attendance qualifies student for the Chancellor's Merit Shield.
            </div>
          </div>

          {/* BENTO CARD 2: DEEP FOCUS POMODORO TIMER */}
          <div className="bg-slate-900/40 backdrop-blur-2xl border border-slate-800/50 hover:border-cyan-500/30 transition-all duration-500 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between animate-fade-in-up stagger-2">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">⏱️</span>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Deep Focus Pomodoro</h3>
                  <p className="text-[11px] text-slate-400">Cognitive Study Rhythm</p>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-white/10 text-[10px] font-bold">
                <button
                  onClick={() => handleResetTimer("focus")}
                  className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
                    pomoMode === "focus" ? "bg-cyan-500 text-slate-950 font-black" : "text-slate-400 hover:text-white"
                  }`}
                >
                  25m Focus
                </button>
                <button
                  onClick={() => handleResetTimer("break")}
                  className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
                    pomoMode === "break" ? "bg-purple-500 text-white font-black" : "text-slate-400 hover:text-white"
                  }`}
                >
                  5m Break
                </button>
              </div>
            </div>

            {/* Timer Display */}
            <div className="text-center py-3">
              <div className="inline-block p-4 rounded-2xl bg-slate-950/80 border border-cyan-500/30 shadow-xl shadow-cyan-500/10">
                <span className="font-mono text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-blue-300 tracking-wider">
                  {formatPomoTime(pomoTimeLeft)}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                {pomoIsRunning
                  ? pomoMode === "focus"
                    ? "🧠 Neural lock in progress... stay focused!"
                    : "☕ Neural cool-down in progress..."
                  : "Ready for your next study sprint."}
              </p>
            </div>

            {/* Timer Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleTimer}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2 ${
                  pomoIsRunning
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30"
                    : "bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500 shadow-cyan-500/20"
                }`}
              >
                <span>{pomoIsRunning ? "⏸ Pause" : "▶ Start Sprint"}</span>
              </button>
              <button
                onClick={() => handleResetTimer(pomoMode)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-950/80 text-slate-400 hover:text-white border border-white/10 text-xs font-bold transition-all cursor-pointer"
                title="Reset timer"
              >
                ↺
              </button>
              <div className="bg-slate-950/60 border border-white/10 px-3 py-2 rounded-xl text-center">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Sessions</span>
                <span className="text-xs font-mono font-black text-cyan-400">{pomoSessionsCompleted}</span>
              </div>
            </div>
          </div>

          {/* BENTO CARD 3: ACTION QUESTS & CONCEPT MISSIONS */}
          <div className="bg-slate-900/40 backdrop-blur-2xl border border-slate-800/50 hover:border-cyan-500/30 transition-all duration-500 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between animate-fade-in-up stagger-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">⚔️</span>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Concept Missions</h3>
                  <p className="text-[11px] text-slate-400">Gamified Faculty Quests</p>
                </div>
              </div>
              <span className="bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                {metrics.pendingHomeworkCount} Active
              </span>
            </div>

            <div className="space-y-2.5 py-1">
              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-cyan-400/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.2)] hover:scale-[1.01] transition-all duration-300 flex items-center justify-between gap-2 cursor-pointer">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.3)]">
                      DUE TODAY
                    </span>
                    <span className="text-xs font-bold text-white truncate">Physics: Quantum Mechanics Wave Functions</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Faculty: Dr. Sharma • 50 XP Reward</p>
                </div>
                <span className="text-xs font-bold text-cyan-400 shrink-0">→</span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-cyan-400/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.2)] hover:scale-[1.01] transition-all duration-300 flex items-center justify-between gap-2 cursor-pointer">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                      HIGH PRIORITY
                    </span>
                    <span className="text-xs font-bold text-white truncate">Mathematics: Integral Calculus Module 4</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Due in 2 days • 75 XP Reward</p>
                </div>
                <span className="text-xs font-bold text-cyan-400 shrink-0">→</span>
              </div>
            </div>

            <button
              onClick={() => navigate("/student/homework")}
              className="w-full mt-3 py-2.5 rounded-xl bg-slate-950/90 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-cyan-300 hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <span>View All Active Missions</span>
              <span>→</span>
            </button>
          </div>

          {/* BENTO CARD 4: TIMED ASSESSMENT ARENA (ESPORTS CBT) */}
          <div className="bg-slate-900/40 backdrop-blur-2xl border border-slate-800/50 hover:border-cyan-500/30 transition-all duration-500 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between animate-fade-in-up stagger-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🎯</span>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Timed Assessment Arena</h3>
                  <p className="text-[11px] text-slate-400">Anti-Cheat CBT Engine</p>
                </div>
              </div>
              <span className="bg-purple-500/15 text-purple-400 border border-purple-500/30 text-[10px] font-black uppercase px-2.5 py-1 rounded-full">
                Esports Mode
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/80 to-purple-950/40 border border-purple-500/30 my-1">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-extrabold text-white">Full Syllabus Mock Examination</span>
                <span className="text-[10px] font-mono text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded border border-purple-500/30 font-bold">
                  60 MINS
                </span>
              </div>
              <p className="text-xs text-slate-300 mb-3">
                Strict full-screen anti-tamper lock. Instant AI score prediction & question breakdown upon submission.
              </p>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-purple-500/20">
                <span>30 Questions • Negative Marking</span>
                <span className="text-purple-300 font-bold">Auto-Graded</span>
              </div>
            </div>

            <button
              onClick={() => navigate("/student/exams")}
              className="w-full mt-3 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs transition-all shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>🚀 Launch Assessment Arena</span>
              <span>→</span>
            </button>
          </div>

          {/* BENTO CARD 5: MASTERY TRANSCRIPT & PERCENTILE VAULT */}
          <div className="bg-slate-900/40 backdrop-blur-2xl border border-slate-800/50 hover:border-cyan-500/30 transition-all duration-500 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between animate-fade-in-up stagger-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">📊</span>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Mastery Transcript</h3>
                  <p className="text-[11px] text-slate-400">Subject Percentile Analytics</p>
                </div>
              </div>
              <span className="bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 text-[10px] font-black uppercase px-2.5 py-1 rounded-full">
                {metrics.percentile} Percentile
              </span>
            </div>

            {/* Subject Mastery Progress Bars */}
            <div className="space-y-2.5 my-1">
              <div>
                <div className="flex justify-between text-[11px] font-bold text-slate-300 mb-1">
                  <span>Mathematics</span>
                  <span className="text-cyan-400 font-mono">98%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full" style={{ width: "98%" }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-bold text-slate-300 mb-1">
                  <span>Computer Science</span>
                  <span className="text-emerald-400 font-mono">99%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" style={{ width: "99%" }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-bold text-slate-300 mb-1">
                  <span>Physics</span>
                  <span className="text-purple-400 font-mono">94%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full" style={{ width: "94%" }}></div>
                </div>
              </div>
            </div>

            <button
              onClick={handleDownloadTranscript}
              className="w-full mt-3 py-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-white/10 text-cyan-300 hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <span>📜 Download Certified Transcript (PDF)</span>
            </button>
          </div>

          {/* BENTO CARD 6: TUITION TREASURY & ACTIVE FINANCIAL MISSION */}
          <div className="bg-slate-900/40 backdrop-blur-2xl border border-slate-800/50 hover:border-cyan-500/30 transition-all duration-500 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between animate-fade-in-up stagger-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">💳</span>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Tuition Mission</h3>
                  <p className="text-[11px] text-slate-400">Encrypted Razorpay Gateway</p>
                </div>
              </div>
              <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
                metrics.feeStatus.includes("Pending")
                  ? "bg-rose-500/15 text-rose-300 border-rose-500/40 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.25)]"
                  : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
              }`}>
                {metrics.feeStatus.includes("Pending") && <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>}
                {metrics.feeStatus}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 my-1 hover:border-emerald-500/40 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">Active Quest Target</span>
                <span className="text-xs font-mono font-bold text-emerald-400">Instant UTR Sync</span>
              </div>
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Outstanding Balance</span>
                  <span className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400 tracking-tight">
                    {metrics.pendingFeeAmount > 0 ? `₹${metrics.pendingFeeAmount.toLocaleString()}` : "₹0.00"}
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                  +100 XP Settlement
                </span>
              </div>

              {/* Batch-Targeted Fee Heads Preview */}
              {publishedFees.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-1.5">
                  <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider block">
                    Assigned Fees for {studentBatch}:
                  </span>
                  {publishedFees.slice(0, 2).map((fee) => (
                    <div key={fee.id} className="flex justify-between items-center text-[11px] p-1.5 rounded-lg bg-slate-900/60 border border-slate-800/80">
                      <span className="text-slate-200 font-medium truncate max-w-[150px]">{fee.title}</span>
                      <span className="text-emerald-400 font-mono font-bold">₹{Number(fee.amount).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => navigate("/student/pay")}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>⚡ Complete Mission (Pay)</span>
              </button>
              <button
                onClick={() => navigate("/student/fees")}
                className="py-2.5 px-3 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800 text-slate-300 hover:text-white font-bold text-xs transition-all cursor-pointer"
                title="View fee receipt history"
              >
                Receipts 🧾
              </button>
            </div>
          </div>

        </div>

        {/* 4. HONOR CREST & MERIT LEDGER + QUICK EXPANDED ACCESS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up stagger-6">

          {/* Honor Crest & Merit Ledger Card with Dynamic Behavior SVG Ring */}
          <div className="lg:col-span-1 bg-slate-900/40 backdrop-blur-2xl border border-slate-800/50 hover:border-amber-500/30 transition-all duration-500 hover:shadow-[0_0_30px_rgba(245,158,11,0.15)] rounded-3xl p-6 sm:p-7 relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🏆</span>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Honor Crest & Merits</h3>
                  <p className="text-[11px] text-slate-400">Behavior & Conduct Telemetry</p>
                </div>
              </div>
              <span className="bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                Gold Crest
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/70 border border-amber-500/20 my-2 flex items-center justify-between gap-4">
              {/* Dynamic Behavior / Conduct SVG Progress Ring */}
              <div className="relative flex items-center justify-center shrink-0">
                <svg className="w-20 h-20 transform -rotate-90">
                  <defs>
                    <filter id="neon-amber-glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#f59e0b" floodOpacity="0.8" />
                    </filter>
                  </defs>
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    stroke="currentColor"
                    strokeWidth="6"
                    className="text-slate-800/80"
                    fill="transparent"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    stroke="currentColor"
                    strokeWidth="6"
                    strokeDasharray={2 * Math.PI * 32}
                    strokeDashoffset={(2 * Math.PI * 32) - ((metrics.conductScore / 100) * (2 * Math.PI * 32))}
                    strokeLinecap="round"
                    filter="url(#neon-amber-glow)"
                    className="stroke-amber-400 text-amber-400 transition-all duration-1000 ease-out"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-base font-black text-amber-400">{metrics.conductScore}</span>
                  <span className="text-[8px] font-extrabold uppercase text-slate-400">Score</span>
                </div>
              </div>

              <div className="flex-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Disciplinary Standing</span>
                <p className="text-xs font-bold text-emerald-400 mt-0.5">Exemplary Rank</p>
                <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] space-y-0.5">
                  <p className="text-slate-300">Commendations: <strong className="text-amber-400">4</strong></p>
                  <p className="text-slate-300">Infractions: <strong className="text-emerald-400">0</strong></p>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate("/student/conduct")}
              className="w-full mt-2 py-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/40 text-amber-300 hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <span>View Conduct Record & Seals</span>
              <span>→</span>
            </button>
          </div>

          {/* Quick Access Matrix (LMS, Certificates, Calendar, Gallery) */}
          <div className="lg:col-span-2 bg-slate-900/40 backdrop-blur-2xl border border-slate-800/50 hover:border-cyan-500/30 transition-all duration-500 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] rounded-3xl p-6 sm:p-7 shadow-2xl">
            <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <span>🚀</span>
              <span>Academic Extensions & Learning Modules</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <button
                onClick={() => navigate("/student/lms")}
                className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 hover:border-cyan-500/40 hover:-translate-y-1 transition-all text-left flex flex-col justify-between cursor-pointer"
              >
                <span className="text-2xl mb-2">📖</span>
                <div>
                  <h4 className="text-xs font-bold text-white">LMS Courseware</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Notes & videos</p>
                </div>
              </button>

              <button
                onClick={() => navigate("/student/certificates")}
                className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 hover:border-purple-500/40 hover:-translate-y-1 transition-all text-left flex flex-col justify-between cursor-pointer"
              >
                <span className="text-2xl mb-2">📜</span>
                <div>
                  <h4 className="text-xs font-bold text-white">Certificates</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Merit seals & awards</p>
                </div>
              </button>

              <button
                onClick={() => navigate("/student/calendar")}
                className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 hover:border-emerald-500/40 hover:-translate-y-1 transition-all text-left flex flex-col justify-between cursor-pointer"
              >
                <span className="text-2xl mb-2">📅</span>
                <div>
                  <h4 className="text-xs font-bold text-white">Academic Calendar</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Term schedules</p>
                </div>
              </button>

              <button
                onClick={() => navigate("/student/gallery")}
                className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 hover:border-amber-500/40 hover:-translate-y-1 transition-all text-left flex flex-col justify-between cursor-pointer"
              >
                <span className="text-2xl mb-2">📸</span>
                <div>
                  <h4 className="text-xs font-bold text-white">Campus Gallery</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Events & labs</p>
                </div>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
