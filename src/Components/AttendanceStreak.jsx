import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { supabase } from "../supabaseClient";
import {
  Flame,
  Trophy,
  Award,
  Zap,
  TrendingUp,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

export default function AttendanceStreak({
  studentRoll = "",
  className = "",
}) {
  const { user } = useContext(AppContext) || {};
  const schoolId = (user?.institution_code || user?.school_id || "CAMPUS-01").toUpperCase();
  const currentRoll = String(studentRoll || user?.role_code || user?.roll_number || user?.personal_code || "STU-101").trim().toUpperCase();
  const currentStudentName = user?.name || user?.full_name || "Scholar Member";
  const studentBatch = user?.class_name || "Class 10-A";

  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [attendanceRate, setAttendanceRate] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [myRank, setMyRank] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const calculateStreaksAndLeaderboard = async () => {
      setLoading(true);
      try {
        // 1. Fetch Students in current batch from directory or Supabase
        let batchStudents = [];
        try {
          const rawDir = localStorage.getItem(`erp_directory_${schoolId}`);
          if (rawDir) {
            const allMembers = JSON.parse(rawDir);
            batchStudents = allMembers.filter((m) => (m.role || "student").toLowerCase() === "student");
          }
        } catch {}

        if (batchStudents.length === 0 && supabase) {
          try {
            const { data } = await supabase
              .from("students")
              .select("id, name, roll_number, class_name")
              .eq("school_id", schoolId)
              .limit(25);
            if (data && data.length > 0) {
              batchStudents = data;
            }
          } catch (e) {}
        }

        // 2. Fetch Recent Attendance Records
        let attendanceRecords = [];
        if (supabase) {
          try {
            const { data } = await supabase
              .from("attendance")
              .select("date, records")
              .eq("school_id", schoolId)
              .order("date", { ascending: false })
              .limit(60);
            if (data) attendanceRecords = data;
          } catch (e) {}
        }

        // Also merge local storage records
        try {
          const today = new Date().toISOString().split("T")[0];
          const localToday = localStorage.getItem(`erp_attendance_${schoolId}_${today}`);
          if (localToday) {
            const parsed = JSON.parse(localToday);
            attendanceRecords = [{ date: today, records: parsed }, ...attendanceRecords];
          }
        } catch {}

        // Helper function to calculate unbroken streak for a given roll number
        const computeStudentStreak = (roll) => {
          let streak = 0;
          let presentCount = 0;
          let markedDays = 0;
          let streakBroken = false;

          const sorted = [...attendanceRecords].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

          for (const day of sorted) {
            const list = day.records || [];
            const entry = list.find((r) => {
              const rRoll = String(r.roll_number || r.student_id || r.id || "").trim().toUpperCase();
              return rRoll === roll;
            });

            if (entry) {
              markedDays++;
              const isPresent = (entry.status || "present").toLowerCase() === "present";
              if (isPresent) {
                presentCount++;
                if (!streakBroken) streak++;
              } else {
                streakBroken = true;
              }
            }
          }

          const rate = markedDays > 0 ? Math.round((presentCount / markedDays) * 100) : 0;
          return { streak, rate, markedDays };
        };

        // 3. Compute student's unbroken streak
        const currentStats = computeStudentStreak(currentRoll);
        const effectiveStreak = currentStats.streak;
        const effectiveRate = currentStats.rate;

        // 4. Construct Leaderboard from real batch students
        const studentStreaks = batchStudents.map((s, idx) => {
          const roll = String(s.roll_number || s.personal_code || s.id || `STU-${idx + 1}`).trim().toUpperCase();
          const isCurrent = roll === currentRoll;
          const stats = isCurrent ? currentStats : computeStudentStreak(roll);

          return {
            roll,
            name: s.name || s.full_name || `Scholar ${idx + 1}`,
            streak: stats.streak,
            rate: parseFloat(Number(stats.rate).toFixed(1)),
            isCurrent,
          };
        });

        // Ensure current student is in the list
        if (!studentStreaks.some((s) => s.isCurrent)) {
          studentStreaks.push({
            roll: currentRoll,
            name: currentStudentName,
            streak: effectiveStreak,
            rate: parseFloat(Number(effectiveRate).toFixed(1)),
            isCurrent: true,
          });
        }

        // Sort by streak descending, then attendance rate
        studentStreaks.sort((a, b) => b.streak - a.streak || b.rate - a.rate);

        const currentRankIndex = studentStreaks.findIndex((s) => s.isCurrent);
        const resolvedRank = currentRankIndex !== -1 ? currentRankIndex + 1 : 1;

        if (!isMounted) return;
        setCurrentStreak(effectiveStreak);
        setLongestStreak(effectiveStreak);
        setAttendanceRate(effectiveRate);
        setLeaderboard(studentStreaks.slice(0, 5));
        setMyRank(resolvedRank);
      } catch (err) {
        console.error("Streak & leaderboard calculation error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    calculateStreaksAndLeaderboard();
  }, [schoolId, currentRoll, currentStudentName]);

  const getMedalEmoji = (rank) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  const getStreakTier = (streak) => {
    if (streak >= 25) return { label: "Legendary Scholar", color: "from-amber-400 to-orange-500", icon: "⚡" };
    if (streak >= 15) return { label: "Campus Champion", color: "from-cyan-400 to-blue-500", icon: "🔥" };
    if (streak >= 7) return { label: "Consistent Warrior", color: "from-emerald-400 to-teal-500", icon: "🌟" };
    return { label: "Momentum Builder", color: "from-indigo-400 to-purple-500", icon: "🚀" };
  };

  const tier = getStreakTier(currentStreak);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 1. PERSONAL UNBROKEN STREAK CARD */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-7 bg-white/80 dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-xl transition-all">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-1 rounded-lg bg-orange-500/10 text-orange-500 dark:text-orange-400 border border-orange-500/20">
                <Flame className="w-4 h-4 fill-orange-500 animate-bounce" />
              </span>
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-orange-600 dark:text-orange-400">
                Unbroken Attendance Streak
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-orange-500/10 text-orange-600 dark:text-orange-300 border border-orange-500/20">
                {tier.icon} {tier.label}
              </span>
            </div>

            <div className="flex items-baseline gap-3">
              <h2 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                {currentStreak}
              </h2>
              <span className="text-sm sm:text-base font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Consecutive Present Days
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Weekends & official institutional holidays do not break your streak! Keep it up.
            </p>
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/5 text-center flex-1 sm:flex-initial min-w-[100px]">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Personal Best
              </span>
              <span className="text-lg font-black text-slate-800 dark:text-slate-200">
                {longestStreak} Days
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/5 text-center flex-1 sm:flex-initial min-w-[100px]">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Class Rate
              </span>
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                {attendanceRate}%
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar towards Next Milestone */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex justify-between items-center text-xs font-bold mb-1.5 text-slate-600 dark:text-slate-300">
            <span>Next Badge Milestone: 20 Days Streak</span>
            <span className="text-cyan-600 dark:text-cyan-400">
              {Math.max(0, 20 - currentStreak)} Days Remaining
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-cyan-400 transition-all duration-1000 shadow-sm"
              style={{ width: `${Math.min(100, (currentStreak / 20) * 100)}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}

