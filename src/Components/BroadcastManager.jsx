import React, { useState, useEffect, useContext, useMemo } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { getNotices, publishNotice, deleteNotice } from "../utils/noticeService";
import {
  Megaphone,
  Send,
  Users,
  BookOpen,
  AlertTriangle,
  Calendar,
  Trash2,
  Filter,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
  Search
} from "lucide-react";

const CATEGORIES = [
  { id: "Administrative", label: "Administrative Circular", icon: "🏛️" },
  { id: "Academic", label: "Academic Schedule", icon: "📚" },
  { id: "Examination", label: "Examination Notice", icon: "📝" },
  { id: "Holiday", label: "Holiday & Vacation", icon: "🎉" },
  { id: "Emergency", label: "🚨 Emergency Alert", icon: "🚨" },
  { id: "Fee", label: "Fee & Dues Notice", icon: "💰" },
];

export default function BroadcastManager({ institutionCode: propSchoolCode }) {
  const { user, tenant } = useContext(AppContext) || {};
  const { showToast } = useToast();

  const schoolCode = (
    propSchoolCode ||
    user?.institution_code ||
    user?.school_id ||
    tenant?.code ||
    "CAMPUS-01"
  ).toUpperCase();

  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    category: "Administrative",
    audienceType: "all", // 'all' | 'students' | 'teachers' | 'class'
    targetClass: "",
    content: "",
    date: new Date().toISOString().split("T")[0],
  });

  // Dynamic Class/Batch List mapped directly from Students Directory
  const [availableClasses, setAvailableClasses] = useState([]);

  // Load Directory and Notices
  useEffect(() => {
    loadDynamicClasses();
    loadNotices();

    const handleNoticesUpdate = () => loadNotices();
    const handleDirUpdate = () => loadDynamicClasses();

    window.addEventListener("erp-notices-updated", handleNoticesUpdate);
    window.addEventListener("erp-directory-updated", handleDirUpdate);

    return () => {
      window.removeEventListener("erp-notices-updated", handleNoticesUpdate);
      window.removeEventListener("erp-directory-updated", handleDirUpdate);
    };
  }, [schoolCode]);

  // Map students directory to extract unique classes/batches automatically
  const loadDynamicClasses = () => {
    try {
      let dir = [];
      const raw = localStorage.getItem(`erp_directory_${schoolCode}`);
      if (raw) {
        dir = JSON.parse(raw);
      }

      const uniqueClasses = new Set();

      (dir || []).forEach((m) => {
        if (!m) return;
        const role = (m.role || "student").toLowerCase();
        const code = (m.role_code || m.roll_number || m.id || "").toUpperCase();
        const isStudent = role === "student" || code.startsWith("STU-");

        if (isStudent) {
          const className = (m.class_name || m.class || m.batch || "").trim();
          if (className) {
            uniqueClasses.add(className);
          }
        }
      });

      const classList = Array.from(uniqueClasses).sort();
      setAvailableClasses(classList);

      // If class is currently selected but not in list, auto-select first available
      if (classList.length > 0 && !formData.targetClass) {
        setFormData((prev) => ({ ...prev, targetClass: classList[0] }));
      }
    } catch (e) {
      console.warn("Could not load dynamic classes from directory:", e);
      setAvailableClasses([]);
    }
  };

  const loadNotices = async () => {
    setLoading(true);
    try {
      const list = await getNotices(schoolCode);
      setNotices(list);
    } catch (e) {
      console.warn("Error fetching notices:", e);
    } finally {
      setLoading(false);
    }
  };

  // Submit Targeted Notice
  const handlePublish = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      showToast("Please provide notice headline and message content.", "error");
      return;
    }

    // Determine target audience string
    let audienceString = "All Students & Staff";
    if (formData.audienceType === "students") {
      audienceString = "All Students";
    } else if (formData.audienceType === "teachers") {
      audienceString = "All Teachers";
    } else if (formData.audienceType === "class") {
      const chosenClass = formData.targetClass.trim() || availableClasses[0] || "General Batch";
      audienceString = `Class: ${chosenClass}`;
    }

    setSubmitting(true);
    try {
      await publishNotice({
        title: formData.title.trim(),
        category: formData.category,
        audience: audienceString,
        content: formData.content.trim(),
        date: formData.date || new Date().toISOString().split("T")[0],
        schoolId: schoolCode,
        user,
      });

      showToast(`📢 Official broadcast dispatched to "${audienceString}"!`, "success");

      // Reset Form
      setFormData({
        title: "",
        category: "Administrative",
        audienceType: "all",
        targetClass: availableClasses[0] || "",
        content: "",
        date: new Date().toISOString().split("T")[0],
      });

      loadNotices();
    } catch (err) {
      console.error("Publish error:", err);
      showToast("Could not broadcast notice. Please retry.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Notice
  const handleDelete = async (noticeId) => {
    if (confirm("Are you sure you want to dismiss and delete this broadcast circular?")) {
      await deleteNotice(noticeId, schoolCode);
      showToast("Notice circular removed from all dashboards.", "info");
      loadNotices();
    }
  };

  // Filtered Notices
  const filteredNotices = useMemo(() => {
    return notices.filter((n) => {
      const matchesSearch =
        (n.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (n.content || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (n.audience || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat = filterCategory === "all" || (n.category || "").toLowerCase() === filterCategory.toLowerCase();

      return matchesSearch && matchesCat;
    });
  }, [notices, searchQuery, filterCategory]);

  return (
    <div className="space-y-6">
      {/* Broadcast Composer Card */}
      <div className="bg-[#1E293B]/80 backdrop-blur-xl border border-slate-700/70 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-700/60">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">
              <Megaphone className="w-3.5 h-3.5" />
              Targeted Broadcast Hub &bull; Node {schoolCode}
            </div>
            <h2 className="text-2xl font-black text-white">Dynamic Notice Board Dispatcher</h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
              Deliver official announcements directly to student & faculty dashboards with zero SMS/WhatsApp spam.
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold self-start sm:self-center">
            <ShieldCheck className="w-4 h-4" />
            <span>Secure In-App Delivery</span>
          </div>
        </div>

        <form onSubmit={handlePublish} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Notice Title */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Notice Headline / Subject <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Annual Term 2 Examination Timetable Released"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Notice Category */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* DYNAMIC AUDIENCE SELECTOR & AUTO-UPDATING CLASS DROPDOWN */}
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl space-y-3">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Target Audience
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { id: "all", label: "All Members", icon: "🌐" },
                { id: "students", label: "All Students", icon: "🎓" },
                { id: "teachers", label: "All Teachers", icon: "👨‍🏫" },
                { id: "class", label: "Specific Class / Batch", icon: "🏫" },
              ].map((aud) => (
                <button
                  key={aud.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, audienceType: aud.id })}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    formData.audienceType === aud.id
                      ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/20"
                      : "bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white"
                  }`}
                >
                  <span>{aud.icon}</span>
                  <span className="truncate">{aud.label}</span>
                </button>
              ))}
            </div>

            {/* AUTO-UPDATING CLASS / BATCH DROPDOWN (Shown when 'Specific Class / Batch' is selected) */}
            {formData.audienceType === "class" && (
              <div className="pt-2 animate-in fade-in duration-150">
                <label className="block text-xs font-semibold text-blue-300 mb-1.5 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  Select Target Classroom Batch (Dynamically Loaded from Active Roster)
                </label>

                {availableClasses.length > 0 ? (
                  <select
                    value={formData.targetClass}
                    onChange={(e) => setFormData({ ...formData, targetClass: e.target.value })}
                    className="w-full sm:w-80 bg-slate-900 border border-blue-500/40 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-blue-400"
                  >
                    {availableClasses.map((cls) => (
                      <option key={cls} value={cls}>
                        {cls}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Class 10-A or JEE Repeater"
                      value={formData.targetClass}
                      onChange={(e) => setFormData({ ...formData, targetClass: e.target.value })}
                      className="w-full sm:w-80 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                    <span className="text-[11px] text-amber-400">
                      ℹ️ Directory currently has no student classes. Type batch manually.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Message Content */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Notice Content / Circular Details <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={4}
              required
              placeholder="Type official notification message to display inside student and faculty dashboards..."
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500"
            ></textarea>
          </div>

          {/* Action Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-700/60">
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Notices immediately synchronize across all open user sessions without page reload.
            </p>

            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-blue-600/30 transition-all hover:scale-105 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {submitting ? "Broadcasting..." : "Publish Broadcast Circular"}
            </button>
          </div>
        </form>
      </div>

      {/* Active Broadcasts History List */}
      <div className="bg-[#1E293B]/80 backdrop-blur-xl border border-slate-700/70 rounded-3xl shadow-2xl overflow-hidden space-y-4 p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-700/60">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-blue-400" />
              Active Institutional Circulars ({filteredNotices.length})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Broadcasts actively streaming to target student and faculty portals
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search notices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none"
              />
            </div>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        {filteredNotices.length === 0 ? (
          <div className="py-12 text-center text-slate-500 space-y-2">
            <Megaphone className="w-10 h-10 mx-auto text-slate-600 mb-1" />
            <p className="text-sm font-semibold text-slate-300">No active circulars found.</p>
            <p className="text-xs text-slate-500">Publish a targeted broadcast above to notify your students or staff.</p>
          </div>
        ) : (
          <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
            {filteredNotices.map((notice) => (
              <div
                key={notice.id}
                className="bg-slate-900/70 border border-slate-700/60 hover:border-slate-600 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {notice.category || "General"}
                    </span>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      🎯 To: {notice.audience || "All"}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {notice.date || new Date(notice.created_at || Date.now()).toLocaleDateString("en-IN")}
                    </span>
                  </div>

                  <h4 className="text-sm sm:text-base font-bold text-white truncate">
                    {notice.title}
                  </h4>

                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                    {notice.content}
                  </p>
                </div>

                <button
                  onClick={() => handleDelete(notice.id)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer self-end sm:self-center"
                  title="Delete Circular"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Dismiss
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

