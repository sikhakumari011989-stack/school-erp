import React, { useState, useEffect } from "react";
import { X, Calendar, ArrowRight, GraduationCap, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import { useToast } from "../context/ToastContext";

export default function AcademicRolloverModal({ isOpen, onClose, schoolId, onRolloverSuccess }) {
  const { showToast } = useToast();
  const [currentAcademicYear, setCurrentAcademicYear] = useState("2025-2026");
  const [targetAcademicYear, setTargetAcademicYear] = useState("2026-2027");
  const [finalGradeBatch, setFinalGradeBatch] = useState("Class 12");
  const [students, setStudents] = useState([]);
  const [promotionsPreview, setPromotionsPreview] = useState([]);
  const [graduationsPreview, setGraduationsPreview] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const cleanSchool = String(schoolId || "CAMPUS-01").trim().toUpperCase();

  const loadStudentsAndBuildPreview = React.useCallback(() => {
    try {
      const dirKey = `erp_directory_${cleanSchool}`;
      const raw = localStorage.getItem(dirKey);
      const directory = raw ? JSON.parse(raw) : [];
      const studentList = directory.filter((m) => (m.role || "student").toLowerCase() === "student");
      setStudents(studentList);

      const promotions = [];
      const graduations = [];

      studentList.forEach((st) => {
        const currentClass = st.class_name || st.class || "Class 9";
        const isGraduating = currentClass.toLowerCase().includes(finalGradeBatch.toLowerCase());

        // Arrears calculation
        const total = Number(st.totalFees || 45000);
        const paid = Number(st.paidFees || 0);
        const arrears = Math.max(0, total - paid);

        if (isGraduating) {
          graduations.push({
            id: st.id || st.roll_number,
            name: st.name || st.full_name,
            currentClass,
            rollNumber: st.roll_number || st.id,
            arrears,
            graduationYear: new Date().getFullYear(),
          });
        } else {
          // Promote by incrementing class number if possible
          const classNumMatch = currentClass.match(/\d+/);
          let nextClass;
          if (classNumMatch) {
            const currentNum = parseInt(classNumMatch[0], 10);
            nextClass = currentClass.replace(String(currentNum), String(currentNum + 1));
          } else {
            nextClass = `${currentClass} (Promoted)`;
          }

          promotions.push({
            id: st.id || st.roll_number,
            name: st.name || st.full_name,
            currentClass,
            nextClass,
            rollNumber: st.roll_number || st.id,
            carriedArrears: arrears,
          });
        }
      });

      setPromotionsPreview(promotions);
      setGraduationsPreview(graduations);
    } catch (e) {
      console.warn("Could not calculate rollover preview:", e);
    }
  }, [cleanSchool, finalGradeBatch]);

  useEffect(() => {
    if (isOpen) {
      loadStudentsAndBuildPreview();
    }
  }, [isOpen, loadStudentsAndBuildPreview]);

  const handleExecuteRollover = () => {
    if (students.length === 0) {
      showToast("No active students found to rollover.", "info");
      return;
    }

    setIsProcessing(true);
    try {
      const dirKey = `erp_directory_${cleanSchool}`;
      const alumniKey = `erp_alumni_${cleanSchool}`;

      const currentDir = JSON.parse(localStorage.getItem(dirKey) || "[]");
      const currentAlumni = JSON.parse(localStorage.getItem(alumniKey) || "[]");

      // 1. Move graduating scholars into Alumni DB
      const newAlumniEntries = graduationsPreview.map((g) => ({
        id: `alum_${Date.now()}_${g.rollNumber}`,
        name: g.name,
        rollNumber: g.rollNumber,
        graduationYear: g.graduationYear,
        stream: g.currentClass,
        currentPlacement: "Higher Education / University",
        contactEmail: "",
        status: "Graduated",
        pendingDuesCarried: g.arrears,
      }));

      const updatedAlumni = [...currentAlumni, ...newAlumniEntries];
      localStorage.setItem(alumniKey, JSON.stringify(updatedAlumni));

      // 2. Update directory: remove graduated scholars and promote continuing students
      const graduatingIds = new Set(graduationsPreview.map((g) => g.rollNumber));
      const promotionMap = new Map(promotionsPreview.map((p) => [p.rollNumber, p]));

      const updatedDir = currentDir
        .filter((member) => !graduatingIds.has(member.roll_number || member.id))
        .map((member) => {
          const promo = promotionMap.get(member.roll_number || member.id);
          if (promo) {
            return {
              ...member,
              class_name: promo.nextClass,
              class: promo.nextClass,
              academic_year: targetAcademicYear,
              // Carry forward unpaid fee arrears as opening balance
              openingArrears: promo.carriedArrears,
              totalFees: (Number(member.totalFees) || 45000) + promo.carriedArrears,
              paidFees: 0,
            };
          }
          return member;
        });

      localStorage.setItem(dirKey, JSON.stringify(updatedDir));
      localStorage.setItem(`erp_academic_year_${cleanSchool}`, targetAcademicYear);

      window.dispatchEvent(new Event("erp-directory-updated"));
      window.dispatchEvent(new Event("erp-alumni-updated"));

      setIsDone(true);
      showToast(`Academic Year Rollover to ${targetAcademicYear} Completed! 🎓`, "success");
      if (onRolloverSuccess) onRolloverSuccess();
    } catch (err) {
      console.error("Rollover execution error:", err);
      showToast("Rollover execution failed", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-4xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400">
              Institutional Lifecycle Engine
            </span>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <span>Academic-Year Rollover & Batch Promotion</span>
              <Calendar className="w-5 h-5 text-cyan-400" />
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="py-4 flex-1 overflow-y-auto space-y-5">
          {!isDone ? (
            <>
              {/* CONFIG ROW */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Current Session
                  </label>
                  <input
                    type="text"
                    value={currentAcademicYear}
                    onChange={(e) => setCurrentAcademicYear(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                  />
                </div>
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Target Academic Session
                  </label>
                  <input
                    type="text"
                    value={targetAcademicYear}
                    onChange={(e) => setTargetAcademicYear(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-cyan-300 font-mono font-bold"
                  />
                </div>
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Graduating Final Batch
                  </label>
                  <input
                    type="text"
                    value={finalGradeBatch}
                    onChange={(e) => setFinalGradeBatch(e.target.value)}
                    placeholder="e.g. Class 12 or Class 10"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-amber-300 font-mono"
                  />
                </div>
              </div>

              {/* OVERVIEW SUMMARY CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-cyan-400">Class Promotions</span>
                    <p className="text-xl font-black text-white mt-0.5">{promotionsPreview.length} Students</p>
                    <p className="text-[11px] text-slate-400">Promoted to next grade + carried fee arrears</p>
                  </div>
                  <ArrowRight className="w-6 h-6 text-cyan-400" />
                </div>

                <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-indigo-400">Graduating Scholars</span>
                    <p className="text-xl font-black text-white mt-0.5">{graduationsPreview.length} Scholars</p>
                    <p className="text-[11px] text-slate-400">Transferred into Alumni Network DB</p>
                  </div>
                  <GraduationCap className="w-6 h-6 text-indigo-400" />
                </div>
              </div>

              {/* PROMOTION PREVIEW TABLE */}
              <div className="border border-white/10 rounded-2xl overflow-hidden">
                <div className="p-3 bg-white/5 border-b border-white/10 flex justify-between items-center">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Promotion Preview Ledger</h4>
                  <span className="text-[10px] text-slate-400 font-mono">{promotionsPreview.length} records</span>
                </div>
                <div className="overflow-x-auto max-h-56">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400 uppercase bg-white/5">
                        <th className="p-2.5">Roll ID</th>
                        <th className="p-2.5">Student</th>
                        <th className="p-2.5">Current Class</th>
                        <th className="p-2.5">Promoted To</th>
                        <th className="p-2.5 text-right">Carried Arrears (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {promotionsPreview.slice(0, 15).map((p) => (
                        <tr key={p.id} className="hover:bg-white/5">
                          <td className="p-2.5 font-mono text-cyan-400">{p.rollNumber}</td>
                          <td className="p-2.5 font-semibold text-white">{p.name}</td>
                          <td className="p-2.5 text-slate-400">{p.currentClass}</td>
                          <td className="p-2.5 font-bold text-emerald-400">{p.nextClass}</td>
                          <td className="p-2.5 text-right font-mono text-slate-300">
                            ₹{p.carriedArrears.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto text-3xl">
                🎓
              </div>
              <h3 className="text-xl font-bold text-white">Academic Rollover Finalized!</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Session {targetAcademicYear} is now active. All continuing scholars have been advanced to their next grade, and graduating scholars have been archived in the Alumni Database.
              </p>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="border-t border-white/10 pt-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-all cursor-pointer"
          >
            {isDone ? "Done" : "Cancel"}
          </button>

          {!isDone && (
            <button
              onClick={handleExecuteRollover}
              disabled={isProcessing || students.length === 0}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-black shadow-lg shadow-cyan-600/30 transition-all cursor-pointer flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              <span>{isProcessing ? "Processing Year Close..." : `Execute Rollover to ${targetAcademicYear}`}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

