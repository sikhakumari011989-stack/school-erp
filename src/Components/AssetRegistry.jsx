import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { logSecurityAction } from "../utils/auditLogger";

const ASSET_CATEGORIES = [
  "All Categories",
  "Laboratory Apparatus & Chemicals",
  "IT Hardware & Laptops",
  "Library Books & Volumes",
  "School Buses & Fleet",
  "Athletics & Sports Gear",
  "Classroom Furniture & Audio-Visual",
];

export default function AssetRegistry({ schoolId: propSchoolId }) {
  const { user } = useContext(AppContext) || {};
  const { showToast } = useToast();
  const schoolId = propSchoolId || user?.school_id || user?.institution_code || "CAMPUS-01";

  const [assets, setAssets] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedCondition, setSelectedCondition] = useState("ALL");
  const [showAddModal, setShowAddModal] = useState(false);

  const [form, setForm] = useState({
    name: "",
    category: "IT Hardware & Laptops",
    quantity: "1",
    unit: "Units",
    assignedTo: "",
    location: "Main Computer Lab",
    condition: "Good Condition", // Brand New | Good Condition | Needs Repair | Decommissioned
    serialNumber: "",
    purchaseValue: "",
  });

  const loadAssets = () => {
    try {
      const saved = localStorage.getItem(`erp_asset_registry_${schoolId}`);
      if (saved) {
        setAssets(JSON.parse(saved));
      } else {
        setAssets([]);
      }
    } catch {
      setAssets([]);
    }
  };

  useEffect(() => {
    loadAssets();
    const handleUpdate = () => loadAssets();
    window.addEventListener("erp-assets-updated", handleUpdate);
    return () => window.removeEventListener("erp-assets-updated", handleUpdate);
  }, [schoolId]);

  const saveAssets = (updated) => {
    setAssets(updated);
    try {
      localStorage.setItem(`erp_asset_registry_${schoolId}`, JSON.stringify(updated));
      window.dispatchEvent(new Event("erp-assets-updated"));
    } catch (e) {
      console.warn("Storage save error:", e);
    }
  };

  const handleAddAsset = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.assignedTo.trim()) {
      showToast("Please provide asset name and designated custodian.", "error");
      return;
    }

    const newAsset = {
      id: `asset_${Date.now()}`,
      name: form.name.trim(),
      category: form.category,
      quantity: `${form.quantity || 1} ${form.unit || "Units"}`,
      totalCount: Number(form.quantity) || 1,
      assignedTo: form.assignedTo.trim(),
      location: form.location.trim() || "Campus Main",
      condition: form.condition,
      serialNumber: form.serialNumber.trim() || `AST-${Date.now().toString().slice(-5)}`,
      purchaseValue: form.purchaseValue ? `₹${Number(form.purchaseValue).toLocaleString("en-IN")}` : "N/A",
      lastAudited: new Date().toISOString().split("T")[0],
    };

    const updated = [newAsset, ...assets];
    saveAssets(updated);

    logSecurityAction({
      action: "ASSET_REGISTERED",
      entityType: "ASSET",
      entityId: newAsset.id,
      details: `Registered asset "${newAsset.name}" (${newAsset.quantity}) assigned to ${newAsset.assignedTo}`,
      schoolId,
    });

    showToast(`Asset "${newAsset.name}" registered successfully!`, "success");
    setForm({
      name: "",
      category: "IT Hardware & Laptops",
      quantity: "1",
      unit: "Units",
      assignedTo: "",
      location: "Main Computer Lab",
      condition: "Good Condition",
      serialNumber: "",
      purchaseValue: "",
    });
    setShowAddModal(false);
  };

  const handleDeleteAsset = (id) => {
    const updated = assets.filter((a) => a.id !== id);
    saveAssets(updated);
    showToast("Asset record removed.", "info");
  };

  const filteredAssets = assets.filter((a) => {
    const matchesCat = selectedCategory === "All Categories" || a.category === selectedCategory;
    const matchesCond = selectedCondition === "ALL" || a.condition === selectedCondition;
    const matchesSearch =
      (a.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.assignedTo || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.serialNumber || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesCond && matchesSearch;
  });

  return (
    <div className="space-y-6 text-slate-100">
      {/* Header Banner */}
      <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-cyan-500/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all duration-300 ease-in-out">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-bold uppercase tracking-wider mb-2">
            <span>🏛️</span> Institutional Infrastructure
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Asset & Inventory Registry</h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-xl">
            Audit and track campus property: laboratory equipment, laptops, library volumes, and school transport buses.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black px-5 py-3 rounded-2xl text-xs sm:text-sm shadow-xl shadow-cyan-500/20 transition-all duration-300 ease-in-out hover:scale-[1.02] cursor-pointer flex items-center gap-2 border border-white/20"
        >
          <span>➕</span>
          <span>Register New Property</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-xl shadow-cyan-500/5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Asset Items</p>
          <p className="text-2xl font-black text-white mt-1">{assets.length}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-xl shadow-cyan-500/5">
          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">In Prime Condition</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">
            {assets.filter((a) => a.condition === "Brand New" || a.condition === "Good Condition").length}
          </p>
        </div>
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-xl shadow-cyan-500/5">
          <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Needs Repair</p>
          <p className="text-2xl font-black text-amber-400 mt-1">
            {assets.filter((a) => a.condition === "Needs Repair").length}
          </p>
        </div>
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-xl shadow-cyan-500/5">
          <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">School Transport Fleet</p>
          <p className="text-2xl font-black text-cyan-400 mt-1">
            {assets.filter((a) => a.category.includes("Buses")).length} Vehicles
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between shadow-xl shadow-cyan-500/5">
        <div className="flex-1 w-full md:w-auto">
          <input
            type="text"
            placeholder="Search property name, custodian, or serial tag #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-400"
          >
            {ASSET_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={selectedCondition}
            onChange={(e) => setSelectedCondition(e.target.value)}
            className="bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-400"
          >
            <option value="ALL">All Conditions</option>
            <option value="Brand New">Brand New</option>
            <option value="Good Condition">Good Condition</option>
            <option value="Needs Repair">Needs Repair</option>
            <option value="Decommissioned">Decommissioned</option>
          </select>
        </div>
      </div>

      {/* Assets Table */}
      <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl shadow-cyan-500/10 overflow-hidden">
        {filteredAssets.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <span className="text-4xl block opacity-60">📦</span>
            <h4 className="text-base font-bold text-white">No Asset Records Registered (Clean Slate)</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              There are currently no property records matching your criteria. Click "Register New Property" to record school equipment.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 text-xs uppercase tracking-wider bg-white/5">
                  <th className="p-4 pl-6">Property / Equipment</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Total Qty</th>
                  <th className="p-4">Assigned To</th>
                  <th className="p-4">Condition</th>
                  <th className="p-4 text-right pr-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {filteredAssets.map((a) => (
                  <tr
                    key={a.id}
                    className="hover:bg-white/5 transition-all duration-300 ease-in-out hover:scale-[1.005]"
                  >
                    <td className="p-4 pl-6">
                      <p className="font-bold text-white text-sm">{a.name}</p>
                      <span className="text-[10px] font-mono text-cyan-400">Tag #{a.serialNumber}</span>
                    </td>
                    <td className="p-4 text-xs text-slate-300">{a.category}</td>
                    <td className="p-4 font-mono font-bold text-xs text-emerald-400">{a.quantity}</td>
                    <td className="p-4 text-xs">
                      <span className="font-semibold text-white block">{a.assignedTo}</span>
                      <span className="text-[10px] text-slate-400">{a.location}</span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-extrabold uppercase ${
                          a.condition === "Brand New" || a.condition === "Good Condition"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : a.condition === "Needs Repair"
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                        }`}
                      >
                        {a.condition}
                      </span>
                    </td>
                    <td className="p-4 text-right pr-6">
                      <button
                        onClick={() => handleDeleteAsset(a.id)}
                        className="text-xs text-rose-400 hover:text-rose-300 px-2 py-1 rounded transition-all cursor-pointer"
                        title="Delete asset"
                      >
                        ✕ Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Register Asset */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900/95 border border-white/10 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl shadow-cyan-500/20 relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-black text-white">Register School Property</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddAsset} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Asset / Property Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Lenovo ThinkPad Core i7 / Physics Optics Bench"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                  >
                    {ASSET_CATEGORIES.filter((c) => c !== "All Categories").map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Total Quantity
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="Qty"
                      value={form.quantity}
                      onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                      className="w-2/3 bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                    />
                    <select
                      value={form.unit}
                      onChange={(e) => setForm({ ...form, unit: e.target.value })}
                      className="w-1/3 bg-slate-950/60 border border-white/10 rounded-xl px-2 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                    >
                      <option value="Units">Units</option>
                      <option value="Sets">Sets</option>
                      <option value="Vehicles">Vehicles</option>
                      <option value="Volumes">Volumes</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Assigned Custodian / Staff
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Physics Lab In-Charge"
                    value={form.assignedTo}
                    onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Location / Room
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Room 302 Science Block"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Physical Condition
                  </label>
                  <select
                    value={form.condition}
                    onChange={(e) => setForm({ ...form, condition: e.target.value })}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="Brand New">Brand New</option>
                    <option value="Good Condition">Good Condition</option>
                    <option value="Needs Repair">Needs Repair</option>
                    <option value="Decommissioned">Decommissioned</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Serial Tag / Plate #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., AST-84920"
                    value={form.serialNumber}
                    onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black px-5 py-2.5 rounded-xl text-xs shadow-lg shadow-cyan-500/20 transition-all duration-300 ease-in-out hover:scale-[1.02]"
                >
                  Add to Ledger 📦
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

