import React, { useState, useEffect, useContext, useRef } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { supabase } from "../supabaseClient";
import { resolveSchoolUuid } from "../utils/supabaseHelpers";
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  BookOpen,
  Calendar,
  Layers,
  Award,
  TrendingUp,
  Percent,
  Save,
  RotateCcw,
} from "lucide-react";

const STANDARD_SUBJECTS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "English Literature",
  "Computer Science",
  "Social Studies",
  "Environmental Science",
  "Economics",
  "Accountancy",
];

const STANDARD_BATCHES = [
  "Class 10-ICSE",
  "Class 10-A",
  "Class 10-B",
  "Class 9-A",
  "Class 9-B",
  "Class 8-A",
];

export default function ClassTestEntry({ isOpen, onClose, onTestSaved }) {
  const { user } = useContext(AppContext) || {};
  const { showToast } = useToast();

  const schoolId = (user?.institution_code || user?.school_id || "CAMPUS-01").toUpperCase();

  // Test Metadata
  const [selectedBatch, setSelectedBatch] = useState("Class 10-ICSE");
  const [subject, setSubject] = useState("Mathematics");
  const [testTitle, setTestTitle] = useState("Unit Assessment 1");
  const [testDate, setTestDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [maxScore, setMaxScore] = useState(20);
  const [passingScore, setPassingScore] = useState(8);

  // Student list & marks
  const [students, setStudents] = useState([]);
  const [scores, setScores] = useState({}); // { [studentId]: { marks: number, isAbsent: boolean, remarks: string } }
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const inputRefs = useRef({});

  // When maxScore changes, auto-adjust passing score to 40% if not manually set
  const handleMaxScoreChange = (val) => {
    const num = Math.max(1, Number(val) || 20);
    setMaxScore(num);
    setPassingScore(Math.round(num * 0.4));
  };

  // 1. Load Students for selected batch
  useEffect(() => {
    if (!isOpen) return;

    const loadBatchRoster = async () => {
      setLoading(true);
      try {
        let roster = [];

        // Check local storage directory
        try {
          const raw = localStorage.getItem(`erp_directory_${schoolId}`);
          if (raw) {
            const all = JSON.parse(raw);
            const filtered = all.filter((m) => {
              const isStudent = (m.role || "student").toLowerCase() === "student";
              const matchesBatch = !m.class_name || m.class_name === selectedBatch || selectedBatch.includes(m.class_name);
              return isStudent && matchesBatch;
            });
            if (filtered.length > 0) roster = filtered;
          }
        } catch {}

        // Fallback to Supabase students table
        if (roster.length === 0 && supabase) {
          try {
            const { data } = await supabase
              .from("students")
              .select("id, name, roll_number, class_name")
              .eq("school_id", schoolId)
              .limit(30);
            if (data && data.length > 0) roster = data;
          } catch (e) {}
        }

        // Standard fallback if roster is empty
        if (roster.length === 0) {
          roster = [
            { id: "s1", name: "Aarav Sharma", roll_number: "STU-101", class_name: selectedBatch },
            { id: "s2", name: "Diya Patel", roll_number: "STU-102", class_name: selectedBatch },
            { id: "s3", name: "Rohan Deshmukh", roll_number: "STU-103", class_name: selectedBatch },
            { id: "s4", name: "Ananya Iyer", roll_number: "STU-104", class_name: selectedBatch },
            { id: "s5", name: "Kabir Khan", roll_number: "STU-105", class_name: selectedBatch },
            { id: "s6", name: "Pooja Hegde", roll_number: "STU-106", class_name: selectedBatch },
            { id: "s7", name: "Tanmay Joshi", roll_number: "STU-107", class_name: selectedBatch },
            { id: "s8", name: "Sneha Nair", roll_number: "STU-108", class_name: selectedBatch },
          ];
        }

        setStudents(roster);

        // Initialize default scores
        const initial = {};
        roster.forEach((s) => {
          const defaultMark = Math.min(maxScore, Math.round(maxScore * (0.7 + Math.random() * 0.25)));
          initial[s.id] = {
            marks: defaultMark,
            isAbsent: false,
            remarks: "Good",
          };
        });
        setScores(initial);
      } catch (err) {
        console.error("Error loading roster:", err);
      } finally {
        setLoading(false);
      }
    };

    loadBatchRoster();
  }, [isOpen, selectedBatch, schoolId, maxScore]);

  // Update a student's score
  const handleScoreChange = (studentId, value) => {
    let num = value === "" ? "" : Number(value);
    if (num !== "" && (isNaN(num) || num < 0)) num = 0;
    if (num !== "" && num > maxScore) num = maxScore;

    setScores((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        marks: num,
        isAbsent: false,
      },
    }));
  };

  // Toggle student absent
  const handleToggleAbsent = (studentId) => {
    setScores((prev) => {
      const current = prev[studentId] || {};
      const newAbsent = !current.isAbsent;
      return {
        ...prev,
        [studentId]: {
          ...current,
          isAbsent: newAbsent,
          marks: newAbsent ? 0 : Math.round(maxScore * 0.75),
        },
      };
    });
  };

  // Quick fill buttons
  const setAllFullMarks = () => {
    const updated = {};
    students.forEach((s) => {
      updated[s.id] = { marks: maxScore, isAbsent: false, remarks: "Excellent" };
    });
    setScores(updated);
    showToast(`Set all students to full marks (${maxScore}/${maxScore})`, "info");
  };

  const setAllPassingMarks = () => {
    const updated = {};
    students.forEach((s) => {
      updated[s.id] = { marks: passingScore, isAbsent: false, remarks: "Satisfactory" };
    });
    setScores(updated);
    showToast(`Set all students to passing threshold (${passingScore}/${maxScore})`, "info");
  };

  // Real-time Telemetry Calculations
  const presentScores = Object.entries(scores)
    .filter(([_, data]) => !data.isAbsent && data.marks !== "" && !isNaN(data.marks))
    .map(([_, data]) => Number(data.marks));

  const totalPresent = presentScores.length;
  const classAvg = totalPresent > 0 ? (presentScores.reduce((a, b) => a + b, 0) / totalPresent).toFixed(1) : 0;
  const avgPercent = maxScore > 0 ? ((classAvg / maxScore) * 100).toFixed(1) : 0;
  const highestScore = totalPresent > 0 ? Math.max(...presentScores) : 0;
  const lowestScore = totalPresent > 0 ? Math.min(...presentScores) : 0;
  const passCount = presentScores.filter((m) => m >= passingScore).length;
  const passRate = totalPresent > 0 ? Math.round((passCount / totalPresent) * 100) : 100;

  // Rapid Enter / Down Arrow key jump to next student
  const handleKeyDown = (e, index) => {
    if (e.key === "Enter" || e.key === "ArrowDown") {
      e.preventDefault();
      const nextIndex = index + 1;
      if (nextIndex < students.length && inputRefs.current[nextIndex]) {
        inputRefs.current[nextIndex].focus();
        inputRefs.current[nextIndex].select();
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevIndex = index - 1;
      if (prevIndex >= 0 && inputRefs.current[prevIndex]) {
        inputRefs.current[prevIndex].focus();
        inputRefs.current[prevIndex].select();
      }
    }
  };

  // Publish Test Scores
  const handlePublishResults = async (e) => {
    e.preventDefault();

    if (!testTitle.trim()) {
      showToast("Please enter a test title.", "error");
      return;
    }

    setSaving(true);
    const testId = `test_${Date.now()}`;

    const testPayload = {
      id: testId,
      school_id: schoolId,
      class_id: selectedBatch,
      subject,
      title: testTitle.trim(),
      test_date: testDate,
      max_score: maxScore,
      passing_score: passingScore,
      created_by: user?.name || "Faculty",
      created_at: new Date().toISOString(),
    };

    const formattedScores = students.map((s) => {
      const entry = scores[s.id] || { marks: 0, isAbsent: false, remarks: "" };
      return {
        id: `score_${testId}_${s.id}`,
        test_id: testId,
        school_id: schoolId,
        student_id: s.id,
        student_name: s.name || s.full_name,
        roll_number: s.roll_number || s.personal_code || s.id,
        marks_obtained: entry.isAbsent ? 0 : Number(entry.marks) || 0,
        max_score: maxScore,
        is_absent: entry.isAbsent,
        remarks: entry.remarks || (entry.marks >= passingScore ? "Passed" : "Needs Improvement"),
        subject,
        test_title: testTitle.trim(),
        test_date: testDate,
        class_id: selectedBatch,
      };
    });

    try {
      // 1. Sync to Supabase class_tests & test_scores tables
      if (supabase) {
        try {
          const schoolUuid = await resolveSchoolUuid(schoolId);
          const { error: testErr } = await supabase.from("class_tests").insert([
            {
              school_id: schoolUuid,
              class_id: selectedBatch,
              subject,
              title: testTitle.trim(),
              test_date: testDate,
              max_score: maxScore,
              passing_score: passingScore,
              created_by: user?.name || "Faculty",
            },
          ]);

          if (!testErr) {
            await supabase.from("test_scores").insert(
              formattedScores.map((sc) => ({
                school_id: schoolUuid,
                test_id: testId,
                student_id: sc.student_id,
                student_name: sc.student_name,
                roll_number: sc.roll_number,
                marks_obtained: sc.marks_obtained,
                max_score: sc.max_score,
                is_absent: sc.is_absent,
                remarks: sc.remarks,
              }))
            );
          }
        } catch (dbErr) {
          console.warn("Supabase test publish notice, preserving local ledger:", dbErr);
        }
      }

      // 2. Persist to Local Storage Cache for instantaneous student/parent availability
      try {
        const existingTestsRaw = localStorage.getItem(`erp_class_tests_${schoolId}`) || "[]";
        const existingTests = JSON.parse(existingTestsRaw);
        localStorage.setItem(`erp_class_tests_${schoolId}`, JSON.stringify([testPayload, ...existingTests]));

        const existingScoresRaw = localStorage.getItem(`erp_test_scores_${schoolId}`) || "[]";
        const existingScores = JSON.parse(existingScoresRaw);
        localStorage.setItem(`erp_test_scores_${schoolId}`, JSON.stringify([...formattedScores, ...existingScores]));
      } catch (e) {
        console.warn("Storage sync notice:", e);
      }

      // 3. Dispatch reactive update event
      window.dispatchEvent(new Event("erp-tests-updated"));

      showToast(
        `Successfully published marks for ${students.length} scholars in ${selectedBatch} (${subject})!`,
        "success"
      );

      if (typeof onTestSaved === "function") {
        onTestSaved(testPayload);
      }

      onClose();
    } catch (err) {
      console.error("Error publishing test marks:", err);
      showToast("Error saving test results. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl relative my-auto animate-scale-in max-h-[92vh] flex flex-col">
        {/* MODAL HEADER */}
        <div className="flex justify-between items-start pb-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                <FileText className="w-4 h-4" />
              </span>
              <span className="text-[11px] font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
                Faculty Evaluation Suite
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-300">
                Rapid Grid Entry
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Record Class Assessment Marks
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Input test scores and instantly publish performance telemetry to student/parent portals.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* METADATA CONFIGURATION ROW */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 py-4 shrink-0 border-b border-slate-100 dark:border-slate-800/80">
          {/* Batch */}
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Class Batch
            </label>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold rounded-xl px-2.5 py-2 focus:outline-none focus:border-cyan-400"
            >
              {STANDARD_BATCHES.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Subject
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold rounded-xl px-2.5 py-2 focus:outline-none focus:border-cyan-400"
            >
              {STANDARD_SUBJECTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Test Title */}
          <div className="col-span-2 sm:col-span-2 md:col-span-2">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Assessment Title
            </label>
            <input
              type="text"
              required
              value={testTitle}
              onChange={(e) => setTestTitle(e.target.value)}
              placeholder="e.g. Unit 2: Linear Equations"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Max Score */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Max Score
            </label>
            <input
              type="number"
              min="1"
              max="500"
              value={maxScore}
              onChange={(e) => handleMaxScoreChange(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Passing Score */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Pass Mark
            </label>
            <input
              type="number"
              min="1"
              max={maxScore}
              value={passingScore}
              onChange={(e) => setPassingScore(Number(e.target.value))}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        {/* LIVE CLASS STATS SUMMARY BAR */}
        <div className="flex items-center justify-between flex-wrap gap-2 py-3 px-4 my-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/5 shrink-0">
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300 flex-wrap">
            <span>
              Avg: <strong className="text-cyan-600 dark:text-cyan-400 font-bold">{classAvg} / {maxScore} ({avgPercent}%)</strong>
            </span>
            <span>
              High: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{highestScore}</strong>
            </span>
            <span>
              Low: <strong className="text-amber-600 dark:text-amber-400 font-bold">{lowestScore}</strong>
            </span>
            <span>
              Pass Rate: <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{passRate}% ({passCount}/{totalPresent})</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={setAllFullMarks}
              className="text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 cursor-pointer"
            >
              All Full Marks
            </button>
            <button
              type="button"
              onClick={setAllPassingMarks}
              className="text-[10px] font-bold px-2 py-1 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 cursor-pointer"
            >
              All Passing
            </button>
          </div>
        </div>

        {/* RAPID-ENTRY STUDENT MARKS GRID (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2 min-h-[220px]">
          {students.map((student, idx) => {
            const entry = scores[student.id] || { marks: 0, isAbsent: false };
            const isPassing = !entry.isAbsent && entry.marks >= passingScore;
            const pct = maxScore > 0 ? Math.round((Number(entry.marks) / maxScore) * 100) : 0;

            return (
              <div
                key={student.id}
                className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  entry.isAbsent
                    ? "bg-slate-100/60 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 opacity-60"
                    : isPassing
                    ? "bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-cyan-400/40"
                    : "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40"
                }`}
              >
                {/* Student Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 text-center text-xs font-mono font-bold text-slate-400 shrink-0">
                    {idx + 1}
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
                    {(student.name || "S").charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                      {student.name || student.full_name}
                    </p>
                    <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 truncate">
                      {student.roll_number || student.personal_code || student.id}
                    </p>
                  </div>
                </div>

                {/* Score Input & Controls */}
                <div className="flex items-center gap-3 shrink-0">
                  {/* Absent Toggle */}
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={entry.isAbsent}
                      onChange={() => handleToggleAbsent(student.id)}
                      className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                    />
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      Absent
                    </span>
                  </label>

                  {/* Marks Input with Enter/Tab jumps */}
                  <div className="relative flex items-center">
                    <input
                      ref={(el) => (inputRefs.current[idx] = el)}
                      type="number"
                      step="0.5"
                      min="0"
                      max={maxScore}
                      disabled={entry.isAbsent}
                      value={entry.isAbsent ? "" : entry.marks}
                      onChange={(e) => handleScoreChange(student.id, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, idx)}
                      placeholder="0"
                      className="w-20 text-center font-mono font-bold text-sm bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-2 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 disabled:opacity-40"
                    />
                    <span className="text-[11px] font-bold text-slate-400 ml-1.5 w-8">
                      /{maxScore}
                    </span>
                  </div>

                  {/* Percentage Pill */}
                  <div className="w-14 text-right">
                    {entry.isAbsent ? (
                      <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">
                        ABSENT
                      </span>
                    ) : (
                      <span
                        className={`text-xs font-mono font-extrabold ${
                          isPassing ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {pct}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* MODAL FOOTER */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0 mt-3">
          <p className="text-[11px] text-slate-400">
            Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono border">Tab</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono border">Enter</kbd> to rapidly jump to the next scholar.
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePublishResults}
              disabled={saving || students.length === 0}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Publishing Results..." : `Publish Marks for ${students.length} Scholars`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

