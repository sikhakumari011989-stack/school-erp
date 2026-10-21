import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { logSecurityAction } from "../utils/auditLogger";

export default function StaffDashboard() {
  const { user } = useContext(AppContext);
  const { showToast } = useToast();
  const schoolId = user?.school_id || user?.institution_code || "CAMPUS-01";
  const staffId = user?.personal_code || user?.role_code || "NON-01";
  const staffName = user?.name || user?.full_name || "Support Staff Member";

  const [clockedIn, setClockedIn] = useState(false);
  const [clockTime, setClockTime] = useState(null);
  const [myProfile, setMyProfile] = useState(null);
  const [myLeaves, setMyLeaves] = useState([]);
  const [activeTab, setActiveTab] = useState("roster"); // 'roster' | 'leaves' | 'contacts'

  // Leave Form
  const [leaveForm, setLeaveForm] = useState({
    leaveType: "Casual Leave",
    startDate: "",
    endDate: "",
    reason: "",
  });
  const [showLeaveModal, setShowLeaveModal] = useState(false);

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

    // 2. Check today's clock-in state
    try {
      const today = new Date().toISOString().split("T")[0];
      const savedClock = localStorage.getItem(`erp_clockin_${schoolId}_${staffId}_${today}`);
      if (savedClock) {
        setClockedIn(true);
        setClockTime(savedClock);
      }
    } catch (e) {}

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
  }, [schoolId, staffId, staffName]);

  const handleClockIn = () => {
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

    logSecurityAction({
      action: "Staff Duty Clock-In Logged",
      entityType: "ATTENDANCE",
      entityId: staffId,
      details: `${staffName} (${staffId}) clocked in at ${nowTime}`,
      user,
      schoolId,
    });

    showToast(`Clock-in recorded at ${nowTime}! Have a safe and productive duty.`, "success");
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
                  : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30"
              }`}
            >
              <span>{clockedIn ? "✓" : "🕒"}</span>
              <span>{clockedIn ? `Clocked In (${clockTime})` : "Clock In / Mark Entry"}</span>
            </button>
          </div>
        </div>

        {/* PROFILE & QUICK STATS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[#1E293B]/80 border border-slate-700/80 rounded-3xl p-5 shadow-xl">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Staff Category</p>
            <p className="text-xl font-black text-white">{myProfile?.category || "Support Staff"}</p>
            <span className="text-xs text-blue-400 font-semibold mt-1 block">Institutional Operations</span>
          </div>

          <div className="bg-[#1E293B]/80 border border-slate-700/80 rounded-3xl p-5 shadow-xl">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Assigned Shift</p>
            <p className="text-base font-bold text-white line-clamp-1">{myProfile?.shiftTiming || "General Day Shift"}</p>
            <span className="text-xs text-emerald-400 font-semibold mt-1 block">● Active Schedule</span>
          </div>

          <div className="bg-[#1E293B]/80 border border-slate-700/80 rounded-3xl p-5 shadow-xl">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Monthly Wage / Salary</p>
            <p className="text-2xl font-black text-amber-300 font-mono">{myProfile?.salary || "₹18,000"}</p>
            <span className="text-xs text-slate-400 mt-1 block">Direct Bank Transfer</span>
          </div>

          <div className="bg-[#1E293B]/80 border border-slate-700/80 rounded-3xl p-5 shadow-xl">
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
            📋 Weekly Duty Schedule
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

        {/* TAB 1: WEEKLY SHIFT ROSTER */}
        {activeTab === "roster" && (
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
    </div>
  );
}