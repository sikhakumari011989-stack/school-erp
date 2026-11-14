import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { logSecurityAction } from "../utils/auditLogger";

export default function StaffLeaves() {
  const { user, tenant } = useContext(AppContext) || {};
  const { showToast } = useToast();
  const schoolId = user?.institution_code || user?.school_id || tenant?.code || "CAMPUS-01";
  const staffId = user?.personal_code || user?.role_code || user?.id || "NON-01";
  const staffName = user?.name || user?.full_name || "Support Personnel";

  const [myLeaves, setMyLeaves] = useState([]);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [leaveForm, setLeaveForm] = useState({
    leaveType: "Casual Leave",
    startDate: "",
    endDate: "",
    reason: "",
  });

  const loadMyLeaves = () => {
    try {
      const key = `erp_leave_requests_${schoolId}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const all = JSON.parse(raw);
        const filtered = all.filter(
          (l) =>
            l.staffId === staffId ||
            l.applicantName?.toLowerCase() === staffName.toLowerCase()
        );
        setMyLeaves(filtered);
      } else {
        setMyLeaves([]);
      }
    } catch {
      setMyLeaves([]);
    }
  };

  useEffect(() => {
    loadMyLeaves();
    window.addEventListener("erp-leaves-updated", loadMyLeaves);
    return () => window.removeEventListener("erp-leaves-updated", loadMyLeaves);
  }, [schoolId, staffId, staffName]);

  const handleSubmitLeave = (e) => {
    e.preventDefault();
    if (!leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason.trim()) {
      showToast("Please provide start date, end date, and reason for leave.", "error");
      return;
    }

    setSubmitting(true);
    const newRequest = {
      id: `leave_${Date.now()}`,
      schoolId,
      staffId,
      applicantName: staffName,
      category: "Non-Teaching Personnel",
      leaveType: leaveForm.leaveType,
      startDate: leaveForm.startDate,
      endDate: leaveForm.endDate,
      reason: leaveForm.reason.trim(),
      status: "Pending Principal Review",
      appliedOn: new Date().toISOString().split("T")[0],
    };

    try {
      const key = `erp_leave_requests_${schoolId}`;
      const all = JSON.parse(localStorage.getItem(key) || "[]");
      all.unshift(newRequest);
      localStorage.setItem(key, JSON.stringify(all));
      window.dispatchEvent(new Event("erp-leaves-updated"));
      setMyLeaves((prev) => [newRequest, ...prev]);

      logSecurityAction({
        action: "STAFF_LEAVE_APPLICATION_SUBMITTED",
        entityType: "LEAVE",
        entityId: newRequest.id,
        details: `${staffName} (${staffId}) submitted ${leaveForm.leaveType} for ${leaveForm.startDate} to ${leaveForm.endDate}`,
        user,
        schoolId,
      });

      showToast("Leave application submitted for Principal authorization! 🏖️", "success");
      setLeaveForm({ leaveType: "Casual Leave", startDate: "", endDate: "", reason: "" });
      setShowApplyModal(false);
    } catch (err) {
      showToast("Failed to submit leave application.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative text-slate-200 min-h-full pb-10 font-sans">
      <div className="fixed top-0 right-10 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="bg-[#1E293B]/80 backdrop-blur-xl border border-slate-700/70 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">
              <span>🏖️</span> Personal Time-Off Management
            </div>
            <h1 className="text-3xl font-extrabold text-white">My Leave Applications</h1>
            <p className="text-slate-400 text-sm mt-1">
              Logged in as <span className="text-white font-bold">{staffName}</span> &bull; Personal ID: <span className="text-blue-400 font-mono font-bold">{staffId}</span>
            </p>
          </div>
          <button
            onClick={() => setShowApplyModal(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-lg shadow-blue-600/30 transition-all cursor-pointer flex items-center gap-2 border border-blue-400/40"
          >
            <span>➕</span> Apply for Leave
          </button>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Total Applications</p>
            <p className="text-2xl font-black text-white">{myLeaves.length}</p>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">Pending Approval</p>
            <p className="text-2xl font-black text-amber-300">
              {myLeaves.filter((l) => (l.status || "").toLowerCase().includes("pending")).length}
            </p>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1">Authorized / Approved</p>
            <p className="text-2xl font-black text-emerald-300">
              {myLeaves.filter((l) => (l.status || "").toLowerCase().includes("approved")).length}
            </p>
          </div>
        </div>

        {/* LEAVES TABLE */}
        <div className="bg-[#1E293B]/80 backdrop-blur-xl border border-slate-700/70 rounded-3xl shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-700/60 bg-slate-800/40">
            <h2 className="text-lg font-bold text-white">Leave History & Approval Status</h2>
            <p className="text-xs text-slate-400 mt-0.5">Strictly scoped personal leave requests submitted to Principal</p>
          </div>

          {myLeaves.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <span className="text-4xl block opacity-60">🏖️</span>
              <p className="font-bold text-white text-base">No leave applications on file.</p>
              <p className="text-xs">Click &quot;Apply for Leave&quot; above to submit a new time-off request.</p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-700/70 text-slate-400 uppercase tracking-wider bg-slate-900/40">
                    <th className="p-4 pl-6">Leave Type</th>
                    <th className="p-4">Period</th>
                    <th className="p-4">Reason</th>
                    <th className="p-4">Submitted On</th>
                    <th className="p-4 text-center pr-6">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {myLeaves.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-4 pl-6 font-bold text-white">{l.leaveType}</td>
                      <td className="p-4 font-mono text-emerald-400">
                        {l.startDate} &rarr; {l.endDate}
                      </td>
                      <td className="p-4 text-slate-300 max-w-xs truncate" title={l.reason}>
                        {l.reason}
                      </td>
                      <td className="p-4 font-mono text-slate-400">{l.appliedOn || "Recent"}</td>
                      <td className="p-4 text-center pr-6">
                        <span
                          className={`px-3 py-1 rounded-full text-[11px] font-bold border inline-block ${
                            (l.status || "").toLowerCase().includes("approved")
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                              : (l.status || "").toLowerCase().includes("rejected")
                              ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                              : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                          }`}
                        >
                          {l.status || "Pending Review"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>🏖️</span> Submit Time-Off Request
              </h3>
              <button
                onClick={() => setShowApplyModal(false)}
                className="text-slate-400 hover:text-white text-lg font-mono cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitLeave} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
                  Leave Category *
                </label>
                <select
                  value={leaveForm.leaveType}
                  onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Casual Leave">Casual Leave (Personal Work)</option>
                  <option value="Medical / Sick Leave">Medical / Sick Leave</option>
                  <option value="Duty / Emergency Leave">Duty / Emergency Leave</option>
                  <option value="Earned Annual Leave">Earned Annual Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={leaveForm.startDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={leaveForm.endDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
                  Reason for Time-Off *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain reason for absence..."
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-md shadow-blue-600/30 cursor-pointer"
                >
                  {submitting ? "Submitting..." : "Submit to Principal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
