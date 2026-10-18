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

  const activeSchoolId = user?.institution_code || user?.school_id || tenant?.code || "CAMPUS-01";

  useEffect(() => {
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
              .neq("role", "student")
              .limit(50);

            if (data && data.length > 0) {
              data.forEach((p) => {
                const key = p.role_code || p.id;
                staffMap.set(key, {
                  id: key,
                  name: p.full_name || "Faculty Member",
                  role: p.role === "trustee" ? "Principal / Trustee" : p.role === "accountant" ? "Chief Accountant" : p.role === "teacher" ? "Teaching Faculty" : "Administrator",
                  dept: p.role === "teacher" ? "Academics" : p.role === "accountant" ? "Finance & Accounts" : "Administration",
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
                  staffMap.set(key, {
                    id: key,
                    name: m.full_name || m.name || "Faculty Member",
                    role: m.role === "trustee" ? "Principal / Trustee" : m.role === "accountant" ? "Chief Accountant" : m.role === "teacher" ? "Teaching Faculty" : "Administrator",
                    dept: m.class_name || m.dept || (m.role === "teacher" ? "Academics" : "Administration"),
                    phone: m.phone || "+91 9518388499",
                    email: m.email || `${String(key).toLowerCase()}@institution.edu`,
                  });
                }
              });
          }
        } catch (localErr) {
          console.warn("Local directory parse error:", localErr);
        }

        setDirectory(Array.from(staffMap.values()));
      } catch (err) {
        console.error("Directory error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDirectory();
  }, [activeSchoolId]);

  return (
    <div className="relative text-slate-200 min-h-full pb-10 font-sans">
      <div className="fixed top-0 left-10 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="mb-8 flex justify-between items-center flex-wrap gap-4">
          <div>
            <p className="text-blue-300 text-sm font-semibold mb-1 uppercase tracking-widest">Institution Directory</p>
            <h1 className="text-3xl font-extrabold text-white">Staff & Department Directory 📞</h1>
            <p className="text-slate-400 text-sm mt-1">
              Active Node: <span className="text-emerald-400 font-mono font-bold">{activeSchoolId}</span> &bull; Verified institutional contacts
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
          <div className="p-6 border-b border-slate-700 bg-slate-800/50">
            <h2 className="text-lg font-bold text-white">Verified Institutional Contacts</h2>
          </div>

          {loading ? (
            <div className="p-6">
              <TableSkeleton rows={4} cols={4} />
            </div>
          ) : directory.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-medium">
              <p className="text-base font-bold text-slate-300 mb-1">No faculty or administrative staff listed yet.</p>
              <p className="text-xs">Use Bulk CSV Import or Quick Add in Trustee Dashboard to onboard staff members.</p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="p-5">Name & Role</th>
                    <th className="p-5">Department</th>
                    <th className="p-5">Contact Phone & Email</th>
                    <th className="p-5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50 text-sm">
                  {directory.map((d, idx) => (
                    <tr key={d.id || idx} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-5">
                        <p className="font-bold text-white text-base">{d.name}</p>
                        <p className="text-xs text-blue-400 font-medium">{d.role}</p>
                      </td>
                      <td className="p-5 text-slate-300 font-medium">{d.dept}</td>
                      <td className="p-5">
                        <p className="font-mono text-xs text-emerald-400">{d.phone}</p>
                        <p className="text-xs text-slate-400">{d.email}</p>
                      </td>
                      <td className="p-5 text-center">
                        <button
                          onClick={() => showToast(`Initiating direct message to ${d.name}...`, "info")}
                          className="bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white font-bold px-3 py-1.5 rounded-lg text-xs border border-slate-600 hover:border-blue-500 transition-all cursor-pointer"
                        >
                          Message 💬
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
    </div>
  );
}