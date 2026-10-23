import React, { useState, useEffect, useContext, useMemo } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { getNextMemberId } from "../utils/idGenerator";
import { enrollMemberInCloud } from "../utils/cloudSyncService";
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
  X
} from "lucide-react";

const STAGES = [
  { id: "new", label: "New Enquiry", color: "bg-blue-500/20 text-blue-300 border-blue-500/40", countColor: "bg-blue-500/30 text-blue-200" },
  { id: "followup", label: "Follow-Up Scheduled", color: "bg-amber-500/20 text-amber-300 border-amber-500/40", countColor: "bg-amber-500/30 text-amber-200" },
  { id: "enrolled", label: "Enrolled", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40", countColor: "bg-emerald-500/30 text-emerald-200" },
  { id: "lost", label: "Lost / Closed", color: "bg-rose-500/20 text-rose-300 border-rose-500/40", countColor: "bg-rose-500/30 text-rose-200" },
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

export default function AdmissionsCRM() {
  const { user, tenant } = useContext(AppContext);
  const { showToast } = useToast();

  const schoolCode = (
    user?.institution_code ||
    user?.school_id ||
    tenant?.code ||
    "CAMPUS-01"
  ).toUpperCase();

  const [leads, setLeads] = useState([]);
  const [viewMode, setViewMode] = useState("kanban"); // 'kanban' | 'table'
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [convertingLeadId, setConvertingLeadId] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    parentName: "",
    phone: "",
    email: "",
    targetClass: "Class 10",
    source: "Campus Walk-in",
    followUpDate: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
    notes: "",
    status: "new",
  });

  // Load Leads from storage
  useEffect(() => {
    loadLeads();
  }, [schoolCode]);

  const loadLeads = () => {
    try {
      const storageKey = `erp_admissions_leads_${schoolCode}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setLeads(JSON.parse(saved));
      } else {
        // Sample starter leads if none exist
        const defaultLeads = [
          {
            id: `lead_${Date.now() - 50000}`,
            name: "Aarav Sharma",
            parentName: "Rajesh Sharma",
            phone: "+91 98201 44512",
            email: "rajesh.sharma@gmail.com",
            targetClass: "Class 10",
            source: "Campus Walk-in",
            followUpDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
            notes: "Interested in ICSE board syllabus and weekly mock tests.",
            status: "new",
            createdAt: new Date().toISOString(),
          },
          {
            id: `lead_${Date.now() - 30000}`,
            name: "Ananya Patel",
            parentName: "Sanjay Patel",
            phone: "+91 98765 21098",
            email: "sanjay.patel@outlook.com",
            targetClass: "Class 11 - Science",
            source: "Referral / Word-of-Mouth",
            followUpDate: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
            notes: "Wants information on NEET medical coaching track.",
            status: "followup",
            createdAt: new Date().toISOString(),
          },
        ];
        setLeads(defaultLeads);
        localStorage.setItem(storageKey, JSON.stringify(defaultLeads));
      }
    } catch (e) {
      console.warn("Could not load leads:", e);
    }
  };

  const saveLeadsToStorage = (updatedLeads) => {
    setLeads(updatedLeads);
    try {
      localStorage.setItem(`erp_admissions_leads_${schoolCode}`, JSON.stringify(updatedLeads));
    } catch (e) {
      console.error("Storage error:", e);
    }
  };

  // Create New Lead
  const handleCreateLead = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      showToast("Please provide Student Name and Parent Phone number.", "error");
      return;
    }

    const newLead = {
      id: `lead_${Date.now()}`,
      name: formData.name.trim(),
      parentName: formData.parentName.trim() || "Guardian",
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      targetClass: formData.targetClass,
      source: formData.source,
      followUpDate: formData.followUpDate,
      notes: formData.notes.trim(),
      status: formData.status || "new",
      createdAt: new Date().toISOString(),
    };

    const updated = [newLead, ...leads];
    saveLeadsToStorage(updated);
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
      status: "new",
    });
    showToast(`✅ New enquiry registered for ${newLead.name}`, "success");
  };

  // Change Lead Stage
  const handleUpdateStatus = (leadId, newStatus) => {
    const updated = leads.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l));
    saveLeadsToStorage(updated);
    const stageLabel = STAGES.find((s) => s.id === newStatus)?.label || newStatus;
    showToast(`Lead moved to: ${stageLabel}`, "info");
  };

  // 1-Click Conversion: Convert Lead to Enrolled Student
  const handleConvertToEnrollment = async (lead) => {
    if (lead.status === "enrolled") {
      showToast("This prospective student is already enrolled!", "info");
      return;
    }

    setConvertingLeadId(lead.id);

    try {
      // 1. Fetch current directory to calculate next roll number
      let currentDir = [];
      try {
        const raw = localStorage.getItem(`erp_directory_${schoolCode}`);
        if (raw) currentDir = JSON.parse(raw);
      } catch (err) {}

      // Calculate next sequential STU-* ID
      const nextStudentId = getNextMemberId("student", currentDir);

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

      // 2. Enroll member into Cloud and local store
      await enrollMemberInCloud({
        schoolCode,
        member: enrolledMember,
      });

      // 3. Mark lead as enrolled with timestamp and allocated ID
      const updated = leads.map((l) =>
        l.id === lead.id
          ? {
              ...l,
              status: "enrolled",
              enrolledAt: new Date().toISOString(),
              studentId: nextStudentId,
            }
          : l
      );
      saveLeadsToStorage(updated);

      // Trigger global directory refresh
      window.dispatchEvent(new Event("erp-directory-updated"));

      showToast(`🎉 Enrolled ${lead.name} as Student ID ${nextStudentId}! Added to active roster.`, "success", 5000);
    } catch (err) {
      console.error("Conversion error:", err);
      showToast("Encountered an issue converting lead. Please retry.", "error");
    } finally {
      setConvertingLeadId(null);
    }
  };

  // Filtered Leads
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

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const total = leads.length;
    const newCount = leads.filter((l) => l.status === "new").length;
    const followUpCount = leads.filter((l) => l.status === "followup").length;
    const enrolledCount = leads.filter((l) => l.status === "enrolled").length;
    const conversionRate = total > 0 ? Math.round((enrolledCount / total) * 100) : 0;

    return { total, newCount, followUpCount, enrolledCount, conversionRate };
  }, [leads]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Admissions & Enquiry CRM
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-medium">
                  {schoolCode}
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Track prospective students, schedule follow-ups, and convert leads with 1-click roster integration.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* View Toggle */}
          <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700/60">
            <button
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "kanban"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Kanban
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "table"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Table
            </button>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition-all hover:scale-105"
          >
            <UserPlus className="w-4 h-4" />
            New Enquiry
          </button>
        </div>
      </div>

      {/* Metric KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Total Enquiries</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2">{metrics.total}</p>
          <span className="text-[10px] text-slate-500">All registered leads</span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-blue-400 font-medium">New Leads</span>
            <Sparkles className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-blue-400 mt-2">{metrics.newCount}</p>
          <span className="text-[10px] text-slate-500">Awaiting contact</span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-400 font-medium">Follow-Ups</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400 mt-2">{metrics.followUpCount}</p>
          <span className="text-[10px] text-slate-500">Scheduled pipeline</span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-400 font-medium">Enrolled</span>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-2">{metrics.enrolledCount}</p>
          <span className="text-[10px] text-slate-500">Active students added</span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-indigo-400 font-medium">Conversion</span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-black text-indigo-400 mt-2">{metrics.conversionRate}%</p>
          <span className="text-[10px] text-slate-500">Lead-to-student success</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search candidate, parent or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800/80 border border-slate-700/80 text-white text-xs rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-blue-500 transition-all placeholder-slate-500"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="bg-slate-800 text-slate-300 border border-slate-700 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Stages</option>
            {STAGES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>

          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="bg-slate-800 text-slate-300 border border-slate-700 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Classes / Batches</option>
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
                className="bg-slate-900/60 rounded-xl border border-slate-800/80 p-3.5 flex flex-col min-h-[500px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white tracking-wide">{stage.label}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${stage.countColor}`}>
                      {stageLeads.length}
                    </span>
                  </div>
                </div>

                {/* Cards List */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[650px] pr-1">
                  {stageLeads.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg">
                      No leads in this stage
                    </div>
                  ) : (
                    stageLeads.map((lead) => (
                      <div
                        key={lead.id}
                        className="bg-slate-800/70 border border-slate-700/60 hover:border-slate-600 rounded-xl p-3.5 shadow-sm transition-all hover:shadow-md hover:bg-slate-800/90 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-sm font-bold text-white leading-tight">{lead.name}</h4>
                            <p className="text-[11px] text-slate-400 mt-0.5">Parent: {lead.parentName}</p>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                            {lead.targetClass}
                          </span>
                        </div>

                        {/* Contact details */}
                        <div className="space-y-1 text-xs text-slate-300">
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <a href={`tel:${lead.phone}`} className="hover:text-blue-400 text-xs">
                              {lead.phone}
                            </a>
                          </div>
                          {lead.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="w-3.5 h-3.5 text-slate-400" />
                              <span className="truncate text-xs text-slate-400">{lead.email}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-[11px] text-amber-400/90 font-medium">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Follow-Up: {lead.followUpDate || "Not scheduled"}</span>
                          </div>
                        </div>

                        {lead.notes && (
                          <p className="text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded-lg border border-slate-800 line-clamp-2">
                            "{lead.notes}"
                          </p>
                        )}

                        {/* Enrolled Badge or Conversion Action */}
                        {lead.status === "enrolled" ? (
                          <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                            <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5" /> Enrolled: {lead.studentId || "Active"}
                            </span>
                          </div>
                        ) : (
                          <div className="pt-2 border-t border-slate-700/50 flex flex-col gap-2">
                            {/* 1-Click Conversion Button */}
                            <button
                              onClick={() => handleConvertToEnrollment(lead)}
                              disabled={convertingLeadId === lead.id}
                              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              {convertingLeadId === lead.id ? "Enrolling..." : "Convert to Enrollment"}
                            </button>

                            {/* Stage Transition Selector */}
                            <div className="flex items-center justify-between gap-1 text-[10px]">
                              <span className="text-slate-400">Move to:</span>
                              <div className="flex items-center gap-1">
                                {STAGES.filter((s) => s.id !== lead.status && s.id !== "enrolled").map((st) => (
                                  <button
                                    key={st.id}
                                    onClick={() => handleUpdateStatus(lead.id, st.id)}
                                    className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-[10px] transition-all cursor-pointer"
                                  >
                                    {st.id === "followup" ? "Follow-Up" : st.label}
                                  </button>
                                ))}
                              </div>
                            </div>
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

      {/* TABULAR VIEW */}
      {viewMode === "table" && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-800/90 text-slate-300 border-b border-slate-700 font-bold">
                  <th className="py-3 px-4">Candidate Name</th>
                  <th className="py-3 px-4">Parent / Contact</th>
                  <th className="py-3 px-4">Target Class</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Next Follow-Up</th>
                  <th className="py-3 px-4">Pipeline Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-slate-300">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No matching leads found.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => {
                    const stage = STAGES.find((s) => s.id === lead.status) || STAGES[0];
                    return (
                      <tr key={lead.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-white text-sm">{lead.name}</p>
                          {lead.notes && (
                            <p className="text-[10px] text-slate-400 truncate max-w-xs">{lead.notes}</p>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="text-white font-medium">{lead.parentName}</p>
                          <a href={`tel:${lead.phone}`} className="text-blue-400 hover:underline flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3" /> {lead.phone}
                          </a>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-200">
                          {lead.targetClass}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">
                          {lead.source}
                        </td>
                        <td className="py-3.5 px-4 text-amber-300 font-medium">
                          {lead.followUpDate || "—"}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${stage.color}`}>
                            {stage.label}
                          </span>
                          {lead.studentId && (
                            <span className="block text-[10px] text-emerald-400 font-semibold mt-0.5">
                              ID: {lead.studentId}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {lead.status === "enrolled" ? (
                            <span className="text-emerald-400 font-semibold text-xs flex items-center justify-end gap-1">
                              <CheckCircle className="w-3.5 h-3.5" /> Enrolled
                            </span>
                          ) : (
                            <button
                              onClick={() => handleConvertToEnrollment(lead)}
                              disabled={convertingLeadId === lead.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              {convertingLeadId === lead.id ? "Enrolling..." : "Convert"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE NEW ENQUIRY MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Register New Enquiry</h3>
                  <p className="text-xs text-slate-400">Enter candidate and parent details</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Student / Candidate Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rohan Gupta"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Parent / Guardian Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mukesh Gupta"
                    value={formData.parentName}
                    onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Contact Phone Number <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98200 12345"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="parent@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Interested Class / Batch
                  </label>
                  <select
                    value={formData.targetClass}
                    onChange={(e) => setFormData({ ...formData, targetClass: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    {CLASSES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Next Follow-Up Date
                  </label>
                  <input
                    type="date"
                    value={formData.followUpDate}
                    onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Enquiry Source
                </label>
                <select
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  {SOURCES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Remarks / Academic Background
                </label>
                <textarea
                  rows={3}
                  placeholder="Notes from interaction, previous school marks, subjects of interest..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 cursor-pointer"
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

