import React, { useState, useEffect, useContext, useMemo } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { generatePayslipPDF } from "../utils/pdfGenerator";
import {
  Wallet,
  FileText,
  DollarSign,
  TrendingUp,
  Download,
  CheckCircle,
  Clock,
  Users,
  Search,
  Filter,
  Sliders,
  Calendar,
  AlertCircle,
  Building,
  Edit,
  X,
  CreditCard
} from "lucide-react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const YEARS = ["2025", "2026", "2027"];

export default function PayrollManager() {
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

  // Selected Pay Period
  const [selectedMonth, setSelectedMonth] = useState("October");
  const [selectedYear, setSelectedYear] = useState("2026");
  const currentPayPeriod = `${selectedMonth} ${selectedYear}`;

  const [staffList, setStaffList] = useState([]);
  const [salaryStructures, setSalaryStructures] = useState({});
  const [payrollRuns, setPayrollRuns] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [processingPayroll, setProcessingPayroll] = useState(false);

  // Salary Edit Modal
  const [editingStaff, setEditingStaff] = useState(null);
  const [editSalaryForm, setEditSalaryForm] = useState({
    basic: 35000,
    hra: 10500,
    da: 3500,
    special: 3000,
    pf: 1800,
    professionalTax: 200,
    tds: 1500,
    leaveDeduction: 0,
  });

  // Load staff & structures
  useEffect(() => {
    loadStaffAndPayroll();
  }, [schoolCode, currentPayPeriod]);

  const loadStaffAndPayroll = () => {
    try {
      // 1. Load directory to discover staff
      let dir = [];
      const rawDir = localStorage.getItem(`erp_directory_${schoolCode}`);
      if (rawDir) dir = JSON.parse(rawDir);

      let eligibleStaff = dir.filter((m) => {
        const r = (m.role || "").toLowerCase();
        return (
          r === "teacher" ||
          r === "accountant" ||
          r === "staff" ||
          r === "non_teaching" ||
          r === "principal" ||
          r === "trustee"
        );
      });

      if (eligibleStaff.length === 0) {
        // Fallback starter faculty if fresh slate
        eligibleStaff = [
          {
            id: "TCH-01",
            role_code: "TCH-01",
            name: "Dr. Vikram Joshi",
            role: "teacher",
            class_name: "Senior Physics Faculty",
            phone: "+91 98111 22334",
            email: "vikram.joshi@school.edu",
          },
          {
            id: "TCH-02",
            role_code: "TCH-02",
            name: "Sunita Rao",
            role: "teacher",
            class_name: "Mathematics Department Head",
            phone: "+91 98222 33445",
            email: "sunita.rao@school.edu",
          },
          {
            id: "ACC-01",
            role_code: "ACC-01",
            name: "Ramesh Kulkarni",
            role: "accountant",
            class_name: "Chief Treasury Officer",
            phone: "+91 98333 44556",
            email: "kulkarni.accounts@school.edu",
          },
          {
            id: "NON-01",
            role_code: "NON-01",
            name: "Mahesh Shinde",
            role: "staff",
            class_name: "Campus Operations Supervisor",
            phone: "+91 98444 55667",
            email: "mahesh.ops@school.edu",
          },
        ];
      }

      setStaffList(eligibleStaff);

      // 2. Load configured salary structures
      const rawStructures = localStorage.getItem(`erp_salary_structures_${schoolCode}`);
      let structures = {};
      if (rawStructures) {
        structures = JSON.parse(rawStructures);
      }
      setSalaryStructures(structures);

      // 3. Load payroll run for selected month
      const rawRun = localStorage.getItem(`erp_payroll_${schoolCode}_${currentPayPeriod.replace(/\s+/g, "_")}`);
      if (rawRun) {
        setPayrollRuns((prev) => ({
          ...prev,
          [currentPayPeriod]: JSON.parse(rawRun),
        }));
      }
    } catch (e) {
      console.warn("Could not load staff payroll data:", e);
    }
  };

  // Helper to get staff salary package
  const getStaffSalaryPackage = (staffId) => {
    if (salaryStructures[staffId]) {
      return salaryStructures[staffId];
    }
    // Default package
    return {
      basic: 35000,
      hra: 10500,
      da: 3500,
      special: 3000,
      pf: 1800,
      professionalTax: 200,
      tds: 1500,
      leaveDeduction: 0,
    };
  };

  // Open Salary Edit Modal
  const handleOpenEdit = (staff) => {
    const id = staff.role_code || staff.roll_number || staff.id;
    setEditingStaff(staff);
    setEditSalaryForm(getStaffSalaryPackage(id));
  };

  // Save Salary Structure
  const handleSaveSalaryStructure = (e) => {
    e.preventDefault();
    if (!editingStaff) return;

    const id = editingStaff.role_code || editingStaff.roll_number || editingStaff.id;
    const updated = {
      ...salaryStructures,
      [id]: {
        basic: Number(editSalaryForm.basic) || 0,
        hra: Number(editSalaryForm.hra) || 0,
        da: Number(editSalaryForm.da) || 0,
        special: Number(editSalaryForm.special) || 0,
        pf: Number(editSalaryForm.pf) || 0,
        professionalTax: Number(editSalaryForm.professionalTax) || 0,
        tds: Number(editSalaryForm.tds) || 0,
        leaveDeduction: Number(editSalaryForm.leaveDeduction) || 0,
      },
    };

    setSalaryStructures(updated);
    try {
      localStorage.setItem(`erp_salary_structures_${schoolCode}`, JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }

    setEditingStaff(null);
    showToast(`✅ Salary structure updated for ${editingStaff.name || id}`, "success");
  };

  // Process Payroll Run for Month
  const handleRunPayroll = () => {
    setProcessingPayroll(true);

    setTimeout(() => {
      const records = staffList.map((st) => {
        const id = st.role_code || st.roll_number || st.id;
        const salary = getStaffSalaryPackage(id);
        const gross =
          salary.basic + salary.hra + salary.da + salary.special;
        const deductions =
          salary.pf +
          salary.professionalTax +
          salary.tds +
          salary.leaveDeduction;
        const net = gross - deductions;

        return {
          staffId: id,
          name: st.name || st.full_name,
          role: st.role,
          designation: st.class_name || st.role,
          basic: salary.basic,
          hra: salary.hra,
          da: salary.da,
          special: salary.special,
          grossEarnings: gross,
          pf: salary.pf,
          professionalTax: salary.professionalTax,
          tds: salary.tds,
          leaveDeduction: salary.leaveDeduction,
          totalDeductions: deductions,
          netSalary: net,
          status: "Disbursed",
          payDate: new Date().toLocaleDateString("en-IN"),
          refNo: `SAL-${selectedMonth.toUpperCase().slice(0, 3)}${selectedYear}-${Date.now().toString().slice(-4)}`,
        };
      });

      const payrollPayload = {
        period: currentPayPeriod,
        runDate: new Date().toISOString(),
        status: "Disbursed",
        records,
      };

      const storageKey = `erp_payroll_${schoolCode}_${currentPayPeriod.replace(/\s+/g, "_")}`;
      localStorage.setItem(storageKey, JSON.stringify(payrollPayload));

      setPayrollRuns((prev) => ({
        ...prev,
        [currentPayPeriod]: payrollPayload,
      }));

      setProcessingPayroll(false);
      showToast(`🎉 Payroll processed & disbursed for ${currentPayPeriod}!`, "success");
    }, 600);
  };

  // Download PDF Payslip
  const handleDownloadPayslip = (staff, payrollRecord) => {
    try {
      const id = staff.role_code || staff.roll_number || staff.id;
      const salary = payrollRecord || getStaffSalaryPackage(id);

      generatePayslipPDF({
        tenant: {
          name: institutionName,
          code: schoolCode,
          address: tenant?.address,
          email: tenant?.email,
          logoUrl: tenant?.logoUrl,
        },
        staff: {
          ...staff,
          id,
        },
        payroll: {
          ...salary,
          payDate: payrollRecord?.payDate || new Date().toLocaleDateString("en-IN"),
          refNo: payrollRecord?.refNo || `SAL-${currentPayPeriod.replace(/\s+/g, "")}-${id}`,
        },
        monthYear: currentPayPeriod,
      });

      showToast(`📄 Downloaded official payslip for ${staff.name || id}`, "success");
    } catch (e) {
      console.error("Payslip PDF error:", e);
      showToast("Could not generate payslip PDF. Please check data.", "error");
    }
  };

  // Filtered staff
  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      const query = searchQuery.toLowerCase();
      const name = (s.name || s.full_name || "").toLowerCase();
      const id = (s.role_code || s.roll_number || s.id || "").toLowerCase();
      const role = (s.role || "").toLowerCase();
      return name.includes(query) || id.includes(query) || role.includes(query);
    });
  }, [staffList, searchQuery]);

  // Aggregate Metrics for Active Period
  const activeRun = payrollRuns[currentPayPeriod];
  const totalDisbursed = activeRun
    ? activeRun.records.reduce((acc, r) => acc + r.netSalary, 0)
    : staffList.reduce((acc, s) => {
        const id = s.role_code || s.roll_number || s.id;
        const pkg = getStaffSalaryPackage(id);
        const gross = pkg.basic + pkg.hra + pkg.da + pkg.special;
        const ded = pkg.pf + pkg.professionalTax + pkg.tds + pkg.leaveDeduction;
        return acc + (gross - ded);
      }, 0);

  const totalDeductions = activeRun
    ? activeRun.records.reduce((acc, r) => acc + r.totalDeductions, 0)
    : staffList.reduce((acc, s) => {
        const id = s.role_code || s.roll_number || s.id;
        const pkg = getStaffSalaryPackage(id);
        return acc + (pkg.pf + pkg.professionalTax + pkg.tds + pkg.leaveDeduction);
      }, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 font-bold">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              Staff Payroll & Compensation Manager
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                {schoolCode}
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Configure allowances & deductions, execute monthly payroll disbursements, and generate official branded PDF payslips.
            </p>
          </div>
        </div>

        {/* Period Selector & Action */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl px-2 py-1 gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-white text-xs font-semibold focus:outline-none"
            >
              {MONTHS.map((m) => (
                <option key={m} value={m} className="bg-slate-900 text-white">
                  {m}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent text-white text-xs font-semibold focus:outline-none"
            >
              {YEARS.map((y) => (
                <option key={y} value={y} className="bg-slate-900 text-white">
                  {y}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleRunPayroll}
            disabled={processingPayroll}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all hover:scale-105 cursor-pointer disabled:opacity-50"
          >
            <CreditCard className="w-4 h-4" />
            {processingPayroll ? "Disbursing..." : activeRun ? "Re-Run Payroll" : "Run Payroll"}
          </button>
        </div>
      </div>

      {/* Financial Metrics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Net Monthly Payout</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2">
            ₹{totalDisbursed.toLocaleString("en-IN")}
          </p>
          <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
            <CheckCircle className="w-3 h-3" />
            {activeRun ? "Disbursed & Locked" : "Projected for " + currentPayPeriod}
          </span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Statutory Deductions (PF/PT/Tax)</span>
            <TrendingUp className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-black text-rose-400 mt-2">
            ₹{totalDeductions.toLocaleString("en-IN")}
          </p>
          <span className="text-[10px] text-slate-500">Government compliance withholding</span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Active Staff Count</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-blue-400 mt-2">{staffList.length}</p>
          <span className="text-[10px] text-slate-500">Teachers, ops & accounts</span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Payroll Cycle Status</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-lg font-black text-white mt-2">
            {activeRun ? "DISBURSED" : "PENDING RUN"}
          </p>
          <span className="text-[10px] text-slate-400">Cycle: {currentPayPeriod}</span>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search staff by name, role or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <span className="text-xs text-slate-400 hidden sm:inline">
          Showing <strong className="text-white">{filteredStaff.length}</strong> payroll eligible personnel
        </span>
      </div>

      {/* Staff Compensation Table */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-800/90 text-slate-300 border-b border-slate-700 font-bold">
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Role / Designation</th>
                <th className="py-3 px-4 text-right">Basic Pay</th>
                <th className="py-3 px-4 text-right">Allowances</th>
                <th className="py-3 px-4 text-right">Deductions</th>
                <th className="py-3 px-4 text-right">Net Payable</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No faculty or staff found.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff) => {
                  const id = staff.role_code || staff.roll_number || staff.id;
                  const pkg = getStaffSalaryPackage(id);
                  const allowances = pkg.hra + pkg.da + pkg.special;
                  const deductions = pkg.pf + pkg.professionalTax + pkg.tds + pkg.leaveDeduction;
                  const net = pkg.basic + allowances - deductions;

                  const runRecord = activeRun?.records.find((r) => r.staffId === id);

                  return (
                    <tr key={id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-white text-sm">{staff.name || staff.full_name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{id}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="capitalize text-slate-200 font-semibold">
                          {staff.class_name || staff.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-200">
                        ₹{pkg.basic.toLocaleString("en-IN")}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-emerald-400">
                        +₹{allowances.toLocaleString("en-IN")}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-rose-400">
                        -₹{deductions.toLocaleString("en-IN")}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-white text-sm">
                        ₹{net.toLocaleString("en-IN")}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            activeRun
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          }`}
                        >
                          {activeRun ? "Disbursed" : "Pending"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        {/* Edit Structure */}
                        <button
                          onClick={() => handleOpenEdit(staff)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-all cursor-pointer"
                          title="Configure Salary Package"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                        </button>

                        {/* Download Payslip Button */}
                        <button
                          onClick={() => handleDownloadPayslip(staff, runRecord)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                          title="Download Official PDF Payslip"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Payslip
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CONFIGURE SALARY STRUCTURE MODAL */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white">Configure Staff Compensation</h3>
                <p className="text-xs text-slate-400">
                  {editingStaff.name || editingStaff.full_name} ({editingStaff.role_code || editingStaff.id})
                </p>
              </div>
              <button
                onClick={() => setEditingStaff(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSalaryStructure} className="space-y-4">
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Earnings & Allowances
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Basic Salary (₹)</label>
                    <input
                      type="number"
                      value={editSalaryForm.basic}
                      onChange={(e) => setEditSalaryForm({ ...editSalaryForm, basic: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">HRA (₹)</label>
                    <input
                      type="number"
                      value={editSalaryForm.hra}
                      onChange={(e) => setEditSalaryForm({ ...editSalaryForm, hra: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Dearness Allowance (₹)</label>
                    <input
                      type="number"
                      value={editSalaryForm.da}
                      onChange={(e) => setEditSalaryForm({ ...editSalaryForm, da: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Special Allowance (₹)</label>
                    <input
                      type="number"
                      value={editSalaryForm.special}
                      onChange={(e) => setEditSalaryForm({ ...editSalaryForm, special: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-800">
                <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                  Deductions & Withholding
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Provident Fund (PF) (₹)</label>
                    <input
                      type="number"
                      value={editSalaryForm.pf}
                      onChange={(e) => setEditSalaryForm({ ...editSalaryForm, pf: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Professional Tax (₹)</label>
                    <input
                      type="number"
                      value={editSalaryForm.professionalTax}
                      onChange={(e) => setEditSalaryForm({ ...editSalaryForm, professionalTax: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">TDS / Income Tax (₹)</label>
                    <input
                      type="number"
                      value={editSalaryForm.tds}
                      onChange={(e) => setEditSalaryForm({ ...editSalaryForm, tds: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Leave Deductions (₹)</label>
                    <input
                      type="number"
                      value={editSalaryForm.leaveDeduction}
                      onChange={(e) => setEditSalaryForm({ ...editSalaryForm, leaveDeduction: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Net Calculation Preview */}
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 flex items-center justify-between">
                <span className="text-xs text-slate-300 font-semibold">Calculated Net Monthly Salary:</span>
                <span className="text-base font-black text-emerald-400 font-mono">
                  ₹{Math.max(
                    0,
                    Number(editSalaryForm.basic || 0) +
                      Number(editSalaryForm.hra || 0) +
                      Number(editSalaryForm.da || 0) +
                      Number(editSalaryForm.special || 0) -
                      (Number(editSalaryForm.pf || 0) +
                        Number(editSalaryForm.professionalTax || 0) +
                        Number(editSalaryForm.tds || 0) +
                        Number(editSalaryForm.leaveDeduction || 0))
                  ).toLocaleString("en-IN")}
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 cursor-pointer"
                >
                  Save Salary Package
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

