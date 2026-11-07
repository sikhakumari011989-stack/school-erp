import React, { useState, useEffect, useRef } from "react";
import { useToast } from "../context/ToastContext";
import { useAppContext } from "../context/AppContext";
import CampusPulseCard from "../Components/CampusPulseCard";
import SchoolCalendar from "../Components/SchoolCalendar";
import { normalizeRole } from "../utils/credentials";
import {
  getCalendarEvents,
  saveCalendarEvents,
  parseSparseCalendarCsv,
  generateSampleSparseCalendarCsv,
  normalizeDateString,
  formatDisplayDate,
} from "../utils/calendarService";
import { Clock, Users, ShieldAlert, CheckCircle2 } from "lucide-react";

export default function AcademicCalendar() {
  const { showToast } = useToast();
  const context = useAppContext?.() || {};
  const user = context?.user;
  const appSchoolCode = context?.institutionCode;

  // Resolve user role & write permissions (Strictly PRIN and HOD)
  const canonicalRole = normalizeRole(user?.role || user?.role_code);
  const canManageCalendar =
    canonicalRole === "PRIN" ||
    canonicalRole === "HOD" ||
    canonicalRole === "MASTER_OWNER";

  // Resolve school code
  const [schoolCode, setSchoolCode] = useState(() => {
    if (appSchoolCode) return appSchoolCode;
    try {
      const saved = localStorage.getItem("erp_session_user");
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.schoolCode || parsed.institution_code || "CAMPUS-01";
      }
    } catch {}
    return "CAMPUS-01";
  });

  const [events, setEvents] = useState([]);
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Manual event form state with time & visibility
  const [formData, setFormData] = useState({
    date: "",
    time: "All Day",
    title: "",
    category: "Holiday",
    visibility: "All School",
    reason: "",
  });

  const fileInputRef = useRef(null);

  // Load events
  useEffect(() => {
    const list = getCalendarEvents(schoolCode);
    setEvents(list);
  }, [schoolCode]);

  const handleManualAdd = (e) => {
    e.preventDefault();
    if (!canManageCalendar) {
      showToast("Access Denied: Only Principal and Trustee leadership can create or modify calendar entries.", "error");
      return;
    }

    if (!formData.date || !formData.title.trim()) {
      showToast("Please provide both Date and Title for the event.", "error");
      return;
    }

    const normalizedDate = normalizeDateString(formData.date);
    const newEvent = {
      id: `ev_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      date: normalizedDate,
      time: formData.time.trim() || "All Day",
      title: formData.title.trim(),
      category: formData.category,
      event_type: formData.category,
      visibility: formData.visibility,
      reason: formData.reason.trim() || `${formData.category} scheduled on campus calendar`,
      isHoliday: formData.category === "Holiday",
    };

    // Filter out duplicate date if same event title or overwrite
    const existingFiltered = events.filter(
      (ev) => !(ev.date === normalizedDate && ev.title.toLowerCase() === newEvent.title.toLowerCase())
    );

    const updated = [newEvent, ...existingFiltered].sort((a, b) => a.date.localeCompare(b.date));
    saveCalendarEvents(schoolCode, updated);
    setEvents(updated);
    setFormData({
      date: "",
      time: "All Day",
      title: "",
      category: "Holiday",
      visibility: "All School",
      reason: "",
    });
    showToast(`Added '${newEvent.title}' for ${formatDisplayDate(newEvent.date)}`, "success");
  };

  const handleDeleteEvent = (id) => {
    if (!canManageCalendar) {
      showToast("Access Denied: Leadership credentials required to remove calendar entries.", "error");
      return;
    }
    const updated = events.filter((ev) => ev.id !== id);
    saveCalendarEvents(schoolCode, updated);
    setEvents(updated);
    showToast("Special calendar entry removed.", "info");
  };

  const handleClearAll = () => {
    if (!canManageCalendar) {
      showToast("Access Denied: Leadership credentials required to reset the institutional calendar.", "error");
      return;
    }
    if (window.confirm("Are you sure you want to clear all custom calendar entries? Dates will revert to regular working days.")) {
      saveCalendarEvents(schoolCode, []);
      setEvents([]);
      showToast("Institutional calendar cleared to default academic days.", "info");
    }
  };

  const handleCsvFileUpload = async (e) => {
    if (!canManageCalendar) {
      showToast("Access Denied: Leadership credentials required to upload CSV calendar batches.", "error");
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const text = await file.text();
      const parsed = parseSparseCalendarCsv(text);
      if (parsed.length === 0) {
        throw new Error("No valid dates found in file.");
      }

      // Merge with existing events, avoiding duplicate date + title
      const existingMap = new Map();
      events.forEach((ev) => existingMap.set(`${ev.date}__${ev.title.toLowerCase()}`, ev));
      parsed.forEach((ev) => existingMap.set(`${ev.date}__${ev.title.toLowerCase()}`, ev));

      const merged = Array.from(existingMap.values()).sort((a, b) => a.date.localeCompare(b.date));

      saveCalendarEvents(schoolCode, merged);
      setEvents(merged);
      showToast(`Successfully imported ${parsed.length} special calendar events!`, "success");
    } catch (err) {
      console.error("Calendar CSV import error:", err);
      showToast(err.message || "Failed to parse CSV calendar file.", "error");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDownloadSampleCsv = () => {
    const csvContent = generateSampleSparseCalendarCsv();
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `sparse_academic_calendar_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Downloaded sparse calendar CSV template.", "info");
  };

  // Filtered events
  const filteredEvents = events.filter((ev) => {
    const matchesCat = filterCategory === "ALL" || ev.category.toUpperCase() === filterCategory.toUpperCase();
    const matchesSearch =
      !searchQuery ||
      ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.date.includes(searchQuery) ||
      (ev.reason && ev.reason.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-white/10 p-6 sm:p-8 rounded-3xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-2xl">
              📅
            </span>
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-400/20">
                Institutional Academic Hub
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
                Sparse Academic Calendar & Daily Pulse
              </h1>
            </div>
          </div>
          <p className="text-slate-400 text-xs sm:text-sm max-w-2xl">
            Institutional schedule tracking special dates (Exams, Holidays, Annual Functions, PTMs, and Activities).
            Any date not listed automatically functions as a <span className="text-emerald-400 font-semibold">Regular Academic Working Day</span>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <button
            onClick={handleDownloadSampleCsv}
            className="flex items-center gap-2 bg-slate-950/80 hover:bg-slate-900 text-slate-300 hover:text-white border border-white/10 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg cursor-pointer"
          >
            <span>📥</span>
            <span>Sample CSV</span>
          </button>
          {canManageCalendar && (
            <label className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-cyan-500/20 cursor-pointer">
              <span>{isUploading ? "⏳" : "📊"}</span>
              <span>{isUploading ? "Importing..." : "Upload Sparse CSV"}</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={handleCsvFileUpload}
                disabled={isUploading}
              />
            </label>
          )}
        </div>
      </div>

      {/* Live Campus Pulse Preview */}
      <CampusPulseCard schoolCode={schoolCode} />

      {/* Global Interactive Academic Calendar Grid */}
      <SchoolCalendar viewMode="global" className="mb-8" />

      {/* Two Column Layout: Add Event Form / Access Notice & Calendar Directory */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Form if Principal/Trustee, otherwise View-Only Notice */}
        <div className="lg:col-span-1 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl h-fit">
          {canManageCalendar ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">✨</span>
                <h2 className="text-base font-extrabold text-white">Add Special Date</h2>
              </div>
              <p className="text-xs text-slate-400 mb-5">
                Schedule exams, holidays, functions, PTMs, and student activities. Normal working days don't need entry.
              </p>

              <form onSubmit={handleManualAdd} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Event Date (YYYY-MM-DD)
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-400 transition-all"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Event Type
                    </label>
                    <select
                      className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:border-cyan-400 transition-all cursor-pointer"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      <option value="Exam" className="bg-slate-900 text-white">Exam (CBT / Term)</option>
                      <option value="Holiday" className="bg-slate-900 text-white">Holiday (Campus Closed)</option>
                      <option value="Function" className="bg-slate-900 text-white">Function / Annual Day</option>
                      <option value="PTM" className="bg-slate-900 text-white">PTM (Parent-Teacher)</option>
                      <option value="Activity" className="bg-slate-900 text-white">Activity / Sports</option>
                      <option value="Event" className="bg-slate-900 text-white">General Event</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Timing
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 09:00 AM - 12:30 PM"
                      className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400 transition-all"
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Event Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mid-Term Mathematics CBT / Annual Sports Meet"
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400 transition-all"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Class / Wing Visibility
                  </label>
                  <select
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:border-cyan-400 transition-all cursor-pointer"
                    value={formData.visibility}
                    onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                  >
                    <option value="All School" className="bg-slate-900 text-white">All School (Campus-Wide)</option>
                    <option value="Primary Wing" className="bg-slate-900 text-white">Primary Wing (Classes 1-5)</option>
                    <option value="Middle Wing" className="bg-slate-900 text-white">Middle Wing (Classes 6-8)</option>
                    <option value="Secondary Wing" className="bg-slate-900 text-white">Secondary Wing (Classes 9-10)</option>
                    <option value="Senior Secondary" className="bg-slate-900 text-white">Senior Secondary (Classes 11-12)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Description / Details (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Bring scientific calculator; auditorium seating at 09:30 AM"
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400 transition-all resize-none"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-cyan-500/20 text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  + Add Calendar Event
                </button>
              </form>
            </>
          ) : (
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-400">
                  Role: {canonicalRole || "Viewer"}
                </span>
                <h3 className="text-base font-bold text-white mt-1">
                  View-Only Calendar Schedule
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  You are signed in with read-only schedule visibility. Only institutional leadership
                  (<span className="text-indigo-400 font-bold">Principal / Trustee</span>) has write
                  privileges to schedule exams, declare campus holidays, or update event timelines.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5 space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Real-time schedule synchronization</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Verified institutional exam dates</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Special Dates Table */}
        <div className="lg:col-span-2 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-black text-white">Institutional Event Directory</h2>
              <p className="text-xs text-slate-400">
                {events.length} scheduled event{events.length === 1 ? "" : "s"} ({filteredEvents.length} shown)
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="Search date, title, or wing..."
                className="bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              <select
                className="bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-400 cursor-pointer"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="ALL" className="bg-slate-900">All Categories</option>
                <option value="Exam" className="bg-slate-900">Exams</option>
                <option value="Holiday" className="bg-slate-900">Holidays</option>
                <option value="Function" className="bg-slate-900">Functions</option>
                <option value="PTM" className="bg-slate-900">PTMs</option>
                <option value="Activity" className="bg-slate-900">Activities</option>
                <option value="Event" className="bg-slate-900">General Events</option>
              </select>

              {canManageCalendar && events.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  title="Clear all events"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-950/40 border border-white/5">
              <span className="text-4xl mb-3 block">🗓️</span>
              <h3 className="text-sm font-bold text-white mb-1">No Special Dates Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {events.length === 0
                  ? "Every day is currently functioning as a normal working academic day."
                  : "No events match your current search or category filter."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-slate-950/80 text-[11px] font-black uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Event Details</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Visibility</th>
                    {canManageCalendar && <th className="py-3 px-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs text-slate-200">
                  {filteredEvents.map((ev) => {
                    const cat = ev.category || ev.event_type || "Event";
                    const badgeClass =
                      cat === "Holiday"
                        ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                        : cat === "Exam"
                        ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                        : cat === "Function"
                        ? "bg-purple-500/15 text-purple-300 border-purple-500/30"
                        : cat === "PTM"
                        ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                        : cat === "Activity"
                        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                        : "bg-blue-500/15 text-blue-300 border-blue-500/30";

                    return (
                      <tr key={ev.id || `${ev.date}_${ev.title}`} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-mono font-bold text-white">
                            {formatDisplayDate(ev.date)}
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                            <Clock className="w-3 h-3 text-cyan-400" />
                            <span>{ev.time || "All Day"}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white">
                            {ev.title}
                          </div>
                          {ev.reason && (
                            <div className="text-[11px] text-slate-400 mt-0.5 max-w-sm truncate" title={ev.reason}>
                              {ev.reason}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${badgeClass}`}>
                            {cat}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-300 bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg">
                            <Users className="w-3 h-3 text-indigo-400" />
                            <span>{ev.visibility || "All School"}</span>
                          </span>
                        </td>
                        {canManageCalendar && (
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <button
                              onClick={() => handleDeleteEvent(ev.id)}
                              className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer"
                            >
                              Delete
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

