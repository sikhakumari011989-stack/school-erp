import React, { useState, useEffect } from "react";
import { useToast } from "../context/ToastContext";
import { supabase } from "../supabaseClient";
import { logSecurityAction } from "../utils/auditLogger";
import { Plus, Trash2, CheckCircle2, ShieldCheck, IndianRupee, Layers } from "lucide-react";

export default function FeeStructureConfigurator({ schoolId = "CAMPUS-01", institutionName = "Institutional Campus" }) {
  const { showToast } = useToast();
  const activeCode = (schoolId || "CAMPUS-01").trim().toUpperCase();
  const storageKey = `erp_fee_structure_${activeCode}`;

  const [feeComponents, setFeeComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [form, setForm] = useState({
    title: "",
    term: "Term 1",
    amount: "",
    description: "",
  });

  const loadFeeStructures = async () => {
    setLoading(true);
    let loaded = [];

    // 1. Read from localStorage
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) loaded = parsed;
      }
    } catch (e) {
      console.warn("Fee structure local load notice:", e);
    }

    // 2. Read from Supabase if online
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from("fee_structures")
          .select("*")
          .eq("school_id", activeCode);

        if (!error && data && data.length > 0) {
          const map = new Map();
          data.forEach((d) => map.set(d.id, {
            id: d.id,
            title: d.title || d.component_name,
            term: d.term || d.category || "Term Fee",
            amount: Number(d.amount) || 0,
            description: d.description || "",
            school_id: d.school_id,
          }));
          loaded.forEach((l) => {
            if (!map.has(l.id)) map.set(l.id, l);
          });
          loaded = Array.from(map.values());
        }
      }
    } catch (err) {
      console.warn("Supabase fee structure notice:", err);
    }

    setFeeComponents(loaded);
    setLoading(false);
  };

  useEffect(() => {
    loadFeeStructures();
    const handleUpdate = () => loadFeeStructures();
    window.addEventListener("erp-fee-structure-updated", handleUpdate);
    return () => window.removeEventListener("erp-fee-structure-updated", handleUpdate);
  }, [activeCode]);

  const handleAddFeeComponent = async (e) => {
    e.preventDefault();
    const cleanTitle = form.title.trim();
    const numAmount = Number(form.amount);

    if (!cleanTitle) {
      showToast("Please enter a fee component title.", "error");
      return;
    }
    if (!numAmount || numAmount <= 0) {
      showToast("Please enter a valid fee amount in ₹.", "error");
      return;
    }

    setSubmitting(true);
    const newComponent = {
      id: `fee-comp-${Date.now()}`,
      title: cleanTitle,
      term: form.term,
      amount: numAmount,
      description: form.description.trim() || `${form.term} Official Institutional Dues`,
      school_id: activeCode,
      created_at: new Date().toISOString(),
      status: "Active",
    };

    // 1. Try Supabase insert
    try {
      if (supabase) {
        await supabase.from("fee_structures").insert([
          {
            school_id: activeCode,
            title: newComponent.title,
            term: newComponent.term,
            amount: newComponent.amount,
            description: newComponent.description,
          },
        ]);
      }
    } catch (err) {
      console.warn("Fee structure Supabase insert notice:", err);
    }

    // 2. Save to tenant-scoped localStorage
    try {
      const updated = [newComponent, ...feeComponents.filter((f) => f.id !== newComponent.id)];
      localStorage.setItem(storageKey, JSON.stringify(updated));
      setFeeComponents(updated);

      // Dispatch global broadcast event for /student/pay live update
      window.dispatchEvent(new Event("erp-fee-structure-updated"));
    } catch (storageErr) {
      console.warn("LocalStorage fee structure sync notice:", storageErr);
    }

    // 3. Security audit log
    try {
      logSecurityAction({
        action: "FEE_HEAD_CREATED",
        entityType: "FEE_STRUCTURE",
        entityId: newComponent.id,
        details: `Published fee head "${newComponent.title}" (${newComponent.term}) of ₹${newComponent.amount} for ${activeCode}`,
        schoolId: activeCode,
      });
    } catch {}

    showToast(`Published "${newComponent.title}" (₹${newComponent.amount.toLocaleString()}) to student payment portal!`, "success");
    setForm({ title: "", term: "Term 1", amount: "", description: "" });
    setSubmitting(false);
  };

  const handleDeleteFeeComponent = async (id) => {
    try {
      if (supabase) {
        await supabase.from("fee_structures").delete().eq("id", id);
      }
    } catch (err) {
      console.warn("Supabase fee delete notice:", err);
    }

    try {
      const updated = feeComponents.filter((f) => f.id !== id);
      localStorage.setItem(storageKey, JSON.stringify(updated));
      setFeeComponents(updated);
      window.dispatchEvent(new Event("erp-fee-structure-updated"));
      showToast("Fee head removed from student payment portal.", "info");
    } catch (err) {
      console.warn("LocalStorage fee delete notice:", err);
    }
  };

  return (
    <div className="bg-[#1E293B]/80 backdrop-blur-xl border border-slate-700/70 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Layers className="w-3.5 h-3.5" />
            <span>Master Institutional Fee Configurator</span>
          </div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <span>Official School Fee Structure</span>
            <span className="text-xs bg-slate-900 border border-slate-700 text-emerald-400 font-mono px-2.5 py-0.5 rounded-lg">
              {activeCode}
            </span>
          </h2>
          <p className="text-slate-400 text-sm mt-1 max-w-xl">
            Configure tuition, laboratory, and annual fee components. All fee heads published here stream directly into the Student Settlement Portal (<code className="text-emerald-400 font-mono">/student/pay</code>).
          </p>
        </div>
        <div className="text-right bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Published Heads</p>
          <p className="text-xl font-black text-emerald-400">{feeComponents.length} Components</p>
        </div>
      </div>

      {/* FORM: ADD NEW FEE COMPONENT */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-emerald-400" />
          <span>Define & Publish New Fee Component</span>
        </h3>
        <form onSubmit={handleAddFeeComponent} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Component Title *
            </label>
            <input
              type="text"
              placeholder="e.g. Second Term Tuition Fee (2026-27)"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Term / Category *
            </label>
            <select
              value={form.term}
              onChange={(e) => setForm({ ...form, term: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="Term 1">Term 1 Tuition</option>
              <option value="Term 2">Term 2 Tuition</option>
              <option value="Term 3">Term 3 Tuition</option>
              <option value="Annual">Annual General Fee</option>
              <option value="Quarterly">Quarterly Installment</option>
              <option value="Laboratory">Laboratory & Library</option>
              <option value="Transport">Campus Transport Fleet</option>
              <option value="Examination">Board Examination Fee</option>
              <option value="Admission">One-Time Admission Fee</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Amount (₹ INR) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-500 text-xs font-bold">₹</span>
              <input
                type="number"
                placeholder="15000"
                min="100"
                step="50"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
                required
              />
            </div>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{submitting ? "Publishing..." : "Publish Fee Head"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* ACTIVE PUBLISHED FEE HEADS TABLE */}
      <div className="bg-[#1E293B] border border-slate-700/60 rounded-2xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-700/60 bg-slate-800/40 flex justify-between items-center">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <IndianRupee className="w-4 h-4 text-emerald-400" />
            <span>Active Published Fee Heads ({feeComponents.length})</span>
          </h3>
          <span className="text-[11px] text-slate-400 font-mono">
            Directly selectable by students at /student/pay
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">Loading fee structure...</div>
        ) : feeComponents.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <span className="text-4xl block opacity-60">📑</span>
            <h4 className="text-base font-bold text-white">No active fee structures published by school administration yet.</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Define your school's tuition, laboratory, and campus fee heads above. Once published, students will be able to select and settle them via UPI QR or Razorpay.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider bg-slate-900/40">
                  <th className="p-4 pl-6">Fee Component Title</th>
                  <th className="p-4">Billing Category</th>
                  <th className="p-4">Settlement Amount</th>
                  <th className="p-4 text-center">Student Portal Status</th>
                  <th className="p-4 text-right pr-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {feeComponents.map((fee) => (
                  <tr key={fee.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 pl-6 font-bold text-white">
                      {fee.title}
                      {fee.description && (
                        <span className="block text-xs text-slate-400 font-normal mt-0.5">{fee.description}</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                        {fee.term}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-black text-emerald-400">
                      ₹{Number(fee.amount || 0).toLocaleString()}
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-xs font-bold">
                        <CheckCircle2 className="w-3 h-3" />
                        Published
                      </span>
                    </td>
                    <td className="p-4 text-right pr-6">
                      <button
                        onClick={() => handleDeleteFeeComponent(fee.id)}
                        className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                        title="Remove fee component"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
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
  );
}

