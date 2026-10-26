import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { logSecurityAction } from "../utils/auditLogger";

const TIME_SLOTS_15MIN = [
  "09:00 AM - 09:15 AM",
  "09:15 AM - 09:30 AM",
  "09:30 AM - 09:45 AM",
  "10:00 AM - 10:15 AM",
  "10:15 AM - 10:30 AM",
  "11:30 AM - 11:45 AM",
  "02:00 PM - 02:15 PM",
  "02:15 PM - 02:30 PM",
  "03:00 PM - 03:15 PM",
  "03:15 PM - 03:30 PM",
];

export default function MeetingScheduler({ schoolId: propSchoolId }) {
  const { user } = useContext(AppContext) || {};
  const { showToast } = useToast();
  const schoolId = propSchoolId || user?.school_id || user?.institution_code || "CAMPUS-01";

  const [meetings, setMeetings] = useState([]);
  const [filterDate, setFilterDate] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [showBookModal, setShowBookModal] = useState(false);

  const [form, setForm] = useState({
    visitorName: "",
    visitorRole: "Parent", // Parent | Faculty / Staff | Trustee | External Visitor
    studentAffiliation: "",
    date: new Date().toISOString().split("T")[0],
    timeSlot: TIME_SLOTS_15MIN[0],
    purpose: "",
    contactPhone: "",
  });

  const loadMeetings = () => {
    try {
      const saved = localStorage.getItem(`erp_principal_meetings_${schoolId}`);
      if (saved) {
        setMeetings(JSON.parse(saved));
      } else {
        setMeetings([]);
      }
    } catch {
      setMeetings([]);
    }
  };

  useEffect(() => {
    loadMeetings();
    const handleUpdate = () => loadMeetings();
    window.addEventListener("erp-meetings-updated", handleUpdate);
    return () => window.removeEventListener("erp-meetings-updated", handleUpdate);
  }, [schoolId]);

  const saveMeetings = (updated) => {
    setMeetings(updated);
    try {
      localStorage.setItem(`erp_principal_meetings_${schoolId}`, JSON.stringify(updated));
      window.dispatchEvent(new Event("erp-meetings-updated"));
    } catch (e) {
      console.warn("Storage save error:", e);
    }
  };

  const handleBookSlot = (e) => {
    e.preventDefault();
    if (!form.visitorName.trim() || !form.date || !form.timeSlot) {
      showToast("Please provide visitor name, date, and appointment slot.", "error");
      return;
    }

    // Check collision for same date and time slot
    const collision = meetings.find(
      (m) => m.date === form.date && m.timeSlot === form.timeSlot && m.status === "Confirmed"
    );
    if (collision) {
      showToast(`Slot ${form.timeSlot} on ${form.date} is already booked! Please select another slot.`, "error");
      return;
    }

    const newMeeting = {
      id: `meet_${Date.now()}`,
      bookingRef: `SLOT-${Date.now().toString().slice(-4)}`,
      visitorName: form.visitorName.trim(),
      visitorRole: form.visitorRole,
      studentAffiliation: form.studentAffiliation.trim() || "N/A",
      date: form.date,
      timeSlot: form.timeSlot,
      purpose: form.purpose.trim() || "Executive academic consultation.",
      contactPhone: form.contactPhone.trim() || "+91 98000 00000",
      status: "Confirmed", // Confirmed | Completed | Cancelled
      bookedAt: new Date().toISOString().split("T")[0],
    };

    const updated = [newMeeting, ...meetings];
    saveMeetings(updated);

    logSecurityAction({
      action: "PRINCIPAL_MEETING_BOOKED",
      entityType: "APPOINTMENT",
      entityId: newMeeting.bookingRef,
      details: `Scheduled 15-min consultation with ${newMeeting.visitorName} (${newMeeting.visitorRole}) on ${newMeeting.date} at ${newMeeting.timeSlot}`,
      schoolId,
    });

    showToast(`15-Min appointment confirmed for ${newMeeting.visitorName}!`, "success");
    setForm({
      visitorName: "",
      visitorRole: "Parent",
      studentAffiliation: "",
      date: new Date().toISOString().split("T")[0],
      timeSlot: TIME_SLOTS_15MIN[0],
      purpose: "",
      contactPhone: "",
    });
    setShowBookModal(false);
  };

  const handleStatusChange = (id, newStatus) => {
    const updated = meetings.map((m) => (m.id === id ? { ...m, status: newStatus } : m));
    saveMeetings(updated);
    showToast(`Appointment status updated to ${newStatus}.`, "info");
  };

  const filteredMeetings = meetings.filter((m) => {
    const matchesDate = !filterDate || m.date === filterDate;
    const matchesStatus = filterStatus === "ALL" || m.status === filterStatus;
    return matchesDate && matchesStatus;
  });

  return (
    <div className="space-y-6 text-slate-100">
      {/* Header Banner */}
      <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-cyan-500/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all duration-300 ease-in-out">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-bold uppercase tracking-wider mb-2">
            <span>📅</span> Executive Agenda & Scheduling
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Principal 15-Min Meeting Scheduler</h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-xl">
            Streamlined calendar integration for parents, staff, and trustees to book dedicated 15-minute consultation slots with the Executive Principal.
          </p>
        </div>
        <button
          onClick={() => setShowBookModal(true)}
          className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black px-5 py-3 rounded-2xl text-xs sm:text-sm shadow-xl shadow-cyan-500/20 transition-all duration-300 ease-in-out hover:scale-[1.02] cursor-pointer flex items-center gap-2 border border-white/20"
        >
          <span>➕</span>
          <span>Book Appointment Slot</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-xl shadow-cyan-500/5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Bookings</p>
          <p className="text-2xl font-black text-white mt-1">{meetings.length}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-xl shadow-cyan-500/5">
          <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Upcoming Confirmed</p>
          <p className="text-2xl font-black text-cyan-400 mt-1">
            {meetings.filter((m) => m.status === "Confirmed").length}
          </p>
        </div>
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-xl shadow-cyan-500/5">
          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Concluded</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">
            {meetings.filter((m) => m.status === "Completed").length}
          </p>
        </div>
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-xl shadow-cyan-500/5">
          <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Slot Cadence</p>
          <p className="text-2xl font-black text-amber-400 mt-1">15 Mins</p>
        </div>
      </div>

      {/* Filter and Date Bar */}
      <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between shadow-xl shadow-cyan-500/5">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <span className="text-xs font-bold text-slate-400 uppercase">Filter Date:</span>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="bg-slate-950/60 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
          />
          {filterDate && (
            <button
              onClick={() => setFilterDate("")}
              className="text-xs text-slate-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {["ALL", "Confirmed", "Completed", "Cancelled"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-300 ease-in-out hover:scale-[1.02] cursor-pointer ${
                filterStatus === s
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-lg shadow-cyan-500/20"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Meetings Schedule Table */}
      <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl shadow-cyan-500/10 overflow-hidden">
        {filteredMeetings.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <span className="text-4xl block opacity-60">📅</span>
            <h4 className="text-base font-bold text-white">No Consultations Scheduled (Clean Slate)</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              The Principal calendar is currently clear. Click "Book Appointment Slot" to schedule a meeting.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 text-xs uppercase tracking-wider bg-white/5">
                  <th className="p-4 pl-6">Scheduled Visitor</th>
                  <th className="p-4">Appointment Slot</th>
                  <th className="p-4">Affiliation & Contact</th>
                  <th className="p-4">Meeting Purpose</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right pr-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {filteredMeetings.map((m) => (
                  <tr
                    key={m.id}
                    className="hover:bg-white/5 transition-all duration-300 ease-in-out hover:scale-[1.005]"
                  >
                    <td className="p-4 pl-6 font-bold text-white">
                      {m.visitorName}
                      <span className="block text-[10px] text-cyan-400 font-mono font-normal">
                        Ref #{m.bookingRef} • {m.visitorRole}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-xs">
                      <span className="font-bold text-white block">{m.date}</span>
                      <span className="text-cyan-300 text-[11px] font-semibold">{m.timeSlot}</span>
                    </td>
                    <td className="p-4 text-xs text-slate-300">
                      <span className="block font-semibold text-slate-200">{m.studentAffiliation}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{m.contactPhone}</span>
                    </td>
                    <td className="p-4 text-xs text-slate-400 max-w-[200px] truncate" title={m.purpose}>
                      {m.purpose}
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-extrabold uppercase ${
                          m.status === "Confirmed"
                            ? "bg-cyan-500/20 text-cyan-400 border border-cyan-400/30"
                            : m.status === "Completed"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                        }`}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td className="p-4 text-right pr-6">
                      <div className="flex items-center justify-end gap-1.5">
                        {m.status === "Confirmed" && (
                          <button
                            onClick={() => handleStatusChange(m.id, "Completed")}
                            className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 px-2 py-1 rounded-lg text-xs font-bold transition-all duration-300 ease-in-out hover:scale-[1.02] cursor-pointer"
                          >
                            ✓ Conclude
                          </button>
                        )}
                        {m.status !== "Cancelled" && (
                          <button
                            onClick={() => handleStatusChange(m.id, "Cancelled")}
                            className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 px-2 py-1 rounded-lg text-xs font-bold transition-all duration-300 ease-in-out hover:scale-[1.02] cursor-pointer"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Book Appointment */}
      {showBookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900/95 border border-white/10 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl shadow-cyan-500/20 relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-black text-white">Schedule 15-Min Principal Slot</h3>
              <button
                onClick={() => setShowBookModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBookSlot} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Visitor Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Dr. Meenakshi Sundaram"
                    value={form.visitorName}
                    onChange={(e) => setForm({ ...form, visitorName: e.target.value })}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Visitor Role
                  </label>
                  <select
                    value={form.visitorRole}
                    onChange={(e) => setForm({ ...form, visitorRole: e.target.value })}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="Parent">Parent / Guardian</option>
                    <option value="Faculty / Staff">Faculty / Staff Member</option>
                    <option value="Trustee / Board">Trustee / Board Member</option>
                    <option value="External Visitor">Inspector / External Dignitary</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Student Affiliation (If Parent)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Parent of Rohan (10-A)"
                    value={form.studentAffiliation}
                    onChange={(e) => setForm({ ...form, studentAffiliation: e.target.value })}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g., +91 98200 45678"
                    value={form.contactPhone}
                    onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Meeting Date
                  </label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    15-Minute Slot
                  </label>
                  <select
                    value={form.timeSlot}
                    onChange={(e) => setForm({ ...form, timeSlot: e.target.value })}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  >
                    {TIME_SLOTS_15MIN.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Discussion Agenda / Purpose
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Summarize the topic to be addressed during consultation..."
                  value={form.purpose}
                  onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowBookModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black px-5 py-2.5 rounded-xl text-xs shadow-lg shadow-cyan-500/20 transition-all duration-300 ease-in-out hover:scale-[1.02]"
                >
                  Confirm Appointment 📅
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

