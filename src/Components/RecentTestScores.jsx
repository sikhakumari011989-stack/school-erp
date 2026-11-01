import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { supabase } from "../supabaseClient";
import {
  Award,
  TrendingUp,
  BookOpen,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  BarChart3,
  Percent,
} from "lucide-react";
import { formatDisplayDate } from "../utils/calendarService";

const SUBJECT_ICONS = {
  Mathematics: "📐",
  Physics: "⚡",
  Chemistry: "🧪",
  Biology: "🧬",
  "English Literature": "📖",
  "Computer Science": "💻",
  "Social Studies": "🌍",
  "Environmental Science": "🌱",
  Economics: "📊",
  Accountancy: "📑",
};

const DEFAULT_SAMPLE_TESTS = [
  {
    id: "sample_1",
    subject: "Mathematics",
    title: "Unit Test 1: Quadratic Equations",
    test_date: "2026-10-24",
    marks_obtained: 18.5,
    max_score: 20,
    remarks: "Top 5% in Class",
  },
  {
    id: "sample_2",
    subject: "Physics",
    title: "Mid-Term Mechanics & Optics Quiz",
    test_date: "2026-10-18",
    marks_obtained: 44.0,
    max_score: 50,
    remarks: "Excellent Derivation",
  },
  {
    id: "sample_3",
    subject: "Chemistry",
    title: "Periodic Trends & Chemical Bonding",
    test_date: "2026-10-12",
    marks_obtained: 19.0,
    max_score: 20,
    remarks: "Perfect Score in Section A",
  },
  {
    id: "sample_4",
    subject: "Computer Science",
    title: "Data Structures & SQL Fundamentals",
    test_date: "2026-10-05",
    marks_obtained: 46.5,
    max_score: 50,
    remarks: "Outstanding Code Logic",
  },
];

export default function RecentTestScores({ studentRoll = "", className = "" }) {
  const { user } = useContext(AppContext) || {};
  const schoolId = (user?.institution_code || user?.school_id || "CAMPUS-01").toUpperCase();
  const currentRoll = String(studentRoll || user?.role_code || user?.roll_number || user?.personal_code || "").trim().toUpperCase();

  const [testScores, setTestScores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchScores = async () => {
      setLoading(true);
      try {
        let loaded = [];

        // 1. Check local storage cache
        try {
          const rawScores = localStorage.getItem(`erp_test_scores_${schoolId}`);
          if (rawScores) {
            const parsed = JSON.parse(rawScores);
            if (Array.isArray(parsed) && parsed.length > 0) {
              // Filter by current student roll or match
              const myScores = parsed.filter((sc) => {
                const sRoll = String(sc.roll_number || sc.student_id || "").trim().toUpperCase();
                return !currentRoll || sRoll === currentRoll || sRoll.includes(currentRoll);
              });
              if (myScores.length > 0) loaded = myScores;
            }
          }
        } catch {}

        // 2. Fetch from Supabase test_scores table
        if (loaded.length === 0 && supabase) {
          try {
            let query = supabase
              .from("test_scores")
              .select("id, test_id, marks_obtained, max_score, is_absent, remarks, created_at, class_tests ( subject, title, test_date )")
              .eq("school_id", schoolId)
              .order("created_at", { ascending: false })
              .limit(10);

            if (currentRoll) {
              query = query.eq("roll_number", currentRoll);
            }

            const { data } = await query;
            if (data && data.length > 0) {
              const mapped = data.map((d) => ({
                id: d.id,
                subject: d.class_tests?.subject || "General Academic",
                title: d.class_tests?.title || "Assessment",
                test_date: d.class_tests?.test_date || d.created_at?.split("T")[0],
                marks_obtained: Number(d.marks_obtained),
                max_score: Number(d.max_score) || 20,
                remarks: d.remarks || (d.is_absent ? "Absent" : "Verified"),
              }));
              loaded = mapped;
            }
          } catch (e) {
            console.warn("Supabase test_scores fetch notice:", e);
          }
        }

        // Fallback to sample tests if student has no scores recorded yet
        if (loaded.length === 0) {
          loaded = DEFAULT_SAMPLE_TESTS;
        }

        if (!isMounted) return;
        setTestScores(loaded);
      } catch (err) {
        console.error("Error loading test scores:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchScores();
    window.addEventListener("erp-tests-updated", fetchScores);
    return () => {
      isMounted = false;
      window.removeEventListener("erp-tests-updated", fetchScores);
    };
  }, [schoolId, currentRoll]);

  // Overall Statistics Calculation
  const totalTests = testScores.length;
  const percentages = testScores.map((t) => (t.marks_obtained / t.max_score) * 100);
  const avgPct = totalTests > 0 ? (percentages.reduce((a, b) => a + b, 0) / totalTests).toFixed(1) : 0;
  const highestPct = totalTests > 0 ? Math.round(Math.max(...percentages)) : 0;

  return (
    <div className={`bg-white/80 dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-xl transition-all ${className}`}>
      {/* HEADER & SUMMARY METRICS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              <BarChart3 className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
              Academic Assessment Tracker
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-300">
              Instant Sync
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
            Recent Class Test Evaluations
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Subject-wise score progression and continuous evaluation results
          </p>
        </div>

        {/* Top Badges */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/5 text-center flex-1 sm:flex-initial min-w-[95px]">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Cumulative Avg
            </span>
            <span className="text-base font-black text-cyan-600 dark:text-cyan-400">
              {avgPct}%
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/5 text-center flex-1 sm:flex-initial min-w-[95px]">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Top Score
            </span>
            <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
              {highestPct}%
            </span>
          </div>
        </div>
      </div>

      {/* RECENT TESTS LIST WITH PERFORMANCE PROGRESS BARS */}
      <div className="space-y-4">
        {testScores.map((test) => {
          const pct = Math.round((test.marks_obtained / test.max_score) * 100);
          const icon = SUBJECT_ICONS[test.subject] || "📝";

          // Color coded progress bar
          const progressGradient =
            pct >= 75
              ? "from-emerald-500 to-teal-400"
              : pct >= 50
              ? "from-amber-500 to-yellow-400"
              : "from-rose-500 to-red-400";

          const badgeColor =
            pct >= 75
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
              : pct >= 50
              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
              : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30";

          return (
            <div
              key={test.id}
              className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 hover:border-cyan-400/50 transition-all duration-200 space-y-2.5 shadow-sm group hover:-translate-y-0.5"
            >
              {/* Row 1: Subject, Date, Score */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg shrink-0 shadow-sm">
                    {icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                        {test.subject}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                        &bull; {formatDisplayDate(test.test_date)}
                      </span>
                    </div>
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                      {test.title}
                    </p>
                  </div>
                </div>

                {/* Score & Percentage Pill */}
                <div className="text-right shrink-0">
                  <div className="flex items-baseline gap-1 justify-end">
                    <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono">
                      {test.marks_obtained}
                    </span>
                    <span className="text-xs font-bold text-slate-400 font-mono">
                      /{test.max_score}
                    </span>
                  </div>
                  <span className={`inline-block text-[10px] font-black px-2 py-0.5 rounded-full border ${badgeColor} font-mono mt-0.5`}>
                    {pct}%
                  </span>
                </div>
              </div>

              {/* Row 2: Performance Progress Bar */}
              <div className="space-y-1">
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden p-0.5">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${progressGradient} transition-all duration-700 shadow-sm`}
                    style={{ width: `${Math.min(100, Math.max(5, pct))}%` }}
                  ></div>
                </div>
                {test.remarks && (
                  <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 text-right italic">
                    {test.remarks}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

