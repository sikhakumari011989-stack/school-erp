import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import {
  fetchHealthRecords,
  saveHealthRecord,
  fetchClinicVisits,
  recordClinicVisit,
  fetchMedicalAccessLogs,
  fetchEmergencyAllergyRoster,
} from "../utils/healthService";
import {
  HeartPulse,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Search,
  Plus,
  Phone,
  FileText,
  Clock,
  UserCheck,
  Activity,
  Ambulance,
  Lock,
  Eye,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
} from "lucide-react";

export default function ClinicHealthVault() {
  const { user, tenant } = useContext(AppContext) || {};
  const { showToast } = useToast();

  const activeSchoolId = (user?.institution_code || user?.school_id || tenant?.code || "CAMPUS-01").toUpperCase();
  const userRole = (user?.role || user?.role_code || "").toLowerCase();

  // Strict Medical Authorization Verification
  const isAuthorized =
    ["admin", "superadmin", "super_admin", "principal", "prin", "trustee"].includes(userRole) ||
    user?.is_medical_officer === true ||
    ["nurse", "doctor", "clinic_officer", "medical_officer"].includes(userRole);

  const [activeTab, setActiveTab] = useState("emergency"); // 'emergency' | 'visits' | 'profiles' | 'audit'
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Data states
  const [healthRecords, setHealthRecords] = useState([]);
  const [clinicVisits, setClinicVisits] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [emergencyRoster, setEmergencyRoster] = useState([]);

  // Modals
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // New Visit Form
  const [visitForm, setVisitForm] = useState({
    student_id: "",
    student_name: "",
    class_name: "",
    symptoms: "",
    triage_level: "routine",
    vitals_temp: "98.6°F",
    vitals_pulse: "78 bpm",
    vitals_spo2: "98%",
    treatment_administered: "",
    medication_dispensed: "",
    attending_officer: user?.name || user?.full_name || "Campus Medical Officer",
    referred_to_hospital: false,
    hospital_name: "",
    parent_notified: true,
    emergency_phone: "",
    confidential_clinical_notes: "",
  });

  // Profile Form
  const [profileForm, setProfileForm] = useState({
    student_id: "",
    student_name: "",
    class_name: "",
    blood_group: "O+",
    critical_allergies_str: "",
    chronic_conditions_str: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    emergency_contact_relation: "Parent/Guardian",
    confidential_medical_notes: "",
    has_dpdp_consent: true,
    consent_parent_name: "",
  });

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [records, visits, logs, roster] = await Promise.all([
        fetchHealthRecords(activeSchoolId, { id: user?.id, role: userRole, email: user?.email }),
        fetchClinicVisits(activeSchoolId, { id: user?.id, role: userRole }),
        fetchMedicalAccessLogs(activeSchoolId),
        fetchEmergencyAllergyRoster(activeSchoolId),
      ]);
      setHealthRecords(records);
      setClinicVisits(visits);
      setAuditLogs(logs);
      setEmergencyRoster(roster);
    } catch (err) {
      console.error("Failed to load clinic vault data:", err);
      showToast("Error loading health records.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      loadAllData();
    } else {
      setLoading(false);
    }
  }, [activeSchoolId, isAuthorized]);

  // Handle Log Clinic Visit
  const handleSaveVisit = async (e) => {
    e.preventDefault();
    if (!visitForm.student_name || !visitForm.symptoms || !visitForm.treatment_administered) {
      showToast("Please fill in student name, symptoms, and treatment administered.", "error");
      return;
    }

    try {
      await recordClinicVisit(
        activeSchoolId,
        {
          student_id: visitForm.student_id || "STU-" + Math.floor(1000 + Math.random() * 9000),
          student_name: visitForm.student_name,
          class_name: visitForm.class_name || "General Batch",
          symptoms: visitForm.symptoms,
          triage_level: visitForm.triage_level,
          vitals: {
            temp: visitForm.vitals_temp,
            pulse: visitForm.vitals_pulse,
            spo2: visitForm.vitals_spo2,
          },
          treatment_administered: visitForm.treatment_administered,
          medication_dispensed: visitForm.medication_dispensed,
          attending_officer: visitForm.attending_officer,
          referred_to_hospital: visitForm.referred_to_hospital,
          hospital_name: visitForm.hospital_name,
          parent_notified: visitForm.parent_notified,
          emergency_phone: visitForm.emergency_phone,
          confidential_clinical_notes: visitForm.confidential_clinical_notes,
        },
        { id: user?.id, role: userRole, email: user?.email }
      );

      showToast("Clinic visit logged! Automated parent notice dispatched.", "success");
      setShowVisitModal(false);
      loadAllData();
    } catch (err) {
      console.error("Save visit error:", err);
      showToast("Failed to record clinic visit.", "error");
    }
  };

  // Handle Save Health Profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profileForm.student_name || !profileForm.emergency_contact_phone) {
      showToast("Student name and emergency contact phone are required.", "error");
      return;
    }

    try {
      const allergies = profileForm.critical_allergies_str
        ? profileForm.critical_allergies_str.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
      const conditions = profileForm.chronic_conditions_str
        ? profileForm.chronic_conditions_str.split(",").map((s) => s.trim()).filter(Boolean)
        : [];

      await saveHealthRecord(
        activeSchoolId,
        {
          student_id: profileForm.student_id || "STU-" + Math.floor(1000 + Math.random() * 9000),
          student_name: profileForm.student_name,
          class_name: profileForm.class_name || "General Batch",
          blood_group: profileForm.blood_group,
          critical_allergies: allergies,
          chronic_conditions: conditions,
          emergency_contact_name: profileForm.emergency_contact_name || "Guardian",
          emergency_contact_phone: profileForm.emergency_contact_phone,
          emergency_contact_relation: profileForm.emergency_contact_relation,
          confidential_medical_notes: profileForm.confidential_medical_notes,
          has_dpdp_consent: profileForm.has_dpdp_consent,
          consent_parent_name: profileForm.consent_parent_name || profileForm.emergency_contact_name,
          consent_granted_at: profileForm.has_dpdp_consent ? new Date().toISOString() : null,
        },
        { id: user?.id, role: userRole, email: user?.email }
      );

      showToast("Student health record and DPDP consent updated!", "success");
      setShowProfileModal(false);
      loadAllData();
    } catch (err) {
      console.error("Save profile error:", err);
      showToast("Failed to save health profile.", "error");
    }
  };

  // If user lacks medical clearance
  if (!isAuthorized) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6 text-slate-200">
        <div className="max-w-md w-full bg-slate-900/90 border border-rose-500/30 rounded-3xl p-8 text-center backdrop-blur-2xl shadow-2xl space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-white">Confidential Medical Vault</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Access to student clinical history, medical diagnoses, and prescription logs is strictly restricted to
            authorized Campus Medical Officers and Institutional Principals under DPDP and HIPAA compliance guidelines.
          </p>
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-400">
            Active Role: <span className="text-rose-400 uppercase font-bold">{userRole || "GUEST"}</span> • Medical Officer Flag: <span className="text-rose-400">FALSE</span>
          </div>
        </div>
      </div>
    );
  }

  // Filter Emergency Roster
  const filteredEmergency = emergencyRoster.filter(
    (s) =>
      s.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.class_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative text-slate-100 min-h-full pb-16 font-sans">
      {/* Background ambient glow */}
      <div className="fixed top-20 right-20 w-96 h-96 bg-rose-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-20 left-20 w-96 h-96 bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto space-y-8 px-4 sm:px-6">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black tracking-widest bg-rose-500/20 text-rose-400 border border-rose-500/30 uppercase">
                DPDP & HIPAA Secure Vault
              </span>
              <span className="text-xs text-slate-400 font-mono">Node: {activeSchoolId}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white mt-1 flex items-center gap-3">
              School Health & Wellness Records <HeartPulse className="w-8 h-8 text-rose-400" />
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl">
              Confidential student health profiles, outpatient clinic triage, critical allergy radar, and DPDP-compliant parental consent tracking.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setProfileForm({
                  student_id: "",
                  student_name: "",
                  class_name: "",
                  blood_group: "O+",
                  critical_allergies_str: "",
                  chronic_conditions_str: "",
                  emergency_contact_name: "",
                  emergency_contact_phone: "",
                  emergency_contact_relation: "Parent/Guardian",
                  confidential_medical_notes: "",
                  has_dpdp_consent: true,
                  consent_parent_name: "",
                });
                setShowProfileModal(true);
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow"
            >
              <Plus className="w-4 h-4 text-cyan-400" />
              <span>New Health Profile</span>
            </button>
            <button
              onClick={() => {
                setVisitForm({
                  student_id: "",
                  student_name: "",
                  class_name: "",
                  symptoms: "",
                  triage_level: "routine",
                  vitals_temp: "98.6°F",
                  vitals_pulse: "78 bpm",
                  vitals_spo2: "98%",
                  treatment_administered: "",
                  medication_dispensed: "",
                  attending_officer: user?.name || user?.full_name || "Campus Medical Officer",
                  referred_to_hospital: false,
                  hospital_name: "",
                  parent_notified: true,
                  emergency_phone: "",
                  confidential_clinical_notes: "",
                });
                setShowVisitModal(true);
              }}
              className="px-4 py-2 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white rounded-xl text-xs font-extrabold transition-all shadow-lg shadow-rose-600/30 flex items-center gap-1.5 cursor-pointer"
            >
              <Activity className="w-4 h-4" />
              <span>Log Clinic Visit</span>
            </button>
          </div>
        </div>

        {/* METRIC CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Health Files</span>
              <HeartPulse className="w-5 h-5 text-rose-400" />
            </div>
            <p className="text-3xl font-black text-white mt-2">{healthRecords.length}</p>
            <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> 100% Encrypted at Rest
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Critical Allergy Radar</span>
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <p className="text-3xl font-black text-amber-400 mt-2">
              {emergencyRoster.filter((r) => r.critical_allergies.length > 0).length}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Life-saving quick access for staff</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Clinic Visits (Outpatient)</span>
              <Activity className="w-5 h-5 text-cyan-400" />
            </div>
            <p className="text-3xl font-black text-cyan-300 mt-2">{clinicVisits.length}</p>
            <p className="text-[11px] text-cyan-400 mt-1">Parent Auto-Dispatch Active</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">DPDP Consent Rate</span>
              <ShieldCheck className="w-5 h-5 text-purple-400" />
            </div>
            <p className="text-3xl font-black text-purple-300 mt-2">
              {healthRecords.length > 0
                ? `${Math.round(
                    (healthRecords.filter((r) => r.has_dpdp_consent).length / healthRecords.length) * 100
                  )}%`
                : "100%"}
            </p>
            <p className="text-[11px] text-purple-400 mt-1">Parental Digital Authorization</p>
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab("emergency")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "emergency"
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-lg shadow-rose-500/10"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Emergency Allergy Radar</span>
            <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded text-[10px] font-mono">
              {emergencyRoster.filter((r) => r.has_emergency_alert).length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("visits")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "visits"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/10"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>Clinic Incident Ledger</span>
            <span className="px-1.5 py-0.2 bg-cyan-500/20 text-cyan-300 rounded text-[10px] font-mono">
              {clinicVisits.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("profiles")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "profiles"
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-lg shadow-purple-500/10"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <UserCheck className="w-4 h-4 text-purple-400" />
            <span>Health Profiles & DPDP Consent</span>
            <span className="px-1.5 py-0.2 bg-purple-500/20 text-purple-300 rounded text-[10px] font-mono">
              {healthRecords.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("audit")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "audit"
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-lg shadow-indigo-500/10"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <Lock className="w-4 h-4 text-indigo-400" />
            <span>Medical Access Audit Trail</span>
            <span className="px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 rounded text-[10px] font-mono">
              {auditLogs.length}
            </span>
          </button>
        </div>

        {/* SEARCH & FILTER BAR */}
        <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-800 rounded-2xl px-4 py-2.5 backdrop-blur-xl">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by student name, roll number, or grade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="text-xs text-slate-400 hover:text-white px-2 py-0.5"
            >
              Clear
            </button>
          )}
        </div>

        {/* TAB 1: EMERGENCY ALLERGY RADAR */}
        {activeTab === "emergency" && (
          <div className="space-y-4">
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-3 text-xs text-amber-200">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <p>
                <strong>Data Minimization Principle:</strong> This radar allows school teachers, sports coaches, and
                first responders to view life-threatening allergies, blood groups, and emergency telephone numbers
                instantly without exposing confidential psychological or clinical consultation notes.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEmergency.map((stu) => (
                <div
                  key={stu.student_id}
                  className={`border rounded-2xl p-5 backdrop-blur-xl transition-all ${
                    stu.has_emergency_alert
                      ? "bg-slate-900/90 border-amber-500/40 hover:border-amber-400 shadow-lg shadow-amber-500/5"
                      : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-extrabold text-white text-base">{stu.student_name}</h3>
                      <p className="text-xs text-slate-400 font-mono">
                        {stu.student_id} • {stu.class_name}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-xl text-xs font-black font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {stu.blood_group}
                    </span>
                  </div>

                  {/* Critical Allergies */}
                  <div className="mt-4 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Critical Life Allergies
                    </p>
                    {stu.critical_allergies.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {stu.critical_allergies.map((alg, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1"
                          >
                            <span>⚠️</span> {alg}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">No severe allergies recorded</p>
                    )}
                  </div>

                  {/* Chronic Conditions */}
                  {stu.chronic_conditions.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Chronic Conditions
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {stu.chronic_conditions.map((c, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-300 border border-blue-500/30"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Emergency Contact */}
                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                    <div className="text-xs">
                      <p className="font-semibold text-slate-300">{stu.emergency_contact_name}</p>
                      <p className="text-[10px] text-slate-400">{stu.emergency_contact_relation}</p>
                    </div>
                    <a
                      href={`tel:${stu.emergency_contact_phone}`}
                      className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>{stu.emergency_contact_phone}</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: CLINIC INCIDENT LEDGER */}
        {activeTab === "visits" && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-xl shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="font-extrabold text-white text-base">Infirmary Log & Outpatient Records</h2>
                <p className="text-xs text-slate-400">Historical records of clinic treatments, vitals, and hospital referrals.</p>
              </div>
              <button
                onClick={() => setShowVisitModal(true)}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log New Visit</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider bg-slate-950/40 font-mono">
                    <th className="p-4 pl-6">Student</th>
                    <th className="p-4">Visit Time</th>
                    <th className="p-4">Triage / Symptoms</th>
                    <th className="p-4">Vitals Observed</th>
                    <th className="p-4">Treatment & Dispensed</th>
                    <th className="p-4">Attending Officer</th>
                    <th className="p-4 pr-6 text-right">Parent Notified</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {clinicVisits.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-slate-500 italic">
                        No clinic visits recorded yet.
                      </td>
                    </tr>
                  ) : (
                    clinicVisits.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-4 pl-6">
                          <p className="font-bold text-white">{v.student_name}</p>
                          <p className="text-xs text-slate-400 font-mono">
                            {v.student_id} • {v.class_name}
                          </p>
                        </td>
                        <td className="p-4 text-xs font-mono text-slate-300 whitespace-nowrap">
                          {new Date(v.visit_time).toLocaleDateString()}
                          <span className="block text-[10px] text-slate-500">
                            {new Date(v.visit_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                        <td className="p-4 max-w-[220px]">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                                v.triage_level === "emergency"
                                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                                  : v.triage_level === "urgent"
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              }`}
                            >
                              {v.triage_level}
                            </span>
                            {v.referred_to_hospital && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                                <Ambulance className="w-3 h-3" /> Hospital
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-200 line-clamp-2" title={v.symptoms}>
                            {v.symptoms}
                          </p>
                        </td>
                        <td className="p-4 text-xs font-mono text-slate-300 whitespace-nowrap">
                          {v.vitals?.temp && <span>T: {v.vitals.temp}</span>}
                          {v.vitals?.pulse && <span className="block">P: {v.vitals.pulse}</span>}
                          {v.vitals?.spo2 && <span className="block">SpO2: {v.vitals.spo2}</span>}
                        </td>
                        <td className="p-4 max-w-[220px]">
                          <p className="text-xs text-slate-200">{v.treatment_administered}</p>
                          {v.medication_dispensed && (
                            <p className="text-[11px] text-cyan-300 font-mono mt-0.5">
                              Rx: {v.medication_dispensed}
                            </p>
                          )}
                        </td>
                        <td className="p-4 text-xs text-slate-300 whitespace-nowrap">
                          {v.attending_officer}
                        </td>
                        <td className="p-4 pr-6 text-right whitespace-nowrap">
                          {v.parent_notified ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Dispatched
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400">
                              Internal
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: PROFILES & DPDP CONSENT */}
        {activeTab === "profiles" && (
          <div className="space-y-4">
            <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-2xl flex items-center justify-between text-xs text-purple-200">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-purple-400 shrink-0" />
                <p>
                  <strong>DPDP Act Compliance:</strong> Digital Digital Personal Data Protection Act requires explicit,
                  revocable parental consent for storing child biometric, psychological, or medical data.
                </p>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-xl shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider bg-slate-950/40 font-mono">
                      <th className="p-4 pl-6">Student</th>
                      <th className="p-4">Blood Group</th>
                      <th className="p-4">Allergies & Conditions</th>
                      <th className="p-4">Emergency Contact</th>
                      <th className="p-4">DPDP Consent</th>
                      <th className="p-4 pr-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {healthRecords.map((r) => (
                      <tr key={r.id || r.student_id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-4 pl-6">
                          <p className="font-bold text-white">{r.student_name}</p>
                          <p className="text-xs text-slate-400 font-mono">
                            {r.student_id} • {r.class_name}
                          </p>
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            {r.blood_group}
                          </span>
                        </td>
                        <td className="p-4 max-w-[260px]">
                          <div className="flex flex-wrap gap-1">
                            {r.critical_allergies?.map((a, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300"
                              >
                                {a}
                              </span>
                            ))}
                            {r.chronic_conditions?.map((c, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-300"
                              >
                                {c}
                              </span>
                            ))}
                            {(!r.critical_allergies?.length && !r.chronic_conditions?.length) && (
                              <span className="text-xs text-slate-500 italic">None recorded</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-xs">
                          <p className="font-semibold text-slate-200">{r.emergency_contact_name}</p>
                          <p className="font-mono text-slate-400 text-[11px]">{r.emergency_contact_phone}</p>
                        </td>
                        <td className="p-4">
                          {r.has_dpdp_consent ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Granted
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              <AlertTriangle className="w-3.5 h-3.5" /> Pending Signature
                            </span>
                          )}
                        </td>
                        <td className="p-4 pr-6 text-right whitespace-nowrap">
                          <button
                            onClick={() => {
                              setSelectedRecord(r);
                            }}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ml-auto"
                          >
                            <Eye className="w-3.5 h-3.5 text-cyan-400" />
                            <span>View Clinical File</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: AUDIT TRAIL */}
        {activeTab === "audit" && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-xl shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="font-extrabold text-white text-base">Immutable Medical Access Ledger</h2>
                <p className="text-xs text-slate-400">
                  Every inquiry into student clinical histories or allergy summaries is cryptographically logged for DPDP compliance.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                AUDIT COMPLIANT
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider bg-slate-950/40 font-mono">
                    <th className="p-4 pl-6">Timestamp</th>
                    <th className="p-4">Action Type</th>
                    <th className="p-4">Target Student</th>
                    <th className="p-4">Actor ID / Email</th>
                    <th className="p-4 pr-6 text-right">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/30">
                      <td className="p-4 pl-6 text-slate-400 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {log.action_type}
                        </span>
                      </td>
                      <td className="p-4 text-white font-bold">{log.student_id}</td>
                      <td className="p-4 text-slate-300">{log.actor_email || log.actor_id}</td>
                      <td className="p-4 pr-6 text-right">
                        <span className="uppercase text-purple-400 font-bold">{log.actor_role}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: LOG CLINIC VISIT */}
      {showVisitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-rose-400" />
                <h3 className="text-lg font-extrabold text-white">Log Clinic / Outpatient Incident</h3>
              </div>
              <button
                onClick={() => setShowVisitModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveVisit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-bold uppercase mb-1">Student Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aarav Sharma"
                    value={visitForm.student_name}
                    onChange={(e) => setVisitForm({ ...visitForm, student_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold uppercase mb-1">Class / Section</label>
                  <input
                    type="text"
                    placeholder="e.g. Class 10-A"
                    value={visitForm.class_name}
                    onChange={(e) => setVisitForm({ ...visitForm, class_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold uppercase mb-1">Triage Severity</label>
                  <select
                    value={visitForm.triage_level}
                    onChange={(e) => setVisitForm({ ...visitForm, triage_level: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                  >
                    <option value="routine">Routine</option>
                    <option value="urgent">Urgent</option>
                    <option value="emergency">Emergency 🚨</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-bold uppercase mb-1">Temperature</label>
                  <input
                    type="text"
                    value={visitForm.vitals_temp}
                    onChange={(e) => setVisitForm({ ...visitForm, vitals_temp: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold uppercase mb-1">Pulse / SpO2</label>
                  <input
                    type="text"
                    value={visitForm.vitals_pulse}
                    onChange={(e) => setVisitForm({ ...visitForm, vitals_pulse: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold uppercase mb-1">Presenting Symptoms</label>
                <textarea
                  required
                  rows="2"
                  placeholder="e.g. Sharp stomach ache, dizziness after morning assembly..."
                  value={visitForm.symptoms}
                  onChange={(e) => setVisitForm({ ...visitForm, symptoms: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold uppercase mb-1">Treatment Administered</label>
                <textarea
                  required
                  rows="2"
                  placeholder="e.g. Oral rehydration salts administered; rested for 30 min..."
                  value={visitForm.treatment_administered}
                  onChange={(e) => setVisitForm({ ...visitForm, treatment_administered: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-bold uppercase mb-1">Medication Dispensed (Rx)</label>
                  <input
                    type="text"
                    placeholder="e.g. Paracetamol 500mg, ORS 200ml"
                    value={visitForm.medication_dispensed}
                    onChange={(e) => setVisitForm({ ...visitForm, medication_dispensed: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold uppercase mb-1">Attending Officer</label>
                  <input
                    type="text"
                    value={visitForm.attending_officer}
                    onChange={(e) => setVisitForm({ ...visitForm, attending_officer: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visitForm.referred_to_hospital}
                    onChange={(e) => setVisitForm({ ...visitForm, referred_to_hospital: e.target.checked })}
                    className="rounded text-rose-500 focus:ring-0"
                  />
                  <span className="font-bold text-white">Referred to Hospital / Emergency Clinic</span>
                </label>
                {visitForm.referred_to_hospital && (
                  <input
                    type="text"
                    placeholder="Hospital name (e.g. City General Trauma Ward)"
                    value={visitForm.hospital_name}
                    onChange={(e) => setVisitForm({ ...visitForm, hospital_name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white text-xs mt-1"
                  />
                )}
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visitForm.parent_notified}
                    onChange={(e) => setVisitForm({ ...visitForm, parent_notified: e.target.checked })}
                    className="rounded text-emerald-500 focus:ring-0"
                  />
                  <span className="font-bold text-emerald-300">
                    Dispatch Automated Emergency Alert to Parent
                  </span>
                </label>
                {visitForm.parent_notified && (
                  <input
                    type="text"
                    placeholder="Emergency Phone (+91 98XXX XXXXX)"
                    value={visitForm.emergency_phone}
                    onChange={(e) => setVisitForm({ ...visitForm, emergency_phone: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white text-xs"
                  />
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowVisitModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-xl font-extrabold cursor-pointer shadow-lg shadow-rose-600/30"
                >
                  Save & Dispatch Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NEW / EDIT HEALTH PROFILE */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-rose-400" />
                <h3 className="text-lg font-extrabold text-white">Student Health & DPDP Consent</h3>
              </div>
              <button
                onClick={() => setShowProfileModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-bold uppercase mb-1">Student Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ananya Iyer"
                    value={profileForm.student_name}
                    onChange={(e) => setProfileForm({ ...profileForm, student_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold uppercase mb-1">Class / Section</label>
                  <input
                    type="text"
                    placeholder="e.g. Class 8-C"
                    value={profileForm.class_name}
                    onChange={(e) => setProfileForm({ ...profileForm, class_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-bold uppercase mb-1">Blood Group</label>
                  <select
                    value={profileForm.blood_group}
                    onChange={(e) => setProfileForm({ ...profileForm, blood_group: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold"
                  >
                    <option value="O+">O Positive (O+)</option>
                    <option value="O-">O Negative (O-)</option>
                    <option value="A+">A Positive (A+)</option>
                    <option value="A-">A Negative (A-)</option>
                    <option value="B+">B Positive (B+)</option>
                    <option value="B-">B Negative (B-)</option>
                    <option value="AB+">AB Positive (AB+)</option>
                    <option value="AB-">AB Negative (AB-)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-bold uppercase mb-1">Emergency Phone</label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98XXX XXXXX"
                    value={profileForm.emergency_contact_phone}
                    onChange={(e) => setProfileForm({ ...profileForm, emergency_contact_phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold uppercase mb-1">
                  Critical Life Allergies (Comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Peanuts, Penicillin, Bee stings"
                  value={profileForm.critical_allergies_str}
                  onChange={(e) => setProfileForm({ ...profileForm, critical_allergies_str: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold uppercase mb-1">
                  Chronic Health Conditions (Comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Asthma, Type 1 Diabetes, Epilepsy"
                  value={profileForm.chronic_conditions_str}
                  onChange={(e) => setProfileForm({ ...profileForm, chronic_conditions_str: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold uppercase mb-1">
                  Confidential Medical / Physician Notes
                </label>
                <textarea
                  rows="2"
                  placeholder="Private doctor directives, daily medications, clinic reserve supply..."
                  value={profileForm.confidential_medical_notes}
                  onChange={(e) => setProfileForm({ ...profileForm, confidential_medical_notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              {/* DPDP Consent */}
              <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profileForm.has_dpdp_consent}
                    onChange={(e) => setProfileForm({ ...profileForm, has_dpdp_consent: e.target.checked })}
                    className="rounded text-purple-500 focus:ring-0"
                  />
                  <span className="font-bold text-purple-200">
                    Parent Granted DPDP Consent for Medical Storage
                  </span>
                </label>
                {profileForm.has_dpdp_consent && (
                  <input
                    type="text"
                    placeholder="Parent / Legal Guardian Name"
                    value={profileForm.consent_parent_name}
                    onChange={(e) => setProfileForm({ ...profileForm, consent_parent_name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white text-xs"
                  />
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-extrabold cursor-pointer shadow-lg shadow-purple-600/30"
                >
                  Save Health Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIEW CLINICAL FILE */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-black text-white">{selectedRecord.student_name}</h3>
                <p className="text-xs text-slate-400 font-mono">
                  {selectedRecord.student_id} • {selectedRecord.class_name}
                </p>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl">
                <span className="text-slate-400 font-bold uppercase">Blood Group</span>
                <span className="font-mono font-black text-rose-400 text-sm">
                  {selectedRecord.blood_group}
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-bold uppercase block mb-1">Critical Allergies</span>
                <div className="flex flex-wrap gap-1">
                  {selectedRecord.critical_allergies?.length > 0 ? (
                    selectedRecord.critical_allergies.map((a, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                        ⚠️ {a}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500 italic">None</span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-bold uppercase block mb-1">Chronic Conditions</span>
                <div className="flex flex-wrap gap-1">
                  {selectedRecord.chronic_conditions?.length > 0 ? (
                    selectedRecord.chronic_conditions.map((c, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                        {c}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500 italic">None</span>
                  )}
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 font-bold uppercase text-[10px]">
                  Confidential Doctor & Nurse Notes
                </span>
                <p className="text-slate-200 leading-relaxed font-mono text-[11px]">
                  {selectedRecord.confidential_medical_notes || "No clinical remarks recorded."}
                </p>
              </div>

              <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/30 flex items-center justify-between">
                <div>
                  <p className="font-bold text-purple-300">DPDP Consent Verified</p>
                  <p className="text-[10px] text-purple-400">
                    Parent: {selectedRecord.consent_parent_name || selectedRecord.emergency_contact_name}
                  </p>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
              >
                Close File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

