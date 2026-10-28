import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { supabase } from "../supabaseClient";
import { generateOfficialCertificatePDF } from "../utils/pdfGenerator";

export const getDefaultCertificateRequests = () => [];

export default function CertificateGenerator() {
  const { user, tenant } = useContext(AppContext) || {};
  const { showToast } = useToast();

  const [certType, setCertType] = useState("Bonafide Certificate");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState([]);

  const activeSchoolId = user?.institution_code || user?.school_id || tenant?.code || "";
  const studentName = user?.name || user?.full_name || "Enrolled Student";
  const rollNumber = user?.personal_code || user?.role_code || user?.roll_number || "";
  const className = user?.class_name || "General Batch";

  // Load certificate requests for this school & student
  const loadRequests = () => {
    if (!activeSchoolId) return;
    try {
      const storageKey = `erp_certificate_requests_${activeSchoolId}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setRequests(JSON.parse(saved));
      } else {
        setRequests([]);
      }
    } catch (err) {
      console.warn("Failed to load certificate requests:", err);
      setRequests([]);
    }
  };

  useEffect(() => {
    loadRequests();

    const handleUpdate = () => loadRequests();
    window.addEventListener("erp-certificates-updated", handleUpdate);
    window.addEventListener("erp-certificate-updated", handleUpdate);
    return () => {
      window.removeEventListener("erp-certificates-updated", handleUpdate);
      window.removeEventListener("erp-certificate-updated", handleUpdate);
    };
  }, [activeSchoolId]);

  const handleRequest = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      showToast("Please provide the purpose for this certificate request.", "error");
      return;
    }

    setLoading(true);

    const newCert = {
      id: "CERT-" + Date.now().toString().slice(-6),
      student_name: studentName,
      roll_number: rollNumber,
      class_name: className,
      certificate_type: certType,
      reason: reason.trim(),
      status: "PENDING",
      request_date: new Date().toISOString().split("T")[0],
      school_id: activeSchoolId,
    };

    try {
      // 1. Supabase insert attempt
      if (supabase) {
        try {
          await supabase.from("certificate_requests").insert([newCert]);
        } catch (sErr) {
          console.warn("Supabase certificate insert notice:", sErr);
        }
      }

      // 2. Persist to localStorage
      const storageKey = `erp_certificate_requests_${activeSchoolId}`;
      const existing = JSON.parse(localStorage.getItem(storageKey) || "[]");
      const updated = [newCert, ...existing];
      localStorage.setItem(storageKey, JSON.stringify(updated));
      localStorage.setItem("erp_certificate_requests", JSON.stringify(updated));

      // 3. Dispatch global sync event
      window.dispatchEvent(new Event("erp-certificates-updated"));
      window.dispatchEvent(new Event("erp-certificate-updated"));

      setRequests(updated);
      setReason("");
      showToast(`Request for "${certType}" submitted to Principal's office!`, "success");
    } catch (err) {
      console.error("Certificate submission error:", err);
      showToast("Request submitted locally.", "info");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = (req) => {
    try {
      generateOfficialCertificatePDF({
        tenant: {
          name: tenant?.name || user?.institution_name || user?.school_name || "Institutional Campus",
          code: activeSchoolId,
          address: tenant?.address || "Flat number 201, Jivdani Chaya, near Rajshree Hospital, beside Kalavati Mandir, Mahim Manohar Highway, Palghar 401404",
        },
        student: {
          name: req.student_name || studentName,
          roll_number: req.roll_number || rollNumber,
          class_name: req.class_name || className,
        },
        certificate: {
          id: req.id,
          certificate_type: req.certificate_type,
          reason: req.reason,
          request_date: req.request_date,
          issue_date: req.request_date || new Date().toISOString().split("T")[0],
        },
      });
      showToast(`Official ${req.certificate_type} PDF downloaded successfully!`, "success");
    } catch (err) {
      console.error("PDF generation failed:", err);
      showToast("Failed to generate PDF certificate.", "error");
    }
  };

  // Filter requests for the current student
  const studentRequests = requests.filter(
    (r) =>
      r.roll_number === rollNumber ||
      r.student_name?.toLowerCase() === studentName.toLowerCase() ||
      !r.roll_number
  );

  return (
    <div className="relative text-slate-200 min-h-full pb-10 font-sans">
      <div className="fixed top-0 left-10 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-4xl mx-auto space-y-8">
        {/* HEADER */}
        <div className="text-center">
          <p className="text-blue-300 text-sm font-semibold mb-1 uppercase tracking-widest">
            Institutional Documents Vault
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
            Official Certificate Requests 📜
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-lg mx-auto">
            Apply for Bonafide, Transfer, Character certificates, or Fee Clearance with instant digital signatures upon approval.
          </p>
        </div>

        {/* APPLICATION FORM CARD */}
        <div className="bg-[#1E293B]/80 backdrop-blur-xl border border-slate-700/70 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-700/60">
            <span className="text-2xl p-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl">
              ✍️
            </span>
            <div>
              <h2 className="text-lg font-bold text-white">Submit New Document Request</h2>
              <p className="text-xs text-slate-400">
                Applying as: <span className="text-blue-300 font-semibold">{studentName}</span> ({rollNumber} | {className})
              </p>
            </div>
          </div>

          <form onSubmit={handleRequest} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Document Type
                </label>
                <select
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-medium focus:outline-none focus:border-blue-500 transition-colors"
                  value={certType}
                  onChange={(e) => setCertType(e.target.value)}
                >
                  <option value="Bonafide Certificate">Bonafide Certificate</option>
                  <option value="Transfer Certificate (TC)">Transfer Certificate (TC)</option>
                  <option value="Character Certificate">Character Certificate</option>
                  <option value="Fee Clearance Letter">Fee Clearance Letter</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Academic Node
                </label>
                <input
                  type="text"
                  readOnly
                  value={`${activeSchoolId} • ${tenant?.name || user?.institution_name || user?.school_name || "Institutional Campus"}`}
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3 text-slate-400 text-sm font-mono cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Purpose / Reason for Document
              </label>
              <textarea
                required
                rows="3"
                placeholder="State the purpose (e.g. Passport Application, University Admission, State Sports Eligibility, Scholarship)..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold py-3.5 px-6 rounded-xl shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Submitting to Principal's Office...</span>
              ) : (
                <>
                  <span>🚀</span>
                  <span>Submit Application for Digital Signing</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* APPLICATION HISTORY & STATUS CARD */}
        <div className="bg-[#1E293B]/80 backdrop-blur-xl border border-slate-700/70 rounded-3xl shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-700/60 flex justify-between items-center flex-wrap gap-3 bg-slate-800/40">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>📑</span> My Submitted Requests
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time tracking of institutional document requests
              </p>
            </div>
            <span className="text-xs bg-slate-800 px-3 py-1 rounded-full text-slate-300 font-mono border border-slate-700">
              {studentRequests.length} Applications
            </span>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-700/70 text-slate-400 text-xs uppercase tracking-wider bg-slate-900/40">
                  <th className="p-4 pl-6">Application ID</th>
                  <th className="p-4">Certificate Type</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Reason Preview</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 pr-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {studentRequests.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-slate-500 italic">
                      No document requests submitted yet. Use the form above to apply.
                    </td>
                  </tr>
                ) : (
                  studentRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-4 pl-6 font-mono text-xs font-bold text-blue-400">
                        {req.id}
                      </td>
                      <td className="p-4 font-bold text-white">
                        {req.certificate_type}
                      </td>
                      <td className="p-4 text-xs text-slate-400 font-mono whitespace-nowrap">
                        {req.request_date}
                      </td>
                      <td className="p-4 text-xs text-slate-300 max-w-[200px] truncate" title={req.reason}>
                        {req.reason}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        {req.status === "APPROVED" && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            <span>✅</span> Approved & Digitally Signed
                          </span>
                        )}
                        {req.status === "PENDING" && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            <span>⏳</span> Pending Faculty Verification
                          </span>
                        )}
                        {req.status === "REJECTED" && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            <span>❌</span> Rejected
                          </span>
                        )}
                      </td>
                      <td className="p-4 pr-6 text-right whitespace-nowrap">
                        {req.status === "APPROVED" ? (
                          <button
                            onClick={() => handleDownloadPDF(req)}
                            className="bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow flex items-center gap-1.5 ml-auto"
                          >
                            <span>📥</span> Download PDF
                          </button>
                        ) : req.status === "PENDING" ? (
                          <span className="text-xs text-slate-500 italic">In Review</span>
                        ) : (
                          <span className="text-xs text-rose-400">Archived</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}