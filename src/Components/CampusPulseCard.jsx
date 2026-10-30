import React, { useState, useEffect } from "react";
import { getTodayAndUpcomingPulse } from "../utils/calendarService";

export default function CampusPulseCard({ schoolCode, compact = false, className = "" }) {
  const [pulseData, setPulseData] = useState(() => getTodayAndUpcomingPulse(schoolCode));

  useEffect(() => {
    const refresh = () => {
      setPulseData(getTodayAndUpcomingPulse(schoolCode));
    };

    refresh();

    // Listen for cross-tab or real-time calendar updates
    const handleUpdate = (e) => {
      if (!e.detail?.schoolCode || !schoolCode || e.detail.schoolCode === schoolCode.toUpperCase()) {
        refresh();
      }
    };

    window.addEventListener("erp-calendar-updated", handleUpdate);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener("erp-calendar-updated", handleUpdate);
      window.removeEventListener("storage", refresh);
    };
  }, [schoolCode]);

  const { todayFormatted, todayPulse, upcomingEvents } = pulseData;

  const getStatusTheme = () => {
    if (todayPulse.category === "Holiday") {
      return {
        badgeBg: "bg-rose-500/20 text-rose-300 border-rose-500/40",
        ping: "bg-rose-400",
        cardBorder: "border-rose-500/30",
        icon: "🏖️",
      };
    }
    if (todayPulse.category === "Exam") {
      return {
        badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/40",
        ping: "bg-amber-400",
        cardBorder: "border-amber-500/30",
        icon: "📝",
      };
    }
    if (todayPulse.category === "Function") {
      return {
        badgeBg: "bg-purple-500/20 text-purple-300 border-purple-500/40",
        ping: "bg-purple-400",
        cardBorder: "border-purple-500/30",
        icon: "🎉",
      };
    }
    // Working Day
    return {
      badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
      ping: "bg-emerald-400",
      cardBorder: "border-emerald-500/30",
      icon: "📚",
    };
  };

  const theme = getStatusTheme();

  if (compact) {
    return (
      <div className={`flex items-center justify-between gap-3 p-3.5 bg-white/90 dark:bg-slate-900/60 backdrop-blur-xl border ${theme.cardBorder} rounded-xl shadow-sm dark:shadow-lg transition-all duration-200 ${className}`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-xl shrink-0">{theme.icon}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`inline-block w-2 h-2 rounded-full ${theme.ping} animate-pulse shrink-0`}></span>
              <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{todayPulse.title}</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{todayFormatted} • {todayPulse.badge}</p>
          </div>
        </div>
        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0 ${theme.badgeBg}`}>
          {todayPulse.category}
        </span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-white/80 dark:bg-slate-900/40 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800/50 hover:border-cyan-400 dark:hover:border-cyan-500/30 transition-all duration-300 hover:-translate-y-0.5 rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-2xl ${className}`}>
      {/* Ambient background glow */}
      <div className="absolute -right-12 -top-12 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 text-base shadow-inner">
            {theme.icon}
            <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${theme.ping} animate-ping`}></span>
            <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${theme.ping}`}></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Today's Campus Pulse</h3>
              <span className="text-[10px] font-mono text-cyan-700 bg-cyan-50 border-cyan-200 dark:text-cyan-400 dark:bg-cyan-500/10 px-2 py-0.5 rounded-md border dark:border-cyan-500/20 font-bold">
                LIVE
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{todayFormatted}</p>
          </div>
        </div>

        <span className={`text-xs font-black px-3 py-1 rounded-full border uppercase tracking-wider ${theme.badgeBg}`}>
          {todayPulse.badge}
        </span>
      </div>

      {/* Main Today Pulse Description */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50/80 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 mb-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              {todayPulse.title}
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {todayPulse.reason}
            </p>
          </div>
        </div>
      </div>

      {/* Upcoming 7-Day Event Radar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            7-Day Campus Radar
          </span>
          <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
            {upcomingEvents.length} special date{upcomingEvents.length === 1 ? "" : "s"} ahead
          </span>
        </div>

        {upcomingEvents.length === 0 ? (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              ✨ No special holidays or exams in the next 7 days. Regular academic schedule active.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {upcomingEvents.map((ev) => {
              const evCategoryColor =
                ev.category === "Holiday"
                  ? "border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10"
                  : ev.category === "Exam"
                  ? "border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10"
                  : ev.category === "Function"
                  ? "border-purple-200 dark:border-purple-500/30 text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-500/10"
                  : "border-cyan-200 dark:border-cyan-500/30 text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-500/10";

              return (
                <div
                  key={ev.id || ev.date}
                  className="p-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5"
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-mono font-bold text-cyan-700 dark:text-cyan-400">
                      {ev.dayLabel} ({ev.formattedDate})
                    </span>
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${evCategoryColor}`}>
                      {ev.category}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate" title={ev.title}>
                    {ev.title}
                  </p>
                  {ev.reason && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5" title={ev.reason}>
                      {ev.reason}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

