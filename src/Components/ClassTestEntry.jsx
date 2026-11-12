import React, { useState, useEffect, useContext, useRef, useCallback } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import {
  fetchStudentsForClass,
  createClassTest,
  saveClassTestScores,
  getClassTestsForTeacher,
  getScoresForTest,
} from "../utils/classTestMarksService";
import {
  AlertCircle,
  X,
  BookOpen,
  Layers,
  Save,
  Check,
  Send,
  Plus,
  UserX,
  UserCheck,
  ChevronRight,
} from "lucide-react";

export default function ClassTestEntry({ isOpen = true, onClose, onTestSaved, isStandalone = false }) {
  const { user } = useContext(AppContext) || {};
  const { showToast } = useToast();

  const schoolId = (user?.institution_code || user?.school_id || "CAMPUS-01").toUpperCase();

  // Tab State: 'entry' (New/Edit Test) vs 'history' (Previously Entered Tests)
  const [activeTab, setActiveTab] = useState("entry");

  // Assigned Classes & Subjects resolution
  const [assignedClasses, setAssignedClasses] = useState(["Class 10-A", "Class 10-B", "Class 9-A"]);
  const [assignedSubjects] = useState([
    "Mathematics",
    "Physics",
    "Chemistry",
    "Biology",
    "English Literature",
    "Computer Science",
    "Social Studies",
  ]);

  // Test Header Form
  const [selectedClass, setSelectedClass] = useState("Class 10-A");
  const [selectedSection] = useState("A");
  const [subject, setSubject] = useState("Mathematics");
  const [testTitle, setTestTitle] = useState("Mathematics Unit Test 1");
  const [testDate, setTestDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [maxScore, setMaxScore] = useState(20);
  const [passingScore, setPassingScore] = useState(8);

  // Active Test ID if editing an existing test
  const [editingTestId, setEditingTestId] = useState(null);
  const [testStatus, setTestStatus] = useState("draft");

  // Roster & Marks
  const [students, setStudents] = useState([]);
  const [scores, setScores] = useState({}); // { [studentId]: { marks: number | string, isAbsent: boolean, remarks: string, rollNumber: string, name: string } }
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [savingState, setSavingState] = useState("idle"); // 'idle' | 'saving' | 'saved' | 'error'

  // History Tab State
  const [historyTests, setHistoryTests] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyFilterClass, setHistoryFilterClass] = useState("ALL");

  // Confirmation Modal for Publishing
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);

  // Ref array for keyboard navigation (Roll No. input jumps)
  const inputRefs = useRef([]);

  // Resolve faculty assigned classes & subjects
  useEffect(() => {
    const classesSet = new Set();
    if (user?.assigned_classes) {
      const arr = Array.isArray(user.assigned_classes)
        ? user.assigned_classes
        : String(user.assigned_classes).split(",");
      arr.forEach((c) => c.trim() && classesSet.add(c.trim()));
    }
    if (user?.class_name && user.class_name !== "Faculty") {
      classesSet.add(user.class_name.trim());
    }

    // Try reading classes from local directory
    try {
      const raw = localStorage.getItem(`erp_directory_${schoolId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        parsed.forEach((item) => {
          if (item.class_name && (item.role || "").toLowerCase() === "student") {
            classesSet.add(item.class_name.trim());
          }
        });
      }
    } catch {}

    const resolved = Array.from(classesSet);
    if (resolved.length > 0) {
      setAssignedClasses(resolved);
      if (!resolved.includes(selectedClass)) {
        setSelectedClass(resolved[0]);
      }
    }

    if (user?.subject) {
      setSubject(user.subject);
    }
  }, [user, schoolId]);

  // Load student roster when class changes or when creating a new test
  const loadRoster = useCallback(async () => {
    setLoadingRoster(true);
    setSavingState("idle");
    try {
      const roster = await fetchStudentsForClass(schoolId, selectedClass);
      setStudents(roster);

      // If we are editing an existing test, load its saved scores
      if (editingTestId) {
        const existingScores = await getScoresForTest(schoolId, editingTestId);
        const map = {};
        roster.forEach((s) => {
          const found = existingScores.find((sc) => String(sc.student_id) === String(s.id) || String(sc.roll_number) === String(s.roll_number));
          if (found) {
            map[s.id] = {
              marks: found.is_absent ? "" : found.marks_obtained,
              isAbsent: Boolean(found.is_absent),
              remarks: found.remarks || "",
              rollNumber: s.roll_number,
              name: s.name,
            };
          } else {
            map[s.id] = {
              marks: "",
              isAbsent: false,
              remarks: "",
              rollNumber: s.roll_number,
              name: s.name,
            };
          }
        });
        setScores(map);
      } else {
        // New test: initialize clean empty inputs (No mock random marks)
        const initial = {};
        roster.forEach((s) => {
          initial[s.id] = {
            marks: "",
            isAbsent: false,
            remarks: "",
            rollNumber: s.roll_number,
            name: s.name,
          };
        });
        setScores(initial);
      }
    } catch (err) {
      console.error("[ClassTestEntry] Error loading student roster:", err);
      showToast("Unable to load student roster for selected class.", "error");
    } finally {
      setLoadingRoster(false);
    }
  }, [schoolId, selectedClass, editingTestId, showToast]);

  useEffect(() => {
    if (isOpen || isStandalone) {
      loadRoster();
    }
  }, [isOpen, isStandalone, loadRoster]);

  // Load history tests
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const list = await getClassTestsForTeacher({
        schoolId,
        actor: user,
      });
      setHistoryTests(list);
    } catch (err) {
      console.error("[ClassTestEntry] Error loading test history:", err);
    } finally {
      setLoadingHistory(false);
    }
  }, [schoolId, user]);

  useEffect(() => {
    if (activeTab === "history") {
      loadHistory();
    }
  }, [activeTab, loadHistory]);

  // Max score change handler
  const handleMaxScoreChange = (val) => {
    const num = Math.max(1, Number(val) || 20);
    setMaxScore(num);
    setPassingScore(Math.round(num * 0.4));
  };

  // Student marks input change
  const handleScoreChange = (studentId, rawValue) => {
    setSavingState("idle");
    setScores((prev) => {
      const current = prev[studentId] || {};
      return {
        ...prev,
        [studentId]: {
          ...current,
          marks: rawValue,
          isAbsent: false,
        },
      };
    });
  };

  // Toggle student absent status
  const handleToggleAbsent = (studentId) => {
    setSavingState("idle");
    setScores((prev) => {
      const current = prev[studentId] || {};
      const nextAbsent = !current.isAbsent;
      return {
        ...prev,
        [studentId]: {
          ...current,
          isAbsent: nextAbsent,
          marks: nextAbsent ? "" : current.marks,
        },
      };
    });
  };

  // Keyboard Navigation: Enter or Down Arrow jumps to next row, Up Arrow jumps to previous
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

  // Save Marks (Draft or Published)
  const handleSaveMarks = async (publish = false) => {
    if (!testTitle.trim()) {
      showToast("Please enter a test title (e.g. 'Mathematics Unit Test 1').", "error");
      return;
    }

    // Pre-validation: ensure no scores exceed maxScore or are negative
    const invalidEntry = students.find((s) => {
      const sc = scores[s.id];
      if (!sc || sc.isAbsent || sc.marks === "" || sc.marks === undefined || sc.marks === null) return false;
      const num = Number(sc.marks);
      return isNaN(num) || num < 0 || num > maxScore;
    });

    if (invalidEntry) {
      const invalidMarks = scores[invalidEntry.id]?.marks;
      showToast(`Marks entered for ${invalidEntry.name} (${invalidMarks}) exceed maximum allowable score (${maxScore}).`, "error");
      setSavingState("error");
      return;
    }

    setSavingState("saving");

    try {
      // 1. Ensure test record exists or create one
      let targetTestId = editingTestId;

      if (!targetTestId) {
        const created = await createClassTest({
          schoolId,
          classId: selectedClass,
          section: selectedSection,
          subject,
          title: testTitle.trim(),
          testDate,
          maxScore,
          passingScore,
          actor: user,
        });
        targetTestId = created.id;
        setEditingTestId(created.id);
      }

      // 2. Prepare score list
      const scorePayload = students.map((s) => {
        const sc = scores[s.id] || {};
        const raw = sc.marks;
        const resolvedMarks = sc.isAbsent
          ? 0
          : (raw === "" || raw === null || raw === undefined ? 0 : raw);
        return {
          student_id: s.id,
          student_name: s.name,
          roll_number: s.roll_number,
          marks_obtained: resolvedMarks,
          is_absent: Boolean(sc.isAbsent),
          remarks: sc.remarks || (sc.isAbsent ? "Absent" : "Completed"),
        };
      });

      // 3. Save scores with validation
      const result = await saveClassTestScores({
        schoolId,
        testId: targetTestId,
        scoresList: scorePayload,
        actor: user,
        publish,
      });

      setTestStatus(result.status);
      setSavingState("saved");
      setShowPublishConfirm(false);

      if (publish) {
        showToast(`Test marks published! Class highest: ${result.highestScore}/${maxScore}. Students can now view their marks.`, "success");
      } else {
        showToast("Marks saved securely as Draft. You can publish whenever ready.", "info");
      }

      if (onTestSaved) {
        onTestSaved(result);
      }
    } catch (err) {
      console.error("[ClassTestEntry] Save error:", err);
      setSavingState("error");
      showToast(err.message || "Failed to save test marks. Please verify input.", "error");
    }
  };

  // Reset form to create another test
  const handleResetForNewTest = () => {
    setEditingTestId(null);
    setTestStatus("draft");
    setTestTitle(`${subject} Unit Test`);
    setTestDate(new Date().toISOString().split("T")[0]);
    setMaxScore(20);
    setPassingScore(8);
    setSavingState("idle");
    loadRoster();
    setActiveTab("entry");
  };

  // Open existing test to edit
  const handleEditExistingTest = (test) => {
    setEditingTestId(test.id);
    setSelectedClass(test.class_id);
    setSubject(test.subject);
    setTestTitle(test.title);
    setTestDate(test.test_date);
    setMaxScore(Number(test.max_score) || 20);
    setPassingScore(Number(test.passing_score) || 8);
    setTestStatus(test.status || "draft");
    setActiveTab("entry");
  };

  if (!isOpen && !isStandalone) return null;

  // Real-time calculation metrics
  const scoreEntries = Object.values(scores);
  const presentEntries = scoreEntries.filter((s) => !s.isAbsent && s.marks !== "" && !isNaN(Number(s.marks)));
  const presentCount = presentEntries.length;
  const absentCount = scoreEntries.filter((s) => s.isAbsent).length;
  const highestCalculated = presentCount > 0 ? Math.max(...presentEntries.map((s) => Number(s.marks))) : 0;

  const content = (
    <div className="space-y-6">
      {/* HEADER & TAB TOGGLE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              <BookOpen className="w-4 h-4" />
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
              Faculty Grading Portal
            </span>
            {editingTestId && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  testStatus === "published"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400"
                }`}
              >
                {testStatus}
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Class Test Marks
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Record, validate, and publish unit assessments and class test scores for your assigned students.
          </p>
        </div>

        {/* Tab Switcher & Modal Close */}
        <div className="flex items-center gap-2">
          <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab("entry")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "entry"
                  ? "bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {editingTestId ? "Edit Test" : "New Marks Entry"}
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "history"
                  ? "bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Test History
            </button>
          </div>

          {!isStandalone && onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: MARKS ENTRY INTERFACE                                        */}
      {/* ==================================================================== */}
      {activeTab === "entry" && (
        <div className="space-y-6">
          {/* TEST CONFIGURATION GRID */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-cyan-500" />
                <span>1. Test Details & Metadata</span>
              </h3>
              {editingTestId && (
                <button
                  onClick={handleResetForNewTest}
                  className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create New Test</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Class Selector */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Assigned Class
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => {
                    setSelectedClass(e.target.value);
                    setEditingTestId(null);
                  }}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
                >
                  {assignedClasses.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject Selector */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Subject
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
                >
                  {assignedSubjects.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>

              {/* Test Date */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Test Date
                </label>
                <input
                  type="date"
                  value={testDate}
                  onChange={(e) => setTestDate(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
                />
              </div>

              {/* Maximum Marks */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Maximum Marks
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="200"
                    data-testid="input-max-score"
                    value={maxScore}
                    onChange={(e) => handleMaxScoreChange(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <div className="flex gap-1">
                    {[20, 50, 100].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleMaxScoreChange(val)}
                        className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border cursor-pointer ${
                          maxScore === val
                            ? "bg-cyan-500 text-white border-cyan-500"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Test Title Input */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                Test Title
              </label>
              <input
                type="text"
                value={testTitle}
                onChange={(e) => setTestTitle(e.target.value)}
                placeholder="e.g. Mathematics Unit Test 1 (Quadratic Equations)"
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder-slate-400"
              />
            </div>
          </div>

          {/* TELEMETRY SUMMARY RIBBON */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Total Scholars
              </span>
              <span className="text-lg font-black text-slate-900 dark:text-white">{students.length}</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Evaluated / Present
              </span>
              <span className="text-lg font-black text-cyan-600 dark:text-cyan-400">{presentCount}</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Marked Absent
              </span>
              <span className="text-lg font-black text-amber-600 dark:text-amber-400">{absentCount}</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Class Highest Marks
              </span>
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                {highestCalculated} / {maxScore}
              </span>
            </div>
          </div>

          {/* MARKS ENTRY TABLE */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900/60 shadow-xs">
            <div className="p-3.5 sm:p-4 bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  2. Student Evaluation Register
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Use Up/Down arrows or Enter to navigate between student score inputs.
                </p>
              </div>
              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                Max Ceiling: {maxScore} pts
              </span>
            </div>

            {loadingRoster ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Loading student roster for {selectedClass}...</p>
              </div>
            ) : students.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto opacity-60" />
                <p className="text-xs font-bold text-slate-900 dark:text-white">No Enrolled Students Found</p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  No scholars are registered under {selectedClass}. Please verify the class admissions register.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase text-[10px] font-black tracking-wider z-10 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-4 w-24">Roll No.</th>
                      <th className="py-2.5 px-4">Student Name</th>
                      <th className="py-2.5 px-4 w-44">Marks ({maxScore})</th>
                      <th className="py-2.5 px-4 w-32 text-center">Attendance</th>
                      <th className="py-2.5 px-4 w-28 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                    {students.map((student, idx) => {
                      const studentScore = scores[student.id] || { marks: "", isAbsent: false };
                      const val = studentScore.marks;
                      const numVal = Number(val);
                      const isOverCeiling = val !== "" && !isNaN(numVal) && numVal > maxScore;
                      const isNegative = val !== "" && !isNaN(numVal) && numVal < 0;
                      const hasError = isOverCeiling || isNegative;
                      const isPassed = !studentScore.isAbsent && val !== "" && !isNaN(numVal) && numVal >= passingScore;

                      return (
                        <tr
                          key={student.id}
                          className={`transition-colors ${
                            studentScore.isAbsent
                              ? "bg-slate-50/50 dark:bg-slate-950/20 opacity-75"
                              : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                          }`}
                        >
                          <td className="py-2 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                            {student.roll_number || `0${idx + 1}`}
                          </td>
                          <td className="py-2 px-4 text-slate-900 dark:text-white font-semibold">
                            {student.name}
                          </td>
                          <td className="py-2 px-4">
                            {studentScore.isAbsent ? (
                              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-700 dark:text-amber-400 text-xs font-bold font-mono">
                                <UserX className="w-3.5 h-3.5" />
                                <span>ABSENT</span>
                              </div>
                            ) : (
                              <div className="relative">
                                <input
                                  ref={(el) => (inputRefs.current[idx] = el)}
                                  type="number"
                                  min="0"
                                  max={maxScore}
                                  step="0.5"
                                  placeholder="0.0"
                                  data-testid={`input-score-${student.id}`}
                                  value={val}
                                  onChange={(e) => handleScoreChange(student.id, e.target.value)}
                                  onKeyDown={(e) => handleKeyDown(e, idx)}
                                  className={`w-28 bg-white dark:bg-slate-950 border rounded-xl px-3 py-1.5 text-xs font-bold font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 transition-all ${
                                    hasError
                                      ? "border-rose-500 focus:ring-rose-500 bg-rose-50/40 text-rose-600"
                                      : "border-slate-200 dark:border-slate-700 focus:ring-cyan-500"
                                  }`}
                                />
                                {hasError && (
                                  <span data-testid="error-marks-boundary" className="block text-[10px] text-rose-500 font-semibold mt-0.5">
                                    {isOverCeiling ? `Max is ${maxScore}` : "Cannot be < 0"}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleAbsent(student.id)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                studentScore.isAbsent
                                  ? "bg-amber-500 text-white shadow-xs"
                                  : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                              }`}
                            >
                              {studentScore.isAbsent ? (
                                <>
                                  <UserCheck className="w-3 h-3" />
                                  <span>Mark Present</span>
                                </>
                              ) : (
                                <>
                                  <UserX className="w-3 h-3" />
                                  <span>Mark Absent</span>
                                </>
                              )}
                            </button>
                          </td>
                          <td className="py-2 px-4 text-right">
                            {studentScore.isAbsent ? (
                              <span className="text-[10px] font-bold text-amber-500 uppercase">Excluded</span>
                            ) : val === "" ? (
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">Pending</span>
                            ) : isPassed ? (
                              <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                                Pass ({Math.round((numVal / maxScore) * 100)}%)
                              </span>
                            ) : (
                              <span className="text-[10px] font-extrabold text-rose-500">
                                Retake ({Math.round((numVal / maxScore) * 100)}%)
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ACTION TOOLBAR & CONFIRMATION */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs">
              {savingState === "saving" && (
                <span className="inline-flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400 font-bold">
                  <div className="w-3.5 h-3.5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving marks to institutional records...</span>
                </span>
              )}
              {savingState === "saved" && (
                <span
                  data-testid="status-marks-saved"
                  className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold"
                >
                  <Check className="w-4 h-4" />
                  <span>Marks saved securely.</span>
                </span>
              )}
              {savingState === "error" && (
                <span className="inline-flex items-center gap-1.5 text-rose-500 font-bold">
                  <AlertCircle className="w-4 h-4" />
                  <span>Error saving marks. Check inputs.</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* SAVE AS DRAFT */}
              <button
                type="button"
                data-testid="btn-save-draft"
                disabled={savingState === "saving" || students.length === 0}
                onClick={() => handleSaveMarks(false)}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>Save as Draft</span>
              </button>

              {/* PUBLISH RESULTS (TRIGGERS CONFIRMATION) */}
              <button
                type="button"
                data-testid="btn-publish-test"
                disabled={savingState === "saving" || students.length === 0}
                onClick={() => setShowPublishConfirm(true)}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-cyan-500/20 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>Publish Marks</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: PREVIOUSLY ENTERED TESTS & HISTORY                            */}
      {/* ==================================================================== */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Institutional Test Ledger
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                View previously created class tests, review publication status, or edit draft marks.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500">Filter Class:</span>
              <select
                value={historyFilterClass}
                onChange={(e) => setHistoryFilterClass(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-white cursor-pointer"
              >
                <option value="ALL">All Classes</option>
                {assignedClasses.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loadingHistory ? (
            <div className="p-8 text-center space-y-3">
              <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Loading test records...</p>
            </div>
          ) : historyTests.length === 0 ? (
            <div className="p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-2 bg-slate-50/50 dark:bg-slate-950/40">
              <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs font-bold text-slate-900 dark:text-white">No Class Tests Recorded Yet</p>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                You have not entered any class tests yet. Click "New Marks Entry" to start recording marks.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {historyTests
                .filter((t) => historyFilterClass === "ALL" || t.class_id === historyFilterClass)
                .map((test) => {
                  const isPub = test.status === "published";
                  return (
                    <div
                      key={test.id}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 hover:border-cyan-500/40 transition-all flex flex-col justify-between space-y-3 shadow-xs"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {test.class_id} • {test.subject}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              isPub
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300"
                            }`}
                          >
                            {isPub ? "Published" : "Draft"}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                          {test.title}
                        </h4>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                          <span>📅 {test.test_date}</span>
                          <span>Max: {test.max_score} pts</span>
                          {test.highest_score !== null && (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                              🏆 Class High: {test.highest_score}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400">
                          {isPub ? `Published by ${test.published_by || "Faculty"}` : "Unpublished Draft"}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleEditExistingTest(test)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
                        >
                          <span>{isPub ? "View / Edit" : "Continue Entry"}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* CONFIRMATION MODAL: PUBLISH MARKS                                   */}
      {/* ==================================================================== */}
      {showPublishConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
              <Send className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Publish Marks for {testTitle}?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Publishing makes results immediately visible in students' private portals. Each student will be able to
                view their own score and the class highest score. No peer marks or names will ever be shown.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-[11px] space-y-1 font-mono">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Class & Subject:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedClass} ({subject})</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Total Evaluated:</span>
                <span className="font-bold text-cyan-600 dark:text-cyan-400">{presentCount} scholars</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Class Highest:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{highestCalculated} / {maxScore}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPublishConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveMarks(true)}
                className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-cyan-500/20"
              >
                Confirm & Publish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Standalone Full-Page Mode vs Modal Mode
  if (isStandalone) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 transition-colors duration-200">
        <div className="max-w-6xl mx-auto bg-white/90 dark:bg-slate-900/60 backdrop-blur-2xl border border-slate-200/90 dark:border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-sm dark:shadow-2xl">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="max-w-5xl w-full bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl my-auto max-h-[92vh] overflow-y-auto">
        {content}
      </div>
    </div>
  );
}
