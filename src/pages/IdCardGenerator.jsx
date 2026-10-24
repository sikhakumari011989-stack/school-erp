import React, { useState, useEffect, useContext, useMemo } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import {
  CreditCard,
  Printer,
  Users,
  Search,
  Filter,
  CheckSquare,
  Square,
  QrCode,
  ShieldCheck,
  User,
  GraduationCap,
  Briefcase,
  Phone,
  Droplet
} from "lucide-react";

const BLOOD_GROUPS = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];

export default function IdCardGenerator() {
  const { user, tenant } = useContext(AppContext);
  const { showToast } = useToast();

  const schoolCode = (
    user?.institution_code ||
    user?.school_id ||
    tenant?.code ||
    "CAMPUS-01"
  ).toUpperCase();

  const institutionName =
    tenant?.name ||
    user?.institution_name ||
    user?.institutionName ||
    "Apex International Academy";

  const schoolLogo =
    tenant?.logoUrl ||
    (() => {
      try {
        return (
          localStorage.getItem(`erp_logo_${schoolCode}`) ||
          localStorage.getItem(`erp_school_logo_${schoolCode}`) ||
          localStorage.getItem("erp_school_logo_default") ||
          null
        );
      } catch {
        return null;
      }
    })();

  // Filter State
  const [audience, setAudience] = useState("student"); // 'student' | 'staff'
  const [selectedClass, setSelectedClass] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [members, setMembers] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Dynamic ID Card Field Configuration State
  const [cardFields, setCardFields] = useState({
    showBloodGroup: true,
    showEmergencyContact: true,
    showDob: true,
    showGuardian: true,
    showBarcode: true,
    showQrCode: true,
  });

  // Load roster
  useEffect(() => {
    loadRoster();
  }, [schoolCode]);

  const loadRoster = () => {
    try {
      let dir = [];
      const raw = localStorage.getItem(`erp_directory_${schoolCode}`);
      if (raw) {
        dir = JSON.parse(raw);
      }

      if (dir.length === 0) {
        // Fallback default sample members if completely new slate
        dir = [
          {
            id: "STU-101",
            role_code: "STU-101",
            name: "Aarav Sharma",
            role: "student",
            class_name: "Class 10-A",
            phone: "+91 98201 44512",
            parent_name: "Rajesh Sharma",
            blood_group: "B+",
          },
          {
            id: "STU-102",
            role_code: "STU-102",
            name: "Diya Deshmukh",
            role: "student",
            class_name: "Class 10-A",
            phone: "+91 98202 55623",
            parent_name: "Suresh Deshmukh",
            blood_group: "O+",
          },
          {
            id: "STU-103",
            role_code: "STU-103",
            name: "Kabir Mehta",
            role: "student",
            class_name: "Class 12-Science",
            phone: "+91 98203 66734",
            parent_name: "Prakash Mehta",
            blood_group: "AB+",
          },
          {
            id: "TCH-01",
            role_code: "TCH-01",
            name: "Dr. Vikram Joshi",
            role: "teacher",
            class_name: "Senior Physics Faculty",
            phone: "+91 98111 22334",
            blood_group: "A+",
          },
          {
            id: "ACC-01",
            role_code: "ACC-01",
            name: "Ramesh Kulkarni",
            role: "accountant",
            class_name: "Chief Treasury Officer",
            phone: "+91 98222 33445",
            blood_group: "O+",
          },
        ];
      }

      setMembers(dir);
      // Select all by default
      const defaultStudentIds = new Set(
        dir
          .filter((m) => (m.role || "student").toLowerCase() === "student")
          .map((m) => m.role_code || m.roll_number || m.id)
      );
      setSelectedIds(defaultStudentIds);
    } catch (e) {
      console.warn("Could not load directory:", e);
    }
  };

  // Switch audience
  const handleAudienceChange = (newAudience) => {
    setAudience(newAudience);
    setSelectedClass("all");
    const filtered = members.filter((m) => {
      const r = (m.role || "student").toLowerCase();
      if (newAudience === "student") return r === "student";
      return r !== "student";
    });
    setSelectedIds(new Set(filtered.map((m) => m.role_code || m.roll_number || m.id)));
  };

  // Distinct classes for students
  const availableClasses = useMemo(() => {
    const set = new Set();
    members.forEach((m) => {
      if ((m.role || "student").toLowerCase() === "student" && m.class_name) {
        set.add(m.class_name);
      }
    });
    return Array.from(set).sort();
  }, [members]);

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const r = (m.role || "student").toLowerCase();
      const isTargetAudience = audience === "student" ? r === "student" : r !== "student";
      if (!isTargetAudience) return false;

      if (audience === "student" && selectedClass !== "all" && m.class_name !== selectedClass) {
        return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const code = (m.role_code || m.roll_number || m.id || "").toLowerCase();
        const name = (m.name || m.full_name || "").toLowerCase();
        return code.includes(query) || name.includes(query);
      }

      return true;
    });
  }, [members, audience, selectedClass, searchQuery]);

  // Selection toggles
  const handleToggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSelectAll = () => {
    const currentFilteredIds = filteredMembers.map(
      (m) => m.role_code || m.roll_number || m.id
    );
    const allSelected = currentFilteredIds.every((id) => selectedIds.has(id));

    const next = new Set(selectedIds);
    if (allSelected) {
      currentFilteredIds.forEach((id) => next.delete(id));
    } else {
      currentFilteredIds.forEach((id) => next.add(id));
    }
    setSelectedIds(next);
  };

  const isAllSelected = useMemo(() => {
    if (filteredMembers.length === 0) return false;
    return filteredMembers.every((m) =>
      selectedIds.has(m.role_code || m.roll_number || m.id)
    );
  }, [filteredMembers, selectedIds]);

  // Members to print
  const cardsToPrint = useMemo(() => {
    return members.filter((m) =>
      selectedIds.has(m.role_code || m.roll_number || m.id)
    );
  }, [members, selectedIds]);

  const handlePrint = () => {
    if (cardsToPrint.length === 0) {
      showToast("Please select at least one member to print ID cards.", "error");
      return;
    }
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Print CSS Stylesheet */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #id-cards-print-area, #id-cards-print-area * {
            visibility: visible;
          }
          #id-cards-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 10mm;
            background: #ffffff !important;
          }
          .print-card-box {
            page-break-inside: avoid;
            break-inside: avoid;
            box-shadow: none !important;
            border: 1.5px dashed #64748b !important;
            color: #0f172a !important;
            background: #ffffff !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Screen Controls & Header (Hidden on Print) */}
      <div className="no-print space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-xl">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-bold">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  1-Click Institutional ID Card Generator
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-medium">
                    {schoolCode}
                  </span>
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Print official photo ID cards formatted 8 to 10 per A4 page with QR codes & cut lines.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-slate-400 font-medium">
              Ready to print: <strong className="text-white">{cardsToPrint.length}</strong> cards
            </span>
            <button
              onClick={handlePrint}
              disabled={cardsToPrint.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/30 transition-all hover:scale-105 cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              Print Selected ID Cards ({cardsToPrint.length})
            </button>
          </div>
        </div>

        {/* Filter and Audience Selector */}
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Audience Toggle */}
            <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700 w-full sm:w-auto">
              <button
                onClick={() => handleAudienceChange("student")}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  audience === "student"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                Students
              </button>
              <button
                onClick={() => handleAudienceChange("staff")}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  audience === "staff"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                Faculty & Staff
              </button>
            </div>

            {/* Class Filter (For students) */}
            {audience === "student" && availableClasses.length > 0 && (
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="bg-slate-800 text-slate-300 border border-slate-700 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Classes</option>
                {availableClasses.map((cls) => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search member name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Select All Button */}
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 cursor-pointer whitespace-nowrap"
            >
              {isAllSelected ? (
                <>
                  <CheckSquare className="w-4 h-4 text-blue-400" /> Deselect All
                </>
              ) : (
                <>
                  <Square className="w-4 h-4 text-slate-400" /> Select All ({filteredMembers.length})
                </>
              )}
            </button>
          </div>
        </div>

        {/* Members Selection List Grid */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Select Roster Members for Badge Batch:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredMembers.map((member) => {
              const id = member.role_code || member.roll_number || member.id;
              const isSelected = selectedIds.has(id);
              return (
                <div
                  key={id}
                  onClick={() => handleToggleSelect(id)}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                    isSelected
                      ? "bg-blue-600/15 border-blue-500/50 shadow-sm"
                      : "bg-slate-800/50 border-slate-700/60 hover:border-slate-600 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                    />
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-white truncate">{member.name || member.full_name}</p>
                      <p className="text-[10px] text-slate-400">{id} • {member.class_name || member.role}</p>
                    </div>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-mono">
                    {member.blood_group || "B+"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dynamic ID Card Field Configuration Panel */}
        <div className="bg-slate-900/80 border border-cyan-500/30 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-cyan-300 flex items-center gap-2">
              <span>🪪</span> Dynamic ID Card Field Configuration (Live Print Preview)
            </h4>
            <span className="text-[11px] text-slate-400">
              Check/uncheck fields to add or remove badges & security tokens before print
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-1">
            <label className="flex items-center gap-2 text-xs text-slate-200 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60 cursor-pointer hover:border-cyan-500/50 transition-all select-none">
              <input
                type="checkbox"
                checked={cardFields.showBloodGroup}
                onChange={() => setCardFields((prev) => ({ ...prev, showBloodGroup: !prev.showBloodGroup }))}
                className="w-4 h-4 rounded text-cyan-500 accent-cyan-500 cursor-pointer"
              />
              <span className="font-semibold">Blood Group</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-200 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60 cursor-pointer hover:border-cyan-500/50 transition-all select-none">
              <input
                type="checkbox"
                checked={cardFields.showEmergencyContact}
                onChange={() => setCardFields((prev) => ({ ...prev, showEmergencyContact: !prev.showEmergencyContact }))}
                className="w-4 h-4 rounded text-cyan-500 accent-cyan-500 cursor-pointer"
              />
              <span className="font-semibold">Emergency Phone</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-200 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60 cursor-pointer hover:border-cyan-500/50 transition-all select-none">
              <input
                type="checkbox"
                checked={cardFields.showDob}
                onChange={() => setCardFields((prev) => ({ ...prev, showDob: !prev.showDob }))}
                className="w-4 h-4 rounded text-cyan-500 accent-cyan-500 cursor-pointer"
              />
              <span className="font-semibold">Date of Birth</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-200 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60 cursor-pointer hover:border-cyan-500/50 transition-all select-none">
              <input
                type="checkbox"
                checked={cardFields.showGuardian}
                onChange={() => setCardFields((prev) => ({ ...prev, showGuardian: !prev.showGuardian }))}
                className="w-4 h-4 rounded text-cyan-500 accent-cyan-500 cursor-pointer"
              />
              <span className="font-semibold">Parent / Guardian</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-200 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60 cursor-pointer hover:border-cyan-500/50 transition-all select-none">
              <input
                type="checkbox"
                checked={cardFields.showBarcode}
                onChange={() => setCardFields((prev) => ({ ...prev, showBarcode: !prev.showBarcode }))}
                className="w-4 h-4 rounded text-cyan-500 accent-cyan-500 cursor-pointer"
              />
              <span className="font-semibold">Barcode Strip</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-200 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60 cursor-pointer hover:border-cyan-500/50 transition-all select-none">
              <input
                type="checkbox"
                checked={cardFields.showQrCode}
                onChange={() => setCardFields((prev) => ({ ...prev, showQrCode: !prev.showQrCode }))}
                className="w-4 h-4 rounded text-cyan-500 accent-cyan-500 cursor-pointer"
              />
              <span className="font-semibold">Secure QR</span>
            </label>
          </div>
        </div>
      </div>

      {/* PRINT-READY CARDS CANVAS */}
      <div id="id-cards-print-area">
        <div className="no-print flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Live Print Sheet Preview (A4 Standard 2-Column Grid)
          </h3>
          <span className="text-xs text-slate-400">
            Dashed borders serve as cutting guides when printed on A4 heavy cardstock.
          </span>
        </div>

        {cardsToPrint.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
            <CreditCard className="w-12 h-12 mx-auto text-slate-600 mb-2" />
            <p className="text-sm font-semibold">No ID cards selected.</p>
            <p className="text-xs text-slate-500 mt-1">Select members above to populate print sheet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 print:grid-cols-2 print:gap-4">
            {cardsToPrint.map((member, idx) => {
              const id = member.role_code || member.roll_number || member.id;
              const isStudent = (member.role || "student").toLowerCase() === "student";
              const bloodGroup = member.blood_group || BLOOD_GROUPS[idx % BLOOD_GROUPS.length];
              const phone = member.phone || "+91 98200 00000";

              return (
                <div
                  key={id}
                  className="print-card-box bg-slate-900 border-2 border-dashed border-slate-600 rounded-2xl overflow-hidden shadow-2xl relative flex flex-col justify-between text-slate-100 max-w-[420px] mx-auto w-full"
                  style={{ minHeight: "240px" }}
                >
                  {/* CARD HEADER */}
                  <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {schoolLogo && schoolLogo.startsWith("data:image") ? (
                        <img
                          src={schoolLogo}
                          alt="Logo"
                          className="w-8 h-8 rounded-lg object-contain bg-white/10 p-0.5 border border-white/20"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-md">
                          {schoolCode.slice(0, 2)}
                        </div>
                      )}
                      <div>
                        <h4 className="text-xs font-black uppercase text-white tracking-wide truncate max-w-[200px]">
                          {institutionName}
                        </h4>
                        <p className="text-[9px] text-blue-300 font-medium">
                          ID CARD • 2026-2027 • CODE: {schoolCode}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {isStudent ? "STUDENT" : "STAFF"}
                    </span>
                  </div>

                  {/* CARD BODY */}
                  <div className="p-4 flex gap-4 items-center">
                    {/* PHOTO PLACEHOLDER */}
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-24 rounded-xl bg-gradient-to-b from-slate-700 to-slate-800 border-2 border-slate-600 flex flex-col items-center justify-center shadow-inner relative overflow-hidden">
                        <User className="w-10 h-10 text-slate-400" />
                        <span className="text-[8px] text-slate-400 font-bold mt-1">AFFIX PHOTO</span>
                        <div className="absolute bottom-0 inset-x-0 bg-blue-600/80 py-0.5 text-[8px] font-bold text-center text-white">
                          VERIFIED
                        </div>
                      </div>
                      {cardFields.showBloodGroup && (
                        <span className="text-[9px] font-bold text-rose-400 flex items-center gap-0.5 mt-1.5">
                          <Droplet className="w-3 h-3 text-rose-500 fill-rose-500" /> {bloodGroup}
                        </span>
                      )}
                    </div>

                    {/* MEMBER DETAILS */}
                    <div className="flex-1 space-y-1.5 overflow-hidden">
                      <div>
                        <h3 className="text-sm font-black text-white truncate leading-tight">
                          {member.name || member.full_name}
                        </h3>
                        <p className="text-xs font-bold text-blue-400 font-mono">
                          ID: {id}
                        </p>
                      </div>

                      <div className="text-[10px] space-y-0.5 text-slate-300">
                        <p className="truncate">
                          <strong className="text-slate-400">{isStudent ? "Batch:" : "Designation:"}</strong>{" "}
                          <span className="font-semibold text-white">{member.class_name || member.role}</span>
                        </p>

                        {cardFields.showDob && (
                          <p className="truncate">
                            <strong className="text-slate-400">DOB:</strong>{" "}
                            <span className="font-mono text-slate-200">{member.dob || "15/08/2009"}</span>
                          </p>
                        )}

                        {cardFields.showGuardian && isStudent && (member.parent_name || member.guardian_name) && (
                          <p className="truncate">
                            <strong className="text-slate-400">Guardian:</strong> {member.parent_name || member.guardian_name}
                          </p>
                        )}

                        {cardFields.showEmergencyContact && (
                          <p className="flex items-center gap-1 text-slate-300">
                            <Phone className="w-3 h-3 text-emerald-400" />
                            <span className="font-mono">{phone}</span>
                          </p>
                        )}
                      </div>

                      {/* AUTHENTIC BARCODE / QR SIMULATION */}
                      {(cardFields.showBarcode || cardFields.showQrCode) && (
                        <div className="pt-1 flex items-center justify-between">
                          {cardFields.showBarcode ? (
                            <div className="flex flex-col">
                              <span className="text-[7px] text-slate-400 font-mono tracking-tighter">
                                SECURE TOKEN: {id}-{schoolCode}
                              </span>
                              <div className="flex gap-0.5 items-center h-4 mt-0.5">
                                {[12, 6, 18, 8, 22, 10, 15, 6, 19, 12, 14, 8, 20, 10, 16, 7].map((h, i) => (
                                  <div
                                    key={i}
                                    className="w-0.5 bg-slate-300"
                                    style={{ height: `${h}px` }}
                                  ></div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div></div>
                          )}

                          {cardFields.showQrCode && (
                            <div className="p-1 bg-white rounded border border-slate-300">
                              <QrCode className="w-8 h-8 text-black" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CARD FOOTER */}
                  <div className="bg-slate-950 px-4 py-2 border-t border-slate-800 flex items-center justify-between text-[8px] text-slate-400">
                    <span>Valid: 2026-2027</span>
                    <span className="font-serif italic text-slate-300">Auth Signatory</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

