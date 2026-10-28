import React, { useState, useEffect } from "react";
import { useToast } from "../context/ToastContext";
import { supabase } from "../supabaseClient";
import { logSecurityAction, AUDIT_ACTIONS } from "../utils/auditLogger";
import { buildStandardErpEmail } from "../pages/Login";
import { getNextMemberId } from "../utils/idGenerator";
import { enrollMemberInCloud } from "../utils/cloudSyncService";

export default function ComprehensiveMemberModal({
  isOpen,
  onClose,
  schoolId,
  initialRole = "student",
  onSuccess,
  classesList = [],
}) {
  const { showToast } = useToast();
  const activeSchoolId = (schoolId || "CAMPUS-01").toUpperCase();

  const [activeTab, setActiveTab] = useState(
    initialRole === "principal"
      ? "principal"
      : initialRole === "accountant"
      ? "accountant"
      : initialRole === "teacher"
      ? "teacher"
      : initialRole === "nts" || initialRole === "staff" || initialRole === "non_teaching"
      ? "nts"
      : "student"
  );
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Student Form State (Biographical + Financial & Baseline tracking)
  const [studentForm, setStudentForm] = useState({
    name: "",
    customId: "",
    className: "Class 10-A",
    guardianName: "",
    phone: "",
    email: "",
    dob: "",
    address: "",
    password: "password123",
    totalFees: "",
    initialPaid: "",
    attendanceBaseline: "",
  });

  // Dynamic calculations for student financial splitter
  const studentTotalFees = parseFloat(studentForm.totalFees) || 0;
  const studentInitialPaid = parseFloat(studentForm.initialPaid) || 0;
  const studentRemainingBalance = Math.max(0, studentTotalFees - studentInitialPaid);

  // Teacher Form State
  const [teacherForm, setTeacherForm] = useState({
    name: "",
    customId: "",
    subject: "",
    phone: "",
    email: "",
    salary: "45000",
    joiningDate: new Date().toISOString().split("T")[0],
    password: "password123",
  });

  // Accountant Form State
  const [accountantForm, setAccountantForm] = useState({
    name: "",
    customId: "",
    phone: "",
    email: "",
    salary: "40000",
    designation: "Head of Accounts & Treasury",
    password: "password123",
  });

  // Principal (PRIN) Form State
  const [principalForm, setPrincipalForm] = useState({
    name: "",
    customId: "",
    designation: "Head of School / Executive Principal",
    phone: "",
    email: "",
    salary: "75000",
    password: "password123",
  });

  // Mandatory Salary Initialization Helper: Writes directly to Payroll Engine
  const syncSalaryToPayroll = (memberId, baseSalary) => {
    try {
      const key = `erp_salary_structures_${activeSchoolId}`;
      const structures = JSON.parse(localStorage.getItem(key) || "{}");
      const sal = Number(baseSalary) || 35000;
      structures[memberId] = {
        basic: sal,
        hra: Math.round(sal * 0.3),
        da: Math.round(sal * 0.1),
        special: Math.round(sal * 0.1),
        pf: 1800,
        professionalTax: 200,
        tds: sal > 50000 ? Math.round(sal * 0.05) : 0,
        leaveDeduction: 0,
      };
      localStorage.setItem(key, JSON.stringify(structures));
      window.dispatchEvent(new CustomEvent("erp-payroll-updated"));
    } catch (e) {
      console.warn("Payroll salary sync notice:", e);
    }
  };

  // Non-Teaching Staff (NTS) Form State
  const [ntsForm, setNtsForm] = useState({
    name: "",
    customId: "",
    designation: "Campus Administrator",
    phone: "",
    salary: "18000",
    password: "password123",
  });

  // Helpers to get local directory & NTS registry
  const getLocalDirectory = () => {
    try {
      return JSON.parse(localStorage.getItem(`erp_directory_${activeSchoolId}`) || "[]");
    } catch {
      return [];
    }
  };

  const getNonTeachingStaff = () => {
    try {
      return JSON.parse(localStorage.getItem(`erp_non_teaching_staff_${activeSchoolId}`) || "[]");
    } catch {
      return [];
    }
  };

  // Auto-generate suggested ID
  const generateSuggestedId = (role) => {
    const dir = getLocalDirectory();
    const nts = getNonTeachingStaff();
    return getNextMemberId(role, dir, nts);
  };

  // Pre-populate suggested IDs on open or tab change
  useEffect(() => {
    if (isOpen) {
      setErrorMessage("");
      const targetRole =
        initialRole === "accountant"
          ? "accountant"
          : initialRole === "teacher"
          ? "teacher"
          : initialRole === "nts" || initialRole === "staff" || initialRole === "non_teaching"
          ? "nts"
          : "student";
      setActiveTab(targetRole);

      // Pre-populate student ID if empty
      const suggestedStudent = generateSuggestedId("student");
      setStudentForm((prev) => ({
        ...prev,
        customId: prev.customId ? prev.customId : suggestedStudent,
        className: prev.className || (classesList[0]?.name ? `Class ${classesList[0].name}` : "Class 10-A"),
      }));

      // Pre-populate teacher ID if empty
      const suggestedTeacher = generateSuggestedId("teacher");
      setTeacherForm((prev) => ({
        ...prev,
        customId: prev.customId ? prev.customId : suggestedTeacher,
      }));

      // Pre-populate accountant ID if empty
      const suggestedAcc = generateSuggestedId("accountant");
      setAccountantForm((prev) => ({
        ...prev,
        customId: prev.customId ? prev.customId : suggestedAcc,
      }));

      // Pre-populate NTS ID if empty
      const suggestedNts = generateSuggestedId("nts");
      setNtsForm((prev) => ({
        ...prev,
        customId: prev.customId ? prev.customId : suggestedNts,
      }));

      // Pre-populate Principal ID if empty
      const suggestedPrin = generateSuggestedId("principal");
      setPrincipalForm((prev) => ({
        ...prev,
        customId: prev.customId ? prev.customId : suggestedPrin,
      }));
    }
  }, [isOpen, initialRole, activeSchoolId]);

  if (!isOpen) return null;

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    setErrorMessage("");
    if (tab === "student" && !studentForm.customId) {
      setStudentForm((prev) => ({ ...prev, customId: generateSuggestedId("student") }));
    } else if (tab === "teacher" && !teacherForm.customId) {
      setTeacherForm((prev) => ({ ...prev, customId: generateSuggestedId("teacher") }));
    } else if (tab === "accountant" && !accountantForm.customId) {
      setAccountantForm((prev) => ({ ...prev, customId: generateSuggestedId("accountant") }));
    } else if (tab === "nts" && !ntsForm.customId) {
      setNtsForm((prev) => ({ ...prev, customId: generateSuggestedId("nts") }));
    } else if (tab === "principal" && !principalForm.customId) {
      setPrincipalForm((prev) => ({ ...prev, customId: generateSuggestedId("principal") }));
    }
  };

  // 1. SUBMIT: STUDENT ENROLLMENT WITH FEES & BASELINE
  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    if (!studentForm.name.trim() || !studentForm.className?.trim()) {
      showToast("Name and Class are required.", "error");
      setErrorMessage("Name and Class are required.");
      return;
    }
    if (!studentForm.customId.trim()) {
      setErrorMessage("Please specify a custom Roll ID or Admission Code.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    const cleanCustomId = studentForm.customId.trim().toUpperCase();
    const cleanName = studentForm.name.trim();
    const defaultPassword = studentForm.password.trim() || "password123";
    const mappedEmail = studentForm.email.trim() || buildStandardErpEmail(activeSchoolId, cleanCustomId);

    const totalFeesNum = parseFloat(studentForm.totalFees) || 0;
    const initialPaidNum = parseFloat(studentForm.initialPaid) || 0;
    const remainingBalance = Math.max(0, totalFeesNum - initialPaidNum);
    const attendanceBaseline = studentForm.attendanceBaseline ? parseFloat(studentForm.attendanceBaseline) : null;

    try {
      const newStudentRecord = {
        id: `mem_stu_${Date.now()}`,
        name: cleanName,
        full_name: cleanName,
        role: "student",
        role_code: cleanCustomId,
        roll_number: cleanCustomId,
        personal_code: cleanCustomId,
        class_name: studentForm.className.trim(),
        class: studentForm.className.trim(),
        guardian_name: studentForm.guardianName.trim(),
        phone: studentForm.phone.trim(),
        email: mappedEmail,
        dob: studentForm.dob,
        address: studentForm.address.trim(),
        default_password: defaultPassword,
        school_id: activeSchoolId,
        status: "active",
        created_at: new Date().toISOString(),

        // Financial & Admission Metrics
        total_annual_fees: totalFeesNum,
        annual_fees: totalFeesNum,
        initial_amount_paid: initialPaidNum,
        amount_paid: initialPaidNum,
        remaining_balance: remainingBalance,
        pending_fees: remainingBalance,
        attendance_baseline: attendanceBaseline,
        attendance_percentage: attendanceBaseline !== null ? attendanceBaseline : 100,
      };

      // 1. Cloud-First Enrollment into Supabase (profiles, students, and cloud directory)
      await enrollMemberInCloud({
        schoolCode: activeSchoolId,
        member: newStudentRecord,
      });

      // 2. Ledger Automation: If Initial Amount Paid > 0, generate approved fee receipt entry
      if (initialPaidNum > 0) {
        const today = new Date().toISOString().split("T")[0];
        const receiptNo = `REC-${Date.now().toString().slice(-6)}`;
        const invoiceNo = `INV-${Date.now().toString().slice(-6)}`;
        const paymentMode = "Admission Counter Receipt (Direct)";

        const approvedReceipt = {
          id: receiptNo,
          invoice_no: invoiceNo,
          school_id: activeSchoolId,
          student_name: cleanName,
          roll_number: cleanCustomId,
          class_name: studentForm.className.trim(),
          amount: initialPaidNum,
          total_due: totalFeesNum,
          remaining_balance: remainingBalance,
          payment_mode: paymentMode,
          term: `Admission & Annual Tuition Fee (${studentForm.className.trim()})`,
          title: `Admission & Annual Tuition Fee (${studentForm.className.trim()})`,
          status: "paid", // Approved fee receipt
          date: today,
          receipt_tag: remainingBalance === 0 ? "FULL" : "PARTIAL",
          receipt_type: remainingBalance === 0 ? "FULL" : "PARTIAL",
          notes: `Admission fee payment. Total Annual: ₹${totalFeesNum}, Paid at Admission: ₹${initialPaidNum}, Remaining: ₹${remainingBalance}`,
          created_at: new Date().toISOString(),
        };

        // Save to erp_fees_${schoolCode}
        try {
          const feesKey = `erp_fees_${activeSchoolId}`;
          const currentFees = JSON.parse(localStorage.getItem(feesKey) || "[]");
          currentFees.unshift(approvedReceipt);
          localStorage.setItem(feesKey, JSON.stringify(currentFees));
        } catch (e) {
          console.warn("erp_fees storage notice:", e);
        }

        // Save to erp_fee_ledger_${schoolCode} & global erp_fee_ledger
        try {
          const ledgerKey = `erp_fee_ledger_${activeSchoolId}`;
          const currentLedger = JSON.parse(localStorage.getItem(ledgerKey) || "[]");
          currentLedger.unshift(approvedReceipt);
          localStorage.setItem(ledgerKey, JSON.stringify(currentLedger));

          const globalLedger = JSON.parse(localStorage.getItem("erp_fee_ledger") || "[]");
          globalLedger.unshift(approvedReceipt);
          localStorage.setItem("erp_fee_ledger", JSON.stringify(globalLedger));
        } catch (e) {
          console.warn("erp_fee_ledger storage notice:", e);
        }

        // Supabase cloud sync for fee ledger
        try {
          if (supabase) {
            await supabase.from("fee_ledger").insert([
              {
                school_id: activeSchoolId,
                student_name: cleanName,
                class_name: studentForm.className.trim(),
                amount: initialPaidNum,
                status: "paid",
                payment_mode: paymentMode,
                razorpay_payment_id: receiptNo,
                date: today,
                term: approvedReceipt.term,
              },
            ]);
          }
        } catch (sbFeeErr) {
          console.warn("Supabase fee_ledger sync notice:", sbFeeErr);
        }

        // Trigger updates across components
        window.dispatchEvent(new Event("erp-fee-ledger-updated"));
        window.dispatchEvent(new Event("erp-fees-updated"));
      }

      // 3. Security audit logging
      logSecurityAction({
        action: AUDIT_ACTIONS.STUDENT_ADMITTED || "STUDENT_ENROLLED",
        entityType: "STUDENT",
        entityId: cleanCustomId,
        details: `Enrolled student "${cleanName}" with custom code ${cleanCustomId} in ${studentForm.className}. Annual Fees: ₹${totalFeesNum}, Initial Paid: ₹${initialPaidNum}, Balance: ₹${remainingBalance}`,
        schoolId: activeSchoolId,
      });

      showToast(
        initialPaidNum > 0
          ? `Enrolled student ${cleanName} (${cleanCustomId}) & posted ₹${initialPaidNum.toLocaleString()} fee receipt! Login PIN: ${defaultPassword}`
          : `Enrolled student ${cleanName} (${cleanCustomId})! Login PIN: ${defaultPassword}`,
        "success"
      );

      // Reset form
      setStudentForm({
        name: "",
        customId: generateSuggestedId("student"),
        className: "Class 10-A",
        guardianName: "",
        phone: "",
        email: "",
        dob: "",
        address: "",
        password: "password123",
        totalFees: "",
        initialPaid: "",
        attendanceBaseline: "",
      });

      if (onSuccess) onSuccess(newStudentRecord);
      onClose();
    } catch (err) {
      console.error("Error enrolling student:", err);
      setErrorMessage(err.message || "Failed to enroll student.");
    } finally {
      setSubmitting(false);
    }
  };

  // 2. SUBMIT: TEACHER ONBOARDING
  const handleTeacherSubmit = async (e) => {
    e.preventDefault();
    if (!teacherForm.name.trim()) {
      setErrorMessage("Please enter the faculty member's full name.");
      return;
    }
    if (!teacherForm.customId.trim()) {
      setErrorMessage("Please specify a custom Employee ID.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    const cleanCustomId = teacherForm.customId.trim().toUpperCase();
    const cleanName = teacherForm.name.trim();
    const defaultPassword = teacherForm.password.trim() || "password123";
    const mappedEmail = teacherForm.email.trim() || buildStandardErpEmail(activeSchoolId, cleanCustomId);

    try {
      const newTeacherRecord = {
        id: `mem_tch_${Date.now()}`,
        name: cleanName,
        full_name: cleanName,
        role: "teacher",
        role_code: cleanCustomId,
        roll_number: cleanCustomId,
        personal_code: cleanCustomId,
        class_name: "Faculty",
        department: teacherForm.subject.trim() || "General Faculty",
        subject: teacherForm.subject.trim() || "General Faculty",
        phone: teacherForm.phone.trim(),
        email: mappedEmail,
        joining_date: teacherForm.joiningDate,
        default_password: defaultPassword,
        school_id: activeSchoolId,
        status: "active",
        created_at: new Date().toISOString(),
      };

      await enrollMemberInCloud({
        schoolCode: activeSchoolId,
        member: newTeacherRecord,
      });

      syncSalaryToPayroll(cleanCustomId, teacherForm.salary);

      logSecurityAction({
        action: "FACULTY_ONBOARDED",
        entityType: "TEACHER",
        entityId: cleanCustomId,
        details: `Onboarded faculty member "${cleanName}" (${teacherForm.subject || "Faculty"}) with ID ${cleanCustomId}`,
        schoolId: activeSchoolId,
      });

      showToast(`Onboarded faculty ${cleanName} (${cleanCustomId})! Login PIN: ${defaultPassword}`, "success");

      setTeacherForm({
        name: "",
        customId: generateSuggestedId("teacher"),
        subject: "",
        phone: "",
        email: "",
        joiningDate: new Date().toISOString().split("T")[0],
        password: "password123",
      });

      if (onSuccess) onSuccess(newTeacherRecord);
      onClose();
    } catch (err) {
      console.error("Error onboarding faculty:", err);
      setErrorMessage(err.message || "Failed to onboard faculty member.");
    } finally {
      setSubmitting(false);
    }
  };

  // 3. SUBMIT: ACCOUNTANT ONBOARDING
  const handleAccountantSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    const cleanName = accountantForm.name.trim();
    let cleanCustomId = (accountantForm.customId || "").trim().toUpperCase();

    if (!cleanName) {
      setErrorMessage("Please enter the accountant full name.");
      return;
    }

    if (!cleanCustomId) {
      cleanCustomId = generateSuggestedId("accountant");
    }

    setSubmitting(true);

    const defaultPassword = accountantForm.password.trim() || "password123";
    const mappedEmail = accountantForm.email.trim() || buildStandardErpEmail(activeSchoolId, cleanCustomId);

    try {
      const newAccountantRecord = {
        id: `mem_acc_${Date.now()}`,
        name: cleanName,
        full_name: cleanName,
        role: "accountant",
        role_code: cleanCustomId,
        roll_number: cleanCustomId,
        personal_code: cleanCustomId,
        class_name: accountantForm.designation.trim() || "Head of Accounts & Treasury",
        department: "Finance & Accounts",
        designation: accountantForm.designation.trim() || "Head of Accounts & Treasury",
        phone: accountantForm.phone.trim(),
        email: mappedEmail,
        default_password: defaultPassword,
        school_id: activeSchoolId,
        status: "active",
        created_at: new Date().toISOString(),
      };

      await enrollMemberInCloud({
        schoolCode: activeSchoolId,
        member: newAccountantRecord,
      });

      syncSalaryToPayroll(cleanCustomId, accountantForm.salary);

      logSecurityAction({
        action: "ACCOUNTANT_ONBOARDED",
        entityType: "ACCOUNTANT",
        entityId: cleanCustomId,
        details: `Onboarded institutional accountant "${cleanName}" with ID ${cleanCustomId}`,
        schoolId: activeSchoolId,
      });

      showToast(`Onboarded accountant ${cleanName} (${cleanCustomId})! Login Password: ${defaultPassword}`, "success");

      setAccountantForm({
        name: "",
        customId: generateSuggestedId("accountant"),
        phone: "",
        email: "",
        designation: "Head of Accounts & Treasury",
        password: "password123",
      });

      if (onSuccess) onSuccess(newAccountantRecord);
      onClose();
    } catch (err) {
      console.error("Error onboarding accountant:", err);
      setErrorMessage(err.message || "Failed to onboard accountant.");
    } finally {
      setSubmitting(false);
    }
  };

  // 4. SUBMIT: NON-TEACHING STAFF (NTS) ONBOARDING
  const handleNtsSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    const cleanName = ntsForm.name.trim();
    let cleanCustomId = (ntsForm.customId || "").trim().toUpperCase();
    const designation = ntsForm.designation.trim() || "Campus Administrator";
    const phone = ntsForm.phone.trim();
    const salaryNum = parseFloat(ntsForm.salary) || 18000;
    const defaultPassword = ntsForm.password.trim() || "password123";

    if (!cleanName) {
      setErrorMessage("Please enter the staff member's full name.");
      return;
    }

    if (!cleanCustomId) {
      cleanCustomId = generateSuggestedId("nts");
    }

    setSubmitting(true);

    try {
      // 1. Dedicated Non-Teaching Staff Record
      const newNtsRecord = {
        id: `staff_${Date.now()}`,
        school_id: activeSchoolId,
        fullName: cleanName,
        name: cleanName,
        full_name: cleanName,
        customId: cleanCustomId,
        role_code: cleanCustomId,
        personal_code: cleanCustomId,
        category: designation,
        designation: designation,
        phone: phone || "+91 98000 00000",
        salary: `₹${salaryNum.toLocaleString("en-IN")}`,
        base_salary: salaryNum,
        shiftTiming: "General Shift",
        joiningDate: new Date().toISOString().split("T")[0],
        status: "Active Duty",
        default_password: defaultPassword,
        role: "staff",
        created_at: new Date().toISOString(),
      };

      // Save to erp_non_teaching_staff_${schoolCode}
      const ntsKey = `erp_non_teaching_staff_${activeSchoolId}`;
      const existingNts = JSON.parse(localStorage.getItem(ntsKey) || "[]");
      const updatedNts = [
        newNtsRecord,
        ...existingNts.filter((s) => (s.customId || s.role_code || s.id) !== cleanCustomId),
      ];
      localStorage.setItem(ntsKey, JSON.stringify(updatedNts));

      // 2. Register in institutional directory (erp_directory_${schoolCode})
      const dirRecord = {
        id: newNtsRecord.id,
        name: cleanName,
        full_name: cleanName,
        role: "staff",
        role_code: cleanCustomId,
        roll_number: cleanCustomId,
        personal_code: cleanCustomId,
        category: designation,
        dept: `${designation} (Facilities & Support)`,
        class_name: designation,
        phone: phone || "+91 98000 00000",
        email: `${cleanCustomId.toLowerCase()}@${activeSchoolId.toLowerCase()}.internal`,
        school_id: activeSchoolId,
        default_password: defaultPassword,
        status: "active",
        created_at: new Date().toISOString(),
      };

      await enrollMemberInCloud({
        schoolCode: activeSchoolId,
        member: dirRecord,
      });

      syncSalaryToPayroll(cleanCustomId, salaryNum);

      // 3. Security audit logging
      logSecurityAction({
        action: "NON_TEACHING_STAFF_ONBOARDED",
        entityType: "STAFF",
        entityId: cleanCustomId,
        details: `Onboarded non-teaching personnel "${cleanName}" (${designation}) with ID ${cleanCustomId}, Salary: ₹${salaryNum}`,
        schoolId: activeSchoolId,
      });

      window.dispatchEvent(new Event("erp-non-teaching-updated"));
      window.dispatchEvent(new Event("erp-directory-updated"));

      showToast(`Onboarded non-teaching staff ${cleanName} (${cleanCustomId})! Login Password: ${defaultPassword}`, "success");

      setNtsForm({
        name: "",
        customId: generateSuggestedId("nts"),
        designation: "Campus Administrator",
        phone: "",
        salary: "18000",
        password: "password123",
      });

      if (onSuccess) onSuccess(newNtsRecord);
      onClose();
    } catch (err) {
      console.error("Error onboarding non-teaching staff:", err);
      setErrorMessage(err.message || "Failed to onboard non-teaching staff.");
    } finally {
      setSubmitting(false);
    }
  };


  // 5. SUBMIT: PRINCIPAL ONBOARDING
  const handlePrincipalSubmit = async (e) => {
    e.preventDefault();
    if (!principalForm.name.trim()) {
      setErrorMessage("Please enter the Principal's full name.");
      return;
    }
    const cleanName = principalForm.name.trim();
    let cleanCustomId = (principalForm.customId || "").trim().toUpperCase();
    if (!cleanCustomId) {
      cleanCustomId = generateSuggestedId("principal");
    }
    setSubmitting(true);
    setErrorMessage("");

    const defaultPassword = principalForm.password.trim() || "password123";
    const mappedEmail = principalForm.email.trim() || buildStandardErpEmail(activeSchoolId, cleanCustomId);
    const salaryNum = parseFloat(principalForm.salary) || 75000;

    try {
      const newPrincipalRecord = {
        id: `mem_prin_${Date.now()}`,
        name: cleanName,
        full_name: cleanName,
        role: "principal",
        role_code: cleanCustomId,
        roll_number: cleanCustomId,
        personal_code: cleanCustomId,
        class_name: "Executive Administration",
        dept: "Executive Leadership & Academics",
        designation: principalForm.designation.trim() || "Head of School / Executive Principal",
        phone: principalForm.phone.trim() || "+91 98000 00000",
        email: mappedEmail,
        default_password: defaultPassword,
        base_salary: salaryNum,
        salary: `₹${salaryNum.toLocaleString("en-IN")}`,
        school_id: activeSchoolId,
        status: "active",
        created_at: new Date().toISOString(),
      };

      await enrollMemberInCloud({
        schoolCode: activeSchoolId,
        member: newPrincipalRecord,
      });

      syncSalaryToPayroll(cleanCustomId, salaryNum);

      logSecurityAction({
        action: "PRINCIPAL_ONBOARDED",
        entityType: "PRINCIPAL",
        entityId: cleanCustomId,
        details: `Onboarded Principal "${cleanName}" with ID ${cleanCustomId}, Base Salary: ₹${salaryNum}`,
        schoolId: activeSchoolId,
      });

      showToast(`Onboarded Principal ${cleanName} (${cleanCustomId})! Login PIN: ${defaultPassword}`, "success");

      setPrincipalForm({
        name: "",
        customId: generateSuggestedId("principal"),
        designation: "Head of School / Executive Principal",
        phone: "",
        email: "",
        salary: "75000",
        password: "password123",
      });

      if (onSuccess) onSuccess(newPrincipalRecord);
      onClose();
    } catch (err) {
      console.error("Error onboarding principal:", err);
      setErrorMessage(err.message || "Failed to onboard principal.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in overflow-y-auto">
      <div className="bg-[#1E293B] border border-slate-700/80 rounded-3xl p-5 sm:p-7 max-w-2xl w-full shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[11px] font-black uppercase tracking-wider mb-2">
              <span>🏛️</span> Institutional Directory Management ({activeSchoolId})
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              {activeTab === "student"
                ? "➕ Enroll New Student"
                : activeTab === "teacher"
                ? "➕ Onboard New Faculty"
                : activeTab === "accountant"
                ? "➕ Onboard New Accountant"
                : activeTab === "principal"
                ? "➕ Onboard New Principal"
                : "➕ Onboard Non-Teaching Staff"}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Create complete biographical & financial profiles with customizable Tier-2 access credentials.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer text-lg font-bold"
            title="Close Modal"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher - 4 Tabs with Responsive Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 mb-6">
          <button
            type="button"
            onClick={() => handleTabSwitch("student")}
            className={`py-2.5 px-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "student"
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30 border border-emerald-400/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>🎓</span>
            <span className="truncate">Student (STU)</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabSwitch("teacher")}
            className={`py-2.5 px-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "teacher"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30 border border-blue-400/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>👨‍🏫</span>
            <span className="truncate">Faculty (TCH)</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabSwitch("accountant")}
            className={`py-2.5 px-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "accountant"
                ? "bg-gradient-to-r from-amber-600 to-yellow-600 text-white shadow-lg shadow-amber-600/30 border border-amber-400/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>💰</span>
            <span className="truncate">Accountant (ACC)</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabSwitch("nts")}
            className={`py-2.5 px-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "nts"
                ? "bg-gradient-to-r from-purple-600 via-indigo-600 to-violet-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>🧹</span>
            <span className="truncate">Non-Teaching (NTS)</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabSwitch("principal")}
            className={`py-2.5 px-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "principal"
                ? "bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white shadow-lg shadow-cyan-600/30 border border-cyan-400/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>🏛️</span>
            <span className="truncate">Principal (PRIN)</span>
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/40 text-red-400 rounded-xl text-xs font-bold flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}


        {/* TAB 5: ONBOARD NEW PRINCIPAL (PRIN) */}
        {activeTab === "principal" && (
          <form onSubmit={handlePrincipalSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-1.5 ml-1">
                  Principal Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Sikha K. Sharma"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                  value={principalForm.name}
                  onChange={(e) => setPrincipalForm({ ...principalForm, name: e.target.value })}
                />
              </div>

              {/* Custom Principal ID */}
              <div>
                <div className="flex justify-between items-center mb-1.5 ml-1">
                  <label className="text-[11px] font-extrabold text-slate-300 uppercase tracking-wider">
                    Custom Principal ID (PRIN-*) *
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setPrincipalForm((prev) => ({
                        ...prev,
                        customId: generateSuggestedId("principal"),
                      }))
                    }
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold cursor-pointer"
                  >
                    ⚡ Suggest Next
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. PRIN-01"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-cyan-400 font-mono font-bold text-sm focus:outline-none focus:border-cyan-500 uppercase tracking-wider"
                  value={principalForm.customId}
                  onChange={(e) =>
                    setPrincipalForm({
                      ...principalForm,
                      customId: e.target.value.toUpperCase().replace(/\s+/g, "-"),
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Designation */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-1.5 ml-1">
                  Designation / Role Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Head of School / Executive Principal"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                  value={principalForm.designation}
                  onChange={(e) => setPrincipalForm({ ...principalForm, designation: e.target.value })}
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-1.5 ml-1">
                  Contact Phone (WhatsApp) *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 98200 99887"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500 font-mono"
                  value={principalForm.phone}
                  onChange={(e) => setPrincipalForm({ ...principalForm, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Initial Monthly Base Salary */}
              <div>
                <label className="block text-[11px] font-extrabold text-emerald-300 uppercase tracking-wider mb-1.5 ml-1">
                  Initial Monthly Base Salary (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="e.g. 75000"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-4 py-2.5 text-emerald-400 font-mono font-bold text-sm focus:outline-none focus:border-cyan-500"
                    value={principalForm.salary}
                    onChange={(e) => setPrincipalForm({ ...principalForm, salary: e.target.value })}
                  />
                </div>
              </div>

              {/* Login Password */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-1.5 ml-1">
                  Login Password / PIN *
                </label>
                <input
                  type="text"
                  required
                  placeholder="password123"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-amber-300 font-mono text-sm focus:outline-none focus:border-cyan-500"
                  value={principalForm.password}
                  onChange={(e) => setPrincipalForm({ ...principalForm, password: e.target.value })}
                />
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-slate-400 hover:text-white font-bold text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-black px-6 py-2.5 rounded-xl text-xs shadow-lg shadow-cyan-600/30 transition-all cursor-pointer flex items-center gap-2 border border-cyan-400/40"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Onboarding Principal...</span>
                  </>
                ) : (
                  <span>➕ Onboard Principal & Issue PRIN Credentials</span>
                )}
              </button>
            </div>
          </form>
        )}

        {/* TAB 1: ENROLL NEW STUDENT */}
        {activeTab === "student" && (
          <form onSubmit={handleStudentSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-1.5 ml-1">
                  Student Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ananya R. Deshmukh"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                  value={studentForm.name}
                  onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                />
              </div>

              {/* Custom Roll ID / Admission No */}
              <div>
                <div className="flex justify-between items-center mb-1.5 ml-1">
                  <label className="text-[11px] font-extrabold text-slate-300 uppercase tracking-wider">
                    Custom Roll ID / Code *
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setStudentForm((prev) => ({
                        ...prev,
                        customId: generateSuggestedId("student"),
                      }))
                    }
                    className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer"
                  >
                    ⚡ Suggest Next
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. STU-101 or STU-2026-01"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-emerald-400 font-mono font-bold text-sm focus:outline-none focus:border-emerald-500 uppercase tracking-wider"
                    value={studentForm.customId}
                    onChange={(e) =>
                      setStudentForm({
                        ...studentForm,
                        customId: e.target.value.toUpperCase().replace(/\s+/g, "-"),
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Class & Section */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-1.5 ml-1">
                  Class Batch & Section *
                </label>
                <input
                  type="text"
                  required
                  list="classesSuggestions"
                  placeholder="e.g. Class 10-A or Class 10-ICSE"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                  value={studentForm.className}
                  onChange={(e) => setStudentForm({ ...studentForm, className: e.target.value })}
                />
                <datalist id="classesSuggestions">
                  {classesList.map((c) => (
                    <option key={c.id || c.name} value={`Class ${c.name}`} />
                  ))}
                  <option value="Class 10-A" />
                  <option value="Class 10-B" />
                  <option value="Class 10-ICSE" />
                  <option value="Class 9-A" />
                  <option value="Class 9-B" />
                  <option value="Class 11-Science" />
                  <option value="Class 12-Commerce" />
                </datalist>
              </div>

              {/* Parent / Guardian Name */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-1.5 ml-1">
                  Parent / Guardian Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rajesh Deshmukh"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                  value={studentForm.guardianName}
                  onChange={(e) => setStudentForm({ ...studentForm, guardianName: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Contact Phone */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-1.5 ml-1">
                  Contact Phone (WhatsApp)
                </label>
                <input
                  type="tel"
                  placeholder="e.g. +91 98200 12345"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 font-mono"
                  value={studentForm.phone}
                  onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })}
                />
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-1.5 ml-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder={buildStandardErpEmail(activeSchoolId, studentForm.customId || "STU-101")}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 font-mono text-xs"
                  value={studentForm.email}
                  onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Date of Birth */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-1.5 ml-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                  value={studentForm.dob}
                  onChange={(e) => setStudentForm({ ...studentForm, dob: e.target.value })}
                />
              </div>

              {/* Default Security PIN */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-1.5 ml-1">
                  Login Password / PIN
                </label>
                <input
                  type="text"
                  placeholder="password123"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-amber-300 font-mono text-sm focus:outline-none focus:border-emerald-500"
                  value={studentForm.password}
                  onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })}
                />
              </div>
            </div>

            {/* Residential Address */}
            <div>
              <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-1.5 ml-1">
                Residential Address
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Flat 201, Jyodani Chaya, near Rajshri Hospital, Palghar 401404"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                value={studentForm.address}
                onChange={(e) => setStudentForm({ ...studentForm, address: e.target.value })}
              />
            </div>

            {/* SUB-SECTION: FINANCIAL & ADMISSION DETAILS (2-COLUMN GRID) */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 text-sm">💵</span>
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
                    Financial & Admission Ledger
                  </span>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Instant Receipt
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Total Annual Fees */}
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-1">
                    Total Annual Fees (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="e.g. 45000"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono font-bold text-sm focus:outline-none focus:border-emerald-500"
                    value={studentForm.totalFees}
                    onChange={(e) => setStudentForm({ ...studentForm, totalFees: e.target.value })}
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Total agreed academic year fee</span>
                </div>

                {/* Initial Amount Paid */}
                <div>
                  <label className="block text-[11px] font-extrabold text-emerald-300 uppercase tracking-wider mb-1">
                    Initial Amount Paid (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="e.g. 15000"
                    className="w-full bg-slate-950 border border-emerald-500/50 rounded-xl px-3.5 py-2 text-emerald-300 font-mono font-bold text-sm focus:outline-none focus:border-emerald-400"
                    value={studentForm.initialPaid}
                    onChange={(e) => setStudentForm({ ...studentForm, initialPaid: e.target.value })}
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Generates approved receipt if &gt; 0</span>
                </div>

                {/* Remaining Balance (Read-Only) */}
                <div>
                  <label className="block text-[11px] font-extrabold text-rose-300 uppercase tracking-wider mb-1">
                    Remaining Balance (₹) [Auto]
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      readOnly
                      className="w-full bg-slate-950/70 border border-rose-500/40 rounded-xl px-3.5 py-2 text-rose-400 font-mono font-black text-sm cursor-not-allowed select-none"
                      value={studentRemainingBalance}
                    />
                    <span className="absolute right-2.5 top-2 text-[9px] font-bold uppercase text-rose-400/80">
                      {studentRemainingBalance === 0 ? "CLEAR" : "DUE"}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Auto: (Annual Fees − Paid Now)</span>
                </div>

                {/* Current Attendance Baseline (%) */}
                <div>
                  <label className="block text-[11px] font-extrabold text-cyan-300 uppercase tracking-wider mb-1">
                    Attendance Baseline (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="e.g. 92 (Optional for transfers)"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-cyan-300 font-mono font-bold text-sm focus:outline-none focus:border-cyan-400"
                    value={studentForm.attendanceBaseline}
                    onChange={(e) => setStudentForm({ ...studentForm, attendanceBaseline: e.target.value })}
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Starting attendance baseline</span>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-slate-400 hover:text-white font-bold text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black px-6 py-2.5 rounded-xl text-xs shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center gap-2 border border-emerald-400/40"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Enrolling Student...</span>
                  </>
                ) : (
                  <span>➕ Enroll Student & Issue Credentials</span>
                )}
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: ONBOARD NEW FACULTY */}
        {activeTab === "teacher" && (
          <form onSubmit={handleTeacherSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-1.5 ml-1">
                  Faculty Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Prof. Rajesh Kulkarni"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                  value={teacherForm.name}
                  onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })}
                />
              </div>

              {/* Custom Employee ID */}
              <div>
                <div className="flex justify-between items-center mb-1.5 ml-1">
                  <label className="text-[11px] font-extrabold text-slate-300 uppercase tracking-wider">
                    Custom Employee ID / Code *
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setTeacherForm((prev) => ({
                        ...prev,
                        customId: generateSuggestedId("teacher"),
                      }))
                    }
                    className="text-[10px] text-blue-400 hover:text-blue-300 font-bold cursor-pointer"
                  >
                    ⚡ Suggest Next
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. TCH-01 or TCH-MATH-01"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-blue-400 font-mono font-bold text-sm focus:outline-none focus:border-blue-500 uppercase tracking-wider"
                    value={teacherForm.customId}
                    onChange={(e) =>
                      setTeacherForm({
                        ...teacherForm,
                        customId: e.target.value.toUpperCase().replace(/\s+/g, "-"),
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Department / Subject */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-1.5 ml-1">
                  Department / Subject Specialization *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mathematics & Computing"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                  value={teacherForm.subject}
                  onChange={(e) => setTeacherForm({ ...teacherForm, subject: e.target.value })}
                />
              </div>

              {/* Primary Phone */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-1.5 ml-1">
                  Primary Contact Phone
                </label>
                <input
                  type="tel"
                  placeholder="e.g. +91 98200 54321"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 font-mono"
                  value={teacherForm.phone}
                  onChange={(e) => setTeacherForm({ ...teacherForm, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Email Address */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-1.5 ml-1">
                  Official Email Address
                </label>
                <input
                  type="email"
                  placeholder={buildStandardErpEmail(activeSchoolId, teacherForm.customId || "TCH-01")}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 font-mono text-xs"
                  value={teacherForm.email}
                  onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
                />
              </div>

              {/* Base Monthly Salary */}
              <div>
                <label className="block text-[11px] font-extrabold text-emerald-300 uppercase tracking-wider mb-1.5 ml-1">
                  Initial Monthly Base Salary (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="e.g. 45000"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-4 py-2.5 text-emerald-400 font-mono font-bold text-sm focus:outline-none focus:border-blue-500"
                    value={teacherForm.salary}
                    onChange={(e) => setTeacherForm({ ...teacherForm, salary: e.target.value })}
                  />
                </div>
              </div>

              {/* Joining Date */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-1.5 ml-1">
                  Official Joining Date
                </label>
                <input
                  type="date"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                  value={teacherForm.joiningDate}
                  onChange={(e) => setTeacherForm({ ...teacherForm, joiningDate: e.target.value })}
                />
              </div>
            </div>

            {/* Default Password */}
            <div>
              <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-1.5 ml-1">
                Security Password / Default PIN
              </label>
              <input
                type="text"
                placeholder="password123"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-amber-300 font-mono text-sm focus:outline-none focus:border-blue-500"
                value={teacherForm.password}
                onChange={(e) => setTeacherForm({ ...teacherForm, password: e.target.value })}
              />
            </div>

            {/* Footer Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-slate-400 hover:text-white font-bold text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black px-6 py-2.5 rounded-xl text-xs shadow-lg shadow-blue-600/30 transition-all cursor-pointer flex items-center gap-2 border border-blue-400/40"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Onboarding Faculty...</span>
                  </>
                ) : (
                  <span>➕ Onboard Faculty & Issue Credentials</span>
                )}
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: ONBOARD NEW ACCOUNTANT */}
        {activeTab === "accountant" && (
          <form onSubmit={handleAccountantSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-1.5 ml-1">
                  Accountant Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh S. Nair"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500"
                  value={accountantForm.name}
                  onChange={(e) => setAccountantForm({ ...accountantForm, name: e.target.value })}
                />
              </div>

              {/* Custom Accountant ID */}
              <div>
                <div className="flex justify-between items-center mb-1.5 ml-1">
                  <label className="text-[11px] font-extrabold text-slate-300 uppercase tracking-wider">
                    Custom Accountant ID / Code *
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setAccountantForm((prev) => ({
                        ...prev,
                        customId: generateSuggestedId("accountant"),
                      }))
                    }
                    className="text-[10px] text-amber-400 hover:text-amber-300 font-bold cursor-pointer"
                  >
                    ⚡ Suggest Next
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. ACC-01 or ACC-02"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-amber-400 font-mono font-bold text-sm focus:outline-none focus:border-amber-500 uppercase tracking-wider"
                  value={accountantForm.customId}
                  onChange={(e) =>
                    setAccountantForm({
                      ...accountantForm,
                      customId: e.target.value.toUpperCase().replace(/\s+/g, "-"),
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Designation / Department */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-1.5 ml-1">
                  Official Designation
                </label>
                <input
                  type="text"
                  placeholder="e.g. Head of Accounts & Treasury"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500"
                  value={accountantForm.designation}
                  onChange={(e) => setAccountantForm({ ...accountantForm, designation: e.target.value })}
                />
              </div>

              {/* Contact Phone */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-1.5 ml-1">
                  Direct Contact Number
                </label>
                <input
                  type="tel"
                  placeholder="e.g. +91 98200 44556"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500 font-mono"
                  value={accountantForm.phone}
                  onChange={(e) => setAccountantForm({ ...accountantForm, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Email Address */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-1.5 ml-1">
                  Institutional Email
                </label>
                <input
                  type="email"
                  placeholder={buildStandardErpEmail(activeSchoolId, accountantForm.customId || "ACC-01")}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500 font-mono text-xs"
                  value={accountantForm.email}
                  onChange={(e) => setAccountantForm({ ...accountantForm, email: e.target.value })}
                />
              </div>

              {/* Security Password */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-1.5 ml-1">
                  Security Password / PIN
                </label>
                <input
                  type="text"
                  placeholder="password123"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-amber-300 font-mono text-sm focus:outline-none focus:border-amber-500"
                  value={accountantForm.password}
                  onChange={(e) => setAccountantForm({ ...accountantForm, password: e.target.value })}
                />
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-slate-400 hover:text-white font-bold text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white font-black px-6 py-2.5 rounded-xl text-xs shadow-lg shadow-amber-600/30 transition-all cursor-pointer flex items-center gap-2 border border-amber-400/40"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Onboarding Accountant...</span>
                  </>
                ) : (
                  <span>➕ Onboard Accountant & Issue Credentials</span>
                )}
              </button>
            </div>
          </form>
        )}

        {/* TAB 4: ONBOARD NON-TEACHING STAFF (NTS) */}
        {activeTab === "nts" && (
          <form onSubmit={handleNtsSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-1.5 ml-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Shankar Shinde"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
                  value={ntsForm.name}
                  onChange={(e) => setNtsForm({ ...ntsForm, name: e.target.value })}
                />
              </div>

              {/* Custom NTS ID */}
              <div>
                <div className="flex justify-between items-center mb-1.5 ml-1">
                  <label className="text-[11px] font-extrabold text-slate-300 uppercase tracking-wider">
                    Custom Staff ID (NTS-*) *
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setNtsForm((prev) => ({
                        ...prev,
                        customId: generateSuggestedId("nts"),
                      }))
                    }
                    className="text-[10px] text-purple-400 hover:text-purple-300 font-bold cursor-pointer"
                  >
                    ⚡ Suggest Next
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. NTS-101 or NTS-102"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-purple-400 font-mono font-bold text-sm focus:outline-none focus:border-purple-500 uppercase tracking-wider"
                  value={ntsForm.customId}
                  onChange={(e) =>
                    setNtsForm({
                      ...ntsForm,
                      customId: e.target.value.toUpperCase().replace(/\s+/g, "-"),
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Designation / Job Role */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-1.5 ml-1">
                  Designation / Job Role *
                </label>
                <input
                  type="text"
                  required
                  list="ntsDesignationSuggestions"
                  placeholder="e.g. Admin, Peon, Security Guard, Driver"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
                  value={ntsForm.designation}
                  onChange={(e) => setNtsForm({ ...ntsForm, designation: e.target.value })}
                />
                <datalist id="ntsDesignationSuggestions">
                  <option value="Campus Administrator" />
                  <option value="Office Executive" />
                  <option value="Senior Security Guard" />
                  <option value="Peon / Support Staff" />
                  <option value="Campus Safety Officer" />
                  <option value="Science Lab Assistant" />
                  <option value="Housekeeping Supervisor" />
                  <option value="Electrician / Maintenance" />
                </datalist>
              </div>

              {/* Contact Phone */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-1.5 ml-1">
                  Contact Phone (WhatsApp) *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 98200 88990"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 font-mono"
                  value={ntsForm.phone}
                  onChange={(e) => setNtsForm({ ...ntsForm, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Base Monthly Salary */}
              <div>
                <label className="block text-[11px] font-extrabold text-emerald-300 uppercase tracking-wider mb-1.5 ml-1">
                  Base Monthly Salary (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="e.g. 18000"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-4 py-2.5 text-emerald-400 font-mono font-bold text-sm focus:outline-none focus:border-purple-500"
                    value={ntsForm.salary}
                    onChange={(e) => setNtsForm({ ...ntsForm, salary: e.target.value })}
                  />
                </div>
              </div>

              {/* Login Password */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-1.5 ml-1">
                  Login Password / PIN *
                </label>
                <input
                  type="text"
                  required
                  placeholder="password123"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-amber-300 font-mono text-sm focus:outline-none focus:border-purple-500"
                  value={ntsForm.password}
                  onChange={(e) => setNtsForm({ ...ntsForm, password: e.target.value })}
                />
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-slate-400 hover:text-white font-bold text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bg-gradient-to-r from-purple-600 via-indigo-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-black px-6 py-2.5 rounded-xl text-xs shadow-lg shadow-purple-600/30 transition-all cursor-pointer flex items-center gap-2 border border-purple-400/40"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Onboarding NTS...</span>
                  </>
                ) : (
                  <span>➕ Onboard Non-Teaching Staff & Issue ID</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
