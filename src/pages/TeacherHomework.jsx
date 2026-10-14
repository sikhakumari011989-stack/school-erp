import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { supabase } from "../supabaseClient";
import { resolveSchoolUuid } from "../utils/supabaseHelpers";
import { TableSkeleton } from "../Components/Skeleton";
import { logSecurityAction, AUDIT_ACTIONS } from "../utils/auditLogger";

export default function TeacherHomework() {
  const { user } = useContext(AppContext);
  const { showToast } = useToast();
  const [classes, setClasses] = useState([]);
  const [homeworkList, setHomeworkList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    subject: "",
    description: "",
    due_date: "",
    class_id: "",
  });

  // Fetch data on page load
  useEffect(() => {
    fetchClasses();
    fetchHomework();
  }, []);

  const fetchClasses = async () => {
    try {
      const { data } = await supabase.from("classes").select("*");
      if (data) setClasses(data);
    } catch (err) {
      console.error("Error fetching classes:", err);
    }
  };

  const fetchHomework = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("homework")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setHomeworkList(data);
    } catch (err) {
      console.error("Error fetching homework:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.class_id || !formData.subject) {
      showToast("Please fill in all required assignment details", "error");
      return;
    }

    setSubmitting(true);

    try {
      const schoolUuid = await resolveSchoolUuid(user?.school_id || user?.institution_code);

      const payload = {
        school_id: schoolUuid,
        class_id: formData.class_id,
        teacher_id: user?.id && user.id.length === 36 ? user.id : null,
        title: formData.title.trim(),
        subject: formData.subject.trim(),
        description: formData.description.trim(),
        due_date: formData.due_date,
      };

      const { error } = await supabase.from("homework").insert([payload]);

      if (error) throw error;

      // Log security audit
      logSecurityAction({
        action: AUDIT_ACTIONS.HOMEWORK_PUBLISHED,
        entityType: "HOMEWORK",
        entityId: payload.title,
        details: `Assigned homework "${payload.title}" (${payload.subject}) for class`,
        user,
        schoolId: schoolUuid,
      });

      showToast(`Homework "${formData.title}" assigned successfully!`, "success");
      setFormData({ title: "", subject: "", description: "", due_date: "", class_id: "" });
      fetchHomework(); // Refresh list immediately
    } catch (error) {
      console.error("Database error assigning homework:", error);
      showToast("Failed to assign homework to database.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteHomework = async (id) => {
    try {
      const { error } = await supabase.from("homework").delete().eq("id", id);
      if (error) throw error;
      setHomeworkList((prev) => prev.filter((hw) => hw.id !== id));
      showToast("Assignment removed.", "info");
    } catch (err) {
      console.error("Error deleting assignment:", err);
      showToast("Could not delete assignment.", "error");
    }
  };

  // Helper to map class ID back to readable name
  const getClassName = (id) => {
    const cls = classes.find((c) => c.id === id);
    return cls ? `Class ${cls.name}` : "General Batch";
  };

  return (
    <div className="relative text-slate-200 min-h-full pb-10 font-sans">
      <div className="fixed top-0 left-10 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="mb-8 flex justify-between items-center flex-wrap gap-4">
          <div>
            <p className="text-blue-300 text-sm font-semibold mb-1 uppercase tracking-widest">
              Faculty Academic Suite
            </p>
            <h1 className="text-3xl font-extrabold text-white">Publish Homework & Tasks 📚</h1>
            <p className="text-slate-400 text-sm mt-1">
              Create curriculum assignments synchronized directly with student portals in real time
            </p>
          </div>
          <button
            onClick={fetchHomework}
            className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2 rounded-xl text-slate-300 font-bold transition-all"
          >
            🔄 Refresh List
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT: ASSIGNMENT FORM */}
          <div className="lg:col-span-1 bg-[#1E293B]/70 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-6 shadow-2xl h-fit">
            <h2 className="text-xl font-bold text-white mb-6">Create Assignment</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Target Classroom Batch *
                </label>
                <select
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 font-bold"
                  value={formData.class_id}
                  onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                >
                  <option value="">Select a Classroom...</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      Class {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Subject *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Mathematics, Physics"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 text-sm"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Assignment Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Quadratic Equations Practice"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 text-sm font-semibold"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Submission Deadline *
                </label>
                <input
                  type="date"
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 [color-scheme:dark] text-sm"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Instructions & Question Details
                </label>
                <textarea
                  required
                  placeholder="Write assignment instructions, exercise numbers, or reference book pages..."
                  rows="3"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 text-sm"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold py-4 px-4 rounded-xl shadow-lg shadow-blue-600/30 disabled:opacity-50 transition-all mt-4"
              >
                {submitting ? "Publishing Assignment..." : "Publish Homework to Portal 🚀"}
              </button>
            </form>
          </div>

          {/* RIGHT: LIVE ASSIGNMENTS LIST */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-bold text-white mb-6">Active Curriculum Assignments</h2>
            <div className="bg-[#1E293B]/70 backdrop-blur-xl border border-slate-700/60 rounded-3xl shadow-2xl overflow-hidden">
              {loading ? (
                <div className="p-6">
                  <TableSkeleton rows={4} cols={3} />
                </div>
              ) : homeworkList.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <span className="text-4xl block mb-3 opacity-60">📂</span>
                  <p className="font-bold text-white text-base">No homework assigned yet.</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Assignments created here will instantly appear on the student portal.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900/40 border-b border-slate-700/60 text-slate-400 text-xs uppercase tracking-wider">
                        <th className="p-5">Subject & Title</th>
                        <th className="p-5">Class Batch</th>
                        <th className="p-5">Deadline</th>
                        <th className="p-5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50 text-sm">
                      {homeworkList.map((hw) => (
                        <tr key={hw.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="p-5">
                            <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider block mb-0.5">
                              {hw.subject}
                            </span>
                            <p className="font-bold text-white text-base">{hw.title}</p>
                            <p className="text-xs text-slate-400 mt-1 line-clamp-1">{hw.description}</p>
                          </td>
                          <td className="p-5">
                            <span className="bg-slate-800 border border-slate-700 text-slate-300 px-3 py-1 rounded-lg text-xs font-bold">
                              {getClassName(hw.class_id)}
                            </span>
                          </td>
                          <td className="p-5 font-bold text-amber-400">{hw.due_date || "No deadline"}</td>
                          <td className="p-5 text-right">
                            <button
                              onClick={() => handleDeleteHomework(hw.id)}
                              className="text-rose-400 hover:text-rose-300 p-2 text-xs font-bold hover:bg-rose-500/10 rounded-lg transition-colors"
                              title="Delete Assignment"
                            >
                              🗑️
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
        </div>
      </div>
    </div>
  );
}