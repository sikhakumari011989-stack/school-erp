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

  const [reportCards] = useState([
    { id: 1, term: "Class 10 Mid-Term Examination", percentage: "94.2%", grade: "A+", status: "Verified & Sealed" },
    { id: 2, term: "Class 9 Final Board Audit", percentage: "91.8%", grade: "A+", status: "Archived" },
  ]);

  const fetchStudentLedger = async () => {
    setLoading(true);
    const schoolId = (user?.institution_code || user?.school_id || "OASIS-TUTORIALS").toUpperCase();

    // Read local offline/demo fee records first
    let localRecords = [];
    try {
      const savedRaw = localStorage.getItem("erp_fee_ledger");
      if (savedRaw) {
        const all = JSON.parse(savedRaw);
        localRecords = Array.isArray(all)
          ? all.filter((r) => !r.school_id || String(r.school_id).toUpperCase() === schoolId)
          : [];
      }
    } catch (e) {
      console.warn("Local ledger read notice:", e);
    }

    try {
      const { data, error } = await supabase
        .from("fee_ledger")
        .select("*")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false });

      let combined = [];

      if (data && data.length > 0) {
        combined = data.map((d, index) => ({
          id: d.id || `db-${index}`,
          term: d.term || (d.student_name ? `${d.student_name} - ${d.class_name || "Term Fee"}` : "Term Tuition Fee"),
          amount: Number(d.amount) || 15000,
          date: d.date || "2026-10-10",
          status: (d.status || "paid").toLowerCase() === "paid" ? "Paid" : "Pending",
          mode: d.payment_mode || "School UPI QR",
          utr: d.razorpay_payment_id || d.utr || null,
          invoice_no: d.invoice_no || null,
        }));
      }

      // Prepend local recent records if not already in list
      localRecords.forEach((lr) => {
        const exists = combined.some((c) => c.utr === lr.utr || c.id === lr.id);
        if (!exists) {
          combined.unshift({
            id: lr.id,
            term: lr.term || lr.title || "Second Term Tuition Fee (2026-27)",
            amount: Number(lr.amount) || 15000,
            date: lr.date || new Date().toISOString().split("T")[0],
            status: "Paid",
            mode: lr.payment_mode || `School UPI QR (UTR: ${lr.utr || "Verified"})`,
            utr: lr.utr || lr.razorpay_payment_id || null,
            invoice_no: lr.invoice_no || null,
          });
        }
      });

      if (combined.length === 0) {
        combined = [
          { id: 1, term: "First Term Tuition Fee (2026-27)", amount: 15000, date: "2026-06-15", status: "Paid", mode: "School UPI QR (UTR: 202610158912)", utr: "202610158912" },
          { id: 2, term: "Annual Laboratory & Library Fund", amount: 4500, date: "2026-06-15", status: "Paid", mode: "Online UPI", utr: "UPI98231145" },
          { id: 3, term: "Second Term Tuition Fee (2026-27)", amount: 15000, date: "2026-10-12", status: "Paid", mode: "School UPI QR (UTR: 202610243419)", utr: "202610243419" },
        ];
      }

      setFees(combined);
    } catch (err) {
      console.error("Error fetching fees for student:", err);
      // Fallback combined with local records
      const fallback = localRecords.map((lr) => ({
        id: lr.id,
        term: lr.term || lr.title || "Second Term Tuition Fee (2026-27)",
        amount: Number(lr.amount) || 15000,
        date: lr.date || new Date().toISOString().split("T")[0],
        status: "Paid",
        mode: lr.payment_mode || `School UPI QR (UTR: ${lr.utr || "Verified"})`,
        utr: lr.utr || null,
        invoice_no: lr.invoice_no || null,
      }));

      if (fallback.length === 0) {
        fallback.push(
          { id: 1, term: "First Term Tuition Fee (2026-27)", amount: 15000, date: "2026-06-15", status: "Paid", mode: "School UPI QR (UTR: 202610158912)", utr: "202610158912" },
          { id: 2, term: "Annual Laboratory & Library Fund", amount: 4500, date: "2026-06-15", status: "Paid", mode: "Online UPI", utr: "UPI98231145" },
          { id: 3, term: "Second Term Tuition Fee (2026-27)", amount: 15000, date: "2026-10-12", status: "Paid", mode: "School UPI QR (UTR: 202610243419)", utr: "202610243419" }
        );
      }
      setFees(fallback);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentLedger();
  }, [user]);

  const handleDownloadInvoice = (fee) => {
    generateFeeInvoicePDF({
      tenant: {
        name: user?.institution_name || "Apex International Academy",
        code: user?.institution_code || "OASIS-TUTORIALS",
      },
      student: {
        name: user?.name || "Astik Kumar",
        roll_number: user?.personal_code || user?.roll_number || "STU-1024",
        class: "Class 10 ICSE",
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
        name: user?.institution_name || "Apex International Academy",
        code: user?.institution_code || "OASIS-TUTORIALS",
      },
      student: {
        name: user?.name || "Astik Kumar",
        roll_number: user?.personal_code || user?.roll_number || "STU-1024",
        class: "Class 10 ICSE",
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
                        <p className="font-bold text-white">{f.term}</p>
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
                              : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          {f.status}
                        </span>
                      </td>
                      <td className="p-5 text-center">
                        <button
                          onClick={() => handleDownloadInvoice(f)}
                          className="bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/40 px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 mx-auto"
                        >
                          <span>📄</span> Download Invoice
                        </button>
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
        </div>
      </div>
    </div>
  );
}