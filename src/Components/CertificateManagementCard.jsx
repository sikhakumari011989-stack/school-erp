import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { supabase } from "../supabaseClient";
import { generateOfficialCertificatePDF } from "../utils/pdfGenerator";
import { getDefaultCertificateRequests } from "../pages/CertificateGenerator";

export default function CertificateManagementCard({ mode = "teacher", title }) {
  const { user, tenant } = useContext(AppContext) || {};
  const { showToast } = useToast();

  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState(mode === "teacher" ? "PENDING" : "ALL");
  const [processingId, setProcessingId] = useState(null);

  const activeSchoolId = user?.institution_code || user?.school_id || tenant?.code || "CAMPUS-01";

  const loadRequests = () => {
    try {
      const storageKey = `erp_certificate_requests_${activeSchoolId}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setRequests(JSON.parse(saved));
      } else {
        const initial = getDefaultCertificateRequests(activeSchoolId);
        localStorage.setItem(storageKey, JSON.stringify(initial));
        localStorage.setItem("erp_certificate_requests", JSON.stringify(initial));
        setRequests(initial);
      }
    } catch (err) {
      console.warn("Failed to read certificates storage:", err);
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

  const updateCertificateStatus = async (certId, newStatus) => {
    setProcessingId(certId);
    try {
      // 1. Supabase update attempt
      if (supabase) {
        try {
          await supabase
            .from("certificate_requests")
            .update({ status: newStatus })
            .eq("id", certId);
        } catch (sErr) {
          console.warn("Supabase certificate update notice:", sErr);
        }
      }

      // 2. LocalStorage update
      const storageKey = `erp_certificate_requests_${activeSchoolId}`;
      const existing = JSON.parse(localStorage.getItem(storageKey) || "[]");
      const updated = existing.map((c) =>
        c.id === certId ? { ...c, status: newStatus } : c
      );
      localStorage.setItem(storageKey, JSON.stringify(updated));
      localStorage.setItem("erp_certificate_requests", JSON.stringify(updated));

      // 3. Dispatch event & update state
      window.dispatchEvent(new Event("erp-certificates-updated"));
      window.dispatchEvent(new Event("erp-certificate-updated"));
      setRequests(updated);

      showToast(
        `Certificate ${certId} ${newStatus === "APPROVED" ? "approved" : "rejected"} successfully!`,
        newStatus === "APPROVED" ? "success" : "info"
      );
    } catch (err) {
      console.error("Status update error:", err);
      showToast("Updated certificate status locally.", "info");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDigitallySignAndIssue = async (cert) => {
    setProcessingId(cert.id);
    try {
      // Mark as approved first if not already
      if (cert.status !== "APPROVED") {
        await updateCertificateStatus(cert.id, "APPROVED");
      }

      // Generate & Download the authentic PDF
      generateOfficialCertificatePDF({
        tenant: {
          name: tenant?.name || user?.institution_name || user?.school_name || "Institutional Campus",
          code: activeSchoolId,
          address: tenant?.address || "Flat number 201, Jivdani Chaya, near Rajshree Hospital, beside Kalavati Mandir, Mahim Manohar Highway, Palghar 401404",
        },
        student: {
          name: cert.student_name,
          roll_number: cert.roll_number,
          class_name: cert.class_name,
        },
        certificate: {
          id: cert.id,
          certificate_type: cert.certificate_type,
          reason: cert.reason,
          request_date: cert.request_date,
          issue_date: new Date().toISOString().split("T")[0],
        },
      });

      showToast(
        `Digitally signed & issued official ${cert.certificate_type} for ${cert.student_name}!`,
        "success"
      );
    } catch (err) {
      console.error("Sign & Issue PDF error:", err);
      showToast("Failed to digitally issue certificate PDF.", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  const filteredRequests = requests.filter((r) => {
    if (filter === "ALL") return true;
    return r.status === filter;
  });

  const cardTitle = title || "📜 Pending Student Certificates";

  return (
    <div className="bg-[#1E293B]/80 backdrop-blur-xl border border-slate-700/70 rounded-3xl shadow-2xl overflow-hidden mb-10">
      {/* CARD HEADER */}
      <div className="p-6 border-b border-slate-700/60 flex justify-between items-center flex-wrap gap-4 bg-slate-800/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center text-xl">
            📜
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">{cardTitle}</h2>
              {pendingCount > 0 && (
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                  {pendingCount} Pending
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {mode === "teacher"
                ? "Review and verify student documents before principal sign-off"
                : "Authorize institutional certificates and generate official tamper-proof PDFs"}
            </p>
          </div>
        </div>

        {/* FILTERS */}
        <div className="flex items-center gap-1.5 bg-slate-900/60 p-1 rounded-xl border border-slate-700/70 text-xs">
          {mode !== "teacher" && (
            <button
              onClick={() => setFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                filter === "ALL"
                  ? "bg-purple-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              All ({requests.length})
            </button>
          )}
          <button
            onClick={() => setFilter("PENDING")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              filter === "PENDING"
                ? "bg-amber-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilter("APPROVED")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              filter === "APPROVED"
                ? "bg-emerald-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Approved ({requests.filter((r) => r.status === "APPROVED").length})
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-700/70 text-slate-400 text-xs uppercase tracking-wider bg-slate-900/40">
              <th className="p-4 pl-6">Student & Roll No</th>
              <th className="p-4">Certificate Type</th>
              <th className="p-4">Class</th>
              <th className="p-4">Request Date</th>
              <th className="p-4">Purpose / Reason</th>
              <th className="p-4 text-center">Status</th>
              <th className="p-4 pr-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-sm">
            {filteredRequests.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-8 text-center text-slate-500 italic">
                  No certificate requests found for this filter.
                </td>
              </tr>
            ) : (
              filteredRequests.map((cert) => (
                <tr key={cert.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-4 pl-6">
                    <p className="font-bold text-white text-sm">{cert.student_name}</p>
                    <p className="text-xs font-mono text-purple-300">{cert.roll_number}</p>
                  </td>
                  <td className="p-4">
                    <span className="font-semibold text-slate-200">{cert.certificate_type}</span>
                    <p className="text-[10px] font-mono text-slate-500">{cert.id}</p>
                  </td>
                  <td className="p-4 text-xs font-medium text-slate-300 whitespace-nowrap">
                    {cert.class_name}
                  </td>
                  <td className="p-4 text-xs font-mono text-slate-400 whitespace-nowrap">
                    {cert.request_date}
                  </td>
                  <td className="p-4 text-xs text-slate-300 max-w-[200px] truncate" title={cert.reason}>
                    {cert.reason}
                  </td>
                  <td className="p-4 text-center whitespace-nowrap">
                    {cert.status === "APPROVED" && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <span>✅</span> Approved
                      </span>
                    )}
                    {cert.status === "PENDING" && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        <span>⏳</span> Pending
                      </span>
                    )}
                    {cert.status === "REJECTED" && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        <span>❌</span> Rejected
                      </span>
                    )}
                  </td>
                  <td className="p-4 pr-6 text-right whitespace-nowrap">
                    {mode === "teacher" ? (
                      <div className="flex items-center justify-end gap-2">
                        {cert.status === "PENDING" ? (
                          <>
                            <button
                              disabled={processingId === cert.id}
                              onClick={() => updateCertificateStatus(cert.id, "APPROVED")}
                              className="px-3 py-1.5 bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 text-xs font-bold rounded-xl transition-all cursor-pointer shadow disabled:opacity-50 flex items-center gap-1"
                            >
                              <span>✅</span> Approve
                            </button>
                            <button
                              disabled={processingId === cert.id}
                              onClick={() => updateCertificateStatus(cert.id, "REJECTED")}
                              className="px-2.5 py-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                            >
                              <span>❌</span> Reject
                            </button>
                          </>
                        ) : cert.status === "APPROVED" ? (
                          <span className="text-xs font-bold text-emerald-400">Approved</span>
                        ) : (
                          <span className="text-xs text-rose-400">Rejected</span>
                        )}
                      </div>
                    ) : (
                      /* Principal / Trustee Action */
                      <div className="flex items-center justify-end gap-2">
                        {cert.status === "PENDING" && (
                          <button
                            disabled={processingId === cert.id}
                            onClick={() => updateCertificateStatus(cert.id, "APPROVED")}
                            className="px-3 py-1.5 bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 text-xs font-bold rounded-xl transition-all cursor-pointer shadow disabled:opacity-50 flex items-center gap-1"
                          >
                            <span>✅</span> Approve
                          </button>
                        )}
                        <button
                          disabled={processingId === cert.id}
                          onClick={() => handleDigitallySignAndIssue(cert)}
                          className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-extrabold rounded-xl transition-all shadow-md shadow-purple-600/30 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <span>✍️</span> Digitally Sign & Issue (PDF)
                        </button>
                        {cert.status === "PENDING" && (
                          <button
                            disabled={processingId === cert.id}
                            onClick={() => updateCertificateStatus(cert.id, "REJECTED")}
                            className="px-2.5 py-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                            title="Reject Request"
                          >
                            <span>❌</span> Reject
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

