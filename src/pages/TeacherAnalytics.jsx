import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";

export default function TeacherAnalytics() {
  const { user } = useContext(AppContext);
  const { showToast } = useToast();
  const schoolId = user?.school_id || user?.institution_code || "CAMPUS-01";

  const [activeTab, setActiveTab] = useState("analytics");
  const [papers, setPapers] = useState([]);
  const [supportStudents, setSupportStudents] = useState([]);

  // Modals
  const [showWatchlistModal, setShowWatchlistModal] = useState(false);
  const [showPaperModal, setShowPaperModal] = useState(false);

  // Forms
  const [watchForm, setWatchForm] = useState({
    name: "",
    className: "Class 10-A",
    issue: "",
    action: "",
  });

  const [paperForm, setPaperForm] = useState({
    title: "",
    className: "Class 10-A",
    format: "PDF",
  });

  useEffect(() => {
    try {
      const rawWatch = localStorage.getItem(`erp_academic_watchlist_${schoolId}`);
      if (rawWatch) {
        setSupportStudents(JSON.parse(rawWatch));
      } else {
        setSupportStudents([]);
      }

      const rawPapers = localStorage.getItem(`erp_question_papers_${schoolId}`);
      if (rawPapers) {
        setPapers(JSON.parse(rawPapers));
      } else {
        setPapers([]);
      }
    } catch (e) {
      setSupportStudents([]);
      setPapers([]);
    }
  }, [schoolId]);

  const handleAddWatchlist = (e) => {
    e.preventDefault();
    if (!watchForm.name.trim() || !watchForm.issue.trim()) {
      showToast("Please provide student name and academic concern.", "error");
      return;
    }

    const newEntry = {
      id: `watch_${Date.now()}`,
      name: watchForm.name.trim(),
      class: watchForm.className,
      issue: watchForm.issue.trim(),
      action: watchForm.action.trim() || "Remedial Coaching Assigned",
      created_at: new Date().toISOString(),
    };

    const updated = [newEntry, ...supportStudents];
    setSupportStudents(updated);
    try {
      localStorage.setItem(`erp_academic_watchlist_${schoolId}`, JSON.stringify(updated));
    } catch (e) {}

    showToast(`Added ${newEntry.name} to academic support watchlist.`, "success");
    setWatchForm({ name: "", className: "Class 10-A", issue: "", action: "" });
    setShowWatchlistModal(false);
  };

  const handleRemoveWatchlist = (id) => {
    const updated = supportStudents.filter((s) => s.id !== id);
    setSupportStudents(updated);
    try {
      localStorage.setItem(`erp_academic_watchlist_${schoolId}`, JSON.stringify(updated));
    } catch (e) {}
    showToast("Watchlist entry resolved and archived.", "info");
  };

  const handleAddPaper = (e) => {
    e.preventDefault();
    if (!paperForm.title.trim()) {
      showToast("Please provide question paper title.", "error");
      return;
    }

    const newPaper = {
      id: `paper_${Date.now()}`,
      title: paperForm.title.trim(),
      class: paperForm.className,
      format: paperForm.format,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
    };

    const updated = [newPaper, ...papers];
    setPapers(updated);
    try {
      localStorage.setItem(`erp_question_papers_${schoolId}`, JSON.stringify(updated));
    } catch (e) {}

    showToast(`Question paper "${newPaper.title}" registered in question bank!`, "success");
    setPaperForm({ title: "", className: "Class 10-A", format: "PDF" });
    setShowPaperModal(false);
  };

  const handleDeletePaper = (id) => {
    const updated = papers.filter((p) => p.id !== id);
    setPapers(updated);
    try {
      localStorage.setItem(`erp_question_papers_${schoolId}`, JSON.stringify(updated));
    } catch (e) {}
    showToast("Question paper removed.", "info");
  };

  return (
    <div className="relative text-slate-200 min-h-full pb-10 font-sans">
      <div className="fixed top-0 left-10 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="mb-8 flex justify-between items-center flex-wrap gap-4">
          <div>
            <p className="text-purple-300 text-sm font-semibold mb-1 uppercase tracking-widest">Faculty Operations</p>
            <h1 className="text-3xl font-extrabold text-white">Performance Analytics & Question Bank 📊</h1>
            <p className="text-slate-400 text-sm mt-1">Class monitoring, remedial intervention lists, and test papers</p>
          </div>
          <div className="flex gap-2 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700">
            <button
              onClick={() => setActiveTab("analytics")}
              className={`px-5 py-2 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                activeTab === "analytics" ? "bg-purple-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
              }`}
            >
              Academic Watchlist ({supportStudents.length})
            </button>
            <button
              onClick={() => setActiveTab("papers")}
              className={`px-5 py-2 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                activeTab === "papers" ? "bg-purple-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
              }`}
            >
              Question Bank ({papers.length})
            </button>
          </div>
        </div>

        {activeTab === "analytics" ? (
          <div className="space-y-8">
            {/* STATS OVERVIEW */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Class Average Score</p>
                <p className="text-3xl font-extrabold text-emerald-400">82.4%</p>
                <span className="text-xs text-slate-400 mt-1 block">Term evaluation standing</span>
              </div>
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Active Watchlist</p>
                <p className="text-3xl font-extrabold text-orange-400">{supportStudents.length} Students</p>
                <span className="text-xs text-slate-400 mt-1 block">Remedial support active</span>
              </div>
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Test Papers in Bank</p>
                <p className="text-3xl font-extrabold text-blue-400">{papers.length} Papers</p>
                <span className="text-xs text-slate-400 mt-1 block">Faculty verified question banks</span>
              </div>
            </div>

            {/* STUDENTS NEEDING EXTRA SUPPORT TABLE */}
            <div className="bg-[#1E293B] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-white">Students Requiring Academic Support ⚠️</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Track struggling scholars, weak subject topics, and remedial intervention</p>
                </div>
                <button
                  onClick={() => setShowWatchlistModal(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>➕</span>
                  <span>Add to Watchlist</span>
                </button>
              </div>

              {supportStudents.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <span className="text-4xl block mb-2 opacity-60">🎯</span>
                  <p className="font-bold text-white text-base">No students currently on academic watchlist (Clean Slate).</p>
                  <p className="text-xs text-slate-400 mt-1">All enrolled students are meeting benchmark performance. Click "Add to Watchlist" to flag scholars needing support.</p>
                </div>
              ) : (
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider bg-slate-900/40">
                        <th className="p-5">Student Name & Class</th>
                        <th className="p-5">Performance / Attendance Concern</th>
                        <th className="p-5">Intervention Action</th>
                        <th className="p-5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50 text-sm">
                      {supportStudents.map((st) => (
                        <tr key={st.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="p-5 font-bold text-white">
                            {st.name} <span className="text-xs text-slate-400 block font-normal">{st.class}</span>
                          </td>
                          <td className="p-5 text-orange-400 font-medium">{st.issue}</td>
                          <td className="p-5 text-slate-300 font-semibold">{st.action}</td>
                          <td className="p-5 text-right">
                            <button
                              onClick={() => handleRemoveWatchlist(st.id)}
                              className="bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-white border border-emerald-500/30 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer"
                            >
                              ✓ Resolved
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">Upload Question Paper Source</h2>
                <p className="text-slate-400 text-xs">Register question sets and answer keys for upcoming exams or weekly tests.</p>
              </div>
              <button
                onClick={() => setShowPaperModal(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-2 text-xs sm:text-sm"
              >
                <span>➕</span>
                <span>Register Question Paper</span>
              </button>
            </div>

            <div className="bg-[#1E293B] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
                <h2 className="text-lg font-bold text-white">Institutional Question Bank Repository</h2>
                <span className="text-xs bg-slate-900 border border-slate-700 text-purple-300 font-bold px-3 py-1 rounded-full">
                  {papers.length} Papers
                </span>
              </div>

              {papers.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <span className="text-4xl block mb-2 opacity-60">📑</span>
                  <p className="font-bold text-white text-base">Question bank is empty (Clean Slate).</p>
                  <p className="text-xs text-slate-400 mt-1">Click "Register Question Paper" above to log assessment blueprints.</p>
                </div>
              ) : (
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider bg-slate-900/40">
                        <th className="p-5">Paper Title</th>
                        <th className="p-5">Target Class</th>
                        <th className="p-5">File Format</th>
                        <th className="p-5">Date Registered</th>
                        <th className="p-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50 text-sm">
                      {papers.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="p-5 font-bold text-white">{p.title}</td>
                          <td className="p-5 text-slate-300">{p.class}</td>
                          <td className="p-5">
                            <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2.5 py-0.5 rounded text-xs font-mono font-bold">
                              {p.format}
                            </span>
                          </td>
                          <td className="p-5 text-xs text-slate-400">{p.date}</td>
                          <td className="p-5 text-right">
                            <button
                              onClick={() => handleDeletePaper(p.id)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2.5 py-1 rounded text-xs font-bold transition-colors cursor-pointer"
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
          </div>
        )}
      </div>

      {/* WATCHLIST MODAL */}
      {showWatchlistModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#1E293B] border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-extrabold text-white mb-1">Add Scholar to Watchlist ⚠️</h3>
            <p className="text-xs text-slate-400 mb-6">Log low scores or attendance lapses for remedial faculty support.</p>

            <form onSubmit={handleAddWatchlist} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Student Name</label>
                <input
                  type="text"
                  placeholder="e.g. Aryan Patel"
                  value={watchForm.name}
                  onChange={(e) => setWatchForm({ ...watchForm, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Class Batch</label>
                <input
                  type="text"
                  value={watchForm.className}
                  onChange={(e) => setWatchForm({ ...watchForm, className: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Concern / Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Scored 32% in Quadratic Equations test"
                  value={watchForm.issue}
                  onChange={(e) => setWatchForm({ ...watchForm, issue: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Remedial Action</label>
                <input
                  type="text"
                  placeholder="e.g. Assigned 30-min daily after-school mentoring"
                  value={watchForm.action}
                  onChange={(e) => setWatchForm({ ...watchForm, action: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowWatchlistModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-lg transition-all cursor-pointer"
                >
                  Save to Watchlist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAPER MODAL */}
      {showPaperModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#1E293B] border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-extrabold text-white mb-1">Register Question Paper 📑</h3>
            <p className="text-xs text-slate-400 mb-6">Log exam question bank sets and assessment source files.</p>

            <form onSubmit={handleAddPaper} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Paper Title</label>
                <input
                  type="text"
                  placeholder="e.g. Mathematics Mid-Term Question Paper Set B"
                  value={paperForm.title}
                  onChange={(e) => setPaperForm({ ...paperForm, title: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Target Class</label>
                <input
                  type="text"
                  value={paperForm.className}
                  onChange={(e) => setPaperForm({ ...paperForm, className: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">File Format</label>
                <select
                  value={paperForm.format}
                  onChange={(e) => setPaperForm({ ...paperForm, format: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="PDF">PDF Document (.pdf)</option>
                  <option value="DOCX">Microsoft Word (.docx)</option>
                  <option value="ZIP">ZIP Archive (.zip)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPaperModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-lg transition-all cursor-pointer"
                >
                  Save Paper
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}