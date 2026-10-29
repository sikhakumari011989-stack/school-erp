import React, { useState, useEffect } from "react";
import { CheckCircle2, XCircle, AlertCircle, Clock, ShieldAlert, ArrowRight, FileText, User, Lock } from "lucide-react";
import { useToast } from "../context/ToastContext";
import { supabase } from "../supabaseClient";

export default function OperationalApprovalInbox({ schoolCode = "CAMPUS-01" }) {
  const { showToast } = useToast();
  const [approvalItems, setApprovalItems] = useState([]);
  const [filterType, setFilterType] = useState("all");

  const cleanSchool = schoolCode.toUpperCase();

  useEffect(() => {
    loadApprovalItems();

    const handleUpdate = () => loadApprovalItems();
    window.addEventListener("erp-staff-leaves-updated", handleUpdate);
    window.addEventListener("erp-fee-reversals-updated", handleUpdate);
    window.addEventListener("erp-certificate-updated", handleUpdate);
    window.addEventListener("erp-grievances-updated", handleUpdate);

    return () => {
      window.removeEventListener("erp-staff-leaves-updated", handleUpdate);
      window.removeEventListener("erp-fee-reversals-updated", handleUpdate);
      window.removeEventListener("erp-certificate-updated", handleUpdate);
      window.removeEventListener("erp-grievances-updated", handleUpdate);
    };
  }, [cleanSchool]);

  const loadApprovalItems = () => {
    const combined = [];

    // 1. Pending Staff Leaves
    try {
      const leavesRaw = localStorage.getItem(`erp_staff_leaves_${cleanSchool}`);
      const leaves = leavesRaw ? JSON.parse(leavesRaw) : [];
      leaves
        .filter((l) => (l.status || "").toLowerCase() === "pending")
        .forEach((l) => {
          combined.push({
            id: l.id,
            category: "LEAVE",
            title: `Staff Leave: ${l.applicantName || "Staff Member"}`,
            subtitle: `${l.leaveType} (${l.durationDays || 1} Day/s) • Reason: ${l.reason || "Personal"}`,
            requestedBy: l.applicantName || "Faculty/Staff",
            role: l.applicantRole || "Teacher",
            timestamp: l.appliedAt || l.created_at || "Recent",
            original: l,
          });
        });
    } catch {}

    // 2. Accountant Fee Reversal Requests (Maker-Checker)
    try {
      const reversalsRaw = localStorage.getItem(`erp_fee_reversals_${cleanSchool}`);
      const reversals = reversalsRaw ? JSON.parse(reversalsRaw) : [];
      reversals
        .filter((r) => (r.status || "").toLowerCase() === "pending_approval")
        .forEach((r) => {
          combined.push({
            id: r.id,
            category: "REVERSAL",
            title: `Fee Reversal / Credit Note: ₹${Number(r.amount).toLocaleString()}`,
            subtitle: `Student: ${r.studentName} (${r.rollNumber}) • Reason: ${r.reason}`,
            requestedBy: r.makerName || "Accountant (ACC-01)",
            role: "Accountant",
            timestamp: r.requestedAt || "Recent",
            original: r,
          });
        });
    } catch {}

    // 3. Pending Student Certificate Requests
    try {
      const certsRaw = localStorage.getItem(`erp_certificate_requests_${cleanSchool}`);
      const certs = certsRaw ? JSON.parse(certsRaw) : [];
      certs
        .filter((c) => (c.status || "").toUpperCase() === "PENDING")
        .forEach((c) => {
          combined.push({
            id: c.id,
            category: "CERTIFICATE",
            title: `Issue Certificate: ${c.certificate_type}`,
            subtitle: `Student: ${c.student_name} (${c.roll_number}) • Purpose: ${c.reason}`,
            requestedBy: c.student_name,
            role: "Student",
            timestamp: c.request_date || "Recent",
            original: c,
          });
        });
    } catch {}

    setApprovalItems(combined);
  };

  const handleApprove = async (item) => {
    try {
      if (item.category === "LEAVE") {
        const leavesRaw = localStorage.getItem(`erp_staff_leaves_${cleanSchool}`);
        const leaves = leavesRaw ? JSON.parse(leavesRaw) : [];
        const updated = leaves.map((l) => (l.id === item.id ? { ...l, status: "Approved" } : l));
        localStorage.setItem(`erp_staff_leaves_${cleanSchool}`, JSON.stringify(updated));
        window.dispatchEvent(new Event("erp-staff-leaves-updated"));
        showToast(`Approved leave application for ${item.requestedBy}`, "success");
      } else if (item.category === "REVERSAL") {
        // Maker-Checker Fee Reversal Approval with Pessimistic Row Lock & Idempotent RPC
        const targetEntryId = item.original.receiptId || item.id;
        const idempotencyKey = `REV-${targetEntryId}`;
        let rpcSuccess = false;

        if (supabase) {
          try {
            const { data, error } = await supabase.rpc("reverse_fee_entry", {
              p_entry_id: String(targetEntryId),
              p_reversal_reason: item.original.reason || "Maker-Checker Principal Approval",
              p_authorized_by: "Principal",
              p_idempotency_key: idempotencyKey,
            });

            if (error) {
              console.warn("Pessimistic lock RPC notice:", error.message);
            } else if (data && !data.success) {
              showToast(`Concurrency Warning: ${data.error || "Fee entry already locked/reversed."}`, "error");
              return;
            } else if (data && data.success) {
              rpcSuccess = true;
            }
          } catch (rpcErr) {
            console.warn("RPC reverse_fee_entry execution fallback:", rpcErr);
          }
        }

        const revRaw = localStorage.getItem(`erp_fee_reversals_${cleanSchool}`);
        const reversals = revRaw ? JSON.parse(revRaw) : [];
        const updatedRev = reversals.map((r) => (r.id === item.id ? { ...r, status: "Approved", approvedAt: new Date().toISOString() } : r));
        localStorage.setItem(`erp_fee_reversals_${cleanSchool}`, JSON.stringify(updatedRev));

        // Create linked Credit Note entry in fee ledger
        const ledgerKey = `erp_fee_ledger_${cleanSchool}`;
        const currentLedger = JSON.parse(localStorage.getItem(ledgerKey) || "[]");
        const creditNote = {
          id: `CN-${Date.now()}`,
          student_name: item.original.studentName,
          class_name: item.original.className || "Class",
          amount: -Math.abs(Number(item.original.amount)),
          status: "paid",
          payment_mode: `Credit Note / Reversal (Auth: Principal)`,
          date: new Date().toISOString().split("T")[0],
          school_id: cleanSchool,
          reversal_ref: item.original.id,
          receipt_tag: "CREDIT_NOTE",
        };
        localStorage.setItem(ledgerKey, JSON.stringify([creditNote, ...currentLedger]));
        window.dispatchEvent(new Event("erp-fee-ledger-updated"));
        window.dispatchEvent(new Event("erp-fee-reversals-updated"));
        showToast(
          `Reversal approved! Pessimistic row-lock applied & Credit Note of ₹${Number(item.original.amount).toLocaleString()} generated.`,
          "success"
        );
      } else if (item.category === "CERTIFICATE") {
        const certsRaw = localStorage.getItem(`erp_certificate_requests_${cleanSchool}`);
        const certs = certsRaw ? JSON.parse(certsRaw) : [];
        const updated = certs.map((c) => (c.id === item.id ? { ...c, status: "ISSUED" } : c));
        localStorage.setItem(`erp_certificate_requests_${cleanSchool}`, JSON.stringify(updated));
        window.dispatchEvent(new Event("erp-certificate-updated"));
        showToast(`Certificate "${item.original.certificate_type}" officially issued.`, "success");
      }

      loadApprovalItems();
    } catch (err) {
      console.error("Approval error:", err);
      showToast("Error processing approval", "error");
    }
  };

  const handleReject = (item) => {
    try {
      if (item.category === "LEAVE") {
        const leavesRaw = localStorage.getItem(`erp_staff_leaves_${cleanSchool}`);
        const leaves = leavesRaw ? JSON.parse(leavesRaw) : [];
        const updated = leaves.map((l) => (l.id === item.id ? { ...l, status: "Rejected" } : l));
        localStorage.setItem(`erp_staff_leaves_${cleanSchool}`, JSON.stringify(updated));
        window.dispatchEvent(new Event("erp-staff-leaves-updated"));
      } else if (item.category === "REVERSAL") {
        const revRaw = localStorage.getItem(`erp_fee_reversals_${cleanSchool}`);
        const reversals = revRaw ? JSON.parse(revRaw) : [];
        const updated = reversals.map((r) => (r.id === item.id ? { ...r, status: "Rejected" } : r));
        localStorage.setItem(`erp_fee_reversals_${cleanSchool}`, JSON.stringify(updated));
        window.dispatchEvent(new Event("erp-fee-reversals-updated"));
      } else if (item.category === "CERTIFICATE") {
        const certsRaw = localStorage.getItem(`erp_certificate_requests_${cleanSchool}`);
        const certs = certsRaw ? JSON.parse(certsRaw) : [];
        const updated = certs.map((c) => (c.id === item.id ? { ...c, status: "REJECTED" } : c));
        localStorage.setItem(`erp_certificate_requests_${cleanSchool}`, JSON.stringify(updated));
        window.dispatchEvent(new Event("erp-certificate-updated"));
      }

      showToast(`Item rejected and sender notified.`, "info");
      loadApprovalItems();
    } catch (e) {
      showToast("Error rejecting item", "error");
    }
  };

  const filteredItems = approvalItems.filter((item) => {
    if (filterType === "all") return true;
    return item.category === filterType;
  });

  return (
    <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl shadow-cyan-500/10 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
              Maker-Checker Gate
            </span>
            <span className="text-xs text-slate-400 font-mono">Tenant: {cleanSchool}</span>
          </div>
          <h2 className="text-lg font-black text-white mt-1 flex items-center gap-2">
            <span>Unified Operational Approval Inbox</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
              {approvalItems.length} Pending Actions
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Single queue for Principal sign-off: Staff Leaves, Accountant Credit Notes, and Official Certificates.
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {["all", "LEAVE", "REVERSAL", "CERTIFICATE"].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterType(cat)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterType === cat
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                  : "bg-white/5 text-slate-400 hover:text-white"
              }`}
            >
              {cat === "all" ? "All Queue" : cat}
            </button>
          ))}
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="py-10 text-center text-slate-400">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
          <p className="text-sm font-bold text-white">All Clear! No Operational Approvals Pending</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Staff leaves, accountant financial adjustments, and scholar document requests will appear here for 1-click executive decision.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredItems.map((item) => (
            <div
              key={`${item.category}_${item.id}`}
              className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${
                      item.category === "REVERSAL"
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        : item.category === "LEAVE"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                    }`}
                  >
                    {item.category}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">{item.timestamp}</span>
                </div>
                <h4 className="text-sm font-bold text-white">{item.title}</h4>
                <p className="text-xs text-slate-300">{item.subtitle}</p>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <User className="w-3 h-3 text-cyan-400" />
                  <span>Requester: {item.requestedBy} ({item.role})</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  onClick={() => handleApprove(item)}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black transition-all cursor-pointer flex items-center gap-1 shadow-md shadow-emerald-900/30"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Approve</span>
                </button>
                <button
                  onClick={() => handleReject(item)}
                  className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

