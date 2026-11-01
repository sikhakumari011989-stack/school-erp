import { supabase } from "../supabaseClient";
import { logSecurityAction } from "./auditLogger";

/**
 * EXAMINATION CONTROL & ASSESSMENT ENGINE
 * Grade scale calculations (CBSE 9-Point & GPA), Marks Moderation,
 * Hall Seating Plans, and Result Finalization Protection.
 */

export const GRADING_SCALES = {
  CBSE_9_POINT: [
    { grade: "A1", minPct: 91, maxPct: 100, point: 10.0, remark: "Outstanding" },
    { grade: "A2", minPct: 81, maxPct: 90, point: 9.0, remark: "Excellent" },
    { grade: "B1", minPct: 71, maxPct: 80, point: 8.0, remark: "Very Good" },
    { grade: "B2", minPct: 61, maxPct: 70, point: 7.0, remark: "Good" },
    { grade: "C1", minPct: 51, maxPct: 60, point: 6.0, remark: "Satisfactory" },
    { grade: "C2", minPct: 41, maxPct: 50, point: 5.0, remark: "Acceptable" },
    { grade: "D", minPct: 33, maxPct: 40, point: 4.0, remark: "Marginal Pass" },
    { grade: "E", minPct: 0, maxPct: 32, point: 0.0, remark: "Essential Repeat / Needs Improvement" },
  ],
};

/**
 * Calculates letter grade based on percentage marks
 */
export function calculateGrade(marksObtained, maxMarks = 100) {
  const num = Number(marksObtained) || 0;
  const max = Number(maxMarks) || 100;
  const pct = Math.round((num / max) * 100);

  const scale = GRADING_SCALES.CBSE_9_POINT;
  const match = scale.find((s) => pct >= s.minPct && pct <= s.maxPct);
  return match || { grade: "E", point: 0.0, remark: "Needs Improvement" };
}

/**
 * Validates marks entry: prevents negative or over-the-ceiling scores
 */
export function validateMarksEntry(marks, maxMarks = 100) {
  const m = Number(marks);
  const max = Number(maxMarks);

  if (isNaN(m)) throw new Error("Marks must be a valid numeric quantity.");
  if (m < 0) throw new Error("Marks cannot be negative.");
  if (m > max) throw new Error(`Marks entered (${m}) exceed maximum allowable score (${max}).`);
  return true;
}

export const DEFAULT_EXAM_SESSIONS = [
  {
    id: "sess_term1",
    session_name: "Term 1 Mid-Term Assessments 2026-27",
    academic_year: "2026-2027",
    start_date: "2026-11-15",
    end_date: "2026-11-28",
    grading_scale: "CBSE_9_POINT",
    status: "published",
    published_by: "Academic Principal",
    schedules: [
      {
        id: "sch_1",
        subject: "Mathematics",
        class_name: "Class 10-ICSE",
        exam_date: "2026-11-15",
        start_time: "09:00 AM",
        end_time: "12:00 PM",
        max_marks: 100,
        passing_marks: 35,
        room: "Exam Hall A",
        invigilator_name: "Prof. Ananya Sen",
      },
      {
        id: "sch_2",
        subject: "Physics",
        class_name: "Class 10-ICSE",
        exam_date: "2026-11-18",
        start_time: "09:00 AM",
        end_time: "12:00 PM",
        max_marks: 100,
        passing_marks: 35,
        room: "Exam Hall A",
        invigilator_name: "Prof. S. R. Sharma",
      },
      {
        id: "sch_3",
        subject: "Chemistry",
        class_name: "Class 10-ICSE",
        exam_date: "2026-11-21",
        start_time: "09:00 AM",
        end_time: "12:00 PM",
        max_marks: 100,
        passing_marks: 35,
        room: "Exam Hall B",
        invigilator_name: "Dr. V. K. Raman",
      },
    ],
  },
];

export const DEFAULT_EXAM_RESULTS = [
  {
    id: "res_1",
    student_id: "STU-101",
    student_name: "Aarav Mehta",
    class_name: "Class 10-ICSE",
    subject: "Mathematics",
    marks_obtained: 88,
    moderation_marks: 0,
    final_marks: 88,
    grade: "A2",
    is_finalized: true,
  },
  {
    id: "res_2",
    student_id: "STU-108",
    student_name: "Aman Verma",
    class_name: "Class 10-ICSE",
    subject: "Mathematics",
    marks_obtained: 38,
    moderation_marks: 2,
    final_marks: 40,
    grade: "D",
    is_finalized: true,
  },
  {
    id: "res_3",
    student_id: "STU-114",
    student_name: "Riya Sen",
    class_name: "Class 10-ICSE",
    subject: "Mathematics",
    marks_obtained: 74,
    moderation_marks: 0,
    final_marks: 74,
    grade: "B1",
    is_finalized: true,
  },
];

/**
 * Locks results and publishes to student portal
 */
export async function finalizeAndPublishSession({ sessionId, schoolId, user }) {
  const cleanSchool = (schoolId || "CAMPUS-01").trim().toUpperCase();

  if (supabase) {
    try {
      await supabase
        .from("exam_sessions")
        .update({
          status: "published",
          published_by: user?.name || "Exam Controller",
          published_at: new Date().toISOString(),
        })
        .eq("id", sessionId)
        .eq("school_id", cleanSchool);

      await supabase
        .from("exam_results")
        .update({ is_finalized: true })
        .eq("school_id", cleanSchool);
    } catch (e) {
      console.warn("[ExamEngine] Supabase publish notice:", e);
    }
  }

  logSecurityAction({
    action: `Exam Results Published: ${sessionId}`,
    entityType: "EXAMINATION",
    entityId: sessionId,
    details: `Official term examination results finalized and published to student dashboards.`,
    user,
    schoolId: cleanSchool,
  });

  return { success: true };
}

