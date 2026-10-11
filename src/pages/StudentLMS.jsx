import React, { useState } from "react";

export default function StudentLMS() {
  const [activeTab, setActiveTab] = useState("lms"); // 'lms' or 'quizzes'
  const [materials] = useState([
    { id: 1, title: "Mathematics Chapter 4 Notes - Algebra", subject: "Mathematics", type: "PDF" },
    { id: 2, title: "Physics Laws of Motion Summary", subject: "Physics", type: "Document" },
    { id: 3, title: "ICSE Chemistry Revision Guide", subject: "Chemistry", type: "PDF" }
  ]);
  const [quizzes] = useState([
    { id: 1, title: "Algebra Weekly Test", subject: "Mathematics", questions: 10, duration: "15 mins" },
    { id: 2, title: "Periodic Table Quick Quiz", subject: "Chemistry", questions: 15, duration: "20 mins" }
  ]);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [score, setScore] = useState(null);

  const handleStartQuiz = (quiz) => {
    setSelectedQuiz(quiz);
    setScore(null);
  };

  const handleSubmitQuiz = () => {
    setScore(85); // Mock score for MVP evaluation
  };

  return (
    <div className="relative text-slate-200 min-h-full pb-10">
      <div className="fixed top-0 left-10 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10">
        <div className="mb-8 flex justify-between items-center flex-wrap gap-4">
          <div>
            <p className="text-purple-300 text-sm font-semibold mb-1 uppercase tracking-widest">Student Academic Portal</p>
            <h1 className="text-3xl font-extrabold text-white">LMS Hub & Quizzes 📖</h1>
          </div>
          <div className="flex gap-2 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700">
            <button
              onClick={() => setActiveTab("lms")}
              className={`px-5 py-2 rounded-xl font-bold text-sm transition-all ${
                activeTab === "lms" ? "bg-purple-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
              }`}
            >
              LMS Study Hub
            </button>
            <button
              onClick={() => setActiveTab("quizzes")}
              className={`px-5 py-2 rounded-xl font-bold text-sm transition-all ${
                activeTab === "quizzes" ? "bg-purple-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
              }`}
            >
              Interactive Quizzes
            </button>
          </div>
        </div>

        {activeTab === "lms" ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {materials.map((mat) => (
              <div key={mat.id} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col justify-between group hover:border-purple-500/50 transition-all">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="bg-purple-500/20 text-purple-400 border border-purple-500/30 px-3 py-1 rounded-xl text-xs font-bold uppercase">
                      {mat.subject}
                    </span>
                    <span className="text-slate-400 text-xs font-bold">{mat.type}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-purple-300 transition-colors">
                    {mat.title}
                  </h3>
                  <p className="text-slate-400 text-xs mb-6">Uploaded by faculty for term preparation.</p>
                </div>
                <button 
                  onClick={() => alert("Downloading resource...")}
                  className="w-full bg-slate-800 hover:bg-purple-600 text-white font-bold py-3 px-4 rounded-xl transition-all border border-slate-700 hover:border-purple-500 flex items-center justify-center gap-2"
                >
                  <span>📥</span> Download Material
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div>
            {selectedQuiz ? (
              <div className="bg-[#1E293B] border border-slate-700 rounded-3xl p-8 shadow-2xl max-w-2xl mx-auto">
                <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
                  <h2 className="text-xl font-extrabold text-white">{selectedQuiz.title}</h2>
                  <button onClick={() => setSelectedQuiz(null)} className="text-slate-400 hover:text-white font-bold">
                    ✕ Exit Quiz
                  </button>
                </div>

                {score !== null ? (
                  <div className="text-center py-10 space-y-4">
                    <div className="text-6xl">🏆</div>
                    <h3 className="text-2xl font-bold text-white">Quiz Completed!</h3>
                    <p className="text-slate-400 text-lg">Your Score: <span className="text-emerald-400 font-extrabold">{score}%</span></p>
                    <button 
                      onClick={() => setSelectedQuiz(null)}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-8 py-3 rounded-xl shadow-lg mt-4"
                    >
                      Back to Quizzes
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                      <p className="text-xs text-purple-400 font-bold uppercase mb-1">Question 1 of {selectedQuiz.questions}</p>
                      <p className="text-white font-bold text-base">What is the discriminant of a quadratic equation $ax^2 + bx + c = 0$?</p>
                    </div>

                    <div className="space-y-3">
                      {["$b^2 - 4ac$", "$b^2 + 4ac$", "$\\sqrt{b^2 - 4ac}$", "$-b \\pm \\sqrt{b^2 - 4ac}$"].map((opt, i) => (
                        <label key={i} className="flex items-center gap-3 bg-slate-900 border border-slate-700 hover:border-purple-500 p-4 rounded-xl cursor-pointer transition-all">
                          <input type="radio" name="quiz_opt" className="text-purple-600 focus:ring-purple-500" />
                          <span className="text-white font-medium">{opt}</span>
                        </label>
                      ))}
                    </div>

                    <button 
                      onClick={handleSubmitQuiz}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-purple-600/30 transition-all mt-6"
                    >
                      Submit Quiz Answer
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {quizzes.map((q) => (
                  <div key={q.id} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl flex justify-between items-center">
                    <div>
                      <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-xl text-xs font-bold uppercase mb-3 inline-block">
                        {q.subject}
                      </span>
                      <h3 className="text-xl font-bold text-white mb-2">{q.title}</h3>
                      <p className="text-slate-400 text-xs">Questions: {q.questions} | Duration: {q.duration}</p>
                    </div>
                    <button
                      onClick={() => handleStartQuiz(q)}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-purple-600/20 transition-all"
                    >
                      Start Quiz 🚀
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}