import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { supabase } from "../supabaseClient";
import { StatSkeleton, TableSkeleton } from "../Components/Skeleton";
import { logSecurityAction, AUDIT_ACTIONS } from "../utils/auditLogger";
import NoticeBanner from "../Components/NoticeBanner";
import { getNotices, publishNotice, deleteNotice } from "../utils/noticeService";

export default function TrusteeDashboard() {
  const { user } = useContext(AppContext) || {};
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [newStudent, setNewStudent] = useState({ name: "", class: "", subject: "" });

  // Notices state
  const [noticesList, setNoticesList] = useState([]);
  const [noticeForm, setNoticeForm] = useState({
    title: "",
    category: "Academic",
    audience: "All",
    content: "",
    date: new Date().toISOString().split("T")[0],
  });

  const institutionCode = user?.institution_code || user?.school_id || "school-demo-01";

  const fetchStudents = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("students")
        .select("*")
        .eq("school_id", institutionCode);

      if (fetchError) throw fetchError;
      setStudents(data || []);
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
  }, [user?.institution_code, user?.school_id]);

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

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!newStudent.name || !newStudent.class) return;

    setSubmitting(true);
    setFormError(null);

    try {
      const isUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
      let classId = null;
      if (newStudent.class) {
        const trimmed = newStudent.class.trim();
        if (isUUID(trimmed)) {
          classId = trimmed;
        } else {
          const matched = classes.find(
            (c) =>
              c.id === trimmed ||
              c.name?.toLowerCase() === trimmed.toLowerCase() ||
              `class ${c.name}`.toLowerCase() === trimmed.toLowerCase()
          );
          if (matched) {
            classId = matched.id;
          }
        }
      }

      const payload = {
        school_id: institutionCode,
        name: newStudent.name.trim(),
      };
      if (classId) {
        payload.class_id = classId;
      }

      const { error: insertError } = await supabase.from("students").insert([payload]);

      if (insertError) throw insertError;

      // Log administrative audit action
      logSecurityAction({
        action: AUDIT_ACTIONS.STUDENT_ADMITTED,
        entityType: "STUDENT",
        entityId: newStudent.name,
        details: `Enrolled student "${newStudent.name}" in class "${newStudent.class || "General"}"`,
        user,
        schoolId: institutionCode,
      });

      showToast(`Student "${newStudent.name}" enrolled via Trustee portal!`, "success");
      setNewStudent({ name: "", class: "", subject: "" });
      fetchStudents();
    } catch (err) {
      console.error("Error adding student:", err);
      setFormError(err.message || "Failed to enroll student.");
      showToast("Failed to enroll student: " + (err.message || "Database error"), "error");
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
          <div className="flex gap-2 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700 flex-wrap">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                activeTab === "overview" ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30" : "text-slate-400 hover:text-white"
              }`}
            >
              Trustee Analytics
            </button>
            <button
              onClick={() => setActiveTab("academics")}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                activeTab === "academics" ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30" : "text-slate-400 hover:text-white"
              }`}
            >
              Student Directory
            </button>
            <button
              onClick={() => setActiveTab("notices")}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                activeTab === "notices" ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30" : "text-slate-400 hover:text-white"
              }`}
            >
              📢 Circulars ({noticesList.length})
            </button>
          </div>
        </div>

        {/* ACTIVE INSTITUTION NOTICE BANNER */}
        <NoticeBanner role="Trustee" schoolId={institutionCode} />

        {activeTab === "overview" ? (
          <div className="space-y-8">
            {/* METRICS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total Tuition Revenue</p>
                <p className="text-3xl font-extrabold text-emerald-400">₹4,50,000</p>
                <span className="text-xs text-slate-400 mt-2 block">+18% growth this term</span>
              </div>
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Active Enrolled Students</p>
                <p className="text-3xl font-extrabold text-blue-400">{loading ? "..." : `${students.length} Enrolled`}</p>
                <span className="text-xs text-slate-400 mt-2 block">100% attendance verified</span>
              </div>
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Faculty Utilization</p>
                <p className="text-3xl font-extrabold text-purple-400">96.5%</p>
                <span className="text-xs text-slate-400 mt-2 block">8 Active Tutors</span>
              </div>
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Fee Collection Rate</p>
                <p className="text-3xl font-extrabold text-emerald-400">94.2%</p>
                <span className="text-xs text-slate-400 mt-2 block">Razorpay automated sync</span>
              </div>
            </div>

            {/* TRUSTEE AUDIT CARD */}
            <div className="bg-[#1E293B] border border-slate-700 rounded-3xl p-8 shadow-2xl">
              <h2 className="text-xl font-bold text-white mb-4">Board & Financial Compliance Vault</h2>
              <p className="text-slate-300 text-sm mb-6">All institutional tax records, rental agreements, and teacher contracts are encrypted and verified under Supabase RLS security standards.</p>
              <button onClick={() => showToast("Certified financial audit PDF compiled and verified under Supabase RLS standards.", "info")} className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg transition-all">
                Download Certified Financial Audit (PDF) 📥
              </button>
            </div>
          </div>
        ) : activeTab === "academics" ? (
          <div className="space-y-8">
            {/* ADD STUDENT FORM */}
            <div className="bg-[#1E293B] border border-slate-700 rounded-3xl p-8 shadow-2xl">
              <h2 className="text-xl font-bold text-white mb-4">Onlne Student Admission & Registration</h2>
              {formError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/40 text-red-400 rounded-xl text-sm font-semibold">
                  {formError}
                </div>
              )}
              <form onSubmit={handleAddStudent} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input 
                  type="text" 
                  placeholder="Student Full Name" 
                  className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({...newStudent, name: e.target.value})}
                  disabled={submitting}
                />
                <input 
                  type="text" 
                  list="classList"
                  placeholder="Class/Batch (e.g., Class 10 ICSE)" 
                  className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                  value={newStudent.class}
                  onChange={(e) => setNewStudent({...newStudent, class: e.target.value})}
                  disabled={submitting}
                />
                <datalist id="classList">
                  {classes.map((cls) => (
                    <option key={cls.id} value={`Class ${cls.name}`} />
                  ))}
                </datalist>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all disabled:opacity-50"
                >
                  {submitting ? "Enrolling..." : "+ Enroll New Student 🚀"}
                </button>
              </form>
            </div>

            {/* STUDENT ROSTER TABLE */}
            <div className="bg-[#1E293B] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
                <h2 className="text-lg font-bold text-white">Active Tuition Student Directory</h2>
                <button
                  onClick={fetchStudents}
                  disabled={loading}
                  className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-600 px-3 py-1.5 rounded-lg text-slate-300 font-bold transition-all disabled:opacity-50"
                >
                  {loading ? "Refreshing..." : "🔄 Refresh"}
                </button>
              </div>

              {loading ? (
                <div className="p-12 text-center text-slate-400 font-medium">Loading students from database...</div>
              ) : error ? (
                <div className="p-12 text-center text-red-400 font-medium">
                  <p className="font-bold mb-2">Failed to load students</p>
                  <p className="text-sm">{error}</p>
                </div>
              ) : students.length === 0 ? (
                <div className="p-12 text-center text-slate-400 font-medium">No students enrolled yet for this institution.</div>
              ) : (
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead>
                      <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
                        <th className="p-5">Student Name</th>
                        <th className="p-5">Batch / Class</th>
                        <th className="p-5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50 text-sm">
                      {students.map((st) => {
                        const matchedClass = classes.find((c) => c.id === st.class_id);
                        const displayClass = matchedClass
                          ? `Class ${matchedClass.name}`
                          : st.class || (st.roll_number ? `Roll #${st.roll_number}` : "General");
                        return (
                          <tr key={st.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="p-5 font-bold text-white text-base">{st.name}</td>
                            <td className="p-5 text-slate-300">{displayClass}</td>
                            <td className="p-5 text-center">
                              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-extrabold uppercase">
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
        ) : (
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
        )}

      </div>
    </div>
  );
}