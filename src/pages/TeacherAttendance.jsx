import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { supabase } from "../supabaseClient";
import { resolveSchoolUuid } from "../utils/supabaseHelpers";
import { TableSkeleton } from "../Components/Skeleton";
import { notifyAttendanceAbsent } from "../utils/notifications";
import { logSecurityAction, AUDIT_ACTIONS } from "../utils/auditLogger";

export default function TeacherAttendance() {
  const { user } = useContext(AppContext);
  const { showToast } = useToast();
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState([]);
  const [attendanceStatus, setAttendanceStatus] = useState({}); // { studentId: 'present'/'absent' }
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch classes on load
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const { data, error } = await supabase.from("classes").select("*");
        if (!error && data) {
          setClasses(data);
          if (data.length > 0) {
            setSelectedClass(data[0].id);
          }
        }
      } catch (err) {
        console.error("Error fetching classes:", err);
      }
    };
    fetchClasses();
  }, []);

  // Fetch students whenever a class is selected
  useEffect(() => {
    if (!selectedClass) {
      setStudents([]);
      return;
    }

    const fetchStudentsAndExistingAttendance = async () => {
      setLoading(true);
      try {
        const today = new Date().toISOString().split("T")[0];

        const [studentsRes, attendanceRes] = await Promise.all([
          supabase.from("students").select("*").eq("class_id", selectedClass),
          supabase.from("attendance").select("records").eq("class_id", selectedClass).eq("date", today).maybeSingle(),
        ]);

        if (studentsRes.data) {
          setStudents(studentsRes.data);

          // Check if already marked today
          const initialStatus = {};
          const existingRecords = attendanceRes.data?.records || [];

          studentsRes.data.forEach((s) => {
            const found = existingRecords.find((r) => r.student_id === s.id);
            initialStatus[s.id] = found?.status || "present";
          });

          setAttendanceStatus(initialStatus);
        }
      } catch (err) {
        console.error("Error loading class roster:", err);
        showToast("Error loading class roster", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchStudentsAndExistingAttendance();
  }, [selectedClass, showToast]);

  const toggleStatus = (studentId) => {
    setAttendanceStatus((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === "present" ? "absent" : "present",
    }));
  };

  const markAll = (status) => {
    const updated = {};
    students.forEach((s) => {
      updated[s.id] = status;
    });
    setAttendanceStatus(updated);
    showToast(`Marked all students as ${status.toUpperCase()}`, "info");
  };

  const handleSaveAttendance = async () => {
    if (students.length === 0) return;
    setSaving(true);

    const today = new Date().toISOString().split("T")[0];

    try {
      const schoolUuid = await resolveSchoolUuid(user?.school_id || user?.institution_code);

      const formattedRecords = students.map((student) => ({
        student_id: student.id,
        name: student.name,
        roll_number: student.roll_number,
        status: attendanceStatus[student.id] || "present",
      }));

      // Check if attendance already exists for this class and date
      const { data: existing } = await supabase
        .from("attendance")
        .select("id")
        .eq("class_id", selectedClass)
        .eq("date", today)
        .maybeSingle();

      let error = null;
      if (existing?.id) {
        const res = await supabase
          .from("attendance")
          .update({ records: formattedRecords })
          .eq("id", existing.id);
        error = res.error;
      } else {
        const res = await supabase.from("attendance").insert([
          {
            school_id: schoolUuid,
            class_id: selectedClass,
            date: today,
            records: formattedRecords,
          },
        ]);
        error = res.error;
      }

      if (error) throw error;

      // Automated WhatsApp & SMS Notifications for Absent Students
      const absentStudents = students.filter(
        (s) => (attendanceStatus[s.id] || "present") === "absent"
      );

      if (absentStudents.length > 0) {
        const currentClassObj = classes.find((c) => c.id === selectedClass);
        for (const absentStudent of absentStudents) {
          notifyAttendanceAbsent({
            studentName: absentStudent.name,
            rollNumber: absentStudent.roll_number,
            guardianPhone: absentStudent.parent_phone || absentStudent.phone || "+91 98765 43210",
            schoolName: user?.institution_name || "Apex International Academy",
            date: today,
            className: currentClassObj?.name || "Standard Batch",
          });
        }
        showToast(
          `Attendance saved! Dispatched ${absentStudents.length} automated WhatsApp & SMS absent alert(s) to parents.`,
          "success"
        );
      } else {
        showToast("Attendance register synchronized! (100% Student Attendance Recorded)", "success");
      }

      // Record administrative security audit log
      logSecurityAction({
        action: AUDIT_ACTIONS.ATTENDANCE_MARKED,
        entityType: "ATTENDANCE",
        entityId: selectedClass,
        details: `Marked attendance for ${students.length} students (${absentStudents.length} absent)`,
        user,
        schoolId: schoolUuid,
      });
    } catch (err) {
      console.error("Error saving attendance:", err);
      showToast("Failed to save attendance records to database.", "error");
    } finally {
      setSaving(false);
    }
  };

  const presentCount = Object.values(attendanceStatus).filter((s) => s === "present").length;
  const absentCount = students.length - presentCount;

  return (
    <div className="relative text-slate-200 min-h-full pb-10 font-sans">
      <div className="fixed top-0 right-10 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="mb-8 flex justify-between items-center flex-wrap gap-4">
          <div>
            <p className="text-emerald-300 text-sm font-semibold mb-1 uppercase tracking-widest">
              Faculty Command Suite
            </p>
            <h1 className="text-3xl font-extrabold text-white">Daily Attendance Register ✅</h1>
            <p className="text-slate-400 text-sm mt-1">
              Live classroom roll call with instant synchronization to trustee and student portals
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="bg-slate-800/80 border border-slate-700 text-slate-300 px-4 py-2 rounded-xl text-sm font-bold shadow-inner">
              📅 Date: {new Date().toLocaleDateString(undefined, { dateStyle: "long" })}
            </span>
          </div>
        </div>

        {/* CLASS SELECTOR & QUICK ACTIONS CARD */}
        <div className="bg-[#1E293B]/70 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-6 shadow-2xl mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="w-full md:w-1/2">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Select Target Classroom / Batch
            </label>
            <select
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 font-bold"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="">-- Choose Classroom Batch --</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  Class {cls.name}
                </option>
              ))}
            </select>
          </div>

          {selectedClass && students.length > 0 && (
            <div className="flex gap-2 w-full md:w-auto">
              <button
                type="button"
                onClick={() => markAll("present")}
                className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex-1 md:flex-initial"
              >
                Mark All Present ✓
              </button>
              <button
                type="button"
                onClick={() => markAll("absent")}
                className="bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex-1 md:flex-initial"
              >
                Mark All Absent ✗
              </button>
            </div>
          )}
        </div>

        {/* ATTENDANCE TABLE */}
        {selectedClass && (
          <div className="bg-[#1E293B]/70 backdrop-blur-xl border border-slate-700/60 rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-700/60 flex justify-between items-center bg-slate-800/50 flex-wrap gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">Student Roster Roll List</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Click status buttons to toggle student attendance
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-bold">
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full">
                  Present: {presentCount}
                </span>
                <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-1 rounded-full">
                  Absent: {absentCount}
                </span>
                <span className="text-slate-400 uppercase">Total: {students.length}</span>
              </div>
            </div>

            {loading ? (
              <div className="p-6">
                <TableSkeleton rows={4} cols={3} />
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
                      <tr className="border-b border-slate-700/60 text-slate-400 text-xs uppercase tracking-wider bg-slate-900/40">
                        <th className="p-5">Roll No</th>
                        <th className="p-5">Student Full Name</th>
                        <th className="p-5 text-center">Current Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {students.map((student) => {
                        const isPresent = attendanceStatus[student.id] === "present";
                        return (
                          <tr key={student.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="p-5 font-mono text-slate-400 font-bold">
                              {student.roll_number || "N/A"}
                            </td>
                            <td className="p-5 font-bold text-white text-base">{student.name}</td>
                            <td className="p-5 text-center">
                              <button
                                onClick={() => toggleStatus(student.id)}
                                className={`px-6 py-2 rounded-xl font-extrabold text-sm transition-all shadow-md ${
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

                <div className="p-6 bg-slate-800/40 border-t border-slate-700/60 flex justify-between items-center flex-wrap gap-4">
                  <p className="text-xs text-slate-400">
                    Changes are recorded in the central institutional attendance ledger.
                  </p>
                  <button
                    onClick={handleSaveAttendance}
                    disabled={saving}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-8 py-3.5 rounded-xl shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
                  >
                    {saving ? "Synchronizing to Database..." : "Save Attendance Register 🚀"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}