import { supabase } from "../supabaseClient";
import { logSecurityAction, AUDIT_ACTIONS } from "./auditLogger";

/**
 * Fetch quizzes from Supabase or localStorage with strict school_id isolation
 * Clean Slate: returns empty array if no faculty has created quizzes.
 */
export async function getQuizzes(schoolId) {
  const cleanSchoolId = schoolId ? String(schoolId).trim().toUpperCase() : null;

  try {
    if (supabase) {
      let query = supabase.from("lms_quizzes").select("*");
      if (cleanSchoolId) {
        query = query.eq("school_id", cleanSchoolId);
      }
      const { data, error } = await query.order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((d) => ({
          id: d.id,
          title: d.title,
          subject: d.subject,
          className: d.class_name || "General Batch",
          duration: d.duration || "15 mins",
          questions: Array.isArray(d.questions) ? d.questions : [],
          school_id: d.school_id,
        }));
      }
    }
  } catch (err) {
    console.warn("LMS quiz load notice:", err);
  }

  // Fallback to tenant-scoped localStorage
  try {
    if (cleanSchoolId) {
      const savedTenant = localStorage.getItem(`erp_lms_quizzes_${cleanSchoolId}`);
      if (savedTenant) {
        const parsed = JSON.parse(savedTenant);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }

    const savedGlobal = localStorage.getItem("erp_lms_quizzes");
    if (savedGlobal) {
      const parsed = JSON.parse(savedGlobal);
      if (Array.isArray(parsed)) {
        if (cleanSchoolId) {
          return parsed.filter(
            (q) => String(q.school_id || "").toUpperCase() === cleanSchoolId
          );
        }
        return parsed;
      }
    }
  } catch {
    // ignore
  }

  // True clean slate: zero default mock quizzes
  return [];
}

/**
 * Publish a new interactive quiz created by teacher
 */
export async function createQuiz({
  title,
  subject,
  className,
  duration,
  questions,
  schoolId,
  user,
}) {
  const cleanSchoolId = (schoolId || "CAMPUS-01").trim().toUpperCase();
  const newQuiz = {
    id: `quiz-${Date.now().toString(36)}`,
    title: title.trim(),
    subject: subject.trim(),
    className: className || "General Batch",
    duration: duration || "15 mins",
    questions: questions || [],
    created_at: new Date().toISOString(),
    created_by: user?.name || "Faculty Member",
    school_id: cleanSchoolId,
  };

  // Try Supabase insert
  try {
    if (supabase) {
      await supabase.from("lms_quizzes").insert([
        {
          school_id: cleanSchoolId,
          title: newQuiz.title,
          subject: newQuiz.subject,
          class_name: newQuiz.className,
          duration: newQuiz.duration,
          questions: newQuiz.questions,
        },
      ]);
    }
  } catch (err) {
    console.warn("Notice saving quiz to Supabase:", err);
  }

  // Sync to tenant-scoped localStorage
  try {
    const tenantKey = `erp_lms_quizzes_${cleanSchoolId}`;
    const rawTenant = localStorage.getItem(tenantKey);
    const tenantList = rawTenant ? JSON.parse(rawTenant) : [];
    const updatedTenant = [newQuiz, ...tenantList.filter((q) => q.id !== newQuiz.id)];
    localStorage.setItem(tenantKey, JSON.stringify(updatedTenant));

    // Global sync
    const globalRaw = localStorage.getItem("erp_lms_quizzes");
    const globalList = globalRaw ? JSON.parse(globalRaw) : [];
    const updatedGlobal = [newQuiz, ...globalList.filter((q) => q.id !== newQuiz.id)];
    localStorage.setItem("erp_lms_quizzes", JSON.stringify(updatedGlobal));

    // Real-time broadcast for Student LMS
    window.dispatchEvent(new Event("erp-quizzes-updated"));
  } catch (e) {
    console.warn("Error saving quiz to local storage:", e);
  }

  // Log Security audit
  try {
    logSecurityAction({
      action: AUDIT_ACTIONS.HOMEWORK_PUBLISHED,
      entityType: "LMS_QUIZ",
      entityId: newQuiz.title,
      details: `Created interactive quiz "${newQuiz.title}" (${newQuiz.subject}) with ${newQuiz.questions.length} questions for ${newQuiz.className}`,
      user,
      schoolId: cleanSchoolId,
    });
  } catch {
    // optional
  }

  return newQuiz;
}

/**
 * Delete a quiz
 */
export async function deleteQuiz(id, schoolId) {
  const cleanSchoolId = schoolId ? String(schoolId).trim().toUpperCase() : null;

  try {
    if (supabase) {
      await supabase.from("lms_quizzes").delete().eq("id", id);
    }
  } catch (err) {
    console.warn("Quiz delete DB notice:", err);
  }

  try {
    if (cleanSchoolId) {
      const tenantKey = `erp_lms_quizzes_${cleanSchoolId}`;
      const savedTenant = localStorage.getItem(tenantKey);
      if (savedTenant) {
        const filtered = JSON.parse(savedTenant).filter((q) => q.id !== id);
        localStorage.setItem(tenantKey, JSON.stringify(filtered));
      }
    }

    const saved = localStorage.getItem("erp_lms_quizzes");
    if (saved) {
      const parsed = JSON.parse(saved);
      const filtered = parsed.filter((q) => q.id !== id);
      localStorage.setItem("erp_lms_quizzes", JSON.stringify(filtered));
    }

    window.dispatchEvent(new Event("erp-quizzes-updated"));
  } catch {
    // ignore
  }
}
