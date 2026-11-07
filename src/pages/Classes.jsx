import React, { useState, useEffect } from "react";
import { useAppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { supabase } from "../supabaseClient";
import CreateClassModal from "../Components/CreateClassModal";

export default function Classes() {
  const { user, tenant } = useAppContext() || {};
  const { showToast } = useToast();
  const schoolCode = (user?.institution_code || user?.school_id || tenant?.code || "CAMPUS-01").toUpperCase();

  const [classesList, setClassesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const loadClasses = async () => {
    setLoading(true);
    let loadedClasses = [];

    // 1. Try fetching from Supabase classes table
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("classes")
          .select("id, name, grade, section, class_teacher_id, created_at")
          .eq("school_id", schoolCode)
          .order("name", { ascending: true });

        if (!error && data && data.length > 0) {
          loadedClasses = data;
        }
      } catch (err) {
        console.warn("[Classes] Supabase fetch notice:", err);
      }
    }

    // 2. Read local classes cache if empty
    if (loadedClasses.length === 0) {
      try {
        const raw = localStorage.getItem(`erp_classes_${schoolCode}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            loadedClasses = parsed;
          }
        }
      } catch (err) {}
    }

    // 3. Fallback defaults if no classes configured yet
    if (loadedClasses.length === 0) {
      loadedClasses = [
        { id: "cls_10a", name: "Class 10-A", grade: "10", section: "A" },
        { id: "cls_10b", name: "Class 10-B", grade: "10", section: "B" },
        { id: "cls_9a", name: "Class 9-A", grade: "9", section: "A" },
        { id: "cls_9b", name: "Class 9-B", grade: "9", section: "B" },
      ];
      try {
        localStorage.setItem(`erp_classes_${schoolCode}`, JSON.stringify(loadedClasses));
      } catch (err) {}
    }

    // 4. Calculate real student strength per class from directory
    let dir = [];
    try {
      const rawDir = localStorage.getItem(`erp_directory_${schoolCode}`);
      if (rawDir) dir = JSON.parse(rawDir);
    } catch (err) {}

    const normalize = (str) =>
      String(str || "")
        .toLowerCase()
        .replace(/class\s*/i, "")
        .replace(/[^a-z0-9]/g, "");

    const enriched = loadedClasses.map((cls) => {
      const target = normalize(cls.name);
      const studentCount = dir.filter((m) => {
        const role = (m.role || "").toLowerCase();
        if (role !== "student" && role !== "stu") return false;
        const sClass = normalize(m.class_name || m.class);
        return sClass === target || sClass.includes(target) || target.includes(sClass);
      }).length;

      return {
        ...cls,
        strength: studentCount,
      };
    });

    setClassesList(enriched);
    setLoading(false);
  };

  useEffect(() => {
    loadClasses();
    window.addEventListener("erp-classes-updated", loadClasses);
    window.addEventListener("erp-directory-updated", loadClasses);
    return () => {
      window.removeEventListener("erp-classes-updated", loadClasses);
      window.removeEventListener("erp-directory-updated", loadClasses);
    };
  }, [schoolCode]);

  const handleDeleteClass = async (classItem) => {
    if (!window.confirm(`Are you sure you want to delete "${classItem.name}"?`)) {
      return;
    }

    try {
      if (supabase && classItem.id && !classItem.id.toString().startsWith("cls_")) {
        await supabase.from("classes").delete().eq("id", classItem.id);
      }

      const updated = classesList.filter((c) => c.id !== classItem.id && c.name !== classItem.name);
      setClassesList(updated);
      try {
        localStorage.setItem(`erp_classes_${schoolCode}`, JSON.stringify(updated));
      } catch (e) {}

      showToast(`Class "${classItem.name}" removed successfully.`, "info");
    } catch (err) {
      console.error("Delete class error:", err);
      showToast("Could not delete class: " + err.message, "error");
    }
  };

  const filteredClasses = classesList.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      (c.name || "").toLowerCase().includes(q) ||
      (c.grade || "").toLowerCase().includes(q) ||
      (c.section || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-[100dvh] bg-slate-950 text-slate-100 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">
              <span>🏫 Academic Cohorts</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Class & Section Management
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Configure grade standards, section divisions, and student capacity for campus node <span className="font-mono text-cyan-300">{schoolCode}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 text-sm flex items-center gap-2 cursor-pointer transition"
            >
              <span>➕</span>
              <span>Create New Class</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex items-center gap-3 shadow-lg">
          <span className="text-slate-400">🔍</span>
          <input
            type="text"
            placeholder="Search classes by name, grade, or section..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-white focus:outline-none placeholder-slate-500"
          />
        </div>

        {/* Classes Table */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-800/90 text-slate-300 uppercase tracking-wider text-[11px] font-bold border-b border-white/10">
                <tr>
                  <th className="p-4">Class & Standard</th>
                  <th className="p-4">Grade</th>
                  <th className="p-4">Section</th>
                  <th className="p-4">Enrolled Scholars</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-slate-400">
                      <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-2" />
                      Loading classes from database...
                    </td>
                  </tr>
                ) : filteredClasses.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-slate-400">
                      No classes configured yet. Click "Create New Class" to add your first division.
                    </td>
                  </tr>
                ) : (
                  filteredClasses.map((cls) => (
                    <tr key={cls.id || cls.name} className="hover:bg-white/5 transition">
                      <td className="p-4 text-white font-bold flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                        <span className="text-base">{cls.name}</span>
                      </td>
                      <td className="p-4 text-slate-300 font-mono">Standard {cls.grade || cls.name?.split("-")[0] || "10"}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-md bg-blue-500/20 text-blue-300 font-bold font-mono text-xs border border-blue-500/30">
                          Section {cls.section || cls.name?.split("-")[1] || "A"}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-white font-bold">{cls.strength || 0}</span>
                        <span className="text-slate-500 ml-1">students</span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleDeleteClass(cls)}
                          className="px-3 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition cursor-pointer"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Class Modal */}
      <CreateClassModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onRefresh={loadClasses}
      />
    </div>
  );
}
