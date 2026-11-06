import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { generatePrincipalAIBriefing } from "../utils/aiIntelligenceEngine";
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Calendar,
  ShieldCheck,
  Building2,
} from "lucide-react";

export default function PrincipalAIBriefing({ schoolCode, onNavigateTab }) {
  const navigate = useNavigate();
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchBriefing = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await generatePrincipalAIBriefing(schoolCode);
      setBriefing(data);
    } catch (err) {
      console.error("[PrincipalAIBriefing] Failed to generate briefing:", err);
      setError("Unable to compile briefing from institutional records. Please verify database connectivity.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [schoolCode]);

  useEffect(() => {
    fetchBriefing();
  }, [fetchBriefing]);

  const handleActionClick = (action) => {
    if (action.actionTarget && action.actionTarget.startsWith("/")) {
      navigate(action.actionTarget);
    } else if (onNavigateTab && action.tab) {
      onNavigateTab(action.tab);
    }
  };

  // Loading Skeleton
  if (loading) {
    return (
      <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm dark:shadow-2xl animate-pulse">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="space-y-2">
            <div className="h-6 w-56 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
            <div className="h-4 w-72 bg-slate-100 dark:bg-slate-800/60 rounded-md"></div>
          </div>
          <div className="h-8 w-32 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800/40 rounded-2xl"></div>
          ))}
        </div>
        <div className="h-20 bg-slate-100 dark:bg-slate-800/40 rounded-2xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800/40 rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  // Error State
  if (error || !briefing) {
    return (
      <div className="bg-white/90 dark:bg-slate-900/60 backdrop-blur-xl border border-rose-200 dark:border-rose-900/50 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 flex items-center justify-center text-rose-500">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Briefing Compilation Unavailable</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">{error}</p>
        </div>
        <button
          onClick={() => fetchBriefing(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Compilation</span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden bg-white/95 dark:bg-[#131A2B] backdrop-blur-2xl border border-slate-200/90 dark:border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-sm dark:shadow-2xl transition-all duration-300 hover:border-indigo-500/40">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-cyan-500/10 via-indigo-500/5 to-transparent rounded-full blur-3xl pointer-events-none"></div>

      {/* HEADER SECTION */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/30 text-cyan-700 dark:text-cyan-300 text-xs font-extrabold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Executive AI Briefing</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-[11px] font-mono">
              <Calendar className="w-3 h-3" />
              <span>{briefing.periodDisplay}</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[11px] font-mono">
              <ShieldCheck className="w-3 h-3" />
              <span>Zero Hallucination</span>
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Principal's Institutional Intelligence Briefing
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Verified institutional synthesis compiled directly from student registers, fee ledgers, and academic marks.
          </p>
        </div>

        {/* REFRESH & ENGINE SOURCE */}
        <div className="flex items-center gap-2 self-start lg:self-center">
          <button
            onClick={() => fetchBriefing(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
            title="Re-run institutional analysis"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{isRefreshing ? "Analyzing..." : "Refresh Briefing"}</span>
          </button>
        </div>
      </div>

      {/* STATS TELEMETRY RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 my-5">
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#0A0E1A] border border-slate-200 dark:border-slate-800/90 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Enrolled Scholars</span>
          <span className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">{briefing.metricsSummary.enrolled}</span>
        </div>
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#0A0E1A] border border-slate-200 dark:border-slate-800/90 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Faculty Roster</span>
          <span className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">{briefing.metricsSummary.faculty}</span>
        </div>
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#0A0E1A] border border-slate-200 dark:border-slate-800/90 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Campus Attendance</span>
          <span className="text-xl font-extrabold text-cyan-600 dark:text-cyan-400 tracking-tight">{briefing.metricsSummary.attendanceRate}</span>
        </div>
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#0A0E1A] border border-slate-200 dark:border-slate-800/90 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Fee Collection Rate</span>
          <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">{briefing.metricsSummary.feeCollectionRate}</span>
        </div>
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#0A0E1A] border border-slate-200 dark:border-slate-800/90 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Outstanding Arrears</span>
          <span className="text-xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight">{briefing.metricsSummary.totalOverdue}</span>
        </div>
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#0A0E1A] border border-slate-200 dark:border-slate-800/90 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Radar Watchlist</span>
          <span className="text-xl font-extrabold text-rose-600 dark:text-rose-400 tracking-tight">{briefing.metricsSummary.atRiskScholars}</span>
        </div>
      </div>

      {/* SECTION 1: SCHOOL OVERVIEW */}
      <div className="mb-6 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-50 via-slate-50/50 to-indigo-50/20 dark:from-[#0A0E1A] dark:via-[#0F1629] dark:to-indigo-950/20 border border-slate-200 dark:border-slate-800/90 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
            1. Institutional Overview
          </h3>
        </div>
        <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-200 font-medium">
          {briefing.overview}
        </p>
      </div>

      {/* SECTION 2: IMPORTANT OBSERVATIONS */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
            2. Important Observations & Trends
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {briefing.observations.map((obs) => {
            const isWarning = obs.severity === "warning";
            const isPositive = obs.severity === "positive";

            return (
              <div
                key={obs.id}
                className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between space-y-3 ${
                  isWarning
                    ? "bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40"
                    : isPositive
                    ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40"
                    : "bg-slate-50/70 dark:bg-[#0A0E1A] border-slate-200 dark:border-slate-800/90"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {obs.category}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isWarning
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300"
                          : isPositive
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300"
                          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {isWarning ? "Needs Review" : isPositive ? "Optimal" : "Stable"}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                    {obs.title}
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-200 mt-1 leading-normal">
                    {obs.description}
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800/80">
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-300 block font-semibold truncate">
                    📊 {obs.supportingMetric}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: RECOMMENDED ACTIONS */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
            3. Recommended Management Actions
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {briefing.recommendedActions.map((act) => (
            <div
              key={act.id}
              className="p-4 rounded-2xl bg-white dark:bg-[#0A0E1A] border border-slate-200 dark:border-slate-800/90 hover:border-indigo-400 dark:hover:border-indigo-500/40 transition-all duration-200 flex flex-col justify-between space-y-3 shadow-xs"
            >
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                  {act.badge}
                </span>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-1 leading-snug">
                  {act.title}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-200 mt-1 leading-normal">
                  {act.description}
                </p>
              </div>
              <button
                onClick={() => handleActionClick(act)}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-cyan-500/20 dark:hover:bg-cyan-500/30 dark:border dark:border-cyan-500/30 dark:text-cyan-300 text-xs font-bold transition-all cursor-pointer hover:-translate-y-0.5"
              >
                <span>{act.actionLabel}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER ENGINE TRANSPARENCY NOTICE */}
      <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[10px] text-slate-400 dark:text-slate-500 font-mono">
        <span>Analysis Engine: {briefing.engineSource}</span>
        <span>Confidential • Authorized Campus Executive Eyes Only</span>
      </div>
    </div>
  );
}
