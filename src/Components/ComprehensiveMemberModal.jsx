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

  const [activeTab, setActiveTab] = useState(initialRole === "teacher" ? "teacher" : "student");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Student Form State
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
  });

  // Teacher Form State
  const [teacherForm, setTeacherForm] = useState({
    name: "",
    customId: "",
    subject: "",
    phone: "",
    email: "",
    joiningDate: new Date().toISOString().split("T")[0],
    password: "password123",
  });

  // Helper to get local directory
  const getLocalDirectory = () => {
    try {
      return JSON.parse(localStorage.getItem(`erp_directory_${activeSchoolId}`) || "[]");
    } catch {
      return [];
    }
  };

  // Auto-generate suggested ID
  const generateSuggestedId = (role) => {
    const dir = getLocalDirectory();
    return getNextMemberId(role, dir);
  };

  // Pre-populate suggested IDs on open or tab change
  useEffect(() => {
    if (isOpen) {
      setErrorMessage("");
      const targetRole = initialRole === "teacher" ? "teacher" : "student";
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
    }
  };

  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    if (!studentForm.name.trim()) {
      setErrorMessage("Please enter the student's full name.");
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
      };

      // 1. Cloud-First Enrollment into Supabase (profiles, students, and cloud directory)
      await enrollMemberInCloud({
        schoolCode: activeSchoolId,
        member: newStudentRecord,
      });

      // 3. Security audit logging
      logSecurityAction({
        action: AUDIT_ACTIONS.STUDENT_ADMITTED || "STUDENT_ENROLLED",
        entityType: "STUDENT",
        entityId: cleanCustomId,
        details: `Enrolled student "${cleanName}" with custom code ${cleanCustomId} in ${studentForm.className}`,
        schoolId: activeSchoolId,
      });

      showToast(`Enrolled student ${cleanName} (${cleanCustomId})! Login PIN: ${defaultPassword}`, "success");

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

      // 1. Cloud-First Enrollment into Supabase (profiles, teachers, and cloud directory)
      await enrollMemberInCloud({
        schoolCode: activeSchoolId,
        member: newTeacherRecord,
      });

      // 3. Security audit logging
      logSecurityAction({
        action: "FACULTY_ONBOARDED",
        entityType: "TEACHER",
        entityId: cleanCustomId,
        details: `Onboarded faculty member "${cleanName}" (${teacherForm.subject || "Faculty"}) with ID ${cleanCustomId}`,
        schoolId: activeSchoolId,
      });

      showToast(`Onboarded faculty ${cleanName} (${cleanCustomId})! Login PIN: ${defaultPassword}`, "success");

      // Reset form
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

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in overflow-y-auto">
      <div className="bg-[#1E293B] border border-slate-700/80 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl relative my-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[11px] font-black uppercase tracking-wider mb-2">
              <span>🏛️</span> Institutional Directory Management ({activeSchoolId})
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              {activeTab === "student" ? "➕ Enroll New Student" : "➕ Onboard New Faculty"}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Create complete biographical profiles with customizable 2-Tier access credentials.
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

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-2 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 mb-6">
          <button
            type="button"
            onClick={() => handleTabSwitch("student")}
            className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === "student"
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30 border border-emerald-400/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>🎓</span>
            <span>Enroll Student (STU)</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabSwitch("teacher")}
            className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === "teacher"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30 border border-blue-400/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>👨‍🏫</span>
            <span>Onboard Faculty (TCH)</span>
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/40 text-red-400 rounded-xl text-xs font-bold flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* TAB 1: ENROLL NEW STUDENT */}
        {activeTab === "student" ? (
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
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                value={studentForm.address}
                onChange={(e) => setStudentForm({ ...studentForm, address: e.target.value })}
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
        ) : (
          /* TAB 2: ONBOARD NEW FACULTY */
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
      </div>
    </div>
  );
}

