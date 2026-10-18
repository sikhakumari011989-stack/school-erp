import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import CertificateManagementCard from "../Components/CertificateManagementCard";
import { getDefaultSchoolDirectory } from "../utils/idGenerator";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const PERIODS = [
  { id: "P1", time: "08:30 AM - 09:15 AM", label: "Period 1" },
  { id: "P2", time: "09:20 AM - 10:05 AM", label: "Period 2" },
  { id: "RECESS", time: "10:05 AM - 10:35 AM", label: "☕ Break / Recess", isBreak: true },
  { id: "P3", time: "10:35 AM - 11:20 AM", label: "Period 3" },
  { id: "P4", time: "11:25 AM - 12:10 PM", label: "Period 4" },
  { id: "P5", time: "12:15 PM - 01:00 PM", label: "Period 5" },
];

const MASTER_TIMETABLE_DATA = {
  Monday: {
    P1: { subject: "Advanced Mathematics", room: "Room 302", batch: "Class 10-ICSE", topic: "Quadratic Equations" },
    P2: { subject: "Linear Algebra", room: "Room 304", batch: "Class 10-A", topic: "Matrices & Determinants" },
    P3: { subject: "Geometry & Trigonometry", room: "Room 201", batch: "Class 9-A", topic: "Heights & Distances" },
    P4: { subject: "Remedial Problem Solving", room: "Room 302", batch: "Class 10-B", topic: "Weekly Practice Sheet" },
    P5: { subject: "Faculty Curriculum Planning", room: "Staff Room A", batch: "Faculty Node", topic: "Lesson Structuring" },
  },
  Tuesday: {
    P1: { subject: "Linear Algebra", room: "Room 304", batch: "Class 10-A", topic: "Coordinate Geometry" },
    P2: { subject: "Advanced Mathematics", room: "Room 302", batch: "Class 10-ICSE", topic: "Arithmetic Progressions" },
    P3: { subject: "Mathematics Lab", room: "Computer Lab 2", batch: "Class 10-ICSE", topic: "Statistical Analysis" },
    P4: { subject: "Geometry & Trigonometry", room: "Room 201", batch: "Class 9-A", topic: "Circles & Tangents" },
    P5: { subject: "Student Doubt Clearing", room: "Room 304", batch: "Class 10-A", topic: "Open Q&A Clinic" },
  },
  Wednesday: {
    P1: { subject: "Geometry & Trigonometry", room: "Room 201", batch: "Class 9-A", topic: "Surface Area & Volume" },
    P2: { subject: "Linear Algebra", room: "Room 304", batch: "Class 10-A", topic: "Polynomial Theorems" },
    P3: { subject: "Advanced Mathematics", room: "Room 302", batch: "Class 10-ICSE", topic: "Calculus Fundamentals" },
    P4: { subject: "Applied Statistics", room: "Room 302", batch: "Class 10-B", topic: "Mean, Median & Mode" },
    P5: { subject: "Department Review", room: "Conference Hall", batch: "HOD Council", topic: "Syllabus Audit" },
  },
  Thursday: {
    P1: { subject: "Advanced Mathematics", room: "Room 302", batch: "Class 10-ICSE", topic: "Probability Theorems" },
    P2: { subject: "Linear Algebra", room: "Room 304", batch: "Class 10-A", topic: "Linear Inequalities" },
    P3: { subject: "Geometry & Trigonometry", room: "Room 201", batch: "Class 9-A", topic: "Triangle Congruence" },
    P4: { subject: "Competitive Exam Prep", room: "Room 302", batch: "Class 10-ICSE", topic: "Olympiad Math" },
    P5: { subject: "Parent Counseling Clinic", room: "Cabin 4", batch: "Open Session", topic: "Academic Feedback" },
  },
  Friday: {
    P1: { subject: "Linear Algebra", room: "Room 304", batch: "Class 10-A", topic: "Weekly Mock Quiz" },
    P2: { subject: "Advanced Mathematics", room: "Room 302", batch: "Class 10-ICSE", topic: "Chapter Review Test" },
    P3: { subject: "Applied Mathematics", room: "Room 302", batch: "Class 10-B", topic: "Commercial Math" },
    P4: { subject: "Geometry & Trigonometry", room: "Room 201", batch: "Class 9-A", topic: "Constructions Lab" },
    P5: { subject: "Assignment Grading & Marks", room: "Staff Room A", batch: "Faculty Node", topic: "Term Marks Register" },
  },
  Saturday: {
    P1: { subject: "Weekend Revision Masterclass", room: "Auditorium", batch: "Class 10-ICSE", topic: "Comprehensive Board Review" },
    P2: { subject: "Interactive Math Olympiad", room: "Room 304", batch: "Class 10-A", topic: "Problem Solving Sprint" },
    P3: { subject: "Project & Seminar Guidance", room: "Library Hall", batch: "All Batches", topic: "Science & Math Exhibition" },
    P4: { subject: "Institutional Sports & Activities", room: "Campus Ground", batch: "All Batches", topic: "Inter-House Matches" },
    P5: { subject: "Weekend Wrap & Sync", room: "Executive Board", batch: "Administration", topic: "Weekly Review" },
  },
};

export default function TeacherClasses() {
  const { user, tenant } = useContext(AppContext) || {};
  const { showToast } = useToast();

  const activeSchoolId = user?.institution_code || user?.school_id || tenant?.code || "CAMPUS-01";

  const [classesList] = useState([
    { id: 1, name: "Class 10-ICSE", strength: 42, subject: "Mathematics & Statistics", timing: "08:30 AM - 09:15 AM", room: "Room 302" },
    { id: 2, name: "Class 10-A", strength: 38, subject: "Linear Algebra & Trig", timing: "09:20 AM - 10:05 AM", room: "Room 304" },
    { id: 3, name: "Class 10-B", strength: 40, subject: "Commercial & Applied Math", timing: "11:25 AM - 12:10 PM", room: "Room 302" },
    { id: 4, name: "Class 9-A", strength: 45, subject: "Foundational Geometry", timing: "10:35 AM - 11:20 AM", room: "Room 201" },
  ]);

  const [activeDay, setActiveDay] = useState("Monday");
  const [selectedRosterClass, setSelectedRosterClass] = useState(null);
  const [rosterSearch, setRosterSearch] = useState("");
  const [rosterStudents, setRosterStudents] = useState([]);

  // Load students for active roster batch from local directory
  const openRosterDrawer = (cls) => {
    setSelectedRosterClass(cls);
    setRosterSearch("");

    try {
      let localDir = [];
      const raw = localStorage.getItem(`erp_directory_${activeSchoolId}`);
      if (raw) {
        localDir = JSON.parse(raw);
      } else {
        localDir = getDefaultSchoolDirectory(activeSchoolId);
      }

      // Filter students matching class
      const normalize = (b) => (b || "").toLowerCase().replace(/class\s*/i, "").replace(/[^a-z0-9]/g, "");
      const target = normalize(cls.name);

      let filtered = localDir
        .filter((item) => (item.role || "student").toLowerCase() === "student")
        .filter((item) => {
          const itemNorm = normalize(item.class_name || item.class);
          return itemNorm === target || itemNorm.includes(target) || target.includes(itemNorm);
        });

      if (filtered.length === 0) {
        const anyStudents = localDir.filter((item) => (item.role || "student").toLowerCase() === "student");
        if (anyStudents.length > 0) {
          filtered = anyStudents.map((d, idx) => ({
            ...d,
            roll_number: d.roll_number || d.personal_code || `STU-${101 + idx}`,
            class_name: cls.name,
            attendance_rate: `${(92 + (idx * 1.7) % 7).toFixed(1)}%`,
          }));
        } else {
          filtered = [];
        }
      }

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
            <span className="text-xs text-slate-400">Click any card to open the live student roster</span>
          </div>

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
                      <span className="font-mono text-amber-300">{cls.timing.split(" - ")[0]}</span>
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
        </div>

        {/* WEEKLY MASTER TIMETABLE & CLASS SCHEDULE GRID */}
        <div className="bg-[#1E293B]/80 backdrop-blur-xl border border-slate-700/70 rounded-3xl shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-700/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-800/40">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>🗓️</span> Weekly Master Timetable & Class Schedule
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Comprehensive Monday–Saturday institutional curriculum timeline
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
                  <th className="p-4">Curriculum Topic</th>
                  <th className="p-4 pr-6 text-right">Roster Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {PERIODS.map((p) => {
                  if (p.isBreak) {
                    return (
                      <tr key={p.id} className="bg-amber-500/5 border-y border-amber-500/20">
                        <td colSpan="6" className="p-3 text-center text-amber-300 font-bold text-xs tracking-wider">
                          ☕ RECESS & FACULTY REFRESHMENT BREAK ({p.time})
                        </td>
                      </tr>
                    );
                  }

                  const slotData = MASTER_TIMETABLE_DATA[activeDay]?.[p.id] || {
                    subject: "Free Academic Period",
                    room: "Faculty Room",
                    batch: "Independent Study",
                    topic: "Open Library & Self-Study",
                  };

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-4 pl-6 whitespace-nowrap">
                        <p className="font-bold text-white text-sm">{p.label}</p>
                        <p className="text-[11px] font-mono text-slate-400">{p.time}</p>
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-blue-300">{slotData.subject}</span>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {slotData.batch}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-xs text-slate-300 whitespace-nowrap">
                        {slotData.room}
                      </td>
                      <td className="p-4 text-xs text-slate-300">
                        {slotData.topic}
                      </td>
                      <td className="p-4 pr-6 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            const matched = classesList.find((c) => c.name === slotData.batch) || {
                              name: slotData.batch,
                              room: slotData.room,
                              subject: slotData.subject,
                            };
                            openRosterDrawer(matched);
                          }}
                          className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-bold rounded-xl transition-all cursor-pointer shadow"
                        >
                          Roster 👥
                        </button>
                      </td>
                    </tr>
                  );
                })}
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
              className="bg-[#1E293B] border border-slate-700/80 rounded-3xl p-6 sm:p-8 max-w-3xl w-full shadow-2xl space-y-6 max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* DRAWER HEADER */}
              <div className="flex justify-between items-start border-b border-slate-700/60 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                      {selectedRosterClass.room || "Room 302"}
                    </span>
                    <span className="text-xs text-slate-400 font-bold">{selectedRosterClass.subject}</span>
                  </div>
                  <h3 className="text-2xl font-black text-white">
                    {selectedRosterClass.name} Enrolled Student Roster
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Live enrollment records synced from institutional directory
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRosterClass(null)}
                  className="text-slate-400 hover:text-white text-3xl font-bold cursor-pointer leading-none p-1"
                >
                  &times;
                </button>
              </div>

              {/* SEARCH BAR */}
              <div className="w-full">
                <input
                  type="text"
                  placeholder="Filter student by name or roll number (e.g. STU-1024)..."
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* ROSTER TABLE */}
              <div className="overflow-y-auto flex-1 overflow-x-auto w-full border border-slate-700/60 rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-700/70 text-slate-400 text-xs uppercase tracking-wider bg-slate-900/60 sticky top-0 backdrop-blur-md">
                      <th className="p-3.5 pl-5">Roll No</th>
                      <th className="p-3.5">Full Name</th>
                      <th className="p-3.5">Attendance Rate</th>
                      <th className="p-3.5">Parent Contact</th>
                      <th className="p-3.5 pr-5 text-right">Enrollment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs sm:text-sm">
                    {filteredRoster.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-slate-500 italic">
                          No students found matching "{rosterSearch}".
                        </td>
                      </tr>
                    ) : (
                      filteredRoster.map((s, idx) => (
                        <tr key={s.roll_number || s.id || idx} className="hover:bg-slate-800/30 transition-colors">
                          <td className="p-3.5 pl-5 font-mono font-bold text-blue-400">
                            {s.roll_number || s.personal_code || `STU-${1024 + idx}`}
                          </td>
                          <td className="p-3.5 font-bold text-white">
                            {s.full_name || s.name}
                          </td>
                          <td className="p-3.5">
                            <span className="font-mono font-bold text-emerald-400">
                              {s.attendance_rate || `${(93 + (idx * 1.5) % 6).toFixed(1)}%`}
                            </span>
                          </td>
                          <td className="p-3.5 text-xs font-mono text-slate-300">
                            {s.phone || "+91 98200 12345"}
                          </td>
                          <td className="p-3.5 pr-5 text-right">
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              Enrolled
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* DRAWER FOOTER */}
              <div className="flex justify-between items-center pt-2 border-t border-slate-700/60 text-xs">
                <span className="text-slate-400">
                  Showing <strong>{filteredRoster.length}</strong> enrolled students
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedRosterClass(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-5 py-2 rounded-xl transition-colors cursor-pointer"
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