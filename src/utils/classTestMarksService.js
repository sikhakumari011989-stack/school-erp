import { supabase } from "../supabaseClient.js";

/**
 * CLASS TEST MARKS SERVICE
 * Enterprise-grade marks entry, validation, publication workflow,
 * and leak-proof private student marks evaluation.
 */

// Canonical Roles with faculty grading permissions
export const GRADING_ROLES = ["TCH", "PRIN", "HOD", "teacher", "principal", "trustee", "admin", "super_admin"];

/**
 * Validates marks entry: rejects negative values and marks above ceiling
 */
export function validateMarksInput(marks, maxScore = 20) {
  if (marks === "" || marks === null || marks === undefined) {
    throw new Error("Marks input is required.");
  }
  const num = Number(marks);
  const max = Number(maxScore);

  if (isNaN(num)) {
    throw new Error("Marks must be a valid number.");
  }
  if (num < 0) {
    throw new Error("Marks cannot be negative.");
  }
  if (num > max) {
    throw new Error(`Marks entered (${num}) exceed maximum allowable score (${max}).`);
  }
  return num;
}

/**
 * Verifies if an actor is authorized to grade or modify a class test
 */
export function isTeacherAuthorizedForClass(actor, classId) {
  if (!actor) return false;
  const role = (actor.role || actor.role_code || "").toUpperCase();

  // Executives and administrators have institutional oversight
  if (["PRIN", "HOD", "ADMIN", "SUPER_ADMIN", "PRINCIPAL", "TRUSTEE"].some((r) => role.includes(r))) {
    return true;
  }

  // Teacher role check
  if (!role.includes("TCH") && !role.includes("TEACHER") && !role.includes("FAC")) {
    return false;
  }

  // If no explicit class specified or target class is empty
  if (!classId) return true;

  const target = String(classId).trim().toLowerCase();

  // Check teacher's assigned classes
  if (actor.assigned_classes) {
    const list = Array.isArray(actor.assigned_classes)
      ? actor.assigned_classes
      : String(actor.assigned_classes).split(",");
    const match = list.some((c) => String(c).trim().toLowerCase() === target || target.includes(String(c).trim().toLowerCase()));
    if (match) return true;
  }

  // Check primary class_name on teacher profile
  if (actor.class_name) {
    const primary = String(actor.class_name).trim().toLowerCase();
    if (primary === target || target.includes(primary) || primary.includes(target)) {
      return true;
    }
  }

  // If teacher has no assigned classes configured at all, permit by default within school
  if (!actor.assigned_classes && !actor.class_name) {
    return true;
  }

  return false;
}

/**
 * Fetches the real student roster for a selected class from Supabase or verified directory
 */
export async function fetchStudentsForClass(schoolId, classId) {
  const cleanSchoolId = (schoolId || "CAMPUS-01").toUpperCase();
  const cleanClassId = String(classId || "").trim();

  let roster = [];

  // 1. Try Supabase students table
  if (supabase) {
    try {
      let query = supabase
        .from("students")
        .select("id, name, roll_number, class_id")
        .eq("school_id", cleanSchoolId);

      if (cleanClassId) {
        query = query.eq("class_id", cleanClassId);
      }

      const { data, error } = await query.order("roll_number", { ascending: true });
      if (!error && data && data.length > 0) {
        roster = data.map((s) => ({
          id: s.id,
          name: s.name,
          roll_number: s.roll_number || "N/A",
          class_id: s.class_id || cleanClassId,
        }));
      }
    } catch {
      // Non-blocking fallback
    }
  }

  // 2. Try LocalStorage verified directory
  if (roster.length === 0 && typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(`erp_directory_${cleanSchoolId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((m) => {
            const isStudent = (m.role || "student").toLowerCase() === "student";
            if (!isStudent) return false;
            if (!cleanClassId) return true;
            const sClass = String(m.class_name || m.class || m.class_id || "").toLowerCase();
            const target = cleanClassId.toLowerCase();
            return sClass === target || sClass.includes(target) || target.includes(sClass);
          });

          if (filtered.length > 0) {
            roster = filtered.map((s) => ({
              id: s.id || s.role_code || `stu_${s.roll_number}`,
              name: s.name || s.full_name || "Enrolled Student",
              roll_number: s.roll_number || s.role_code || "N/A",
              class_id: s.class_name || cleanClassId,
            }));
          }
        }
      }
    } catch {
      // Non-blocking
    }
  }

  // Sort by roll number naturally
  return roster.sort((a, b) => String(a.roll_number).localeCompare(String(b.roll_number), undefined, { numeric: true }));
}

/**
 * Creates a new class test record in 'draft' status
 */
export async function createClassTest({
  schoolId,
  classId,
  section = "",
  subject,
  title,
  testDate,
  maxScore = 20,
  passingScore = 8,
  actor,
}) {
  const cleanSchoolId = (schoolId || "CAMPUS-01").toUpperCase();

  if (!title || !title.trim()) {
    throw new Error("Test title is required (e.g. 'Mathematics Unit Test 1').");
  }
  if (!classId || !classId.trim()) {
    throw new Error("Target class is required.");
  }
  if (!subject || !subject.trim()) {
    throw new Error("Subject is required.");
  }

  const numMax = Math.max(1, Number(maxScore) || 20);
  const numPass = Math.min(numMax, Math.max(0, Number(passingScore) || Math.round(numMax * 0.4)));

  // Role authorization
  if (actor && !isTeacherAuthorizedForClass(actor, classId)) {
    throw new Error(`Unauthorized: You are not assigned to manage tests for ${classId}.`);
  }

  const testId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `test_${Date.now()}`;
  const now = new Date().toISOString();

  const newTest = {
    id: testId,
    school_id: cleanSchoolId,
    class_id: classId.trim(),
    section: section ? section.trim() : "",
    subject: subject.trim(),
    title: title.trim(),
    test_date: testDate || now.split("T")[0],
    max_score: numMax,
    passing_score: numPass,
    highest_score: null,
    status: "draft",
    created_by: actor?.name || actor?.id || "Faculty",
    created_by_role: actor?.role || "TCH",
    created_at: now,
    updated_by: actor?.name || "Faculty",
    updated_at: now,
    published_by: null,
    published_at: null,
  };

  // 1. Persist to Supabase if available
  if (supabase) {
    try {
      const { error } = await supabase.from("class_tests").insert([newTest]);
      if (error) console.warn("[ClassTestMarksService] Supabase class_tests insert warning:", error.message);
    } catch {
      // Non-blocking fallback
    }
  }

  // 2. Persist to tenant local storage
  if (typeof localStorage !== "undefined") {
    try {
      const key = `erp_class_tests_${cleanSchoolId}`;
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      localStorage.setItem(key, JSON.stringify([newTest, ...existing]));
    } catch {
      // Non-blocking
    }
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("erp-tests-updated"));
  }

  return newTest;
}

/**
 * Saves and validates marks entered for a student roster
 * Supports saving as 'draft' or immediate 'published'
 */
export async function saveClassTestScores({
  schoolId,
  testId,
  scoresList,
  actor,
  publish = false,
}) {
  const cleanSchoolId = (schoolId || "CAMPUS-01").toUpperCase();

  if (!testId) throw new Error("Test ID is required.");
  if (!Array.isArray(scoresList) || scoresList.length === 0) {
    throw new Error("No student scores provided to save.");
  }

  // 1. Fetch existing test header to verify permissions and ceiling
  let testHeader = await getClassTestDetails(cleanSchoolId, testId, actor);
  if (!testHeader) {
    throw new Error("Class test not found in institutional records.");
  }

  if (actor && !isTeacherAuthorizedForClass(actor, testHeader.class_id)) {
    throw new Error(`Unauthorized: You do not have permission to modify marks for ${testHeader.class_id}.`);
  }

  const maxScore = Number(testHeader.max_score) || 20;

  // 2. Validate and deduplicate marks
  const studentSeen = new Set();
  const validatedScores = [];
  let highestScore = 0;
  let hasValidPresentStudent = false;

  for (const s of scoresList) {
    if (!s.student_id) continue;

    if (studentSeen.has(s.student_id)) {
      throw new Error(`Duplicate entry detected for student ID: ${s.student_id}. Each student may only receive one score.`);
    }
    studentSeen.add(s.student_id);

    const isAbsent = Boolean(s.is_absent);
    let marksObtained = 0;

    if (!isAbsent) {
      marksObtained = validateMarksInput(s.marks_obtained, maxScore);
      if (marksObtained > highestScore) {
        highestScore = marksObtained;
      }
      hasValidPresentStudent = true;
    }

    validatedScores.push({
      id: s.id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `score_${s.student_id}_${Date.now()}`),
      test_id: testId,
      school_id: cleanSchoolId,
      student_id: String(s.student_id).trim(),
      student_name: s.student_name ? s.student_name.trim() : "Student",
      roll_number: String(s.roll_number || s.student_id).trim(),
      marks_obtained: marksObtained,
      max_score: maxScore,
      is_absent: isAbsent,
      remarks: s.remarks ? s.remarks.trim() : (isAbsent ? "Absent" : "Completed"),
      created_at: s.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  const finalHighest = hasValidPresentStudent ? highestScore : 0;
  const now = new Date().toISOString();
  const nextStatus = publish ? "published" : testHeader.status || "draft";

  // 3. Update test header
  const updatedHeader = {
    ...testHeader,
    highest_score: finalHighest,
    status: nextStatus,
    updated_by: actor?.name || "Faculty",
    updated_at: now,
    ...(publish ? { published_by: actor?.name || "Faculty", published_at: now } : {}),
  };

  // 4. Persist to Supabase
  if (supabase) {
    try {
      // Upsert test header
      await supabase.from("class_tests").upsert([updatedHeader]);

      // Upsert student scores
      await supabase.from("test_scores").upsert(validatedScores, { onConflict: "test_id,student_id" });
    } catch (e) {
      console.warn("[ClassTestMarksService] Supabase scores save warning:", e);
    }
  }

  // 5. Persist to LocalStorage
  if (typeof localStorage !== "undefined") {
    try {
      // Update tests list
      const testsKey = `erp_class_tests_${cleanSchoolId}`;
      const existingTests = JSON.parse(localStorage.getItem(testsKey) || "[]");
      const filteredTests = existingTests.filter((t) => t.id !== testId);
      localStorage.setItem(testsKey, JSON.stringify([updatedHeader, ...filteredTests]));

      // Update scores list
      const scoresKey = `erp_test_scores_${cleanSchoolId}`;
      const existingScores = JSON.parse(localStorage.getItem(scoresKey) || "[]");
      const filteredScores = existingScores.filter((sc) => sc.test_id !== testId);
      localStorage.setItem(scoresKey, JSON.stringify([...validatedScores, ...filteredScores]));
    } catch {
      // Non-blocking
    }
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("erp-tests-updated"));
  }

  return {
    test: updatedHeader,
    scoresCount: validatedScores.length,
    highestScore: finalHighest,
    status: nextStatus,
  };
}

/**
 * Publishes an existing draft test
 */
export async function publishClassTest({ schoolId, testId, actor }) {
  const cleanSchoolId = (schoolId || "CAMPUS-01").toUpperCase();
  const test = await getClassTestDetails(cleanSchoolId, testId, actor);
  if (!test) throw new Error("Test not found.");

  if (actor && !isTeacherAuthorizedForClass(actor, test.class_id)) {
    throw new Error(`Unauthorized: You cannot publish marks for ${test.class_id}.`);
  }

  const scores = await getScoresForTest(cleanSchoolId, testId);
  const present = scores.filter((s) => !s.is_absent);
  const highestScore = present.length > 0 ? Math.max(...present.map((p) => Number(p.marks_obtained) || 0)) : 0;
  const now = new Date().toISOString();

  const updated = {
    ...test,
    status: "published",
    highest_score: highestScore,
    published_by: actor?.name || "Faculty",
    published_at: now,
    updated_at: now,
  };

  if (supabase) {
    try {
      await supabase.from("class_tests").upsert([updated]);
    } catch {}
  }

  if (typeof localStorage !== "undefined") {
    try {
      const testsKey = `erp_class_tests_${cleanSchoolId}`;
      const existing = JSON.parse(localStorage.getItem(testsKey) || "[]");
      const filtered = existing.filter((t) => t.id !== testId);
      localStorage.setItem(testsKey, JSON.stringify([updated, ...filtered]));
    } catch {}
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("erp-tests-updated"));
  }

  return updated;
}

/**
 * Get tests belonging to a teacher's assigned classes
 */
export async function getClassTestsForTeacher({ schoolId, classId = "", subject = "", actor }) {
  const cleanSchoolId = (schoolId || "CAMPUS-01").toUpperCase();
  let tests = [];

  // 1. Supabase
  if (supabase) {
    try {
      let query = supabase
        .from("class_tests")
        .select("*")
        .eq("school_id", cleanSchoolId)
        .order("test_date", { ascending: false });

      if (classId) query = query.eq("class_id", classId);
      if (subject) query = query.eq("subject", subject);

      const { data, error } = await query;
      if (!error && data && data.length > 0) tests = data;
    } catch {}
  }

  // 2. Local storage
  if (tests.length === 0 && typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(`erp_class_tests_${cleanSchoolId}`);
      if (raw) {
        tests = JSON.parse(raw);
      }
    } catch {}
  }

  // Filter by teacher assignment if actor is faculty
  if (actor && actor.role && !["PRIN", "HOD", "ADMIN", "PRINCIPAL", "TRUSTEE"].some((r) => (actor.role || "").toUpperCase().includes(r))) {
    tests = tests.filter((t) => isTeacherAuthorizedForClass(actor, t.class_id));
  }

  if (classId) {
    tests = tests.filter((t) => String(t.class_id).toLowerCase() === classId.toLowerCase());
  }
  if (subject) {
    tests = tests.filter((t) => String(t.subject).toLowerCase() === subject.toLowerCase());
  }

  return tests.sort((a, b) => new Date(b.test_date || b.created_at) - new Date(a.test_date || a.created_at));
}

/**
 * Get all scores for a specific test (Teacher / Admin view)
 */
export async function getScoresForTest(schoolId, testId) {
  const cleanSchoolId = (schoolId || "CAMPUS-01").toUpperCase();
  let scores = [];

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("test_scores")
        .select("*")
        .eq("school_id", cleanSchoolId)
        .eq("test_id", testId)
        .order("roll_number", { ascending: true });
      if (!error && data && data.length > 0) scores = data;
    } catch {}
  }

  if (scores.length === 0 && typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(`erp_test_scores_${cleanSchoolId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        scores = parsed.filter((s) => s.test_id === testId);
      }
    } catch {}
  }

  return scores.sort((a, b) => String(a.roll_number).localeCompare(String(b.roll_number), undefined, { numeric: true }));
}

/**
 * Get test header and scores
 */
export async function getClassTestDetails(schoolId, testId, _actor) {
  const cleanSchoolId = (schoolId || "CAMPUS-01").toUpperCase();
  let test = null;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("class_tests")
        .select("*")
        .eq("school_id", cleanSchoolId)
        .eq("id", testId)
        .maybeSingle();
      if (!error && data) test = data;
    } catch {}
  }

  if (!test && typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(`erp_class_tests_${cleanSchoolId}`);
      if (raw) {
        const list = JSON.parse(raw);
        test = list.find((t) => t.id === testId) || null;
      }
    } catch {}
  }

  return test;
}

/**
 * CRITICAL PRIVACY REQUIREMENT:
 * Student Portal - Private Marks Retrieval
 * Returns ONLY the student's own marks and the class highest score.
 * NEVER returns other students' names, roll numbers, or individual mark sheets.
 * Excludes unpublished (draft) tests completely.
 */
export async function getStudentPublishedMarks({ schoolId, studentId, studentRoll }) {
  const cleanSchoolId = (schoolId || "CAMPUS-01").toUpperCase();
  const cleanStudentId = String(studentId || "").trim();
  const cleanRoll = String(studentRoll || "").trim().toUpperCase();

  if (!cleanStudentId && !cleanRoll) {
    return [];
  }

  let publishedMarks = [];

  // 1. Try Supabase via RPC or Join with RLS
  if (supabase) {
    try {
      // Secure RPC call
      const { data: rpcData, error: rpcErr } = await supabase.rpc("get_student_published_test_marks", {
        p_school_id: cleanSchoolId,
        p_student_id: cleanStudentId || cleanRoll,
      });

      if (!rpcErr && rpcData && rpcData.length > 0) {
        return rpcData.map((d) => ({
          test_id: d.test_id,
          title: d.title,
          subject: d.subject,
          class_id: d.class_id,
          section: d.section,
          test_date: d.test_date,
          marks_obtained: Number(d.marks_obtained),
          max_score: Number(d.max_score),
          class_highest: Number(d.class_highest),
          is_absent: Boolean(d.is_absent),
          remarks: d.remarks || (d.is_absent ? "Absent" : "Evaluated"),
          status: "published",
        }));
      }

      // Direct RLS query: Only select test_scores joined with published class_tests
      const { data: scoreData, error: scoreErr } = await supabase
        .from("test_scores")
        .select(`
          id,
          test_id,
          student_id,
          roll_number,
          marks_obtained,
          max_score,
          is_absent,
          remarks,
          created_at,
          class_tests!inner (
            id,
            title,
            subject,
            class_id,
            section,
            test_date,
            max_score,
            highest_score,
            status
          )
        `)
        .eq("school_id", cleanSchoolId)
        .eq("class_tests.status", "published")
        .or(`student_id.eq.${cleanStudentId},roll_number.eq.${cleanRoll}`);

      if (!scoreErr && scoreData && scoreData.length > 0) {
        return scoreData.map((row) => {
          const ct = row.class_tests || {};
          const myMarks = Number(row.marks_obtained);
          const max = Number(ct.max_score || row.max_score) || 20;
          const highest = Number(ct.highest_score) || myMarks;

          return {
            test_id: row.test_id,
            title: ct.title || "Class Assessment",
            subject: ct.subject || "General",
            class_id: ct.class_id,
            section: ct.section,
            test_date: ct.test_date || row.created_at?.split("T")[0],
            marks_obtained: myMarks,
            max_score: max,
            class_highest: highest,
            is_absent: Boolean(row.is_absent),
            remarks: row.remarks || (row.is_absent ? "Absent" : "Evaluated"),
            status: "published",
          };
        });
      }
    } catch (e) {
      console.warn("[ClassTestMarksService] Supabase student marks fetch notice:", e);
    }
  }

  // 2. LocalStorage Fallback (with strict privacy filtering)
  if (typeof localStorage !== "undefined") {
    try {
      const testsKey = `erp_class_tests_${cleanSchoolId}`;
      const scoresKey = `erp_test_scores_${cleanSchoolId}`;

      const allTests = JSON.parse(localStorage.getItem(testsKey) || "[]");
      const allScores = JSON.parse(localStorage.getItem(scoresKey) || "[]");

      // Filter tests to strictly PUBLISHED ones
      const publishedTestMap = new Map();
      allTests.forEach((t) => {
        if (t.status === "published") {
          publishedTestMap.set(t.id, t);
        }
      });

      // Filter scores to strictly THIS student's records for published tests
      const myRows = allScores.filter((sc) => {
        if (!publishedTestMap.has(sc.test_id)) return false;
        const matchesId = cleanStudentId && String(sc.student_id).trim() === cleanStudentId;
        const matchesRoll = cleanRoll && String(sc.roll_number).trim().toUpperCase() === cleanRoll;
        return matchesId || matchesRoll;
      });

      publishedMarks = myRows.map((sc) => {
        const test = publishedTestMap.get(sc.test_id);
        const myMarks = Number(sc.marks_obtained) || 0;
        const max = Number(test.max_score) || Number(sc.max_score) || 20;
        const highest = Number(test.highest_score) || myMarks;

        // SANITIZED OBJECT: Zero other student identities or peer marks
        return {
          test_id: sc.test_id,
          title: test.title,
          subject: test.subject,
          class_id: test.class_id,
          section: test.section,
          test_date: test.test_date,
          marks_obtained: myMarks,
          max_score: max,
          class_highest: highest,
          is_absent: Boolean(sc.is_absent),
          remarks: sc.remarks || (sc.is_absent ? "Absent" : "Evaluated"),
          status: "published",
        };
      });
    } catch {
      // Non-blocking
    }
  }

  return publishedMarks.sort((a, b) => new Date(b.test_date) - new Date(a.test_date));
}
