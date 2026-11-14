import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Palmtree,
  Sparkles,
  BookOpen,
  Clock,
  ArrowRight,
  Filter,
} from "lucide-react";
import { normalizeDateString, formatDisplayDate } from "../utils/calendarService";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Fallback institutional calendar events if database is empty
const DEFAULT_HOLIDAYS_2026 = [
  { id: "h1", title: "New Year's Day", start_date: "2026-01-01", end_date: "2026-01-01", event_type: "holiday", is_holiday: true },
  { id: "h2", title: "Republic Day", start_date: "2026-01-26", end_date: "2026-01-26", event_type: "holiday", is_holiday: true },
  { id: "h3", title: "Maha Shivratri", start_date: "2026-02-15", end_date: "2026-02-15", event_type: "holiday", is_holiday: true },
  { id: "h4", title: "Holi Celebration", start_date: "2026-03-04", end_date: "2026-03-04", event_type: "holiday", is_holiday: true },
  { id: "h5", title: "Good Friday", start_date: "2026-04-03", end_date: "2026-04-03", event_type: "holiday", is_holiday: true },
  { id: "h6", title: "Ambedkar Jayanti", start_date: "2026-04-14", end_date: "2026-04-14", event_type: "holiday", is_holiday: true },
  { id: "h7", title: "Independence Day", start_date: "2026-08-15", end_date: "2026-08-15", event_type: "holiday", is_holiday: true },
  { id: "h8", title: "Ganesh Chaturthi", start_date: "2026-09-14", end_date: "2026-09-14", event_type: "holiday", is_holiday: true },
  { id: "h9", title: "Gandhi Jayanti", start_date: "2026-10-02", end_date: "2026-10-02", event_type: "holiday", is_holiday: true },
  { id: "h10", title: "Dussehra", start_date: "2026-10-20", end_date: "2026-10-20", event_type: "holiday", is_holiday: true },
  { id: "h11", title: "Diwali Festival Break", start_date: "2026-11-08", end_date: "2026-11-12", event_type: "holiday", is_holiday: true },
  { id: "h12", title: "Christmas Holiday", start_date: "2026-12-25", end_date: "2026-12-25", event_type: "holiday", is_holiday: true },
];

export default function SchoolCalendar({
  viewMode = "global", // 'teacher' | 'student' | 'global'
  assignedClass = "Class 10-A",
  studentRoll = "",
  className = "",
  onSelectDate,
}) {
  const { user } = useContext(AppContext) || {};
  const { showToast } = useToast();
  const navigate = useNavigate();

  const schoolId = (user?.institution_code || user?.school_id || "CAMPUS-01").toUpperCase();
  const resolvedRole = (user?.role || "student").toLowerCase();
  const activeMode = viewMode === "global" ? (["teacher", "principal", "trustee"].includes(resolvedRole) ? "teacher" : "student") : viewMode;

  const resolvedClass = assignedClass || user?.class_name || "Class 10-A";
  const resolvedRoll = String(studentRoll || user?.role_code || user?.roll_number || user?.personal_code || "").trim().toUpperCase();

  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth());
  const [events, setEvents] = useState(DEFAULT_HOLIDAYS_2026);
  const [attendanceMap, setAttendanceMap] = useState({}); // { 'YYYY-MM-DD': { marked: boolean, records: [], studentStatus: 'present'|'absent' } }
  const [unmarkedDates, setUnmarkedDates] = useState([]);
  const [selectedDayDetails, setSelectedDayDetails] = useState(null);
  const [filter, setFilter] = useState("ALL"); // 'ALL' | 'HOLIDAYS' | 'ALERTS'
  const [loading, setLoading] = useState(true);

  // 1. Fetch Calendar Events & Attendance Records
  useEffect(() => {
    let isMounted = true;
    const loadCalendarData = async () => {
      setLoading(true);
      try {
        // Load Events from Supabase calendar_events table
        let loadedEvents = [...DEFAULT_HOLIDAYS_2026];
        if (supabase) {
          try {
            const { data: dbEvents } = await supabase
              .from("calendar_events")
              .select("*")
              .eq("school_id", schoolId);
            if (dbEvents && dbEvents.length > 0) {
              loadedEvents = [...dbEvents, ...DEFAULT_HOLIDAYS_2026];
            }
          } catch (e) {
            console.warn("Supabase calendar_events notice:", e);
          }
        }

        // Also check local storage custom events
        try {
          const rawLocal = localStorage.getItem(`erp_calendar_${schoolId}`);
          if (rawLocal) {
            const parsed = JSON.parse(rawLocal);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const mapped = parsed.map((ev) => ({
                id: ev.id,
                title: ev.title,
                start_date: normalizeDateString(ev.date || ev.start_date),
                end_date: normalizeDateString(ev.date || ev.end_date),
                event_type: ev.category?.toLowerCase() || (ev.isHoliday ? "holiday" : "event"),
                is_holiday: ev.category === "Holiday" || ev.isHoliday,
              }));
              loadedEvents = [...mapped, ...loadedEvents];
            }
          }
        } catch {}

        if (!isMounted) return;
        setEvents(loadedEvents);

        // Load Attendance Records for this class/student
        const attMap = {};
        const unmarked = [];

        // Fetch Supabase attendance
        let dbAtt = [];
        if (supabase) {
          try {
            const { data } = await supabase
              .from("attendance")
              .select("date, class_id, class_name, records")
              .eq("school_id", schoolId);
            if (data) dbAtt = data;
          } catch (e) {}
        }

        // Also check localStorage daily registers
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const todayStr = new Date().toISOString().split("T")[0];

        for (let d = 1; d <= daysInMonth; d++) {
          const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const dayDate = new Date(currentYear, currentMonth, d);
          const isSunday = dayDate.getDay() === 0;

          // Check if date is in holiday list
          const holidayEvent = loadedEvents.find((ev) => {
            const start = normalizeDateString(ev.start_date);
            const end = normalizeDateString(ev.end_date);
            return (dateStr >= start && dateStr <= end) && (ev.is_holiday || ev.event_type === "holiday");
          });

          // Check attendance entries for this date
          const dbDayRecord = dbAtt.find(
            (a) => normalizeDateString(a.date) === dateStr &&
              (a.class_id === resolvedClass || a.class_name === resolvedClass || !a.class_id)
          );

          let localRecords = null;
          try {
            const raw = localStorage.getItem(`erp_attendance_${schoolId}_${resolvedClass}_${dateStr}`) ||
              localStorage.getItem(`erp_attendance_${schoolId}_${dateStr}`);
            if (raw) localRecords = JSON.parse(raw);
          } catch {}

          const combinedRecords = dbDayRecord?.records || localRecords || [];
          const hasAttendance = combinedRecords.length > 0;

          // Student View specific status check
          let studentStatus = null;
          if (hasAttendance && resolvedRoll) {
            const matched = combinedRecords.find((r) => {
              const rRoll = String(r.roll_number || r.student_id || r.id || "").trim().toUpperCase();
              return rRoll === resolvedRoll;
            });
            studentStatus = matched ? (matched.status || "present") : "present";
          }

          attMap[dateStr] = {
            dateStr,
            isSunday,
            isHoliday: !!holidayEvent,
            holidayName: holidayEvent?.title,
            hasAttendance,
            records: combinedRecords,
            studentStatus,
          };

          // Teacher View Check: Unmarked Attendance on Past Working Days
          const isPastWorkingDay = !isSunday && !holidayEvent && dateStr < todayStr;
          if (activeMode === "teacher" && isPastWorkingDay && !hasAttendance) {
            unmarked.push(dateStr);
          }
        }

        if (!isMounted) return;
        setAttendanceMap(attMap);
        setUnmarkedDates(unmarked);
      } catch (err) {
        console.error("Calendar data load error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadCalendarData();
    window.addEventListener("erp-attendance-updated", loadCalendarData);
    return () => {
      isMounted = false;
      window.removeEventListener("erp-attendance-updated", loadCalendarData);
    };
  }, [currentYear, currentMonth, schoolId, resolvedClass, resolvedRoll, activeMode]);

  // Month Navigation
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const jumpToToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
  };

  // Calendar Grid calculation
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun
  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();
  const todayStr = new Date().toISOString().split("T")[0];

  const calendarGrid = [];

  // Previous month trailing days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    calendarGrid.push({
      day: d,
      isCurrentMonth: false,
      dateStr: "",
    });
  }

  // Current month days
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dayInfo = attendanceMap[dateStr] || {};
    const dayEvents = events.filter((ev) => {
      const s = normalizeDateString(ev.start_date || ev.date);
      const e = normalizeDateString(ev.end_date || ev.date || ev.start_date);
      return s <= dateStr && dateStr <= e;
    });

    calendarGrid.push({
      day: d,
      isCurrentMonth: true,
      dateStr,
      isToday: dateStr === todayStr,
      isSunday: dayInfo.isSunday,
      isHoliday: dayInfo.isHoliday,
      holidayName: dayInfo.holidayName,
      hasAttendance: dayInfo.hasAttendance,
      studentStatus: dayInfo.studentStatus,
      isUnmarked: unmarkedDates.includes(dateStr),
      dayEvents,
    });
  }

  // Next month leading days to complete 35 or 42 grid cells
  const remainingCells = (7 - (calendarGrid.length % 7)) % 7;
  for (let i = 1; i <= remainingCells; i++) {
    calendarGrid.push({
      day: i,
      isCurrentMonth: false,
      dateStr: "",
    });
  }

  const handleCellClick = (cell) => {
    if (!cell.isCurrentMonth) return;
    setSelectedDayDetails(cell);
    if (typeof onSelectDate === "function") {
      onSelectDate(cell.dateStr);
    }
  };

  return (
    <div className={`bg-white/80 dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl p-5 sm:p-7 shadow-xl transition-all ${className}`}>
      {/* CALENDAR HEADER & CONTROLS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              <CalendarIcon className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
              ASTINEX Calendar
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
              {resolvedRole.includes("prin") || resolvedRole.includes("trustee") || resolvedRole.includes("hod") || resolvedRole.includes("admin")
                ? "Executive View"
                : resolvedRole.includes("acc")
                ? "Accounts View"
                : resolvedRole.includes("teach") || activeMode === "teacher"
                ? `Faculty View (${resolvedClass})`
                : resolvedRole.includes("staff") || resolvedRole.includes("nts")
                ? "Staff View"
                : "Student Scholar View"}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </h2>
        </div>

        {/* Action Controls & Navigation */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={jumpToToday}
            className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-sm"
          >
            Today
          </button>
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
              aria-label="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
              aria-label="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* TEACHER CRITICAL ATTENDANCE ALERT BANNER */}
      {activeMode === "teacher" && unmarkedDates.length > 0 && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between flex-wrap gap-3 animate-fade-in shadow-lg shadow-rose-500/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-500 dark:text-rose-400 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-rose-800 dark:text-rose-200">
                🔴 Attendance Missing on {unmarkedDates.length} Past Working Day{unmarkedDates.length > 1 ? "s" : ""}
              </p>
              <p className="text-[11px] text-rose-600 dark:text-rose-300/80">
                Class register for <span className="font-semibold">{resolvedClass}</span> is pending submission. Unmarked dates are highlighted in red below.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/teacher/attendance?date=${unmarkedDates[0]}&batch=${encodeURIComponent(resolvedClass)}`)}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <span>Mark {formatDisplayDate(unmarkedDates[0])}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* INSTITUTIONAL EVENT LEGEND */}
      <div className="mb-4 flex items-center justify-between flex-wrap gap-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-2xl border border-slate-200/80 dark:border-white/5">
        <span className="font-bold text-slate-700 dark:text-slate-200">Institutional Event Legend:</span>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <span>Holiday</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span>Exam</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
            <span>Event / Function</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Academic Working Day</span>
          </span>
        </div>
      </div>

      {/* CALENDAR DAYS OF WEEK HEADER */}
      <div className="grid grid-cols-7 gap-2 mb-2 text-center">
        {DAYS_OF_WEEK.map((day, idx) => (
          <div
            key={day}
            className={`text-xs font-bold uppercase tracking-wider py-1.5 ${
              idx === 0 ? "text-rose-500" : "text-slate-500 dark:text-slate-400"
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* CALENDAR 7-COLUMN GRID */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
        {calendarGrid.map((cell, idx) => {
          if (!cell.isCurrentMonth) {
            return (
              <div
                key={`empty-${idx}`}
                className="min-h-[70px] sm:min-h-[85px] p-2 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/20 opacity-30 pointer-events-none"
              >
                <span className="text-xs text-slate-400">{cell.day}</span>
              </div>
            );
          }

          const isUnmarkedTeacher = activeMode === "teacher" && cell.isUnmarked;

          return (
            <div
              key={cell.dateStr}
              onClick={() => handleCellClick(cell)}
              className={`min-h-[70px] sm:min-h-[85px] p-2 sm:p-2.5 rounded-2xl border transition-all duration-200 cursor-pointer relative flex flex-col justify-between group hover:scale-[1.02] ${
                cell.isToday
                  ? "border-cyan-500/80 bg-cyan-500/5 dark:bg-cyan-500/10 shadow-md shadow-cyan-500/10"
                  : isUnmarkedTeacher
                  ? "border-rose-500/80 bg-rose-500/10 dark:bg-rose-950/30 animate-pulse"
                  : cell.isHoliday
                  ? "border-amber-400/40 bg-amber-500/5 dark:bg-amber-500/10"
                  : cell.isSunday
                  ? "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 text-rose-400"
                  : "border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 hover:border-cyan-400/50"
              }`}
            >
              {/* Day Number & Status Badges */}
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs sm:text-sm font-bold ${
                    cell.isToday
                      ? "w-6 h-6 rounded-full bg-cyan-500 text-white flex items-center justify-center font-black"
                      : cell.isSunday
                      ? "text-rose-500 dark:text-rose-400 font-bold"
                      : "text-slate-800 dark:text-slate-200"
                  }`}
                >
                  {cell.day}
                </span>

                {/* Teacher View: Unmarked Red Alert Indicator */}
                {isUnmarkedTeacher && (
                  <span className="text-[9px] font-black uppercase tracking-wider text-rose-500 bg-rose-500/20 px-1.5 py-0.5 rounded-md border border-rose-500/40 shrink-0">
                    🔴 Unmarked
                  </span>
                )}

                {/* Teacher View: Attendance Completed Indicator */}
                {activeMode === "teacher" && cell.hasAttendance && (
                  <span className="text-[10px] text-emerald-500" title="Attendance register marked">
                    ✓
                  </span>
                )}

                {/* Student View: Status Indicator (Present / Absent / Holiday) */}
                {activeMode === "student" && (
                  <div>
                    {cell.isHoliday || cell.isSunday ? (
                      <span className="text-xs" title={cell.holidayName || "Weekend / Non-working day"}>
                        🏖️
                      </span>
                    ) : cell.studentStatus === "present" ? (
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" title="Present"></span>
                    ) : cell.studentStatus === "absent" ? (
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" title="Absent"></span>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Event / Holiday Title Pill */}
              <div className="mt-1">
                {cell.holidayName ? (
                  <p className="text-[9px] sm:text-[10px] font-bold text-amber-600 dark:text-amber-400 truncate leading-tight">
                    {cell.holidayName}
                  </p>
                ) : isUnmarkedTeacher ? (
                  <p className="text-[9px] font-bold text-rose-600 dark:text-rose-400 truncate">
                    Mark Register
                  </p>
                ) : activeMode === "student" && cell.studentStatus ? (
                  <p
                    className={`text-[9px] font-bold truncate ${
                      cell.studentStatus === "present"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {cell.studentStatus === "present" ? "🟢 Present" : "🔴 Absent"}
                  </p>
                ) : (
                  <p className="text-[9px] text-slate-400 dark:text-slate-600 truncate">
                    {cell.isSunday ? "Sunday" : "Academic Day"}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* DATE DETAILS INSPECTION MODAL */}
      {selectedDayDetails && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                  Campus Schedule Details
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {formatDisplayDate(selectedDayDetails.dateStr)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayDetails(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Status Breakdown */}
            <div className="space-y-3">
              {selectedDayDetails.holidayName && (
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3">
                  <span className="text-2xl">🏖️</span>
                  <div>
                    <p className="text-xs font-bold text-amber-700 dark:text-amber-300">Official Institutional Holiday</p>
                    <p className="text-sm font-black text-amber-900 dark:text-amber-200">{selectedDayDetails.holidayName}</p>
                  </div>
                </div>
              )}

              {/* Day Events Section */}
              {selectedDayDetails.dayEvents && selectedDayDetails.dayEvents.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Scheduled Institutional Events ({selectedDayDetails.dayEvents.length})
                  </p>
                  {selectedDayDetails.dayEvents.map((ev, i) => (
                    <div
                      key={ev.id || i}
                      className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-cyan-800 dark:text-cyan-300">
                          {ev.title}
                        </span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-600 dark:text-cyan-400">
                          {ev.event_type || ev.category || "Event"}
                        </span>
                      </div>
                      {ev.time && (
                        <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          ⏰ {ev.time}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 text-center">
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                    Regular academic schedule active. No special exams or functions scheduled.
                  </p>
                </div>
              )}

              {activeMode === "teacher" && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Target Class:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{resolvedClass}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Register Status:</span>
                    <span
                      className={`font-black ${
                        selectedDayDetails.hasAttendance
                          ? "text-emerald-600 dark:text-emerald-400"
                          : selectedDayDetails.isUnmarked
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-slate-500"
                      }`}
                    >
                      {selectedDayDetails.hasAttendance
                        ? "✅ Attendance Synchronized"
                        : selectedDayDetails.isUnmarked
                        ? "🔴 Attendance Pending"
                        : "Non-academic Day"}
                    </span>
                  </div>

                  {selectedDayDetails.isUnmarked && (
                    <button
                      type="button"
                      onClick={() => {
                        const targetUrl = `/teacher/attendance?date=${selectedDayDetails.dateStr}&batch=${encodeURIComponent(resolvedClass)}`;
                        setSelectedDayDetails(null);
                        navigate(targetUrl);
                      }}
                      className="w-full mt-2 py-2.5 px-4 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Mark Register for this Date Now</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              {/* Only show student personal attendance if user is a student */}
              {resolvedRole === "student" && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Student Scholar:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{resolvedRoll || "Enrolled"}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Attendance Status:</span>
                    <span
                      className={`font-black ${
                        selectedDayDetails.studentStatus === "present"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : selectedDayDetails.studentStatus === "absent"
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-amber-500"
                      }`}
                    >
                      {selectedDayDetails.isHoliday || selectedDayDetails.isSunday
                        ? "🏖️ Holiday / Weekend"
                        : selectedDayDetails.studentStatus === "present"
                        ? "🟢 Present in Class"
                        : selectedDayDetails.studentStatus === "absent"
                        ? "🔴 Absent"
                        : "⚪ No Register Recorded"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedDayDetails(null)}
              className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

