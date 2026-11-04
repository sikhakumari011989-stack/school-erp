import React, { useState, useEffect, useContext, useMemo } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { supabase } from "../supabaseClient";
import {
  ACCREDITATION_FRAMEWORKS,
  DEFAULT_CRITERIA,
  calculateReadinessScore,
} from "../utils/accreditationService";
import {
  Award,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  Search,
  Filter,
  Layers,
  ArrowRight,
  Printer,
  Sparkles,
  ExternalLink,
} from "lucide-react";

export default function AccreditationCenter() {
  const { user, tenant } = useContext(AppContext) || {};
  const { showToast } = useToast();

  const schoolCode = (
    user?.institution_code ||
    user?.school_id ||
    tenant?.code ||
    "CAMPUS-01"
  ).toUpperCase();

  const [criteria, setCriteria] = useState([]);
  const [selectedFramework, setSelectedFramework] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    loadCriteria();
  }, [schoolCode]);

  const loadCriteria = async () => {
    let loaded = [];
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("accreditation_criteria")
          .select("*")
          .eq("school_id", schoolCode);
        if (!error && data && data.length > 0) loaded = data;
      } catch (e) {}
    }

    if (loaded.length === 0) {
      try {
        const saved = localStorage.getItem(`erp_accreditation_${schoolCode}`);
        loaded = saved ? JSON.parse(saved) : DEFAULT_CRITERIA;
      } catch (e) {
        loaded = DEFAULT_CRITERIA;
      }
    }

    setCriteria(loaded);
  };

  const handleStatusToggle = async (id, newStatus) => {
    let targetCriterion = null;
    const updated = criteria.map((c) => {
      if (c.id === id) {
        const maxScore = Number(c.score_weightage || 10);
        let score = 0;
        if (newStatus === "compliant") score = maxScore;
        if (newStatus === "in_progress") score = maxScore * 0.5;
        targetCriterion = { ...c, compliance_status: newStatus, score_achieved: score, updated_at: new Date().toISOString() };
        return targetCriterion;
      }
      return c;
    });

    setCriteria(updated);
    try {
      localStorage.setItem(`erp_accreditation_${schoolCode}`, JSON.stringify(updated));
    } catch (e) {}

    if (supabase && targetCriterion) {
      try {
        await supabase
          .from("accreditation_criteria")
          .upsert({
            school_id: schoolCode,
            framework: targetCriterion.framework,
            criterion_code: targetCriterion.criterion_code,
            title: targetCriterion.title,
            description: targetCriterion.description,
            compliance_status: newStatus,
            score_weightage: targetCriterion.score_weightage,
            score_achieved: targetCriterion.score_achieved,
            updated_at: new Date().toISOString(),
          }, { onConflict: "school_id,criterion_code" });
      } catch (err) {
        console.warn("[Accreditation] Supabase sync notice:", err);
      }
    }

    showToast(`Compliance criterion updated to: ${newStatus}`, "info");
  };

  const readiness = useMemo(() => calculateReadinessScore(criteria), [criteria]);

  const filteredCriteria = useMemo(() => {
    return criteria.filter((c) => {
      const matchesSearch =
        (c.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.criterion_code || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFramework = selectedFramework === "ALL" || c.framework.includes(selectedFramework);
      const matchesStatus = statusFilter === "all" || c.compliance_status === statusFilter;
      return matchesSearch && matchesFramework && matchesStatus;
    });
  }, [criteria, searchQuery, selectedFramework, statusFilter]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 transition-colors duration-200">
      {/* HEADER BAR */}
      <div className="bg-white/90 dark:bg-slate-900/80 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Institutional Accreditation & Compliance Center
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-bold">
                {schoolCode}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Statutory verification across CBSE Affiliation Bye-Laws, NAAC Quality Framework, and RTE statutory standards.
            </p>
          </div>
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/30 hover:scale-105 transition-all cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          Export Institutional Audit Report
        </button>
      </div>

      {/* READINESS SCORECARD & KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/90 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 p-5 rounded-2xl col-span-2 sm:col-span-1">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Audit Readiness Index</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-purple-600 dark:text-purple-400">{readiness.percentage}%</span>
            <span className="text-xs text-emerald-500 font-bold">Institutional Benchmark</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${readiness.percentage}%` }}
            />
          </div>
        </div>

        <div className="bg-white/90 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 p-5 rounded-2xl">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Compliant Criteria</span>
          <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {readiness.compliantCount} <span className="text-xs text-slate-400">/ {readiness.totalCount}</span>
          </p>
          <span className="text-[10px] text-slate-400">Verified with official evidence</span>
        </div>

        <div className="bg-white/90 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 p-5 rounded-2xl">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Under Review</span>
          <p className="text-3xl font-black text-amber-500 mt-2">
            {readiness.totalCount - readiness.compliantCount}
          </p>
          <span className="text-[10px] text-slate-400">Awaiting department submission</span>
        </div>

        <div className="bg-white/90 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 p-5 rounded-2xl">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Expiring NOCs & Certificates</span>
          <p className="text-3xl font-black text-rose-500 mt-2">{readiness.expiringEvidences.length}</p>
          <span className="text-[10px] text-slate-400">Expiring &le; 30 days</span>
        </div>
      </div>

      {/* EXPIRING CERTIFICATE ALERT */}
      {readiness.expiringEvidences.length > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-2xl space-y-1.5">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs">
            <AlertTriangle className="w-4 h-4" />
            <span>Statutory Certificate Renewal Required</span>
          </div>
          <div className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
            {readiness.expiringEvidences.map((ee, i) => (
              <p key={i}>
                &bull; Criterion <span className="font-bold">{ee.criterion}</span>: <span className="font-semibold text-rose-500">{ee.title}</span> expires on {ee.expiryDate} ({ee.daysRemaining} days left).
              </p>
            ))}
          </div>
        </div>
      )}

      {/* FRAMEWORK FILTER & SEARCH */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white/80 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search criterion code, title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-purple-500 placeholder-slate-400"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <select
            value={selectedFramework}
            onChange={(e) => setSelectedFramework(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs rounded-xl px-3 py-2"
          >
            <option value="ALL">All Accreditation Frameworks</option>
            <option value="CBSE">CBSE Affiliation Bye-Laws</option>
            <option value="NAAC">NAAC Quality Criteria</option>
            <option value="RTE">RTE Statutory Norms</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs rounded-xl px-3 py-2"
          >
            <option value="all">All Statuses</option>
            <option value="compliant">Compliant</option>
            <option value="in_progress">In Progress</option>
            <option value="non_compliant">Non-Compliant</option>
          </select>
        </div>
      </div>

      {/* ACCREDITATION CHECKLIST MATRIX */}
      <div className="bg-white/90 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-bold">
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Criterion Title & Scope</th>
                <th className="py-3 px-4">Assigned Officer</th>
                <th className="py-3 px-4">Weightage</th>
                <th className="py-3 px-4">Evidence Repository</th>
                <th className="py-3 px-4">Status & Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {filteredCriteria.map((c) => {
                const isCompliant = c.compliance_status === "compliant";

                return (
                  <tr key={c.id}>
                    <td className="py-3.5 px-4 font-mono font-bold text-purple-600 dark:text-purple-400">
                      {c.criterion_code}
                    </td>
                    <td className="py-3.5 px-4 max-w-md">
                      <p className="font-bold text-slate-900 dark:text-white">{c.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{c.description}</p>
                      <span className="inline-block mt-1 text-[9px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-400">
                        {c.framework}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium">{c.assigned_officer}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                      {c.score_achieved} / {c.score_weightage} pts
                    </td>
                    <td className="py-3.5 px-4 space-y-1">
                      {c.evidence_documents?.map((doc, dIdx) => (
                        <div key={dIdx} className="flex items-center gap-1.5 text-[11px] text-blue-500">
                          <FileText className="w-3 h-3" />
                          <span>{doc.title}</span>
                          {doc.expiry_date && (
                            <span className="text-[10px] text-slate-400">(Exp: {doc.expiry_date})</span>
                          )}
                        </div>
                      ))}
                    </td>
                    <td className="py-3.5 px-4">
                      <select
                        value={c.compliance_status}
                        onChange={(e) => handleStatusToggle(c.id, e.target.value)}
                        className={`text-xs font-bold rounded-lg px-2.5 py-1 border focus:outline-none cursor-pointer ${
                          isCompliant
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                            : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                        }`}
                      >
                        <option value="compliant">Compliant ✓</option>
                        <option value="in_progress">In Progress ⏳</option>
                        <option value="non_compliant">Non-Compliant ✕</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

