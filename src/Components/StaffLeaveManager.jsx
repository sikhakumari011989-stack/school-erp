import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { logSecurityAction } from "../utils/auditLogger";

export default function StaffLeaveManager({ schoolId: propSchoolId }) {
  const { user } = useContext(AppContext);
  const { showToast } = useToast();
  const schoolId = propSchoolId || user?.school_id || user?.institution_code || "CAMPUS-01";

  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filter, setFilter] = useState("ALL"); // 'ALL' | 'Pending' | 'Approved' | 'Rejected'

  const [form, setForm] = useState({
    applicantName: "",
    category: "Faculty / Teaching Staff",
    leaveType: "Casual Leave",
    startDate: "",
    endDate: "",
    reason: "",
  });

  const loadLeaves = () => {
    setLoading(true);
    try {
      const saved = localStorage.getItem(`erp_leave_requests_${schoolId}`);
      if (saved) {
        setLeaves(JSON.parse(saved));
      } else {
        setLeaves([]);
      }
    } catch (e) {
      setLeaves([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaves();
    const handleUpdate = () => loadLeaves();
    window.addEventListener("erp-leaves-updated", handleUpdate);
    return () => window.removeEventListener("erp-leaves-updated", handleUpdate);
  }, [schoolId]);

  const handleStatusChange = (id, newStatus, applicant) => {
    const updated = leaves.map((l) => (l.id === id ? { ...l, status: newStatus } : l));
    setLeaves(updated);
    try {
      localStorage.setItem(`erp_leave_requests_${schoolId}`, JSON.stringify(updated));
      window.dispatchEvent(new Event("erp-leaves-updated"));
    } catch (e) {}

    logSecurityAction({
      action: `Staff Leave Request ${newStatus}`,
      entityType: "LEAVE",
      entityId: id,
      details: `${newStatus} leave application for ${applicant || "Staff Member"}`,
      user,
      schoolId,
    });

    showToast(`Leave application marked as ${newStatus}!`, newStatus === "Approved" ? "success" : "info");
  };

  const handleAddLeave = (e) => {
    e.preventDefault();
    if (!form.applicantName.trim() || !form.startDate || !form.endDate || !form.reason.trim()) {
      showToast("Please provide applicant name, dates, and reason.", "error");
      return;
    }

    const newReq = {
      id: `leave_${Date.now()}`,
      schoolId,
      applicantName: form.applicantName.trim(),
      category: form.category,
      leaveType: form.leaveType,
      startDate: form.startDate,
      endDate: form.endDate,
      reason: form.reason.trim(),
      status: "Pending Principal Review",
      appliedOn: new Date().toISOString().split("T")[0],
    };

    const updated = [newReq, ...leaves];
    setLeaves(updated);
    try {
      localStorage.setItem(`erp_leave_requests_${schoolId}`, JSON.stringify(updated));
      window.dispatchEvent(new Event("erp-leaves-updated"));
    } catch (e) {}

    showToast(`Leave application recorded for ${newReq.applicantName}!`, "success");
    setForm({
      applicantName: "",
      category: "Faculty / Teaching Staff",
      leaveType: "Casual Leave",
      startDate: "",
      endDate: "",
      reason: "",
    });
    setShowAddModal(false);
  };

  const filteredLeaves = leaves.filter((l) => {
    if (filter === "ALL") return true;
    if (filter === "Pending") return l.status.includes("Pending");
    return l.status === filter;
  });

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-[#1E293B]/80 backdrop-blur-xl border border-slate-700/70 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>📝</span> Institutional HR & Attendance
          </div>
          <h2 className="text-2xl font-black text-white">Staff Leave Rules & Approvals</h2>
          <p className="text-slate-400 text-sm mt-1 max-w-xl">
            Review faculty and non-teaching personnel leave applications, grant approvals, and manage institutional leave balance rules.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm shadow-lg shadow-amber-600/30 transition-all cursor-pointer flex items-center gap-2"
          >
            <span>➕</span>
            <span>Record Leave Application</span>
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-[#1E293B]/80 backdrop-blur-xl border border-slate-700/70 rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-700/60 bg-slate-800/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-bold text-white">Pending & Verified Leave Applications</h3>
            <p className="text-xs text-slate-400 mt-0.5">Campus Node: {schoolId}</p>
          </div>

          <div className="flex items-center gap-2">
            {["ALL", "Pending", "Approved", "Rejected"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filter === f ? "bg-amber-600 text-white" : "bg-slate-900 text-slate-400 hover:text-white"
                }`}
              >
                {f} ({f === "ALL" ? leaves.length : leaves.filter((l) => (f === "Pending" ? l.status.includes("Pending") : l.status === f)).length})
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading leave roster...</div>
        ) : filteredLeaves.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <span className="text-5xl block opacity-60">📝</span>
            <h4 className="text-lg font-bold text-white">No Leave Applications on File (Clean Slate)</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Faculty and non-teaching personnel leave submissions will appear here for Principal review and approval.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer mt-2"
            >
              + Record Leave
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-700/70 text-slate-400 text-xs uppercase tracking-wider bg-slate-900/40">
                  <th className="p-4 pl-6">Applicant Name & Role</th>
                  <th className="p-4">Leave Category</th>
                  <th className="p-4">Duration & Reason</th>
                  <th className="p-4 text-center">Review Status</th>
                  <th className="p-4 pr-6 text-right">Executive Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {filteredLeaves.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 pl-6">
                      <p className="font-bold text-white">{l.applicantName}</p>
                      <span className="text-xs text-slate-400">{l.category}</span>
                    </td>
                    <td className="p-4">
                      <span className="bg-slate-900 border border-slate-700 text-amber-300 px-2.5 py-1 rounded text-xs font-bold">
                        {l.leaveType}
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="font-mono text-xs text-slate-200">
                        {l.startDate} &rarr; {l.endDate}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{l.reason}</p>
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                          l.status === "Approved"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : l.status === "Rejected"
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        }`}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right whitespace-nowrap">
                      {l.status.includes("Pending") ? (
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => handleStatusChange(l.id, "Approved", l.applicantName)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer shadow flex items-center gap-1"
                          >
                            <span>✓</span>
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleStatusChange(l.id, "Rejected", l.applicantName)}
                            className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer shadow flex items-center gap-1"
                          >
                            <span>✕</span>
                            <span>Reject</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStatusChange(l.id, "Pending Principal Review", l.applicantName)}
                          className="text-slate-400 hover:text-white text-xs underline cursor-pointer"
                        >
                          Reopen Review
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD LEAVE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#1E293B] border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-extrabold text-white mb-1">Record Staff Leave Application 📝</h3>
            <p className="text-xs text-slate-400 mb-6">Log faculty or support staff leave entry for administrative sign-off.</p>

            <form onSubmit={handleAddLeave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Applicant Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Meera S. Joshi"
                  value={form.applicantName}
                  onChange={(e) => setForm({ ...form, applicantName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Staff Role Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Faculty / Teaching Staff">Faculty / Teaching Staff</option>
                  <option value="Campus Driver / Transport">Campus Driver / Transport</option>
                  <option value="Security Personnel">Security Personnel</option>
                  <option value="Lab & Facilities Assistant">Lab & Facilities Assistant</option>
                  <option value="Administrative Staff">Administrative Staff</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Leave Category</label>
                <select
                  value={form.leaveType}
                  onChange={(e) => setForm({ ...form, leaveType: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Casual Leave">Casual Leave</option>
                  <option value="Sick / Medical Leave">Sick / Medical Leave</option>
                  <option value="Maternity / Paternity Leave">Maternity / Paternity Leave</option>
                  <option value="Emergency Leave">Emergency Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">End Date *</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Reason for Leave *</label>
                <textarea
                  rows={3}
                  placeholder="Official explanation for institutional records..."
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-lg transition-all cursor-pointer"
                >
                  File Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

