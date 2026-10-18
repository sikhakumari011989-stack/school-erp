import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { logSecurityAction } from "../utils/auditLogger";

const CONDUCT_CATEGORIES = [
  "Merit Commendation",
  "Academic Integrity",
  "Attendance Warning",
  "Uniform & Dress Code",
  "Campus Behavior Incident",
  "Sportsmanship Award",
];

export default function DisciplinaryLogManager({ schoolId: propSchoolId }) {
  const { user } = useContext(AppContext);
  const { showToast } = useToast();
  const schoolId = propSchoolId || user?.school_id || user?.institution_code || "CAMPUS-01";

  const [records, setRecords] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterType, setFilterType] = useState("ALL");

  const [form, setForm] = useState({
    studentName: "",
    rollNumber: "STU-101",
    category: "Merit Commendation",
    description: "",
    actionTaken: "Officially Recorded in Institutional Dossier",
    status: "Verified",
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`erp_conduct_log_${schoolId}`);
      if (saved) {
        setRecords(JSON.parse(saved));
      } else {
        setRecords([]);
      }
    } catch (e) {
      setRecords([]);
    }
  }, [schoolId]);

  const handleAddRecord = (e) => {
    e.preventDefault();
    if (!form.studentName.trim() || !form.description.trim()) {
      showToast("Please provide student name and record details.", "error");
      return;
    }

    const newRec = {
      id: `cond_${Date.now()}`,
      studentName: form.studentName.trim(),
      rollNumber: form.rollNumber.trim(),
      category: form.category,
      description: form.description.trim(),
      actionTaken: form.actionTaken.trim() || "Counseled by Class Teacher",
      status: form.status,
      date: new Date().toISOString().split("T")[0],
    };

    const updated = [newRec, ...records];
    setRecords(updated);
    try {
      localStorage.setItem(`erp_conduct_log_${schoolId}`, JSON.stringify(updated));
    } catch (e) {}

    logSecurityAction({
      action: `Student Conduct Entry Logged (${newRec.category})`,
      entityType: "CONDUCT",
      entityId: newRec.studentName,
      details: `${newRec.category} for ${newRec.studentName} (${newRec.rollNumber})`,
      user,
      schoolId,
    });

    showToast(`Conduct record logged for ${newRec.studentName}!`, "success");
    setForm({
      studentName: "",
      rollNumber: "STU-101",
      category: "Merit Commendation",
      description: "",
      actionTaken: "Officially Recorded in Institutional Dossier",
      status: "Verified",
    });
    setShowAddModal(false);
  };

  const handleDeleteRecord = (id, name) => {
    const updated = records.filter((r) => r.id !== id);
    setRecords(updated);
    try {
      localStorage.setItem(`erp_conduct_log_${schoolId}`, JSON.stringify(updated));
    } catch (e) {}
    showToast(`Conduct record for "${name || "Scholar"}" archived.`, "info");
  };

  const filteredRecords = records.filter((r) => {
    if (filterType === "ALL") return true;
    return r.category === filterType;
  });

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-[#1E293B]/80 backdrop-blur-xl border border-slate-700/70 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>⚖️</span> Behavioral Standing & Commendations
          </div>
          <h2 className="text-2xl font-black text-white">Disciplinary & Conduct Log</h2>
          <p className="text-slate-400 text-sm mt-1 max-w-xl">
            Maintain institutional records of student merit awards, sportsmanship commendations, uniform compliance, and behavioral incidents.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-teal-600 hover:bg-teal-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm shadow-lg shadow-teal-600/30 transition-all cursor-pointer flex items-center gap-2"
          >
            <span>➕</span>
            <span>Log Conduct Entry</span>
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-[#1E293B]/80 backdrop-blur-xl border border-slate-700/70 rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-700/60 bg-slate-800/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-bold text-white">Student Behavioral Record Dossier</h3>
            <p className="text-xs text-slate-400 mt-0.5">Campus Node: {schoolId}</p>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1">
            <button
              onClick={() => setFilterType("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterType === "ALL" ? "bg-teal-600 text-white" : "bg-slate-900 text-slate-400 hover:text-white"
              }`}
            >
              All Records ({records.length})
            </button>
            {CONDUCT_CATEGORIES.map((cat) => {
              const count = records.filter((r) => r.category === cat).length;
              if (count === 0 && filterType !== cat) return null;
              return (
                <button
                  key={cat}
                  onClick={() => setFilterType(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    filterType === cat ? "bg-teal-600 text-white" : "bg-slate-900 text-slate-400 hover:text-white"
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {records.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <span className="text-5xl block opacity-60">⚖️</span>
            <h4 className="text-lg font-bold text-white">No Conduct Records Logged (Clean Slate)</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              All enrolled scholars have an unblemished behavioral file. Click "Log Conduct Entry" to record official commendations or warnings.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/30 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer mt-2"
            >
              + Log Conduct Entry
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-700/70 text-slate-400 text-xs uppercase tracking-wider bg-slate-900/40">
                  <th className="p-4 pl-6">Scholar Name & ID</th>
                  <th className="p-4">Classification</th>
                  <th className="p-4">Incident / Commendation Summary</th>
                  <th className="p-4">Administrative Action</th>
                  <th className="p-4 text-center">Date Logged</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 pl-6">
                      <p className="font-bold text-white">{r.studentName}</p>
                      <span className="text-xs font-mono text-teal-400">{r.rollNumber}</span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          r.category.includes("Merit") || r.category.includes("Award")
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                            : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                        }`}
                      >
                        {r.category}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-slate-200 max-w-sm">{r.description}</td>
                    <td className="p-4 text-xs text-slate-300 font-semibold">{r.actionTaken}</td>
                    <td className="p-4 text-center text-xs font-mono text-slate-400">{r.date}</td>
                    <td className="p-4 pr-6 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleDeleteRecord(r.id, r.studentName)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD CONDUCT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#1E293B] border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-extrabold text-white mb-1">Log Student Conduct Entry ⚖️</h3>
            <p className="text-xs text-slate-400 mb-6">Record commendations, merit awards, or behavioral notices.</p>

            <form onSubmit={handleAddRecord} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Student Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Tanmay S. Rane"
                  value={form.studentName}
                  onChange={(e) => setForm({ ...form, studentName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Roll / Personal ID</label>
                <input
                  type="text"
                  placeholder="e.g. STU-101"
                  value={form.rollNumber}
                  onChange={(e) => setForm({ ...form, rollNumber: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Classification Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500"
                >
                  {CONDUCT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Incident / Commendation Summary *</label>
                <textarea
                  rows={3}
                  placeholder="Concise description of event or achievement..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Action Taken / Counsel</label>
                <input
                  type="text"
                  placeholder="e.g. Awarded Certificate of Excellence or Written Warning Issued"
                  value={form.actionTaken}
                  onChange={(e) => setForm({ ...form, actionTaken: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500"
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
                  className="bg-teal-600 hover:bg-teal-500 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-lg transition-all cursor-pointer"
                >
                  Save to Dossier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

