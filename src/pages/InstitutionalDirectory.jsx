import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { supabase } from "../supabaseClient";
import { TableSkeleton } from "../Components/Skeleton";

export default function InstitutionalDirectory() {
  const { user, tenant } = useContext(AppContext) || {};
  const { showToast } = useToast();
  const [directory, setDirectory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("ALL");

  const activeSchoolId = user?.institution_code || user?.school_id || tenant?.code || "CAMPUS-01";

  const fetchDirectory = async () => {
    setLoading(true);
    try {
      const staffMap = new Map();

      // 1. Fetch from Supabase profiles
      try {
        if (supabase) {
          const { data } = await supabase
            .from("profiles")
            .select("id, full_name, role, role_code, phone, email")
            .eq("school_id", activeSchoolId)
            .neq("role", "student")
            .limit(50);

          if (data && data.length > 0) {
            data.forEach((p) => {
              const key = p.role_code || p.id;
              staffMap.set(key, {
                id: key,
                name: p.full_name || "Faculty Member",
                role:
                  p.role === "trustee"
                    ? "Principal / Trustee"
                    : p.role === "accountant"
                    ? "Chief Accountant"
                    : p.role === "teacher"
                    ? "Teaching Faculty"
                    : "Administrator",
                dept: p.role === "teacher" ? "Academics" : p.role === "accountant" ? "Finance & Accounts" : "Administration",
                category: "Teaching & Admin",
                phone: p.phone || "+91 9518388499",
                email: p.email || `${String(p.role_code || "staff").toLowerCase()}@institution.edu`,
              });
            });
          }
        }
      } catch (dbErr) {
        console.warn("DB directory query notice:", dbErr);
      }

      // 2. Read local directory
      try {
        const raw = localStorage.getItem(`erp_directory_${activeSchoolId}`);
        if (raw) {
          const localStaff = JSON.parse(raw);
          localStaff
            .filter((m) => (m.role || "").toLowerCase() !== "student")
            .forEach((m) => {
              const key = m.role_code || m.roll_number || m.personal_code || m.id;
              if (key && !staffMap.has(key)) {
                const isNonTeach = m.category || m.role === "staff";
                staffMap.set(key, {
                  id: key,
                  name: m.full_name || m.name || "Staff Member",
                  role: isNonTeach
                    ? m.category || "Campus Support Staff"
                    : m.role === "trustee"
                    ? "Principal / Trustee"
                    : m.role === "accountant"
                    ? "Chief Accountant"
                    : m.role === "teacher"
                    ? "Teaching Faculty"
                    : "Administrator",
                  dept: m.dept || m.class_name || (isNonTeach ? "Support Services" : "Administration"),
                  category: isNonTeach ? "Non-Teaching" : "Teaching & Admin",
                  phone: m.phone || "+91 98200 12345",
                  email: m.email || `${String(key).toLowerCase()}@institution.edu`,
                });
              }
            });
        }
      } catch (localErr) {
        console.warn("Local directory parse error:", localErr);
      }

      // 3. Read dedicated non-teaching staff registry
      try {
        const rawNonTeaching = localStorage.getItem(`erp_non_teaching_staff_${activeSchoolId}`);
        if (rawNonTeaching) {
          const nonTeachingStaff = JSON.parse(rawNonTeaching);
          nonTeachingStaff.forEach((s) => {
            const key = s.customId || s.role_code || s.id;
            const staffName = s.fullName || s.name || s.full_name || "Support Staff";
            const roleDesc = s.designation || s.category || "Campus Support Staff";
            if (!staffMap.has(key)) {
              staffMap.set(key, {
                id: key,
                name: staffName,
                role: s.shiftTiming ? `${roleDesc} (${s.shiftTiming})` : roleDesc,
                dept: "Facilities & Support Services",
                category: "Non-Teaching",
                phone: s.phone || "+91 98000 00000",
                email: s.email || `${staffName.toLowerCase().replace(/[^a-z0-9]/g, "")}@support.internal`,
              });
            }
          });
        }
      } catch (e) {
        console.warn("Non-teaching local read notice:", e);
      }

      setDirectory(Array.from(staffMap.values()));
    } catch (err) {
      console.error("Directory error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDirectory();
    window.addEventListener("erp-directory-updated", fetchDirectory);
    window.addEventListener("erp-non-teaching-updated", fetchDirectory);
    return () => {
      window.removeEventListener("erp-directory-updated", fetchDirectory);
      window.removeEventListener("erp-non-teaching-updated", fetchDirectory);
    };
  }, [activeSchoolId]);

  const filteredDirectory = directory.filter((d) => {
    if (filterType === "ALL") return true;
    if (filterType === "TEACHING") return d.category === "Teaching & Admin";
    if (filterType === "NON_TEACHING") return d.category === "Non-Teaching";
    return true;
  });

  return (
    <div className="relative text-slate-200 min-h-full pb-10 font-sans">
      <div className="fixed top-0 left-10 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="mb-8 flex justify-between items-center flex-wrap gap-4">
          <div>
            <p className="text-blue-300 text-sm font-semibold mb-1 uppercase tracking-widest">Institution Directory</p>
            <h1 className="text-3xl font-extrabold text-white">Staff & Department Directory 📞</h1>
            <p className="text-slate-400 text-sm mt-1">
              Active Node: <span className="text-emerald-400 font-mono font-bold">{activeSchoolId}</span> &bull; Faculty, Administrative & Non-Teaching Extensions
            </p>
          </div>
          <button
            onClick={() => showToast("Opening broadcast message composer...", "info")}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
          >
            Send Broadcast Notice 📢
          </button>
        </div>

        {/* DIRECTORY TABLE */}
        <div className="bg-[#1E293B] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-700 bg-slate-800/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">Verified Institutional Contacts</h2>
              <p className="text-xs text-slate-400 mt-0.5">Direct lines to academic and campus facilities personnel</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilterType("ALL")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterType === "ALL" ? "bg-blue-600 text-white" : "bg-slate-900 text-slate-400 hover:text-white"
                }`}
              >
                All Personnel ({directory.length})
              </button>
              <button
                onClick={() => setFilterType("TEACHING")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterType === "TEACHING" ? "bg-blue-600 text-white" : "bg-slate-900 text-slate-400 hover:text-white"
                }`}
              >
                Faculty & Admin
              </button>
              <button
                onClick={() => setFilterType("NON_TEACHING")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterType === "NON_TEACHING" ? "bg-emerald-600 text-white" : "bg-slate-900 text-slate-400 hover:text-white"
                }`}
              >
                🧹 Non-Teaching Staff
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-6">
              <TableSkeleton rows={4} cols={4} />
            </div>
          ) : filteredDirectory.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-medium">
              <p className="text-base font-bold text-slate-300 mb-1">No staff members found matching this filter (Clean Slate).</p>
              <p className="text-xs">Use Bulk CSV Import or Quick Add in Trustee/Principal Dashboard to onboard personnel.</p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider bg-slate-900/40">
                    <th className="p-5">Name & Role</th>
                    <th className="p-5">Department / Service</th>
                    <th className="p-5">Contact Details</th>
                    <th className="p-5 text-center">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50 text-sm">
                  {filteredDirectory.map((d, idx) => (
                    <tr key={d.id || idx} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-5">
                        <p className="font-bold text-white text-base">{d.name}</p>
                        <span
                          className={`inline-block px-2 py-0.5 mt-0.5 text-[11px] font-bold rounded-md ${
                            d.category === "Non-Teaching"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "text-blue-400"
                          }`}
                        >
                          {d.role}
                        </span>
                      </td>
                      <td className="p-5 text-slate-300 font-medium">{d.dept}</td>
                      <td className="p-5">
                        <a
                          href={`tel:${d.phone.replace(/[^0-9+]/g, "")}`}
                          className="font-mono text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5"
                        >
                          <span>📞</span> {d.phone}
                        </a>
                        <p className="text-xs text-slate-400 mt-0.5">{d.email}</p>
                      </td>
                      <td className="p-5 text-center">
                        <a
                          href={`tel:${d.phone.replace(/[^0-9+]/g, "")}`}
                          onClick={() => showToast(`Calling ${d.name}...`, "info")}
                          className="inline-flex items-center gap-1 bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white font-bold px-3 py-1.5 rounded-lg text-xs border border-slate-600 hover:border-emerald-500 transition-all cursor-pointer"
                        >
                          <span>📞</span> Call Direct
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}