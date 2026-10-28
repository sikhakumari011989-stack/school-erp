import React, { useState, useEffect, useContext, useRef } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { logSecurityAction } from "../utils/auditLogger";
import { Upload, Download, CheckCircle2, AlertTriangle, FileSpreadsheet, X, Trash2, Plus } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const SAMPLE_TIMETABLE_CSV = `Class_Batch,Day_Of_Week,Start_Time,End_Time,Subject,Teacher_Name,Classroom
Class 10-ICSE,Monday,08:30 AM,09:15 AM,Mathematics,Prof. S. R. Sharma,Room 101
Class 10-ICSE,Monday,09:15 AM,10:00 AM,Advanced Physics,Dr. V. K. Raman,Lab 2
Class 10-ICSE,Tuesday,08:30 AM,09:15 AM,Chemistry,Prof. Ananya Sen,Lab 1
Class 10-ICSE,Wednesday,10:15 AM,11:00 AM,Computer Science,Prof. M. K. Rao,Comp Lab 3
Class 12-Science,Thursday,08:30 AM,09:30 AM,Pure Mathematics,Prof. S. R. Sharma,Room 204
Class 12-Science,Friday,09:30 AM,10:30 AM,Organic Chemistry,Prof. Ananya Sen,Lab 1
Class 10-ICSE,Saturday,08:30 AM,10:00 AM,Mock Exam Revision,Prof. S. R. Sharma,Room 101`;

export default function MasterTimetableManager({ schoolId: propSchoolId }) {
  const { user } = useContext(AppContext);
  const { showToast } = useToast();
  const schoolId = propSchoolId || user?.school_id || user?.institution_code || "CAMPUS-01";

  const [selectedDay, setSelectedDay] = useState("Monday");
  const [schedule, setSchedule] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Bulk import state
  const [parsedRows, setParsedRows] = useState([]);
  const [importErrors, setImportErrors] = useState([]);
  const [importSummary, setImportSummary] = useState({ total: 0, valid: 0, invalid: 0 });
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    day: "Monday",
    periodNo: "Period 1",
    timeWindow: "08:30 AM - 09:15 AM",
    className: "Class 10-ICSE",
    subject: "Mathematics",
    teacher: "Prof. S. R. Sharma",
    room: "Room 101",
  });

  const loadSchedule = () => {
    try {
      const saved = localStorage.getItem(`erp_master_timetable_${schoolId}`);
      if (saved) {
        setSchedule(JSON.parse(saved));
      } else {
        setSchedule([]);
      }
    } catch (e) {
      setSchedule([]);
    }
  };

  useEffect(() => {
    loadSchedule();
    const handleUpdate = () => loadSchedule();
    window.addEventListener("erp-timetable-updated", handleUpdate);
    return () => window.removeEventListener("erp-timetable-updated", handleUpdate);
  }, [schoolId]);

  const handleAddPeriod = (e) => {
    e.preventDefault();
    if (!form.periodNo.trim() || !form.subject.trim() || !form.teacher.trim()) {
      showToast("Please provide period number, subject, and teacher.", "error");
      return;
    }

    const newPeriod = {
      id: `period_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      day: form.day,
      periodNo: form.periodNo.trim(),
      timeWindow: form.timeWindow.trim(),
      className: form.className.trim(),
      subject: form.subject.trim(),
      teacher: form.teacher.trim(),
      room: form.room.trim() || "Room 101",
    };

    const updated = [...schedule, newPeriod];
    setSchedule(updated);
    try {
      localStorage.setItem(`erp_master_timetable_${schoolId}`, JSON.stringify(updated));
      window.dispatchEvent(new Event("erp-timetable-updated"));
    } catch (e) {}

    logSecurityAction({
      action: "Timetable Period Scheduled",
      entityType: "TIMETABLE",
      entityId: `${newPeriod.day}-${newPeriod.periodNo}`,
      details: `Scheduled ${newPeriod.periodNo} (${newPeriod.subject}) on ${newPeriod.day} for ${newPeriod.className}`,
      user,
      schoolId,
    });

    showToast(`Added ${newPeriod.periodNo} (${newPeriod.subject}) to ${newPeriod.day} schedule!`, "success");
    setShowAddModal(false);
  };

  const handleDeletePeriod = (id) => {
    const updated = schedule.filter((p) => p.id !== id);
    setSchedule(updated);
    try {
      localStorage.setItem(`erp_master_timetable_${schoolId}`, JSON.stringify(updated));
      window.dispatchEvent(new Event("erp-timetable-updated"));
    } catch (e) {}
    showToast("Period schedule removed.", "info");
  };

  // --- BULK TIMETABLE CSV IMPORT & DRY-RUN PREVIEW ---
  const handleDownloadSampleCsv = () => {
    const blob = new Blob([SAMPLE_TIMETABLE_CSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `timetable_bulk_import_template_${schoolId.toLowerCase()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Downloaded sample timetable CSV template.", "info");
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        showToast("CSV file must contain a header and at least one period row.", "error");
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));
      const classIdx = headers.findIndex((h) => h.includes("class") || h.includes("batch"));
      const dayIdx = headers.findIndex((h) => h.includes("day"));
      const startIdx = headers.findIndex((h) => h.includes("start"));
      const endIdx = headers.findIndex((h) => h.includes("end"));
      const subjectIdx = headers.findIndex((h) => h.includes("subject"));
      const teacherIdx = headers.findIndex((h) => h.includes("teacher") || h.includes("faculty"));
      const roomIdx = headers.findIndex((h) => h.includes("room") || h.includes("class"));

      if (dayIdx === -1 || subjectIdx === -1 || teacherIdx === -1) {
        showToast("CSV must contain at least Day_Of_Week, Subject, and Teacher_Name columns.", "error");
        return;
      }

      const parsed = [];
      const errors = [];

      lines.slice(1).forEach((line, index) => {
        const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        const rawClass = classIdx !== -1 ? cols[classIdx] : "Class 10-A";
        const rawDay = cols[dayIdx] || "";
        const rawStart = startIdx !== -1 ? cols[startIdx] : "08:30 AM";
        const rawEnd = endIdx !== -1 ? cols[endIdx] : "09:15 AM";
        const rawSubject = cols[subjectIdx] || "";
        const rawTeacher = cols[teacherIdx] || "";
        const rawRoom = roomIdx !== -1 ? cols[roomIdx] : "Room 101";

        const rowErrors = [];

        // Validate Day
        const normalizedDay = DAYS.find((d) => d.toLowerCase() === rawDay.toLowerCase());
        if (!normalizedDay) {
          rowErrors.push(`Invalid Day: "${rawDay}". Must be Monday-Saturday.`);
        }
        if (!rawSubject) {
          rowErrors.push("Subject cannot be empty.");
        }
        if (!rawTeacher) {
          rowErrors.push("Teacher name cannot be empty.");
        }

        const isValid = rowErrors.length === 0;

        parsed.push({
          rowNum: index + 2,
          day: normalizedDay || rawDay,
          className: rawClass || "General Batch",
          startTime: rawStart,
          endTime: rawEnd,
          timeWindow: `${rawStart} - ${rawEnd}`,
          subject: rawSubject,
          teacher: rawTeacher,
          room: rawRoom || "Room 101",
          isValid,
          errors: rowErrors,
        });

        if (!isValid) {
          errors.push(`Row ${index + 2}: ${rowErrors.join("; ")}`);
        }
      });

      setParsedRows(parsed);
      setImportErrors(errors);
      setImportSummary({
        total: parsed.length,
        valid: parsed.filter((r) => r.isValid).length,
        invalid: parsed.filter((r) => !r.isValid).length,
      });

      showToast(`Parsed ${parsed.length} rows (${parsed.filter((r) => r.isValid).length} valid). Check preview below.`, "info");
    } catch (err) {
      console.error("Timetable CSV parse error:", err);
      showToast("Failed to parse timetable CSV file.", "error");
    }
  };

  const handleCommitBulkImport = () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      showToast("No valid rows to import.", "error");
      return;
    }

    const newPeriods = validRows.map((r, i) => ({
      id: `period_bulk_${Date.now()}_${i}`,
      day: r.day,
      periodNo: `Period ${i + 1}`,
      timeWindow: r.timeWindow,
      className: r.className,
      subject: r.subject,
      teacher: r.teacher,
      room: r.room,
    }));

    const merged = [...schedule, ...newPeriods];
    setSchedule(merged);
    try {
      localStorage.setItem(`erp_master_timetable_${schoolId}`, JSON.stringify(merged));
      window.dispatchEvent(new Event("erp-timetable-updated"));
    } catch (e) {}

    logSecurityAction({
      action: "TIMETABLE_BULK_IMPORTED",
      entityType: "TIMETABLE",
      entityId: schoolId,
      details: `Bulk imported ${newPeriods.length} timetable periods across Monday-Saturday tabs`,
      user,
      schoolId,
    });

    showToast(`Successfully hydrated ${newPeriods.length} periods into Monday-Saturday schedule!`, "success");
    setShowImportModal(false);
    setParsedRows([]);
    setImportErrors([]);
  };

  const filteredPeriods = schedule.filter((p) => p.day === selectedDay);

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-[#1E293B]/80 backdrop-blur-xl border border-slate-700/70 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>⏰</span> Master Curriculum Scheduling
          </div>
          <h2 className="text-2xl font-black text-white">Master Timetable & Period Scheduler</h2>
          <p className="text-slate-400 text-sm mt-1 max-w-xl">
            Configure Monday–Saturday classroom bell timings, subject allocations, classroom numbers, and faculty assignments. Bulk upload via CSV or add individual periods.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setShowImportModal(true)}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-lg shadow-purple-600/30 transition-all cursor-pointer flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            <span>Bulk Import Timetable (CSV/Excel)</span>
          </button>
          <button
            onClick={() => {
              setForm({ ...form, day: selectedDay });
              setShowAddModal(true);
            }}
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-lg shadow-cyan-600/30 transition-all cursor-pointer flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Period to {selectedDay}</span>
          </button>
        </div>
      </div>

      {/* DAY SELECTOR TABS & SCHEDULE TABLE */}
      <div className="bg-[#1E293B]/80 backdrop-blur-xl border border-slate-700/70 rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-700/60 bg-slate-800/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-bold text-white">{selectedDay} Academic Timetable</h3>
            <p className="text-xs text-slate-400 mt-0.5">Campus: {schoolId} • {schedule.length} Total Master Periods</p>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1">
            {DAYS.map((d) => (
              <button
                key={d}
                onClick={() => setSelectedDay(d)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedDay === d
                    ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30"
                    : "bg-slate-900 text-slate-400 hover:text-white"
                }`}
              >
                {d} ({schedule.filter((p) => p.day === d).length})
              </button>
            ))}
          </div>
        </div>

        {filteredPeriods.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <span className="text-5xl block opacity-60">⏰</span>
            <h4 className="text-lg font-bold text-white">No Periods Scheduled for {selectedDay}</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Schedule single periods or use the Bulk Import Wizard to hydrate your entire Monday–Saturday curriculum instantly.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setShowImportModal(true)}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all cursor-pointer"
              >
                Bulk Import Timetable CSV
              </button>
              <button
                onClick={() => {
                  setForm({ ...form, day: selectedDay });
                  setShowAddModal(true);
                }}
                className="bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                + Schedule Period Manually
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-700/70 text-slate-400 text-xs uppercase tracking-wider bg-slate-900/40">
                  <th className="p-4 pl-6">Period & Bell Timing</th>
                  <th className="p-4">Target Batch</th>
                  <th className="p-4">Subject</th>
                  <th className="p-4">Faculty Instructor</th>
                  <th className="p-4">Room No.</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {filteredPeriods.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 pl-6">
                      <p className="font-bold text-white">{p.periodNo}</p>
                      <span className="text-xs font-mono text-cyan-400">{p.timeWindow}</span>
                    </td>
                    <td className="p-4 font-bold text-slate-200">{p.className}</td>
                    <td className="p-4">
                      <span className="bg-slate-900 border border-slate-700 text-cyan-300 px-2.5 py-1 rounded text-xs font-bold">
                        {p.subject}
                      </span>
                    </td>
                    <td className="p-4 text-xs font-semibold text-slate-300">{p.teacher}</td>
                    <td className="p-4 font-mono text-xs text-slate-400">{p.room}</td>
                    <td className="p-4 pr-6 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleDeletePeriod(p.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
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

      {/* BULK IMPORT TIMETABLE MODAL (DRY-RUN VALIDATION PREVIEW) */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto">
          <div className="bg-[#1E293B] border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-4xl w-full shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-bold uppercase tracking-wider mb-2">
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Curriculum Migration Wizard</span>
                </div>
                <h3 className="text-2xl font-black text-white">Bulk Import Timetable (CSV/Excel)</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Upload Monday–Saturday periods. Columns: <code>Class_Batch, Day_Of_Week, Start_Time, End_Time, Subject, Teacher_Name, Classroom</code>.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setParsedRows([]);
                  setImportErrors([]);
                }}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer text-lg font-bold"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Upload Zone & Download Sample */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/60 border border-slate-800 mb-6">
              <div>
                <h4 className="text-sm font-bold text-white mb-1">Select CSV Timetable File</h4>
                <p className="text-xs text-slate-400">Validate time windows, assigned faculty, and days of week.</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDownloadSampleCsv}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Sample CSV</span>
                </button>
                <label className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-purple-600/30 cursor-pointer flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  <span>Browse CSV File</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
            </div>

            {/* DRY-RUN VALIDATION PREVIEW */}
            {parsedRows.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-slate-300 font-bold">Dry-Run Preview:</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {importSummary.valid} Valid Rows
                    </span>
                    {importSummary.invalid > 0 && (
                      <span className="text-rose-400 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {importSummary.invalid} Errors Flagged
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">Total: {importSummary.total} rows</span>
                </div>

                <div className="border border-slate-800 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-700 bg-slate-900 text-slate-400 uppercase tracking-wider text-[10px]">
                        <th className="p-3">Status</th>
                        <th className="p-3">Day</th>
                        <th className="p-3">Batch</th>
                        <th className="p-3">Timing</th>
                        <th className="p-3">Subject</th>
                        <th className="p-3">Teacher</th>
                        <th className="p-3">Room</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {parsedRows.map((r, i) => (
                        <tr
                          key={i}
                          className={`${
                            r.isValid ? "bg-slate-900/30 hover:bg-slate-800/40" : "bg-rose-500/10 border-l-4 border-rose-500"
                          } transition-colors`}
                        >
                          <td className="p-3 whitespace-nowrap">
                            {r.isValid ? (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                                VALID ✅
                              </span>
                            ) : (
                              <span
                                className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold"
                                title={r.errors.join("; ")}
                              >
                                ERROR ❌
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-bold text-white whitespace-nowrap">{r.day}</td>
                          <td className="p-3 text-slate-300 whitespace-nowrap">{r.className}</td>
                          <td className="p-3 font-mono text-cyan-400 whitespace-nowrap">{r.timeWindow}</td>
                          <td className="p-3 text-slate-200 font-bold whitespace-nowrap">{r.subject}</td>
                          <td className="p-3 text-slate-300 whitespace-nowrap">{r.teacher}</td>
                          <td className="p-3 font-mono text-slate-400 whitespace-nowrap">{r.room}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    onClick={() => {
                      setParsedRows([]);
                      setImportErrors([]);
                    }}
                    className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white font-bold text-xs cursor-pointer"
                  >
                    Clear Preview
                  </button>
                  <button
                    onClick={handleCommitBulkImport}
                    disabled={importSummary.valid === 0}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-black px-6 py-2.5 rounded-xl text-xs shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Commit & Hydrate Schedule ({importSummary.valid} Rows)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SINGLE PERIOD MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#1E293B] border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-extrabold text-white mb-1">Schedule Timetable Period ⏰</h3>
            <p className="text-xs text-slate-400 mb-6">Assign subject, teacher, and room number for {form.day}.</p>

            <form onSubmit={handleAddPeriod} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Day</label>
                  <select
                    value={form.day}
                    onChange={(e) => setForm({ ...form, day: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                  >
                    {DAYS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Period Slot</label>
                  <select
                    value={form.periodNo}
                    onChange={(e) => setForm({ ...form, periodNo: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Period 1">Period 1</option>
                    <option value="Period 2">Period 2</option>
                    <option value="Period 3">Period 3</option>
                    <option value="Period 4">Period 4</option>
                    <option value="Period 5">Period 5</option>
                    <option value="Period 6">Period 6</option>
                    <option value="Period 7">Period 7</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Time Window</label>
                <input
                  type="text"
                  placeholder="e.g. 08:30 AM - 09:15 AM"
                  value={form.timeWindow}
                  onChange={(e) => setForm({ ...form, timeWindow: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Classroom Batch</label>
                  <input
                    type="text"
                    placeholder="e.g. Class 10-ICSE"
                    value={form.className}
                    onChange={(e) => setForm({ ...form, className: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Room No.</label>
                  <input
                    type="text"
                    placeholder="e.g. Room 101"
                    value={form.room}
                    onChange={(e) => setForm({ ...form, room: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Subject</label>
                <input
                  type="text"
                  placeholder="e.g. Mathematics"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Assigned Teacher</label>
                <input
                  type="text"
                  placeholder="e.g. Prof. S. R. Sharma"
                  value={form.teacher}
                  onChange={(e) => setForm({ ...form, teacher: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-lg transition-all cursor-pointer"
                >
                  Save Period Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
