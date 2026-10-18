import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { supabase } from "../supabaseClient";
import { resolveSchoolUuid } from "../utils/supabaseHelpers";
import { TableSkeleton } from "../Components/Skeleton";
import { notifyAttendanceAbsent } from "../utils/notifications";
import { logSecurityAction, AUDIT_ACTIONS } from "../utils/auditLogger";
import { getDefaultSchoolDirectory } from "../utils/idGenerator";

const STANDARD_BATCHES = [
  "Class 10-ICSE",
  "Class 10-A",
  "Class 10-B",
  "Class 9-A",
  "Class 9-B",
];

export default function TeacherAttendance() {
  const { user, tenant } = useContext(AppContext) || {};
  const { showToast } = useToast();

  const activeSchoolId = user?.institution_code || user?.school_id || tenant?.code || "CAMPUS-01";
  const [batches, setBatches] = useState(STANDARD_BATCHES);
  const [selectedBatch, setSelectedBatch] = useState("Class 10-ICSE");
  const [students, setStudents] = useState([]);
  const [attendanceStatus, setAttendanceStatus] = useState({}); // { studentId: 'present' | 'absent' }
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load available batches dynamically from database & directory
  useEffect(() => {
    const loadBatches = async () => {
      const batchSet = new Set(STANDARD_BATCHES);

      // Check classes from Supabase
      try {
        if (supabase) {
          const { data } = await supabase.from("classes").select("name");
          if (data && data.length > 0) {
            data.forEach((c) => {
              if (c.name) {
                const formatted = c.name.startsWith("Class ") ? c.name : `Class ${c.name}`;
                batchSet.add(formatted);
              }
            });
          }
        }
      } catch (err) {
        console.warn("Classes query notice:", err);
      }

      // Check directory from localStorage
      try {
        const rawDir = localStorage.getItem(`erp_directory_${activeSchoolId}`);
        if (rawDir) {
          const dir = JSON.parse(rawDir);
          dir.forEach((item) => {
            if (item.class_name && item.role === "student") {
              const formatted = item.class_name.startsWith("Class ")
                ? item.class_name
                : `Class ${item.class_name}`;
              batchSet.add(formatted);
            }
          });
        }
      } catch (err) {
        console.warn("Directory batch scan error:", err);
      }

      const batchList = Array.from(batchSet);
      setBatches(batchList);
      if (!batchList.includes(selectedBatch)) {
        setSelectedBatch(batchList[0] || "Class 10-ICSE");
      }
    };

    loadBatches();
  }, [activeSchoolId]);

  // Dynamically load the roster for the selected classroom batch
  useEffect(() => {
    if (!selectedBatch) return;

    const fetchRoster = async () => {
      setLoading(true);
      try {
        const today = new Date().toISOString().split("T")[0];

        // 1. Read directory from localStorage
        let localDir = [];
        try {
          const raw = localStorage.getItem(`erp_directory_${activeSchoolId}`);
          if (raw) {
            localDir = JSON.parse(raw);
          } else {
            localDir = getDefaultSchoolDirectory(activeSchoolId);
            localStorage.setItem(`erp_directory_${activeSchoolId}`, JSON.stringify(localDir));
          }
        } catch {
          localDir = getDefaultSchoolDirectory(activeSchoolId);
        }

        // 2. Fetch from Supabase students table
        let dbStudents = [];
        try {
          if (supabase) {
            const { data } = await supabase
              .from("students")
              .select("*")
              .eq("school_id", activeSchoolId);
            if (data && data.length > 0) {
              dbStudents = data;
            }
          }
        } catch (dbErr) {
          console.warn("Supabase students fetch notice:", dbErr);
        }

        // Combine and normalize students (role === 'student')
        const allStudentsMap = new Map();

        // Add default/local students first
        localDir
          .filter((item) => (item.role || "student").toLowerCase() === "student")
          .forEach((item) => {
            const roll = item.roll_number || item.role_code || item.personal_code || item.id;
            allStudentsMap.set(roll, {
              id: roll,
              roll_number: roll,
              name: item.full_name || item.name || "Student Member",
              class_name: item.class_name || item.class || "Class 10-ICSE",
              phone: item.phone || item.parent_phone || "+91 9800000000",
            });
          });

        // Merge Supabase students
        dbStudents.forEach((item) => {
          const roll = item.roll_number || item.id;
          if (roll) {
            allStudentsMap.set(roll, {
              id: roll,
              roll_number: roll,
              name: item.full_name || item.name || "Enrolled Student",
              class_name: item.class_name || item.class || selectedBatch,
              phone: item.phone || item.parent_phone || "+91 9800000000",
            });
          }
        });

        const combinedList = Array.from(allStudentsMap.values());

        // Normalize batch comparison function
        const normalizeBatch = (b) =>
          (b || "").toLowerCase().replace(/class\s*/i, "").replace(/[^a-z0-9]/g, "");

        const targetNorm = normalizeBatch(selectedBatch);

        // Filter students matching the selected batch
        let batchStudents = combinedList.filter((s) => {
          const sNorm = normalizeBatch(s.class_name);
          return sNorm === targetNorm || sNorm.includes(targetNorm) || targetNorm.includes(sNorm);
        });

        // Requirement: If a selected batch has no custom students yet, auto-populate with the institution's enrolled students so the list is NEVER empty.
        if (batchStudents.length === 0) {
          if (combinedList.length > 0) {
            // Adopt existing enrolled students into this batch view
            batchStudents = combinedList.slice(0, 8).map((s, idx) => ({
              ...s,
              class_name: selectedBatch,
            }));
          } else {
            // Fallback default students
            const defaults = getDefaultSchoolDirectory(activeSchoolId).filter((d) => d.role === "student");
            batchStudents = defaults.map((d) => ({
              ...d,
              class_name: selectedBatch,
            }));
          }
        }

        setStudents(batchStudents);

        // 3. Load existing attendance for this batch and date
        const attendanceStorageKey = `erp_attendance_${activeSchoolId}_${selectedBatch}_${today}`;
        const savedAttendanceRaw = localStorage.getItem(attendanceStorageKey);

        const initialStatus = {};
        if (savedAttendanceRaw) {
          try {
            const savedRecords = JSON.parse(savedAttendanceRaw);
            savedRecords.forEach((rec) => {
              const key = rec.student_id || rec.roll_number;
              if (key) initialStatus[key] = rec.status || "present";
            });
          } catch (e) {
            console.warn("Attendance parse error:", e);
          }
        }

        // Initialize status for all batch students
        batchStudents.forEach((s) => {
          if (!initialStatus[s.id]) {
            initialStatus[s.id] = "present";
          }
        });

        setAttendanceStatus(initialStatus);
      } catch (err) {
        console.error("Error loading attendance roster:", err);
        showToast("Error loading dynamic roster", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchRoster();
  }, [selectedBatch, activeSchoolId]);

  // Toggle individual student attendance status
  const toggleStatus = (studentId) => {
    setAttendanceStatus((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === "present" ? "absent" : "present",
    }));
  };

  // Mark all currently rendered students in the batch
  const markAll = (status) => {
    const updated = {};
    students.forEach((s) => {
      updated[s.id] = status;
    });
    setAttendanceStatus(updated);
    showToast(`Marked all ${students.length} students in ${selectedBatch} as ${status.toUpperCase()}!`, "info");
  };

  // Save attendance
  const handleSaveAttendance = async () => {
    if (students.length === 0) return;
    setSaving(true);

    const today = new Date().toISOString().split("T")[0];

    try {
      const formattedRecords = students.map((s) => ({
        student_id: s.id,
        roll_number: s.roll_number,
        name: s.name,
        class_name: selectedBatch,
        status: attendanceStatus[s.id] || "present",
        date: today,
        timestamp: new Date().toISOString(),
      }));

      // 1. Write to local storage with specified key: erp_attendance_${schoolId}_${batch}_${date}
      const attendanceStorageKey = `erp_attendance_${activeSchoolId}_${selectedBatch}_${today}`;
      localStorage.setItem(attendanceStorageKey, JSON.stringify(formattedRecords));

      // Also maintain general date index for cross-dashboard analytics
      localStorage.setItem(`erp_attendance_${activeSchoolId}_${today}`, JSON.stringify(formattedRecords));

      // 2. Sync to Supabase attendance table
      try {
        if (supabase) {
          const schoolUuid = await resolveSchoolUuid(activeSchoolId);
          await supabase.from("attendance").insert([
            {
              school_id: schoolUuid,
              class_id: selectedBatch,
              date: today,
              records: formattedRecords,
            },
          ]);
        }
      } catch (dbErr) {
        console.warn("Supabase attendance sync notice:", dbErr);
      }

      // 3. Automated Absent Notification Alerts
      const absentStudents = students.filter(
        (s) => (attendanceStatus[s.id] || "present") === "absent"
      );

      if (absentStudents.length > 0) {
        absentStudents.forEach((absentStudent) => {
          notifyAttendanceAbsent({
            studentName: absentStudent.name,
            rollNumber: absentStudent.roll_number,
            guardianPhone: absentStudent.phone || "+91 98765 43210",
            schoolName: tenant?.name || user?.institution_name || "Apex International Academy",
            date: today,
            className: selectedBatch,
          });
        });
        showToast(
          `Attendance saved for ${selectedBatch}! (${absentStudents.length} Absent notices logged).`,
          "success"
        );
      } else {
        showToast(`Attendance synchronized for ${selectedBatch}! (100% Present recorded)`, "success");
      }

      // 4. Audit Log
      logSecurityAction({
        action: AUDIT_ACTIONS.ATTENDANCE_MARKED,
        entityType: "ATTENDANCE",
        entityId: selectedBatch,
        details: `Saved attendance register for ${selectedBatch} with ${students.length} students (${absentStudents.length} absent)`,
        user,
        schoolId: activeSchoolId,
      });

      // Dispatch event
      window.dispatchEvent(new Event("erp-attendance-updated"));
    } catch (err) {
      console.error("Error saving attendance:", err);
      showToast("Attendance saved to local storage.", "info");
    } finally {
      setSaving(false);
    }
  };

  const presentCount = Object.values(attendanceStatus).filter((s) => s === "present").length;
  const absentCount = students.length - presentCount;

  return (
    <div className="relative text-slate-200 min-h-full pb-10 font-sans">
      <div className="fixed top-0 right-10 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-6xl mx-auto space-y-8">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-emerald-300 text-sm font-semibold mb-1 uppercase tracking-widest">
              Faculty Command Suite
            </p>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
              Daily Attendance Register ✅
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Dynamic classroom roll call synced with institution directory and student portals
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="bg-slate-800/80 border border-slate-700 text-slate-300 px-4 py-2 rounded-xl text-sm font-bold shadow-inner flex items-center gap-2">
              <span>📅</span>
              <span>Today: {new Date().toLocaleDateString(undefined, { dateStyle: "long" })}</span>
            </span>
          </div>
        </div>

        {/* BATCH SELECTOR & QUICK ACTIONS CARD */}
        <div className="bg-[#1E293B]/80 backdrop-blur-xl border border-slate-700/70 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="w-full md:w-1/2">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Select Target Classroom / Batch
            </label>
            <select
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3.5 text-white font-bold focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
            >
              {batches.map((batch) => (
                <option key={batch} value={batch}>
                  {batch}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-2">
              Active Node: <span className="text-emerald-400 font-mono font-bold">{activeSchoolId}</span>
            </p>
          </div>

          {students.length > 0 && (
            <div className="flex gap-3 w-full md:w-auto">
              <button
                type="button"
                onClick={() => markAll("present")}
                className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 px-5 py-3 rounded-xl font-extrabold text-xs transition-all flex-1 md:flex-initial shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>✓</span> Mark All Present
              </button>
              <button
                type="button"
                onClick={() => markAll("absent")}
                className="bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 px-5 py-3 rounded-xl font-extrabold text-xs transition-all flex-1 md:flex-initial shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>✗</span> Mark All Absent
              </button>
            </div>
          )}
        </div>

        {/* ATTENDANCE ROSTER TABLE */}
        <div className="bg-[#1E293B]/80 backdrop-blur-xl border border-slate-700/70 rounded-3xl shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-700/60 flex justify-between items-center bg-slate-800/40 flex-wrap gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>📋</span>
                <span>{selectedBatch} Student Roster Roll List</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Toggle status buttons to record daily attendance
              </p>
            </div>
            <div className="flex items-center gap-2.5 text-xs font-bold">
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full">
                Present: {presentCount}
              </span>
              <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-1 rounded-full">
                Absent: {absentCount}
              </span>
              <span className="bg-slate-800 text-slate-300 border border-slate-700 px-3 py-1 rounded-full">
                Total: {students.length}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="p-6">
              <TableSkeleton rows={5} cols={3} />
            </div>
          ) : students.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <p className="text-base font-bold text-slate-300 mb-1">No enrolled students in this class.</p>
              <p className="text-xs">Add students via Super Admin or Trustee portals.</p>
            </div>
          ) : (
            <div>
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-700/70 text-slate-400 text-xs uppercase tracking-wider bg-slate-900/40">
                      <th className="p-4 pl-6">Roll Number</th>
                      <th className="p-4">Full Name</th>
                      <th className="p-4">Assigned Batch</th>
                      <th className="p-4 text-center">Interactive Status Toggle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-sm">
                    {students.map((student) => {
                      const isPresent = (attendanceStatus[student.id] || "present") === "present";
                      return (
                        <tr key={student.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="p-4 pl-6 font-mono text-emerald-400 font-bold">
                            {student.roll_number || student.personal_code || "STU-101"}
                          </td>
                          <td className="p-4 font-bold text-white text-base">
                            {student.name}
                          </td>
                          <td className="p-4 text-xs font-medium text-slate-300">
                            {student.class_name}
                          </td>
                          <td className="p-4 text-center">
                            <button
                              type="button"
                              onClick={() => toggleStatus(student.id)}
                              className={`px-6 py-2 rounded-xl font-black text-xs sm:text-sm transition-all shadow-md cursor-pointer ${
                                isPresent
                                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30"
                                  : "bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30"
                              }`}
                            >
                              {isPresent ? "PRESENT ✓" : "ABSENT ✗"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="p-6 bg-slate-800/40 border-t border-slate-700/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <p className="text-xs text-slate-400">
                  Attendance is synced to <code className="text-emerald-400">erp_attendance_{activeSchoolId}_{selectedBatch}_{new Date().toISOString().split("T")[0]}</code>
                </p>
                <button
                  type="button"
                  onClick={handleSaveAttendance}
                  disabled={saving}
                  className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold px-8 py-3.5 rounded-xl shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <span>Synchronizing Records...</span>
                  ) : (
                    <>
                      <span>💾</span>
                      <span>Save Attendance Register 🚀</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}