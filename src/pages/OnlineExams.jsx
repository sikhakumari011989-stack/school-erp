import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import {
  FileSpreadsheet,
  PlusCircle,
  Clock,
  Award,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Trash2,
  Eye,
  Check,
  AlertCircle,
  BookOpen,
  Users,
  Search,
  Sparkles,
  BarChart2
} from "lucide-react";

const SUBJECTS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Computer Science",
  "English",
  "Social Science",
  "General Aptitude & Reasoning"
];

const BATCHES = [
  "Class 9",
  "Class 10",
  "Class 11 - Science",
  "Class 11 - Commerce",
  "Class 12 - Science",
  "Class 12 - Commerce",
  "NEET Foundation",
  "JEE Advanced Track"
];

export default function OnlineExams() {
  const { user, tenant } = useContext(AppContext);
  const { showToast } = useToast();

  const schoolCode = (
    user?.institution_code ||
    user?.school_id ||
    tenant?.code ||
    "CAMPUS-01"
  ).toUpperCase();

  const [exams, setExams] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeSubmissionsExam, setActiveSubmissionsExam] = useState(null);

  // New Exam Form State
  const [examForm, setExamForm] = useState({
    title: "",
    subject: "Mathematics",
    targetClass: "Class 10",
    durationMinutes: 30,
    passingPercentage: 40,
    instructions: "All questions are compulsory. Negative marks apply for wrong answers.",
    questions: [
      {
        id: `q_1`,
        text: "",
        options: ["", "", "", ""],
        correctOption: 0,
        positiveMarks: 4,
        negativeMarks: 1,
      },
    ],
  });

  // Load existing exams & submissions
  useEffect(() => {
    loadExamsAndSubmissions();
  }, [schoolCode]);

  const loadExamsAndSubmissions = () => {
    try {
      const examsRaw = localStorage.getItem(`erp_online_exams_${schoolCode}`);
      if (examsRaw) {
        setExams(JSON.parse(examsRaw));
      } else {
        // Starter sample exam
        const sampleExam = {
          id: `exam_${Date.now() - 100000}`,
          title: "Unit Test 1: Calculus & Trigonometry",
          subject: "Mathematics",
          targetClass: "Class 10",
          durationMinutes: 20,
          passingPercentage: 40,
          createdAt: new Date().toISOString(),
          status: "published",
          questions: [
            {
              id: "q_1",
              text: "What is the derivative of sin(x) with respect to x?",
              options: ["-cos(x)", "cos(x)", "-sin(x)", "tan(x)"],
              correctOption: 1,
              positiveMarks: 4,
              negativeMarks: 1,
            },
            {
              id: "q_2",
              text: "If sin(θ) = 1/2, what is the value of θ in degrees for the principal acute angle?",
              options: ["45°", "60°", "30°", "90°"],
              correctOption: 2,
              positiveMarks: 4,
              negativeMarks: 1,
            },
            {
              id: "q_3",
              text: "Which of the following is equivalent to 1 + tan²(θ)?",
              options: ["cot²(θ)", "sec²(θ)", "cosec²(θ)", "cos²(θ)"],
              correctOption: 1,
              positiveMarks: 4,
              negativeMarks: 1,
            },
          ],
        };
        setExams([sampleExam]);
        localStorage.setItem(`erp_online_exams_${schoolCode}`, JSON.stringify([sampleExam]));
      }

      const subsRaw = localStorage.getItem(`erp_exam_submissions_${schoolCode}`);
      if (subsRaw) {
        setSubmissions(JSON.parse(subsRaw));
      }
    } catch (e) {
      console.warn("Could not load exams:", e);
    }
  };

  const saveExamsToStorage = (updated) => {
    setExams(updated);
    try {
      localStorage.setItem(`erp_online_exams_${schoolCode}`, JSON.stringify(updated));
    } catch (e) {
      console.error("Storage error:", e);
    }
  };

  // Add Question to Form
  const handleAddQuestion = () => {
    setExamForm((prev) => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          id: `q_${Date.now()}_${prev.questions.length + 1}`,
          text: "",
          options: ["", "", "", ""],
          correctOption: 0,
          positiveMarks: 4,
          negativeMarks: 1,
        },
      ],
    }));
  };

  // Remove Question from Form
  const handleRemoveQuestion = (idx) => {
    if (examForm.questions.length <= 1) {
      showToast("An exam must have at least one question.", "error");
      return;
    }
    setExamForm((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== idx),
    }));
  };

  // Update Question Content
  const handleUpdateQuestion = (qIndex, field, value) => {
    setExamForm((prev) => {
      const qList = [...prev.questions];
      qList[qIndex] = { ...qList[qIndex], [field]: value };
      return { ...prev, questions: qList };
    });
  };

  // Update Question Option
  const handleUpdateOption = (qIndex, optIndex, value) => {
    setExamForm((prev) => {
      const qList = [...prev.questions];
      const newOpts = [...qList[qIndex].options];
      newOpts[optIndex] = value;
      qList[qIndex] = { ...qList[qIndex], options: newOpts };
      return { ...prev, questions: qList };
    });
  };

  // Submit Exam Form
  const handleCreateExam = (e) => {
    e.preventDefault();
    if (!examForm.title.trim()) {
      showToast("Please enter an Exam Title.", "error");
      return;
    }

    for (let i = 0; i < examForm.questions.length; i++) {
      const q = examForm.questions[i];
      if (!q.text.trim()) {
        showToast(`Please write question text for Question #${i + 1}`, "error");
        return;
      }
      for (let j = 0; j < 4; j++) {
        if (!q.options[j].trim()) {
          showToast(`Please provide Option ${String.fromCharCode(65 + j)} for Question #${i + 1}`, "error");
          return;
        }
      }
    }

    const newExam = {
      id: `exam_${Date.now()}`,
      title: examForm.title.trim(),
      subject: examForm.subject,
      targetClass: examForm.targetClass,
      durationMinutes: Number(examForm.durationMinutes) || 30,
      passingPercentage: Number(examForm.passingPercentage) || 40,
      instructions: examForm.instructions,
      questions: examForm.questions,
      createdAt: new Date().toISOString(),
      status: "published",
    };

    const updated = [newExam, ...exams];
    saveExamsToStorage(updated);
    setIsCreateModalOpen(false);
    showToast(`✅ Online Exam "${newExam.title}" published successfully!`, "success");

    // Reset Form
    setExamForm({
      title: "",
      subject: "Mathematics",
      targetClass: "Class 10",
      durationMinutes: 30,
      passingPercentage: 40,
      instructions: "All questions are compulsory. Negative marks apply for wrong answers.",
      questions: [
        {
          id: `q_1`,
          text: "",
          options: ["", "", "", ""],
          correctOption: 0,
          positiveMarks: 4,
          negativeMarks: 1,
        },
      ],
    });
  };

  // Delete Exam
  const handleDeleteExam = (examId) => {
    if (confirm("Are you sure you want to delete this exam?")) {
      const updated = exams.filter((e) => e.id !== examId);
      saveExamsToStorage(updated);
      showToast("Exam removed successfully.", "info");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20 text-white font-bold">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              Timed Online Exams & Auto-Scoring
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium">
                {schoolCode}
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Create Computer-Based Tests (CBT), configure positive/negative marking, and review instant auto-graded results.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-500/30 transition-all hover:scale-105 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          Create New Exam
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Active Online Tests</span>
            <BookOpen className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2">{exams.length}</p>
          <span className="text-[10px] text-slate-500">Live for student access</span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Total Submissions</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-blue-400 mt-2">{submissions.length}</p>
          <span className="text-[10px] text-slate-500">Graded automatically</span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Average Auto-Score</span>
            <BarChart2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-2">
            {submissions.length > 0
              ? `${Math.round(
                  submissions.reduce((acc, s) => acc + (s.percentage || 0), 0) /
                    submissions.length
                )}%`
              : "—"}
          </p>
          <span className="text-[10px] text-slate-500">Across all batches</span>
        </div>
      </div>

      {/* Active Exams Grid */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
          Published Examination Papers
        </h3>

        {exams.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
            <Award className="w-12 h-12 mx-auto text-slate-600 mb-2" />
            <p className="text-sm font-semibold">No online tests published yet.</p>
            <p className="text-xs text-slate-500 mt-1">Click "Create New Exam" above to author your first MCQ quiz.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exams.map((exam) => {
              const examSubs = submissions.filter((s) => s.examId === exam.id);
              const totalMarks = exam.questions.reduce(
                (acc, q) => acc + Number(q.positiveMarks || 4),
                0
              );

              return (
                <div
                  key={exam.id}
                  className="bg-slate-900/70 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4 transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {exam.subject}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {exam.targetClass}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-white leading-tight">{exam.title}</h4>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 pt-2 border-t border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>{exam.durationMinutes} Mins</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
                        <span>{exam.questions.length} Questions</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Total: {totalMarks} Marks</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{examSubs.length} Submissions</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setActiveSubmissionsExam(exam)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-400" />
                      View Submissions ({examSubs.length})
                    </button>
                    <button
                      onClick={() => handleDeleteExam(exam.id)}
                      className="p-2 text-slate-500 hover:text-rose-400 rounded-xl hover:bg-slate-800 transition-all cursor-pointer"
                      title="Delete Exam"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE EXAM MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-6 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Author Timed Online Examination</h3>
                  <p className="text-xs text-slate-400">Configure questions, options, positive & negative marking</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateExam} className="space-y-6">
              {/* Basic Meta Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-800/40 p-4 rounded-xl border border-slate-800">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Exam Title <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Physics Chapter 4: Light & Optics Quiz"
                    value={examForm.title}
                    onChange={(e) => setExamForm({ ...examForm, title: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Subject</label>
                  <select
                    value={examForm.subject}
                    onChange={(e) => setExamForm({ ...examForm, subject: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    {SUBJECTS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Target Class</label>
                  <select
                    value={examForm.targetClass}
                    onChange={(e) => setExamForm({ ...examForm, targetClass: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    {BATCHES.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="180"
                    value={examForm.durationMinutes}
                    onChange={(e) => setExamForm({ ...examForm, durationMinutes: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Passing Score (%)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={examForm.passingPercentage}
                    onChange={(e) => setExamForm({ ...examForm, passingPercentage: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Questions Builder */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400">
                    Questions Builder ({examForm.questions.length})
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/40 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Add Another Question
                  </button>
                </div>

                <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                  {examForm.questions.map((q, qIdx) => (
                    <div
                      key={q.id}
                      className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white bg-slate-700 px-2 py-0.5 rounded">
                          Question #{qIdx + 1}
                        </span>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-[11px] text-emerald-400">
                            <span>Correct:</span>
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={q.positiveMarks}
                              onChange={(e) => handleUpdateQuestion(qIdx, "positiveMarks", e.target.value)}
                              className="w-12 bg-slate-900 border border-slate-700 text-center rounded px-1 py-0.5 text-xs text-white"
                            />
                            <span>marks</span>
                          </div>

                          <div className="flex items-center gap-1 text-[11px] text-rose-400">
                            <span>Wrong: -</span>
                            <input
                              type="number"
                              min="0"
                              max="5"
                              value={q.negativeMarks}
                              onChange={(e) => handleUpdateQuestion(qIdx, "negativeMarks", e.target.value)}
                              className="w-12 bg-slate-900 border border-slate-700 text-center rounded px-1 py-0.5 text-xs text-white"
                            />
                            <span>marks</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveQuestion(qIdx)}
                            className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                            title="Remove Question"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Question Text */}
                      <textarea
                        rows={2}
                        required
                        placeholder="Write question statement here..."
                        value={q.text}
                        onChange={(e) => handleUpdateQuestion(qIdx, "text", e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                      ></textarea>

                      {/* 4 Options Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options.map((opt, optIdx) => (
                          <div
                            key={optIdx}
                            className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                              q.correctOption === optIdx
                                ? "bg-emerald-950/40 border-emerald-500/60"
                                : "bg-slate-900/60 border-slate-800"
                            }`}
                          >
                            <input
                              type="radio"
                              name={`correct_${q.id}`}
                              checked={q.correctOption === optIdx}
                              onChange={() => handleUpdateQuestion(qIdx, "correctOption", optIdx)}
                              className="cursor-pointer text-emerald-500"
                              title="Mark as correct answer"
                            />
                            <span className="text-xs font-bold text-slate-400">
                              {String.fromCharCode(65 + optIdx)}:
                            </span>
                            <input
                              type="text"
                              required
                              placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                              value={opt}
                              onChange={(e) => handleUpdateOption(qIdx, optIdx, e.target.value)}
                              className="flex-1 bg-transparent border-none text-xs text-white focus:outline-none"
                            />
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-400">
                        * Radio button selected indicates the correct answer for automated scoring.
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-600/30 cursor-pointer"
                >
                  Publish Online Exam
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW SUBMISSIONS MODAL */}
      {activeSubmissionsExam && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-purple-400" />
                  Submissions: {activeSubmissionsExam.title}
                </h3>
                <p className="text-xs text-slate-400">
                  {activeSubmissionsExam.subject} • {activeSubmissionsExam.targetClass}
                </p>
              </div>
              <button
                onClick={() => setActiveSubmissionsExam(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Submissions Table */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-800/80 text-slate-300 border-b border-slate-700 font-bold">
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4">Roll Number</th>
                      <th className="py-3 px-4">Correct / Total</th>
                      <th className="py-3 px-4">Auto-Score</th>
                      <th className="py-3 px-4">Percentage</th>
                      <th className="py-3 px-4">Result</th>
                      <th className="py-3 px-4">Submitted At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {submissions.filter((s) => s.examId === activeSubmissionsExam.id).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">
                          No student submissions recorded for this exam yet.
                        </td>
                      </tr>
                    ) : (
                      submissions
                        .filter((s) => s.examId === activeSubmissionsExam.id)
                        .map((sub, i) => (
                          <tr key={i} className="hover:bg-slate-800/40">
                            <td className="py-3 px-4 font-bold text-white">{sub.studentName}</td>
                            <td className="py-3 px-4 font-mono text-slate-400">{sub.rollNumber}</td>
                            <td className="py-3 px-4">
                              {sub.correctCount} / {sub.totalQuestions}
                            </td>
                            <td className="py-3 px-4 font-bold text-white">
                              {sub.score} / {sub.maxScore}
                            </td>
                            <td className="py-3 px-4 font-semibold text-blue-400">
                              {sub.percentage}%
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  sub.percentage >= activeSubmissionsExam.passingPercentage
                                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                    : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                }`}
                              >
                                {sub.percentage >= activeSubmissionsExam.passingPercentage ? "PASSED" : "FAILED"}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-400">
                              {new Date(sub.submittedAt).toLocaleString("en-IN")}
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveSubmissionsExam(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

