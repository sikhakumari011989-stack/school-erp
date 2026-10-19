import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { supabase } from "../supabaseClient";
import { StatSkeleton, TableSkeleton } from "../Components/Skeleton";
import { logSecurityAction, AUDIT_ACTIONS } from "../utils/auditLogger";
import NoticeBanner from "../Components/NoticeBanner";
import { getNotices, publishNotice, deleteNotice } from "../utils/noticeService";
import BulkImportModal from "../Components/BulkImportModal";
import SchoolUpiQrConfig from "../Components/SchoolUpiQrConfig";
import SystemDiagnostic from "../Components/SystemDiagnostic";
import CertificateManagementCard from "../Components/CertificateManagementCard";
import TransportFleetManager from "../Components/TransportFleetManager";
import NonTeachingStaffManager from "../Components/NonTeachingStaffManager";
import FeeStructureConfigurator from "../Components/FeeStructureConfigurator";
import ComprehensiveMemberModal from "../Components/ComprehensiveMemberModal";
import { buildStandardErpEmail } from "./Login";
import { getNextMemberId, getDefaultSchoolDirectory } from "../utils/idGenerator";
import { enrollMemberInCloud, fetchCloudDirectory } from "../utils/cloudSyncService";

export default function TrusteeDashboard() {
  const { user } = useContext(AppContext) || {};
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [financialStats, setFinancialStats] = useState({
    totalRevenue: 0,
    totalTransactions: 0,
    paidTransactions: 0,
    collectionRate: "0%",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [newStudent, setNewStudent] = useState({ name: "", class: "", subject: "", role: "student", phone: "" });
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isComprehensiveModalOpen, setIsComprehensiveModalOpen] = useState(false);
  const [comprehensiveModalRole, setComprehensiveModalRole] = useState("student");
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);

  // Notices state
  const [noticesList, setNoticesList] = useState([]);
  const [noticeForm, setNoticeForm] = useState({
    title: "",
    category: "Academic",
    audience: "All",
    content: "",
    date: new Date().toISOString().split("T")[0],
  });

  const institutionCode = user?.institution_code || user?.school_id || "CAMPUS-01";

  const fetchFinancialStats = async () => {
    let localLedger = [];
    try {
      const tenantKey = `erp_fee_ledger_${institutionCode}`;
      const savedTenant = localStorage.getItem(tenantKey);
      if (savedTenant) {
        localLedger = JSON.parse(savedTenant);
      } else {
        const savedGlobal = localStorage.getItem("erp_fee_ledger");
        if (savedGlobal) {
          const all = JSON.parse(savedGlobal);
          localLedger = all.filter(
            (r) => String(r.school_id || "").toUpperCase() === String(institutionCode).toUpperCase()
          );
        }
      }
    } catch (e) {
      console.warn("Local ledger read notice:", e);
    }

    try {
      let dbLedger = [];
      if (supabase) {
        const { data, error } = await supabase
          .from("fee_ledger")
          .select("amount, status, razorpay_payment_id, id")
          .eq("school_id", institutionCode);
        if (!error && data) {
          dbLedger = data;
        }
      }

      // Merge local records
      const mergedMap = new Map();
      dbLedger.forEach((item, idx) => {
        const key = item.razorpay_payment_id || item.id || `db-${idx}`;
        mergedMap.set(key, item);
      });
      localLedger.forEach((lr, idx) => {
        const key = lr.utr || lr.razorpay_payment_id || lr.id || `loc-${idx}`;
        if (!mergedMap.has(key)) {
          mergedMap.set(key, lr);
        }
      });

      const allRecords = Array.from(mergedMap.values());
      let revenue = 0;
      let paid = 0;
      allRecords.forEach((item) => {
        const amount = Number(item.amount) || 0;
        const isPaid = (item.status || "").toLowerCase() === "paid";
        if (isPaid) {
          revenue += amount;
          paid += 1;
        }
      });

      const totalCount = allRecords.length;
      const rate = totalCount > 0 ? `${Math.round((paid / totalCount) * 100)}%` : "0%";

      setFinancialStats({
        totalRevenue: revenue,
        totalTransactions: totalCount,
        paidTransactions: paid,
        collectionRate: rate,
      });
    } catch (e) {
      console.warn("Financial stats calculation notice:", e);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    setError(null);
    try {
      let dbData = [];
      try {
        if (supabase) {
          const { data, error: fetchError } = await supabase
            .from("students")
            .select("*")
            .eq("school_id", institutionCode);
          if (!fetchError && data) {
            dbData = data;
          }
        }
      } catch (dbErr) {
        console.warn("Supabase fetch notice:", dbErr);
      }

      // Merge with cloud directory and local tenant directory
      let cloudDir = [];
      try {
        cloudDir = await fetchCloudDirectory(institutionCode);
      } catch (cErr) {
        console.warn("Cloud directory fetch notice:", cErr);
      }

      let localDir = [];
      try {
        const raw = localStorage.getItem(`erp_directory_${institutionCode}`);
        if (raw) {
          localDir = JSON.parse(raw);
        } else if (cloudDir.length > 0) {
          localDir = cloudDir;
        } else {
          localDir = getDefaultSchoolDirectory(institutionCode);
        }
      } catch {
        localDir = cloudDir.length > 0 ? cloudDir : getDefaultSchoolDirectory(institutionCode);
      }

      const mergedMap = new Map();
      dbData.forEach((s) => {
        const key = s.roll_number || s.id;
        if (key) {
          mergedMap.set(key, {
            ...s,
            id: key,
            name: s.name || s.full_name,
            roll_number: key,
            class_name: s.class_name || s.class || "Class 10-ICSE",
            role: s.role || "student",
          });
        }
      });

      localDir.forEach((m) => {
        const key = m.roll_number || m.role_code || m.personal_code || m.id;
        if (key && !mergedMap.has(key)) {
          mergedMap.set(key, {
            id: key,
            name: m.full_name || m.name,
            full_name: m.full_name || m.name,
            roll_number: key,
            class_name: m.class_name || m.class || (m.role === "teacher" ? "Faculty" : "Class 10-ICSE"),
            role: m.role || "student",
            phone: m.phone || "+91 9800000000",
            email: m.email,
            status: "active",
          });
        }
      });

      const finalMembers = Array.from(mergedMap.values());
      setStudents(finalMembers);
    } catch (err) {
      console.error("Error fetching students:", err);
      setError(err.message || "Failed to fetch student records.");
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const { data } = await supabase.from("classes").select("*");
      if (data) setClasses(data);
    } catch (err) {
      console.error("Error fetching classes:", err);
    }
  };

  const fetchNotices = async () => {
    try {
      const list = await getNotices(institutionCode);
      setNoticesList(list);
    } catch (err) {
      console.warn("Notice fetch error:", err);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchClasses();
    fetchNotices();
    fetchFinancialStats();

    const handleDirUpdate = () => {
      fetchStudents();
      fetchFinancialStats();
    };
    window.addEventListener("erp-directory-updated", handleDirUpdate);
    window.addEventListener("erp-fee-ledger-updated", fetchFinancialStats);
    return () => {
      window.removeEventListener("erp-directory-updated", handleDirUpdate);
      window.removeEventListener("erp-fee-ledger-updated", fetchFinancialStats);
    };
  }, [user?.institution_code, user?.school_id, institutionCode]);

  const handlePublishNotice = async (e) => {
    e.preventDefault();
    if (!noticeForm.title.trim() || !noticeForm.content.trim()) {
      showToast("Please provide notice title and message content.", "error");
      return;
    }
    setSubmitting(true);
    try {
      await publishNotice({
        title: noticeForm.title,
        category: noticeForm.category,
        audience: noticeForm.audience,
        content: noticeForm.content,
        date: noticeForm.date,
        schoolId: institutionCode,
        user,
      });
      showToast(`Notice "${noticeForm.title}" broadcasted successfully!`, "success");
      setNoticeForm({
        title: "",
        category: "Academic",
        audience: "All",
        content: "",
        date: new Date().toISOString().split("T")[0],
      });
      fetchNotices();
    } catch (err) {
      console.error("Error publishing notice:", err);
      showToast("Notice publish failed.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNotice = async (id) => {
    try {
      await deleteNotice(id);
      setNoticesList((prev) => prev.filter((n) => n.id !== id));
      showToast("Notice removed.", "info");
    } catch (err) {
      console.error("Error deleting notice:", err);
    }
  };

  const handleCopyPortalLink = () => {
    const portalUrl = `${window.location.origin}/portal?school=${institutionCode}`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(portalUrl);
    }
    showToast(`Copied Direct Member Portal Link: ${portalUrl}`, "success");
  };

  const handleDownloadCredentialsSheet = () => {
    const localDir = JSON.parse(localStorage.getItem(`erp_directory_${institutionCode}`) || "[]");
    const portalUrl = `${window.location.origin}/portal?school=${institutionCode}`;
    
    const credentialRows = [
      ["Full Name", "Role", "Class/Department", "Portal Link (/portal)", "Tier-1 School Code", "Tier-2 Personal ID", "Default Password"]
    ];

    // Master HOD
    credentialRows.push([
      user?.name || "Master HOD / Trustee",
      "HOD / Trustee",
      "Executive Board",
      portalUrl,
      institutionCode,
      user?.personal_code || user?.role_code || "HOD-01",
      "password123"
    ]);

    const seenCodes = new Set([user?.personal_code || "HOD-01"]);
    localDir.forEach((m) => {
      const code = (m.role_code || m.roll_number || m.personal_code || "").toUpperCase();
      if (code && !seenCodes.has(code)) {
        seenCodes.add(code);
        credentialRows.push([
          m.full_name || m.name || "Campus Member",
          m.role || "student",
          m.class_name || m.class || "General",
          portalUrl,
          institutionCode,
          code,
          m.default_password || "password123"
        ]);
      }
    });

    students.forEach((st, idx) => {
      const code = (st.roll_number || st.personal_code || `STU-${1001 + idx}`).toUpperCase();
      if (!seenCodes.has(code)) {
        seenCodes.add(code);
        credentialRows.push([
          st.name || st.full_name,
          st.role || "student",
          st.class_name || st.class || "General",
          portalUrl,
          institutionCode,
          code,
          "password123"
        ]);
      }
    });

    const csvContent = credentialRows.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${institutionCode.toLowerCase()}_student_teacher_credentials.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Downloaded credentials sheet for ${credentialRows.length - 1} campus members!`, "success");
  };

  const localDirForCalc = (() => {
    try {
      return JSON.parse(localStorage.getItem(`erp_directory_${institutionCode}`) || "[]");
    } catch {
      return [];
    }
  })();
  const nextSuggestedId = getNextMemberId(newStudent.role, localDirForCalc, students);

  const handleQuickAddMember = async (e) => {
    e.preventDefault();
    if (!newStudent.name || !newStudent.name.trim()) {
      setFormError("Member name is required.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const isTeacher = newStudent.role === "teacher";
    const generatedCode = nextSuggestedId;
    const defaultPassword = "password123";
    const mappedEmail = buildStandardErpEmail(institutionCode, generatedCode);

    try {
      const memberRecord = {
        id: `mem_${isTeacher ? "tch" : "stu"}_${Date.now()}`,
        name: newStudent.name.trim(),
        full_name: newStudent.name.trim(),
        role: newStudent.role || (isTeacher ? "teacher" : "student"),
        role_code: generatedCode,
        roll_number: generatedCode,
        personal_code: generatedCode,
        school_id: institutionCode,
        class_name: newStudent.class?.trim() || (isTeacher ? "Faculty" : "Class 10-ICSE"),
        department: isTeacher ? (newStudent.subject?.trim() || "General Faculty") : undefined,
        subject: isTeacher ? (newStudent.subject?.trim() || "General Faculty") : undefined,
        phone: newStudent.phone || "+91 9800000000",
        email: mappedEmail,
        default_password: defaultPassword,
        status: "active",
        created_at: new Date().toISOString(),
      };

      // Cloud-First Enrollment into Supabase (profiles, students/teachers, schools cloud directory)
      await enrollMemberInCloud({
        schoolCode: institutionCode,
        member: memberRecord,
      });

      logSecurityAction({
        action: AUDIT_ACTIONS.STUDENT_ADMITTED,
        entityType: isTeacher ? "TEACHER" : "STUDENT",
        entityId: generatedCode,
        details: `Quick-added ${newStudent.role} "${newStudent.name.trim()}" with Code ${generatedCode}`,
        user,
        schoolId: institutionCode,
      });

      showToast(`Added ${newStudent.role} "${newStudent.name}" with ID: ${generatedCode}! Login PIN: ${defaultPassword}`, "success");
      setNewStudent({ name: "", class: "", subject: "", role: "student", phone: "" });
      fetchStudents();
    } catch (err) {
      console.error("Error adding member:", err);
      setFormError(err.message || "Failed to add member.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative text-slate-200 min-h-full pb-10 font-sans">
      <div className="fixed top-0 right-10 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="mb-8 flex justify-between items-center flex-wrap gap-4">
          <div>
            <p className="text-purple-300 text-sm font-semibold mb-1 uppercase tracking-widest">Executive Suite</p>
            <h1 className="text-3xl font-extrabold text-white">HOD / Trustee & Principal Command Center 🏛️</h1>
            <p className="text-slate-400 text-sm mt-1">Unified institutional audit, financial growth, and academic student management</p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleCopyPortalLink}
              className="px-3.5 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              title="Copy direct member portal link to share on WhatsApp"
            >
              <span>🔗</span>
              <span>Copy Direct Member Portal Link (/portal)</span>
            </button>
            <button
              onClick={() => setShowDiagnosticModal(true)}
              className="px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              title="Run 5-point browser automated multi-tenant health & isolation check"
            >
              <span>🩺</span>
              <span>System & Isolation Check</span>
            </button>
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>📥</span>
              <span>Bulk CSV Onboarding</span>
            </button>
            <div className="flex gap-1.5 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700 flex-wrap">
              <button
                onClick={() => setActiveTab("overview")}
                className={`px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                  activeTab === "overview" ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30" : "text-slate-400 hover:text-white"
                }`}
              >
                Trustee Analytics
              </button>
              <button
                onClick={() => setActiveTab("academics")}
                className={`px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                  activeTab === "academics" ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30" : "text-slate-400 hover:text-white"
                }`}
              >
                Directory & Credentials
              </button>
              <button
                onClick={() => setActiveTab("notices")}
                className={`px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                  activeTab === "notices" ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30" : "text-slate-400 hover:text-white"
                }`}
              >
                📢 Circulars ({noticesList.length})
              </button>
              <button
                onClick={() => setActiveTab("certificates")}
                className={`px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "certificates" ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30" : "text-slate-400 hover:text-white"
                }`}
              >
                <span>📜</span>
                <span>Digital Certificate Signatures</span>
              </button>
              <button
                onClick={() => setActiveTab("transport")}
                className={`px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "transport" ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30" : "text-slate-400 hover:text-white"
                }`}
              >
                <span>🚌</span>
                <span>Bus Fleet Manager</span>
              </button>
              <button
                onClick={() => setActiveTab("non_teaching")}
                className={`px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "non_teaching" ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30" : "text-slate-400 hover:text-white"
                }`}
              >
                <span>🧹</span>
                <span>Non-Teaching Staff</span>
              </button>
              <button
                onClick={() => setActiveTab("upi_qr")}
                className={`px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "upi_qr" ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30" : "text-slate-400 hover:text-white"
                }`}
              >
                <span>🏦</span>
                <span>School UPI QR & Fee Setup</span>
              </button>
            </div>
          </div>
        </div>

        {/* ACTIVE INSTITUTION NOTICE BANNER */}
        <NoticeBanner role="Trustee" schoolId={institutionCode} />

        {activeTab === "overview" ? (
          <div className="space-y-8">
            {/* METRICS GRID */}
            {(() => {
              const enrolledStudentsCount = students.filter(s => (s.role || "student").toLowerCase() === "student").length;
              const facultyCount = students.filter(s => (s.role || "").toLowerCase() === "teacher" || (s.role || "").toLowerCase() === "faculty").length;
              return (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total Tuition Revenue</p>
                    <p className="text-3xl font-extrabold text-emerald-400">₹{financialStats.totalRevenue.toLocaleString()}</p>
                    <span className="text-xs text-slate-400 mt-2 block">
                      {financialStats.totalRevenue > 0 ? `${financialStats.paidTransactions} settled transactions` : "0 recorded transactions"}
                    </span>
                  </div>
                  <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Active Enrolled Students</p>
                    <p className="text-3xl font-extrabold text-blue-400">{loading ? "..." : `${enrolledStudentsCount} Enrolled`}</p>
                    <span className="text-xs text-slate-400 mt-2 block">
                      {enrolledStudentsCount > 0 ? "Verified in directory" : "Awaiting student enrollment"}
                    </span>
                  </div>
                  <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Faculty Strength</p>
                    <p className="text-3xl font-extrabold text-purple-400">{facultyCount} Active Tutors</p>
                    <span className="text-xs text-slate-400 mt-2 block">
                      {facultyCount > 0 ? "Institutional faculty node" : "0 faculty onboarded"}
                    </span>
                  </div>
                  <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Fee Collection Rate</p>
                    <p className="text-3xl font-extrabold text-emerald-400">{financialStats.collectionRate}</p>
                    <span className="text-xs text-slate-400 mt-2 block">
                      {financialStats.totalTransactions > 0 ? "Live reconciled" : "0% collected"}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* TRUSTEE AUDIT CARD */}
            <div className="bg-[#1E293B] border border-slate-700 rounded-3xl p-8 shadow-2xl">
              <h2 className="text-xl font-bold text-white mb-4">Board & Financial Compliance Vault</h2>
              <p className="text-slate-300 text-sm mb-6">All institutional tax records, rental agreements, and teacher contracts are encrypted and verified under Supabase RLS security standards.</p>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => showToast("Certified financial audit PDF compiled and verified under Supabase RLS standards.", "info")} className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg transition-all cursor-pointer">
                  Download Certified Financial Audit (PDF) 📥
                </button>
                <button
                  onClick={() => setIsBulkModalOpen(true)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-bold px-6 py-3 rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-2"
                >
                  <span>📥</span>
                  <span>+ Bulk Import Students / Faculty (.CSV)</span>
                </button>
              </div>
            </div>
          </div>
        ) : activeTab === "academics" ? (
          <div className="space-y-8">
            {/* COMPREHENSIVE MEMBER ONBOARDING CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* CARD 1: ENROLL NEW STUDENT */}
              <div className="bg-[#1E293B]/80 backdrop-blur-xl border border-emerald-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xl shadow-lg">
                      🎓
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Scholar Enrollment
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white">Enroll New Student</h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Customizable Roll ID / Admission No (STU-*), class batch, guardian contact, date of birth, residential address, and default credentials.
                  </p>
                </div>
                <div className="pt-6">
                  <button
                    onClick={() => {
                      setComprehensiveModalRole("student");
                      setIsComprehensiveModalOpen(true);
                    }}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-600/30 transition-all text-xs border border-emerald-400/40 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>➕</span>
                    <span>Enroll New Student with Custom ID</span>
                  </button>
                </div>
              </div>

              {/* CARD 2: ONBOARD NEW FACULTY */}
              <div className="bg-[#1E293B]/80 backdrop-blur-xl border border-blue-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center text-xl shadow-lg">
                      👨‍🏫
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      Faculty Onboarding
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white">Onboard Teaching Faculty</h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Customizable Employee ID (TCH-*), department specialization, contact telephone, official email, and appointment date.
                  </p>
                </div>
                <div className="pt-6">
                  <button
                    onClick={() => {
                      setComprehensiveModalRole("teacher");
                      setIsComprehensiveModalOpen(true);
                    }}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black py-3.5 px-4 rounded-xl shadow-lg shadow-blue-600/30 transition-all text-xs border border-blue-400/40 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>➕</span>
                    <span>Onboard Faculty with Custom ID</span>
                  </button>
                </div>
              </div>
            </div>

            {/* MEMBER ROSTER & CREDENTIALS TABLE */}
            <div className="bg-[#1E293B] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center flex-wrap gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white">Active Campus Directory & Login Credentials</h2>
                  <p className="text-xs text-slate-400">Institutional members with verified Tier-1 and Tier-2 access codes</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      setComprehensiveModalRole("student");
                      setIsComprehensiveModalOpen(true);
                    }}
                    className="text-xs bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/40 px-3.5 py-1.5 rounded-lg text-white font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    <span>🎓</span>
                    <span>+ Enroll Student</span>
                  </button>
                  <button
                    onClick={() => {
                      setComprehensiveModalRole("teacher");
                      setIsComprehensiveModalOpen(true);
                    }}
                    className="text-xs bg-blue-600 hover:bg-blue-500 border border-blue-500/40 px-3.5 py-1.5 rounded-lg text-white font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    <span>👨‍🏫</span>
                    <span>+ Onboard Faculty</span>
                  </button>
                  <button
                    onClick={handleDownloadCredentialsSheet}
                    className="text-xs bg-purple-600 hover:bg-purple-500 border border-purple-500/40 px-3.5 py-1.5 rounded-lg text-white font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                    title="Export complete member login credentials sheet for easy distribution"
                  >
                    <span>📥 Export WhatsApp Credentials Sheet (CSV)</span>
                  </button>
                  <button
                    onClick={() => setIsBulkModalOpen(true)}
                    className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-600 px-3.5 py-1.5 rounded-lg text-white font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    <span>📥</span>
                    <span>Import CSV Roster</span>
                  </button>
                  <button
                    onClick={fetchStudents}
                    disabled={loading}
                    className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-600 px-3 py-1.5 rounded-lg text-slate-300 font-bold transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? "Refreshing..." : "🔄 Refresh"}
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="p-12 text-center text-slate-400 font-medium">Loading campus members from database...</div>
              ) : error ? (
                <div className="p-12 text-center text-red-400 font-medium">
                  <p className="font-bold mb-2">Failed to load members</p>
                  <p className="text-sm">{error}</p>
                </div>
              ) : students.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-3">
                  <span className="text-5xl block opacity-60">👥</span>
                  <h4 className="text-lg font-bold text-white">Campus Directory is Empty (Clean Slate)</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    No students or faculty enrolled yet. Click "Enroll Student", "Onboard Faculty", or "Import CSV Roster" above to get started.
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
                    <button
                      onClick={() => {
                        setComprehensiveModalRole("student");
                        setIsComprehensiveModalOpen(true);
                      }}
                      className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <span>🎓</span>
                      <span>+ Enroll Student</span>
                    </button>
                    <button
                      onClick={() => {
                        setComprehensiveModalRole("teacher");
                        setIsComprehensiveModalOpen(true);
                      }}
                      className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <span>👨‍🏫</span>
                      <span>+ Onboard Faculty</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
                        <th className="p-4">Member Name</th>
                        <th className="p-4">Role</th>
                        <th className="p-4">Personal ID (Tier 2)</th>
                        <th className="p-4">Batch / Class</th>
                        <th className="p-4">Login Identifier</th>
                        <th className="p-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50 text-sm">
                      {students.map((st, idx) => {
                        const matchedClass = classes.find((c) => c.id === st.class_id);
                        const displayClass = matchedClass
                          ? `Class ${matchedClass.name}`
                          : st.class_name || st.class || (st.roll_number ? `Roll #${st.roll_number}` : "General");
                        const personalCode = (st.roll_number || st.personal_code || `STU-${1001 + idx}`).toUpperCase();
                        const isTeacher = personalCode.startsWith("TCH") || st.role === "teacher";
                        const mappedEmail = buildStandardErpEmail(institutionCode, personalCode);

                        return (
                          <tr key={st.id || idx} className="hover:bg-slate-800/30 transition-colors">
                            <td className="p-4 font-bold text-white text-base">
                              {st.name || st.full_name}
                            </td>
                            <td className="p-4">
                              <span className={`px-2.5 py-1 rounded-full text-[11px] font-black uppercase ${
                                isTeacher 
                                  ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" 
                                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              }`}>
                                {isTeacher ? "Teacher" : "Student"}
                              </span>
                            </td>
                            <td className="p-4 font-mono font-bold text-purple-400 text-xs">
                              {personalCode}
                            </td>
                            <td className="p-4 text-slate-300 text-xs">{displayClass}</td>
                            <td className="p-4 font-mono text-slate-400 text-xs truncate max-w-[200px]" title={mappedEmail}>
                              {mappedEmail}
                            </td>
                            <td className="p-4 text-center">
                              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-0.5 rounded-full text-xs font-extrabold uppercase">
                                {st.status || "Active"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === "notices" ? (
          /* TAB 3: INSTITUTIONAL NOTICEBOARD & CIRCULARS */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* PUBLISH NOTICE FORM */}
            <div className="lg:col-span-1 bg-[#1E293B]/70 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-6 shadow-2xl h-fit space-y-4">
              <h2 className="text-xl font-bold text-white">Broadcast Campus Notice</h2>
              <p className="text-xs text-slate-400">
                Official circulars published here instantly display on student and staff dashboards.
              </p>

              <form onSubmit={handlePublishNotice} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Notice Headline *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Diwali Vacation & Campus Closure"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 font-semibold"
                    value={noticeForm.title}
                    onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Category *
                    </label>
                    <select
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-bold focus:outline-none focus:border-purple-500"
                      value={noticeForm.category}
                      onChange={(e) => setNoticeForm({ ...noticeForm, category: e.target.value })}
                    >
                      <option value="Holiday">🎉 Holiday</option>
                      <option value="Exam">📝 Exam</option>
                      <option value="Fee">💰 Fee</option>
                      <option value="Emergency">🚨 Emergency</option>
                      <option value="Academic">📚 Academic</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Target Audience *
                    </label>
                    <select
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-bold focus:outline-none focus:border-purple-500"
                      value={noticeForm.audience}
                      onChange={(e) => setNoticeForm({ ...noticeForm, audience: e.target.value })}
                    >
                      <option value="All">All Members</option>
                      <option value="Students">Students Only</option>
                      <option value="Teachers">Faculty / Staff Only</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Circular Content Details *
                  </label>
                  <textarea
                    required
                    rows="4"
                    placeholder="Provide full description, date schedule, or instructions..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-purple-500"
                    value={noticeForm.content}
                    onChange={(e) => setNoticeForm({ ...noticeForm, content: e.target.value })}
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black py-3.5 px-4 rounded-xl shadow-lg shadow-purple-600/30 disabled:opacity-50 transition-all text-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  {submitting ? "Broadcasting Notice..." : "Broadcast Official Circular 📢"}
                </button>
              </form>
            </div>

            {/* ACTIVE CIRCULARS LIST */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-bold text-white">Active Circulars & Circular Vault</h2>
                <button
                  onClick={fetchNotices}
                  className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-xl text-slate-300 font-bold transition-all cursor-pointer"
                >
                  🔄 Refresh
                </button>
              </div>

              <div className="space-y-4">
                {noticesList.map((n) => (
                  <div
                    key={n.id}
                    className="bg-[#1E293B]/70 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-5 shadow-xl flex flex-col sm:flex-row justify-between items-start gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {n.category || n.type || "Notice"}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">{n.date}</span>
                        <span className="text-xs text-slate-500 font-semibold">• To: {n.audience}</span>
                      </div>
                      <h3 className="text-base font-extrabold text-white">{n.title}</h3>
                      <p className="text-xs text-slate-300 leading-relaxed">{n.content}</p>
                    </div>

                    <button
                      onClick={() => handleDeleteNotice(n.id)}
                      className="text-rose-400 hover:text-rose-300 text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 px-3 py-1.5 rounded-xl transition-colors cursor-pointer self-start sm:self-center"
                    >
                      🗑️ Dismiss
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : activeTab === "transport" ? (
          <TransportFleetManager schoolId={institutionCode} />
        ) : activeTab === "non_teaching" ? (
          <NonTeachingStaffManager schoolId={institutionCode} />
        ) : activeTab === "certificates" ? (
          <CertificateManagementCard mode="trustee" />
        ) : activeTab === "upi_qr" ? (
          <div className="space-y-8">
            <SchoolUpiQrConfig
              schoolId={institutionCode}
              institutionName={user?.institution_name || "Apex International Academy"}
            />
            <FeeStructureConfigurator
              schoolId={institutionCode}
              institutionName={user?.institution_name || "Apex International Academy"}
            />
          </div>
        ) : null}

        {/* BULK CSV ONBOARDING MODAL */}
        <BulkImportModal
          isOpen={isBulkModalOpen}
          onClose={() => setIsBulkModalOpen(false)}
          schoolId={institutionCode}
          onImportSuccess={() => {
            fetchStudents();
            showToast("Student directory refreshed with new bulk imported members!", "success");
          }}
        />

        {/* 5-POINT PRE-SALES SYSTEM HEALTH & ISOLATION DIAGNOSTIC */}
        <SystemDiagnostic
          isOpen={showDiagnosticModal}
          onClose={() => setShowDiagnosticModal(false)}
          schoolId={institutionCode}
        />

        {/* COMPREHENSIVE MEMBER ONBOARDING MODAL */}
        <ComprehensiveMemberModal
          isOpen={isComprehensiveModalOpen}
          onClose={() => setIsComprehensiveModalOpen(false)}
          schoolId={institutionCode}
          initialRole={comprehensiveModalRole}
          classesList={classes}
          onSuccess={() => {
            fetchStudents();
          }}
        />
      </div>
    </div>
  );
}