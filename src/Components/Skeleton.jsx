import React from "react";

export function StatSkeleton() {
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl animate-pulse">
      <div className="h-3 w-28 bg-slate-700/60 rounded mb-3"></div>
      <div className="h-8 w-36 bg-slate-700/80 rounded mb-2"></div>
      <div className="h-3 w-24 bg-slate-700/40 rounded"></div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="w-full animate-pulse">
      <div className="border-b border-slate-700/60 p-4 bg-slate-800/40 flex justify-between gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-4 bg-slate-700/60 rounded flex-1"></div>
        ))}
      </div>
      <div className="divide-y divide-slate-800/50">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="p-5 flex justify-between gap-4">
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} className="h-4 bg-slate-800/70 rounded flex-1"></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-[#1E293B]/70 border border-slate-700/50 rounded-3xl p-6 shadow-2xl animate-pulse space-y-4">
      <div className="flex justify-between items-center">
        <div className="h-6 w-24 bg-slate-700/60 rounded-xl"></div>
        <div className="h-4 w-16 bg-slate-700/40 rounded"></div>
      </div>
      <div className="h-5 w-48 bg-slate-700/80 rounded"></div>
      <div className="h-3 w-full bg-slate-700/50 rounded"></div>
      <div className="h-3 w-3/4 bg-slate-700/40 rounded"></div>
      <div className="h-10 w-full bg-slate-700/60 rounded-xl pt-2"></div>
    </div>
  );
}

