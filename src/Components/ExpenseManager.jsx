import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { supabase } from "../supabaseClient";
import { logSecurityAction } from "../utils/auditLogger";
import { exportToCSV } from "../utils/exportUtils";

export default function ExpenseManager({ schoolId }) {
  const { user, tenant } = useContext(AppContext) || {};
  const { showToast } = useToast();

  const activeSchoolId = (schoolId || user?.institution_code || user?.school_id || tenant?.code || "CAMPUS-01").toUpperCase();

  // 3 Core Required Inputs + standard expense details
  const [expenseForm, setExpenseForm] = useState({
    title: "",
    category: "Utilities & Bills",
    vendor: "",
    totalBill: "",
    amountPaidNow: "",
    amountRemaining: 0,
    paymentMode: "UPI / Net Banking",
    paymentDate: new Date().toISOString().split("T")[0],
    receiptNo: `EXP-${Date.now().toString().slice(-5)}`,
    notes: "",
  });

  const [expenses, setExpenses] = useState([]);
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [submitting, setSubmitting] = useState(false);

  // Auto-calculate Amount Remaining when Total Bill or Amount Paid Now changes
  const handleAmountChange = (field, value) => {
    const updatedForm = { ...expenseForm, [field]: value };
    const bill = parseFloat(field === "totalBill" ? value : updatedForm.totalBill) || 0;
    const paid = parseFloat(field === "amountPaidNow" ? value : updatedForm.amountPaidNow) || 0;
    const remaining = Math.max(0, bill - paid);
    
    updatedForm.amountRemaining = remaining;
    setExpenseForm(updatedForm);
  };

  // Load expenses
  const loadExpenses = () => {
    try {
      const storageKey = `erp_expenses_${activeSchoolId}`;
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        setExpenses(JSON.parse(raw));
      } else {
        // Seed default institutional expenses if clean slate
        const now = new Date();
        const currentMonthStr = now.toISOString().split("T")[0];
        const defaults = [
          {
            id: `exp_101_${activeSchoolId}`,
            title: "Campus Optical Fiber Internet (Quarterly)",
            category: "Utilities & Bills",
            vendor: "Airtel Enterprise Telecom",
            totalBill: 12000,
            amountPaidNow: 12000,
            amountRemaining: 0,
            paymentMode: "Bank Transfer",
            paymentDate: currentMonthStr,
            receiptNo: "EXP-88912",
            notes: "1 Gbps dedicated campus leased line",
            createdAt: now.toISOString(),
          },
          {
            id: `exp_102_${activeSchoolId}`,
            title: "Science Lab Reagents & Physics Apparatus",
            category: "Laboratory & Academics",
            vendor: "Standard Scientific Supplies",
            totalBill: 28500,
            amountPaidNow: 15000,
            amountRemaining: 13500,
            paymentMode: "Cheque",
            paymentDate: currentMonthStr,
            receiptNo: "EXP-88913",
            notes: "Balance due on delivery of second batch",
            createdAt: now.toISOString(),
          },
          {
            id: `exp_103_${activeSchoolId}`,
            title: "Term-1 Question Paper & Exam Booklets Printing",
            category: "Printing & Stationery",
            vendor: "Navneet Offset Press",
            totalBill: 8400,
            amountPaidNow: 8400,
            amountRemaining: 0,
            paymentMode: "UPI / Net Banking",
            paymentDate: currentMonthStr,
            receiptNo: "EXP-88914",
            notes: "Sealed question packets for ICSE/CBSE batches",
            createdAt: now.toISOString(),
          },
        ];
        localStorage.setItem(storageKey, JSON.stringify(defaults));
        setExpenses(defaults);
      }
    } catch (err) {
      console.warn("Failed to load expenses:", err);
    }
  };

  useEffect(() => {
    loadExpenses();
    const handleUpdate = () => loadExpenses();
    window.addEventListener("erp-expenses-updated", handleUpdate);
    return () => window.removeEventListener("erp-expenses-updated", handleUpdate);
  }, [activeSchoolId]);

  // Record New Expense
  const handleRecordExpense = async (e) => {
    e.preventDefault();

    const bill = parseFloat(expenseForm.totalBill);
    const paid = parseFloat(expenseForm.amountPaidNow);

    if (!expenseForm.title.trim()) {
      showToast("Please enter an expense title or vendor name.", "error");
      return;
    }
    if (isNaN(bill) || bill <= 0) {
      showToast("Please enter a valid Total Bill amount.", "error");
      return;
    }
    if (isNaN(paid) || paid < 0) {
      showToast("Please enter a valid Amount Paid Now.", "error");
      return;
    }
    if (paid > bill) {
      showToast("Amount Paid cannot exceed the Total Bill.", "error");
      return;
    }

    setSubmitting(true);

    const remaining = Math.max(0, bill - paid);
    const newRecord = {
      id: `exp_${Date.now()}`,
      title: expenseForm.title.trim(),
      category: expenseForm.category,
      vendor: expenseForm.vendor.trim() || "Institutional Vendor",
      totalBill: bill,
      amountPaidNow: paid,
      amountRemaining: remaining,
      paymentMode: expenseForm.paymentMode,
      paymentDate: expenseForm.paymentDate,
      receiptNo: expenseForm.receiptNo.trim() || `EXP-${Date.now().toString().slice(-5)}`,
      notes: expenseForm.notes.trim(),
      schoolId: activeSchoolId,
      createdAt: new Date().toISOString(),
    };

    try {
      const updatedList = [newRecord, ...expenses];
      const storageKey = `erp_expenses_${activeSchoolId}`;
      localStorage.setItem(storageKey, JSON.stringify(updatedList));
      setExpenses(updatedList);
      window.dispatchEvent(new Event("erp-expenses-updated"));

      // Try Supabase Cloud Sync
      try {
        if (supabase) {
          await supabase.from("expenses").insert([
            {
              id: newRecord.id,
              school_id: activeSchoolId,
              title: newRecord.title,
              category: newRecord.category,
              vendor: newRecord.vendor,
              total_bill: newRecord.totalBill,
              amount_paid: newRecord.amountPaidNow,
              amount_remaining: newRecord.amountRemaining,
              payment_mode: newRecord.paymentMode,
              payment_date: newRecord.paymentDate,
              receipt_no: newRecord.receiptNo,
              notes: newRecord.notes,
            },
          ]);
        }
      } catch (cloudErr) {
        console.warn("Supabase expense sync notice:", cloudErr);
      }

      logSecurityAction({
        action: "EXPENSE_RECORDED",
        entityType: "FINANCE",
        entityId: newRecord.receiptNo,
        details: `Recorded expense "${newRecord.title}" - Total: ₹${bill}, Paid: ₹${paid}, Remaining: ₹${remaining}`,
        user,
        schoolId: activeSchoolId,
      });

      showToast(`Expense recorded successfully! (Receipt: ${newRecord.receiptNo})`, "success");

      // Reset form
      setExpenseForm({
        title: "",
        category: "Utilities & Bills",
        vendor: "",
        totalBill: "",
        amountPaidNow: "",
        amountRemaining: 0,
        paymentMode: "UPI / Net Banking",
        paymentDate: new Date().toISOString().split("T")[0],
        receiptNo: `EXP-${Date.now().toString().slice(-5)}`,
        notes: "",
      });
    } catch (err) {
      console.error("Expense record error:", err);
      showToast("Failed to record expense.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Expense
  const handleDeleteExpense = (id) => {
    const updated = expenses.filter((ex) => ex.id !== id);
    setExpenses(updated);
    localStorage.setItem(`erp_expenses_${activeSchoolId}`, JSON.stringify(updated));
    showToast("Expense record removed.", "info");
    window.dispatchEvent(new Event("erp-expenses-updated"));
  };

  // Summary Metrics
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const totalPaidThisMonth = expenses
    .filter((ex) => {
      if (!ex.paymentDate) return false;
      const d = new Date(ex.paymentDate);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, ex) => sum + (parseFloat(ex.amountPaidNow) || 0), 0);

  const totalIncurredBills = expenses.reduce((sum, ex) => sum + (parseFloat(ex.totalBill) || 0), 0);
  const totalAmountRemaining = expenses.reduce((sum, ex) => sum + (parseFloat(ex.amountRemaining) || 0), 0);
  const totalAllTimePaid = expenses.reduce((sum, ex) => sum + (parseFloat(ex.amountPaidNow) || 0), 0);

  const filteredExpenses = expenses.filter((ex) => {
    if (filterCategory === "ALL") return true;
    return ex.category === filterCategory;
  });

  // Export Expenses to CSV
  const handleExportCSV = () => {
    if (filteredExpenses.length === 0) {
      showToast("No expenses to export.", "info");
      return;
    }
    const headers = [
      "Receipt No",
      "Date",
      "Expense Title",
      "Category",
      "Vendor",
      "Total Bill (INR)",
      "Amount Paid Now (INR)",
      "Amount Remaining (INR)",
      "Payment Mode",
      "Status",
      "Notes",
    ];
    const rows = filteredExpenses.map((ex) => [
      ex.receiptNo,
      ex.paymentDate,
      ex.title,
      ex.category,
      ex.vendor,
      ex.totalBill,
      ex.amountPaidNow,
      ex.amountRemaining,
      ex.paymentMode,
      ex.amountRemaining === 0 ? "Fully Paid" : "Partial / Pending",
      ex.notes || "",
    ]);
    exportToCSV(`Expense_Ledger_${activeSchoolId}_${new Date().toISOString().split("T")[0]}`, headers, rows);
    showToast("Expense report exported to CSV successfully!", "success");
  };

  return (
    <div className="space-y-6 text-slate-200">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 p-6 rounded-3xl border border-slate-700/60 backdrop-blur-md">
        <div>
          <span className="text-amber-400 font-extrabold uppercase tracking-widest text-[11px] block mb-1">
            Institutional Treasury & Accounts
          </span>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <span>🧾 Advanced Expense Tracker</span>
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Node: <span className="text-emerald-400 font-mono font-bold">{activeSchoolId}</span> &bull; Track operational bills, instant partial payouts & vendor payables
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-600 text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
          >
            <span>📥</span> Export CSV Ledger
          </button>
        </div>
      </div>

      {/* 3 SUMMARY CARDS (INCLUDING "TOTAL PAID THIS MONTH") */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 p-6 rounded-3xl shadow-xl relative overflow-hidden">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Current Month Outflow</span>
            <span className="text-2xl">📅</span>
          </div>
          <p className="text-xs font-semibold text-slate-400">Total Paid This Month</p>
          <p className="text-3xl font-black text-emerald-300 mt-1">
            ₹{totalPaidThisMonth.toLocaleString("en-IN")}
          </p>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-emerald-400/80 font-medium">
            <span>✓ Verified ledger disbursements</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-950/40 via-slate-900 to-slate-900 border border-blue-500/30 p-6 rounded-3xl shadow-xl relative overflow-hidden">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Gross Incurred</span>
            <span className="text-2xl">📑</span>
          </div>
          <p className="text-xs font-semibold text-slate-400">Total Incurred Bills</p>
          <p className="text-3xl font-black text-blue-300 mt-1">
            ₹{totalIncurredBills.toLocaleString("en-IN")}
          </p>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400 font-medium">
            <span>All-time disbursements: ₹{totalAllTimePaid.toLocaleString("en-IN")}</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-900 border border-rose-500/30 p-6 rounded-3xl shadow-xl relative overflow-hidden">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">Vendor Liabilities</span>
            <span className="text-2xl">⏳</span>
          </div>
          <p className="text-xs font-semibold text-slate-400">Total Remaining Payable</p>
          <p className="text-3xl font-black text-rose-300 mt-1">
            ₹{totalAmountRemaining.toLocaleString("en-IN")}
          </p>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-rose-400/80 font-medium">
            <span>Outstanding balance across active bills</span>
          </div>
        </div>
      </div>

      {/* EXPENSE ENTRY FORM WITH 3 INPUTS (TOTAL BILL, AMOUNT PAID NOW, AMOUNT REMAINING) */}
      <div className="bg-[#1E293B] border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="border-b border-slate-700 pb-4 mb-6">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <span>➕</span> Record Institutional Expense & Partial Payout
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Auto-calculates remaining payable balance and updates monthly disbursement statistics.
          </p>
        </div>

        <form onSubmit={handleRecordExpense} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Title */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Expense Title / Description *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Campus High-Speed Internet, Generator Diesel, Lab Supplies"
                value={expenseForm.title}
                onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Category *
              </label>
              <select
                value={expenseForm.category}
                onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="Utilities & Bills">Utilities & Power</option>
                <option value="Laboratory & Academics">Laboratory & Academics</option>
                <option value="Printing & Stationery">Printing & Stationery</option>
                <option value="Campus Maintenance">Campus Maintenance & Cleaning</option>
                <option value="Events & Functions">Events & Functions</option>
                <option value="IT & Software Subscriptions">IT & Software</option>
                <option value="Miscellaneous">Miscellaneous</option>
              </select>
            </div>
          </div>

          {/* 3 CORE AMOUNT INPUTS WITH AUTO-CALCULATED REMAINING */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-amber-500/30">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-amber-400 text-sm">💰</span>
              <span className="text-xs font-extrabold uppercase tracking-widest text-amber-300">
                Payment Allocation Engine (3 Required Inputs)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Input 1: Total Bill */}
              <div>
                <label className="block text-xs font-extrabold text-blue-300 uppercase tracking-wider mb-2">
                  1. Total Bill (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  placeholder="e.g. 25000"
                  value={expenseForm.totalBill}
                  onChange={(e) => handleAmountChange("totalBill", e.target.value)}
                  className="w-full bg-slate-950 border border-blue-500/50 rounded-xl px-4 py-3.5 text-white font-mono font-bold text-base focus:outline-none focus:border-blue-400"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">Full vendor invoice total</span>
              </div>

              {/* Input 2: Amount Paid Now */}
              <div>
                <label className="block text-xs font-extrabold text-emerald-300 uppercase tracking-wider mb-2">
                  2. Amount Paid Now (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  placeholder="e.g. 15000"
                  value={expenseForm.amountPaidNow}
                  onChange={(e) => handleAmountChange("amountPaidNow", e.target.value)}
                  className="w-full bg-slate-950 border border-emerald-500/50 rounded-xl px-4 py-3.5 text-emerald-300 font-mono font-bold text-base focus:outline-none focus:border-emerald-400"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">Disbursement made today</span>
              </div>

              {/* Input 3: Amount Remaining (Auto-calculated) */}
              <div>
                <label className="block text-xs font-extrabold text-rose-300 uppercase tracking-wider mb-2">
                  3. Amount Remaining (₹) [Auto]
                </label>
                <div className="relative">
                  <input
                    type="number"
                    readOnly
                    value={expenseForm.amountRemaining}
                    className="w-full bg-slate-950/60 border border-rose-500/40 rounded-xl px-4 py-3.5 text-rose-400 font-mono font-black text-base cursor-not-allowed select-none"
                  />
                  <span className="absolute right-3 top-3.5 text-xs text-rose-400/80 font-bold uppercase">
                    {expenseForm.amountRemaining === 0 ? "PAID IN FULL" : "PAYABLE"}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">Auto-calculated: (Total Bill − Paid Now)</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
            {/* Vendor */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Vendor / Payee Name
              </label>
              <input
                type="text"
                placeholder="e.g. Navneet Printers"
                value={expenseForm.vendor}
                onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Payment Mode */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Payment Mode
              </label>
              <select
                value={expenseForm.paymentMode}
                onChange={(e) => setExpenseForm({ ...expenseForm, paymentMode: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="UPI / Net Banking">UPI / Net Banking</option>
                <option value="Bank Transfer (NEFT/RTGS)">Bank Transfer</option>
                <option value="Cash Receipt">Cash Receipt</option>
                <option value="Cheque / Draft">Cheque</option>
              </select>
            </div>

            {/* Payment Date */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Payment Date *
              </label>
              <input
                type="date"
                required
                value={expenseForm.paymentDate}
                onChange={(e) => setExpenseForm({ ...expenseForm, paymentDate: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Receipt No */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Voucher / Receipt Ref
              </label>
              <input
                type="text"
                value={expenseForm.receiptNo}
                onChange={(e) => setExpenseForm({ ...expenseForm, receiptNo: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-amber-300 font-mono text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black px-6 py-3.5 rounded-xl shadow-lg shadow-amber-600/30 transition-all text-xs border border-amber-400/40 cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              <span>💳</span>
              <span>{submitting ? "Recording Transaction..." : "Save Expense & Post to Treasury"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* RECORDED EXPENSES LEDGER TABLE */}
      <div className="bg-[#1E293B] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-700 bg-slate-800/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-bold text-white">Institutional Expense Ledger</h3>
            <p className="text-xs text-slate-400 mt-0.5">Audited vouchers, supplier payouts & remaining balances</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setFilterCategory("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterCategory === "ALL" ? "bg-amber-600 text-slate-950 font-black" : "bg-slate-900 text-slate-400 hover:text-white"
              }`}
            >
              All ({expenses.length})
            </button>
            <button
              onClick={() => setFilterCategory("Utilities & Bills")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterCategory === "Utilities & Bills" ? "bg-amber-600 text-slate-950 font-black" : "bg-slate-900 text-slate-400 hover:text-white"
              }`}
            >
              Utilities
            </button>
            <button
              onClick={() => setFilterCategory("Laboratory & Academics")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterCategory === "Laboratory & Academics" ? "bg-amber-600 text-slate-950 font-black" : "bg-slate-900 text-slate-400 hover:text-white"
              }`}
            >
              Lab & Academics
            </button>
          </div>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <p className="text-base font-bold text-slate-300 mb-1">No expenses recorded for this selection.</p>
            <p className="text-xs">Use the allocation form above to record your first operational expense.</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider bg-slate-900/40">
                  <th className="p-4 pl-6">Voucher / Title</th>
                  <th className="p-4">Category & Vendor</th>
                  <th className="p-4 font-mono">Date</th>
                  <th className="p-4 text-right">Total Bill</th>
                  <th className="p-4 text-right">Amount Paid</th>
                  <th className="p-4 text-right">Remaining</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right pr-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 text-sm">
                {filteredExpenses.map((ex) => {
                  const isPaidFull = (parseFloat(ex.amountRemaining) || 0) === 0;
                  return (
                    <tr key={ex.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-4 pl-6">
                        <p className="font-bold text-white text-sm">{ex.title}</p>
                        <span className="font-mono text-[11px] text-amber-400/90">{ex.receiptNo}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-xs font-semibold text-slate-200 block">{ex.category}</span>
                        <span className="text-xs text-slate-400">{ex.vendor} &bull; {ex.paymentMode}</span>
                      </td>
                      <td className="p-4 font-mono text-xs text-slate-300">{ex.paymentDate}</td>
                      <td className="p-4 text-right font-mono font-bold text-blue-300 text-sm">
                        ₹{Number(ex.totalBill).toLocaleString("en-IN")}
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-emerald-400 text-sm">
                        ₹{Number(ex.amountPaidNow).toLocaleString("en-IN")}
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-rose-400 text-sm">
                        ₹{Number(ex.amountRemaining).toLocaleString("en-IN")}
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                            isPaidFull
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                              : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                          }`}
                        >
                          {isPaidFull ? "Fully Paid" : "Partial / Due"}
                        </span>
                      </td>
                      <td className="p-4 text-right pr-6">
                        <button
                          onClick={() => handleDeleteExpense(ex.id)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all cursor-pointer"
                          title="Remove expense record"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

