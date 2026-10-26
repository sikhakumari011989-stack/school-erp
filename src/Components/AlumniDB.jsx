import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { logSecurityAction } from "../utils/auditLogger";

export default function AlumniDB({ schoolId: propSchoolId }) {
  const { user } = useContext(AppContext) || {};
  const { showToast } = useToast();
  const schoolId = propSchoolId || user?.school_id || user?.institution_code || "CAMPUS-01";

  const [alumni, setAlumni] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterYear, setFilterYear] = useState("ALL");
  const [showAddModal, setShowAddModal] = useState(false);

  const [form, setForm] = useState({
    name: "",
    gradYear: "2024",
    stream: "Science (PCM)",
    collegePlacement: "",
    currentRole: "",
    pledgedDonation: "",
    contactEmail: "",
    phone: "",
  });

  const loadAlumni = () => {
    try {
      const saved = localStorage.getItem(`erp_alumni_${schoolId}`);
      if (saved) {
        setAlumni(JSON.parse(saved));
      } else {
        setAlumni([]);
      }
    } catch {
      setAlumni([]);
    }
  };

  useEffect(() => {
    loadAlumni();
    const handleUpdate = () => loadAlumni();
    window.addEventListener("erp-alumni-updated", handleUpdate);
    return () => window.removeEventListener("erp-alumni-updated", handleUpdate);
  }, [schoolId]);

  const saveAlumni = (updated) => {
    setAlumni(updated);
    try {
      localStorage.setItem(`erp_alumni_${schoolId}`, JSON.stringify(updated));
      window.dispatchEvent(new Event("erp-alumni-updated"));
    } catch (e) {
      console.warn("Storage save error:", e);
    }
  };

  const handleAddAlumni = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.collegePlacement.trim()) {
      showToast("Please provide alumni name and college/career placement.", "error");
      return;
    }

    const donationNum = Number(form.pledgedDonation) || 0;

    const newAlumni = {
      id: `alm_${Date.now()}`,
      alumniId: `ALM-${form.gradYear}-${Date.now().toString().slice(-3)}`,
      name: form.name.trim(),
      gradYear: form.gradYear,
      stream: form.stream,
      collegePlacement: form.collegePlacement.trim(),
      currentRole: form.currentRole.trim() || "Higher Education Scholar",
      pledgedDonation: donationNum,
      contactEmail: form.contactEmail.trim() || "alumni@network.edu",
      phone: form.phone.trim() || "+91 98000 00000",
      registeredAt: new Date().toISOString().split("T")[0],
    };

    const updated = [newAlumni, ...alumni];
    saveAlumni(updated);

    logSecurityAction({
      action: "ALUMNI_RECORD_ADDED",
      entityType: "ALUMNI",
      entityId: newAlumni.alumniId,
      details: `Registered alumni ${newAlumni.name} (Class of ${newAlumni.gradYear}) at ${newAlumni.collegePlacement}`,
      schoolId,
    });

    showToast(`Alumni record registered for ${newAlumni.name}!`, "success");
    setForm({
      name: "",
      gradYear: "2024",
      stream: "Science (PCM)",
      collegePlacement: "",
      currentRole: "",
      pledgedDonation: "",
      contactEmail: "",
      phone: "",
    });
    setShowAddModal(false);
  };

  const handleDeleteAlumni = (id) => {
    const updated = alumni.filter((a) => a.id !== id);
    saveAlumni(updated);
    showToast("Alumni record deleted.", "info");
  };

  const totalDonationPledged = alumni.reduce((sum, a) => sum + (Number(a.pledgedDonation) || 0), 0);

  const filteredAlumni = alumni.filter((a) => {
    const matchesYear = filterYear === "ALL" || a.gradYear === filterYear;
    const matchesSearch =
      (a.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.collegePlacement || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.currentRole || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesYear && matchesSearch;
  });

  // Extract distinct years
  const distinctYears = Array.from(new Set(alumni.map((a) => a.gradYear))).sort().reverse();

  return (
    <div className="space-y-6 text-slate-100">
      {/* Header Banner */}
      <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-cyan-500/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all duration-300 ease-in-out">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-bold uppercase tracking-wider mb-2">
            <span>🎓</span> Institutional Legacy & Endowment
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Alumni Placement & Donation Directory</h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-xl">
            Read-only database tracking graduated students, collegiate admissions, professional appointments, and endowment pledge contributions.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black px-5 py-3 rounded-2xl text-xs sm:text-sm shadow-xl shadow-cyan-500/20 transition-all duration-300 ease-in-out hover:scale-[1.02] cursor-pointer flex items-center gap-2 border border-white/20"
        >
          <span>➕</span>
          <span>Register Graduated Scholar</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-xl shadow-cyan-500/5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Graduates on File</p>
          <p className="text-2xl font-black text-white mt-1">{alumni.length}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-xl shadow-cyan-500/5">
          <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Premier Placements</p>
          <p className="text-2xl font-black text-cyan-400 mt-1">
            {alumni.filter((a) => a.collegePlacement).length}
          </p>
        </div>
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-xl shadow-cyan-500/5">
          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Endowment Pledged</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">
            ₹{totalDonationPledged.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-xl shadow-cyan-500/5">
          <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Network Batches</p>
          <p className="text-2xl font-black text-amber-400 mt-1">
            {distinctYears.length > 0 ? distinctYears.length : "0"} Batches
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between shadow-xl shadow-cyan-500/5">
        <div className="flex-1 w-full md:w-auto">
          <input
            type="text"
            placeholder="Search alumni name, university, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-400"
          >
            <option value="ALL">All Batch Years</option>
            {distinctYears.map((yr) => (
              <option key={yr} value={yr}>
                Class of {yr}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Alumni Directory Table */}
      <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl shadow-cyan-500/10 overflow-hidden">
        {filteredAlumni.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <span className="text-4xl block opacity-60">🎓</span>
            <h4 className="text-base font-bold text-white">No Alumni Registered (Clean Slate)</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              No graduated scholars recorded in the institutional database yet. Click "Register Graduated Scholar" to build your network.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 text-xs uppercase tracking-wider bg-white/5">
                  <th className="p-4 pl-6">Graduate Scholar</th>
                  <th className="p-4">Batch & Discipline</th>
                  <th className="p-4">Collegiate Placement</th>
                  <th className="p-4">Current Appointment</th>
                  <th className="p-4">Donation Pledged</th>
                  <th className="p-4 text-right pr-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {filteredAlumni.map((a) => (
                  <tr
                    key={a.id}
                    className="hover:bg-white/5 transition-all duration-300 ease-in-out hover:scale-[1.005]"
                  >
                    <td className="p-4 pl-6 font-bold text-white">
                      {a.name}
                      <span className="block text-[10px] text-cyan-400 font-mono font-normal">
                        ID #{a.alumniId} • {a.contactEmail}
                      </span>
                    </td>
                    <td className="p-4 text-xs">
                      <span className="font-extrabold text-white block">Class of {a.gradYear}</span>
                      <span className="text-slate-400">{a.stream}</span>
                    </td>
                    <td className="p-4 text-xs font-semibold text-cyan-300">{a.collegePlacement}</td>
                    <td className="p-4 text-xs text-slate-300">{a.currentRole}</td>
                    <td className="p-4 font-mono font-black text-xs text-emerald-400">
                      {a.pledgedDonation > 0 ? `₹${Number(a.pledgedDonation).toLocaleString("en-IN")}` : "Honorary"}
                    </td>
                    <td className="p-4 text-right pr-6">
                      <button
                        onClick={() => handleDeleteAlumni(a.id)}
                        className="text-xs text-rose-400 hover:text-rose-300 px-2 py-1 transition-all cursor-pointer"
                      >
                        ✕ Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Add Alumni */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900/95 border border-white/10 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl shadow-cyan-500/20 relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-black text-white">Register Graduated Scholar</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddAlumni} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Scholar Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Ishaan Mukherjee"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Graduation Year
                  </label>
                  <input
                    type="number"
                    min="1990"
                    max="2030"
                    required
                    value={form.gradYear}
                    onChange={(e) => setForm({ ...form, gradYear: e.target.value })}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Academic Stream
                  </label>
                  <select
                    value={form.stream}
                    onChange={(e) => setForm({ ...form, stream: e.target.value })}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="Science (PCM)">Science (PCM)</option>
                    <option value="Science (PCB)">Science (PCB)</option>
                    <option value="Commerce & Accounts">Commerce & Accounts</option>
                    <option value="Humanities & Arts">Humanities & Arts</option>
                    <option value="International Baccalaureate">IB Diploma</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  College / University Placement
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., IIT Bombay (B.Tech Computer Science)"
                  value={form.collegePlacement}
                  onChange={(e) => setForm({ ...form, collegePlacement: e.target.value })}
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Current Career / Role
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., AI Research Scholar / SDE at Google"
                    value={form.currentRole}
                    onChange={(e) => setForm({ ...form, currentRole: e.target.value })}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Pledged Donation (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g., 50000"
                    value={form.pledgedDonation}
                    onChange={(e) => setForm({ ...form, pledgedDonation: e.target.value })}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Email Contact
                  </label>
                  <input
                    type="email"
                    placeholder="e.g., ishaan@iitb.ac.in"
                    value={form.contactEmail}
                    onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Phone Contact
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g., +91 98200 78901"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black px-5 py-2.5 rounded-xl text-xs shadow-lg shadow-cyan-500/20 transition-all duration-300 ease-in-out hover:scale-[1.02]"
                >
                  Save to Network 🎓
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

