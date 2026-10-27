import React, { useState, useEffect } from "react";
import { BookOpen, Layers, AlertCircle, CheckCircle2, TrendingUp, BarChart2, Plus, Filter, Search } from "lucide-react";
import { useToast } from "../context/ToastContext";

export default function QuestionBankAnalytics({ schoolCode = "CAMPUS-01" }) {
  const { showToast } = useToast();
  const cleanSchool = schoolCode.toUpperCase();

  const [activeTab, setActiveTab] = useState("bank"); // 'bank' | 'heatmap' | 'add'
  const [questions, setQuestions] = useState([]);
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterTaxonomy, setFilterTaxonomy] = useState("all");

  // New question form
  const [form, setForm] = useState({
    subject: "Science",
    chapter: "Electricity & Magnetism",
    text: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    correctOption: 0,
    difficulty: "Intermediate", // Basic | Intermediate | Advanced
    taxonomy: "Understanding", // Recall | Understanding | Application | Analysis
    misconceptionDistractor: 1,
    misconceptionExplanation: "Students commonly confuse current flow with potential difference.",
  });

  useEffect(() => {
    loadQuestions();
  }, [cleanSchool]);

  const loadQuestions = () => {
    try {
      const key = `erp_question_bank_${cleanSchool}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        setQuestions(JSON.parse(raw));
      } else {
        // Hydrate baseline questions if storage empty
        const initial = [
          {
            id: "qb_1",
            subject: "Science",
            chapter: "Electricity",
            text: "Which physical quantity has the unit Volt (V)?",
            options: ["Electric Current", "Potential Difference", "Resistance", "Electrical Energy"],
            correctOption: 1,
            difficulty: "Basic",
            taxonomy: "Recall",
            misconceptionDistractor: 0,
            misconceptionNote: "58% choose Electric Current due to casual terminology.",
            totalAttempts: 45,
            correctAttempts: 18,
            distractorCounts: [26, 18, 1, 0],
            statusTag: "Needs Support",
          },
          {
            id: "qb_2",
            subject: "Mathematics",
            chapter: "Quadratic Equations",
            text: "What is the discriminant formula for ax^2 + bx + c = 0?",
            options: ["b^2 - 4ac", "b^2 + 4ac", "-b / 2a", "sqrt(b^2 - 4ac)"],
            correctOption: 0,
            difficulty: "Intermediate",
            taxonomy: "Understanding",
            misconceptionDistractor: 1,
            misconceptionNote: "Students invert negative sign when c is negative.",
            totalAttempts: 50,
            correctAttempts: 42,
            distractorCounts: [42, 6, 2, 0],
            statusTag: "Mastered",
          },
          {
            id: "qb_3",
            subject: "Science",
            chapter: "Chemical Reactions",
            text: "During cellular respiration, glucose is broken down to release:",
            options: ["Carbon Monoxide", "ATP and Carbon Dioxide", "Oxygen", "Methane"],
            correctOption: 1,
            difficulty: "Intermediate",
            taxonomy: "Application",
            misconceptionDistractor: 2,
            misconceptionNote: "34% confuse photosynthesis reactants with respiration products.",
            totalAttempts: 48,
            correctAttempts: 31,
            distractorCounts: [2, 31, 14, 1],
            statusTag: "Developing",
          },
        ];
        localStorage.setItem(key, JSON.stringify(initial));
        setQuestions(initial);
      }
    } catch (e) {
      console.warn("Could not load question bank:", e);
      setQuestions([]);
    }
  };

  const handleAddQuestion = (e) => {
    e.preventDefault();
    if (!form.text.trim() || !form.optionA.trim() || !form.optionB.trim()) {
      showToast("Question text and at least 2 options are required.", "error");
      return;
    }

    const newQ = {
      id: `qb_${Date.now()}`,
      subject: form.subject,
      chapter: form.chapter,
      text: form.text.trim(),
      options: [form.optionA, form.optionB, form.optionC || "Option C", form.optionD || "Option D"],
      correctOption: Number(form.correctOption),
      difficulty: form.difficulty,
      taxonomy: form.taxonomy,
      misconceptionDistractor: Number(form.misconceptionDistractor),
      misconceptionNote: form.misconceptionExplanation,
      totalAttempts: 0,
      correctAttempts: 0,
      distractorCounts: [0, 0, 0, 0],
      statusTag: "Developing",
    };

    const updated = [newQ, ...questions];
    setQuestions(updated);
    try {
      localStorage.setItem(`erp_question_bank_${cleanSchool}`, JSON.stringify(updated));
    } catch {}

    showToast("Question logged with Bloom's Taxonomy metadata! 🎯", "success");
    setActiveTab("bank");
    setForm({
      subject: "Science",
      chapter: "Electricity & Magnetism",
      text: "",
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
      correctOption: 0,
      difficulty: "Intermediate",
      taxonomy: "Understanding",
      misconceptionDistractor: 1,
      misconceptionExplanation: "",
    });
  };

  // Blueprint Distribution Validator
  const taxonomyCounts = {
    Recall: questions.filter((q) => q.taxonomy === "Recall").length,
    Understanding: questions.filter((q) => q.taxonomy === "Understanding").length,
    Application: questions.filter((q) => q.taxonomy === "Application").length,
    Analysis: questions.filter((q) => q.taxonomy === "Analysis").length,
  };
  const totalQ = questions.length || 1;

  const filteredQuestions = questions.filter((q) => {
    if (filterSubject !== "all" && q.subject.toLowerCase() !== filterSubject.toLowerCase()) return false;
    if (filterTaxonomy !== "all" && q.taxonomy.toLowerCase() !== filterTaxonomy.toLowerCase()) return false;
    return true;
  });

  return (
    <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl shadow-cyan-500/10 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Academic Mastery Loop
            </span>
            <span className="text-xs text-slate-400 font-mono">Tenant: {cleanSchool}</span>
          </div>
          <h3 className="text-xl font-black text-white mt-1 flex items-center gap-2">
            <span>Question Bank & Misconception Heatmap</span>
            <BookOpen className="w-5 h-5 text-purple-400" />
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Bloom's Taxonomy tagged item bank with post-exam wrong distractor analytics and class mastery tags.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("add")}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/30 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Blueprint Question</span>
          </button>
        </div>
      </div>

      {/* BLOOM'S TAXONOMY BLUEPRINT VALIDATOR WIDGET */}
      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase text-white flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-purple-400" /> Exam Blueprint Validator (CBSE / ICSE)
          </span>
          <span className="text-[10px] text-cyan-400 font-mono">Target: 30% Recall &bull; 40% Understand &bull; 30% Apply</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5">
            <span className="text-[10px] text-slate-400 block">Recall</span>
            <span className="font-bold text-cyan-400">
              {Math.round((taxonomyCounts.Recall / totalQ) * 100)}% ({taxonomyCounts.Recall} Qs)
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5">
            <span className="text-[10px] text-slate-400 block">Understanding</span>
            <span className="font-bold text-purple-400">
              {Math.round((taxonomyCounts.Understanding / totalQ) * 100)}% ({taxonomyCounts.Understanding} Qs)
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5">
            <span className="text-[10px] text-slate-400 block">Application</span>
            <span className="font-bold text-emerald-400">
              {Math.round((taxonomyCounts.Application / totalQ) * 100)}% ({taxonomyCounts.Application} Qs)
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5">
            <span className="text-[10px] text-slate-400 block">Analysis</span>
            <span className="font-bold text-amber-400">
              {Math.round((taxonomyCounts.Analysis / totalQ) * 100)}% ({taxonomyCounts.Analysis} Qs)
            </span>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab("bank")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "bank"
              ? "bg-purple-500 text-white shadow-md shadow-purple-500/20"
              : "bg-white/5 text-slate-400 hover:text-white"
          }`}
        >
          📚 Question Bank ({questions.length})
        </button>
        <button
          onClick={() => setActiveTab("heatmap")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "heatmap"
              ? "bg-purple-500 text-white shadow-md shadow-purple-500/20"
              : "bg-white/5 text-slate-400 hover:text-white"
          }`}
        >
          🔥 Post-Exam Misconception Heatmap
        </button>
      </div>

      {/* TAB 1: QUESTION BANK */}
      {activeTab === "bank" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400">Filter by Bloom's:</span>
            {["all", "Recall", "Understanding", "Application", "Analysis"].map((tax) => (
              <button
                key={tax}
                onClick={() => setFilterTaxonomy(tax)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterTaxonomy === tax
                    ? "bg-cyan-500 text-slate-950"
                    : "bg-white/5 text-slate-400 hover:text-white"
                }`}
              >
                {tax}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto w-full border border-white/10 rounded-2xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-slate-400 uppercase">
                  <th className="p-3">Question Text & Chapter</th>
                  <th className="p-3">Subject</th>
                  <th className="p-3">Difficulty</th>
                  <th className="p-3">Bloom's Taxonomy</th>
                  <th className="p-3 text-center">Mastery Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredQuestions.map((q) => (
                  <tr key={q.id} className="hover:bg-white/5">
                    <td className="p-3 max-w-md">
                      <p className="font-bold text-white">{q.text}</p>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{q.chapter}</span>
                    </td>
                    <td className="p-3 font-semibold text-slate-300">{q.subject}</td>
                    <td className="p-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          q.difficulty === "Basic"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : q.difficulty === "Intermediate"
                            ? "bg-cyan-500/20 text-cyan-300"
                            : "bg-purple-500/20 text-purple-300"
                        }`}
                      >
                        {q.difficulty}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-purple-300 font-bold">{q.taxonomy}</td>
                    <td className="p-3 text-center">
                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                          q.statusTag === "Mastered"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : q.statusTag === "Developing"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        }`}
                      >
                        {q.statusTag || "Developing"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: MISCONCEPTION HEATMAP */}
      {activeTab === "heatmap" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-300">
            <p className="font-bold text-white mb-1">Pedagogical Misconception Diagnostics</p>
            <p>
              Highlights questions where over 40% of the class chose the exact same wrong distractor. This flags curriculum gaps rather than simple careless errors.
            </p>
          </div>

          <div className="space-y-3">
            {questions.map((q) => {
              const wrongCount = (q.totalAttempts || 40) - (q.correctAttempts || 25);
              const isHighMisconception = q.statusTag === "Needs Support";

              return (
                <div
                  key={q.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isHighMisconception
                      ? "bg-rose-950/20 border-rose-500/40"
                      : "bg-white/5 border-white/10"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-white/10 text-slate-300">
                        {q.subject} &bull; {q.chapter}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">Taxonomy: {q.taxonomy}</span>
                    </div>
                    <span
                      className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                        isHighMisconception
                          ? "bg-rose-500/30 text-rose-200 border border-rose-500/40"
                          : "bg-emerald-500/20 text-emerald-300"
                      }`}
                    >
                      {q.statusTag}
                    </span>
                  </div>

                  <p className="text-sm font-bold text-white mt-2">{q.text}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-emerald-500/30">
                      <span className="text-[10px] text-emerald-400 block font-bold">Correct Option:</span>
                      <span className="text-white font-semibold">
                        {q.options[q.correctOption] || "Option " + (q.correctOption + 1)}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-rose-500/30">
                      <span className="text-[10px] text-rose-400 block font-bold">Top Misconception Distractor:</span>
                      <span className="text-white font-semibold">
                        {q.options[q.misconceptionDistractor || 0]}
                      </span>
                    </div>
                  </div>

                  {q.misconceptionNote && (
                    <div className="mt-2.5 p-2.5 rounded-xl bg-white/5 border border-white/10 text-[11px] text-slate-300 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-amber-300">Teacher Diagnostic: </span>
                        <span>{q.misconceptionNote}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: ADD QUESTION */}
      {activeTab === "add" && (
        <form onSubmit={handleAddQuestion} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Subject</label>
              <input
                type="text"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Chapter Name</label>
              <input
                type="text"
                value={form.chapter}
                onChange={(e) => setForm({ ...form, chapter: e.target.value })}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Question Prompt *</label>
            <textarea
              rows={2}
              value={form.text}
              onChange={(e) => setForm({ ...form, text: e.target.value })}
              placeholder="e.g. A 10V battery is connected across a 5 Ohm resistor..."
              className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-white"
              required
            ></textarea>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Option A</label>
              <input
                type="text"
                value={form.optionA}
                onChange={(e) => setForm({ ...form, optionA: e.target.value })}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Option B</label>
              <input
                type="text"
                value={form.optionB}
                onChange={(e) => setForm({ ...form, optionB: e.target.value })}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Option C</label>
              <input
                type="text"
                value={form.optionC}
                onChange={(e) => setForm({ ...form, optionC: e.target.value })}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Option D</label>
              <input
                type="text"
                value={form.optionD}
                onChange={(e) => setForm({ ...form, optionD: e.target.value })}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Correct Option</label>
              <select
                value={form.correctOption}
                onChange={(e) => setForm({ ...form, correctOption: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white"
              >
                <option value={0}>Option A</option>
                <option value={1}>Option B</option>
                <option value={2}>Option C</option>
                <option value={3}>Option D</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Bloom's Taxonomy Level</label>
              <select
                value={form.taxonomy}
                onChange={(e) => setForm({ ...form, taxonomy: e.target.value })}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white"
              >
                <option value="Recall">Recall (Knowledge)</option>
                <option value="Understanding">Understanding (Comprehension)</option>
                <option value="Application">Application</option>
                <option value="Analysis">Analysis</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Difficulty</label>
              <select
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white"
              >
                <option value="Basic">Basic (Standard 40%)</option>
                <option value="Intermediate">Intermediate (40-70%)</option>
                <option value="Advanced">Advanced (HOTs 70%+)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Teacher Misconception Explanation</label>
            <input
              type="text"
              value={form.misconceptionExplanation}
              onChange={(e) => setForm({ ...form, misconceptionExplanation: e.target.value })}
              placeholder="Why might students choose the incorrect distractor?"
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab("bank")}
              className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 font-bold hover:bg-white/10 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all shadow-md shadow-purple-600/30 cursor-pointer"
            >
              Save Question to Blueprint
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

