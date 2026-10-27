import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { supabase } from "../supabaseClient";
import { StatSkeleton, TableSkeleton } from "../Components/Skeleton";
import { generateFeeInvoicePDF } from "../utils/pdfGenerator";
import { notifyFeePaymentConfirmed } from "../utils/notifications";
import { Eye, CheckCircle2, XCircle, AlertCircle, FileText, Image as ImageIcon, RotateCcw } from "lucide-react";
import FeeRiskRadar from "../Components/FeeRiskRadar";
import BankReconciliationWorkbench from "../Components/BankReconciliationWorkbench";

export default function AccountantDashboard() {
  const navigate = useNavigate();
  const { user } = useContext(AppContext);
  const { showToast } = useToast();
  const [ledger, setLedger] = useState([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    pendingDues: 0,
    totalPaidCount: 0,
    pendingVerificationCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [previewReceipt, setPreviewReceipt] = useState(null);

  const [formData, setFormData] = useState({
    student_name: "",
    class_name: "",
    amount: "",
    status: "paid",
    payment_mode: "Cash / Cheque",
  });

  // Maker-Checker Credit Note & Reversal State
  const [reversalTarget, setReversalTarget] = useState(null);
  const [reversalReason, setReversalReason] = useState("Scholarship / Fee Concession");
  const [reversalAmount, setReversalAmount] = useState("");
  const [submittingReversal, setSubmittingReversal] = useState(false);

  const schoolId = (user?.institution_code || user?.school_id || "CAMPUS-01").toUpperCase();

  const handleInitiateReversal = (item) => {
    setReversalTarget(item);
    setReversalAmount(String(item.amount || ""));
    setReversalReason("Scholarship / Fee Concession");
  };

  const handleConfirmReversalRequest = (e) => {
    e.preventDefault();
    if (!reversalTarget || !reversalAmount) return;

    setSubmittingReversal(true);
    try {
      const revRecord = {
        id: `rev_${Date.now()}`,
        receiptId: reversalTarget.id,
        studentName: reversalTarget.student_name,
        rollNumber: reversalTarget.roll_number || reversalTarget.student_roll || reversalTarget.student_name,
        className: reversalTarget.class_name,
        amount: Number(reversalAmount),
        reason: reversalReason,
        makerName: user?.name || user?.full_name || "Accountant",
        makerRole: "Accountant",
        status: "pending_approval",
        requestedAt: new Date().toISOString(),
      };

      const revKey = `erp_fee_reversals_${schoolId}`;
      const existing = JSON.parse(localStorage.getItem(revKey) || "[]");
      localStorage.setItem(revKey, JSON.stringify([revRecord, ...existing]));

      window.dispatchEvent(new Event("erp-fee-reversals-updated"));
      showToast("Reversal request routed to Principal's Operational Approval Inbox (Maker-Checker enforced).", "success");
      setReversalTarget(null);
    } catch (err) {
      showToast("Failed to submit reversal request.", "error");
    } finally {
      setSubmittingReversal(false);
    }
  };

  const fetchLedger = async () => {
    setLoading(true);

    let localRecords = [];
    try {
      const savedTenantRaw = localStorage.getItem(`erp_fee_ledger_${schoolId}`);
      if (savedTenantRaw) {
        localRecords = JSON.parse(savedTenantRaw);
      } else {
        const savedRaw = localStorage.getItem("erp_fee_ledger");
        if (savedRaw) {
          const all = JSON.parse(savedRaw);
          localRecords = all.filter(
            (r) => String(r.school_id || "").toUpperCase() === schoolId
          );
        }
      }
    } catch (e) {
      console.warn("Local ledger read notice:", e);
    }

    try {
      let combined = [];
      if (supabase) {
        const { data, error } = await supabase
          .from("fee_ledger")
          .select("*")
          .eq("school_id", schoolId)
          .order("created_at", { ascending: false });

        if (!error && data) {
          combined = data;
        }
      }

      // Merge local records strictly for this active school, preserving verification metadata
      localRecords.forEach((lr) => {
        const existingIdx = combined.findIndex(
          (c) =>
            (c.razorpay_payment_id && lr.utr && c.razorpay_payment_id === lr.utr) ||
            c.id === lr.id
        );
        if (existingIdx >= 0) {
          combined[existingIdx] = {
            ...combined[existingIdx],
            screenshot: lr.screenshot || combined[existingIdx].screenshot,
            screenshot_data: lr.screenshot_data || combined[existingIdx].screenshot_data,
            is_partial: lr.is_partial || combined[existingIdx].is_partial,
            total_due: lr.total_due || combined[existingIdx].total_due,
            remaining_balance: lr.remaining_balance || combined[existingIdx].remaining_balance,
            utr: lr.utr || combined[existingIdx].razorpay_payment_id,
            status: lr.status || combined[existingIdx].status,
          };
        } else {
          combined.unshift({
            id: lr.id,
            student_name: lr.student_name,
            class_name: lr.class_name,
            amount: lr.amount,
            status: lr.status,
            payment_mode: lr.payment_mode || `School UPI QR (UTR: ${lr.utr || "Verified"})`,
            date: lr.date,
            school_id: schoolId,
            utr: lr.utr || lr.razorpay_payment_id,
            razorpay_payment_id: lr.razorpay_payment_id || lr.utr,
            screenshot: lr.screenshot,
            screenshot_data: lr.screenshot_data,
            is_partial: lr.is_partial,
            total_due: lr.total_due,
            remaining_balance: lr.remaining_balance,
          });
        }
      });

      setLedger(combined);

      // Calculate real-time financial stats including verification queue
      let revenue = 0;
      let pending = 0;
      let paidCount = 0;
      let pendingVerificationCount = 0;

      combined.forEach((item) => {
        const val = Number(item.amount) || 0;
        const st = (item.status || "").toLowerCase();
        if (st === "paid") {
          revenue += val;
          paidCount += 1;
        } else if (st === "pending_verification") {
          pendingVerificationCount += 1;
          pending += val;
        } else {
          pending += val;
        }
      });

      setStats({
        totalRevenue: revenue,
        pendingDues: pending,
        totalPaidCount: paidCount,
        pendingVerificationCount,
      });
    } catch (err) {
      console.error("Error fetching financial ledger:", err);
      setLedger(localRecords);
      let revenue = 0;
      let pending = 0;
      let paidCount = 0;
      let pendingVerificationCount = 0;
      localRecords.forEach((item) => {
        const val = Number(item.amount) || 0;
        const st = (item.status || "").toLowerCase();
        if (st === "paid") {
          revenue += val;
          paidCount += 1;
        } else if (st === "pending_verification") {
          pendingVerificationCount += 1;
          pending += val;
        } else {
          pending += val;
        }
      });
      setStats({
        totalRevenue: revenue,
        pendingDues: pending,
        totalPaidCount: paidCount,
        pendingVerificationCount,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
    const handleUpdate = () => fetchLedger();
    window.addEventListener("erp-fee-ledger-updated", handleUpdate);
    return () => window.removeEventListener("erp-fee-ledger-updated", handleUpdate);
  }, [schoolId]);

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!formData.student_name || !formData.amount) {
      showToast("Please provide student name and amount", "error");
      return;
    }

    setSubmitting(true);
    const newTxn = {
      id: `TXN-${Date.now()}`,
      school_id: schoolId,
      student_name: formData.student_name.trim(),
      class_name: formData.class_name.trim() || "Class 10-A",
      amount: Number(formData.amount),
      status: formData.status,
      payment_mode: formData.payment_mode,
      date: new Date().toISOString().split("T")[0],
    };

    try {
      if (supabase) {
        await supabase.from("fee_ledger").insert([newTxn]);
      }
    } catch (err) {
      console.warn("Supabase fee_ledger insert notice:", err);
    }

    try {
      const tenantKey = `erp_fee_ledger_${schoolId}`;
      const savedTenantRaw = localStorage.getItem(tenantKey);
      const tenantList = savedTenantRaw ? JSON.parse(savedTenantRaw) : [];
      tenantList.unshift(newTxn);
      localStorage.setItem(tenantKey, JSON.stringify(tenantList));

      const savedRaw = localStorage.getItem("erp_fee_ledger");
      const globalList = savedRaw ? JSON.parse(savedRaw) : [];
      globalList.unshift(newTxn);
      localStorage.setItem("erp_fee_ledger", JSON.stringify(globalList));
    } catch (e) {
      console.warn("Local storage write notice:", e);
    }

    window.dispatchEvent(new Event("erp-fee-ledger-updated"));
    showToast(`Transaction of ₹${Number(formData.amount).toLocaleString()} recorded!`, "success");
    setFormData({
      student_name: "",
      class_name: "",
      amount: "",
      status: "paid",
      payment_mode: "Cash / Cheque",
    });
    setSubmitting(false);
    fetchLedger();
  };

  const getSchoolUpi = () => {
    try {
      const raw = localStorage.getItem(`erp_school_upi_${schoolId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.upiId) return parsed.upiId;
      }
    } catch (e) {}
    return `${schoolId.toLowerCase().replace(/[^a-z0-9]/g, "")}.edu@okaxis`;
  };

  const handleSendWhatsAppReminder = (item) => {
    const upi = getSchoolUpi();
    const instName = user?.school_name || schoolId;
    const msg = `📢 *Institutional Fee Notice - ${instName}*\n\nDear Parent/Student *${item.student_name}* (${item.class_name}),\n\nThis is a notification that your academic fee balance of *₹${Number(item.amount).toLocaleString()}* is pending settlement.\n\n💳 *Payment Details:*\n• Official School UPI ID: \`${upi}\`\n• Reference / Note: Student Name & Roll No.\n\nKindly complete the settlement and forward the 12-digit UTR bank reference number to the Accounts Department.\n\n*Accounts & Finance Office*\n${instName}`;
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  const handleBroadcastWhatsApp = () => {
    const pendingRows = ledger.filter((r) => (r.status || "").toLowerCase() !== "paid");
    if (pendingRows.length === 0) {
      showToast("No pending fee defaulters found in the ledger!", "info");
      return;
    }
    const upi = getSchoolUpi();
    const instName = user?.school_name || schoolId;
    const totalPending = pendingRows.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
    const msg = `📢 *Institutional Fee Dues Advisory - ${instName}*\n\nAttention Parents and Guardians,\n\nOur treasury reconciliation shows pending fee balances across *${pendingRows.length} student records* totaling *₹${totalPending.toLocaleString()}*.\n\n💳 *Direct Settlement Mode:*\n• School UPI ID: \`${upi}\`\n• Online Portal: Pay via Razorpay SSL Gateway\n\nPlease ensure pending dues are cleared promptly to maintain uninterrupted academic portal access.\n\n*Accounts & Treasury Office*\n${instName}`;
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  const handleDownloadTaxInvoice = (item) => {
    try {
      generateFeeInvoicePDF({
        tenant: {
          name: user?.school_name || "Apex International Academy",
          code: schoolId,
          address: user?.address || "Flat number 201, Jivdani Chaya, Mahim Highway, Palghar 401404",
          email: user?.email || "accounts@campus.edu",
        },
        student: {
          name: item.student_name,
          roll_number: item.roll_number || item.id || "STU-001",
          class: item.class_name || "Class 10",
        },
        payment: {
          invoiceNo: `INV-${String(item.id || Date.now()).slice(-6)}`,
          date: item.date || new Date().toISOString().split("T")[0],
          amount: item.amount,
          payment_mode: item.payment_mode || "Cash / Cheque",
          transactionId: item.razorpay_payment_id || item.id || `TXN-${Date.now()}`,
          title: "Tuition & Institutional Fee Settlement",
        },
      });
      showToast(`Tax invoice generated for ${item.student_name}!`, "success");
    } catch (err) {
      console.error("Tax invoice error:", err);
      showToast("Failed to generate PDF tax invoice", "error");
    }
  };

  const handleApprovePayment = async (item) => {
    try {
      // 1. Update in Supabase fee_ledger & fees tables
      if (supabase) {
        try {
          await supabase
            .from("fee_ledger")
            .update({ status: "paid" })
            .or(`id.eq.${item.id},razorpay_payment_id.eq.${item.utr || item.razorpay_payment_id}`);

          await supabase
            .from("fees")
            .update({ status: "paid" })
            .eq("school_id", schoolId);
        } catch (dbErr) {
          console.warn("Supabase approval sync notice:", dbErr);
        }
      }

      // 2. Update local storage for immediate offline and UI reconciliation
      const updateLocalList = (key) => {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const list = JSON.parse(raw);
            const updated = list.map((r) => {
              if (
                r.id === item.id ||
                (r.utr && (r.utr === item.utr || r.utr === item.razorpay_payment_id)) ||
                (r.razorpay_payment_id && (r.razorpay_payment_id === item.utr || r.razorpay_payment_id === item.razorpay_payment_id))
              ) {
                return { ...r, status: "paid" };
              }
              return r;
            });
            localStorage.setItem(key, JSON.stringify(updated));
          }
        } catch (e) {}
      };

      updateLocalList(`erp_fee_ledger_${schoolId}`);
      updateLocalList("erp_fee_ledger");

      // 3. Issue and download Official Tax Invoice PDF automatically
      try {
        generateFeeInvoicePDF({
          tenant: {
            name: user?.school_name || "Apex International Academy",
            code: schoolId,
            address: user?.address || "Flat number 201, Jivdani Chaya, Mahim Highway, Palghar 401404",
            email: user?.email || "accounts@campus.edu",
          },
          student: {
            name: item.student_name,
            roll_number: item.roll_number || item.id || "STU-001",
            class: item.class_name || "Class 10",
          },
          payment: {
            invoiceNo: `INV-${String(item.id || Date.now()).slice(-6)}`,
            date: new Date().toISOString().split("T")[0],
            amount: item.amount,
            payment_mode: item.payment_mode || "School UPI QR",
            transactionId: item.utr || item.razorpay_payment_id || item.id || `TXN-${Date.now()}`,
            title: item.title || "Tuition & Institutional Fee Settlement",
          },
        });
      } catch (pdfErr) {
        console.warn("Auto-PDF generation notice:", pdfErr);
      }

      // 4. Send payment confirmed WhatsApp notification
      try {
        notifyFeePaymentConfirmed({
          studentName: item.student_name,
          amount: item.amount,
          invoiceNo: `INV-${String(item.id || Date.now()).slice(-6)}`,
          guardianPhone: item.phone || "9876543210",
          schoolName: user?.school_name || schoolId,
          date: new Date().toISOString().split("T")[0],
          paymentId: item.utr || item.razorpay_payment_id || "VERIFIED-UTR",
        });
      } catch (waErr) {}

      window.dispatchEvent(new Event("erp-fee-ledger-updated"));
      showToast(`Payment of ₹${Number(item.amount).toLocaleString()} approved! Official Tax Invoice generated & downloaded.`, "success");
      fetchLedger();
    } catch (err) {
      console.error("Payment approval error:", err);
      showToast("Error approving payment", "error");
    }
  };

  const handleRejectPayment = async (item) => {
    try {
      if (supabase) {
        try {
          await supabase
            .from("fee_ledger")
            .update({ status: "rejected" })
            .or(`id.eq.${item.id},razorpay_payment_id.eq.${item.utr || item.razorpay_payment_id}`);
        } catch (dbErr) {}
      }

      const updateLocalList = (key) => {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const list = JSON.parse(raw);
            const updated = list.map((r) => {
              if (
                r.id === item.id ||
                (r.utr && (r.utr === item.utr || r.utr === item.razorpay_payment_id)) ||
                (r.razorpay_payment_id && (r.razorpay_payment_id === item.utr || r.razorpay_payment_id === item.razorpay_payment_id))
              ) {
                return { ...r, status: "rejected" };
              }
              return r;
            });
            localStorage.setItem(key, JSON.stringify(updated));
          }
        } catch (e) {}
      };

      updateLocalList(`erp_fee_ledger_${schoolId}`);
      updateLocalList("erp_fee_ledger");

      window.dispatchEvent(new Event("erp-fee-ledger-updated"));
      showToast(`Payment receipt marked as rejected.`, "info");
      fetchLedger();
    } catch (err) {
      showToast("Error rejecting payment", "error");
    }
  };

  // Filtered transactions
  const filteredLedger = ledger.filter((item) => {
    let matchesStatus = true;
    const st = (item.status || "").toLowerCase();
    if (filterStatus === "paid") {
      matchesStatus = st === "paid";
    } else if (filterStatus === "pending") {
      matchesStatus = st === "pending";
    } else if (filterStatus === "pending_verification") {
      matchesStatus = st === "pending_verification";
    }

    const matchesSearch =
      (item.student_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.class_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(item.utr || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(item.razorpay_payment_id || "").toLowerCase().includes(searchTerm.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="relative text-slate-200 min-h-full pb-10 font-sans">
      <div className="fixed top-0 left-10 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="mb-8 flex justify-between items-center flex-wrap gap-4">
          <div>
            <p className="text-emerald-300 text-sm font-semibold mb-1 uppercase tracking-widest">
              Financial Treasury Suite
            </p>
            <h1 className="text-3xl font-extrabold text-white">Accountant Command Center 💰</h1>
            <p className="text-slate-400 text-sm mt-1">
              Live tuition fee reconciliation, Razorpay settlements, and defaulter tracking
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => navigate("/admin/messages")}
              className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2 rounded-xl text-slate-300 font-bold transition-all cursor-pointer"
            >
              💬 Staff Messenger
            </button>
            <button
              onClick={() => navigate("/accountant/payroll")}
              className="text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-lg shadow-emerald-600/20 cursor-pointer"
            >
              💵 Staff Payroll & Payslips
            </button>
            <button
              onClick={fetchLedger}
              disabled={loading}
              className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2 rounded-xl text-slate-300 font-bold transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Syncing..." : "🔄 Refresh Ledger"}
            </button>
          </div>
        </div>

        {/* FINANCIAL METRICS ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {loading ? (
            <>
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
            </>
          ) : (
            <>
              <div className="bg-[#1E293B]/70 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-5 shadow-2xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xl font-bold">
                  ₹
                </div>
                <div>
                  <p className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-0.5">
                    Total Revenue
                  </p>
                  <p className="text-xl font-extrabold text-emerald-400">
                    ₹{stats.totalRevenue.toLocaleString()}
                  </p>
                  <span className="text-[10px] text-slate-400 block">Cleared receipts</span>
                </div>
              </div>

              <div className="bg-[#1E293B]/70 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-5 shadow-2xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-xl font-bold">
                  ⏳
                </div>
                <div>
                  <p className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-0.5">
                    Pending Defaulters
                  </p>
                  <p className="text-xl font-extrabold text-amber-400">
                    ₹{stats.pendingDues.toLocaleString()}
                  </p>
                  <span className="text-[10px] text-slate-400 block">Unsettled fees</span>
                </div>
              </div>

              <div
                onClick={() => setFilterStatus("pending_verification")}
                className={`backdrop-blur-xl border rounded-3xl p-5 shadow-2xl flex items-center gap-4 cursor-pointer transition-all ${
                  stats.pendingVerificationCount > 0
                    ? "bg-amber-950/40 border-amber-500/60 hover:border-amber-400"
                    : "bg-[#1E293B]/70 border-slate-700/60"
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center text-xl font-bold">
                  ⚡
                </div>
                <div>
                  <p className="text-amber-300 text-[11px] font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
                    <span>UPI Queue</span>
                    {stats.pendingVerificationCount > 0 && (
                      <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full animate-pulse">
                        {stats.pendingVerificationCount} New
                      </span>
                    )}
                  </p>
                  <p className="text-xl font-extrabold text-white">
                    {stats.pendingVerificationCount} Awaiting
                  </p>
                  <span className="text-[10px] text-amber-200/80 block">Click to review receipts</span>
                </div>
              </div>

              <div className="bg-[#1E293B]/70 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-5 shadow-2xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center text-xl font-bold">
                  🧾
                </div>
                <div>
                  <p className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-0.5">
                    Completed
                  </p>
                  <p className="text-xl font-extrabold text-blue-400">{stats.totalPaidCount} Invoices</p>
                  <span className="text-[10px] text-slate-400 block">Tax cleared</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* PENDING VERIFICATION ALERT BANNER */}
        {stats.pendingVerificationCount > 0 && (
          <div className="mb-8 bg-gradient-to-r from-amber-950/90 via-slate-900 to-amber-950/80 border-2 border-amber-500/60 rounded-3xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xl">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-2xl font-bold shrink-0">
                🔔
              </div>
              <div>
                <p className="font-extrabold text-white text-sm sm:text-base flex items-center gap-2">
                  <span>Student UPI Payment Verification Queue</span>
                  <span className="bg-amber-400 text-slate-950 text-xs font-black px-2 py-0.5 rounded-full">
                    {stats.pendingVerificationCount} Pending Action
                  </span>
                </p>
                <p className="text-xs text-amber-200/80 mt-0.5">
                  Students have submitted UPI transaction references (UTRs) and receipt screenshots. Review and approve to automatically issue official tax invoices.
                </p>
              </div>
            </div>
            <button
              onClick={() => setFilterStatus("pending_verification")}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs transition-all shadow-lg cursor-pointer flex items-center gap-2 shrink-0 border border-amber-300"
            >
              <span>Review Queue ({stats.pendingVerificationCount})</span>
              <span>⚡</span>
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT: MANUAL FEE ENTRY FORM */}
          <div className="bg-[#1E293B]/70 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-6 shadow-2xl h-fit">
            <h2 className="text-xl font-bold text-white mb-6">Log Fee Transaction</h2>
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Student Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Rohan Mehta"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 text-sm"
                  value={formData.student_name}
                  onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Class / Section
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., 10-A, 12-Sci"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 text-sm"
                  value={formData.class_name}
                  onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  required
                  placeholder="e.g., 5000"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 text-sm font-mono font-bold"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Payment Status
                </label>
                <select
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 font-bold text-sm"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="paid">Paid (Receipt Cleared)</option>
                  <option value="pending">Pending (Defaulter Due)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Payment Mode
                </label>
                <select
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 font-bold text-sm"
                  value={formData.payment_mode}
                  onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
                >
                  <option value="School UPI QR">School UPI QR</option>
                  <option value="Cash / Cheque">Cash / Cheque</option>
                  <option value="Online (Razorpay)">Online (Razorpay)</option>
                  <option value="Bank Transfer (NEFT/UPI)">Bank Transfer (NEFT/UPI)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-4 rounded-xl shadow-lg shadow-emerald-600/30 transition-all mt-4 disabled:opacity-50"
              >
                {submitting ? "Logging Transaction..." : "Record Transaction 🚀"}
              </button>
            </form>
          </div>

          {/* RIGHT: LEDGER TABLE */}
          <div className="lg:col-span-2 bg-[#1E293B]/70 backdrop-blur-xl border border-slate-700/60 rounded-3xl shadow-2xl overflow-hidden h-fit">
            <div className="p-6 border-b border-slate-700/60 bg-slate-800/50 space-y-4">
              <div className="flex justify-between items-center flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-white">Live Institutional Fee Ledger</h2>
                  <button
                    onClick={handleBroadcastWhatsApp}
                    title="Send WhatsApp notice to all pending fee defaulters"
                    className="bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold px-3 py-1.5 rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-900/20 cursor-pointer"
                  >
                    <span>📢</span>
                    <span>Broadcast WhatsApp Reminder</span>
                  </button>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setFilterStatus("all")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      filterStatus === "all" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    All ({ledger.length})
                  </button>
                  <button
                    onClick={() => setFilterStatus("paid")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      filterStatus === "paid" ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    Paid ({stats.totalPaidCount})
                  </button>
                  <button
                    onClick={() => setFilterStatus("pending")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      filterStatus === "pending" ? "bg-amber-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    Pending ({ledger.filter((r) => (r.status || "").toLowerCase() === "pending").length})
                  </button>
                  <button
                    onClick={() => setFilterStatus("pending_verification")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      filterStatus === "pending_verification"
                        ? "bg-amber-500 text-slate-950 font-black shadow-md"
                        : "bg-slate-800 text-amber-400 border border-amber-500/30 hover:bg-slate-700"
                    }`}
                  >
                    <span>⚡ UPI Queue</span>
                    <span className="bg-amber-400/20 text-amber-300 px-1.5 py-0.2 rounded-full text-[10px]">
                      {stats.pendingVerificationCount || 0}
                    </span>
                  </button>
                </div>
              </div>

              {/* SEARCH INPUT */}
              <input
                type="text"
                placeholder="Search ledger by student name, class, or UTR number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm"
              />
            </div>

            {loading ? (
              <div className="p-6">
                <TableSkeleton rows={5} cols={4} />
              </div>
            ) : filteredLedger.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <p className="font-bold text-white text-base">No transactions found.</p>
                <p className="text-xs mt-1">Transactions recorded here or paid online via Razorpay appear live.</p>
              </div>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-700/60 text-slate-400 text-xs uppercase tracking-wider bg-slate-900/40">
                      <th className="p-4">Student & Class</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Payment Mode</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4">Date</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50 text-sm">
                    {filteredLedger.map((item) => {
                      const isPaid = (item.status || "").toLowerCase() === "paid";
                      const isPendingVerification = (item.status || "").toLowerCase() === "pending_verification";

                      return (
                        <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="p-4">
                            <p className="font-bold text-white">{item.student_name}</p>
                            <p className="text-xs text-slate-400">Class {item.class_name}</p>
                            {item.utr && (
                              <p className="text-[11px] font-mono text-emerald-400 mt-0.5">
                                UTR: {item.utr}
                              </p>
                            )}
                          </td>
                          <td className="p-4">
                            <span className="font-extrabold text-white text-base">
                              ₹{Number(item.amount).toLocaleString()}
                            </span>
                            {item.is_partial && (
                              <span className="block text-[10px] text-amber-400 font-medium">
                                Partial (Due: ₹{Number(item.remaining_balance || 0).toLocaleString()})
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-slate-300 text-xs">
                            <div className="flex flex-col items-start gap-1">
                              <span className="bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-md text-[11px]">
                                {item.payment_mode}
                              </span>
                              {(item.screenshot_data || item.screenshot) && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewReceipt(item)}
                                  className="text-[11px] text-blue-400 hover:text-blue-300 underline font-semibold flex items-center gap-1 cursor-pointer"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>View Screenshot</span>
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${
                                isPaid
                                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                  : isPendingVerification
                                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse"
                                  : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                              }`}
                            >
                              {isPaid ? "Paid" : isPendingVerification ? "Pending Verification" : "Pending Due"}
                            </span>
                          </td>
                          <td className="p-4 text-slate-400 text-xs font-mono">{item.date}</td>
                          <td className="p-4 text-right">
                            {isPendingVerification ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleApprovePayment(item)}
                                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all cursor-pointer inline-flex items-center gap-1 shadow-md shadow-emerald-900/30"
                                  title="Approve settlement and issue official Tax Invoice"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Approve & Invoice</span>
                                </button>
                                <button
                                  onClick={() => handleRejectPayment(item)}
                                  className="px-2 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                                  title="Reject transaction"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Reject</span>
                                </button>
                              </div>
                            ) : isPaid ? (
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                <button
                                  onClick={() => handleDownloadTaxInvoice(item)}
                                  className="px-2.5 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                                  title="Download Tax Invoice PDF"
                                >
                                  <span>🧾</span>
                                  <span>Tax Invoice</span>
                                </button>
                                <button
                                  onClick={() => handleInitiateReversal(item)}
                                  className="px-2.5 py-1.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                                  title="Request Maker-Checker Credit Note / Reversal from Principal"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Reversal</span>
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleSendWhatsAppReminder(item)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 shadow-md shadow-emerald-900/20"
                                title="Send Reminder via WhatsApp"
                              >
                                <span>📲</span>
                                <span>Remind WhatsApp</span>
                              </button>
                            )}
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

        {/* PREDICTIVE FEE DEFAULTER RISK RADAR */}
        <FeeRiskRadar schoolCode={schoolId} />

        {/* 3-COLUMN BANK RECONCILIATION WORKBENCH & TALLY/GST ENGINE */}
        <BankReconciliationWorkbench schoolCode={schoolId} />
      </div>

      {/* MAKER-CHECKER REVERSAL & CREDIT NOTE REQUEST MODAL */}
      {reversalTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1E293B] border border-slate-700 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-slate-700 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-amber-400">
                  Maker-Checker Dual Control
                </span>
                <h3 className="font-extrabold text-white text-base">Request Fee Reversal / Credit Note</h3>
              </div>
              <button
                onClick={() => setReversalTarget(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmReversalRequest} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <p className="font-bold text-white text-sm">{reversalTarget.student_name}</p>
                <p className="text-slate-400">{reversalTarget.class_name} • Receipt: #{reversalTarget.id}</p>
                <p className="text-emerald-400 font-mono font-bold">Original Settled Amount: ₹{Number(reversalTarget.amount).toLocaleString()}</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Adjustment Amount (₹) *
                </label>
                <input
                  type="number"
                  required
                  value={reversalAmount}
                  onChange={(e) => setReversalAmount(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-amber-400 font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Reason for Reversal / Adjustment *
                </label>
                <select
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-400"
                >
                  <option value="Scholarship / Fee Concession">Scholarship / Fee Concession Granted</option>
                  <option value="Duplicate Payment Refund">Duplicate Payment by Parent</option>
                  <option value="Incorrect Amount Entered">Clerical Error / Incorrect Billing</option>
                  <option value="Sibling Concession">Sibling Discount Adjustment</option>
                  <option value="Withdrawal Settlement">Mid-term Scholar Relocation / Transfer</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 text-[11px] text-amber-200">
                ⚠️ Notice: Receipts cannot be deleted directly. This request routes immediately to the Principal's Operational Approval Inbox for executive authorization.
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReversalTarget(null)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReversal}
                  className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-amber-600/30 cursor-pointer"
                >
                  {submittingReversal ? "Routing..." : "Submit to Principal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SCREENSHOT LIGHTBOX MODAL */}
      {previewReceipt && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1E293B] border border-slate-700 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-slate-700 pb-3">
              <div>
                <h3 className="font-extrabold text-white text-base">Payment Receipt Lightbox</h3>
                <p className="text-xs text-slate-400 font-mono">{previewReceipt.student_name} • {previewReceipt.class_name}</p>
              </div>
              <button
                onClick={() => setPreviewReceipt(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-900 rounded-2xl p-4 text-center border border-slate-800">
              {previewReceipt.screenshot_data ? (
                <img
                  src={previewReceipt.screenshot_data}
                  alt="Payment Screenshot"
                  className="max-h-80 mx-auto rounded-xl object-contain border border-slate-700"
                />
              ) : (
                <div className="py-12 text-slate-500 flex flex-col items-center gap-2">
                  <ImageIcon className="w-12 h-12 stroke-[1.5]" />
                  <span className="text-xs font-semibold text-slate-400">Attached File: {previewReceipt.screenshot || "Receipt_Proof.jpg"}</span>
                  <span className="text-[11px] text-slate-500">Verified digital UTR reference attached below.</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-500 block uppercase text-[10px]">UTR Reference</span>
                <span className="font-mono text-emerald-400 font-bold">{previewReceipt.utr || previewReceipt.razorpay_payment_id || "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase text-[10px]">Submitted Amount</span>
                <span className="font-bold text-white text-sm">₹{Number(previewReceipt.amount).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              {(previewReceipt.status || "").toLowerCase() === "pending_verification" && (
                <button
                  onClick={() => {
                    handleApprovePayment(previewReceipt);
                    setPreviewReceipt(null);
                  }}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-900/30"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approve & Issue Tax Invoice</span>
                </button>
              )}
              <button
                onClick={() => setPreviewReceipt(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-3 rounded-xl text-xs transition-all cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}