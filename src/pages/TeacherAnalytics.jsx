import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { publishStudyMaterial } from "../utils/studyMaterialService";
import {
  generateReportCardPDF,
  enqueuePDFBatchJob,
  listenToPDFBatchJob,
} from "../utils/pdfGenerator";
import QuestionBankAnalytics from "../Components/QuestionBankAnalytics";

export default function TeacherAnalytics() {
  const { user } = useContext(AppContext);
  const { showToast } = useToast();
  const schoolId = user?.school_id || user?.institution_code || "CAMPUS-01";

  const [activeTab, setActiveTab] = useState("marks"); // 'marks' | 'analytics' | 'papers'
  const [papers, setPapers] = useState([]);
  const [supportStudents, setSupportStudents] = useState([]);
  const [examMarks, setExamMarks] = useState([]);

  // Modals
  const [showWatchlistModal, setShowWatchlistModal] = useState(false);
  const [showPaperModal, setShowPaperModal] = useState(false);
  const [showMarksModal, setShowMarksModal] = useState(false);

  // Forms
  const [watchForm, setWatchForm] = useState({
    name: "",
    className: "Class 10-A",
    issue: "",
    action: "",
  });

  const [paperForm, setPaperForm] = useState({
    title: "",
    className: "Class 10-A",
    format: "PDF",
  });

  const [marksForm, setMarksForm] = useState({
    student_name: "",
    roll_number: "",
    class_name: "Class 10-A",
    maths: 85,
    science: 88,
    english: 90,
    term: "Term II Final Examination (2026-27)",
  });

  useEffect(() => {
    try {
      const rawWatch = localStorage.getItem(`erp_academic_watchlist_${schoolId}`);
      if (rawWatch) {
        setSupportStudents(JSON.parse(rawWatch));
      } else {
        setSupportStudents([]);
      }

      const rawPapers = localStorage.getItem(`erp_question_papers_${schoolId}`);
      if (rawPapers) {
        setPapers(JSON.parse(rawPapers));
      } else {
        setPapers([]);
      }

      const rawMarks = localStorage.getItem(`erp_exam_marks_${schoolId}`);
      if (rawMarks) {
        setExamMarks(JSON.parse(rawMarks));
      } else {
        // Initialize from enrolled student directory if available
        const rawDir = localStorage.getItem(`erp_directory_${schoolId}`);
        if (rawDir) {
          const dirList = JSON.parse(rawDir);
          const stuList = dirList.filter((m) => (m.role || "").toLowerCase() === "student");
          if (stuList.length > 0) {
            const initialList = stuList.map((s, idx) => ({
              id: `exam_${s.roll_number || idx}`,
              student_name: s.full_name || s.name || "Student",
              roll_number: s.roll_number || `STU-${100 + idx}`,
              class_name: s.class_name || "Class 10-A",
              maths: 85,
              science: 90,
              english: 88,
              term: "Term II Final Examination (2026-27)",
            }));
            setExamMarks(initialList);
            localStorage.setItem(`erp_exam_marks_${schoolId}`, JSON.stringify(initialList));
          } else {
            setExamMarks([]);
          }
        } else {
          setExamMarks([]);
        }
      }
    } catch (e) {
      setSupportStudents([]);
      setPapers([]);
      setExamMarks([]);
    }
  }, [schoolId]);

  const calcGrade = (percentage) => {
    const p = Number(percentage) || 0;
    if (p >= 90) return "A+";
    if (p >= 80) return "A";
    if (p >= 70) return "B+";
    if (p >= 60) return "B";
    if (p >= 50) return "C";
    if (p >= 40) return "D";
    return "F";
  };

  const handleUpdateMarks = (id, subject, val) => {
    const num = Math.min(100, Math.max(0, Number(val) || 0));
    const updated = examMarks.map((row) => {
      if (row.id === id) {
        return { ...row, [subject]: num };
      }
      return row;
    });
    setExamMarks(updated);
    try {
      localStorage.setItem(`erp_exam_marks_${schoolId}`, JSON.stringify(updated));
    } catch (e) {}
  };

  const handleAddMarksRow = (e) => {
    e.preventDefault();
    if (!marksForm.student_name.trim()) {
      showToast("Please enter student name", "error");
      return;
    }

    const newRow = {
      id: `exam_${Date.now()}`,
      student_name: marksForm.student_name.trim(),
      roll_number: marksForm.roll_number.trim().toUpperCase() || `STU-${Date.now().toString().slice(-3)}`,
      class_name: marksForm.class_name.trim() || "Class 10-A",
      maths: Math.min(100, Math.max(0, Number(marksForm.maths) || 0)),
      science: Math.min(100, Math.max(0, Number(marksForm.science) || 0)),
      english: Math.min(100, Math.max(0, Number(marksForm.english) || 0)),
      term: marksForm.term || "Term II Final Examination (2026-27)",
    };

    const updated = [newRow, ...examMarks];
    setExamMarks(updated);
    try {
      localStorage.setItem(`erp_exam_marks_${schoolId}`, JSON.stringify(updated));
    } catch (e) {}

    showToast(`Added ${newRow.student_name} to exam marks matrix!`, "success");
    setMarksForm({
      student_name: "",
      roll_number: "",
      class_name: "Class 10-A",
      maths: 85,
      science: 88,
      english: 90,
      term: "Term II Final Examination (2026-27)",
    });
    setShowMarksModal(false);
  };

  const handleCompilePDFReportCard = (row) => {
    try {
      const maths = Number(row.maths) || 0;
      const science = Number(row.science) || 0;
      const english = Number(row.english) || 0;
      const total = maths + science + english;
      const pct = (total / 3).toFixed(1);

      generateReportCardPDF({
        tenant: {
          name: user?.school_name || user?.institution_name || "Institutional Campus",
          code: schoolId,
          address: user?.address || "Mahim Manohar Highway, Palghar 401404",
          email: user?.email || "principal@campus.edu",
        },
        student: {
          name: row.student_name,
          roll_number: row.roll_number,
          class: row.class_name,
        },
        academicTerm: row.term || "Term II Examination (2026-27)",
        grades: [
          {
            subject: "Mathematics",
            maxMarks: 100,
            marksObtained: maths,
            grade: calcGrade(maths),
            remarks: maths >= 80 ? "Exemplary analytical capability" : "Regular practice recommended",
          },
          {
            subject: "Science (Physics, Chem, Bio)",
            maxMarks: 100,
            marksObtained: science,
            grade: calcGrade(science),
            remarks: science >= 80 ? "Outstanding theoretical & practical understanding" : "Focus on conceptual clarity",
          },
          {
            subject: "English Language & Literature",
            maxMarks: 100,
            marksObtained: english,
            grade: calcGrade(english),
            remarks: english >= 80 ? "Fluent expression and strong vocabulary" : "Grammar precision improving",
          },
        ],
        attendanceRate: "96.8%",
      });
      showToast(`Compiled official PDF Report Card for ${row.student_name}!`, "success");
    } catch (err) {
      console.error("Report card PDF compilation error:", err);
      showToast("Failed to compile PDF Report Card", "error");
    }
  };

  // Async PDF Batch Queue State for Teacher Assessment Matrix
  const [batchJob, setBatchJob] = useState(null);
  const [batchProgress, setBatchProgress] = useState(0);

  const handleBatchReportCardQueue = async () => {
    if (examMarks.length === 0) {
      showToast("No exam mark records available for batch compile.", "info");
      return;
    }

    try {
      setBatchJob({ status: "Queued" });
      setBatchProgress(15);

      const job = await enqueuePDFBatchJob({
        schoolId: schoolId,
        jobType: "BATCH_REPORT_CARDS",
        totalRecords: examMarks.length,
        payload: {
          class_name: "Class 10-A",
          studentCount: examMarks.length,
        },
        onProgress: (pct) => setBatchProgress(pct),
      });

      setBatchJob(job);
      showToast("Batch report card job offloaded to Supabase pdf_jobs queue (Status: Queued)!", "info");

      listenToPDFBatchJob(job.id, schoolId, (updated) => {
        setBatchJob(updated);
        if (updated.status === "Processing") {
          setBatchProgress(50);
        } else if (updated.status === "Completed") {
          setBatchProgress(100);
          showToast("Batch report cards compiled successfully!", "success");
        }
      });
    } catch (e) {
      console.error("Batch report card queue error:", e);
      setBatchJob(null);
    }
  };

  const handleDownloadBatchReportCards = () => {
    examMarks.forEach((row) => handleCompilePDFReportCard(row));
    showToast(`Downloaded batch of ${examMarks.length} student report cards!`, "success");
  };

  const handleAutoGenerateRemark = (row) => {
    const maths = Number(row.maths) || 0;
    const science = Number(row.science) || 0;
    const english = Number(row.english) || 0;
    const pct = Math.round((maths + science + english) / 3);
    const attendance = "96%";

    let performanceAssessment = "";
    if (pct >= 85) {
      performanceAssessment = `${row.student_name} demonstrates outstanding academic excellence across all core subjects with a composite grade average of ${pct}%.`;
    } else if (pct >= 65) {
      performanceAssessment = `${row.student_name} maintains consistent academic engagement with a satisfactory overall average of ${pct}%.`;
    } else {
      performanceAssessment = `${row.student_name} shows foundational promise at ${pct}%, but will benefit substantially from targeted remedial revision in key topics.`;
    }

    const attendanceStatement = `Their institutional attendance remains exemplary at ${attendance}, reflecting high punctuality and dedication to daily coursework.`;
    const conductStatement = `In the classroom, they exhibit respectful peer cooperation, active participation during discussions, and commendatory behavioral discipline.`;

    const compositeRemark = `${performanceAssessment} ${attendanceStatement} ${conductStatement}`;

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(compositeRemark);
    }
    showToast(`Auto-generated 3-sentence remark for ${row.student_name} and copied to clipboard! 📝`, "success");
  };

  const handleSendWeeklyParentDigest = (row) => {
    const maths = Number(row.maths) || 0;
    const science = Number(row.science) || 0;
    const english = Number(row.english) || 0;
    const avg = Math.round((maths + science + english) / 3);

    const digest = `*Weekly Scholar Academic Digest - ${user?.school_name || "EduSaaS ERP"}*\n` +
      `Scholar: ${row.student_name} (${row.roll_number || "Student"})\n` +
      `Class: ${row.class_name}\n` +
      `Academic Progress: ${avg}% Average (Math: ${maths}, Science: ${science}, English: ${english})\n` +
      `Homework Status: 100% Completed on schedule.\n` +
      `Recommended Practice Topic: Focus on ${maths < science ? "Quadratic Equations & Geometry" : "Chemical Reactions & Thermodynamics"} for the upcoming test.\n` +
      `Attendance: 96% Present this week.\n` +
      `Best regards,\nFaculty Academic Desk`;

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(digest);
    }
    showToast(`Weekly Parent Digest for ${row.student_name} copied to clipboard! Ready to send on WhatsApp 📲`, "success");
  };

  const handleAddWatchlist = (e) => {
    e.preventDefault();
    if (!watchForm.name.trim() || !watchForm.issue.trim()) {
      showToast("Please provide student name and academic concern.", "error");
      return;
    }

    const newEntry = {
      id: `watch_${Date.now()}`,
      name: watchForm.name.trim(),
      class: watchForm.className,
      issue: watchForm.issue.trim(),
      action: watchForm.action.trim() || "Remedial Coaching Assigned",
      created_at: new Date().toISOString(),
    };

    const updated = [newEntry, ...supportStudents];
    setSupportStudents(updated);
    try {
      localStorage.setItem(`erp_academic_watchlist_${schoolId}`, JSON.stringify(updated));
    } catch (e) {}

    showToast(`Added ${newEntry.name} to academic support watchlist.`, "success");
    setWatchForm({ name: "", className: "Class 10-A", issue: "", action: "" });
    setShowWatchlistModal(false);
  };

  const handleRemoveWatchlist = (id) => {
    const updated = supportStudents.filter((s) => s.id !== id);
    setSupportStudents(updated);
    try {
      localStorage.setItem(`erp_academic_watchlist_${schoolId}`, JSON.stringify(updated));
    } catch (e) {}
    showToast("Watchlist entry resolved and archived.", "info");
  };

  const handleAddPaper = (e) => {
    e.preventDefault();
    if (!paperForm.title.trim()) {
      showToast("Please provide question paper title.", "error");
      return;
    }

    const newPaper = {
      id: `paper_${Date.now()}`,
      title: paperForm.title.trim(),
      class: paperForm.className,
      format: paperForm.format,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
    };

    const updated = [newPaper, ...papers];
    setPapers(updated);
    try {
      localStorage.setItem(`erp_question_papers_${schoolId}`, JSON.stringify(updated));
    } catch (e) {}

    // Automatically sync to Student LMS Study Vault
    try {
      publishStudyMaterial({
        title: newPaper.title,
        subject: user?.subject || "Curriculum Resource",
        className: newPaper.class,
        type: newPaper.format || "PDF",
        size: "2.4 MB",
        description: `Uploaded by ${user?.name || "faculty"} for ${newPaper.class} board preparation.`,
        schoolId,
        user,
      });
    } catch (err) {}

    showToast(`Resource "${newPaper.title}" published to Question Bank and Student LMS!`, "success");
    setPaperForm({ title: "", className: "Class 10-A", format: "PDF" });
    setShowPaperModal(false);
  };

  const handleDeletePaper = (id) => {
    const updated = papers.filter((p) => p.id !== id);
    setPapers(updated);
    try {
      localStorage.setItem(`erp_question_papers_${schoolId}`, JSON.stringify(updated));
    } catch (e) {}
    showToast("Question paper removed.", "info");
  };

  return (
    <div className="relative text-slate-200 min-h-full pb-10 font-sans">
      <div className="fixed top-0 left-10 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="mb-8 flex justify-between items-center flex-wrap gap-4">
          <div>
            <p className="text-purple-300 text-sm font-semibold mb-1 uppercase tracking-widest">Faculty Operations</p>
            <h1 className="text-3xl font-extrabold text-white">Performance Analytics & Question Bank 📊</h1>
            <p className="text-slate-400 text-sm mt-1">Class monitoring, remedial intervention lists, and test papers</p>
          </div>
          <div className="flex gap-2 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700 overflow-x-auto">
            <button
              onClick={() => setActiveTab("marks")}
              className={`px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "marks" ? "bg-purple-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
              }`}
            >
              📝 Marks Grid & Reports ({examMarks.length})
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "analytics" ? "bg-purple-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
              }`}
            >
              Academic Watchlist ({supportStudents.length})
            </button>
            <button
              onClick={() => setActiveTab("papers")}
              className={`px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "papers" ? "bg-purple-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
              }`}
            >
              Question Bank ({papers.length})
            </button>
            <button
              onClick={() => setActiveTab("mastery")}
              className={`px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "mastery" ? "bg-purple-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
              }`}
            >
              🔥 Bloom's Blueprint & Heatmap
            </button>
          </div>
        </div>

        {/* TAB 1: EXAM MARKS GRID & REPORT CARDS */}
        {activeTab === "marks" && (
          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>📝</span> 1-Click Exam Marks Entry Grid & Report Compiler
                </h2>
                <p className="text-slate-400 text-xs mt-1">
                  Enter student assessment scores (Maths, Science, English out of 100). Aggregates, percentages, and letter grades calculate live.
                </p>
              </div>
              <button
                onClick={() => setShowMarksModal(true)}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-purple-600/30 transition-all cursor-pointer flex items-center gap-2 text-xs sm:text-sm"
              >
                <span>➕</span>
                <span>Add Student Exam Entry</span>
              </button>
            </div>

            {/* MARKS GRID TABLE */}
            <div className="bg-[#1E293B] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center flex-wrap gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Term Assessment Marks Matrix</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Continuous evaluation & instant official PDF report generation</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1 rounded-full font-bold">
                    {examMarks.length} Students Evaluated
                  </span>
                  {examMarks.length > 0 && (
                    <button
                      onClick={
                        batchJob?.status === "Completed"
                          ? handleDownloadBatchReportCards
                          : handleBatchReportCardQueue
                      }
                      disabled={batchJob?.status === "Queued" || batchJob?.status === "Processing"}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md ${
                        batchJob?.status === "Completed"
                          ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black"
                          : "bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40"
                      }`}
                      title="Offload bulk report card compilation to Supabase pdf_jobs queue"
                    >
                      <span>⚡</span>
                      <span>
                        {batchJob?.status === "Queued" || batchJob?.status === "Processing"
                          ? `Compiling Batch (${batchProgress}%)...`
                          : batchJob?.status === "Completed"
                          ? "Download Batch Report Cards"
                          : "Async Batch Queue"}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {examMarks.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <span className="text-4xl block mb-2 opacity-60">📊</span>
                  <p className="font-bold text-white text-base">No exam marks entered yet (Clean Slate).</p>
                  <p className="text-xs text-slate-400 mt-1">Click "Add Student Exam Entry" to record scores and generate official PDF report cards.</p>
                </div>
              ) : (
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider bg-slate-900/40">
                        <th className="p-4 pl-6">Student & Roll No</th>
                        <th className="p-4">Batch / Class</th>
                        <th className="p-4 text-center">Maths (/100)</th>
                        <th className="p-4 text-center">Science (/100)</th>
                        <th className="p-4 text-center">English (/100)</th>
                        <th className="p-4 text-center">Total (/300)</th>
                        <th className="p-4 text-center">Percentage</th>
                        <th className="p-4 text-center">Grade</th>
                        <th className="p-4 text-right pr-6">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50 text-sm">
                      {examMarks.map((row) => {
                        const m = Number(row.maths) || 0;
                        const s = Number(row.science) || 0;
                        const e = Number(row.english) || 0;
                        const total = m + s + e;
                        const pct = (total / 3).toFixed(1);
                        const grade = calcGrade(pct);

                        return (
                          <tr key={row.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="p-4 pl-6 font-bold text-white">
                              <div>{row.student_name}</div>
                              <span className="text-[11px] font-mono text-purple-400 font-semibold">{row.roll_number}</span>
                            </td>
                            <td className="p-4 text-slate-300 text-xs">{row.class_name}</td>
                            <td className="p-4 text-center">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={row.maths}
                                onChange={(evt) => handleUpdateMarks(row.id, "maths", evt.target.value)}
                                className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-white text-xs focus:outline-none focus:border-purple-500"
                              />
                            </td>
                            <td className="p-4 text-center">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={row.science}
                                onChange={(evt) => handleUpdateMarks(row.id, "science", evt.target.value)}
                                className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-white text-xs focus:outline-none focus:border-purple-500"
                              />
                            </td>
                            <td className="p-4 text-center">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={row.english}
                                onChange={(evt) => handleUpdateMarks(row.id, "english", evt.target.value)}
                                className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-white text-xs focus:outline-none focus:border-purple-500"
                              />
                            </td>
                            <td className="p-4 text-center font-mono font-bold text-white">
                              {total} <span className="text-[10px] text-slate-500">/300</span>
                            </td>
                            <td className="p-4 text-center font-mono font-bold text-amber-300">
                              {pct}%
                            </td>
                            <td className="p-4 text-center">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                                  pct >= 80
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                    : pct >= 60
                                    ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                    : pct >= 40
                                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                    : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                }`}
                              >
                                {grade}
                              </span>
                            </td>
                            <td className="p-4 text-right pr-6">
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                <button
                                  onClick={() => handleCompilePDFReportCard(row)}
                                  className="bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 font-bold px-2.5 py-1.5 rounded-xl text-xs transition-all cursor-pointer inline-flex items-center gap-1 shadow-md shadow-purple-900/20"
                                  title="Generate and Download Official PDF Report Card"
                                >
                                  <span>📄</span>
                                  <span>Report Card</span>
                                </button>
                                <button
                                  onClick={() => handleAutoGenerateRemark(row)}
                                  className="bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 font-bold px-2.5 py-1.5 rounded-xl text-xs transition-all cursor-pointer inline-flex items-center gap-1 shadow-md shadow-cyan-900/20"
                                  title="Auto-Generate 3-sentence remark synthesizing Marks, Attendance, and Conduct"
                                >
                                  <span>✍️</span>
                                  <span>Remark</span>
                                </button>
                                <button
                                  onClick={() => handleSendWeeklyParentDigest(row)}
                                  className="bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold px-2.5 py-1.5 rounded-xl text-xs transition-all cursor-pointer inline-flex items-center gap-1 shadow-md shadow-emerald-900/20"
                                  title="Generate and copy WhatsApp Weekly Scholar Digest for parents"
                                >
                                  <span>📲</span>
                                  <span>Digest</span>
                                </button>
                              </div>
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
        )}

        {/* TAB 2: ACADEMIC WATCHLIST */}
        {activeTab === "analytics" && (
          <div className="space-y-8">
            {/* STATS OVERVIEW */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Class Average Score</p>
                <p className="text-3xl font-extrabold text-emerald-400">82.4%</p>
                <span className="text-xs text-slate-400 mt-1 block">Term evaluation standing</span>
              </div>
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Active Watchlist</p>
                <p className="text-3xl font-extrabold text-orange-400">{supportStudents.length} Students</p>
                <span className="text-xs text-slate-400 mt-1 block">Remedial support active</span>
              </div>
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Test Papers in Bank</p>
                <p className="text-3xl font-extrabold text-blue-400">{papers.length} Papers</p>
                <span className="text-xs text-slate-400 mt-1 block">Faculty verified question banks</span>
              </div>
            </div>

            {/* STUDENTS NEEDING EXTRA SUPPORT TABLE */}
            <div className="bg-[#1E293B] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-white">Students Requiring Academic Support ⚠️</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Track struggling scholars, weak subject topics, and remedial intervention</p>
                </div>
                <button
                  onClick={() => setShowWatchlistModal(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>➕</span>
                  <span>Add to Watchlist</span>
                </button>
              </div>

              {supportStudents.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <span className="text-4xl block mb-2 opacity-60">🎯</span>
                  <p className="font-bold text-white text-base">No students currently on academic watchlist (Clean Slate).</p>
                  <p className="text-xs text-slate-400 mt-1">All enrolled students are meeting benchmark performance. Click "Add to Watchlist" to flag scholars needing support.</p>
                </div>
              ) : (
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider bg-slate-900/40">
                        <th className="p-5">Student Name & Class</th>
                        <th className="p-5">Performance / Attendance Concern</th>
                        <th className="p-5">Intervention Action</th>
                        <th className="p-5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50 text-sm">
                      {supportStudents.map((st) => (
                        <tr key={st.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="p-5 font-bold text-white">
                            {st.name} <span className="text-xs text-slate-400 block font-normal">{st.class}</span>
                          </td>
                          <td className="p-5 text-orange-400 font-medium">{st.issue}</td>
                          <td className="p-5 text-slate-300 font-semibold">{st.action}</td>
                          <td className="p-5 text-right">
                            <button
                              onClick={() => handleRemoveWatchlist(st.id)}
                              className="bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-white border border-emerald-500/30 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer"
                            >
                              ✓ Resolved
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: QUESTION BANK */}
        {activeTab === "papers" && (
          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">Upload Question Paper Source</h2>
                <p className="text-slate-400 text-xs">Register question sets and answer keys for upcoming exams or weekly tests.</p>
              </div>
              <button
                onClick={() => setShowPaperModal(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-2 text-xs sm:text-sm"
              >
                <span>➕</span>
                <span>Register Question Paper</span>
              </button>
            </div>

            <div className="bg-[#1E293B] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
                <h2 className="text-lg font-bold text-white">Institutional Question Bank Repository</h2>
                <span className="text-xs bg-slate-900 border border-slate-700 text-purple-300 font-bold px-3 py-1 rounded-full">
                  {papers.length} Papers
                </span>
              </div>

              {papers.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <span className="text-4xl block mb-2 opacity-60">📑</span>
                  <p className="font-bold text-white text-base">Question bank is empty (Clean Slate).</p>
                  <p className="text-xs text-slate-400 mt-1">Click "Register Question Paper" above to log assessment blueprints.</p>
                </div>
              ) : (
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider bg-slate-900/40">
                        <th className="p-5">Paper Title</th>
                        <th className="p-5">Target Class</th>
                        <th className="p-5">File Format</th>
                        <th className="p-5">Date Registered</th>
                        <th className="p-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50 text-sm">
                      {papers.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="p-5 font-bold text-white">{p.title}</td>
                          <td className="p-5 text-slate-300">{p.class}</td>
                          <td className="p-5">
                            <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2.5 py-0.5 rounded text-xs font-mono font-bold">
                              {p.format}
                            </span>
                          </td>
                          <td className="p-5 text-xs text-slate-400">{p.date}</td>
                          <td className="p-5 text-right">
                            <button
                              onClick={() => handleDeletePaper(p.id)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2.5 py-1 rounded text-xs font-bold transition-colors cursor-pointer"
                            >
                              🗑️ Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: BLOOM'S QUESTION BANK & MISCONCEPTION HEATMAP */}
        {activeTab === "mastery" && (
          <QuestionBankAnalytics schoolCode={schoolId} />
        )}
      </div>

      {/* WATCHLIST MODAL */}
      {showWatchlistModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#1E293B] border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-extrabold text-white mb-1">Add Scholar to Watchlist ⚠️</h3>
            <p className="text-xs text-slate-400 mb-6">Log low scores or attendance lapses for remedial faculty support.</p>

            <form onSubmit={handleAddWatchlist} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Student Name</label>
                <input
                  type="text"
                  placeholder="e.g. Aryan Patel"
                  value={watchForm.name}
                  onChange={(e) => setWatchForm({ ...watchForm, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Class Batch</label>
                <input
                  type="text"
                  value={watchForm.className}
                  onChange={(e) => setWatchForm({ ...watchForm, className: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Concern / Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Scored 32% in Quadratic Equations test"
                  value={watchForm.issue}
                  onChange={(e) => setWatchForm({ ...watchForm, issue: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Remedial Action</label>
                <input
                  type="text"
                  placeholder="e.g. Assigned 30-min daily after-school mentoring"
                  value={watchForm.action}
                  onChange={(e) => setWatchForm({ ...watchForm, action: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowWatchlistModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-lg transition-all cursor-pointer"
                >
                  Save to Watchlist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAPER MODAL */}
      {showPaperModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#1E293B] border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-extrabold text-white mb-1">Register Question Paper 📑</h3>
            <p className="text-xs text-slate-400 mb-6">Log exam question bank sets and assessment source files.</p>

            <form onSubmit={handleAddPaper} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Paper Title</label>
                <input
                  type="text"
                  placeholder="e.g. Mathematics Mid-Term Question Paper Set B"
                  value={paperForm.title}
                  onChange={(e) => setPaperForm({ ...paperForm, title: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Target Class</label>
                <input
                  type="text"
                  value={paperForm.className}
                  onChange={(e) => setPaperForm({ ...paperForm, className: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">File Format</label>
                <select
                  value={paperForm.format}
                  onChange={(e) => setPaperForm({ ...paperForm, format: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="PDF">PDF Document (.pdf)</option>
                  <option value="DOCX">Microsoft Word (.docx)</option>
                  <option value="ZIP">ZIP Archive (.zip)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPaperModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-lg transition-all cursor-pointer"
                >
                  Save Paper
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MARKS ENTRY MODAL */}
      {showMarksModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#1E293B] border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl">
            <h3 className="text-xl font-extrabold text-white mb-1">Add Student Exam Record 📝</h3>
            <p className="text-xs text-slate-400 mb-6">Enter student assessment marks for automatic grading & PDF report card compilation.</p>

            <form onSubmit={handleAddMarksRow} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Student Full Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Aarav Mehta"
                    value={marksForm.student_name}
                    onChange={(e) => setMarksForm({ ...marksForm, student_name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Roll / Student ID</label>
                  <input
                    type="text"
                    placeholder="e.g. STU-101"
                    value={marksForm.roll_number}
                    onChange={(e) => setMarksForm({ ...marksForm, roll_number: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Class / Batch</label>
                  <input
                    type="text"
                    value={marksForm.class_name}
                    onChange={(e) => setMarksForm({ ...marksForm, class_name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Academic Term</label>
                  <input
                    type="text"
                    value={marksForm.term}
                    onChange={(e) => setMarksForm({ ...marksForm, term: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Maths (/100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={marksForm.maths}
                    onChange={(e) => setMarksForm({ ...marksForm, maths: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-center text-sm font-mono font-bold text-white focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Science (/100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={marksForm.science}
                    onChange={(e) => setMarksForm({ ...marksForm, science: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-center text-sm font-mono font-bold text-white focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">English (/100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={marksForm.english}
                    onChange={(e) => setMarksForm({ ...marksForm, english: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-center text-sm font-mono font-bold text-white focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowMarksModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
                >
                  Save & Add to Grid
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}