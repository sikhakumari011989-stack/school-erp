import React, { useState } from "react";
import { Download, Upload, X, CheckCircle2, AlertCircle, FileSpreadsheet, RotateCcw } from "lucide-react";
import { useToast } from "../context/ToastContext";
import { getNextMemberId } from "../utils/idGenerator";

const SAMPLE_CSV = `name,role,class_name,phone,email,annual_fees
Aarav Mehta,student,Class 10-ICSE,+91 9820112233,aarav@school.edu,45000
Pooja Sharma,teacher,Mathematics,+91 9820112244,pooja@school.edu,
Rajesh Verma,accountant,Accounts,+91 9820112255,rajesh@school.edu,
Suresh Yadav,staff,Operations,+91 9820112266,suresh@school.edu,
Rohan Deshmukh,student,Class 9-A,+91 9820112277,rohan@school.edu,40000`;

export default function OnboardingWizard({ isOpen, onClose, schoolId, onComplete }) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState("upload"); // 'upload' | 'preview' | 'complete'
  const [targetType, setTargetType] = useState("student"); // 'student' | 'teacher' | 'accountant' | 'staff'
  const [parsedRows, setParsedRows] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [canCommit, setCanCommit] = useState(false);
  const [hasBackup, setHasBackup] = useState(false);
  const [preMigrationBackup, setPreMigrationBackup] = useState(null);

  if (!isOpen) return null;

  const activeSchoolCode = String(schoolId || "CAMPUS-01").trim().toUpperCase();

  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeSchoolCode.toLowerCase()}_migration_template.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Downloaded sample migration template", "success");
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target.result;
        parseAndValidateCsv(text);
      } catch (err) {
        showToast(err.message || "Invalid CSV format", "error");
      }
    };
    reader.readAsText(file);
  };

  const parseAndValidateCsv = (text) => {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      throw new Error("CSV must include a header and at least one data row.");
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));
    const errors = [];
    const rows = [];

    // Existing directory for duplicate roll number detection
    const dirKey = `erp_directory_${activeSchoolCode}`;
    let existingDir = [];
    try {
      existingDir = JSON.parse(localStorage.getItem(dirKey) || "[]");
    } catch {}

    const existingPhones = new Set(existingDir.map((m) => (m.phone || "").replace(/\s+/g, "")));

    lines.slice(1).forEach((line, idx) => {
      const rowIdx = idx + 2;
      const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      const rowObj = {};
      headers.forEach((h, i) => {
        rowObj[h] = values[i] || "";
      });

      const rowErrors = [];
      const name = rowObj.name || rowObj.full_name || "";
      const role = (rowObj.role || targetType).toLowerCase();
      const phone = (rowObj.phone || "").trim();
      const email = (rowObj.email || "").trim();
      const className = rowObj.class_name || rowObj.class || "General";
      const annualFees = rowObj.annual_fees ? Number(rowObj.annual_fees) : 45000;

      if (!name) rowErrors.push("Missing full name");
      if (!phone || phone.length < 8) rowErrors.push("Invalid phone number");
      if (email && !email.includes("@")) rowErrors.push("Malformed email address");
      if (existingPhones.has(phone.replace(/\s+/g, ""))) {
        rowErrors.push("Duplicate phone number (already registered)");
      }

      const assignedId = getNextMemberId(role, existingDir, []);
      existingDir.push({ roll_number: assignedId, role });

      const parsedItem = {
        rowNumber: rowIdx,
        id: assignedId,
        name,
        role,
        class_name: className,
        phone,
        email,
        annualFees,
        errors: rowErrors,
        isValid: rowErrors.length === 0,
      };

      if (rowErrors.length > 0) {
        errors.push({ row: rowIdx, errors: rowErrors });
      }

      rows.push(parsedItem);
    });

    setParsedRows(rows);
    setValidationErrors(errors);
    setCanCommit(errors.length === 0);
    setActiveTab("preview");

    if (errors.length > 0) {
      showToast(`Dry-run validation found ${errors.length} row error(s). Please review.`, "warning");
    } else {
      showToast(`Dry-run successful! ${rows.length} rows verified with zero errors.`, "success");
    }
  };

  const handleCommitMigration = () => {
    if (!canCommit) {
      showToast("Cannot commit data with validation errors.", "error");
      return;
    }

    try {
      const dirKey = `erp_directory_${activeSchoolCode}`;
      const currentDir = JSON.parse(localStorage.getItem(dirKey) || "[]");

      // Save pre-migration backup for 1-click rollback
      setPreMigrationBackup([...currentDir]);
      setHasBackup(true);

      const newMembers = parsedRows.map((r) => ({
        id: r.id,
        roll_number: r.id,
        name: r.name,
        full_name: r.name,
        role: r.role,
        class_name: r.class_name,
        phone: r.phone,
        email: r.email,
        totalFees: r.annualFees,
        paidFees: 0,
        created_at: new Date().toISOString(),
        institution_code: activeSchoolCode,
        school_id: activeSchoolCode,
      }));

      const merged = [...currentDir, ...newMembers];
      localStorage.setItem(dirKey, JSON.stringify(merged));
      window.dispatchEvent(new Event("erp-directory-updated"));

      showToast(`Successfully enrolled ${newMembers.length} records! 🚀`, "success");
      setActiveTab("complete");
      if (onComplete) onComplete(newMembers);
    } catch (err) {
      console.error("Migration error:", err);
      showToast("Failed to commit migration", "error");
    }
  };

  const handleRollback = () => {
    if (!preMigrationBackup) return;
    try {
      const dirKey = `erp_directory_${activeSchoolCode}`;
      localStorage.setItem(dirKey, JSON.stringify(preMigrationBackup));
      window.dispatchEvent(new Event("erp-directory-updated"));
      setHasBackup(false);
      showToast("Rollback executed! Directory reverted to pre-migration state.", "info");
      onClose();
    } catch (err) {
      showToast("Rollback failed", "error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-4xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400">
              Zero-Touch Enterprise Onboarding
            </span>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <span>Dry-Run CSV Migration Wizard</span>
              <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY CONTENT */}
        <div className="py-4 flex-1 overflow-y-auto space-y-4">
          {activeTab === "upload" && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-300">
                <p className="font-bold text-white mb-1">Instant Bulk Onboarding with Pre-Commit Verification</p>
                <p>
                  Upload your legacy student, faculty, accountant, or operations staff spreadsheet. The engine will run a non-destructive dry-run, detect duplicates, and highlight validation issues before writing to storage.
                </p>
              </div>

              <div className="flex items-center justify-between gap-4 flex-wrap">
                <button
                  type="button"
                  onClick={handleDownloadSample}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-bold transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4 text-cyan-400" />
                  <span>Download Sample CSV Template</span>
                </button>
              </div>

              <div className="border-2 border-dashed border-white/20 hover:border-cyan-500/50 rounded-2xl p-8 text-center bg-white/5 transition-all">
                <input
                  type="file"
                  id="csvFileInput"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="csvFileInput"
                  className="cursor-pointer flex flex-col items-center justify-center gap-2"
                >
                  <Upload className="w-10 h-10 text-cyan-400" />
                  <p className="text-sm font-bold text-white">Click or drag CSV file to start dry-run validation</p>
                  <p className="text-xs text-slate-400">Supported: UTF-8 standard comma-separated text</p>
                </label>
              </div>
            </div>
          )}

          {activeTab === "preview" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Dry-Run Evaluation Preview</h3>
                  <p className="text-xs text-slate-400">
                    Total: {parsedRows.length} rows | Errors:{" "}
                    <span className={validationErrors.length > 0 ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>
                      {validationErrors.length}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("upload")}
                  className="px-3 py-1.5 rounded-xl bg-white/5 text-slate-300 text-xs font-bold hover:bg-white/10 cursor-pointer"
                >
                  Upload Another File
                </button>
              </div>

              <div className="overflow-x-auto w-full max-h-72 border border-white/10 rounded-2xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5 text-slate-400 uppercase">
                      <th className="p-3">Row</th>
                      <th className="p-3">Assigned ID</th>
                      <th className="p-3">Full Name</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Class/Batch</th>
                      <th className="p-3">Phone</th>
                      <th className="p-3 text-center">Validation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {parsedRows.map((row) => (
                      <tr
                        key={row.rowNumber}
                        className={row.isValid ? "hover:bg-white/5" : "bg-rose-950/20 hover:bg-rose-950/30"}
                      >
                        <td className="p-3 font-mono text-slate-400">#{row.rowNumber}</td>
                        <td className="p-3 font-mono text-cyan-400 font-bold">{row.id}</td>
                        <td className="p-3 font-semibold text-white">{row.name}</td>
                        <td className="p-3 uppercase text-[10px] font-bold text-slate-300">{row.role}</td>
                        <td className="p-3 text-slate-400">{row.class_name}</td>
                        <td className="p-3 font-mono text-slate-300">{row.phone}</td>
                        <td className="p-3 text-center">
                          {row.isValid ? (
                            <span className="text-emerald-400 font-bold text-[11px] inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                            </span>
                          ) : (
                            <span
                              className="text-rose-400 font-bold text-[11px] inline-flex items-center gap-1"
                              title={row.errors.join(", ")}
                            >
                              <AlertCircle className="w-3.5 h-3.5" /> {row.errors[0]}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "complete" && (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto text-3xl">
                ✓
              </div>
              <h3 className="text-xl font-bold text-white">Migration Successfully Committed!</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                All records have been synchronized to the institutional directory. If you made a mistake, you can trigger a 1-click rollback right now.
              </p>
              {hasBackup && (
                <button
                  type="button"
                  onClick={handleRollback}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-xs font-bold transition-all cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>1-Click Rollback (Revert to Pre-Migration)</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="border-t border-white/10 pt-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-all cursor-pointer"
          >
            {activeTab === "complete" ? "Close Wizard" : "Cancel"}
          </button>

          {activeTab === "preview" && (
            <button
              onClick={handleCommitMigration}
              disabled={!canCommit}
              className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                canCommit
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/30"
                  : "bg-slate-800 text-slate-500 cursor-not-allowed"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Commit & Enroll Verified Records ({parsedRows.length})</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

