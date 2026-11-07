import React, { useState, useEffect, useContext, useMemo } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { supabase } from "../supabaseClient";
import { getNextMemberId } from "../utils/idGenerator";
import { enrollMemberInCloud } from "../utils/cloudSyncService";
import { normalizeRole } from "../utils/credentials";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  CheckCircle,
  Clock,
  UserCheck,
  XCircle,
  Phone,
  Mail,
  Calendar,
  Layers,
  LayoutGrid,
  List,
  Sparkles,
  ArrowRight,
  TrendingUp,
  FileText,
  AlertCircle,
  X,
  MessageSquare,
  ShieldAlert,
  RefreshCw,
  Plus,
} from "lucide-react";

const STAGES = [
  { id: "new", label: "New Enquiry", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30", countColor: "bg-blue-500/20 text-blue-700 dark:text-blue-200" },
  { id: "followup", label: "Follow-Up Scheduled", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30", countColor: "bg-amber-500/20 text-amber-700 dark:text-amber-200" },
  { id: "enrolled", label: "Enrolled", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30", countColor: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-200" },
  { id: "lost", label: "Lost / Closed", color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30", countColor: "bg-rose-500/20 text-rose-700 dark:text-rose-200" },
];

const SOURCES = [
  "Campus Walk-in",
  "Website Inquiry",
  "Referral / Word-of-Mouth",
  "Social Media Ad",
  "Direct Phone Call",
  "Educational Fair",
];

const CLASSES = [
  "Class 1", "Class 2", "Class 3", "Class 4", "Class 5",
  "Class 6", "Class 7", "Class 8", "Class 9", "Class 10",
  "Class 11 - Science", "Class 11 - Commerce", "Class 11 - Arts",
  "Class 12 - Science", "Class 12 - Commerce", "Class 12 - Arts",
  "IIT-JEE Crash Course", "NEET Repeater Batch", "Foundation Batch"
];

const DEFAULT_LEADS = [];

export default function AdmissionsCRM() {
  const { user, tenant } = useContext(AppContext) || {};
  const { showToast } = useToast();

  const schoolCode = (
    user?.institution_code ||
    user?.school_id ||
    tenant?.code ||
    "CAMPUS-01"
  ).toUpperCase();

  const userRole = (user?.role || "").toLowerCase();
  const canonicalRole = normalizeRole(user?.role, user?.role_code || user?.personal_code || user?.id);
  const isAuthorized =
    ["PRIN", "HOD", "ACC", "NTS", "MASTER_OWNER"].includes(canonicalRole) ||
    ["admin", "super_admin", "principal", "trustee", "hod", "accountant", "staff", "prin", "acc", "nts"].includes(userRole);

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("kanban"); // 'kanban' | 'table'
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");

  // Lead Creation Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [convertingLeadId, setConvertingLeadId] = useState(null);

  // Interaction Drawer State
  const [selectedLeadForHistory, setSelectedLeadForHistory] = useState(null);
  const [interactions, setInteractions] = useState([]);
  const [newInteractionText, setNewInteractionText] = useState("");
  const [newInteractionType, setNewInteractionType] = useState("call");
  const [addingInteraction, setAddingInteraction] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    parentName: "",
    phone: "",
    email: "",
    targetClass: "Class 10",
    source: "Campus Walk-in",
    followUpDate: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
    notes: "",
    stage: "new",
  });

  useEffect(() => {
    loadLeads();
  }, [schoolCode]);

  const loadLeads = async () => {
    setLoading(true);
    let loaded = [];

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("admission_leads")
          .select("*")
          .eq("school_id", schoolCode)
          .order("created_at", { ascending: false });

        if (!error && data && data.length > 0) loaded = data;
      } catch (e) {
        console.warn("[AdmissionsCRM] Supabase query notice:", e);
      }
    }

    if (loaded.length === 0) {
      try {
        const storageKey = `erp_admissions_leads_${schoolCode}`;
        const saved = localStorage.getItem(storageKey);
        loaded = saved ? JSON.parse(saved) : DEFAULT_LEADS;
      } catch (e) {
        loaded = DEFAULT_LEADS;
      }
    }

    // Normalize field naming
    const normalized = loaded.map((l) => ({
      ...l,
      parentName: l.parentName || l.parent_name,
      targetClass: l.targetClass || l.target_class,
      followUpDate: l.followUpDate || l.follow_up_date,
      status: l.status || l.stage || "new",
      studentId: l.studentId || l.student_id,
    }));

    setLeads(normalized);
    setLoading(false);
  };

  const handleCreateLead = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      showToast("Please provide Student Name and Parent Phone number.", "error");
      return;
    }

    const payload = {
      id: `lead_${Date.now()}`,
      school_id: schoolCode,
      name: formData.name.trim(),
      parent_name: formData.parentName.trim() || "Guardian",
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      target_class: formData.targetClass,
      source: formData.source,
      stage: formData.stage || "new",
      follow_up_date: formData.followUpDate,
      notes: formData.notes.trim(),
      created_by: user?.name || "Admissions Officer",
      created_at: new Date().toISOString(),
    };

    if (supabase) {
      try {
        const { error: insErr } = await supabase.from("admission_leads").insert([payload]);
        if (insErr) throw insErr;
      } catch (err) {
        console.error("Admissions lead insert error:", err);
        showToast(err.message || "Failed to record enquiry in database.", "error");
        return;
      }
    }

    const normalizedNew = {
      ...payload,
      parentName: payload.parent_name,
      targetClass: payload.target_class,
      followUpDate: payload.follow_up_date,
      status: payload.stage,
    };

    const updated = [normalizedNew, ...leads];
    setLeads(updated);
    try {
      localStorage.setItem(`erp_admissions_leads_${schoolCode}`, JSON.stringify(updated));
    } catch (e) {}

    setIsModalOpen(false);
    setFormData({
      name: "",
      parentName: "",
      phone: "",
      email: "",
      targetClass: "Class 10",
      source: "Campus Walk-in",
      followUpDate: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
      notes: "",
      stage: "new",
    });
    showToast(`✅ New enquiry registered for ${normalizedNew.name}`, "success");
  };

  const handleUpdateStatus = async (leadId, newStatus) => {
    const updated = leads.map((l) => (l.id === leadId ? { ...l, status: newStatus, stage: newStatus } : l));
    setLeads(updated);

    if (supabase) {
      try {
        const { error: upErr } = await supabase
          .from("admission_leads")
          .update({ stage: newStatus, updated_at: new Date().toISOString() })
          .eq("id", leadId)
          .eq("school_id", schoolCode);
        if (upErr) throw upErr;
      } catch (e) {
        console.error("Admissions lead update error:", e);
        showToast(e.message || "Failed to update lead status.", "error");
        return;
      }
    }

    try {
      localStorage.setItem(`erp_admissions_leads_${schoolCode}`, JSON.stringify(updated));
    } catch (e) {}

    const stageLabel = STAGES.find((s) => s.id === newStatus)?.label || newStatus;
    showToast(`Lead pipeline stage moved to: ${stageLabel}`, "info");
  };

  const handleConvertToEnrollment = async (lead) => {
    if (lead.status === "enrolled") {
      showToast("This prospective student is already enrolled!", "info");
      return;
    }

    setConvertingLeadId(lead.id);

    try {
      let currentDir = [];
      try {
        const raw = localStorage.getItem(`erp_directory_${schoolCode}`);
        if (raw) currentDir = JSON.parse(raw);
      } catch (err) {}

      const nextStudentId = getNextMemberId("student", currentDir);

      // Attempt atomic RPC in Supabase
      let rpcSucceeded = false;
      if (supabase) {
        try {
          const { data, error } = await supabase.rpc("convert_admission_lead_to_student", {
            p_lead_id: lead.id,
            p_roll_number: nextStudentId,
            p_class_name: lead.targetClass,
            p_enrolled_by: user?.name || "Admissions Officer",
          });
          if (!error && data?.success) rpcSucceeded = true;
        } catch (rpcErr) {
          console.warn("[AdmissionsCRM] RPC attempt notice, using resilient fallback:", rpcErr);
        }
      }

      if (!rpcSucceeded) {
        // Resilient fallback client enrollment
        const enrolledMember = {
          name: lead.name,
          full_name: lead.name,
          role: "student",
          role_code: nextStudentId,
          roll_number: nextStudentId,
          personal_code: nextStudentId,
          class_name: lead.targetClass || "Class 10",
          parent_name: lead.parentName || "Guardian",
          phone: lead.phone,
          email: lead.email || `${nextStudentId.toLowerCase()}@${schoolCode.toLowerCase()}.edu`,
          address: lead.notes || "Enrolled via Admissions CRM",
          status: "Active",
          enrolled_date: new Date().toISOString(),
        };

        await enrollMemberInCloud({ schoolCode, member: enrolledMember });
      }

      const updated = leads.map((l) =>
        l.id === lead.id
          ? {
              ...l,
              status: "enrolled",
              stage: "enrolled",
              enrolledAt: new Date().toISOString(),
              studentId: nextStudentId,
            }
          : l
      );

      setLeads(updated);
      try {
        localStorage.setItem(`erp_admissions_leads_${schoolCode}`, JSON.stringify(updated));
      } catch (e) {}

      window.dispatchEvent(new Event("erp-directory-updated"));
      showToast(`🎉 Enrolled ${lead.name} as Student ID ${nextStudentId}! Added to active roster.`, "success", 5000);
    } catch (err) {
      showToast("Notice converting lead: " + err.message, "error");
    } finally {
      setConvertingLeadId(null);
    }
  };

  const openHistoryModal = (lead) => {
    setSelectedLeadForHistory(lead);
    const key = `erp_lead_interactions_${lead.id}`;
    try {
      const saved = localStorage.getItem(key);
      setInteractions(saved ? JSON.parse(saved) : [
        {
          id: "int_init",
          type: "note",
          details: `Enquiry logged from source: ${lead.source}. Initial notes: "${lead.notes || 'None'}"`,
          created_at: lead.created_at || new Date().toISOString(),
          conducted_by: "Admissions Reception",
        }
      ]);
    } catch (e) {
      setInteractions([]);
    }
  };

  const handleAddInteraction = (e) => {
    e.preventDefault();
    if (!newInteractionText.trim() || !selectedLeadForHistory) return;

    const newEntry = {
      id: `int_${Date.now()}`,
      lead_id: selectedLeadForHistory.id,
      type: newInteractionType,
      details: newInteractionText.trim(),
      created_at: new Date().toISOString(),
      conducted_by: user?.name || "Admissions Counselor",
    };

    const updated = [newEntry, ...interactions];
    setInteractions(updated);
    try {
      localStorage.setItem(`erp_lead_interactions_${selectedLeadForHistory.id}`, JSON.stringify(updated));
    } catch (e) {}

    setNewInteractionText("");
    showToast("Interaction logged to candidate timeline.", "success");
  };

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesSearch =
        (lead.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (lead.parentName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (lead.phone || "").includes(searchQuery) ||
        (lead.targetClass || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStage = stageFilter === "all" || lead.status === stageFilter;
      const matchesClass = classFilter === "all" || lead.targetClass === classFilter;
      return matchesSearch && matchesStage && matchesClass;
    });
  }, [leads, searchQuery, stageFilter, classFilter]);

  const metrics = useMemo(() => {
    const total = leads.length;
    const newCount = leads.filter((l) => l.status === "new").length;
    const followUpCount = leads.filter((l) => l.status === "followup").length;
    const enrolledCount = leads.filter((l) => l.status === "enrolled").length;
    const conversionRate = total > 0 ? Math.round((enrolledCount / total) * 100) : 0;
    return { total, newCount, followUpCount, enrolledCount, conversionRate };
  }, [leads]);

  if (!isAuthorized) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Permission Required</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Admissions CRM access is strictly limited to Campus Executive Leadership, Bursars, and designated Admissions Staff.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 transition-colors duration-200">
      {/* HEADER BAR */}
      <div className="bg-white/90 dark:bg-slate-900/80 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Admissions CRM & Enrollment Funnel
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-bold">
                {schoolCode}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Candidate pipeline, interaction timelines, follow-up scheduling, and atomic student roster enrollment.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <button
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "kanban"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Kanban
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "table"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Table
            </button>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition-all hover:scale-105 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            New Enquiry
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white/90 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Enquiries</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1.5">{metrics.total}</p>
          <span className="text-[10px] text-slate-400">All registered candidates</span>
        </div>

        <div className="bg-white/90 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-blue-500 font-medium">New Leads</span>
            <Sparkles className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1.5">{metrics.newCount}</p>
          <span className="text-[10px] text-slate-400">Awaiting counselor contact</span>
        </div>

        <div className="bg-white/90 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-500 font-medium">Follow-Ups</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1.5">{metrics.followUpCount}</p>
          <span className="text-[10px] text-slate-400">Active pipeline calls</span>
        </div>

        <div className="bg-white/90 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-500 font-medium">Enrolled</span>
            <UserCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5">{metrics.enrolledCount}</p>
          <span className="text-[10px] text-slate-400">Active students created</span>
        </div>

        <div className="bg-white/90 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 p-4 rounded-2xl col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-indigo-500 font-medium">Conversion</span>
            <TrendingUp className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1.5">{metrics.conversionRate}%</p>
          <span className="text-[10px] text-slate-400">Lead-to-student success</span>
        </div>
      </div>

      {/* FILTER & SEARCH */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white/80 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search candidate, parent, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-blue-500 placeholder-slate-400"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs rounded-xl px-3 py-2"
          >
            <option value="all">All Stages</option>
            {STAGES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>

          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs rounded-xl px-3 py-2"
          >
            <option value="all">All Classes</option>
            {CLASSES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KANBAN BOARD VIEW */}
      {viewMode === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {STAGES.map((stage) => {
            const stageLeads = filteredLeads.filter((l) => l.status === stage.id);
            return (
              <div
                key={stage.id}
                className="bg-white/80 dark:bg-slate-900/60 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-4 flex flex-col min-h-[500px]"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{stage.label}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${stage.countColor}`}>
                    {stageLeads.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto max-h-[650px] pr-1">
                  {stageLeads.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                      No candidates in this stage
                    </div>
                  ) : (
                    stageLeads.map((lead) => (
                      <div
                        key={lead.id}
                        className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{lead.name}</h4>
                            <p className="text-[11px] text-slate-400 mt-0.5">Parent: {lead.parentName}</p>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold">
                            {lead.targetClass}
                          </span>
                        </div>

                        <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                          <a href={`tel:${lead.phone}`} className="flex items-center gap-2 hover:text-blue-500 text-xs">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            {lead.phone}
                          </a>
                          <div className="flex items-center gap-2 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Follow-Up: {lead.followUpDate || "Not scheduled"}</span>
                          </div>
                        </div>

                        {lead.notes && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 p-2 rounded-xl border border-slate-200 dark:border-slate-800 line-clamp-2">
                            "{lead.notes}"
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/50">
                          <button
                            type="button"
                            onClick={() => openHistoryModal(lead)}
                            className="text-[10px] text-slate-500 hover:text-blue-500 font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <MessageSquare className="w-3 h-3" />
                            Timeline Log
                          </button>

                          {lead.status === "enrolled" ? (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> ID: {lead.studentId || "Active"}
                            </span>
                          ) : (
                            <button
                              onClick={() => handleConvertToEnrollment(lead)}
                              disabled={convertingLeadId === lead.id}
                              className="px-2.5 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg text-[10px] font-bold shadow-sm cursor-pointer disabled:opacity-50"
                            >
                              {convertingLeadId === lead.id ? "Enrolling..." : "Convert to Roster"}
                            </button>
                          )}
                        </div>

                        {lead.status !== "enrolled" && (
                          <div className="flex items-center gap-1 pt-1 text-[10px]">
                            <span className="text-slate-400">Move:</span>
                            {STAGES.filter((s) => s.id !== lead.status && s.id !== "enrolled").map((st) => (
                              <button
                                key={st.id}
                                onClick={() => handleUpdateStatus(lead.id, st.id)}
                                className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[9px] hover:bg-slate-200 dark:hover:bg-slate-600 cursor-pointer"
                              >
                                {st.label.split(" ")[0]}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TABLE VIEW */}
      {viewMode === "table" && (
        <div className="bg-white/90 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-bold">
                  <th className="py-3.5 px-4">Candidate</th>
                  <th className="py-3.5 px-4">Parent & Contact</th>
                  <th className="py-3.5 px-4">Target Class</th>
                  <th className="py-3.5 px-4">Source</th>
                  <th className="py-3.5 px-4">Next Follow-Up</th>
                  <th className="py-3.5 px-4">Stage</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {filteredLeads.map((lead) => {
                  const stage = STAGES.find((s) => s.id === lead.status) || STAGES[0];
                  return (
                    <tr key={lead.id}>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{lead.name}</td>
                      <td className="py-3.5 px-4">
                        <p>{lead.parentName}</p>
                        <a href={`tel:${lead.phone}`} className="text-blue-500 text-[11px]">{lead.phone}</a>
                      </td>
                      <td className="py-3.5 px-4 font-semibold">{lead.targetClass}</td>
                      <td className="py-3.5 px-4 text-slate-500">{lead.source}</td>
                      <td className="py-3.5 px-4 text-amber-500 font-medium">{lead.followUpDate || "—"}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${stage.color}`}>
                          {stage.label}
                        </span>
                        {lead.studentId && (
                          <span className="block text-[10px] text-emerald-500 font-bold mt-0.5">ID: {lead.studentId}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5">
                        <button
                          onClick={() => openHistoryModal(lead)}
                          className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          Timeline
                        </button>
                        {lead.status !== "enrolled" && (
                          <button
                            onClick={() => handleConvertToEnrollment(lead)}
                            disabled={convertingLeadId === lead.id}
                            className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50"
                          >
                            Convert
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TIMELINE LOG DRAWER */}
      {selectedLeadForHistory && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Interaction Timeline: {selectedLeadForHistory.name}
                </h3>
                <p className="text-xs text-slate-400">Target Class: {selectedLeadForHistory.targetClass}</p>
              </div>
              <button onClick={() => setSelectedLeadForHistory(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddInteraction} className="space-y-3">
              <div className="flex gap-2">
                <select
                  value={newInteractionType}
                  onChange={(e) => setNewInteractionType(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                >
                  <option value="call">📞 Phone Call</option>
                  <option value="visit">🏫 Campus Visit</option>
                  <option value="whatsapp">📱 WhatsApp</option>
                  <option value="note">📝 Internal Note</option>
                </select>
                <input
                  type="text"
                  required
                  placeholder="Record interaction notes (e.g. parent confirmed campus tour)..."
                  value={newInteractionText}
                  onChange={(e) => setNewInteractionText(e.target.value)}
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                >
                  Log
                </button>
              </div>
            </form>

            <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1">
              {interactions.map((it) => (
                <div key={it.id} className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-bold uppercase text-blue-500">{it.type}</span>
                    <span>{new Date(it.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-slate-800 dark:text-slate-200">{it.details}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CREATE LEAD MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Register New Admission Enquiry</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Candidate Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rohan Gupta"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Parent / Guardian *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mukesh Gupta"
                    value={formData.parentName}
                    onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98200 12345"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Target Class
                  </label>
                  <select
                    value={formData.targetClass}
                    onChange={(e) => setFormData({ ...formData, targetClass: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  >
                    {CLASSES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Enquiry Source
                </label>
                <select
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                >
                  {SOURCES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Remarks & Background
                </label>
                <textarea
                  rows={2}
                  placeholder="Notes from interaction, previous board marks, interests..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20"
                >
                  Save Enquiry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
