import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { supabase } from "../supabaseClient";
import { TableSkeleton } from "../Components/Skeleton";

export default function StudentHomework() {
  const { user } = useContext(AppContext);
  const { showToast } = useToast();
  const [homeworkList, setHomeworkList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completions, setCompletions] = useState({});

  const schoolId = (user?.institution_code || user?.school_id || "CAMPUS-01").toUpperCase();
  const studentId = (user?.personal_code || user?.role_code || user?.roll_number || user?.id || "STU-101").toUpperCase();

  const loadCompletions = () => {
    try {
      const saved = localStorage.getItem(`erp_hw_completion_${schoolId}`);
      if (saved) {
        setCompletions(JSON.parse(saved));
      } else {
        setCompletions({});
      }
    } catch {
      setCompletions({});
    }
  };

  const fetchHomework = async () => {
    setLoading(true);
    loadCompletions();
    try {
      const { data, error } = await supabase
        .from("homework")
        .select("*")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setHomeworkList(data || []);
    } catch (err) {
      console.error("Error fetching student homework:", err);
      // Fallback to local storage if offline
      try {
        const local = JSON.parse(localStorage.getItem(`erp_homework_${schoolId}`) || "[]");
        setHomeworkList(local);
      } catch (e) {
        setHomeworkList([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHomework();
    const handleUpdate = () => loadCompletions();
    window.addEventListener("erp-homework-verification-updated", handleUpdate);
    return () => window.removeEventListener("erp-homework-verification-updated", handleUpdate);
  }, [user?.institution_code, user?.school_id]);

  const isHwCompleted = (hwId) => {
    if (!completions) return false;
    // Check if verified specifically for this student, or verified globally for the assignment
    if (completions[hwId] === true) return true;
    if (completions[hwId] && typeof completions[hwId] === "object" && (completions[hwId][studentId] === true || completions[hwId]["all"] === true)) {
      return true;
    }
    return false;
  };

  const completedCount = homeworkList.filter((h) => isHwCompleted(h.id)).length;
  const pendingCount = homeworkList.length - completedCount;

  return (
    <div className="relative text-slate-200 min-h-full pb-10 font-sans">
      <div className="fixed top-0 left-10 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="mb-8 flex justify-between items-center flex-wrap gap-4">
          <div>
            <p className="text-blue-300 text-sm font-semibold mb-1 uppercase tracking-widest">
              Student Academic Portal
            </p>
            <h1 className="text-3xl font-extrabold text-white">Curriculum Assignments & Homework 📚</h1>
            <p className="text-slate-400 text-sm mt-1">
              Strict faculty verification system &bull; Student status: <span className="font-mono text-blue-400 font-bold">{studentId}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="bg-slate-800 border border-slate-700 text-emerald-300 px-4 py-2 rounded-xl text-sm font-bold">
              ✓ Verified: {completedCount}
            </span>
            <span className="bg-slate-800 border border-slate-700 text-amber-300 px-4 py-2 rounded-xl text-sm font-bold">
              ⏳ Pending: {pendingCount}
            </span>
            <button
              onClick={fetchHomework}
              className="text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="bg-[#1E293B]/70 rounded-3xl p-6 border border-slate-700/60">
            <TableSkeleton rows={4} cols={3} />
          </div>
        ) : homeworkList.length === 0 ? (
          <div className="bg-[#1E293B]/70 border border-slate-700/60 rounded-3xl p-16 text-center shadow-2xl">
            <span className="text-5xl block mb-4">🎉</span>
            <h3 className="text-xl font-bold text-white mb-2">No Homework Assigned</h3>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              Your faculty has not published any assignments for your batch. Check back regularly or enjoy your study break!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {homeworkList.map((hw) => {
              const isCompleted = isHwCompleted(hw.id);
              return (
                <div
                  key={hw.id}
                  className={`bg-[#1E293B]/70 backdrop-blur-xl border rounded-3xl p-6 shadow-xl transition-all duration-300 ${
                    isCompleted
                      ? "border-emerald-500/40 bg-emerald-950/20"
                      : "border-slate-700/60 hover:border-blue-500/40"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-xl text-xs font-black uppercase">
                        {hw.subject}
                      </span>
                      <h3 className="text-lg font-bold text-white">{hw.title}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Deadline:</span>
                      <span className="bg-slate-900 border border-slate-700 text-amber-400 px-3 py-1 rounded-lg text-xs font-bold font-mono">
                        {hw.due_date || "No deadline"}
                      </span>
                    </div>
                  </div>

                  <p className="text-slate-300 text-sm leading-relaxed mb-6 bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                    {hw.description || "No specific instructions provided."}
                  </p>

                  <div className="flex justify-between items-center pt-2 flex-wrap gap-3">
                    <span className="text-xs text-slate-400 font-mono">
                      Posted: {new Date(hw.created_at).toLocaleDateString()}
                    </span>
                    <div>
                      {isCompleted ? (
                        <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-lg shadow-emerald-900/20">
                          <span>✓</span>
                          <span>Verified Completed by Faculty</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-lg shadow-amber-900/20">
                          <span>⏳</span>
                          <span>Pending Faculty Verification</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

