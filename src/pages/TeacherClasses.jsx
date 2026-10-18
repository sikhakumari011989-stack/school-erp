import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import CertificateManagementCard from "../Components/CertificateManagementCard";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function TeacherClasses() {
  const { user, tenant } = useContext(AppContext) || {};
  const { showToast } = useToast();

  const activeSchoolId = (
    user?.institution_code ||
    user?.school_id ||
    tenant?.code ||
    "CAMPUS-01"
  )
    .trim()
    .toUpperCase();

  const [classesList, setClassesList] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [activeDay, setActiveDay] = useState("Monday");
  const [selectedRosterClass, setSelectedRosterClass] = useState(null);
  const [rosterSearch, setRosterSearch] = useState("");
  const [rosterStudents, setRosterStudents] = useState([]);

  // Calculate assigned classroom batches dynamically (Zero mock batches)
  const calculateBatches = () => {
    let localDir = [];
    try {
      const raw = localStorage.getItem(`erp_directory_${activeSchoolId}`);
      if (raw) localDir = JSON.parse(raw);
    } catch (e) {}

    let timetable = [];
    try {
      const rawTt = localStorage.getItem(`erp_master_timetable_${activeSchoolId}`);
      if (rawTt) timetable = JSON.parse(rawTt);
    } catch (e) {}

    const teacherName = (user?.name || user?.full_name || "").toLowerCase().trim();
    const teacherCode = (user?.personal_code || user?.role_code || "").toLowerCase().trim();

    // Find all distinct classes explicitly assigned to this faculty member
    const assignedClassNames = new Set();

    // 1. Check user profile assigned_classes or class_name
    if (user?.assigned_classes) {
      const arr = Array.isArray(user.assigned_classes)
        ? user.assigned_classes
        : String(user.assigned_classes).split(",");
      arr.forEach((c) => c.trim() && assignedClassNames.add(c.trim()));
    }
    if (user?.class_name && user.class_name !== "Faculty") {
      assignedClassNames.add(user.class_name.trim());
    }

    // 2. Check master timetable periods where teacher matches
    timetable.forEach((item) => {
      const t = (item.teacher || "").toLowerCase();
      if ((teacherName && t.includes(teacherName)) || (teacherCode && t.includes(teacherCode))) {
        if (item.className) assignedClassNames.add(item.className.trim());
      }
    });

    // 3. Check directory member record for this teacher
    const currentInDir = localDir.find(
      (m) =>
        (m.role_code && m.role_code.toLowerCase() === teacherCode) ||
        (m.name && m.name.toLowerCase() === teacherName)
    );
    if (currentInDir?.assigned_classes) {
      const arr = Array.isArray(currentInDir.assigned_classes)
        ? currentInDir.assigned_classes
        : String(currentInDir.assigned_classes).split(",");
      arr.forEach((c) => c.trim() && assignedClassNames.add(c.trim()));
    }

    const normalize = (b) =>
      (b || "")
        .toLowerCase()
        .replace(/class\s*/i, "")
        .replace(/[^a-z0-9]/g, "");

    const dynamicBatches = Array.from(assignedClassNames).map((className, idx) => {
      const target = normalize(className);
      const count = localDir.filter((item) => {
        if ((item.role || "student").toLowerCase() !== "student") return false;
        const sNorm = normalize(item.class_name || item.class);
        return sNorm === target || sNorm.includes(target) || target.includes(sNorm);
      }).length;

      const ttSlot = timetable.find((t) => normalize(t.className) === target);

      return {
        id: idx + 1,
        name: className,
        subject: ttSlot?.subject || user?.subject || "Core Curriculum",
        timing: ttSlot?.timeWindow || "Assigned Period",
        room: ttSlot?.room || "Room 101",
        strength: count,
      };
    });

    setClassesList(dynamicBatches);
  };

  // Load master timetable schedule from localStorage
  const loadTimetable = () => {
    try {
      const rawTt = localStorage.getItem(`erp_master_timetable_${activeSchoolId}`);
      if (rawTt) {
        const parsed = JSON.parse(rawTt);
        if (Array.isArray(parsed)) {
          setSchedule(parsed);
          return;
        }
      }
      setSchedule([]);
    } catch (e) {
      setSchedule([]);
    }
  };

  useEffect(() => {
    calculateBatches();
    loadTimetable();

    const handleUpdate = () => {
      calculateBatches();
      loadTimetable();
    };

    window.addEventListener("erp-directory-updated", handleUpdate);
    window.addEventListener("erp-timetable-updated", handleUpdate);
    return () => {
      window.removeEventListener("erp-directory-updated", handleUpdate);
      window.removeEventListener("erp-timetable-updated", handleUpdate);
    };
  }, [activeSchoolId, user]);

  // Load students for active roster batch from local directory
  const openRosterDrawer = (cls) => {
    setSelectedRosterClass(cls);
    setRosterSearch("");

    try {
      let localDir = [];
      const raw = localStorage.getItem(`erp_directory_${activeSchoolId}`);
      if (raw) {
        localDir = JSON.parse(raw);
      }

      const normalize = (b) =>
        (b || "")
          .toLowerCase()
          .replace(/class\s*/i, "")
          .replace(/[^a-z0-9]/g, "");
      const target = normalize(cls.name);

      const filtered = localDir
        .filter((item) => (item.role || "student").toLowerCase() === "student")
        .filter((item) => {
          const itemNorm = normalize(item.class_name || item.class);
          return itemNorm === target || itemNorm.includes(target) || target.includes(itemNorm);
        });

      setRosterStudents(filtered);
    } catch (err) {
      console.warn("Roster load error:", err);
      setRosterStudents([]);
    }
  };

  const filteredRoster = rosterStudents.filter((s) => {
    const q = rosterSearch.toLowerCase();
    const name = (s.full_name || s.name || "").toLowerCase();
    const roll = (s.roll_number || s.personal_code || "").toLowerCase();
    return name.includes(q) || roll.includes(q);
  });

  const daySchedule = schedule.filter((item) => item.day === activeDay);

  return (
    <div className="relative text-slate-200 min-h-full pb-10 font-sans">
      <div className="fixed top-0 right-10 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-6xl mx-auto space-y-10">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <p className="text-blue-300 text-sm font-semibold mb-1 uppercase tracking-widest">Faculty Portal</p>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white">Classrooms & Master Timetable 👨‍🏫</h1>
            <p className="text-slate-400 text-sm mt-1">Review assigned batches, inspect live student rosters, and view weekly period schedules</p>
          </div>
          <div className="bg-slate-900/80 border border-slate-700/80 px-4 py-2 rounded-2xl text-xs font-mono text-blue-300">
            Node: <strong>{activeSchoolId}</strong>
          </div>
        </div>

        {/* ASSIGNED CLASSROOM BATCHES GRID */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>🏫</span> Assigned Classroom Batches ({classesList.length})
            </h2>
            <span className="text-xs text-slate-400">Rosters sync in real-time with directory</span>
          </div>

          {classesList.length === 0 ? (
            <div className="p-10 text-center bg-[#1E293B]/70 border border-slate-700/60 rounded-3xl text-slate-400 space-y-2">
              <div className="text-4xl opacity-60">🏫</div>
              <h4 className="text-base font-bold text-white">No classes assigned to your faculty ID yet. Ask your HOD to assign batches.</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                When an administrator assigns classes to your faculty profile or configures the master timetable, your assigned batches and student rosters will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {classesList.map((cls) => (
                <div
                  key={cls.id}
                  className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col justify-between group hover:border-blue-500/50 hover:bg-white/[0.08] transition-all"
                >
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider">
                        {cls.room}
                      </span>
                      <span className="text-xs font-bold text-emerald-400">Active</span>
                    </div>
                    <h3 className="text-2xl font-black text-white mb-1 group-hover:text-blue-300 transition-colors">
                      {cls.name}
                    </h3>
                    <p className="text-blue-300 text-xs font-semibold mb-3">{cls.subject}</p>

                    <div className="space-y-1.5 pt-3 border-t border-slate-800/80 text-xs text-slate-300">
                      <p className="flex justify-between">
                        <span className="text-slate-400">Batch Strength:</span>
                        <strong className="text-white">{cls.strength} Students</strong>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-slate-400">Daily Slot:</span>
                        <span className="font-mono text-amber-300">{cls.timing}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => openRosterDrawer(cls)}
                    className="mt-6 w-full bg-slate-800 hover:bg-blue-600 text-white font-bold py-2.5 px-4 rounded-xl transition-all border border-slate-700 hover:border-blue-500 text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                  >
                    <span>👥</span> View Student Roster
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* WEEKLY MASTER TIMETABLE & CLASS SCHEDULE GRID */}
        <div className="bg-[#1E293B]/80 backdrop-blur-xl border border-slate-700/70 rounded-3xl shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-700/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-800/40">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>🗓️</span> Weekly Master Timetable & Class Schedule
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Dynamic Monday–Saturday curriculum timeline configured by Executive Hub
              </p>
            </div>

            {/* DAY SELECTOR PILLS */}
            <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
              {WEEKDAYS.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setActiveDay(day)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    activeDay === day
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                      : "bg-slate-900/60 text-slate-400 hover:text-white border border-slate-700/60"
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-700/70 text-slate-400 text-xs uppercase tracking-wider bg-slate-900/40">
                  <th className="p-4 pl-6">Period & Timing</th>
                  <th className="p-4">Assigned Subject</th>
                  <th className="p-4">Target Batch</th>
                  <th className="p-4">Room & Venue</th>
                  <th className="p-4">Faculty Assigned</th>
                  <th className="p-4 pr-6 text-right">Roster Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {daySchedule.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-slate-400">
                      <p className="font-bold text-white text-sm">No timetable periods scheduled for {activeDay}.</p>
                      <p className="text-xs mt-1">Check back once your Principal/HOD configures the master timetable in the Executive Command Center.</p>
                    </td>
                  </tr>
                ) : (
                  daySchedule.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-4 pl-6 whitespace-nowrap">
                        <p className="font-bold text-white text-sm">{p.periodNo || "Period"}</p>
                        <p className="text-[11px] font-mono text-slate-400">{p.timeWindow || "Scheduled"}</p>
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-blue-300">{p.subject || "Subject"}</span>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {p.className || "General"}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-xs text-slate-300 whitespace-nowrap">
                        {p.room || "Room 101"}
                      </td>
                      <td className="p-4 text-xs text-slate-300">
                        {p.teacher || "Faculty"}
                      </td>
                      <td className="p-4 pr-6 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            const matched = classesList.find((c) => c.name === p.className) || {
                              name: p.className,
                              room: p.room,
                              subject: p.subject,
                            };
                            openRosterDrawer(matched);
                          }}
                          className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-bold rounded-xl transition-all cursor-pointer shadow"
                        >
                          Roster 👥
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* STUDENT CERTIFICATE REQUESTS APPROVAL WORKFLOW */}
        <CertificateManagementCard mode="teacher" />

        {/* SLIDE-OUT DRAWER / MODAL: LIVE STUDENT ROSTER */}
        {selectedRosterClass && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
            onClick={() => setSelectedRosterClass(null)}
          >
            <div
              className="bg-[#1E293B] border border-slate-700/80 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center border-b border-slate-700 pb-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-md border border-blue-500/20">
                    {selectedRosterClass.room} &bull; {selectedRosterClass.subject}
                  </span>
                  <h3 className="text-xl font-black text-white mt-1">
                    {selectedRosterClass.name} &mdash; Enrolled Roster ({rosterStudents.length})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRosterClass(null)}
                  className="text-slate-400 hover:text-white text-lg font-bold p-2 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* SEARCH BOX */}
              <div>
                <input
                  type="text"
                  placeholder="Filter roster by student name or roll number..."
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* ROSTER LIST */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {filteredRoster.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs">
                    No students currently enrolled in {selectedRosterClass.name}.
                  </div>
                ) : (
                  filteredRoster.map((s, idx) => (
                    <div
                      key={s.id || idx}
                      className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 flex justify-between items-center"
                    >
                      <div>
                        <p className="text-sm font-bold text-white">{s.full_name || s.name}</p>
                        <p className="text-[11px] font-mono text-slate-400">
                          Roll: <strong className="text-blue-400">{s.roll_number || s.personal_code || s.id}</strong>
                        </p>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                        Enrolled
                      </span>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-2 border-t border-slate-700 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedRosterClass(null)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Close Roster
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}