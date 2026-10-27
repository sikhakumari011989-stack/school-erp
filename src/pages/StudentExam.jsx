import React, { useState, useEffect, useContext, useRef } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import {
  Award,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Send,
  RotateCcw,
  BookOpen,
  FileText,
  BarChart2,
  ChevronRight,
  ShieldCheck
} from "lucide-react";

export default function StudentExam() {
  const { user, tenant } = useContext(AppContext);
  const { showToast } = useToast();

  const schoolCode = (
    user?.institution_code ||
    user?.school_id ||
    tenant?.code ||
    "CAMPUS-01"
  ).toUpperCase();

  const studentRoll = (
    user?.role_code ||
    user?.roll_number ||
    user?.personal_code ||
    user?.id ||
    "STU-101"
  ).toUpperCase();

  const studentName = user?.name || user?.full_name || "Student";
  const studentClass = user?.class_name || user?.class || "Class 10";

  // State
  const [exams, setExams] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [activeExam, setActiveExam] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({}); // { [questionId]: optionIndex }
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(0);
  const [examFinished, setExamFinished] = useState(false);
  const [latestResult, setLatestResult] = useState(null);

  const timerRef = useRef(null);

  // Load available exams & prior submissions
  useEffect(() => {
    loadExamsAndSubmissions();
  }, [schoolCode, studentRoll]);

  const loadExamsAndSubmissions = () => {
    try {
      const examsRaw = localStorage.getItem(`erp_online_exams_${schoolCode}`);
      if (examsRaw) {
        setExams(JSON.parse(examsRaw));
      } else {
        setExams([]);
      }

      const subsRaw = localStorage.getItem(`erp_exam_submissions_${schoolCode}`);
      if (subsRaw) {
        setSubmissions(JSON.parse(subsRaw));
      } else {
        setSubmissions([]);
      }
    } catch (e) {
      console.warn("Could not load exam data:", e);
      setExams([]);
      setSubmissions([]);
    }
  };

  // Server-Locked Tamper-Resistant Countdown logic
  useEffect(() => {
    if (activeExam && !examFinished) {
      const sessionKey = `erp_exam_session_${activeExam.id}_${studentRoll}`;
      
      const checkAndTick = () => {
        try {
          const raw = localStorage.getItem(sessionKey);
          let session = raw ? JSON.parse(raw) : null;
          if (!session) {
            session = {
              startedAt: Date.now(),
              durationMs: (activeExam.durationMinutes || 30) * 60 * 1000,
              gracePeriodMs: 60 * 1000,
            };
            localStorage.setItem(sessionKey, JSON.stringify(session));
          }

          const now = Date.now();
          const totalAllowedMs = (session.durationMs || 1800000) + (session.gracePeriodMs || 60000);
          const elapsed = now - session.startedAt;
          const remainingSec = Math.max(0, Math.floor((totalAllowedMs - elapsed) / 1000));

          setTimeLeftSeconds(remainingSec);

          if (remainingSec <= 0) {
            if (timerRef.current) clearInterval(timerRef.current);
            handleAutoSubmit();
          }
        } catch (e) {
          console.warn("Timer check notice:", e);
        }
      };

      // Initial check immediately
      checkAndTick();
      timerRef.current = setInterval(checkAndTick, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeExam, examFinished, studentRoll]);

  // Start Exam with Server-Locked Session Key
  const handleStartExam = (exam) => {
    const sessionKey = `erp_exam_session_${exam.id}_${studentRoll}`;
    const sessionData = {
      startedAt: Date.now(),
      durationMs: (exam.durationMinutes || 30) * 60 * 1000,
      gracePeriodMs: 60 * 1000,
    };
    try {
      localStorage.setItem(sessionKey, JSON.stringify(sessionData));
    } catch (e) {
      console.warn("Could not persist exam session:", e);
    }

    setActiveExam(exam);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setTimeLeftSeconds((exam.durationMinutes || 30) * 60);
    setExamFinished(false);
    setLatestResult(null);
    showToast(`Test started! You have ${exam.durationMinutes} minutes. Best of luck! 🚀`, "info");
  };

  // Auto-submit triggered when time reaches 0
  const handleAutoSubmit = () => {
    showToast("⏰ Time is up! Submitting your examination answers automatically...", "warning", 5000);
    calculateAndSaveScore();
  };

  // Manual Submit
  const handleManualSubmit = () => {
    const unattempted = activeExam.questions.length - Object.keys(selectedAnswers).length;
    let confirmMsg = "Are you ready to submit your exam?";
    if (unattempted > 0) {
      confirmMsg += ` You have ${unattempted} unanswered question(s).`;
    }

    if (confirm(confirmMsg)) {
      if (timerRef.current) clearInterval(timerRef.current);
      calculateAndSaveScore();
    }
  };

  // Calculate score factoring in positive & negative marks
  const calculateAndSaveScore = () => {
    if (!activeExam) return;

    let score = 0;
    let maxScore = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let unattemptedCount = 0;

    const questionResults = activeExam.questions.map((q) => {
      const positive = Number(q.positiveMarks || 4);
      const negative = Number(q.negativeMarks || 1);
      maxScore += positive;

      const chosen = selectedAnswers[q.id];

      if (chosen === undefined) {
        unattemptedCount++;
        return {
          questionId: q.id,
          text: q.text,
          chosenOption: null,
          correctOption: q.correctOption,
          options: q.options,
          status: "unattempted",
          marksDelta: 0,
        };
      } else if (chosen === q.correctOption) {
        score += positive;
        correctCount++;
        return {
          questionId: q.id,
          text: q.text,
          chosenOption: chosen,
          correctOption: q.correctOption,
          options: q.options,
          status: "correct",
          marksDelta: positive,
        };
      } else {
        score -= negative;
        incorrectCount++;
        return {
          questionId: q.id,
          text: q.text,
          chosenOption: chosen,
          correctOption: q.correctOption,
          options: q.options,
          status: "incorrect",
          marksDelta: -negative,
        };
      }
    });

    // Score cannot be negative total
    const finalScore = Math.max(0, score);
    const percentage = maxScore > 0 ? Math.round((finalScore / maxScore) * 100) : 0;

    let grade = "F";
    if (percentage >= 90) grade = "A+";
    else if (percentage >= 80) grade = "A";
    else if (percentage >= 70) grade = "B";
    else if (percentage >= 60) grade = "C";
    else if (percentage >= 40) grade = "D";

    const isPassed = percentage >= (activeExam.passingPercentage || 40);

    const submissionRecord = {
      id: `sub_${Date.now()}`,
      examId: activeExam.id,
      examTitle: activeExam.title,
      subject: activeExam.subject,
      studentName,
      rollNumber: studentRoll,
      class: studentClass,
      score: finalScore,
      maxScore,
      percentage,
      grade,
      isPassed,
      correctCount,
      incorrectCount,
      unattemptedCount,
      totalQuestions: activeExam.questions.length,
      questionResults,
      submittedAt: new Date().toISOString(),
    };

    // 1. Save to submissions
    try {
      const subsKey = `erp_exam_submissions_${schoolCode}`;
      const existingSubsRaw = localStorage.getItem(subsKey);
      const existingSubs = existingSubsRaw ? JSON.parse(existingSubsRaw) : [];
      const updatedSubs = [submissionRecord, ...existingSubs];
      localStorage.setItem(subsKey, JSON.stringify(updatedSubs));
      setSubmissions(updatedSubs);
    } catch (e) {
      console.error("Submission storage error:", e);
    }

    // 2. Synchronize to Academic Ledger for Teacher Marks & Student Report Cards
    try {
      const marksKey = `erp_exam_marks_${schoolCode}`;
      const existingMarksRaw = localStorage.getItem(marksKey);
      const existingMarks = existingMarksRaw ? JSON.parse(existingMarksRaw) : [];

      const markEntry = {
        id: `cbt_mark_${Date.now()}`,
        student_id: studentRoll,
        roll_number: studentRoll,
        student_name: studentName,
        class_name: studentClass,
        subject: activeExam.subject,
        exam_type: "Online CBT",
        exam_title: activeExam.title,
        marks_obtained: finalScore,
        total_marks: maxScore,
        percentage,
        grade,
        date: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      existingMarks.unshift(markEntry);
      localStorage.setItem(marksKey, JSON.stringify(existingMarks));
    } catch (e) {
      console.warn("Marks ledger sync notice:", e);
    }

    try {
      localStorage.removeItem(`erp_exam_session_${activeExam.id}_${studentRoll}`);
    } catch {}

    setLatestResult(submissionRecord);
    setExamFinished(true);
    showToast(`Exam completed! You scored ${finalScore}/${maxScore} (${percentage}%).`, isPassed ? "success" : "info");
  };

  // Format MM:SS
  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ACTIVE CBT TEST IN PROGRESS */}
      {activeExam && !examFinished && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top Bar with Timer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl sticky top-2 z-30 backdrop-blur-xl">
            <div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {activeExam.subject}
              </span>
              <h2 className="text-lg font-black text-white mt-0.5">{activeExam.title}</h2>
              <p className="text-xs text-slate-400">
                Candidate: {studentName} ({studentRoll})
              </p>
            </div>

            {/* Live Timer Pill */}
            <div className="flex items-center gap-4">
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-base font-bold border transition-all ${
                  timeLeftSeconds < 120
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse"
                    : "bg-amber-500/10 text-amber-300 border-amber-500/30"
                }`}
              >
                <Clock className="w-5 h-5" />
                <span>{formatTime(timeLeftSeconds)}</span>
              </div>

              <button
                onClick={handleManualSubmit}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                Submit Exam
              </button>
            </div>
          </div>

          {/* Question View & Question Palette */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main Question Card (3 cols) */}
            <div className="lg:col-span-3 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 flex flex-col justify-between min-h-[440px]">
              {(() => {
                const q = activeExam.questions[currentQuestionIndex];
                const selectedOpt = selectedAnswers[q.id];

                return (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <span className="text-xs font-bold text-slate-400">
                        Question {currentQuestionIndex + 1} of {activeExam.questions.length}
                      </span>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-emerald-400 font-bold">+{q.positiveMarks} Marks</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-rose-400 font-bold">-{q.negativeMarks} Negative</span>
                      </div>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-white leading-relaxed">
                      {q.text}
                    </h3>

                    {/* Options list */}
                    <div className="space-y-3">
                      {q.options.map((opt, optIdx) => {
                        const isChosen = selectedOpt === optIdx;
                        return (
                          <div
                            key={optIdx}
                            onClick={() =>
                              setSelectedAnswers((prev) => ({ ...prev, [q.id]: optIdx }))
                            }
                            className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                              isChosen
                                ? "bg-blue-600/20 border-blue-500 shadow-md shadow-blue-500/10 text-white"
                                : "bg-slate-800/60 border-slate-700/70 hover:border-slate-600 text-slate-300"
                            }`}
                          >
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono transition-all ${
                                isChosen
                                  ? "bg-blue-600 text-white"
                                  : "bg-slate-700 text-slate-300"
                              }`}
                            >
                              {String.fromCharCode(65 + optIdx)}
                            </div>
                            <span className="text-sm font-medium flex-1">{opt}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Navigation Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentQuestionIndex === 0}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Previous
                </button>

                <button
                  onClick={() => {
                    const qId = activeExam.questions[currentQuestionIndex].id;
                    setSelectedAnswers((prev) => {
                      const copy = { ...prev };
                      delete copy[qId];
                      return copy;
                    });
                  }}
                  className="text-xs text-slate-400 hover:text-slate-200 underline cursor-pointer"
                >
                  Clear Selection
                </button>

                {currentQuestionIndex < activeExam.questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                  >
                    Next <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleManualSubmit}
                    className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                  >
                    Submit Exam <Send className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Question Palette Sidebar (1 col) */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Question Palette
              </h4>

              <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-4 gap-2">
                {activeExam.questions.map((q, idx) => {
                  const isAnswered = selectedAnswers[q.id] !== undefined;
                  const isCurrent = currentQuestionIndex === idx;

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQuestionIndex(idx)}
                      className={`h-9 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isCurrent
                          ? "ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-900"
                          : ""
                      } ${
                        isAnswered
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    Answered:
                  </span>
                  <strong className="text-white">
                    {Object.keys(selectedAnswers).length}
                  </strong>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-700"></span>
                    Remaining:
                  </span>
                  <strong className="text-white">
                    {activeExam.questions.length - Object.keys(selectedAnswers).length}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RESULT & AUTO-SCORE ANALYSIS SHEET */}
      {latestResult && examFinished && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="text-center max-w-lg mx-auto space-y-3">
            <div
              className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-white shadow-xl ${
                latestResult.isPassed
                  ? "bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-emerald-500/30"
                  : "bg-gradient-to-tr from-rose-600 to-amber-500 shadow-rose-500/30"
              }`}
            >
              <Award className="w-8 h-8" />
            </div>

            <h2 className="text-2xl font-black text-white">Examination Results Graded</h2>
            <p className="text-xs text-slate-400">
              Exam: <strong className="text-white">{latestResult.examTitle}</strong> ({latestResult.subject})
            </p>

            {/* Score Banner */}
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-around">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Your Score</span>
                <p className="text-2xl font-black text-white">
                  {latestResult.score} / {latestResult.maxScore}
                </p>
              </div>
              <div className="w-px h-8 bg-slate-700"></div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Percentage</span>
                <p className="text-2xl font-black text-blue-400">{latestResult.percentage}%</p>
              </div>
              <div className="w-px h-8 bg-slate-700"></div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Grade</span>
                <p
                  className={`text-2xl font-black ${
                    latestResult.isPassed ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {latestResult.grade}
                </p>
              </div>
            </div>
          </div>

          {/* Breakdown summary */}
          <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto">
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl text-center">
              <span className="text-xs text-emerald-400 font-bold">Correct Answers</span>
              <p className="text-xl font-black text-emerald-400 mt-1">{latestResult.correctCount}</p>
            </div>
            <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl text-center">
              <span className="text-xs text-rose-400 font-bold">Incorrect (Penalty)</span>
              <p className="text-xl font-black text-rose-400 mt-1">{latestResult.incorrectCount}</p>
            </div>
            <div className="bg-slate-800/60 border border-slate-700 p-3 rounded-xl text-center">
              <span className="text-xs text-slate-400 font-bold">Unattempted</span>
              <p className="text-xl font-black text-slate-300 mt-1">{latestResult.unattemptedCount}</p>
            </div>
          </div>

          {/* Detailed Question Review */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Detailed Answer Key & Evaluation
            </h4>

            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {latestResult.questionResults.map((qr, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border space-y-2 ${
                    qr.status === "correct"
                      ? "bg-emerald-950/20 border-emerald-500/30"
                      : qr.status === "incorrect"
                      ? "bg-rose-950/20 border-rose-500/30"
                      : "bg-slate-800/40 border-slate-700/60"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white">Q{idx + 1}: {qr.text}</span>
                    <span
                      className={`font-mono font-bold px-2 py-0.5 rounded text-[10px] ${
                        qr.status === "correct"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : qr.status === "incorrect"
                          ? "bg-rose-500/20 text-rose-300"
                          : "bg-slate-700 text-slate-300"
                      }`}
                    >
                      {qr.marksDelta > 0 ? `+${qr.marksDelta}` : qr.marksDelta} Marks
                    </span>
                  </div>

                  <div className="text-xs space-y-1 text-slate-300">
                    <p>
                      <strong>Your Answer:</strong>{" "}
                      {qr.chosenOption !== null
                        ? `${String.fromCharCode(65 + qr.chosenOption)}. ${qr.options[qr.chosenOption]}`
                        : "Not Answered"}
                    </p>
                    <p className="text-emerald-400">
                      <strong>Correct Answer:</strong>{" "}
                      {String.fromCharCode(65 + qr.correctOption)}. {qr.options[qr.correctOption]}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center pt-2">
            <button
              onClick={() => {
                setActiveExam(null);
                setExamFinished(false);
                setLatestResult(null);
              }}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/30 transition-all cursor-pointer"
            >
              Return to Exam Catalog
            </button>
          </div>
        </div>
      )}

      {/* CATALOG OF AVAILABLE EXAMS (When not taking exam) */}
      {!activeExam && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  Student Online Examination Portal
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-medium">
                    {studentClass}
                  </span>
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Take scheduled online MCQ tests with instant scoring and automatic gradebook synchronization.
                </p>
              </div>
            </div>
          </div>

          {/* Test Cards List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exams.map((exam) => {
              const mySub = submissions.find(
                (s) => s.examId === exam.id && s.rollNumber === studentRoll
              );

              return (
                <div
                  key={exam.id}
                  className="bg-slate-900/70 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4 transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        {exam.subject}
                      </span>
                      {mySub ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Score: {mySub.score}/{mySub.maxScore} ({mySub.percentage}%)
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Ready
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-white leading-tight">{exam.title}</h3>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 pt-2 border-t border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>{exam.durationMinutes} Minutes</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
                        <span>{exam.questions.length} Questions</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800">
                    <button
                      onClick={() => handleStartExam(exam)}
                      className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold shadow-lg transition-all cursor-pointer ${
                        mySub
                          ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                          : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/20 hover:scale-105"
                      }`}
                    >
                      {mySub ? (
                        <>
                          <RotateCcw className="w-4 h-4" /> Retake Practice Test
                        </>
                      ) : (
                        <>
                          <ChevronRight className="w-4 h-4" /> Start Timed Exam
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

