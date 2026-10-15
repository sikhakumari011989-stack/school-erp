import { supabase } from "../supabaseClient";
import { logSecurityAction, AUDIT_ACTIONS } from "./auditLogger";

const DEFAULT_QUIZZES = [
  {
    id: "quiz-01",
    title: "Algebra & Quadratic Equations Weekly Test",
    subject: "Mathematics",
    className: "Class 10 ICSE",
    duration: "15 mins",
    questions: [
      {
        id: 1,
        question: "What is the discriminant of the quadratic equation ax² + bx + c = 0?",
        options: ["b² - 4ac", "b² + 4ac", "√(b² - 4ac)", "-b ± √(b² - 4ac)"],
        correct_answer: 0,
        explanation: "The discriminant Δ is given by b² - 4ac, which determines the nature of the roots.",
      },
      {
        id: 2,
        question: "If Δ = b² - 4ac > 0 and is a perfect square, the roots of the equation are:",
        options: ["Real, rational, and unequal", "Real, irrational, and unequal", "Real and equal", "Imaginary/Complex"],
        correct_answer: 0,
        explanation: "When Δ > 0 and a perfect square, √Δ is rational, making both roots real, rational, and distinct.",
      },
      {
        id: 3,
        question: "Find the roots of the equation x² - 5x + 6 = 0.",
        options: ["x = 2, 3", "x = -2, -3", "x = 1, 6", "x = -1, -6"],
        correct_answer: 0,
        explanation: "(x - 2)(x - 3) = 0 gives x = 2 and x = 3.",
      },
      {
        id: 4,
        question: "What is the sum of roots for the equation 2x² - 8x + 5 = 0?",
        options: ["4", "-4", "5/2", "-5/2"],
        correct_answer: 0,
        explanation: "Sum of roots = -b/a = -(-8)/2 = 8/2 = 4.",
      },
    ],
  },
  {
    id: "quiz-02",
    title: "Newton's Laws of Motion & Momentum",
    subject: "Physics",
    className: "Class 10 ICSE",
    duration: "20 mins",
    questions: [
      {
        id: 1,
        question: "Newton's First Law of Motion gives the qualitative definition of which quantity?",
        options: ["Force and Inertia", "Acceleration", "Linear Momentum", "Energy"],
        correct_answer: 0,
        explanation: "The first law introduces the concept of inertia and defines force qualitatively.",
      },
      {
        id: 2,
        question: "What is the SI unit of momentum (p = mv)?",
        options: ["kg·m/s", "N·m", "kg·m/s²", "Joule"],
        correct_answer: 0,
        explanation: "Momentum is mass (kg) multiplied by velocity (m/s) = kg·m/s.",
      },
      {
        id: 3,
        question: "Newton's Second Law can be mathematically represented as:",
        options: ["F = dp/dt = ma", "F = mv", "F = 1/2 mv²", "F = m/a"],
        correct_answer: 0,
        explanation: "Force is the rate of change of momentum (dp/dt = m·dv/dt = ma).",
      },
    ],
  },
  {
    id: "quiz-03",
    title: "Periodic Table & Chemical Bonding",
    subject: "Chemistry",
    className: "Class 10 ICSE",
    duration: "15 mins",
    questions: [
      {
        id: 1,
        question: "Across a period in the Modern Periodic Table, atomic size generally:",
        options: ["Decreases", "Increases", "Remains constant", "First increases then decreases"],
        correct_answer: 0,
        explanation: "Nuclear charge increases across a period, pulling valence electrons closer.",
      },
      {
        id: 2,
        question: "Which of the following elements has the highest electronegativity?",
        options: ["Fluorine (F)", "Chlorine (Cl)", "Oxygen (O)", "Sodium (Na)"],
        correct_answer: 0,
        explanation: "Fluorine is the most electronegative element with a value of 4.0 on the Pauling scale.",
      },
    ],
  },
];

/**
 * Fetch quizzes from Supabase or localStorage
 */
export async function getQuizzes(schoolId) {
  try {
    const { data, error } = await supabase
      .from("lms_quizzes")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map((d) => ({
        id: d.id,
        title: d.title,
        subject: d.subject,
        className: d.class_name || "General Batch",
        duration: d.duration || "15 mins",
        questions: Array.isArray(d.questions) ? d.questions : [],
      }));
    }
  } catch (err) {
    console.warn("LMS quiz load notice:", err);
  }

  // Fallback to localStorage
  try {
    const saved = localStorage.getItem("erp_lms_quizzes");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }

  return DEFAULT_QUIZZES;
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
  const newQuiz = {
    id: `quiz-${Date.now().toString(36)}`,
    title: title.trim(),
    subject: subject.trim(),
    className: className || "Class 10 ICSE",
    duration: duration || "15 mins",
    questions: questions || [],
    created_at: new Date().toISOString(),
    created_by: user?.name || "Faculty Member",
  };

  // Try Supabase insert
  try {
    await supabase.from("lms_quizzes").insert([
      {
        school_id: schoolId || "OASIS-TUTORIALS",
        title: newQuiz.title,
        subject: newQuiz.subject,
        class_name: newQuiz.className,
        duration: newQuiz.duration,
        questions: newQuiz.questions,
      },
    ]);
  } catch (err) {
    console.warn("Notice saving quiz to Supabase:", err);
  }

  // Sync to localStorage
  try {
    const current = await getQuizzes(schoolId);
    const updated = [newQuiz, ...current.filter((q) => q.id !== newQuiz.id)];
    localStorage.setItem("erp_lms_quizzes", JSON.stringify(updated));
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
      schoolId,
    });
  } catch {
    // optional
  }

  return newQuiz;
}

/**
 * Delete a quiz
 */
export async function deleteQuiz(id) {
  try {
    await supabase.from("lms_quizzes").delete().eq("id", id);
  } catch (err) {
    console.warn("Quiz delete DB notice:", err);
  }

  try {
    const saved = localStorage.getItem("erp_lms_quizzes");
    if (saved) {
      const parsed = JSON.parse(saved);
      const filtered = parsed.filter((q) => q.id !== id);
      localStorage.setItem("erp_lms_quizzes", JSON.stringify(filtered));
    }
  } catch {
    // ignore
  }
}

