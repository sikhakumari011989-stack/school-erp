import React, { useState, useEffect, useContext, useCallback } from "react";
import { AppContext } from "../context/AppContext";
import { getStudentPublishedMarks } from "../utils/classTestMarksService";
import {
  Award,
  BookOpen,
  Calendar,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

export default function StudentMyMarks({ studentRoll = "" }) {
  const { user } = useContext(AppContext) || {};
  const schoolId = (user?.institution_code || user?.school_id || "CAMPUS-01").toUpperCase();

  // Resolve student identification (self-only)
  const currentRoll = String(studentRoll || user?.role_code || user?.roll_number || user?.personal_code || "").trim();
  const currentStudentId = String(user?.id || currentRoll).trim();

  const [publishedMarks, setPublishedMarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMarks = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      // Query strictly this student's published marks (Zero leak of peer marks or identities)
      const data = await getStudentPublishedMarks({
        schoolId,
        studentId: currentStudentId,
        studentRoll: currentRoll,
      });

      setPublishedMarks(data);
    } catch (err) {
      console.error("[StudentMyMarks] Error loading student marks:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [schoolId, currentStudentId, currentRoll]);

  useEffect(() => {
    fetchMarks();
    if (typeof window !== "undefined") {
      window.addEventListener("erp-tests-updated", fetchMarks);
      return () => window.removeEventListener("erp-tests-updated", fetchMarks);
    }
  }, [fetchMarks]);

  // Aggregate metrics computed solely from published personal scores
  const totalTests = publishedMarks.length;
  const totalScored = publishedMarks.reduce((sum, item) => sum + (item.is_absent ? 0 : item.marks_obtained), 0);
  const totalMax = publishedMarks.reduce((sum, item) => sum + item.max_score, 0);
  const overallPercentage = totalMax > 0 ? Math.round((totalScored / totalMax) * 100) : 0;

  return (
    <div className="bg-white/90 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/80 rounded-3xl p-5 sm:p-7 space-y-6 shadow-sm dark:shadow-2xl transition-all">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              <Award className="w-4 h-4" />
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
              Academic Assessment
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-mono">
              <ShieldCheck className="w-3 h-3" />
              <span>Private & Confidential</span>
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
            My Marks
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            View your individual class test scores alongside the benchmark class highest marks.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => fetchMarks(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            title="Refresh latest published marks"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>{refreshing ? "Updating..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* KPI METRICS STRIP */}
      {totalTests > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Tests Published
            </span>
            <span className="text-lg font-black text-slate-900 dark:text-white">{totalTests}</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Cumulative Marks
            </span>
            <span className="text-lg font-black text-cyan-600 dark:text-cyan-400">
              {totalScored} / {totalMax}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Aggregate Score
            </span>
            <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
              {overallPercentage}%
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Result Status
            </span>
            <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">Published</span>
          </div>
        </div>
      )}

      {/* LOADING STATE */}
      {loading ? (
        <div className="p-10 text-center space-y-3">
          <div className="w-7 h-7 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Loading your verified test results...</p>
        </div>
      ) : publishedMarks.length === 0 ? (
        /* AUTHENTIC EMPTY STATE (Zero mock fallbacks) */
        <div className="p-8 sm:p-10 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-3 bg-slate-50/50 dark:bg-slate-950/40">
          <BookOpen className="w-10 h-10 text-slate-400 mx-auto opacity-70" />
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            No Published Test Marks Yet
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            Your class teachers have not published any unit tests or assessment results for your roll number yet. Once
            marks are finalized and published by your faculty, your private score and the class highest will appear
            here automatically.
          </p>
        </div>
      ) : (
        /* MARKS CARDS GRID */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {publishedMarks.map((item) => {
            const pct = item.max_score > 0 ? Math.round((item.marks_obtained / item.max_score) * 100) : 0;
            const isHighest = item.marks_obtained >= item.class_highest && !item.is_absent;

            return (
              <div
                key={item.test_id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 hover:border-cyan-500/40 transition-all flex flex-col justify-between space-y-4 shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                      {item.subject}
                    </span>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                      Published
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                    {item.title}
                  </h4>

                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{item.test_date}</span>
                    {item.class_id && <span>• {item.class_id}</span>}
                  </div>
                </div>

                {/* MARKS COMPARISON BLOCK */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                        My Marks
                      </span>
                      {item.is_absent ? (
                        <span className="text-lg font-black text-amber-600 dark:text-amber-400">ABSENT</span>
                      ) : (
                        <span className="text-xl font-black text-cyan-600 dark:text-cyan-400">
                          {item.marks_obtained} <span className="text-xs text-slate-400 font-normal">/ {item.max_score}</span>
                        </span>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                        Class Highest
                      </span>
                      <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                        {item.class_highest} <span className="text-xs text-slate-400 font-normal">/ {item.max_score}</span>
                      </span>
                    </div>
                  </div>

                  {/* Visual Progress Bar */}
                  {!item.is_absent && (
                    <div className="space-y-1">
                      <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isHighest
                              ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                              : pct >= 75
                              ? "bg-gradient-to-r from-cyan-500 to-blue-500"
                              : pct >= 40
                              ? "bg-gradient-to-r from-amber-500 to-orange-400"
                              : "bg-rose-500"
                          }`}
                          style={{ width: `${Math.min(100, Math.max(5, pct))}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-[10px] font-mono text-slate-400">
                        <span>Score: {pct}%</span>
                        {isHighest && (
                          <span className="text-emerald-500 font-bold flex items-center gap-1">
                            🏆 Top Score in Class
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* FOOTER PRIVACY NOTICE */}
                <div className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center justify-between font-mono">
                  <span>Evaluation: {item.remarks}</span>
                  <span>Strictly Confidential</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
