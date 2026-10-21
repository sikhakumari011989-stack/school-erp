import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { supabase } from "../supabaseClient";
import { resolveSchoolUuid } from "../utils/supabaseHelpers";
import { TableSkeleton } from "../Components/Skeleton";
import { logSecurityAction, AUDIT_ACTIONS } from "../utils/auditLogger";
import { getQuizzes, createQuiz, deleteQuiz } from "../utils/quizService";

export default function TeacherHomework() {
  const { user } = useContext(AppContext);
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState("homework"); // 'homework' or 'quiz'

  // Homework state
  const [classes, setClasses] = useState([]);
  const [homeworkList, setHomeworkList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hwCompletions, setHwCompletions] = useState({});
  const [verifyingHw, setVerifyingHw] = useState(null); // when open modal for student verification
  const [enrolledStudents, setEnrolledStudents] = useState([]);

  const activeSchool = (user?.school_id || user?.institution_code || "CAMPUS-01").toUpperCase();

  const loadHwCompletions = () => {
    try {
      const saved = localStorage.getItem(`erp_hw_completion_${activeSchool}`);
      if (saved) {
        setHwCompletions(JSON.parse(saved));
      } else {
        setHwCompletions({});
      }
    } catch {
      setHwCompletions({});
    }

    try {
      const rawDir = localStorage.getItem(`erp_directory_${activeSchool}`);
      if (rawDir) {
        const list = JSON.parse(rawDir);
        setEnrolledStudents(list.filter((m) => (m.role || "").toLowerCase() === "student"));
      } else {
        setEnrolledStudents([]);
      }
    } catch {
      setEnrolledStudents([]);
    }
  };

  const handleToggleVerification = (hwId, hwTitle) => {
    const isCurrentlyDone = Boolean(
      hwCompletions[hwId] === true ||
      (typeof hwCompletions[hwId] === "object" && hwCompletions[hwId]?.all === true)
    );

    const nextState = !isCurrentlyDone;
    const updated = {
      ...hwCompletions,
      [hwId]: nextState,
    };

    setHwCompletions(updated);
    try {
      localStorage.setItem(`erp_hw_completion_${activeSchool}`, JSON.stringify(updated));
      window.dispatchEvent(new Event("erp-homework-verification-updated"));
    } catch (e) {}

    showToast(
      nextState
        ? `Marked "${hwTitle}" as verified completed for all students! ✓`
        : `Reverted "${hwTitle}" to pending verification.`,
      "success"
    );
  };

  const handleToggleStudentVerification = (hwId, studentRoll) => {
    const currentEntry = typeof hwCompletions[hwId] === "object" ? hwCompletions[hwId] : {};
    const currentStudentState = Boolean(currentEntry[studentRoll]);
    const updatedEntry = {
      ...currentEntry,
      [studentRoll]: !currentStudentState,
    };

    const updated = {
      ...hwCompletions,
      [hwId]: updatedEntry,
    };

    setHwCompletions(updated);
    try {
      localStorage.setItem(`erp_hw_completion_${activeSchool}`, JSON.stringify(updated));
      window.dispatchEvent(new Event("erp-homework-verification-updated"));
    } catch (e) {}
  };

  const [formData, setFormData] = useState({
    title: "",
    subject: "",
    description: "",
    due_date: "",
    class_id: "",
  });

  // Quiz Builder state
  const [quizzesList, setQuizzesList] = useState([]);
  const [quizForm, setQuizForm] = useState({
    title: "",
    subject: "Mathematics",
    className: "Class 10 ICSE",
    duration: "15 mins",
  });
  const [draftQuestions, setDraftQuestions] = useState([]);
  const [currQ, setCurrQ] = useState({
    question: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    correctAnswer: 0,
    explanation: "",
  });

  // Fetch data on page load
  useEffect(() => {
    fetchClasses();
    fetchHomework();
    fetchQuizzes();
    loadHwCompletions();
  }, []);

  const fetchClasses = async () => {
    try {
      const { data } = await supabase.from("classes").select("*");
      if (data) setClasses(data);
    } catch (err) {
      console.error("Error fetching classes:", err);
    }
  };

  const fetchHomework = async () => {
    setLoading(true);
    const activeSchool = user?.school_id || user?.institution_code || "CAMPUS-01";
    try {
      const schoolUuid = await resolveSchoolUuid(activeSchool);
      let query = supabase
        .from("homework")
        .select("*")
        .order("created_at", { ascending: false });

      if (schoolUuid) {
        query = query.eq("school_id", schoolUuid);
      }

      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        setHomeworkList(data);
      } else {
        const local = JSON.parse(localStorage.getItem(`erp_homework_${activeSchool}`) || "[]");
        setHomeworkList(local);
      }
    } catch (err) {
      console.warn("Error fetching homework:", err);
      const local = JSON.parse(localStorage.getItem(`erp_homework_${activeSchool}`) || "[]");
      setHomeworkList(local);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuizzes = async () => {
    try {
      const qList = await getQuizzes(user?.school_id || user?.institution_code);
      setQuizzesList(qList || []);
    } catch (err) {
      console.error("Error loading quizzes:", err);
      setQuizzesList([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.class_id || !formData.subject) {
      showToast("Please fill in all required assignment details", "error");
      return;
    }

    setSubmitting(true);
    const activeSchool = user?.school_id || user?.institution_code || "CAMPUS-01";

    try {
      const schoolUuid = await resolveSchoolUuid(activeSchool);

      const payload = {
        school_id: schoolUuid,
        class_id: formData.class_id,
        teacher_id: user?.id && user.id.length === 36 ? user.id : null,
        title: formData.title.trim(),
        subject: formData.subject.trim(),
        description: formData.description.trim(),
        due_date: formData.due_date,
      };

      try {
        await supabase.from("homework").insert([payload]);
      } catch (dbErr) {
        console.warn("DB homework insert notice:", dbErr);
      }

      // Persist to tenant local storage
      const local = JSON.parse(localStorage.getItem(`erp_homework_${activeSchool}`) || "[]");
      const newLocalHw = {
        id: `hw_${Date.now()}`,
        ...payload,
        created_at: new Date().toISOString(),
      };
      const updatedLocal = [newLocalHw, ...local];
      localStorage.setItem(`erp_homework_${activeSchool}`, JSON.stringify(updatedLocal));

      // Log security audit
      logSecurityAction({
        action: AUDIT_ACTIONS.HOMEWORK_PUBLISHED,
        entityType: "HOMEWORK",
        entityId: payload.title,
        details: `Assigned homework "${payload.title}" (${payload.subject}) for class`,
        user,
        schoolId: schoolUuid,
      });

      showToast(`Homework "${formData.title}" assigned successfully!`, "success");
      setFormData({ title: "", subject: "", description: "", due_date: "", class_id: "" });
      fetchHomework();
    } catch (error) {
      console.error("Database error assigning homework:", error);
      showToast("Notice: Saved to local offline homework ledger.", "info");
      fetchHomework();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteHomework = async (id) => {
    const activeSchool = user?.school_id || user?.institution_code || "CAMPUS-01";
    try {
      if (supabase) {
        await supabase.from("homework").delete().eq("id", id);
      }
    } catch (err) {
      console.warn("DB homework delete notice:", err);
    }

    try {
      const local = JSON.parse(localStorage.getItem(`erp_homework_${activeSchool}`) || "[]");
      const updated = local.filter((hw) => hw.id !== id);
      localStorage.setItem(`erp_homework_${activeSchool}`, JSON.stringify(updated));
    } catch (e) {}

    setHomeworkList((prev) => prev.filter((hw) => hw.id !== id));
    showToast("Assignment removed.", "info");
  };

  // Helper to map class ID back to readable name
  const getClassName = (id) => {
    const cls = classes.find((c) => c.id === id);
    return cls ? `Class ${cls.name}` : "General Batch";
  };

  // Quiz Builder Handlers
  const handleAddQuestionToDraft = () => {
    if (!currQ.question.trim() || !currQ.optionA.trim() || !currQ.optionB.trim()) {
      showToast("Please enter question text and at least Options A and B.", "error");
      return;
    }

    const newQ = {
      id: draftQuestions.length + 1,
      question: currQ.question.trim(),
      options: [
        currQ.optionA.trim(),
        currQ.optionB.trim(),
        currQ.optionC.trim() || "None of the above",
        currQ.optionD.trim() || "All of the above",
      ],
      correct_answer: Number(currQ.correctAnswer),
      explanation: currQ.explanation.trim() || "Faculty verified answer key.",
    };

    setDraftQuestions([...draftQuestions, newQ]);
    setCurrQ({
      question: "",
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
      correctAnswer: 0,
      explanation: "",
    });
    showToast(`Question ${draftQuestions.length + 1} added to draft!`, "success");
  };

  const handleRemoveDraftQuestion = (idx) => {
    setDraftQuestions(draftQuestions.filter((_, i) => i !== idx));
  };

  const handlePublishQuiz = async (e) => {
    e.preventDefault();
    if (!quizForm.title.trim()) {
      showToast("Please provide a Quiz Title / Topic.", "error");
      return;
    }

    if (draftQuestions.length === 0) {
      showToast("Please add at least 1 question to the quiz.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const schoolUuid = await resolveSchoolUuid(user?.school_id || user?.institution_code);

      await createQuiz({
        title: quizForm.title,
        subject: quizForm.subject,
        className: quizForm.className,
        duration: quizForm.duration,
        questions: draftQuestions,
        schoolId: schoolUuid,
        user,
      });

      showToast(`Interactive Quiz "${quizForm.title}" published to Student LMS!`, "success");
      setQuizForm({
        title: "",
        subject: "Mathematics",
        className: "Class 10 ICSE",
        duration: "15 mins",
      });
      setDraftQuestions([]);
      fetchQuizzes();
    } catch (err) {
      console.error("Error publishing quiz:", err);
      showToast("Failed to publish quiz.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteQuiz = async (id) => {
    try {
      await deleteQuiz(id);
      setQuizzesList((prev) => prev.filter((q) => q.id !== id));
      showToast("Quiz removed from student LMS.", "info");
    } catch (err) {
      console.error("Error deleting quiz:", err);
      showToast("Could not delete quiz.", "error");
    }
  };

  return (
    <div className="relative text-slate-200 min-h-full pb-10 font-sans">
      <div className="fixed top-0 left-10 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* HEADER & TAB SWITCHER */}
        <div className="mb-8 flex justify-between items-center flex-wrap gap-4">
          <div>
            <p className="text-blue-300 text-sm font-semibold mb-1 uppercase tracking-widest">
              Faculty Academic Suite
            </p>
            <h1 className="text-3xl font-extrabold text-white">Publish Homework & LMS Quizzes 📚</h1>
            <p className="text-slate-400 text-sm mt-1">
              Create curriculum assignments and interactive test series synchronized directly with student portals
            </p>
          </div>

          <div className="flex gap-2 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700">
            <button
              onClick={() => setActiveTab("homework")}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                activeTab === "homework"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              📝 Homework Manager
            </button>
            <button
              onClick={() => setActiveTab("quiz")}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                activeTab === "quiz"
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              ⚡ Create Interactive Quiz ({quizzesList.length})
            </button>
          </div>
        </div>

        {/* TAB 1: HOMEWORK MANAGER */}
        {activeTab === "homework" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* LEFT: ASSIGNMENT FORM */}
            <div className="lg:col-span-1 bg-[#1E293B]/70 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-6 shadow-2xl h-fit">
              <h2 className="text-xl font-bold text-white mb-6">Create Assignment</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Target Classroom Batch *
                  </label>
                  <select
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 font-bold"
                    value={formData.class_id}
                    onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                  >
                    <option value="">Select a Classroom...</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        Class {cls.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Subject *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Mathematics, Physics"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 text-sm"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Assignment Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Quadratic Equations Practice"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 text-sm font-semibold"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Submission Deadline *
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 [color-scheme:dark] text-sm"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Instructions & Question Details
                  </label>
                  <textarea
                    required
                    placeholder="Write assignment instructions, exercise numbers, or reference book pages..."
                    rows="3"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 text-sm"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold py-4 px-4 rounded-xl shadow-lg shadow-blue-600/30 disabled:opacity-50 transition-all mt-4 cursor-pointer"
                >
                  {submitting ? "Publishing Assignment..." : "Publish Homework to Portal 🚀"}
                </button>
              </form>
            </div>

            {/* RIGHT: LIVE ASSIGNMENTS LIST */}
            <div className="lg:col-span-2">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Active Curriculum Assignments</h2>
                <button
                  onClick={fetchHomework}
                  className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-xl text-slate-300 font-bold transition-all cursor-pointer"
                >
                  🔄 Refresh
                </button>
              </div>
              <div className="bg-[#1E293B]/70 backdrop-blur-xl border border-slate-700/60 rounded-3xl shadow-2xl overflow-hidden">
                {loading ? (
                  <div className="p-6">
                    <TableSkeleton rows={4} cols={3} />
                  </div>
                ) : homeworkList.length === 0 ? (
                  <div className="p-12 text-center text-slate-400">
                    <span className="text-4xl block mb-3 opacity-60">📂</span>
                    <p className="font-bold text-white text-base">No homework assigned yet.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Assignments created here will instantly appear on the student portal.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse min-w-[550px]">
                      <thead>
                        <tr className="bg-slate-900/40 border-b border-slate-700/60 text-slate-400 text-xs uppercase tracking-wider">
                          <th className="p-5">Subject & Title</th>
                          <th className="p-5">Class Batch</th>
                          <th className="p-5">Deadline</th>
                          <th className="p-5 text-center">Faculty Verification</th>
                          <th className="p-5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50 text-sm">
                        {homeworkList.map((hw) => {
                          const isVerified = Boolean(
                            hwCompletions[hw.id] === true ||
                            (typeof hwCompletions[hw.id] === "object" && hwCompletions[hw.id]?.all === true)
                          );

                          return (
                            <tr key={hw.id} className="hover:bg-slate-800/30 transition-colors">
                              <td className="p-5">
                                <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider block mb-0.5">
                                  {hw.subject}
                                </span>
                                <p className="font-bold text-white text-base">{hw.title}</p>
                                <p className="text-xs text-slate-400 mt-1 line-clamp-1">{hw.description}</p>
                              </td>
                              <td className="p-5">
                                <span className="bg-slate-800 border border-slate-700 text-slate-300 px-3 py-1 rounded-lg text-xs font-bold">
                                  {getClassName(hw.class_id)}
                                </span>
                              </td>
                              <td className="p-5 font-bold text-amber-400">{hw.due_date || "No deadline"}</td>
                              <td className="p-5 text-center">
                                <div className="inline-flex flex-col items-center gap-1.5">
                                  <button
                                    onClick={() => handleToggleVerification(hw.id, hw.title)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 ${
                                      isVerified
                                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30"
                                        : "bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30"
                                    }`}
                                    title="Toggle verified completion status for student portal"
                                  >
                                    <span>{isVerified ? "✓ Verified Completed" : "⏳ Mark Verified"}</span>
                                  </button>
                                  <button
                                    onClick={() => setVerifyingHw(hw)}
                                    className="text-[11px] text-blue-400 hover:text-blue-300 underline font-semibold cursor-pointer"
                                  >
                                    Verify per Student
                                  </button>
                                </div>
                              </td>
                              <td className="p-5 text-right">
                                <button
                                  onClick={() => handleDeleteHomework(hw.id)}
                                  className="text-rose-400 hover:text-rose-300 p-2 text-xs font-bold hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                                  title="Delete Assignment"
                                >
                                  🗑️
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* TAB 2: INTERACTIVE QUIZ BUILDER */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* LEFT: QUIZ & QUESTION FORM */}
            <div className="lg:col-span-1 bg-[#1E293B]/70 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-6 shadow-2xl h-fit space-y-5">
              <h2 className="text-xl font-bold text-white">Create Interactive Quiz</h2>

              {/* META INFO */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Quiz Topic / Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Quadratic Equations & Discriminant"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 text-sm font-semibold"
                    value={quizForm.title}
                    onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Subject
                    </label>
                    <select
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500 text-xs font-bold"
                      value={quizForm.subject}
                      onChange={(e) => setQuizForm({ ...quizForm, subject: e.target.value })}
                    >
                      <option value="Mathematics">Mathematics</option>
                      <option value="Physics">Physics</option>
                      <option value="Chemistry">Chemistry</option>
                      <option value="Biology">Biology</option>
                      <option value="English">English</option>
                      <option value="Computers">Computers</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Class Batch
                    </label>
                    <input
                      type="text"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500 text-xs font-bold"
                      value={quizForm.className}
                      onChange={(e) => setQuizForm({ ...quizForm, className: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Duration
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 15 mins, 30 mins"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500 text-xs"
                    value={quizForm.duration}
                    onChange={(e) => setQuizForm({ ...quizForm, duration: e.target.value })}
                  />
                </div>
              </div>

              {/* DYNAMIC QUESTION ADDITION */}
              <div className="border-t border-slate-800 pt-4 space-y-3">
                <p className="text-xs font-extrabold uppercase tracking-wider text-purple-400">
                  Add Question #{draftQuestions.length + 1}
                </p>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    Question Text *
                  </label>
                  <textarea
                    rows="2"
                    placeholder="Enter question prompt..."
                    className="w-full bg-slate-950/70 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500"
                    value={currQ.question}
                    onChange={(e) => setCurrQ({ ...currQ, question: e.target.value })}
                  ></textarea>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-slate-400 font-bold block mb-1">Option A *</label>
                    <input
                      type="text"
                      placeholder="Choice A"
                      className="w-full bg-slate-950/70 border border-slate-700 rounded-xl px-3 py-2 text-white"
                      value={currQ.optionA}
                      onChange={(e) => setCurrQ({ ...currQ, optionA: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 font-bold block mb-1">Option B *</label>
                    <input
                      type="text"
                      placeholder="Choice B"
                      className="w-full bg-slate-950/70 border border-slate-700 rounded-xl px-3 py-2 text-white"
                      value={currQ.optionB}
                      onChange={(e) => setCurrQ({ ...currQ, optionB: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 font-bold block mb-1">Option C</label>
                    <input
                      type="text"
                      placeholder="Choice C"
                      className="w-full bg-slate-950/70 border border-slate-700 rounded-xl px-3 py-2 text-white"
                      value={currQ.optionC}
                      onChange={(e) => setCurrQ({ ...currQ, optionC: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 font-bold block mb-1">Option D</label>
                    <input
                      type="text"
                      placeholder="Choice D"
                      className="w-full bg-slate-950/70 border border-slate-700 rounded-xl px-3 py-2 text-white"
                      value={currQ.optionD}
                      onChange={(e) => setCurrQ({ ...currQ, optionD: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    Correct Option Key
                  </label>
                  <select
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-bold focus:outline-none focus:border-purple-500"
                    value={currQ.correctAnswer}
                    onChange={(e) => setCurrQ({ ...currQ, correctAnswer: Number(e.target.value) })}
                  >
                    <option value={0}>Option A (Correct)</option>
                    <option value={1}>Option B (Correct)</option>
                    <option value={2}>Option C (Correct)</option>
                    <option value={3}>Option D (Correct)</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleAddQuestionToDraft}
                  className="w-full bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/40 font-bold py-2.5 px-3 rounded-xl transition-all text-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>➕</span> Add Question to Draft ({draftQuestions.length} added)
                </button>
              </div>

              {/* PUBLISH QUIZ BUTTON */}
              <button
                type="button"
                onClick={handlePublishQuiz}
                disabled={submitting || draftQuestions.length === 0}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black py-3.5 px-4 rounded-xl shadow-lg shadow-purple-600/30 disabled:opacity-40 transition-all text-xs cursor-pointer flex items-center justify-center gap-2"
              >
                {submitting ? "Publishing to LMS..." : "Publish Quiz to Student LMS 🚀"}
              </button>
            </div>

            {/* RIGHT: DRAFT QUESTIONS & PUBLISHED QUIZZES */}
            <div className="lg:col-span-2 space-y-6">
              {/* DRAFT QUESTIONS PREVIEW */}
              {draftQuestions.length > 0 && (
                <div className="bg-[#1E293B]/70 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-base font-extrabold text-white">
                      Draft Questions Preview ({draftQuestions.length})
                    </h3>
                    <span className="text-xs text-purple-400 font-bold">Unsaved draft</span>
                  </div>
                  <div className="space-y-3 max-h-72 overflow-y-auto">
                    {draftQuestions.map((q, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 flex justify-between items-start gap-3"
                      >
                        <div className="text-xs space-y-1">
                          <p className="font-bold text-white">
                            {idx + 1}. {q.question}
                          </p>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-slate-400 text-[11px]">
                            {q.options.map((opt, oIdx) => (
                              <span
                                key={oIdx}
                                className={oIdx === q.correct_answer ? "text-emerald-400 font-bold" : ""}
                              >
                                {String.fromCharCode(65 + oIdx)}: {opt}{" "}
                                {oIdx === q.correct_answer && "✓"}
                              </span>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveDraftQuestion(idx)}
                          className="text-rose-400 hover:text-rose-300 text-xs font-bold cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PUBLISHED QUIZZES IN STUDENT LMS */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-white">Live LMS Quizzes Bank</h3>
                  <button
                    onClick={fetchQuizzes}
                    className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-xl text-slate-300 font-bold transition-all cursor-pointer"
                  >
                    🔄 Refresh
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {quizzesList.map((q) => (
                    <div
                      key={q.id}
                      className="bg-[#1E293B]/70 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-5 shadow-xl flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase">
                            {q.subject}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            ⏱️ {q.duration || "15 mins"}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-white text-base mb-1">{q.title}</h4>
                        <p className="text-xs text-slate-400 mb-3">
                          Batch: <span className="text-slate-300 font-semibold">{q.className || "Class 10 ICSE"}</span> |{" "}
                          Questions: <span className="text-emerald-400 font-bold">{q.questions?.length || 0}</span>
                        </p>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                        <span className="text-[10px] text-emerald-400 font-bold">● Active in Student Portal</span>
                        <button
                          onClick={() => handleDeleteQuiz(q.id)}
                          className="text-rose-400 hover:text-rose-300 text-xs font-bold hover:bg-rose-500/10 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                          title="Delete Quiz"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* STUDENT SUBMISSION VERIFICATION MODAL */}
      {verifyingHw && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#1E293B] border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Submission Verification Panel</span>
                <h3 className="text-xl font-extrabold text-white">{verifyingHw.title}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{verifyingHw.subject} &bull; Deadline: {verifyingHw.due_date || "Open"}</p>
              </div>
              <button
                onClick={() => setVerifyingHw(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex justify-between items-center my-4 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
              <span className="text-xs text-slate-300 font-bold">
                Enrolled Scholars: {enrolledStudents.length}
              </span>
              <button
                onClick={() => handleToggleVerification(verifyingHw.id, verifyingHw.title)}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer shadow-md shadow-blue-600/20"
              >
                Toggle All Scholars Verified ✓
              </button>
            </div>

            {enrolledStudents.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <p className="text-sm font-bold text-white">No enrolled students in active directory.</p>
                <p className="text-xs mt-1">Use the Quick Verification button in the table to verify batch-wide.</p>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {enrolledStudents.map((st) => {
                  const studentRoll = st.roll_number || st.role_code || st.id;
                  const isDone = Boolean(
                    hwCompletions[verifyingHw.id] === true ||
                    (typeof hwCompletions[verifyingHw.id] === "object" && (hwCompletions[verifyingHw.id]?.[studentRoll] || hwCompletions[verifyingHw.id]?.all))
                  );

                  return (
                    <div
                      key={st.id || studentRoll}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-800 hover:border-slate-700 transition-colors"
                    >
                      <div>
                        <p className="font-bold text-white text-sm">{st.full_name || st.name}</p>
                        <p className="text-xs text-slate-400 font-mono">{studentRoll} &bull; {st.class_name || "General Batch"}</p>
                      </div>
                      <button
                        onClick={() => handleToggleStudentVerification(verifyingHw.id, studentRoll)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isDone
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : "bg-slate-800 text-slate-400 hover:text-white border border-slate-700"
                        }`}
                      >
                        {isDone ? "✓ Verified Completed" : "⏳ Pending"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end pt-5 border-t border-slate-800 mt-4">
              <button
                onClick={() => setVerifyingHw(null)}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}