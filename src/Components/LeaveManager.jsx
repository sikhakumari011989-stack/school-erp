import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { logSecurityAction } from "../utils/auditLogger";

export default function LeaveManager({ schoolId: propSchoolId }) {
  const { user } = useContext(AppContext) || {};
  const { showToast } = useToast();
  const schoolId = propSchoolId || user?.school_id || user?.institution_code || "CAMPUS-01";

  const [leaves, setLeaves] = useState([]);
  const [filter, setFilter] = useState("ALL"); // ALL | Pending | Approved | Rejected
  const [showApplyModal, setShowApplyModal] = useState(false);

  const [form, setForm] = useState({
    applicantName: "",
    applicantRole: "Teacher", // Teacher | Non-Teaching Staff (NTS)
    personalCode: "",
    leaveType: "Casual Leave", // Casual Leave | Medical Leave | Unpaid Leave
    startDate: "",
    endDate: "",
    reason: "",
    isUnpaid: false,
  });

  const loadLeaves = () => {
    try {
      const saved = localStorage.getItem(`erp_leave_requests_${schoolId}`);
      if (saved) {
        setLeaves(JSON.parse(saved));
      } else {
        setLeaves([]);
      }
    } catch {
      setLeaves([]);
    }
  };

  useEffect(() => {
    loadLeaves();
    const handleUpdate = () => loadLeaves();
    window.addEventListener("erp-leaves-updated", handleUpdate);
    return () => window.removeEventListener("erp-leaves-updated", handleUpdate);
  }, [schoolId]);

  const saveLeaves = (updated) => {
    setLeaves(updated);
    try {
      localStorage.setItem(`erp_leave_requests_${schoolId}`, JSON.stringify(updated));
      window.dispatchEvent(new Event("erp-leaves-updated"));
    } catch (e) {
      console.warn("Save leaves error:", e);
    }
  };

  const handleApplyLeave = (e) => {
    e.preventDefault();
    if (!form.applicantName.trim() || !form.startDate || !form.endDate) {
      showToast("Please provide applicant name and date range.", "error");
      return;
    }

    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const newRequest = {
      id: `leave_${Date.now()}`,
      applicantName: form.applicantName.trim(),
      applicantRole: form.applicantRole,
      personalCode: (form.personalCode || "STAFF-01").trim().toUpperCase(),
      leaveType: form.leaveType,
      startDate: form.startDate,
      endDate: form.endDate,
      durationDays: diffDays || 1,
      reason: form.reason.trim() || "Personal obligation",
      status: "Pending", // Pending | Approved | Rejected
      isUnpaidDeduction: form.isUnpaid || form.leaveType === "Unpaid Leave",
      payrollDeductionSynced: false,
      requestedAt: new Date().toISOString().split("T")[0],
    };

    const updated = [newRequest, ...leaves];
    saveLeaves(updated);

    logSecurityAction({
      action: "LEAVE_REQUEST_SUBMITTED",
      entityType: "LEAVE",
      entityId: newRequest.id,
      details: `${newRequest.applicantName} (${newRequest.applicantRole}) requested ${newRequest.durationDays} days ${newRequest.leaveType}`,
      schoolId,
    });

    showToast(`Leave request submitted for ${newRequest.applicantName}!`, "success");
    setForm({
      applicantName: "",
      applicantRole: "Teacher",
      personalCode: "",
      leaveType: "Casual Leave",
      startDate: "",
      endDate: "",
      reason: "",
      isUnpaid: false,
    });
    setShowApplyModal(false);
  };

  const handleDecision = (leaveId, decision, withDeduction = false) => {
    const targetLeave = leaves.find((l) => l.id === leaveId);
    if (!targetLeave) return;

    const updated = leaves.map((l) => {
      if (l.id === leaveId) {
        return {
          ...l,
          status: decision,
          isUnpaidDeduction: withDeduction || l.isUnpaidDeduction,
          payrollDeductionSynced: decision === "Approved" && (withDeduction || l.isUnpaidDeduction),
          decidedAt: new Date().toISOString().split("T")[0],
          decidedBy: user?.name || "Executive Principal",
        };
      }
      return l;
    });

    saveLeaves(updated);

    // If approved with deduction, sync to payroll flags
    if (decision === "Approved" && (withDeduction || targetLeave.isUnpaidDeduction)) {
      try {
        const payrollKey = `erp_payroll_deductions_${schoolId}`;
        const existing = JSON.parse(localStorage.getItem(payrollKey) || "[]");
        const deductionRecord = {
          id: `deduct_${Date.now()}`,
          leaveId,
          staffName: targetLeave.applicantName,
          personalCode: targetLeave.personalCode,
          role: targetLeave.applicantRole,
          days: targetLeave.durationDays,
          reason: `Unpaid Leave deduction: ${targetLeave.leaveType}`,
          approvedDate: new Date().toISOString().split("T")[0],
          status: "Active Deduction",
        };
        localStorage.setItem(payrollKey, JSON.stringify([deductionRecord, ...existing]));
        window.dispatchEvent(new Event("erp-payroll-updated"));
      } catch (pe) {
        console.warn("Payroll sync notice:", pe);
      }
    }

    logSecurityAction({
      action: `LEAVE_REQUEST_${decision.toUpperCase()}`,
      entityType: "LEAVE",
      entityId: leaveId,
      details: `Principal marked leave for ${targetLeave.applicantName} as ${decision}${withDeduction ? " with salary deduction flag" : ""}`,
      schoolId,
    });

    showToast(`Leave request marked as ${decision}${withDeduction ? " (Payroll deduction synced)" : ""}!`, "info");
  };

  const filteredLeaves = leaves.filter((l) => {
    if (filter === "ALL") return true;
    return l.status === filter;
  });

  return (
    <div className="space-y-6 text-slate-100">
      {/* Header Banner */}
      <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-cyan-500/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all duration-300 ease-in-out">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-bold uppercase tracking-wider mb-2">
            <span>🏖️</span> HR Operations & Payroll Bridge
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Staff Leave Approval Portal</h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-xl">
            Review and adjudicate faculty and non-teaching staff leave petitions. Approved unpaid leaves trigger automatic salary deduction flags in Payroll.
          </p>
        </div>
        <button
          onClick={() => setShowApplyModal(true)}
          className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black px-5 py-3 rounded-2xl text-xs sm:text-sm shadow-xl shadow-cyan-500/20 transition-all duration-300 ease-in-out hover:scale-[1.02] cursor-pointer flex items-center gap-2 border border-white/20"
        >
          <span>➕</span>
          <span>Submit Leave Petition</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-xl shadow-cyan-500/5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Petitions</p>
          <p className="text-2xl font-black text-white mt-1">{leaves.length}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-xl shadow-cyan-500/5">
          <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Awaiting Decision</p>
          <p className="text-2xl font-black text-amber-400 mt-1">
            {leaves.filter((l) => l.status === "Pending").length}
          </p>
        </div>
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-xl shadow-cyan-500/5">
          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Approved</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">
            {leaves.filter((l) => l.status === "Approved").length}
          </p>
        </div>
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-xl shadow-cyan-500/5">
          <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Payroll Deductions</p>
          <p className="text-2xl font-black text-rose-400 mt-1">
            {leaves.filter((l) => l.isUnpaidDeduction && l.status === "Approved").length} Flagged
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        {["ALL", "Pending", "Approved", "Rejected"].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all duration-300 ease-in-out hover:scale-[1.02] cursor-pointer ${
              filter === tab
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-lg shadow-cyan-500/20"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Leaves Table */}
      <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl shadow-cyan-500/10 overflow-hidden">
        {filteredLeaves.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <span className="text-4xl block opacity-60">🏖️</span>
            <h4 className="text-base font-bold text-white">No Leave Applications Found (Clean Slate)</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              There are currently no staff leave petitions in this filter category.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 text-xs uppercase tracking-wider bg-white/5">
                  <th className="p-4 pl-6">Staff Applicant</th>
                  <th className="p-4">Leave Type</th>
                  <th className="p-4">Duration & Dates</th>
                  <th className="p-4">Reason</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right pr-6">Principal Adjudication</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {filteredLeaves.map((l) => (
                  <tr
                    key={l.id}
                    className="hover:bg-white/5 transition-all duration-300 ease-in-out hover:scale-[1.005]"
                  >
                    <td className="p-4 pl-6 font-bold text-white">
                      {l.applicantName}
                      <span className="block text-[10px] text-cyan-400 font-mono font-normal">
                        {l.personalCode} • {l.applicantRole}
                      </span>
                    </td>
                    <td className="p-4 text-xs font-semibold text-slate-200">
                      {l.leaveType}
                      {l.isUnpaidDeduction && (
                        <span className="block text-[9px] text-rose-400 font-mono uppercase font-bold">
                          [Salary Deduction]
                        </span>
                      )}
                    </td>
                    <td className="p-4 font-mono text-xs text-slate-300">
                      <span className="font-bold text-cyan-300">{l.durationDays} day(s)</span>
                      <span className="block text-[10px] text-slate-400">
                        {l.startDate} to {l.endDate}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-slate-400 max-w-[200px] truncate" title={l.reason}>
                      {l.reason}
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-extrabold uppercase ${
                          l.status === "Approved"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : l.status === "Pending"
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                        }`}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="p-4 text-right pr-6">
                      {l.status === "Pending" ? (
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <button
                            onClick={() => handleDecision(l.id, "Approved", false)}
                            className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-xs font-bold transition-all duration-300 ease-in-out hover:scale-[1.02] cursor-pointer"
                          >
                            ✓ Approve
                          </button>
                          <button
                            onClick={() => handleDecision(l.id, "Approved", true)}
                            title="Approve with Payroll Salary Deduction"
                            className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 px-2 py-1 rounded-lg text-xs font-bold transition-all duration-300 ease-in-out hover:scale-[1.02] cursor-pointer"
                          >
                            Deduct Pay
                          </button>
                          <button
                            onClick={() => handleDecision(l.id, "Rejected")}
                            className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 px-2.5 py-1 rounded-lg text-xs font-bold transition-all duration-300 ease-in-out hover:scale-[1.02] cursor-pointer"
                          >
                            ✕ Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">
                          Decided on {l.decidedAt || l.requestedAt}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Apply for Leave */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900/95 border border-white/10 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl shadow-cyan-500/20 relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-black text-white">Staff Leave Application</h3>
              <button
                onClick={() => setShowApplyModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleApplyLeave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Staff Member Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Mrs. Archana K."
                    value={form.applicantName}
                    onChange={(e) => setForm({ ...form, applicantName: e.target.value })}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Personal Staff ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., TCH-101 / NTS-102"
                    value={form.personalCode}
                    onChange={(e) => setForm({ ...form, personalCode: e.target.value })}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Staff Department
                  </label>
                  <select
                    value={form.applicantRole}
                    onChange={(e) => setForm({ ...form, applicantRole: e.target.value })}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="Teacher">Teaching Faculty</option>
                    <option value="Non-Teaching Staff (NTS)">Non-Teaching (NTS)</option>
                    <option value="Accountant">Finance / Accountant</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Leave Category
                  </label>
                  <select
                    value={form.leaveType}
                    onChange={(e) => setForm({ ...form, leaveType: e.target.value })}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="Casual Leave">Casual Leave (Paid)</option>
                    <option value="Medical Leave">Medical / Sick Leave</option>
                    <option value="Emergency Leave">Emergency Leave</option>
                    <option value="Unpaid Leave">Unpaid Leave (Salary Deduction)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Reason for Absence
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detail circumstances of leave..."
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                ></textarea>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="unpaidDeduct"
                  checked={form.isUnpaid}
                  onChange={(e) => setForm({ ...form, isUnpaid: e.target.checked })}
                  className="rounded bg-slate-950 border-white/10 text-cyan-400"
                />
                <label htmlFor="unpaidDeduct" className="text-xs text-slate-300">
                  Mark as Unpaid Absence (Applies salary deduction upon approval)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black px-5 py-2.5 rounded-xl text-xs shadow-lg shadow-cyan-500/20 transition-all duration-300 ease-in-out hover:scale-[1.02]"
                >
                  Submit Application 🏖️
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

