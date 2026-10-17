import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { getQuizzes } from "../utils/quizService";
import { useToast } from "../context/ToastContext";

export function formatMathText(text) {
  if (!text || typeof text !== "string") return text;
  return text
    .replace(/\$\$([^$]+)\$\$/g, "$1")
    .replace(/\$([^$]+)\$/g, "$1")
    .replace(/\\Delta/g, "Δ")
    .replace(/\\pm/g, "±")
    .replace(/\\sqrt\{([^}]+)\}/g, "√($1)")
    .replace(/\\sqrt/g, "√")
    .replace(/ax\^2/g, "ax²")
    .replace(/bx\^2/g, "bx²")
    .replace(/cx\^2/g, "cx²")
    .replace(/x\^2/g, "x²")
    .replace(/b\^2/g, "b²")
    .replace(/a\^2/g, "a²")
    .replace(/c\^2/g, "c²")
    .replace(/\^2/g, "²")
    .replace(/\^3/g, "³")
    .replace(/<=/g, "≤")
    .replace(/>=/g, "≥");
}

export default function StudentLMS() {
  const { user } = useContext(AppContext);
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState("lms"); // 'lms' or 'quizzes'
  const [quizzes, setQuizzes] = useState([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);

  const [materials] = useState([
    { id: 1, title: "Mathematics Chapter 4 Notes - Algebra & Quadratics", subject: "Mathematics", type: "PDF", size: "2.4 MB" },
    { id: 2, title: "Physics Laws of Motion & Momentum Summary Guide", subject: "Physics", type: "PDF", size: "3.1 MB" },
    { id: 3, title: "ICSE Chemistry Revision Guide & Periodic Formulas", subject: "Chemistry", type: "PDF", size: "1.8 MB" },
    { id: 4, title: "Computer Applications Java Algorithms Question Bank", subject: "Computers", type: "Document", size: "4.2 MB" },
  ]);

  // Quiz state
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [scoreResult, setScoreResult] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoadingQuizzes(true);
      try {
        const data = await getQuizzes(user?.school_id || user?.institution_code);
        setQuizzes(data);
      } catch (err) {
        console.error("Error loading quizzes:", err);
      } finally {
        setLoadingQuizzes(false);
      }
    };
    load();
  }, [user]);

  const handleStartQuiz = (quiz) => {
    setSelectedQuiz(quiz);
    setCurrentQIndex(0);
    setUserAnswers({});
    setScoreResult(null);
  };

  const handleSelectOption = (qIdx, optIdx) => {
    setUserAnswers((prev) => ({
      ...prev,
      [qIdx]: optIdx,
    }));
  };

  const handleSubmitQuiz = () => {
    if (!selectedQuiz || !selectedQuiz.questions || selectedQuiz.questions.length === 0) return;

    let correctCount = 0;
    const details = selectedQuiz.questions.map((q, idx) => {
      const selected = userAnswers[idx];
      const isCorrect = selected === q.correct_answer;
      if (isCorrect) correctCount += 1;
      return {
        question: q.question,
        options: q.options,
        selectedOption: selected !== undefined ? q.options[selected] : "Not Answered",
        correctOption: q.options[q.correct_answer],
        isCorrect,
        explanation: q.explanation || "Standard curriculum concept.",
      };
    });

    const total = selectedQuiz.questions.length;
    const percentage = Math.round((correctCount / total) * 100);

    setScoreResult({
      correctCount,
      total,
      percentage,
      details,
    });

    showToast(`Quiz submitted! You scored ${percentage}% (${correctCount}/${total})`, "success");
  };

  const handleDownloadResource = (mat) => {
    showToast(`Downloading "${mat.title}" (${mat.size})...`, "info");
  };

  return (
    <div className="relative text-slate-200 min-h-full pb-10 font-sans">
      <div className="fixed top-0 left-10 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* HEADER */}
        <div className="mb-8 flex justify-between items-center flex-wrap gap-4">
          <div>
            <p className="text-purple-300 text-sm font-semibold mb-1 uppercase tracking-widest">
              Student Academic Learning Management System
            </p>
            <h1 className="text-3xl font-extrabold text-white">LMS Study Hub & Quizzes 📖</h1>
            <p className="text-slate-400 text-sm mt-1">
              Interactive faculty study notes, term revision sheets, and dynamic automated test series
            </p>
          </div>
          <div className="flex gap-2 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700">
            <button
              onClick={() => setActiveTab("lms")}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                activeTab === "lms"
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              📚 LMS Study Vault
            </button>
            <button
              onClick={() => setActiveTab("quizzes")}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                activeTab === "quizzes"
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              ⚡ Interactive Quizzes ({quizzes.length})
            </button>
          </div>
        </div>

        {/* TAB 1: STUDY MATERIALS */}
        {activeTab === "lms" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {materials.map((mat) => (
              <div
                key={mat.id}
                className="bg-[#1E293B]/70 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-6 shadow-2xl flex flex-col justify-between group hover:border-purple-500/50 transition-all"
              >
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1 rounded-xl text-xs font-bold uppercase">
                      {mat.subject}
                    </span>
                    <span className="text-slate-400 text-xs font-mono font-bold">{mat.size}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-purple-300 transition-colors">
                    {mat.title}
                  </h3>
                  <p className="text-slate-400 text-xs mb-6">
                    Verified ICSE reference document uploaded by departmental faculty for semester revision.
                  </p>
                </div>
                <button
                  onClick={() => handleDownloadResource(mat)}
                  className="w-full bg-slate-800/80 hover:bg-purple-600 text-white font-bold py-3 px-4 rounded-xl transition-all border border-slate-700 hover:border-purple-500 flex items-center justify-center gap-2 text-xs cursor-pointer"
                >
                  <span>📥</span> Download PDF Resource
                </button>
              </div>
            ))}
          </div>
        ) : (
          /* TAB 2: INTERACTIVE QUIZZES */
          <div>
            {selectedQuiz ? (
              /* ACTIVE QUIZ EXPERIENCE */
              <div className="bg-[#1E293B]/80 backdrop-blur-2xl border border-slate-700/60 rounded-3xl p-6 sm:p-8 shadow-2xl max-w-3xl mx-auto">
                {/* QUIZ HEADER */}
                <div className="flex justify-between items-center mb-6 border-b border-slate-700/80 pb-4">
                  <div>
                    <span className="text-xs font-bold uppercase text-purple-400">
                      {selectedQuiz.subject} • {selectedQuiz.className || "Class 10 ICSE"}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-white">{selectedQuiz.title}</h2>
                  </div>
                  <button
                    onClick={() => setSelectedQuiz(null)}
                    className="text-slate-400 hover:text-white font-bold text-xs bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 cursor-pointer"
                  >
                    ✕ Exit Quiz
                  </button>
                </div>

                {scoreResult !== null ? (
                  /* SCORE BREAKDOWN & PERFORMANCE REPORT */
                  <div className="space-y-6">
                    <div className="text-center py-6 bg-slate-900/60 border border-slate-800 rounded-3xl space-y-2">
                      <div className="text-5xl">
                        {scoreResult.percentage >= 75 ? "🏆" : scoreResult.percentage >= 50 ? "🎯" : "📖"}
                      </div>
                      <h3 className="text-2xl font-black text-white">Quiz Completed!</h3>
                      <p className="text-slate-400 text-sm">
                        You answered{" "}
                        <span className="text-white font-bold">
                          {scoreResult.correctCount} of {scoreResult.total}
                        </span>{" "}
                        questions correctly.
                      </p>
                      <div className="pt-2">
                        <span
                          className={`text-4xl font-black px-4 py-1.5 rounded-2xl ${
                            scoreResult.percentage >= 75
                              ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/30"
                              : scoreResult.percentage >= 50
                              ? "text-amber-400 bg-amber-500/10 border border-amber-500/30"
                              : "text-rose-400 bg-rose-500/10 border border-rose-500/30"
                          }`}
                        >
                          {scoreResult.percentage}%
                        </span>
                      </div>
                    </div>

                    {/* DETAILED QUESTION-BY-QUESTION REVIEW */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Detailed Answer Review
                      </h4>
                      {scoreResult.details.map((item, idx) => (
                        <div
                          key={idx}
                          className={`p-4 rounded-2xl border text-sm space-y-2 ${
                            item.isCorrect
                              ? "bg-emerald-950/20 border-emerald-500/30"
                              : "bg-rose-950/20 border-rose-500/30"
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <p className="font-bold text-white">
                              {idx + 1}. {formatMathText(item.question)}
                            </p>
                            <span
                              className={`text-xs font-black uppercase px-2 py-0.5 rounded ${
                                item.isCorrect
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : "bg-rose-500/20 text-rose-400"
                              }`}
                            >
                              {item.isCorrect ? "Correct ✓" : "Incorrect ✗"}
                            </span>
                          </div>
                          <div className="text-xs space-y-1">
                            <p className="text-slate-300">
                              Your Answer:{" "}
                              <span
                                className={
                                  item.isCorrect ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"
                                }
                              >
                                {formatMathText(item.selectedOption)}
                              </span>
                            </p>
                            {!item.isCorrect && (
                              <p className="text-emerald-400">
                                Correct Answer: <span className="font-bold">{formatMathText(item.correctOption)}</span>
                              </p>
                            )}
                            <p className="text-slate-400 italic pt-1">💡 {formatMathText(item.explanation)}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => handleStartQuiz(selectedQuiz)}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 px-4 rounded-xl border border-slate-700 transition-all text-xs cursor-pointer"
                      >
                        🔄 Retake Quiz
                      </button>
                      <button
                        onClick={() => setSelectedQuiz(null)}
                        className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-purple-600/30 transition-all text-xs cursor-pointer"
                      >
                        Back to Quizzes
                      </button>
                    </div>
                  </div>
                ) : (
                  /* QUIZ QUESTION INTERACTION */
                  <div className="space-y-6">
                    {selectedQuiz.questions && selectedQuiz.questions.length > 0 ? (
                      <div>
                        {/* PROGRESS BAR */}
                        <div className="flex justify-between items-center text-xs font-bold text-slate-400 mb-2">
                          <span>
                            Question {currentQIndex + 1} of {selectedQuiz.questions.length}
                          </span>
                          <span className="text-purple-400">
                            {Object.keys(userAnswers).length} answered
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-6">
                          <div
                            className="bg-purple-500 h-full transition-all duration-300"
                            style={{
                              width: `${((currentQIndex + 1) / selectedQuiz.questions.length) * 100}%`,
                            }}
                          ></div>
                        </div>

                        {/* QUESTION BOX */}
                        {(() => {
                          const currentQ = selectedQuiz.questions[currentQIndex];
                          if (!currentQ) return null;

                          return (
                            <div className="space-y-5">
                              <div className="bg-slate-900/70 p-5 rounded-2xl border border-slate-800">
                                <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-full inline-block mb-3">
                                  Question {currentQIndex + 1}
                                </span>
                                <h3 className="text-base sm:text-lg font-bold text-white leading-relaxed">
                                  {formatMathText(currentQ.question)}
                                </h3>
                              </div>

                              {/* 4 OPTIONS */}
                              <div className="space-y-3">
                                {currentQ.options.map((opt, optIdx) => {
                                  const isSelected = userAnswers[currentQIndex] === optIdx;
                                  return (
                                    <div
                                      key={optIdx}
                                      onClick={() => handleSelectOption(currentQIndex, optIdx)}
                                      className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center gap-3 ${
                                        isSelected
                                          ? "bg-purple-600/20 border-purple-500 shadow-md shadow-purple-600/20 text-white"
                                          : "bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700"
                                      }`}
                                    >
                                      <div
                                        className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-black flex-shrink-0 ${
                                          isSelected
                                            ? "border-purple-400 bg-purple-600 text-white"
                                            : "border-slate-700 text-slate-400"
                                        }`}
                                      >
                                        {String.fromCharCode(65 + optIdx)}
                                      </div>
                                      <span className="font-semibold text-sm">{formatMathText(opt)}</span>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* NAVIGATION & SUBMIT BUTTONS */}
                              <div className="flex justify-between items-center pt-4">
                                <button
                                  type="button"
                                  onClick={() => setCurrentQIndex((prev) => Math.max(0, prev - 1))}
                                  disabled={currentQIndex === 0}
                                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 font-bold py-2.5 px-4 rounded-xl border border-slate-700 text-xs transition-all cursor-pointer"
                                >
                                  ← Previous
                                </button>

                                {currentQIndex < selectedQuiz.questions.length - 1 ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setCurrentQIndex((prev) =>
                                        Math.min(selectedQuiz.questions.length - 1, prev + 1)
                                      )
                                    }
                                    className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 px-5 rounded-xl text-xs transition-all cursor-pointer"
                                  >
                                    Next Question →
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={handleSubmitQuiz}
                                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black py-3 px-6 rounded-xl shadow-lg shadow-emerald-600/30 text-xs transition-all cursor-pointer"
                                  >
                                    Submit Final Quiz Answers 🚀
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <p className="text-center text-slate-400 py-6">No questions loaded for this quiz.</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* QUIZZES LIST */
              <div>
                {loadingQuizzes ? (
                  <div className="text-center py-12 text-slate-400">Loading interactive quizzes...</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {quizzes.map((q) => (
                      <div
                        key={q.id}
                        className="bg-[#1E293B]/70 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-6 shadow-2xl flex flex-col justify-between hover:border-purple-500/50 transition-all group"
                      >
                        <div>
                          <div className="flex justify-between items-center mb-3">
                            <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1 rounded-xl text-xs font-bold uppercase">
                              {q.subject}
                            </span>
                            <span className="text-slate-400 text-xs font-mono font-bold">
                              ⏱️ {q.duration || "15 mins"}
                            </span>
                          </div>
                          <h3 className="text-lg font-bold text-white mb-2 group-hover:text-purple-300 transition-colors">
                            {q.title}
                          </h3>
                          <p className="text-slate-400 text-xs mb-4">
                            Batch: <span className="text-slate-300 font-semibold">{q.className || "Class 10 ICSE"}</span> |{" "}
                            Questions: <span className="text-emerald-400 font-bold">{q.questions?.length || 0}</span>
                          </p>
                        </div>
                        <button
                          onClick={() => handleStartQuiz(q)}
                          className="w-full bg-purple-600 hover:bg-purple-500 text-white font-extrabold py-3 px-4 rounded-xl shadow-lg shadow-purple-600/30 transition-all text-xs flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <span>🚀</span> Start Interactive Quiz
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}