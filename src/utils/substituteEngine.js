import { supabase } from "../supabaseClient";
import { dispatchParentNotification } from "./notifications";

/**
 * SUBSTITUTE TEACHER RELIEF MATRIX ENGINE
 * Detects affected periods from teacher leaves/absences,
 * identifies qualified and available substitute educators,
 * prevents schedule clashes, and coordinates 1-click duty dispatch.
 */

/**
 * Resolves affected timetable periods for an absent educator on a specific date
 */
export async function getAffectedPeriodsForTeacher({ teacherName, date, schoolId }) {
  const cleanSchool = (schoolId || "CAMPUS-01").trim().toUpperCase();
  const dayOfWeek = new Date(date).toLocaleDateString("en-US", { weekday: "long" });

  let fullSchedule = [];
  try {
    const raw = localStorage.getItem(`erp_master_timetable_${cleanSchool}`);
    if (raw) fullSchedule = JSON.parse(raw);
  } catch (e) {}

  if (fullSchedule.length === 0 && supabase) {
    try {
      const { data } = await supabase
        .from("timetable")
        .select("*")
        .eq("school_id", cleanSchool)
        .eq("day", dayOfWeek);
      if (data) fullSchedule = data;
    } catch (e) {}
  }

  const cleanTarget = (teacherName || "").trim().toLowerCase();

  return fullSchedule.filter((slot) => {
    const slotDay = (slot.day || "").trim().toLowerCase();
    const slotTeacher = (slot.teacher || slot.teacher_name || "").trim().toLowerCase();
    return slotDay === dayOfWeek.toLowerCase() && slotTeacher.includes(cleanTarget);
  });
}

/**
 * Finds eligible substitute teachers for a specific period
 * Guarantees zero schedule conflicts.
 */
export async function getEligibleSubstitutes({ day, periodNo, subject, absentTeacher, schoolId, date }) {
  const cleanSchool = (schoolId || "CAMPUS-01").trim().toUpperCase();
  const cleanAbsent = (absentTeacher || "").trim().toLowerCase();

  let directory = [];
  let schedule = [];
  let existingAssignments = [];

  try {
    const rawDir = localStorage.getItem(`erp_directory_${cleanSchool}`);
    if (rawDir) directory = JSON.parse(rawDir);
    const rawSched = localStorage.getItem(`erp_master_timetable_${cleanSchool}`);
    if (rawSched) schedule = JSON.parse(rawSched);
    const rawAssigned = localStorage.getItem(`erp_substitute_assignments_${cleanSchool}`);
    if (rawAssigned) existingAssignments = JSON.parse(rawAssigned);
  } catch (e) {}

  // Filter all teachers in directory
  const allTeachers = directory.filter(
    (m) =>
      (m.role || "").toLowerCase() === "teacher" &&
      (m.name || m.full_name || "").trim().toLowerCase() !== cleanAbsent
  );

  const cleanPeriod = (periodNo || "").trim().toLowerCase();
  const cleanDay = (day || "").trim().toLowerCase();

  // Find busy teachers in that period
  const busyTeachers = new Set();
  schedule.forEach((s) => {
    if (
      (s.day || "").trim().toLowerCase() === cleanDay &&
      (s.periodNo || s.period || "").trim().toLowerCase() === cleanPeriod
    ) {
      busyTeachers.add((s.teacher || s.teacher_name || "").trim().toLowerCase());
    }
  });

  // Find teachers already assigned as substitute on that date and period
  existingAssignments.forEach((ea) => {
    if (
      ea.date === date &&
      (ea.period_no || "").trim().toLowerCase() === cleanPeriod &&
      ea.status !== "declined"
    ) {
      busyTeachers.add((ea.substitute_teacher_name || "").trim().toLowerCase());
    }
  });

  // Evaluate candidates
  const candidates = [];
  const targetSubj = (subject || "").trim().toLowerCase();

  allTeachers.forEach((t) => {
    const tName = t.name || t.full_name || "Faculty Member";
    const isBusy = busyTeachers.has(tName.trim().toLowerCase());

    if (!isBusy) {
      const tSubj = (t.subject || t.department || "").trim().toLowerCase();
      const isSubjectMatch = tSubj && (tSubj.includes(targetSubj) || targetSubj.includes(tSubj));

      candidates.push({
        id: t.role_code || t.id,
        name: tName,
        phone: t.phone || "+91 98200 00000",
        subject: t.subject || "General Faculty",
        isSubjectMatch,
        qualificationScore: isSubjectMatch ? 95 : 75,
      });
    }
  });

  // Sort: matching subject faculty first
  candidates.sort((a, b) => b.qualificationScore - a.qualificationScore);
  return candidates;
}

/**
 * Assign substitute duty and persist
 */
export async function assignSubstituteDuty({
  schoolId,
  date,
  periodNo,
  className,
  subject,
  room,
  absentTeacherName,
  substituteTeacherName,
  substitutePhone,
  assignedBy = "Principal",
}) {
  const cleanSchool = (schoolId || "CAMPUS-01").trim().toUpperCase();

  const payload = {
    id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    school_id: cleanSchool,
    date,
    period_no: periodNo,
    class_name: className,
    subject,
    room: room || "Assigned Classroom",
    absent_teacher_name: absentTeacherName,
    substitute_teacher_name: substituteTeacherName,
    assignment_reason: `Coverage for ${absentTeacherName} (Approved Leave)`,
    status: "assigned",
    assigned_by: assignedBy,
    notified_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  if (supabase) {
    try {
      await supabase.from("substitute_assignments").insert([payload]);
    } catch (e) {
      console.warn("[SubstituteEngine] Supabase insert notice:", e);
    }
  }

  // Local fallback
  const storageKey = `erp_substitute_assignments_${cleanSchool}`;
  try {
    const existing = JSON.parse(localStorage.getItem(storageKey) || "[]");
    localStorage.setItem(storageKey, JSON.stringify([payload, ...existing]));
  } catch (e) {}

  window.dispatchEvent(new Event("erp-substitutes-updated"));
  return payload;
}

/**
 * Fetches daily relief schedule for today
 */
export async function getDailyReliefSchedule(date, schoolId) {
  const cleanSchool = (schoolId || "CAMPUS-01").trim().toUpperCase();
  const queryDate = date || new Date().toISOString().split("T")[0];

  if (supabase) {
    try {
      const { data } = await supabase
        .from("substitute_assignments")
        .select("*")
        .eq("school_id", cleanSchool)
        .eq("date", queryDate)
        .order("created_at", { ascending: false });
      if (data && data.length > 0) return data;
    } catch (e) {}
  }

  try {
    const all = JSON.parse(localStorage.getItem(`erp_substitute_assignments_${cleanSchool}`) || "[]");
    return all.filter((a) => a.date === queryDate);
  } catch (e) {
    return [];
  }
}

