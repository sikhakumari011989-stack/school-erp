import React, { useState, useEffect, useContext, useMemo } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { getNotices, publishNotice, deleteNotice } from "../utils/noticeService";
import {
  dispatchParentNotification,
  getCommunicationGatewayStatus,
  getNotificationHistory,
  COMMUNICATION_CATEGORIES,
} from "../utils/notifications";
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
  Search,
  MessageSquare,
  Smartphone,
  RefreshCw,
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

  const [activeTab, setActiveTab] = useState("notices"); // 'notices' | 'parent_outbound'
  const [outboundLogs, setOutboundLogs] = useState([]);
  const [gatewayStatus, setGatewayStatus] = useState(() => getCommunicationGatewayStatus());

  // Parent Notification Form State
  const [parentNotifData, setParentNotifData] = useState({
    recipientPhone: "",
    recipientName: "",
    category: "announcement",
    channel: "whatsapp",
    message: "",
  });
  const [sendingParentNotif, setSendingParentNotif] = useState(false);

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

  // Map students directory to extract unique classes/batches automatically
  const loadDynamicClasses = React.useCallback(() => {
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
  }, [schoolCode, formData.targetClass]);

  const loadParentLogs = React.useCallback(async () => {
    try {
      const history = getNotificationHistory();
      setOutboundLogs(history);
    } catch (e) {}
  }, []);

  const loadNotices = React.useCallback(async () => {
    setLoading(true);
    try {
      const list = await getNotices(schoolCode);
      setNotices(list);
    } catch (e) {
      console.warn("Error fetching notices:", e);
    } finally {
      setLoading(false);
    }
  }, [schoolCode]);

  // Load Directory and Notices
  useEffect(() => {
    loadDynamicClasses();
    loadNotices();
    loadParentLogs();

    const handleNoticesUpdate = () => loadNotices();
    const handleDirUpdate = () => loadDynamicClasses();

    window.addEventListener("erp-notices-updated", handleNoticesUpdate);
    window.addEventListener("erp-directory-updated", handleDirUpdate);

    return () => {
      window.removeEventListener("erp-notices-updated", handleNoticesUpdate);
      window.removeEventListener("erp-directory-updated", handleDirUpdate);
    };
  }, [schoolCode, loadDynamicClasses, loadNotices, loadParentLogs]);

  const handleSendParentNotification = async (e) => {
    e.preventDefault();
    if (!parentNotifData.recipientPhone.trim() || !parentNotifData.message.trim()) {
      showToast("Please provide recipient phone number and notification message.", "error");
      return;
    }

    setSendingParentNotif(true);
    try {
      const result = await dispatchParentNotification({
        schoolId: schoolCode,
        recipientPhone: parentNotifData.recipientPhone.trim(),
        recipientName: parentNotifData.recipientName.trim() || "Parent / Guardian",
        category: parentNotifData.category,
        channel: parentNotifData.channel,
        message: parentNotifData.message.trim(),
      });

      const statusMsg = result.delivery_status === "delivered" 
        ? "✅ Message delivered via WhatsApp Gateway!"
        : "ℹ️ Message queued in Parent Communication Hub.";

      showToast(statusMsg, result.delivery_status === "delivered" ? "success" : "info");
      loadParentLogs();
      setParentNotifData({
        recipientPhone: "",
        recipientName: "",
        category: "announcement",
        channel: "whatsapp",
        message: "",
      });
    } catch (err) {
      showToast("Dispatch error: " + err.message, "error");
    } finally {
      setSendingParentNotif(false);
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
      {/* MODULE NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("notices")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "notices"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800/60"
          }`}
        >
          <Megaphone className="w-4 h-4" />
          In-App Circulars & Broadcasts
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("parent_outbound")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "parent_outbound"
              ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800/60"
          }`}
        >
          <Smartphone className="w-4 h-4" />
          Parent Communication Hub (WhatsApp & SMS)
        </button>
      </div>

      {/* PARENT OUTBOUND COMMUNICATION HUB */}
      {activeTab === "parent_outbound" && (
        <div className="space-y-6">
          {/* Gateway Status Banner */}
          <div className="bg-white/90 dark:bg-slate-900/80 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-500" />
                Parent Communication Gateway Telemetry
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Multi-channel event triggers for Attendance Absence, Fee Dues, and Exam Results.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${gatewayStatus.whatsappConfigured ? "bg-emerald-400" : "bg-amber-400"}`} />
                {gatewayStatus.whatsappGateway}
              </span>
            </div>
          </div>

          {/* Quick Dispatch Composer */}
          <div className="bg-white/90 dark:bg-slate-900/80 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-500" />
              Automated Parent Advisory Dispatcher
            </h4>

            <form onSubmit={handleSendParentNotification} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Notification Trigger Category
                  </label>
                  <select
                    value={parentNotifData.category}
                    onChange={(e) => {
                      const cat = e.target.value;
                      let defaultMsg = "";
                      if (cat === "absence") defaultMsg = "🚨 Absence Alert: Your ward was marked absent for roll call today.";
                      if (cat === "fee_reminder") defaultMsg = "💰 Fee Advisory: Term fee installment is pending. Pay online via school portal.";
                      if (cat === "exam_result") defaultMsg = "📊 Term Exam Results have been approved and published to the Student Portal.";
                      if (cat === "homework") defaultMsg = "📚 Daily Assignment: Today's homework has been posted to the Student LMS.";
                      if (cat === "event") defaultMsg = "📅 Calendar Notice: School will observe a declared holiday tomorrow.";
                      setParentNotifData({ ...parentNotifData, category: cat, message: defaultMsg });
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  >
                    {COMMUNICATION_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Parent Phone Number <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98200 12345"
                    value={parentNotifData.recipientPhone}
                    onChange={(e) => setParentNotifData({ ...parentNotifData, recipientPhone: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Outbound Channel
                  </label>
                  <select
                    value={parentNotifData.channel}
                    onChange={(e) => setParentNotifData({ ...parentNotifData, channel: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="whatsapp">📱 WhatsApp Gateway</option>
                    <option value="sms">💬 SMS REST Route</option>
                    <option value="in_app">🔔 In-App Push Only</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Advisory Message Payload <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={parentNotifData.message}
                  onChange={(e) => setParentNotifData({ ...parentNotifData, message: e.target.value })}
                  placeholder="Type official notification message..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-400">
                  Deliveries respect parent communication preferences and audit every dispatch.
                </span>
                <button
                  type="submit"
                  disabled={sendingParentNotif}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {sendingParentNotif ? "Dispatching..." : "Dispatch to Parent"}
                </button>
              </div>
            </form>
          </div>

          {/* Outbound Logs History Table */}
          <div className="bg-white/90 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xl p-5 space-y-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              Parent Communication Outbound Log ({outboundLogs.length})
            </h4>

            {outboundLogs.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No outbound notifications logged yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-bold">
                      <th className="py-2.5 px-3">Recipient</th>
                      <th className="py-2.5 px-3">Channel</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Message Snippet</th>
                      <th className="py-2.5 px-3">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {outboundLogs.slice(0, 15).map((log, idx) => (
                      <tr key={log.id || idx}>
                        <td className="py-2.5 px-3 font-semibold">{log.recipient_phone || log.recipient}</td>
                        <td className="py-2.5 px-3 uppercase text-[10px] font-bold">{log.channel}</td>
                        <td className="py-2.5 px-3">{log.category || "Alert"}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            log.delivery_status === "delivered" || log.status === "delivered"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                          }`}>
                            {log.delivery_status || log.status || "queued"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 truncate max-w-xs text-slate-500">{log.message}</td>
                        <td className="py-2.5 px-3 text-slate-400 text-[10px]">
                          {log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Just now"}
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

      {/* Broadcast Composer Card */}
      {activeTab === "notices" && (
      <>
      <div className="bg-white/90 dark:bg-[#1E293B]/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700/70 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
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
                      {notice.date || (notice.created_at ? new Date(notice.created_at).toLocaleDateString("en-IN") : "Today")}
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
      </>
      )}
    </div>
  );
}

