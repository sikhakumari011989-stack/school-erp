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

  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [fees, setFees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [notices, setNotices] = useState([]);
  const [marks, setMarks] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [homework, setHomework] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (user && user.school_id) {
      fetchAllData();
    }
  }, [user]);

  const fetchAllData = async () => {
    const schoolId = user.school_id;
    
    const [
      { data: classesData }, 
      { data: studentsData }, 
      { data: feesData },
      { data: attendanceData }, 
      { data: timetableData }, 
      { data: noticesData },
      { data: marksData },
      { data: teachersData },
      { data: leavesData },
      { data: homeworkData },
      { data: notificationsData }
    ] = await Promise.all([
      supabase.from("classes").select("*").eq("school_id", schoolId),
      supabase.from("students").select("*").eq("school_id", schoolId),
      supabase.from("fees").select("*").eq("school_id", schoolId),
      supabase.from("attendance").select("*").eq("school_id", schoolId),
      supabase.from("timetable").select("*").eq("school_id", schoolId),
      supabase.from("notices").select("*").eq("school_id", schoolId).order("date", { ascending: false }),
      supabase.from("marks").select("*").eq("school_id", schoolId),
      supabase.from("teachers").select("*").eq("school_id", schoolId),
      supabase.from("leaves").select("*").eq("school_id", schoolId),
      supabase.from("homework").select("*").eq("school_id", schoolId).order("created_at", { ascending: false }),
      supabase.from("notifications").select("*").eq("school_id", schoolId).order("created_at", { ascending: false })
    ]);

    if (classesData) setClasses(classesData);
    if (studentsData) setStudents(studentsData);
    if (feesData) setFees(feesData);
    if (attendanceData) setAttendance(attendanceData);
    if (timetableData) setTimetable(timetableData);
    if (noticesData) setNotices(noticesData);
    if (marksData) setMarks(marksData);
    if (teachersData) setTeachers(teachersData);
    if (leavesData) setLeaves(leavesData);
    if (homeworkData) setHomework(homeworkData);
    if (notificationsData) setNotifications(notificationsData);
  };

  const addClass = async (newClass) => {
    const payload = { 
      school_id: user.school_id, 
      grade: String(newClass.grade || ""), 
      section: String(newClass.section || ""), 
      name: String(newClass.name || `${newClass.grade} ${newClass.section}`) 
    };
    const { data, error } = await supabase.from("classes").insert([payload]).select();
    if (!error && data) setClasses((prev) => [...prev, data[0]]);
  };

  const addStudent = async (newStudent) => {
    const payload = { 
      school_id: user.school_id, 
      name: String(newStudent.name || ""), 
      roll_number: String(newStudent.roll_number || ""), 
      class_id: newStudent.class_id || null 
    };
    const { data, error } = await supabase.from("students").insert([payload]).select();
    if (!error && data) setStudents((prev) => [...prev, data[0]]);
  };

  const deleteStudent = async (id) => {
    const { error } = await supabase.from("students").delete().eq("id", id);
    if (!error) setStudents((prev) => prev.filter((s) => s.id !== id));
  };

  const updateFees = async (feeRecord) => {
    const payload = { 
      school_id: user.school_id, 
      student_id: feeRecord.student_id || null, 
      amount: parseFloat(feeRecord.amount || 0), 
      status: String(feeRecord.status || "pending"), 
      date: String(feeRecord.date || new Date().toISOString().split('T')[0]) 
    };
    const { data, error } = await supabase.from("fees").insert([payload]).select();
    if (!error && data) setFees((prev) => [...prev, data[0]]);
  };

  const getFeeReport = (startDate, endDate, classId = null) => {
    let filtered = fees.filter(f => {
      const feeDate = new Date(f.date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return feeDate >= start && feeDate <= end;
    });
    
    if (classId) {
      filtered = filtered.filter(f => {
        const student = students.find(s => s.id === f.student_id);
        return student && student.class_id === classId;
      });
    }

    return {
      total_fees: filtered.reduce((sum, f) => sum + parseFloat(f.amount || 0), 0),
      collected: filtered.filter(f => f.status === "paid").reduce((sum, f) => sum + parseFloat(f.amount || 0), 0),
      pending: filtered.filter(f => f.status === "pending").reduce((sum, f) => sum + parseFloat(f.amount || 0), 0),
      count: filtered.length,
      records: filtered
    };
  };

  const markAttendance = async (date, classId, records) => {
    const payload = { 
      school_id: user.school_id, 
      class_id: classId, 
      date: date, 
      records: records 
    };
    await supabase.from("attendance").delete().match({ class_id: classId, date: date });
    const { data, error } = await supabase.from("attendance").insert([payload]).select();
    if (!error && data) {
      const filtered = attendance.filter((a) => !(a.date === date && a.class_id === classId));
      setAttendance([...filtered, data[0]]);
    }
  };

  const getAttendanceReport = (startDate, endDate, classId = null) => {
    let filtered = attendance.filter(a => {
      const attDate = new Date(a.date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return attDate >= start && attDate <= end;
    });

    if (classId) {
      filtered = filtered.filter(a => a.class_id === classId);
    }

    const total = filtered.length;
    const present = filtered.filter(a => a.records && JSON.parse(a.records).filter(r => r.status === "present").length).length;
    const absent = total - present;

    return {
      total_days: [...new Set(filtered.map(a => a.date))].length,
      total_records: total,
      present,
      absent,
      percentage: total > 0 ? ((present / total) * 100).toFixed(2) : 0,
      records: filtered
    };
  };

  const addTimetableEntry = async (entry) => {
    const payload = { 
      school_id: user.school_id, 
      class_id: entry.class_id || null, 
      day: String(entry.day || ""), 
      subject: String(entry.subject || ""), 
      start_time: String(entry.start_time || ""), 
      end_time: String(entry.end_time || "") 
    };
    const { data, error } = await supabase.from("timetable").insert([payload]).select();
    if (!error && data) setTimetable((prev) => [...prev, data[0]]);
  };

  const addNotice = async (notice) => {
    const payload = {
      school_id: user.school_id,
      title: notice.title,
      message: notice.message,
      date: new Date().toISOString()
    };
    const { data, error } = await supabase.from("notices").insert([payload]).select();
    if (!error && data) {
      setNotices((prev) => [data[0], ...prev]);
      alert("✅ Notice Broadcasted!");
    }
  };

  const deleteNotice = async (id) => {
    const { error } = await supabase.from("notices").delete().eq("id", id);
    if (!error) setNotices((prev) => prev.filter((n) => n.id !== id));
  };

  const enterMarks = async (mark) => {
    const payload = {
      school_id: user.school_id,
      student_id: mark.student_id,
      subject: mark.subject,
      exam_type: mark.exam_type || "unit-test",
      marks_obtained: parseFloat(mark.marks_obtained || 0),
      total_marks: parseFloat(mark.total_marks || 100),
      percentage: ((parseFloat(mark.marks_obtained || 0) / parseFloat(mark.total_marks || 100)) * 100).toFixed(2),
      grade: mark.grade || "N/A",
      teacher_id: user.id,
      date: new Date().toISOString()
    };
    const { data, error } = await supabase.from("marks").insert([payload]).select();
    if (!error && data) setMarks((prev) => [...prev, data[0]]);
  };

  const getStudentMarks = (studentId) => {
    return marks.filter((m) => m.student_id === studentId);
  };

  const getReportCard = (studentId) => {
    const studentMarks = marks.filter((m) => m.student_id === studentId);
    if (studentMarks.length === 0) return null;
    return {
      student_id: studentId,
      total_subjects: [...new Set(studentMarks.map((m) => m.subject))].length,
      average_percentage: (
        studentMarks.reduce((sum, m) => sum + parseFloat(m.percentage), 0) / studentMarks.length
      ).toFixed(2),
      marks: studentMarks
    };
  };

  const getMarksReport = (classId = null, examType = null) => {
    let filtered = marks;

    if (classId) {
      const classStudents = students.filter(s => s.class_id === classId).map(s => s.id);
      filtered = filtered.filter(m => classStudents.includes(m.student_id));
    }

    if (examType) {
      filtered = filtered.filter(m => m.exam_type === examType);
    }

    const subjects = [...new Set(filtered.map(m => m.subject))];
    const averageBySubject = {};

    subjects.forEach(subject => {
      const subjectMarks = filtered.filter(m => m.subject === subject);
      averageBySubject[subject] = (
        subjectMarks.reduce((sum, m) => sum + parseFloat(m.percentage), 0) / subjectMarks.length
      ).toFixed(2);
    });

    return {
      total_students: [...new Set(filtered.map(m => m.student_id))].length,
      total_marks: filtered.length,
      class_average: (
        filtered.reduce((sum, m) => sum + parseFloat(m.percentage), 0) / filtered.length
      ).toFixed(2),
      by_subject: averageBySubject,
      records: filtered
    };
  };

  const addTeacher = async (teacher) => {
    const payload = {
      school_id: user.school_id,
      name: teacher.name,
      email: teacher.email,
      phone: teacher.phone || "",
      subject: teacher.subject || "",
      is_active: true,
      date_added: new Date().toISOString()
    };
    const { data, error } = await supabase.from("teachers").insert([payload]).select();
    if (!error && data) setTeachers((prev) => [...prev, data[0]]);
  };

  const deleteTeacher = async (teacherId) => {
    const { error } = await supabase.from("teachers").delete().eq("id", teacherId);
    if (!error) setTeachers((prev) => prev.filter((t) => t.id !== teacherId));
  };

  const applyLeave = async (leave) => {
    const payload = {
      school_id: user.school_id,
      user_id: leave.user_id || user.id,
      from_date: leave.from_date,
      to_date: leave.to_date,
      reason: leave.reason,
      status: "pending",
      date_applied: new Date().toISOString()
    };
    const { data, error } = await supabase.from("leaves").insert([payload]).select();
    if (!error && data) setLeaves((prev) => [...prev, data[0]]);
  };

  const approveLeave = async (leaveId) => {
    const { error } = await supabase.from("leaves").update({ status: "approved" }).eq("id", leaveId);
    if (!error) setLeaves((prev) => prev.map((l) => l.id === leaveId ? { ...l, status: "approved" } : l));
  };

  const rejectLeave = async (leaveId) => {
    const { error } = await supabase.from("leaves").update({ status: "rejected" }).eq("id", leaveId);
    if (!error) setLeaves((prev) => prev.map((l) => l.id === leaveId ? { ...l, status: "rejected" } : l));
  };

  // ===== NOTIFICATIONS FIRST (BEFORE HOMEWORK) =====
  const sendNotification = async (title, message, type = "general") => {
    const payload = {
      school_id: user.school_id,
      title: title,
      message: message,
      type: type,
      created_at: new Date().toISOString()
    };
    const { data, error } = await supabase.from("notifications").insert([payload]).select();
    if (!error && data) {
      setNotifications((prev) => [data[0], ...prev]);
    }
  };

  const sendEmailNotification = async (recipientEmail, subject, body) => {
    const payload = {
      school_id: user.school_id,
      recipient_email: recipientEmail,
      subject: subject,
      body: body,
      status: "pending",
      created_at: new Date().toISOString()
    };
    const { data, error } = await supabase.from("email_notifications").insert([payload]).select();
    if (!error && data) {
      console.log("📧 Email:", recipientEmail);
      return data[0];
    }
  };

  const sendSMSNotification = async (recipientPhone, message) => {
    const payload = {
      school_id: user.school_id,
      recipient_phone: recipientPhone,
      message: message,
      status: "pending",
      created_at: new Date().toISOString()
    };
    const { data, error } = await supabase.from("sms_notifications").insert([payload]).select();
    if (!error && data) {
      console.log("📱 SMS:", recipientPhone);
      return data[0];
    }
  };

  const getNotifications = (limit = 10) => {
    return notifications.slice(0, limit);
  };

  const markNotificationAsRead = async (notificationId) => {
    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId);
    if (!error) {
      setNotifications((prev) => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
    }
  };

  // ===== HOMEWORK (AFTER NOTIFICATIONS) =====
  const uploadHomework = async (hw) => {
    const payload = {
      school_id: user.school_id,
      class_id: hw.class_id,
      subject: hw.subject,
      title: hw.title,
      description: hw.description,
      due_date: hw.due_date,
      file_url: hw.file_url || "",
      teacher_id: user.id,
      created_at: new Date().toISOString()
    };
    const { data, error } = await supabase.from("homework").insert([payload]).select();
    if (!error && data) {
      setHomework((prev) => [data[0], ...prev]);
      sendNotification("Homework", `New homework: ${hw.title}`, "homework");
    }
  };

  const getClassHomework = (classId) => {
    return homework.filter(h => h.class_id === classId);
  };

  const deleteHomework = async (homeworkId) => {
    const { error } = await supabase.from("homework").delete().eq("id", homeworkId);
    if (!error) setHomework((prev) => prev.filter(h => h.id !== homeworkId));
  };

  // ===== ANALYTICS =====
  const generateFullReport = (startDate, endDate) => {
    return {
      period: `${startDate} to ${endDate}`,
      attendance: getAttendanceReport(startDate, endDate),
      fees: getFeeReport(startDate, endDate),
      marks: getMarksReport(),
      total_students: students.length,
      total_teachers: teachers.length,
      total_classes: classes.length,
      generated_at: new Date().toISOString()
    };
  };

  const getSchoolAnalytics = () => {
    return {
      total_students: students.length,
      total_teachers: teachers.length,
      total_classes: classes.length,
      total_fees_collected: fees.filter(f => f.status === "paid").reduce((sum, f) => sum + parseFloat(f.amount || 0), 0),
      pending_fees: fees.filter(f => f.status === "pending").reduce((sum, f) => sum + parseFloat(f.amount || 0), 0),
      average_attendance: attendance.length > 0 ? (
        attendance.filter(a => a.records && JSON.parse(a.records).some(r => r.status === "present")).length / attendance.length * 100
      ).toFixed(2) : 0,
      total_homework_assigned: homework.length,
      pending_leaves: leaves.filter(l => l.status === "pending").length
    };
  };

  return (
    <AppContext.Provider
      value={{
        user, login, logout,
        classes, addClass,
        students, addStudent, deleteStudent,
        fees, updateFees, getFeeReport,
        attendance, markAttendance, getAttendanceReport,
        timetable, addTimetableEntry,
        notices, addNotice, deleteNotice,
        marks, enterMarks, getStudentMarks, getReportCard, getMarksReport,
        teachers, addTeacher, deleteTeacher,
        leaves, applyLeave, approveLeave, rejectLeave,
        homework, uploadHomework, getClassHomework, deleteHomework,
        notifications, sendNotification, sendEmailNotification, sendSMSNotification, getNotifications, markNotificationAsRead,
        generateFullReport, getSchoolAnalytics
      }}
    >
      {children}
    </AppContext.Provider>
  );
};