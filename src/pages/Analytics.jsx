import React, { useState, useEffect } from "react";
import { useAppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { supabase } from "../supabaseClient";
import { resolveSchoolUuid } from "../utils/supabaseHelpers";

export default function Analytics() {
  const { user, tenant } = useAppContext() || {};
  const { showToast } = useToast();

  const schoolCode = (
    user?.institution_code ||
    user?.school_id ||
    tenant?.code ||
    "CAMPUS-01"
  ).toUpperCase();

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    totalFeesCollected: 0,
    pendingFees: 0,
    averageAttendance: 0,
    totalHomework: 0,
    feeTransactionsCount: 0,
  });

  const loadMetrics = async () => {
    setLoading(true);
    try {
      if (!supabase) {
        setLoading(false);
        return;
      }

      // 1. Students Count
      const { count: studentCount, error: stuErr } = await supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolCode);

      // 2. Teachers Count
      const { count: teacherCount, error: tchErr } = await supabase
        .from("teachers")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolCode);

      // 3. Classes Count
      const { count: classCount, error: clsErr } = await supabase
        .from("classes")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolCode);

      // 4. Fees Aggregates
      const { data: feeRecords, error: feeErr } = await supabase
        .from("fee_ledger")
        .select("amount, status")
        .eq("school_id", schoolCode);

      let collectedSum = 0;
      let pendingSum = 0;
      let feeTxnCount = 0;

      if (!feeErr && feeRecords) {
        feeTxnCount = feeRecords.length;
        feeRecords.forEach((f) => {
          const amt = Number(f.amount) || 0;
          const st = String(f.status || "").toLowerCase();
          if (st === "paid" || st === "completed") {
            collectedSum += amt;
          } else {
            pendingSum += amt;
          }
        });
      }

      // 5. Attendance Rate (Average across recent sessions)
      const schoolUuid = await resolveSchoolUuid(schoolCode);
      let attQuery = supabase
        .from("attendance")
        .select("records")
        .order("date", { ascending: false })
        .limit(20);

      if (schoolUuid) {
        attQuery = attQuery.or(`school_id.eq.${schoolCode},school_id.eq.${schoolUuid}`);
      } else {
        attQuery = attQuery.eq("school_id", schoolCode);
      }

      const { data: attSessions } = await attQuery;
      let totalPresent = 0;
      let totalAbsent = 0;

      if (attSessions && attSessions.length > 0) {
        attSessions.forEach((s) => {
          const recs = Array.isArray(s.records) ? s.records : [];
          recs.forEach((r) => {
            if (String(r.status || "").toLowerCase() === "absent") {
              totalAbsent += 1;
            } else {
              totalPresent += 1;
            }
          });
        });
      }

      const attSum = totalPresent + totalAbsent;
      const avgAtt = attSum > 0 ? Math.round((totalPresent / attSum) * 100) : 0;

      // 6. Homework Count
      const { count: hwCount } = await supabase
        .from("homework")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolCode);

      setMetrics({
        totalStudents: studentCount || 0,
        totalTeachers: teacherCount || 0,
        totalClasses: classCount || 0,
        totalFeesCollected: collectedSum,
        pendingFees: pendingSum,
        averageAttendance: avgAtt,
        totalHomework: hwCount || 0,
        feeTransactionsCount: feeTxnCount,
      });
    } catch (err) {
      console.warn("Analytics fetch notice:", err);
      showToast("Unable to load latest institutional analytics.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, [schoolCode]);

  const studentTeacherRatio =
    metrics.totalTeachers > 0
      ? (metrics.totalStudents / metrics.totalTeachers).toFixed(1)
      : metrics.totalStudents > 0
      ? `${metrics.totalStudents}:0`
      : "0:0";

  const totalFeeBilled = metrics.totalFeesCollected + metrics.pendingFees;
  const feeRecoveryRate =
    totalFeeBilled > 0
      ? Math.round((metrics.totalFeesCollected / totalFeeBilled) * 100)
      : 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-[100dvh] bg-slate-950 text-slate-100 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
              <span>📈 Executive Analytics</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              School Analytics & Health KPIs
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Live operational metrics for campus node <span className="font-mono text-cyan-300">{schoolCode}</span>
            </p>
          </div>

          <button
            onClick={loadMetrics}
            disabled={loading}
            className="self-start sm:self-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-white/10 rounded-xl text-xs font-bold text-slate-200 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span className={loading ? "animate-spin" : ""}>🔄</span>
            <span>Refresh Metrics</span>
          </button>
        </div>

        {/* Primary KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Total Students */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-cyan-500/40 transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Enrolled</p>
                <p className="text-3xl sm:text-4xl font-black text-white mt-2">
                  {loading ? "--" : metrics.totalStudents}
                </p>
                <p className="text-[11px] text-cyan-400 font-semibold mt-1">
                  Active Student Scholars
                </p>
              </div>
              <div className="text-4xl p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20">👥</div>
            </div>
          </div>

          {/* Total Teachers */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-purple-500/40 transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Faculty Members</p>
                <p className="text-3xl sm:text-4xl font-black text-white mt-2">
                  {loading ? "--" : metrics.totalTeachers}
                </p>
                <p className="text-[11px] text-purple-400 font-semibold mt-1">
                  Ratio: {studentTeacherRatio} scholars/faculty
                </p>
              </div>
              <div className="text-4xl p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">👨‍🏫</div>
            </div>
          </div>

          {/* Active Classes */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-blue-500/40 transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Configured Classes</p>
                <p className="text-3xl sm:text-4xl font-black text-white mt-2">
                  {loading ? "--" : metrics.totalClasses}
                </p>
                <p className="text-[11px] text-blue-400 font-semibold mt-1">
                  Academic Cohorts
                </p>
              </div>
              <div className="text-4xl p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">🏫</div>
            </div>
          </div>

          {/* Average Attendance */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-emerald-500/40 transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Campus Attendance</p>
                <p className="text-3xl sm:text-4xl font-black text-white mt-2">
                  {loading ? "--" : `${metrics.averageAttendance}%`}
                </p>
                <p className="text-[11px] text-emerald-400 font-semibold mt-1">
                  Recent 20 Sessions Aggregate
                </p>
              </div>
              <div className="text-4xl p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">📋</div>
            </div>
          </div>
        </div>

        {/* Secondary Financial & Operational Deep-Dive */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Financial Recovery Card */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>💰</span> Financial Recovery & Dues
              </h2>
              <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                {feeRecoveryRate}% Reconciled
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-slate-400">
                <span>Fee Collection Progress</span>
                <span className="text-white font-mono">
                  ₹{metrics.totalFeesCollected.toLocaleString("en-IN")} / ₹{totalFeeBilled.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-white/5">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-500"
                  style={{ width: `${feeRecoveryRate}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="bg-slate-800/50 border border-white/5 rounded-xl p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Collected</p>
                <p className="text-xl sm:text-2xl font-black text-emerald-400 font-mono mt-1">
                  ₹{metrics.totalFeesCollected.toLocaleString("en-IN")}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">{metrics.feeTransactionsCount} recorded payments</p>
              </div>
              <div className="bg-slate-800/50 border border-white/5 rounded-xl p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pending Dues</p>
                <p className="text-xl sm:text-2xl font-black text-rose-400 font-mono mt-1">
                  ₹{metrics.pendingFees.toLocaleString("en-IN")}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">Unsettled receivables</p>
              </div>
            </div>
          </div>

          {/* Academic & Operations Summary */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl space-y-5">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <span>📚</span> Academic Pulse
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/50 border border-white/5 rounded-xl p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Assigned Homework</p>
                <p className="text-2xl font-black text-indigo-400 mt-1">{metrics.totalHomework}</p>
                <p className="text-[10px] text-slate-500 mt-1">Active tasks in system</p>
              </div>

              <div className="bg-slate-800/50 border border-white/5 rounded-xl p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Batch Cohorts</p>
                <p className="text-2xl font-black text-cyan-400 mt-1">{metrics.totalClasses}</p>
                <p className="text-[10px] text-slate-500 mt-1">Structured academic divisions</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/30 border border-white/5">
              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                ℹ️ Metrics reflect genuine records synchronized to Supabase PostgreSQL. When you enroll scholars, record attendance, and log payments, these indicators update automatically in real-time.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
