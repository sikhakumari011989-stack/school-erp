import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { logSecurityAction } from "../utils/auditLogger";

export default function GrievanceTicketing({ schoolId: propSchoolId }) {
  const { user } = useContext(AppContext) || {};
  const { showToast } = useToast();
  const schoolId = propSchoolId || user?.school_id || user?.institution_code || "CAMPUS-01";

  const [tickets, setTickets] = useState([]);
  const [filterStatus, setFilterStatus] = useState("ALL"); // ALL | Open | Assigned | Resolved
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  const [form, setForm] = useState({
    complainantName: "",
    relationship: "Parent / Guardian", // Parent | Student | Staff
    category: "Academic Support", // Academic Support | Fee Query | Infrastructure & Labs | Facilities & Safety
    priority: "High", // Urgent | High | Normal
    subject: "",
    description: "",
    contactPhone: "",
  });

  const loadTickets = () => {
    try {
      const saved = localStorage.getItem(`erp_grievances_${schoolId}`);
      if (saved) {
        setTickets(JSON.parse(saved));
      } else {
        setTickets([]);
      }
    } catch {
      setTickets([]);
    }
  };

  useEffect(() => {
    loadTickets();
    const handleUpdate = () => loadTickets();
    window.addEventListener("erp-grievances-updated", handleUpdate);
    return () => window.removeEventListener("erp-grievances-updated", handleUpdate);
  }, [schoolId]);

  const saveTickets = (updated) => {
    setTickets(updated);
    try {
      localStorage.setItem(`erp_grievances_${schoolId}`, JSON.stringify(updated));
      window.dispatchEvent(new Event("erp-grievances-updated"));
    } catch (e) {
      console.warn("Storage save error:", e);
    }
  };

  const handleCreateTicket = (e) => {
    e.preventDefault();
    if (!form.complainantName.trim() || !form.subject.trim()) {
      showToast("Please provide complainant name and query subject.", "error");
      return;
    }

    const newTicket = {
      id: `ticket_${Date.now()}`,
      ticketNumber: `GRV-${Date.now().toString().slice(-4)}`,
      complainantName: form.complainantName.trim(),
      relationship: form.relationship,
      category: form.category,
      priority: form.priority,
      subject: form.subject.trim(),
      description: form.description.trim() || "Query submitted to executive administration.",
      contactPhone: form.contactPhone.trim() || "+91 98000 00000",
      assignedStaff: "Unassigned",
      status: "Open", // Open | Assigned | Resolved
      createdAt: new Date().toISOString().split("T")[0],
      resolutionNotes: "",
    };

    const updated = [newTicket, ...tickets];
    saveTickets(updated);

    logSecurityAction({
      action: "GRIEVANCE_TICKET_CREATED",
      entityType: "GRIEVANCE",
      entityId: newTicket.ticketNumber,
      details: `Created grievance ticket ${newTicket.ticketNumber} from ${newTicket.complainantName}: ${newTicket.subject}`,
      schoolId,
    });

    showToast(`Grievance ticket #${newTicket.ticketNumber} registered!`, "success");
    setForm({
      complainantName: "",
      relationship: "Parent / Guardian",
      category: "Academic Support",
      priority: "High",
      subject: "",
      description: "",
      contactPhone: "",
    });
    setShowAddModal(false);
  };

  const handleAssignStaff = (ticketId, staffName) => {
    const updated = tickets.map((t) =>
      t.id === ticketId ? { ...t, assignedStaff: staffName, status: "Assigned" } : t
    );
    saveTickets(updated);
    showToast(`Ticket assigned to ${staffName}!`, "info");
  };

  const handleResolveTicket = (ticketId) => {
    const updated = tickets.map((t) =>
      t.id === ticketId
        ? {
            ...t,
            status: "Resolved",
            resolvedAt: new Date().toISOString().split("T")[0],
            resolvedBy: user?.name || "Executive Principal",
          }
        : t
    );
    saveTickets(updated);
    showToast("Grievance ticket marked as Resolved! 🎉", "success");
  };

  const handleDeleteTicket = (ticketId) => {
    const updated = tickets.filter((t) => t.id !== ticketId);
    saveTickets(updated);
    showToast("Ticket removed.", "info");
  };

  const filteredTickets = tickets.filter((t) => {
    const matchesStatus = filterStatus === "ALL" || t.status === filterStatus;
    const matchesSearch =
      (t.ticketNumber || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.complainantName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.subject || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.category || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6 text-slate-100">
      {/* Header Banner */}
      <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-cyan-500/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all duration-300 ease-in-out">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-bold uppercase tracking-wider mb-2">
            <span>📩</span> Stakeholder Communication Hub
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Grievance Ticketing System</h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-xl">
            Official parent and student redressal inbox. Delegate investigation to faculty, accountants, or facility managers and track resolution.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black px-5 py-3 rounded-2xl text-xs sm:text-sm shadow-xl shadow-cyan-500/20 transition-all duration-300 ease-in-out hover:scale-[1.02] cursor-pointer flex items-center gap-2 border border-white/20"
        >
          <span>➕</span>
          <span>Log Stakeholder Query</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-xl shadow-cyan-500/5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Queries</p>
          <p className="text-2xl font-black text-white mt-1">{tickets.length}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-xl shadow-cyan-500/5">
          <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Open & Unassigned</p>
          <p className="text-2xl font-black text-rose-400 mt-1">
            {tickets.filter((t) => t.status === "Open").length}
          </p>
        </div>
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-xl shadow-cyan-500/5">
          <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Under Investigation</p>
          <p className="text-2xl font-black text-amber-400 mt-1">
            {tickets.filter((t) => t.status === "Assigned").length}
          </p>
        </div>
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-xl shadow-cyan-500/5">
          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Resolved</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">
            {tickets.filter((t) => t.status === "Resolved").length}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between shadow-xl shadow-cyan-500/5">
        <div className="flex-1 w-full md:w-auto">
          <input
            type="text"
            placeholder="Search ticket #, parent name, or subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          {["ALL", "Open", "Assigned", "Resolved"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-300 ease-in-out hover:scale-[1.02] cursor-pointer ${
                filterStatus === s
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-lg shadow-cyan-500/20"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl shadow-cyan-500/10 overflow-hidden">
        {filteredTickets.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <span className="text-4xl block opacity-60">📬</span>
            <h4 className="text-base font-bold text-white">No Grievance Tickets (Inbox Zero)</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              No parent or student concerns are pending. Click "Log Stakeholder Query" if a parent contacts administration.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 text-xs uppercase tracking-wider bg-white/5">
                  <th className="p-4 pl-6">Ticket & Stakeholder</th>
                  <th className="p-4">Subject & Details</th>
                  <th className="p-4">Priority & Dept</th>
                  <th className="p-4">Assigned Officer</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right pr-6">Adjudication</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {filteredTickets.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-white/5 transition-all duration-300 ease-in-out hover:scale-[1.005]"
                  >
                    <td className="p-4 pl-6 font-bold text-white">
                      <span className="font-mono text-xs text-cyan-400 font-extrabold block">
                        #{t.ticketNumber}
                      </span>
                      {t.complainantName}
                      <span className="block text-[10px] text-slate-400 font-normal">
                        {t.relationship} • {t.contactPhone}
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-white text-xs">{t.subject}</p>
                      <p className="text-[11px] text-slate-400 line-clamp-1">{t.description}</p>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mb-1 ${
                          t.priority === "Urgent"
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                            : t.priority === "High"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            : "bg-slate-700 text-slate-300"
                        }`}
                      >
                        {t.priority}
                      </span>
                      <span className="block text-[10px] text-slate-300">{t.category}</span>
                    </td>
                    <td className="p-4 text-xs">
                      {t.assignedStaff !== "Unassigned" ? (
                        <span className="font-bold text-cyan-300">{t.assignedStaff}</span>
                      ) : (
                        <select
                          onChange={(e) => handleAssignStaff(t.id, e.target.value)}
                          className="bg-slate-950/80 border border-white/10 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-cyan-400"
                        >
                          <option value="">Assign Officer...</option>
                          <option value="Head Accountant">Head Accountant</option>
                          <option value="Senior Academic Coordinator">Academic Coordinator</option>
                          <option value="Campus Facilities Officer">Facilities Officer</option>
                          <option value="IT & Lab Administrator">IT & Lab Administrator</option>
                        </select>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-extrabold uppercase ${
                          t.status === "Resolved"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : t.status === "Assigned"
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="p-4 text-right pr-6">
                      <div className="flex items-center justify-end gap-1.5">
                        {t.status !== "Resolved" && (
                          <button
                            onClick={() => handleResolveTicket(t.id)}
                            className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-xs font-bold transition-all duration-300 ease-in-out hover:scale-[1.02] cursor-pointer"
                          >
                            ✓ Mark Resolved
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteTicket(t.id)}
                          className="text-xs text-rose-400 hover:text-rose-300 px-2 py-1 transition-all cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create Grievance */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900/95 border border-white/10 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl shadow-cyan-500/20 relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-black text-white">Log Stakeholder Grievance</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Complainant Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Mr. Rajesh Verma (Parent)"
                    value={form.complainantName}
                    onChange={(e) => setForm({ ...form, complainantName: e.target.value })}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g., +91 98200 12345"
                    value={form.contactPhone}
                    onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Stakeholder
                  </label>
                  <select
                    value={form.relationship}
                    onChange={(e) => setForm({ ...form, relationship: e.target.value })}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="Parent / Guardian">Parent / Guardian</option>
                    <option value="Student">Enrolled Student</option>
                    <option value="Faculty / Staff">Faculty / Staff</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Department
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="Academic Support">Academic Support</option>
                    <option value="Fee Query & Receipts">Fee Query</option>
                    <option value="Infrastructure & Labs">Infrastructure & Labs</option>
                    <option value="Facilities & Safety">Facilities & Safety</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Priority
                  </label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="Urgent">Urgent (24h)</option>
                    <option value="High">High (48h)</option>
                    <option value="Normal">Normal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Query Subject
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Chemistry lab apparatus requirement or fee receipt query"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Full Details / Conversation Log
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe the complaint in detail..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black px-5 py-2.5 rounded-xl text-xs shadow-lg shadow-cyan-500/20 transition-all duration-300 ease-in-out hover:scale-[1.02]"
                >
                  Submit Ticket 📩
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

