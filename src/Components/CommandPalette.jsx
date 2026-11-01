import React, { useState, useEffect, useRef, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { supabase } from "../supabaseClient";
import {
  Search,
  ArrowRight,
  Compass,
  User,
  Zap,
  DollarSign,
  Calendar,
  FileText,
  Sun,
  Moon,
  Layers,
  Sparkles,
  X,
  GraduationCap,
  ClipboardList,
  CheckCircle2,
} from "lucide-react";

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [students, setStudents] = useState([]);

  const { user } = useContext(AppContext) || {};
  const { isDark, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const inputRef = useRef(null);
  const listRef = useRef(null);
  const schoolId = (user?.institution_code || user?.school_id || "CAMPUS-01").toUpperCase();

  // 1. Listen for Ctrl+K or Cmd+K globally
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    const handleCustomOpen = () => setIsOpen(true);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-command-palette", handleCustomOpen);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-command-palette", handleCustomOpen);
    };
  }, [isOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // 2. Fetch Directory Students for quick scholar search
  useEffect(() => {
    if (!isOpen) return;

    try {
      const raw = localStorage.getItem(`erp_directory_${schoolId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setStudents(parsed.filter((m) => (m.role || "student").toLowerCase() === "student"));
        }
      }
    } catch {}

    if (students.length === 0 && supabase) {
      supabase
        .from("students")
        .select("id, name, roll_number, class_name")
        .eq("school_id", schoolId)
        .limit(20)
        .then(({ data }) => {
          if (data) setStudents(data);
        })
        .catch(() => {});
    }
  }, [isOpen, schoolId]);

  // 3. Command definitions
  const NAV_COMMANDS = [
    { id: "nav_fee", title: "Go to Fee Ledger & Financial Terminal", category: "Navigation", icon: DollarSign, path: "/accountant/dashboard", keywords: "fees ledger payment collection dues money" },
    { id: "nav_prin", title: "Go to Principal Command Center", category: "Navigation", icon: Compass, path: "/principal/dashboard", keywords: "principal executive ceo master summary" },
    { id: "nav_trustee", title: "Go to Trustee & HOD Command Center", category: "Navigation", icon: Layers, path: "/trustee/dashboard", keywords: "trustee hod management overview" },
    { id: "nav_att", title: "Go to Teacher Attendance Register", category: "Navigation", icon: ClipboardList, path: "/teacher/attendance", keywords: "attendance roll call register mark absent" },
    { id: "nav_cal", title: "Go to Academic Calendar & Holidays", category: "Navigation", icon: Calendar, path: "/admin/calendar", keywords: "calendar holidays dates exams events schedule" },
    { id: "nav_exams", title: "Go to Timed Online Exams Portal", category: "Navigation", icon: FileText, path: "/teacher/exams", keywords: "exams test quiz assessments papers cbt" },
    { id: "nav_crm", title: "Go to Admissions CRM & Enrollments", category: "Navigation", icon: GraduationCap, path: "/admin/admissions", keywords: "admissions enroll register new students leads" },
    { id: "nav_payroll", title: "Go to Payroll & Faculty Compensation", category: "Navigation", icon: DollarSign, path: "/accountant/payroll", keywords: "payroll salary compensation payslip faculty" },
    { id: "nav_exp", title: "Go to Institutional Expense Manager", category: "Navigation", icon: DollarSign, path: "/accountant/expenses", keywords: "expense costs operational budget spending" },
    { id: "nav_diag", title: "Go to System Diagnostics & Telemetry", category: "Navigation", icon: Zap, path: "/system-check", keywords: "diagnostic telemetry health audit vercel database" },
  ];

  const ACTION_COMMANDS = [
    {
      id: "act_test",
      title: "Record Class Assessment Marks",
      category: "Quick Actions",
      icon: Sparkles,
      action: () => {
        setIsOpen(false);
        navigate("/teacher/dashboard");
        setTimeout(() => {
          showToast("Launching Class Test Evaluation Grid...", "info");
        }, 200);
      },
      keywords: "record marks test scores grades evaluation exam",
    },
    {
      id: "act_theme",
      title: `Toggle Theme (${isDark ? "Switch to Light Mode" : "Switch to Dark Mode"})`,
      category: "Quick Actions",
      icon: isDark ? Sun : Moon,
      action: () => {
        toggleTheme();
        setIsOpen(false);
        showToast(`Theme switched to ${isDark ? "Light" : "Dark"} mode`, "success");
      },
      keywords: "theme dark light mode color style switch toggle",
    },
    {
      id: "act_report",
      title: "Generate Institutional Fee Summary Report",
      category: "Quick Actions",
      icon: FileText,
      action: () => {
        setIsOpen(false);
        navigate("/accountant/dashboard");
        showToast("Generating Monthly Financial Report summary...", "info");
      },
      keywords: "report pdf generate financial download summary",
    },
  ];

  // 4. Search and Filter Logic
  const cleanQ = query.trim().toLowerCase();

  const filteredNav = NAV_COMMANDS.filter((cmd) => {
    if (!cleanQ) return true;
    return cmd.title.toLowerCase().includes(cleanQ) || cmd.keywords.toLowerCase().includes(cleanQ);
  });

  const filteredActions = ACTION_COMMANDS.filter((cmd) => {
    if (!cleanQ) return true;
    return cmd.title.toLowerCase().includes(cleanQ) || cmd.keywords.toLowerCase().includes(cleanQ);
  });

  const filteredStudents = students
    .filter((s) => {
      if (!cleanQ) return false;
      const name = (s.name || s.full_name || "").toLowerCase();
      const roll = (s.roll_number || s.personal_code || s.id || "").toLowerCase();
      const cls = (s.class_name || "").toLowerCase();
      return name.includes(cleanQ) || roll.includes(cleanQ) || cls.includes(cleanQ);
    })
    .slice(0, 5)
    .map((s) => ({
      id: `stu_${s.id || s.roll_number}`,
      title: `${s.name || s.full_name} (${s.roll_number || s.personal_code || "Scholar"}) - ${s.class_name || "Enrolled"}`,
      category: "Students",
      icon: User,
      action: () => {
        setIsOpen(false);
        navigate(`/accountant/dashboard?search=${encodeURIComponent(s.roll_number || s.name)}`);
        showToast(`Inspecting record for ${s.name || s.full_name}`, "info");
      },
      keywords: `${s.name} ${s.roll_number}`,
    }));

  const allFilteredItems = [...filteredNav, ...filteredStudents, ...filteredActions];

  // Keep selected index bounded
  useEffect(() => {
    if (selectedIndex >= allFilteredItems.length) {
      setSelectedIndex(Math.max(0, allFilteredItems.length - 1));
    }
  }, [allFilteredItems.length, selectedIndex]);

  // Execute selected command
  const executeItem = (item) => {
    if (!item) return;
    if (item.action) {
      item.action();
    } else if (item.path) {
      setIsOpen(false);
      navigate(item.path);
    }
  };

  // Keyboard navigation inside list
  const handleInputKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, allFilteredItems.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allFilteredItems.length) % Math.max(1, allFilteredItems.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (allFilteredItems.length > 0) {
        executeItem(allFilteredItems[selectedIndex]);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-start justify-center pt-16 sm:pt-24 px-4 p-4 animate-fade-in">
      {/* COMMAND PALETTE WINDOW */}
      <div
        className="max-w-2xl w-full bg-white/95 dark:bg-slate-900/90 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOP SEARCH BAR */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <Search className="w-5 h-5 text-cyan-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Type a command or search students, fee ledger, reports..."
            className="w-full bg-transparent text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm sm:text-base font-medium focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="hidden sm:inline-flex text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            ESC
          </span>
        </div>

        {/* RESULTS LIST */}
        <div ref={listRef} className="overflow-y-auto p-3 space-y-1 flex-1">
          {allFilteredItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-1">
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No matching commands or scholars found</p>
              <p className="text-xs text-slate-400">Try searching "fee", "attendance", "calendar", or a student's name.</p>
            </div>
          ) : (
            allFilteredItems.map((item, index) => {
              const isSelected = index === selectedIndex;
              const Icon = item.icon || Compass;

              return (
                <div
                  key={item.id}
                  onClick={() => executeItem(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all ${
                    isSelected
                      ? "bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 shadow-sm"
                      : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected
                          ? "bg-cyan-500 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold truncate">
                        {item.title}
                      </p>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                        {item.category}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isSelected && (
                      <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                        <span>Select</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* FOOTER SHORTCUT HINTS */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[10px]">↑↓</kbd>
              <span>Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[10px]">↵</kbd>
              <span>Execute</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-indigo-600 dark:text-cyan-400 font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Academic OS Global Search</span>
          </div>
        </div>
      </div>
    </div>
  );
}

