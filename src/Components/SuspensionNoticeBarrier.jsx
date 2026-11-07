import React from "react";
import BrandLogo from "./BrandLogo";

/**
 * Academic OS — Institutional Suspension & License Barrier
 * Rendered when a campus node subscription has expired or has been suspended by the platform administrator.
 * Guarantees 100% data preservation in PostgreSQL while strictly barring unauthorized dashboard execution.
 */
export default function SuspensionNoticeBarrier({ tenant, subscription, onLogout, onRetry }) {
  const schoolName = tenant?.name || "Institutional Campus";
  const schoolCode = tenant?.code || "CAMPUS-01";
  const expiryDate = subscription?.expiryDate || "Expired";
  const isExpired = subscription?.isExpired;

  return (
    <div className="fixed inset-0 z-[9999] w-full min-h-[100dvh] bg-[#0A0E1A]/95 backdrop-blur-xl text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans overflow-y-auto">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-rose-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-amber-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-xl mx-auto">
        <div className="bg-[#131A2B]/95 backdrop-blur-2xl border border-slate-800/90 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-black/80 text-center animate-fade-in">
          
          {/* Logo & Status Badge */}
          <div className="flex justify-center mb-5">
            <BrandLogo size="lg" className="shadow-2xl shadow-indigo-500/20" />
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-black uppercase tracking-widest mb-6">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
            {isExpired ? "License Expired" : "Campus Node Suspended"}
          </div>

          {/* Primary Notice */}
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-3">
            Access Suspended: this school's subscription is inactive. Contact the platform administrator to restore access.
          </h1>

          <p className="text-slate-200 text-sm sm:text-base leading-relaxed mb-6 font-medium">
            100% of data preserved in Supabase PostgreSQL — zero data loss. Reactivation restores full access.
          </p>

          {/* Data Preservation Reassurance Badge */}
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 mb-6 text-left flex items-start gap-3.5">
            <span className="text-2xl mt-0.5">🛡️</span>
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-emerald-400">
                100% Data Preservation Guarantee (Zero Data Loss)
              </h2>
              <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                100% of data preserved in Supabase PostgreSQL — zero data loss. Reactivation restores full access. All student rosters, academic marks, financial ledgers, and attendance archives
                remain fully intact and encrypted in Supabase PostgreSQL. No institutional records
                have been deleted.
              </p>
            </div>
          </div>

          {/* Node Metadata Summary */}
          <div className="bg-[#0A0E1A] border border-slate-800/90 rounded-2xl p-4 mb-8 text-xs text-slate-300 space-y-2">
            <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
              <span className="font-semibold text-slate-400">Campus Name</span>
              <span className="font-bold text-white">{schoolName}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
              <span className="font-semibold text-slate-400">Tenant Code</span>
              <span className="font-mono font-bold text-amber-400">{schoolCode}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="font-semibold text-slate-400">License Expiry</span>
              <span className="font-mono font-bold text-rose-400">{expiryDate}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={onRetry || (() => window.location.reload())}
              className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
            >
              🔄 Refresh Access Status
            </button>
            <button
              type="button"
              onClick={onLogout || (() => { window.location.href = "/login?signedOut=true"; })}
              className="flex-1 py-3 px-4 rounded-xl bg-[#0A0E1A] hover:bg-slate-800 text-slate-200 font-bold text-xs uppercase tracking-wider border border-slate-800/90 transition-all cursor-pointer"
            >
              🚪 Sign Out / Switch Portal
            </button>
          </div>

          <div className="mt-6 text-[11px] text-slate-400">
            Platform Owners & Master Administrators may unlock or renew this campus via{" "}
            <a href="/master-setup" className="text-indigo-400 hover:underline font-bold">
              /master-setup
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
