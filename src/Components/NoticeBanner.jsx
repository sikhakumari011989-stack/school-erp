import React, { useState, useEffect } from "react";
import { getNotices } from "../utils/noticeService";

export default function NoticeBanner({ role = "All", schoolId }) {
  const [notices, setNotices] = useState([]);
  const [dismissed, setDismissed] = useState([]);
  const [expandedNotice, setExpandedNotice] = useState(null);

  useEffect(() => {
    const load = async () => {
      const all = await getNotices(schoolId);
      // Filter for target audience
      const filtered = all.filter((n) => {
        const aud = (n.audience || "").toLowerCase();
        const userRole = (role || "").toLowerCase();
        return aud === "all" || aud === userRole || aud.includes(userRole);
      });
      setNotices(filtered);
    };
    load();
  }, [role, schoolId]);

  const activeNotices = notices.filter((n) => !dismissed.includes(n.id));

  if (activeNotices.length === 0) return null;

  const current = activeNotices[0];

  const getCategoryBadge = (cat) => {
    switch (cat?.toLowerCase()) {
      case "holiday":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
      case "emergency":
        return "bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse";
      case "exam":
        return "bg-amber-500/20 text-amber-400 border-amber-500/40";
      case "fee":
        return "bg-purple-500/20 text-purple-400 border-purple-500/40";
      default:
        return "bg-blue-500/20 text-blue-400 border-blue-500/40";
    }
  };

  const getCategoryIcon = (cat) => {
    switch (cat?.toLowerCase()) {
      case "holiday":
        return "🎉";
      case "emergency":
        return "🚨";
      case "exam":
        return "📝";
      case "fee":
        return "💰";
      default:
        return "📢";
    }
  };

  return (
    <div className="mb-6">
      <div className="bg-gradient-to-r from-slate-900/90 via-slate-800/90 to-slate-900/90 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden transition-all">
        {/* Glow accent */}
        <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-blue-500 via-indigo-500 to-purple-500"></div>

        <div className="flex items-start sm:items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
          <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
            <div className="text-2xl flex-shrink-0">
              {getCategoryIcon(current.category)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${getCategoryBadge(
                    current.category
                  )}`}
                >
                  {current.category || "Notice"}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {current.date}
                </span>
                <span className="text-[10px] text-slate-500 font-bold">
                  Audience: {current.audience}
                </span>
              </div>
              <h4 className="text-sm sm:text-base font-extrabold text-white truncate">
                {current.title}
              </h4>
              <p
                className={`text-xs text-slate-300 mt-1 transition-all ${
                  expandedNotice === current.id ? "" : "line-clamp-1"
                }`}
              >
                {current.content}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
            <button
              onClick={() =>
                setExpandedNotice(expandedNotice === current.id ? null : current.id)
              }
              className="text-xs text-blue-400 hover:text-blue-300 font-bold bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
            >
              {expandedNotice === current.id ? "Show Less" : "Read Full"}
            </button>
            <button
              onClick={() => setDismissed([...dismissed, current.id])}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer text-sm font-bold"
              title="Dismiss announcement"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
