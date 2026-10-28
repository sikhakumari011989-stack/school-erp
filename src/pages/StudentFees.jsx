import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { supabase } from "../supabaseClient";
import { TableSkeleton } from "../Components/Skeleton";
import { generateFeeInvoicePDF, generateReportCardPDF } from "../utils/pdfGenerator";

export default function StudentFees() {
  const { user } = useContext(AppContext);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);

  const [reportCards, setReportCards] = useState([]);

  const fetchStudentLedger = async () => {
    setLoading(true);
    const schoolId = (user?.institution_code || user?.school_id || "CAMPUS-01").toUpperCase();

    // Strict Data Isolation: Current Authenticated Student Identity Matcher
    const currentRoll = String(user?.personal_code || user?.roll_number || user?.id || "").trim().toUpperCase();
    const currentEmail = String(user?.email || "").trim().toLowerCase();
    const currentName = String(user?.name || user?.full_name || "").trim().toLowerCase();

    const matchStudent = (rec) => {
      if (!rec) return false;
      const rRoll = String(rec.roll_number || rec.student_id || rec.personal_code || rec.role_code || "").trim().toUpperCase();
      const rEmail = String(rec.student_email || rec.email || "").trim().toLowerCase();
      const rName = String(rec.student_name || rec.name || "").trim().toLowerCase();

      // Strict match to currently authenticated student only
      if (currentRoll && rRoll && currentRoll === rRoll) return true;
      if (currentEmail && rEmail && currentEmail === rEmail) return true;
      if (currentName && rName && currentName === rName) return true;
      return false;
    };

    // Read local offline/demo fee records first (strictly scoped)
    let localRecords = [];
    try {
      const tenantKey = `erp_fee_ledger_${schoolId}`;
      const savedTenant = localStorage.getItem(tenantKey);
      if (savedTenant) {
        const parsed = JSON.parse(savedTenant);
        if (Array.isArray(parsed)) {
          localRecords = parsed.filter(matchStudent);
        }
      } else {
        const savedRaw = localStorage.getItem("erp_fee_ledger");
        if (savedRaw) {
          const all = JSON.parse(savedRaw);
          localRecords = Array.isArray(all)
            ? all.filter((r) => String(r.school_id || "").toUpperCase() === schoolId).filter(matchStudent)
            : [];
        }
      }

      // Also read approved enrollment counter receipts from erp_fees_${schoolId}
      const feesKey = `erp_fees_${schoolId}`;
      const savedFees = localStorage.getItem(feesKey);
      if (savedFees) {
        const parsedFees = JSON.parse(savedFees);
        if (Array.isArray(parsedFees)) {
          const myFees = parsedFees.filter(matchStudent);
          myFees.forEach((f) => {
            if (!localRecords.some((lr) => lr.id === f.id || (lr.invoice_no && lr.invoice_no === f.invoice_no))) {
              localRecords.push(f);
            }
          });
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

        if (!error && data && data.length > 0) {
          const myCloudRecords = data.filter(matchStudent);
          combined = myCloudRecords.map((d, index) => {
            const rawStatus = (d.status || "paid").toLowerCase();
            const displayStatus = rawStatus === "paid" ? "Paid" : rawStatus === "pending_verification" ? "Pending Verification" : "Pending";
            return {
              id: d.id || `db-${index}`,
              term: d.term || (d.student_name ? `${d.student_name} - ${d.class_name || "Term Fee"}` : "Term Tuition Fee"),
              amount: Number(d.amount) || 0,
              date: d.date || new Date().toISOString().split("T")[0],
              status: displayStatus,
              mode: d.payment_mode || "School UPI QR",
              utr: d.razorpay_payment_id || d.utr || null,
              invoice_no: d.invoice_no || null,
              is_partial: Boolean(d.is_partial || d.payment_mode?.includes("PARTIAL") || d.term?.includes("PARTIAL")),
              receipt_tag: d.receipt_tag || (d.payment_mode?.includes("PARTIAL") || d.term?.includes("PARTIAL") ? "PARTIAL" : "FULL"),
            };
          });
        }
      }

      // Prepend local recent records if not already in list
      localRecords.forEach((lr) => {
        const exists = combined.some((c) => (c.utr && c.utr === lr.utr) || c.id === lr.id || (c.invoice_no && c.invoice_no === lr.invoice_no));
        const rawStatus = (lr.status || "paid").toLowerCase();
        const displayStatus = rawStatus === "paid" ? "Paid" : rawStatus === "pending_verification" ? "Pending Verification" : "Pending";

        if (!exists) {
          combined.unshift({
            id: lr.id,
            term: lr.term || lr.title || "Tuition Fee Settlement",
            amount: Number(lr.amount) || 0,
            date: lr.date || new Date().toISOString().split("T")[0],
            status: displayStatus,
            mode: lr.payment_mode || `School UPI QR (UTR: ${lr.utr || "Verified"})`,
            utr: lr.utr || lr.razorpay_payment_id || null,
            invoice_no: lr.invoice_no || null,
            is_partial: Boolean(lr.is_partial || lr.receipt_tag === "PARTIAL" || lr.payment_mode?.includes("PARTIAL") || lr.term?.includes("PARTIAL")),
            receipt_tag: lr.receipt_tag || (lr.payment_mode?.includes("PARTIAL") || lr.term?.includes("PARTIAL") ? "PARTIAL" : "FULL"),
          });
        }
      });

      setFees(combined);

      // Fetch published report cards from Teacher exam marks (strictly isolated)
      try {
        const rawMarks = localStorage.getItem(`erp_exam_marks_${schoolId}`);
        if (rawMarks) {
          const allMarks = JSON.parse(rawMarks);
          if (Array.isArray(allMarks) && allMarks.length > 0) {
            const matched = allMarks.filter(
              (m) =>
                (currentRoll && m.roll_number && String(m.roll_number).toUpperCase() === currentRoll) ||
                (currentName && m.student_name && String(m.student_name).toLowerCase() === currentName)
            );
            if (matched.length > 0) {
              setReportCards(
                matched.map((m) => {
                  const mMarks = Number(m.maths) || 0;
                  const sMarks = Number(m.science) || 0;
                  const eMarks = Number(m.english) || 0;
                  const total = mMarks + sMarks + eMarks;
                  const pct = Math.round((total / 300) * 100);
                  const grade = pct >= 90 ? "A+" : pct >= 80 ? "A" : pct >= 70 ? "B+" : pct >= 60 ? "B" : pct >= 50 ? "C" : "D";
                  return {
                    id: m.id,
                    term: m.term || "Term II Final Examination (2026-27)",
                    percentage: `${pct}%`,
                    grade: grade,
                    status: "Authenticated & Sealed",
                  };
                })
              );
            }
          }
        }
      } catch (rcErr) {
        console.warn("Report cards read error:", rcErr);
      }
    } catch (err) {
      console.error("Error fetching fees for student:", err);
      const fallback = localRecords.filter(matchStudent).map((lr) => {
        const rawStatus = (lr.status || "paid").toLowerCase();
        return {
          id: lr.id,
          term: lr.term || lr.title || "Tuition Fee Settlement",
          amount: Number(lr.amount) || 0,
          date: lr.date || new Date().toISOString().split("T")[0],
          status: rawStatus === "paid" ? "Paid" : rawStatus === "pending_verification" ? "Pending Verification" : "Pending",
          mode: lr.payment_mode || `School UPI QR (UTR: ${lr.utr || "Verified"})`,
          utr: lr.utr || null,
          invoice_no: lr.invoice_no || null,
        };
      });
      setFees(fallback);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentLedger();
    const handleUpdate = () => fetchStudentLedger();
    window.addEventListener("erp-fee-ledger-updated", handleUpdate);
    return () => window.removeEventListener("erp-fee-ledger-updated", handleUpdate);
  }, [user]);

  const handleDownloadInvoice = (fee) => {
    generateFeeInvoicePDF({
      tenant: {
        name: user?.institution_name || "Institutional Campus",
        code: user?.institution_code || user?.school_id || "CAMPUS-01",
      },
      student: {
        name: user?.name || user?.full_name || "Enrolled Student",
        roll_number: user?.personal_code || user?.roll_number || "STU-101",
        class: user?.class_name || "Class 10 ICSE",
      },
      payment: {
        title: fee.term,
        amount: fee.amount,
        date: fee.date,
        payment_mode: fee.mode || "School UPI QR",
        utr: fee.utr || null,
        transactionId: fee.utr || null,
        invoiceNo: fee.invoice_no || null,
      },
    });
    showToast("Official Fee Tax Invoice PDF generated & downloaded!", "success");
  };

  const handleDownloadReportCard = (rc) => {
    generateReportCardPDF({
      tenant: {
        name: user?.institution_name || "Institutional Campus",
        code: user?.institution_code || user?.school_id || "CAMPUS-01",
      },
      student: {
        name: user?.name || user?.full_name || "Enrolled Student",
        roll_number: user?.personal_code || user?.roll_number || "STU-101",
        class: user?.class_name || "Class 10 ICSE",
      },
      academicTerm: rc.term,
    });
    showToast("Official Academic Transcript PDF generated & downloaded!", "success");
  };

  return (
    <div className="relative text-slate-200 min-h-full pb-10 font-sans">
      <div className="fixed top-0 left-10 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-5xl mx-auto">
        {/* HEADER */}
        <div className="mb-8 flex justify-between items-center flex-wrap gap-4">
          <div>
            <p className="text-emerald-300 text-sm font-semibold mb-1 uppercase tracking-widest">
              Financial & Academic Documents
            </p>
            <h1 className="text-3xl font-extrabold text-white">Student Fee Vault & Transcripts 📜</h1>
            <p className="text-slate-400 text-sm mt-1">
              Verified fee clearance certificates, tax invoices, and authenticated report cards
            </p>
          </div>
          <button
            onClick={() => navigate("/student/pay")}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-6 py-3 rounded-2xl text-sm shadow-xl shadow-emerald-600/30 transition-all flex items-center gap-2"
          >
            <span>💳</span> Settle New Fee (Razorpay)
          </button>
        </div>

        {/* FEE LEDGER */}
        <div className="bg-[#1E293B]/70 backdrop-blur-xl border border-slate-700/60 rounded-3xl shadow-2xl overflow-hidden mb-10">
          <div className="p-6 border-b border-slate-700/60 bg-slate-800/50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-white">Live Fee Payment History</h2>
            <button
              onClick={fetchStudentLedger}
              className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-600 px-3 py-1.5 rounded-lg text-slate-300 font-bold transition-all"
            >
              🔄 Refresh
            </button>
          </div>

          {loading ? (
            <div className="p-6">
              <TableSkeleton rows={3} cols={5} />
            </div>
          ) : fees.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <p className="font-bold text-white text-base">No fee payment history found.</p>
              <p className="text-xs mt-1">Receipts for fees settled via UPI QR or Razorpay will appear here with downloadable official tax invoices.</p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-700/60 text-slate-400 text-xs uppercase tracking-wider bg-slate-900/40">
                    <th className="p-5">Fee Description / Component</th>
                    <th className="p-5">Amount</th>
                    <th className="p-5">Settlement Date</th>
                    <th className="p-5 text-center">Status</th>
                    <th className="p-5 text-center">Tax Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50 text-sm">
                  {fees.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-white">{f.term}</p>
                          {(f.is_partial || f.receipt_tag === "PARTIAL" || String(f.term || "").includes("PARTIAL") || String(f.mode || "").includes("PARTIAL")) && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-wider">
                              PARTIAL
                            </span>
                          )}
                        </div>
                        {f.mode && <p className="text-xs text-slate-400 mt-0.5">{f.mode}</p>}
                      </td>
                      <td className="p-5 font-extrabold text-emerald-400">
                        ₹{f.amount.toLocaleString()}
                      </td>
                      <td className="p-5 text-slate-400 text-xs font-mono">{f.date}</td>
                      <td className="p-5 text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${
                            f.status === "Paid"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : f.status === "Pending Verification"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse"
                              : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          }`}
                        >
                          {f.status}
                        </span>
                      </td>
                      <td className="p-5 text-center">
                        {f.status === "Paid" ? (
                          <button
                            onClick={() => handleDownloadInvoice(f)}
                            className="bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/40 px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 mx-auto cursor-pointer"
                          >
                            <span>📄</span> Download Invoice
                          </button>
                        ) : f.status === "Pending Verification" ? (
                          <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-xl inline-flex items-center gap-1">
                            <span>⏳</span> In Accountant Queue
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500 font-medium">Unpaid</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* REPORT CARD VAULT */}
        <div className="bg-[#1E293B]/70 backdrop-blur-xl border border-slate-700/60 rounded-3xl shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-700/60 bg-slate-800/50">
            <h2 className="text-lg font-bold text-white">Academic Performance & Grade Vault</h2>
          </div>
          {reportCards.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <p className="font-bold text-white text-base">No examination transcripts published yet.</p>
              <p className="text-xs mt-1">Faculty and HOD signed term report cards will be archived here once evaluations are completed.</p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-700/60 text-slate-400 text-xs uppercase tracking-wider bg-slate-900/40">
                    <th className="p-5">Examination Term</th>
                    <th className="p-5">Percentage</th>
                    <th className="p-5">Grade</th>
                    <th className="p-5 text-center">Document Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50 text-sm">
                  {reportCards.map((rc) => (
                    <tr key={rc.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-5">
                        <p className="font-bold text-white">{rc.term}</p>
                        <p className="text-xs text-blue-400">{rc.status}</p>
                      </td>
                      <td className="p-5 font-extrabold text-blue-400">{rc.percentage}</td>
                      <td className="p-5 font-mono font-bold text-emerald-400">{rc.grade}</td>
                      <td className="p-5 text-center">
                        <button
                          onClick={() => handleDownloadReportCard(rc)}
                          className="bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/40 hover:text-white font-bold px-4 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5 mx-auto"
                        >
                          <span>📥</span> Download PDF Transcript
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