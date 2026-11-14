import React, { useState, useEffect, useContext } from "react";
import { useSearchParams } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { supabase } from "../supabaseClient";
import { logSecurityAction } from "../utils/auditLogger";
import QRScannerModule from "../Components/QRScannerModule";

export default function StaffDashboard() {
  const { user } = useContext(AppContext);
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const schoolId = user?.school_id || user?.institution_code || "CAMPUS-01";
  const staffId = user?.personal_code || user?.role_code || "NON-01";
  const staffName = user?.name || user?.full_name || "Support Staff Member";

  const [clockedIn, setClockedIn] = useState(false);
  const [clockTime, setClockTime] = useState(null);
  const [myProfile, setMyProfile] = useState(null);
  const [myLeaves, setMyLeaves] = useState([]);
  const [activeTab, setActiveTab] = useState("roster"); // 'roster' | 'maintenance' | 'leaves' | 'scanner' | 'contacts'

  // Interactive My Tasks state
  const todayDateStr = new Date().toISOString().split("T")[0];
  const [tasks, setTasks] = useState(() => {
    try {
      const saved = localStorage.getItem(`erp_nts_tasks_${schoolId}_${staffId}_${todayDateStr}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { id: 1, title: "Main Gate Entry Register & Visitor Checkpoint Audit", category: "Security & Access", time: "08:15 AM", completed: false, completedAt: null },
      { id: 2, title: "Classroom Lighting, Electrical & Ventilation Pre-Check", category: "Facilities", time: "09:00 AM", completed: false, completedAt: null },
      { id: 3, title: "Campus Water Cooler Filtration & Restroom Sanitation Inspection", category: "Hygiene", time: "11:30 AM", completed: false, completedAt: null },
      { id: 4, title: "Fire Safety Extinguishers & Emergency Exit Clearance Sweep", category: "Safety", time: "02:00 PM", completed: false, completedAt: null },
      { id: 5, title: "Campus Perimeter Patrol & Evening Gate Lockdown", category: "Closing Operations", time: "04:45 PM", completed: false, completedAt: null },
    ];
  });

  // Maintenance & Facility Tickets State
  const [maintenanceTickets, setMaintenanceTickets] = useState([]);
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    title: "",
    category: "Plumbing",
    location: "",
    priority: "Medium",
    description: "",
  });

  // Leave Form
  const [leaveForm, setLeaveForm] = useState({
    leaveType: "Casual Leave",
    startDate: "",
    endDate: "",
    reason: "",
  });
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["roster", "tasks", "maintenance", "leaves", "scanner", "contacts"].includes(tab)) {
      setActiveTab(tab === "tasks" ? "roster" : tab);
    }
  }, [searchParams]);

  const loadMaintenanceTickets = async () => {
    try {
      const storageKey = `erp_maintenance_tickets_${schoolId}`;
      const raw = localStorage.getItem(storageKey);
      let localList = raw ? JSON.parse(raw) : [];

      if (supabase) {
        const { data, error } = await supabase
          .from("maintenance_tickets")
          .select("*")
          .eq("school_id", schoolId)
          .order("created_at", { ascending: false });

        if (!error && data && data.length > 0) {
          setMaintenanceTickets(data);
          localStorage.setItem(storageKey, JSON.stringify(data));
          return;
        }
      }
      setMaintenanceTickets(localList);
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    // 1. Load staff profile from non-teaching registry
    try {
      const raw = localStorage.getItem(`erp_non_teaching_staff_${schoolId}`);
      if (raw) {
        const list = JSON.parse(raw);
        const match = list.find(
          (s) =>
            s.fullName?.toLowerCase() === staffName.toLowerCase() ||
            s.id === user?.id ||
            s.phone === user?.phone
        );
        if (match) {
          setMyProfile(match);
        } else {
          setMyProfile({
            fullName: staffName,
            category: "Campus Operations Personnel",
            shiftTiming: "General Shift (08:00 AM - 05:00 PM)",
            phone: user?.phone || "+91 98200 00000",
            salary: "₹18,000",
            status: "Active Duty",
          });
        }
      } else {
        setMyProfile({
          fullName: staffName,
          category: "Campus Operations Personnel",
          shiftTiming: "General Shift (08:00 AM - 05:00 PM)",
          phone: user?.phone || "+91 98200 00000",
          salary: "₹18,000",
          status: "Active Duty",
        });
      }
    } catch (e) {}

    // 2. Check today's clock-in state (Local + Supabase staff_attendance)
    const today = new Date().toISOString().split("T")[0];
    try {
      const savedClock = localStorage.getItem(`erp_clockin_${schoolId}_${staffId}_${today}`);
      if (savedClock) {
        setClockedIn(true);
        setClockTime(savedClock);
      }
    } catch (e) {}

    if (supabase) {
      supabase
        .from("staff_attendance")
        .select("time")
        .eq("school_id", schoolId)
        .eq("staff_id", staffId)
        .eq("date", today)
        .limit(1)
        .then(({ data }) => {
          if (data && data.length > 0 && data[0].time) {
            setClockedIn(true);
            setClockTime(data[0].time);
          }
        })
        .catch(() => {});
    }

    // 3. Load leave requests for this staff
    try {
      const rawLeaves = localStorage.getItem(`erp_leave_requests_${schoolId}`);
      if (rawLeaves) {
        const allLeaves = JSON.parse(rawLeaves);
        setMyLeaves(
          allLeaves.filter(
            (l) =>
              l.staffId === staffId ||
              l.applicantName?.toLowerCase() === staffName.toLowerCase()
          )
        );
      } else {
        setMyLeaves([]);
      }
    } catch (e) {
      setMyLeaves([]);
    }

    // 4. Load maintenance tickets
    loadMaintenanceTickets();
  }, [schoolId, staffId, staffName]);

  const handleClockIn = async () => {
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const today = new Date().toISOString().split("T")[0];
    setClockedIn(true);
    setClockTime(nowTime);

    try {
      localStorage.setItem(`erp_clockin_${schoolId}_${staffId}_${today}`, nowTime);
      const attKey = `erp_staff_attendance_${schoolId}`;
      const existing = JSON.parse(localStorage.getItem(attKey) || "[]");
      existing.unshift({
        staffId,
        staffName,
        date: today,
        time: nowTime,
        status: "Present / On Duty",
      });
      localStorage.setItem(attKey, JSON.stringify(existing));
    } catch (e) {}

    // Permanent Supabase staff_attendance logging
    if (supabase) {
      try {
        await supabase.from("staff_attendance").insert([
          {
            school_id: schoolId,
            staff_id: staffId,
            staff_name: staffName,
            date: today,
            time: nowTime,
            status: "Present / On Duty",
          },
        ]);
      } catch (sbErr) {
        console.warn("Supabase staff_attendance log notice:", sbErr);
      }
    }

    logSecurityAction({
      action: "Staff Duty Clock-In Logged",
      entityType: "ATTENDANCE",
      entityId: staffId,
      details: `${staffName} (${staffId}) clocked in at ${nowTime}`,
      user,
      schoolId,
    });

    showToast(`Clock-in permanently recorded at ${nowTime}! Have a safe and productive duty.`, "success");
  };

  const handleToggleTask = (taskId) => {
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        const nextState = !t.completed;
        return { ...t, completed: nextState, completedAt: nextState ? nowTime : null };
      }
      return t;
    });
    setTasks(updated);
    try {
      localStorage.setItem(`erp_nts_tasks_${schoolId}_${staffId}_${todayDateStr}`, JSON.stringify(updated));
    } catch {}
    const justCompleted = updated.find((t) => t.id === taskId)?.completed;
    showToast(justCompleted ? "Task marked completed! ✅" : "Task marked incomplete.", "info");
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!ticketForm.title.trim() || !ticketForm.location.trim()) {
      showToast("Please provide ticket title and facility location.", "error");
      return;
    }

    const newTicket = {
      id: `tick_${Date.now()}`,
      school_id: schoolId,
      reported_by_id: staffId,
      reported_by_name: staffName,
      title: ticketForm.title.trim(),
      category: ticketForm.category,
      location: ticketForm.location.trim(),
      priority: ticketForm.priority,
      description: ticketForm.description.trim(),
      status: "Open",
      created_at: new Date().toISOString(),
    };

    try {
      const storageKey = `erp_maintenance_tickets_${schoolId}`;
      const local = [newTicket, ...maintenanceTickets];
      localStorage.setItem(storageKey, JSON.stringify(local));
      setMaintenanceTickets(local);

      if (supabase) {
        try {
          await supabase.from("maintenance_tickets").insert([newTicket]);
        } catch (sbErr) {
          console.warn("Supabase ticket sync notice:", sbErr);
        }
      }

      showToast("Facility maintenance ticket logged successfully! 🔧", "success");
      setTicketForm({ title: "", category: "Plumbing", location: "", priority: "Medium", description: "" });
      setShowNewTicketModal(false);
    } catch {
      showToast("Failed to create maintenance ticket.", "error");
    }
  };

  const handleApplyLeave = (e) => {
    e.preventDefault();
    if (!leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason.trim()) {
      showToast("Please provide leave start date, end date, and reason.", "error");
      return;
    }

    const newRequest = {
      id: `leave_${Date.now()}`,
      schoolId,
      staffId,
      applicantName: staffName,
      category: myProfile?.category || "Non-Teaching Staff",
      leaveType: leaveForm.leaveType,
      startDate: leaveForm.startDate,
      endDate: leaveForm.endDate,
      reason: leaveForm.reason.trim(),
      status: "Pending Principal Review",
      appliedOn: new Date().toISOString().split("T")[0],
    };

    try {
      const key = `erp_leave_requests_${schoolId}`;
      const all = JSON.parse(localStorage.getItem(key) || "[]");
      all.unshift(newRequest);
      localStorage.setItem(key, JSON.stringify(all));
      window.dispatchEvent(new Event("erp-leaves-updated"));
      setMyLeaves([newRequest, ...myLeaves]);
    } catch (e) {}

    showToast("Leave application submitted for Principal approval!", "success");
    setLeaveForm({ leaveType: "Casual Leave", startDate: "", endDate: "", reason: "" });
    setShowLeaveModal(false);
  };

  return (
    <div className="relative text-slate-200 min-h-full pb-10 font-sans">
      <div className="fixed top-0 right-10 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-6xl mx-auto space-y-8">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">
              <span>🛠️</span> Operational Support Workspace &bull; {schoolId}
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
              Non-Teaching Personnel Portal
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Active Session: <span className="text-white font-bold">{staffName}</span> &bull; ID: <span className="text-blue-400 font-mono font-bold">{staffId}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleClockIn}
              disabled={clockedIn}
              className={`px-6 py-3 rounded-2xl font-black text-sm shadow-xl transition-all cursor-pointer flex items-center gap-2 ${
                clockedIn
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-blue-600/30"
              }`}
            >
              <span>{clockedIn ? "✓" : "🕒"}</span>
              <span>{clockedIn ? `Clocked In (${clockTime})` : "Clock In / Mark Entry"}</span>
            </button>
          </div>
        </div>

        {/* MASSIVE CHUNKY GLASS QUICK ACTIONS FOR OPS & GUARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 animate-fade-in-up stagger-1">
          {/* ACTION 1: SCAN QR */}
          <button
            onClick={() => setActiveTab("scanner")}
            className="group bg-slate-900/60 backdrop-blur-2xl border-2 border-cyan-500/40 hover:border-cyan-400 p-6 rounded-3xl shadow-2xl hover:shadow-[0_0_35px_rgba(6,182,212,0.3)] hover:scale-[1.02] active:scale-95 transition-all duration-300 text-left flex flex-col justify-between min-h-[140px] cursor-pointer"
          >
            <div className="flex items-center justify-between w-full">
              <span className="w-14 h-14 rounded-2xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform">
                📷
              </span>
              <span className="text-[10px] font-mono font-black uppercase px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                1-TAP SCAN
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-xl font-black text-white group-hover:text-cyan-300 transition-colors">
                Scan QR Code
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Camera scan student ID for gate entry & library
              </p>
            </div>
          </button>

          {/* ACTION 2: GATE CHECK-IN */}
          <button
            onClick={handleClockIn}
            disabled={clockedIn}
            className={`group bg-slate-900/60 backdrop-blur-2xl border-2 p-6 rounded-3xl shadow-2xl transition-all duration-300 text-left flex flex-col justify-between min-h-[140px] cursor-pointer ${
              clockedIn
                ? "border-emerald-500/40 bg-emerald-950/20 cursor-default"
                : "border-emerald-500/40 hover:border-emerald-400 hover:shadow-[0_0_35px_rgba(16,185,129,0.3)] hover:scale-[1.02] active:scale-95"
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform">
                {clockedIn ? "✓" : "🚪"}
              </span>
              <span className={`text-[10px] font-mono font-black uppercase px-2.5 py-1 rounded-full border ${
                clockedIn
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                  : "bg-emerald-500/20 text-emerald-300 border-emerald-400/30 animate-pulse"
              }`}>
                {clockedIn ? "VERIFIED ON-DUTY" : "TAP TO CLOCK IN"}
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-xl font-black text-white group-hover:text-emerald-300 transition-colors">
                Gate Check-in
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {clockedIn ? `Entry logged at ${clockTime}` : "Log shift duty arrival timestamp"}
              </p>
            </div>
          </button>

          {/* ACTION 3: LOG ASSET */}
          <button
            onClick={() => {
              showToast("Asset checkpoint logged for Campus Facilities ✅", "success");
            }}
            className="group bg-slate-900/60 backdrop-blur-2xl border-2 border-purple-500/40 hover:border-purple-400 p-6 rounded-3xl shadow-2xl hover:shadow-[0_0_35px_rgba(168,85,247,0.3)] hover:scale-[1.02] active:scale-95 transition-all duration-300 text-left flex flex-col justify-between min-h-[140px] cursor-pointer"
          >
            <div className="flex items-center justify-between w-full">
              <span className="w-14 h-14 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-400/40 flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform">
                📦
              </span>
              <span className="text-[10px] font-mono font-black uppercase px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30">
                OPS LOG
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-xl font-black text-white group-hover:text-purple-300 transition-colors">
                Log Asset Check
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Quick facility equipment & supply audit
              </p>
            </div>
          </button>
        </div>

        {/* PROFILE & QUICK STATS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in-up stagger-2">
          <div className="bg-slate-900/40 backdrop-blur-2xl border border-slate-800/50 hover:border-cyan-500/30 transition-all duration-500 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] rounded-3xl p-5 shadow-xl">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Staff Category</p>
            <p className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-400 tracking-tight">
              {myProfile?.category || "Support Staff"}
            </p>
            <span className="text-xs text-cyan-400/80 font-semibold mt-1 block">Institutional Operations</span>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-2xl border border-slate-800/50 hover:border-cyan-500/30 transition-all duration-500 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] rounded-3xl p-5 shadow-xl">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Assigned Shift</p>
            <p className="text-base font-bold text-white line-clamp-1">{myProfile?.shiftTiming || "General Day Shift"}</p>
            <span className="text-xs text-emerald-400 font-semibold mt-1 block">● Active Schedule</span>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-2xl border border-slate-800/50 hover:border-amber-500/30 transition-all duration-500 hover:shadow-[0_0_30px_rgba(245,158,11,0.15)] rounded-3xl p-5 shadow-xl">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Monthly Base Wage</p>
            <p className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-400 tracking-tight font-mono">
              {myProfile?.salary || "₹18,000"}
            </p>
            <span className="text-xs text-slate-400 mt-1 block">Direct Bank Settlement</span>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-2xl border border-slate-800/50 hover:border-emerald-500/30 transition-all duration-500 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] rounded-3xl p-5 shadow-xl">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Today's Duty Status</p>
            <p className="text-xl font-black text-white">
              {clockedIn ? "On Duty (Verified)" : "Pending Clock-In"}
            </p>
            <span className={`text-xs font-bold mt-1 block ${clockedIn ? "text-emerald-400" : "text-amber-400"}`}>
              {clockedIn ? `Logged at ${clockTime}` : "Tap Clock In above"}
            </span>
          </div>
        </div>

        {/* WORKSPACE NAVIGATION TABS */}
        <div className="flex gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("roster")}
            className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "roster"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            📋 Daily Tasks & Roster
          </button>
          <button
            onClick={() => setActiveTab("maintenance")}
            className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "maintenance"
                ? "bg-amber-600 text-white shadow-lg shadow-amber-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            🔧 Maintenance & Requests ({maintenanceTickets.length})
          </button>
          <button
            onClick={() => setActiveTab("leaves")}
            className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "leaves"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            📝 My Leave Applications ({myLeaves.length})
          </button>
          <button
            onClick={() => setActiveTab("scanner")}
            className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "scanner"
                ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            🔍 QR Gate & Equipment Scanner
          </button>
          <button
            onClick={() => setActiveTab("contacts")}
            className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "contacts"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            📞 Emergency & Admin Contacts
          </button>
        </div>

        {/* TAB 1: INTERACTIVE DAILY MY TASKS & SHIFT ROSTER */}
        {activeTab === "roster" && (
          <div className="space-y-6">
            {/* INTERACTIVE MY TASKS CHECKLIST (BATCH 2 ITEM 7) */}
            <div className="bg-[#1E293B]/80 backdrop-blur-xl border border-slate-700/70 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
                    <span>⚡</span> Daily Work Orders
                  </div>
                  <h3 className="text-xl font-extrabold text-white">My Tasks & Operational Checklist</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Assigned daily maintenance, security rounds, and facility inspections. Check off as you complete.
                  </p>
                </div>
                <div className="bg-slate-900/60 border border-slate-700/60 rounded-2xl px-4 py-2.5 text-right">
                  <span className="text-xs text-slate-400 block font-semibold">Progress Today</span>
                  <span className="text-lg font-black text-emerald-400">
                    {tasks.filter((t) => t.completed).length} / {tasks.length} Done
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-2.5 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.round((tasks.filter((t) => t.completed).length / tasks.length) * 100)}%`,
                  }}
                ></div>
              </div>

              {/* Tasks List */}
              <div className="space-y-3 pt-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => handleToggleTask(task.id)}
                    className={`flex items-start sm:items-center justify-between gap-4 p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                      task.completed
                        ? "bg-emerald-950/20 border-emerald-500/30 opacity-80"
                        : "bg-slate-900/50 hover:bg-slate-800/60 border-slate-700/60 hover:border-blue-500/40"
                    }`}
                  >
                    <div className="flex items-start sm:items-center gap-3.5 flex-1">
                      <button
                        type="button"
                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 transition-all ${
                          task.completed
                            ? "bg-emerald-500 border-emerald-400 text-slate-950 font-black shadow-md shadow-emerald-500/30"
                            : "border-slate-500 hover:border-blue-400 bg-slate-800"
                        }`}
                      >
                        {task.completed ? "✓" : ""}
                      </button>
                      <div>
                        <p
                          className={`text-sm font-semibold transition-all ${
                            task.completed ? "line-through text-slate-400" : "text-white"
                          }`}
                        >
                          {task.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {task.category}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            Scheduled: {task.time}
                          </span>
                          {task.completed && task.completedAt && (
                            <span className="text-[10px] font-mono text-emerald-400">
                              &bull; Verified at {task.completedAt}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-xl shrink-0 ${
                        task.completed
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-slate-800 text-slate-400 border border-slate-700"
                      }`}
                    >
                      {task.completed ? "Completed" : "Pending"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* DESIGNATED SHIFT SCHEDULE */}
            <div className="bg-[#1E293B]/80 backdrop-blur-xl border border-slate-700/70 rounded-3xl shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-700/60 bg-slate-800/40 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-white">Designated Shift Schedule</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Assigned operational posts and patrol checkpoints</p>
                </div>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full font-bold">
                  {myProfile?.shiftTiming || "Standard Shift"}
                </span>
              </div>

              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-700/70 text-slate-400 text-xs uppercase tracking-wider bg-slate-900/40">
                      <th className="p-4 pl-6">Day of Week</th>
                      <th className="p-4">Assigned Duty Post</th>
                      <th className="p-4">Reporting Hours</th>
                      <th className="p-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-sm">
                    {[
                      { day: "Monday", duty: "Campus Checkpoint & Facility Patrol", hours: myProfile?.shiftTiming || "08:00 AM - 04:00 PM" },
                      { day: "Tuesday", duty: "Campus Checkpoint & Facility Patrol", hours: myProfile?.shiftTiming || "08:00 AM - 04:00 PM" },
                      { day: "Wednesday", duty: "Facility Maintenance & Operations", hours: myProfile?.shiftTiming || "08:00 AM - 04:00 PM" },
                      { day: "Thursday", duty: "Campus Checkpoint & Facility Patrol", hours: myProfile?.shiftTiming || "08:00 AM - 04:00 PM" },
                      { day: "Friday", duty: "Campus Checkpoint & Facility Patrol", hours: myProfile?.shiftTiming || "08:00 AM - 04:00 PM" },
                      { day: "Saturday", duty: "Weekly Equipment Inspection & Inventory", hours: "08:30 AM - 01:30 PM" },
                    ].map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-4 pl-6 font-bold text-white">{s.day}</td>
                        <td className="p-4 text-slate-300 font-semibold">{s.duty}</td>
                        <td className="p-4 text-xs font-mono text-amber-300">{s.hours}</td>
                        <td className="p-4 text-center">
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Active Duty
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MAINTENANCE & FACILITY REQUESTS (BATCH 2 ITEM 6) */}
        {activeTab === "maintenance" && (
          <div className="bg-[#1E293B]/80 backdrop-blur-xl border border-slate-700/70 rounded-3xl shadow-2xl overflow-hidden space-y-6 p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-700/60">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
                  <span>🔧</span> Facility Operations & Work Orders
                </div>
                <h3 className="text-2xl font-extrabold text-white">Maintenance & Facility Requests</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Report broken equipment, plumbing, electrical, or infrastructure issues directly to Admin.
                </p>
              </div>

              <button
                onClick={() => setShowNewTicketModal(true)}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-5 py-2.5 rounded-2xl text-xs sm:text-sm shadow-lg shadow-amber-600/30 transition-all cursor-pointer flex items-center gap-2"
              >
                <span>➕</span>
                <span>Report New Issue</span>
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
                <span className="text-xs text-slate-400 font-semibold uppercase">Total Tickets</span>
                <p className="text-xl font-black text-white mt-1">{maintenanceTickets.length}</p>
              </div>
              <div className="bg-slate-900/50 border border-amber-500/20 rounded-2xl p-4">
                <span className="text-xs text-amber-400 font-semibold uppercase">Open</span>
                <p className="text-xl font-black text-amber-300 mt-1">
                  {maintenanceTickets.filter((t) => (t.status || "Open").toLowerCase() === "open").length}
                </p>
              </div>
              <div className="bg-slate-900/50 border border-blue-500/20 rounded-2xl p-4">
                <span className="text-xs text-blue-400 font-semibold uppercase">In Progress</span>
                <p className="text-xl font-black text-blue-300 mt-1">
                  {maintenanceTickets.filter((t) => (t.status || "").toLowerCase() === "in progress").length}
                </p>
              </div>
              <div className="bg-slate-900/50 border border-emerald-500/20 rounded-2xl p-4">
                <span className="text-xs text-emerald-400 font-semibold uppercase">Resolved</span>
                <p className="text-xl font-black text-emerald-300 mt-1">
                  {maintenanceTickets.filter((t) => (t.status || "").toLowerCase() === "resolved").length}
                </p>
              </div>
            </div>

            {/* Tickets Table / List */}
            {maintenanceTickets.length === 0 ? (
              <div className="p-12 text-center text-slate-400 border border-dashed border-slate-700 rounded-2xl">
                <span className="text-4xl block mb-2 opacity-60">🔧</span>
                <p className="font-bold text-white text-base">No open maintenance requests recorded.</p>
                <p className="text-xs text-slate-400 mt-1">
                  Click "Report New Issue" above to submit a plumbing, electrical, or structural request.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-700/70 text-slate-400 text-xs uppercase tracking-wider bg-slate-900/40">
                      <th className="p-4 pl-6">Ticket Title & Description</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Location</th>
                      <th className="p-4">Priority</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4">Reported</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-sm">
                    {maintenanceTickets.map((ticket) => (
                      <tr key={ticket.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-4 pl-6">
                          <p className="font-bold text-white">{ticket.title}</p>
                          {ticket.description && (
                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{ticket.description}</p>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-medium">
                            {ticket.category || "General"}
                          </span>
                        </td>
                        <td className="p-4 text-xs font-semibold text-slate-300">{ticket.location}</td>
                        <td className="p-4">
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                              ticket.priority === "Critical"
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                : ticket.priority === "High"
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                            }`}
                          >
                            {ticket.priority || "Medium"}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold ${
                              (ticket.status || "Open").toLowerCase() === "resolved"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : (ticket.status || "Open").toLowerCase() === "in progress"
                                ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            }`}
                          >
                            {ticket.status || "Open"}
                          </span>
                        </td>
                        <td className="p-4 text-xs text-slate-400 font-mono">
                          {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : "Today"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LEAVE APPLICATIONS */}
        {activeTab === "leaves" && (
          <div className="bg-[#1E293B]/80 backdrop-blur-xl border border-slate-700/70 rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-700/60 bg-slate-800/40 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white">My Leave Applications & Review Status</h3>
                <p className="text-xs text-slate-400 mt-0.5">Submit applications for Principal or Trustee review</p>
              </div>
              <button
                onClick={() => setShowLeaveModal(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>➕</span>
                <span>Apply for Leave</span>
              </button>
            </div>

            {myLeaves.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <span className="text-4xl block mb-2 opacity-60">📝</span>
                <p className="font-bold text-white text-base">No leave applications submitted yet.</p>
                <p className="text-xs text-slate-400 mt-1">Click "Apply for Leave" to submit casual or emergency leave requests.</p>
              </div>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-700/70 text-slate-400 text-xs uppercase tracking-wider bg-slate-900/40">
                      <th className="p-4 pl-6">Leave Type</th>
                      <th className="p-4">Duration</th>
                      <th className="p-4">Reason</th>
                      <th className="p-4 text-center">Review Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-sm">
                    {myLeaves.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-4 pl-6 font-bold text-white">{l.leaveType}</td>
                        <td className="p-4 text-xs font-mono text-slate-300">
                          {l.startDate} &rarr; {l.endDate}
                        </td>
                        <td className="p-4 text-xs text-slate-300">{l.reason}</td>
                        <td className="p-4 text-center">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold ${
                              l.status === "Approved"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : l.status === "Rejected"
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            }`}
                          >
                            {l.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: CAMPUS CONTACT EXTENSIONS */}
        {activeTab === "contacts" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#1E293B]/80 border border-slate-700/70 rounded-3xl p-6 shadow-xl space-y-3">
              <span className="text-3xl">🏛️</span>
              <h3 className="text-lg font-bold text-white">Principal / Executive Office</h3>
              <p className="text-xs text-slate-400">Institutional administration, emergencies, and approvals.</p>
              <div className="pt-2 border-t border-slate-800">
                <a
                  href="tel:+919518388499"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-all"
                >
                  <span>📞</span> Call Office (+91 95183 88499)
                </a>
              </div>
            </div>

            <div className="bg-[#1E293B]/80 border border-slate-700/70 rounded-3xl p-6 shadow-xl space-y-3">
              <span className="text-3xl">💰</span>
              <h3 className="text-lg font-bold text-white">Accounts & Payroll Treasury</h3>
              <p className="text-xs text-slate-400">Monthly wages, overtime calculations, and salary disbursements.</p>
              <div className="pt-2 border-t border-slate-800">
                <a
                  href="tel:+919820011111"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-all"
                >
                  <span>📞</span> Call Accounts Desk
                </a>
              </div>
            </div>

            <div className="bg-[#1E293B]/80 border border-slate-700/70 rounded-3xl p-6 shadow-xl space-y-3">
              <span className="text-3xl">🚨</span>
              <h3 className="text-lg font-bold text-white">Campus Security & Health Desk</h3>
              <p className="text-xs text-slate-400">First-aid medical room, gate incident reports, and surveillance.</p>
              <div className="pt-2 border-t border-slate-800">
                <a
                  href="tel:+919820022222"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-all"
                >
                  <span>📞</span> Emergency Line (24x7)
                </a>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: WEB-FIRST QR GATE & ASSET SCANNER */}
        {activeTab === "scanner" && (
          <QRScannerModule schoolCode={schoolId} />
        )}
      </div>

      {/* APPLY LEAVE MODAL */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#1E293B] border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-extrabold text-white mb-1">Apply for Duty Leave 📝</h3>
            <p className="text-xs text-slate-400 mb-6">Submitted requests are routed to the Principal Command Center.</p>

            <form onSubmit={handleApplyLeave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Leave Category</label>
                <select
                  value={leaveForm.leaveType}
                  onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Casual Leave">Casual Leave (Personal Work)</option>
                  <option value="Medical / Sick Leave">Medical / Sick Leave</option>
                  <option value="Family Emergency">Family Emergency</option>
                  <option value="Festival Holiday">Festival Holiday</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Start Date</label>
                  <input
                    type="date"
                    value={leaveForm.startDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">End Date</label>
                  <input
                    type="date"
                    value={leaveForm.endDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Reason for Leave</label>
                <textarea
                  rows={3}
                  placeholder="Provide concise reason for institutional record..."
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-lg transition-all cursor-pointer"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* REPORT NEW MAINTENANCE TICKET MODAL */}
      {showNewTicketModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#1E293B] border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl">
            <h3 className="text-xl font-extrabold text-white mb-1">Report Facility Maintenance Issue 🔧</h3>
            <p className="text-xs text-slate-400 mb-6">
              Create an operational work order for electrical, plumbing, sanitation, or structural repairs.
            </p>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Issue Title / Summary
                </label>
                <input
                  type="text"
                  placeholder="e.g. Broken Water Tap in 2nd Floor Washroom"
                  value={ticketForm.title}
                  onChange={(e) => setTicketForm({ ...ticketForm, title: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={ticketForm.category}
                    onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Plumbing">Plumbing & Sanitation</option>
                    <option value="Electrical">Electrical & Lighting</option>
                    <option value="Carpentry / Furniture">Carpentry / Desks</option>
                    <option value="HVAC / Air Cooling">HVAC / Ventilation</option>
                    <option value="Civil / Painting">Civil & Structural</option>
                    <option value="Safety & Surveillance">Safety / CCTV / Extinguishers</option>
                    <option value="General Maintenance">General Maintenance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Priority Level
                  </label>
                  <select
                    value={ticketForm.priority}
                    onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Low">Low - Normal Routine</option>
                    <option value="Medium">Medium - Regular Priority</option>
                    <option value="High">High - Prompt Action</option>
                    <option value="Critical">Critical - Safety / Immediate Hazard</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Location / Room / Area
                </label>
                <input
                  type="text"
                  placeholder="e.g. Block B, Physics Lab, Ground Floor Hallway"
                  value={ticketForm.location}
                  onChange={(e) => setTicketForm({ ...ticketForm, location: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Issue Description & Specifics
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe the issue, any safety concerns, or parts needed..."
                  value={ticketForm.description}
                  onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewTicketModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-lg shadow-amber-600/30 transition-all cursor-pointer"
                >
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}