import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { logSecurityAction } from "../utils/auditLogger";

export default function StaffEvaluationManager({ schoolId: propSchoolId }) {
  const { user } = useContext(AppContext);
  const { showToast } = useToast();
  const schoolId = propSchoolId || user?.school_id || user?.institution_code || "CAMPUS-01";

  const [evaluations, setEvaluations] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);

  const [form, setForm] = useState({
    teacherName: "",
    subject: "Mathematics",
    className: "Class 10-ICSE",
    progress: "65",
    rating: "4.8",
    status: "On Schedule",
    remarks: "Curriculum pacing aligned with ICSE board milestones.",
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`erp_staff_evaluation_${schoolId}`);
      if (saved) {
        setEvaluations(JSON.parse(saved));
      } else {
        setEvaluations([]);
      }
    } catch (e) {
      setEvaluations([]);
    }
  }, [schoolId]);

  const handleAddEvaluation = (e) => {
    e.preventDefault();
    if (!form.teacherName.trim()) {
      showToast("Please provide faculty member name.", "error");
      return;
    }

    const newEval = {
      id: `eval_${Date.now()}`,
      teacherName: form.teacherName.trim(),
      subject: form.subject,
      className: form.className.trim(),
      progress: Number(form.progress) || 50,
      rating: form.rating,
      status: form.status,
      remarks: form.remarks.trim(),
      evaluatedOn: new Date().toISOString().split("T")[0],
    };

    const updated = [newEval, ...evaluations];
    setEvaluations(updated);
    try {
      localStorage.setItem(`erp_staff_evaluation_${schoolId}`, JSON.stringify(updated));
    } catch (e) {}

    logSecurityAction({
      action: "Faculty Syllabus Evaluation Recorded",
      entityType: "EVALUATION",
      entityId: newEval.teacherName,
      details: `Evaluated ${newEval.teacherName} for ${newEval.subject} (${newEval.progress}% completed)`,
      user,
      schoolId,
    });

    showToast(`Evaluation recorded for ${newEval.teacherName}!`, "success");
    setForm({
      teacherName: "",
      subject: "Mathematics",
      className: "Class 10-ICSE",
      progress: "65",
      rating: "4.8",
      status: "On Schedule",
      remarks: "Curriculum pacing aligned with ICSE board milestones.",
    });
    setShowAddModal(false);
  };

  const handleDeleteEvaluation = (id) => {
    const updated = evaluations.filter((e) => e.id !== id);
    setEvaluations(updated);
    try {
      localStorage.setItem(`erp_staff_evaluation_${schoolId}`, JSON.stringify(updated));
    } catch (e) {}
    showToast("Evaluation record removed.", "info");
  };

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-[#1E293B]/80 backdrop-blur-xl border border-slate-700/70 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>⭐</span> Faculty Performance & Pedagogy
          </div>
          <h2 className="text-2xl font-black text-white">Staff Evaluation & Syllabus Progress</h2>
          <p className="text-slate-400 text-sm mt-1 max-w-xl">
            Audit faculty teaching performance, term syllabus completion percentages, and student satisfaction ratings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-violet-600 hover:bg-violet-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm shadow-lg shadow-violet-600/30 transition-all cursor-pointer flex items-center gap-2"
          >
            <span>➕</span>
            <span>Record Syllabus Evaluation</span>
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-[#1E293B]/80 backdrop-blur-xl border border-slate-700/70 rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-700/60 bg-slate-800/40 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-white">Faculty Syllabus Progress Roster</h3>
            <p className="text-xs text-slate-400 mt-0.5">Campus Node: {schoolId}</p>
          </div>
          <span className="text-xs bg-slate-900 border border-slate-700 text-violet-300 font-bold px-3 py-1 rounded-full">
            {evaluations.length} Evaluations
          </span>
        </div>

        {evaluations.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <span className="text-5xl block opacity-60">⭐</span>
            <h4 className="text-lg font-bold text-white">No Syllabus Evaluations Recorded (Clean Slate)</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Track faculty syllabus completion milestones, classroom observations, and term ratings by clicking below.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer mt-2"
            >
              + Record First Evaluation
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-700/70 text-slate-400 text-xs uppercase tracking-wider bg-slate-900/40">
                  <th className="p-4 pl-6">Faculty & Batch</th>
                  <th className="p-4">Subject</th>
                  <th className="p-4">Syllabus Completion</th>
                  <th className="p-4">Quality Rating</th>
                  <th className="p-4">Principal Remarks</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {evaluations.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 pl-6">
                      <p className="font-bold text-white">{e.teacherName}</p>
                      <span className="text-xs text-slate-400">{e.className}</span>
                    </td>
                    <td className="p-4 font-semibold text-slate-200">{e.subject}</td>
                    <td className="p-4">
                      <div className="w-36">
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span className="text-violet-400 font-mono">{e.progress}%</span>
                          <span className="text-slate-400 text-[10px]">{e.status}</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-violet-500 to-indigo-500 h-full rounded-full transition-all"
                            style={{ width: `${Math.min(e.progress, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-bold text-amber-300">
                      ⭐ {e.rating} <span className="text-[10px] text-slate-400">/ 5.0</span>
                    </td>
                    <td className="p-4 text-xs text-slate-300 max-w-xs">{e.remarks}</td>
                    <td className="p-4 pr-6 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleDeleteEvaluation(e.id)}
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

      {/* ADD EVALUATION MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#1E293B] border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-extrabold text-white mb-1">Record Syllabus Evaluation ⭐</h3>
            <p className="text-xs text-slate-400 mb-6">Log faculty teaching pace, syllabus milestone, and quality rating.</p>

            <form onSubmit={handleAddEvaluation} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Faculty Member Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. A. V. Deshmukh"
                  value={form.teacherName}
                  onChange={(e) => setForm({ ...form, teacherName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Subject</label>
                  <input
                    type="text"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Target Class</label>
                  <input
                    type="text"
                    value={form.className}
                    onChange={(e) => setForm({ ...form, className: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Syllabus Completed (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={form.progress}
                    onChange={(e) => setForm({ ...form, progress: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Quality Rating (1-5)</label>
                  <select
                    value={form.rating}
                    onChange={(e) => setForm({ ...form, rating: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value="5.0">5.0 (Outstanding)</option>
                    <option value="4.8">4.8 (Excellent)</option>
                    <option value="4.2">4.2 (Very Good)</option>
                    <option value="3.5">3.5 (Satisfactory)</option>
                    <option value="2.5">2.5 (Needs Support)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Executive Remarks</label>
                <textarea
                  rows={2}
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
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
                  className="bg-violet-600 hover:bg-violet-500 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-lg transition-all cursor-pointer"
                >
                  Save Evaluation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

