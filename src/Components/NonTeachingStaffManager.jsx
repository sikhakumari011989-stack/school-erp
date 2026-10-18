import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { logSecurityAction } from "../utils/auditLogger";

const STAFF_CATEGORIES = [
  "Driver",
  "Cleaner",
  "Gardener",
  "Security Guard",
  "Lab Assistant",
  "Administrative Helper",
  "Cafeteria Staff",
];

const CATEGORY_COLORS = {
  Driver: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  Cleaner: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  Gardener: "bg-teal-500/20 text-teal-300 border-teal-500/30",
  "Security Guard": "bg-purple-500/20 text-purple-300 border-purple-500/30",
  "Lab Assistant": "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  "Administrative Helper": "bg-amber-500/20 text-amber-300 border-amber-500/30",
  "Cafeteria Staff": "bg-rose-500/20 text-rose-300 border-rose-500/30",
};

export default function NonTeachingStaffManager({ schoolId: propSchoolId }) {
  const { user } = useContext(AppContext);
  const { showToast } = useToast();
  const schoolId = propSchoolId || user?.school_id || user?.institution_code || "CAMPUS-01";

  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterCategory, setFilterCategory] = useState("ALL");

  const [form, setForm] = useState({
    fullName: "",
    category: "Security Guard",
    phone: "",
    shiftTiming: "Morning Shift (06:30 AM - 02:30 PM)",
    joiningDate: new Date().toISOString().split("T")[0],
    salary: "₹18,000",
  });

  const loadStaff = () => {
    setLoading(true);
    try {
      const saved = localStorage.getItem(`erp_non_teaching_staff_${schoolId}`);
      if (saved) {
        setStaffList(JSON.parse(saved));
      } else {
        setStaffList([]);
      }
    } catch (e) {
      console.warn("Non-teaching staff load notice:", e);
      setStaffList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
    const handleUpdate = () => loadStaff();
    window.addEventListener("erp-non-teaching-updated", handleUpdate);
    return () => window.removeEventListener("erp-non-teaching-updated", handleUpdate);
  }, [schoolId]);

  const handleAddStaff = (e) => {
    e.preventDefault();
    if (!form.fullName.trim() || !form.phone.trim()) {
      showToast("Please provide staff full name and direct telephone number.", "error");
      return;
    }

    setSubmitting(true);
    const newStaff = {
      id: `staff_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      school_id: schoolId,
      fullName: form.fullName.trim(),
      category: form.category,
      phone: form.phone.trim(),
      shiftTiming: form.shiftTiming.trim() || "Full Day Shift",
      joiningDate: form.joiningDate || new Date().toISOString().split("T")[0],
      salary: form.salary.trim() || "₹15,000",
      status: "Active Duty",
      created_at: new Date().toISOString(),
    };

    // 1. Save to non-teaching local registry
    const updated = [newStaff, ...staffList];
    setStaffList(updated);
    try {
      localStorage.setItem(`erp_non_teaching_staff_${schoolId}`, JSON.stringify(updated));
    } catch (e) {}

    // 2. Also register in local institutional directory so other staff can see support contact
    try {
      const dirKey = `erp_directory_${schoolId}`;
      const existingDir = JSON.parse(localStorage.getItem(dirKey) || "[]");
      const dirRecord = {
        id: newStaff.id,
        name: newStaff.fullName,
        full_name: newStaff.fullName,
        role: "staff",
        role_code: `STAFF-${newStaff.category.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-3)}`,
        category: newStaff.category,
        dept: `${newStaff.category} (Support Services)`,
        phone: newStaff.phone,
        email: `${newStaff.fullName.toLowerCase().replace(/[^a-z0-9]/g, "")}@${String(schoolId).toLowerCase()}.internal`,
        school_id: schoolId,
        institution_code: schoolId,
      };
      existingDir.push(dirRecord);
      localStorage.setItem(dirKey, JSON.stringify(existingDir));
      window.dispatchEvent(new Event("erp-directory-updated"));
    } catch (e) {
      console.warn("Directory sync notice:", e);
    }

    // 3. Security audit log
    logSecurityAction({
      action: "Non-Teaching Personnel Onboarded",
      entityType: "STAFF",
      entityId: newStaff.fullName,
      details: `Onboarded ${newStaff.category} "${newStaff.fullName}" (Shift: ${newStaff.shiftTiming})`,
      user,
      schoolId,
    });

    window.dispatchEvent(new Event("erp-non-teaching-updated"));
    showToast(`Added ${newStaff.category} "${newStaff.fullName}" to institutional roster!`, "success");

    setForm({
      fullName: "",
      category: "Security Guard",
      phone: "",
      shiftTiming: "Morning Shift (06:30 AM - 02:30 PM)",
      joiningDate: new Date().toISOString().split("T")[0],
      salary: "₹18,000",
    });
    setShowAddForm(false);
    setSubmitting(false);
  };

  const handleRemoveStaff = (id, staffName) => {
    const updated = staffList.filter((s) => s.id !== id);
    setStaffList(updated);

    try {
      localStorage.setItem(`erp_non_teaching_staff_${schoolId}`, JSON.stringify(updated));
      window.dispatchEvent(new Event("erp-non-teaching-updated"));

      // Also clean from erp_directory
      const dirKey = `erp_directory_${schoolId}`;
      const existingDir = JSON.parse(localStorage.getItem(dirKey) || "[]");
      const updatedDir = existingDir.filter((d) => d.id !== id);
      localStorage.setItem(dirKey, JSON.stringify(updatedDir));
      window.dispatchEvent(new Event("erp-directory-updated"));
    } catch (e) {}

    logSecurityAction({
      action: "Non-Teaching Personnel Record Removed",
      entityType: "STAFF",
      entityId: id,
      details: `Archived/Removed non-teaching staff record: ${staffName || id}`,
      user,
      schoolId,
    });

    showToast(`Staff record "${staffName || "Personnel"}" archived.`, "info");
  };

  const filteredStaff = staffList.filter((s) => {
    if (filterCategory === "ALL") return true;
    return s.category === filterCategory;
  });

  return (
    <div className="space-y-6">
      {/* SECTION HEADER BANNER */}
      <div className="bg-[#1E293B]/80 backdrop-blur-xl border border-slate-700/70 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>🧹</span> Facilities & Operations Roster
          </div>
          <h2 className="text-2xl font-black text-white">Non-Teaching Staff Directory & Payroll</h2>
          <p className="text-slate-400 text-sm mt-1 max-w-xl">
            Complete institutional personnel management for Drivers, Cleaners, Gardeners, Security Guards, Lab Assistants, Helpers, and Cafeteria personnel.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center gap-2"
          >
            <span>{showAddForm ? "✕ Close Form" : "➕ Onboard Personnel"}</span>
          </button>
        </div>
      </div>

      {/* QUICK ADD PERSONNEL FORM */}
      {showAddForm && (
        <div className="bg-slate-900/90 border border-emerald-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl animate-fade-in">
          <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white">Onboard Campus Support Personnel</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Personnel will be archived in the institution directory with duty shifts and wage records.
              </p>
            </div>
            <span className="text-2xl">👥</span>
          </div>

          <form onSubmit={handleAddStaff} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh K. Shinde"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Staff Category *
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  {STAFF_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Direct Telephone / WhatsApp *
                </label>
                <input
                  type="tel"
                  placeholder="e.g. +91 98200 45678"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Duty Shift Timing
                </label>
                <select
                  value={form.shiftTiming}
                  onChange={(e) => setForm({ ...form, shiftTiming: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Morning Shift (06:30 AM - 02:30 PM)">Morning Shift (06:30 AM - 02:30 PM)</option>
                  <option value="Afternoon Shift (01:00 PM - 09:00 PM)">Afternoon Shift (01:00 PM - 09:00 PM)</option>
                  <option value="Night Security (08:00 PM - 06:00 AM)">Night Security (08:00 PM - 06:00 AM)</option>
                  <option value="General Day Shift (08:00 AM - 05:00 PM)">General Day Shift (08:00 AM - 05:00 PM)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Date of Joining
                </label>
                <input
                  type="date"
                  value={form.joiningDate}
                  onChange={(e) => setForm({ ...form, joiningDate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Monthly Salary / Payroll
                </label>
                <input
                  type="text"
                  placeholder="e.g. ₹18,000"
                  value={form.salary}
                  onChange={(e) => setForm({ ...form, salary: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-5 py-2.5 rounded-xl text-slate-400 hover:text-white font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>{submitting ? "Onboarding..." : "Onboard Staff Member"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FILTER BUTTONS & ROSTER TABLE */}
      <div className="bg-[#1E293B]/80 backdrop-blur-xl border border-slate-700/70 rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-700/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-800/40">
          <div>
            <h3 className="text-lg font-bold text-white">Campus Operational Personnel Roster</h3>
            <p className="text-xs text-slate-400 mt-0.5">Roster node: {schoolId}</p>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1">
            <button
              onClick={() => setFilterCategory("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterCategory === "ALL"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-900 text-slate-400 hover:text-white"
              }`}
            >
              All ({staffList.length})
            </button>
            {STAFF_CATEGORIES.map((cat) => {
              const count = staffList.filter((s) => s.category === cat).length;
              if (count === 0 && filterCategory !== cat) return null;
              return (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    filterCategory === cat
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-900 text-slate-400 hover:text-white"
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading personnel roster...</div>
        ) : staffList.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <span className="text-5xl block opacity-60">🧹</span>
            <h4 className="text-lg font-bold text-white">No Non-Teaching Staff Onboarded (Clean Slate)</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Your non-teaching staff registry is empty. Click "+ Onboard Personnel" above to register campus drivers, security guards, cleaners, lab helpers, and cafeteria workers.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer mt-2"
            >
              + Onboard First Staff
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-700/70 text-slate-400 text-xs uppercase tracking-wider bg-slate-900/40">
                  <th className="p-4 pl-6">Personnel Name & Role</th>
                  <th className="p-4">Direct Contact</th>
                  <th className="p-4">Assigned Shift</th>
                  <th className="p-4">Joining Date</th>
                  <th className="p-4">Monthly Salary</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {filteredStaff.map((staff) => (
                  <tr key={staff.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 pl-6">
                      <p className="font-bold text-white text-sm">{staff.fullName}</p>
                      <span
                        className={`inline-block px-2.5 py-0.5 mt-1 text-[11px] font-bold rounded-full border ${
                          CATEGORY_COLORS[staff.category] || "bg-slate-800 text-slate-300 border-slate-700"
                        }`}
                      >
                        {staff.category}
                      </span>
                    </td>
                    <td className="p-4">
                      <a
                        href={`tel:${staff.phone.replace(/[^0-9+]/g, "")}`}
                        className="text-emerald-400 hover:text-emerald-300 font-mono text-xs flex items-center gap-1.5"
                      >
                        <span>📞</span> {staff.phone}
                      </a>
                    </td>
                    <td className="p-4 text-xs text-slate-300 font-semibold">{staff.shiftTiming}</td>
                    <td className="p-4 text-xs font-mono text-slate-400">{staff.joiningDate}</td>
                    <td className="p-4 text-xs font-bold text-amber-300 font-mono">{staff.salary}</td>
                    <td className="p-4 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        Active Duty
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleRemoveStaff(staff.id, staff.fullName)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ml-auto"
                      >
                        <span>🗑️</span>
                        <span>Remove Staff</span>
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
  );
}

