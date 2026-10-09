import { createContext, useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("erp_user");
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    localStorage.setItem("erp_user", JSON.stringify(user));
  }, [user]);

  const login = (userData) => setUser(userData);
  const logout = () => setUser(null);

  // --- CLOUD STATES ---
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [fees, setFees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [notices, setNotices] = useState([]); // 📢 NEW: Notices State

  useEffect(() => {
    if (user && user.school_id) {
      fetchAllData();
    }
  }, [user]);

  const fetchAllData = async () => {
    const schoolId = user.school_id;
    
    const [
      { data: classesData }, { data: studentsData }, { data: feesData },
      { data: attendanceData }, { data: timetableData }, { data: noticesData }
    ] = await Promise.all([
      supabase.from("classes").select("*").eq("school_id", schoolId),
      supabase.from("students").select("*").eq("school_id", schoolId),
      supabase.from("fees").select("*").eq("school_id", schoolId),
      supabase.from("attendance").select("*").eq("school_id", schoolId),
      supabase.from("timetable").select("*").eq("school_id", schoolId),
      supabase.from("notices").select("*").eq("school_id", schoolId).order("date", { ascending: false }) // Fetches newest first!
    ]);

    if (classesData) setClasses(classesData);
    if (studentsData) setStudents(studentsData);
    if (feesData) setFees(feesData);
    if (attendanceData) setAttendance(attendanceData);
    if (timetableData) setTimetable(timetableData);
    if (noticesData) setNotices(noticesData); // Store notices
  };

  // --- EXISTING FUNCTIONS ---
  const addClass = async (newClass) => { /* ... existing ... */ 
    const payload = { school_id: user.school_id, grade: String(newClass.grade || ""), section: String(newClass.section || ""), name: String(newClass.name || `${newClass.grade} ${newClass.section}`) };
    const { data, error } = await supabase.from("classes").insert([payload]).select();
    if (!error && data) setClasses((prev) => [...prev, data[0]]);
  };

  const addStudent = async (newStudent) => {
    const payload = { school_id: user.school_id, name: String(newStudent.name || ""), roll_number: String(newStudent.roll_number || ""), class_id: newStudent.class_id || null };
    const { data, error } = await supabase.from("students").insert([payload]).select();
    if (!error && data) setStudents((prev) => [...prev, data[0]]);
  };

  const deleteStudent = async (id) => {
    const { error } = await supabase.from("students").delete().eq("id", id);
    if (!error) setStudents((prev) => prev.filter((s) => s.id !== id));
  };

  const updateFees = async (feeRecord) => {
    const payload = { school_id: user.school_id, student_id: feeRecord.student_id || null, amount: parseFloat(feeRecord.amount || 0), status: String(feeRecord.status || "pending"), date: String(feeRecord.date || new Date().toISOString().split('T')[0]) };
    const { data, error } = await supabase.from("fees").insert([payload]).select();
    if (!error && data) setFees((prev) => [...prev, data[0]]);
  };

  const markAttendance = async (date, classId, records) => {
    const payload = { school_id: user.school_id, class_id: classId, date: date, records: records };
    await supabase.from("attendance").delete().match({ class_id: classId, date: date });
    const { data, error } = await supabase.from("attendance").insert([payload]).select();
    if (!error && data) setAttendance((prev) => { const filtered = prev.filter((a) => !(a.date === date && a.class_id === classId)); return [...filtered, data[0]]; });
  };

  const addTimetableEntry = async (entry) => {
    const payload = { school_id: user.school_id, class_id: entry.class_id || null, day: String(entry.day || ""), subject: String(entry.subject || ""), start_time: String(entry.start_time || ""), end_time: String(entry.end_time || "") };
    const { data, error } = await supabase.from("timetable").insert([payload]).select();
    if (!error && data) setTimetable((prev) => [...prev, data[0]]);
  };

  // 📢 --- NEW: NOTICES FUNCTION ---
  const addNotice = async (notice) => {
    const payload = {
      school_id: user.school_id,
      title: notice.title,
      message: notice.message,
      date: new Date().toISOString()
    };
    const { data, error } = await supabase.from("notices").insert([payload]).select();
    if (!error && data) {
      setNotices((prev) => [data[0], ...prev]); // Add to top of list
      alert("✅ Notice Broadcasted to all Students!");
    } else {
      alert("❌ Error posting notice.");
    }
  };

  const deleteNotice = async (id) => {
    const { error } = await supabase.from("notices").delete().eq("id", id);
    if (!error) setNotices((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <AppContext.Provider
      value={{
        user, login, logout,
        classes, addClass,
        students, addStudent, deleteStudent,
        fees, updateFees,
        attendance, markAttendance,
        timetable, addTimetableEntry,
        notices, addNotice, deleteNotice // 📢 Exported here!
      }}
    >
      {children}
    </AppContext.Provider>
  );
};