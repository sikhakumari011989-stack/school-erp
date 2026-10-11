import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { supabase } from "../supabaseClient";

export default function TeacherAttendance() {
  const { user } = useContext(AppContext);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState([]);
  const [attendanceStatus, setAttendanceStatus] = useState({}); // { studentId: 'present'/'absent' }
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch classes on load
  useEffect(() => {
    const fetchClasses = async () => {
      const { data } = await supabase.from("classes").select("*");
      if (data) setClasses(data);
    };
    fetchClasses();
  }, []);

  // Fetch students whenever a class is selected
  useEffect(() => {
    if (!selectedClass) {
      setStudents([]);
      return;
    }

    const fetchStudents = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("class_id", selectedClass);

      if (data) {
        setStudents(data);
        // Default everyone to 'present'
        const initialStatus = {};
        data.forEach(s => {
          initialStatus[s.id] = 'present';
        });
        setAttendanceStatus(initialStatus);
      }
      setLoading(false);
    };

    fetchStudents();
  }, [selectedClass]);

  const toggleStatus = (studentId) => {
    setAttendanceStatus(prev => ({
      ...prev,
      [studentId]: prev[studentId] === 'present' ? 'absent' : 'present'
    }));
  };

  const handleSaveAttendance = async () => {
    if (students.length === 0) return;
    setSaving(true);

    const today = new Date().toISOString().split('T')[0];

    try {
      // Map state into insertable rows
      const records = students.map(student => ({
        school_id: user?.school_id || "school-demo-01",
        class_id: selectedClass,
        student_id: student.id,
        date: today,
        status: attendanceStatus[student.id] || 'present'
      }));

      // Insert attendance records
      const { error } = await supabase.from("attendance").insert(records);
      if (error) throw error;

      alert("Attendance register saved successfully!");
    } catch (err) {
      console.error("Error saving attendance:", err);
      alert("Failed to save attendance records.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative text-slate-200 min-h-full pb-10">
      <div className="fixed top-0 right-10 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <p className="text-emerald-300 text-sm font-semibold mb-1 uppercase tracking-widest">Faculty Operations</p>
            <h1 className="text-3xl font-extrabold text-white">Mark Attendance ✅</h1>
          </div>
          <div>
            <span className="bg-slate-800 border border-slate-700 text-slate-300 px-4 py-2 rounded-xl text-sm font-bold">
              Date: {new Date().toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* CLASS SELECTOR CARD */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl mb-8">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Select Target Class</label>
          <select 
            className="w-full md:w-1/3 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 font-bold"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            <option value="">-- Choose Class --</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>Class {cls.name}</option>
            ))}
          </select>
        </div>

        {/* ATTENDANCE TABLE */}
        {selectedClass && (
          <div className="bg-[#1E293B] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
              <h2 className="text-lg font-bold text-white">Student Roll List</h2>
              <span className="text-xs text-slate-400 font-bold uppercase">Total Students: {students.length}</span>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-400">Loading students from database...</div>
            ) : students.length === 0 ? (
              <div className="p-12 text-center text-slate-400">No students found in this class. Add students via Super Admin first.</div>
            ) : (
              <div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
                      <th className="p-5">Roll No</th>
                      <th className="p-5">Student Name</th>
                      <th className="p-5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {students.map((student) => {
                      const isPresent = attendanceStatus[student.id] === 'present';
                      return (
                        <tr key={student.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="p-5 font-mono text-slate-400 font-bold">{student.roll_number || "N/A"}</td>
                          <td className="p-5 font-bold text-white text-base">{student.name}</td>
                          <td className="p-5 text-center">
                            <button
                              onClick={() => toggleStatus(student.id)}
                              className={`px-6 py-2 rounded-xl font-extrabold text-sm transition-all shadow-md ${
                                isPresent 
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30' 
                                  : 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30'
                              }`}
                            >
                              {isPresent ? 'PRESENT ✓' : 'ABSENT ✗'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="p-6 bg-slate-800/50 border-t border-slate-700 flex justify-end">
                  <button
                    onClick={handleSaveAttendance}
                    disabled={saving}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-8 py-3 rounded-xl shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
                  >
                    {saving ? "Saving Register..." : "Submit Attendance Register"}
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