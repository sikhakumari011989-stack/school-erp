import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { logSecurityAction } from "../utils/auditLogger";

const INVENTORY_CATEGORIES = [
  "Uniforms & Apparel",
  "Textbooks & Syllabi",
  "Library Books & Volumes",
  "Laboratory Apparatus & Chemicals",
  "Sports & Athletic Gear",
  "Computer Hardware & IT",
];

export default function InventoryAssetManager({ schoolId: propSchoolId }) {
  const { user } = useContext(AppContext);
  const { showToast } = useToast();
  const schoolId = propSchoolId || user?.school_id || user?.institution_code || "CAMPUS-01";

  const [items, setItems] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterCat, setFilterCat] = useState("ALL");

  const [form, setForm] = useState({
    name: "",
    category: "Laboratory Apparatus & Chemicals",
    quantity: "25 Units",
    location: "Physics Lab Cabinet 2",
    condition: "Good / Available",
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`erp_inventory_${schoolId}`);
      if (saved) {
        setItems(JSON.parse(saved));
      } else {
        setItems([]);
      }
    } catch (e) {
      setItems([]);
    }
  }, [schoolId]);

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast("Please provide asset item name.", "error");
      return;
    }

    const newItem = {
      id: `asset_${Date.now()}`,
      name: form.name.trim(),
      category: form.category,
      quantity: form.quantity.trim() || "1 Unit",
      location: form.location.trim() || "Main Campus Store",
      condition: form.condition,
      lastAudited: new Date().toISOString().split("T")[0],
    };

    const updated = [newItem, ...items];
    setItems(updated);
    try {
      localStorage.setItem(`erp_inventory_${schoolId}`, JSON.stringify(updated));
    } catch (e) {}

    logSecurityAction({
      action: "Campus Asset / Inventory Registered",
      entityType: "INVENTORY",
      entityId: newItem.name,
      details: `Added ${newItem.quantity} of "${newItem.name}" to ${newItem.location}`,
      user,
      schoolId,
    });

    showToast(`Asset "${newItem.name}" added to campus inventory!`, "success");
    setForm({
      name: "",
      category: "Laboratory Apparatus & Chemicals",
      quantity: "25 Units",
      location: "Physics Lab Cabinet 2",
      condition: "Good / Available",
    });
    setShowAddModal(false);
  };

  const handleDeleteItem = (id, name) => {
    const updated = items.filter((i) => i.id !== id);
    setItems(updated);
    try {
      localStorage.setItem(`erp_inventory_${schoolId}`, JSON.stringify(updated));
    } catch (e) {}
    showToast(`Item "${name || "Asset"}" removed from inventory.`, "info");
  };

  const filteredItems = items.filter((i) => {
    if (filterCat === "ALL") return true;
    return i.category === filterCat;
  });

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-[#1E293B]/80 backdrop-blur-xl border border-slate-700/70 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>📦</span> Physical Plant & Asset Control
          </div>
          <h2 className="text-2xl font-black text-white">Inventory & Asset Master</h2>
          <p className="text-slate-400 text-sm mt-1 max-w-xl">
            Audit school uniforms, syllabus textbooks, library books, laboratory chemicals, and computer equipment.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm shadow-lg shadow-indigo-600/30 transition-all cursor-pointer flex items-center gap-2"
          >
            <span>➕</span>
            <span>Add Inventory Asset</span>
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-[#1E293B]/80 backdrop-blur-xl border border-slate-700/70 rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-700/60 bg-slate-800/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-bold text-white">Campus Asset & Equipment Ledger</h3>
            <p className="text-xs text-slate-400 mt-0.5">Campus Node: {schoolId}</p>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1">
            <button
              onClick={() => setFilterCat("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterCat === "ALL" ? "bg-indigo-600 text-white" : "bg-slate-900 text-slate-400 hover:text-white"
              }`}
            >
              All Assets ({items.length})
            </button>
            {INVENTORY_CATEGORIES.map((cat) => {
              const count = items.filter((i) => i.category === cat).length;
              if (count === 0 && filterCat !== cat) return null;
              return (
                <button
                  key={cat}
                  onClick={() => setFilterCat(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    filterCat === cat ? "bg-indigo-600 text-white" : "bg-slate-900 text-slate-400 hover:text-white"
                  }`}
                >
                  {cat.split(" ")[0]} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {items.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <span className="text-5xl block opacity-60">📦</span>
            <h4 className="text-lg font-bold text-white">No Inventory Assets Logged (Clean Slate)</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Track school uniforms, textbooks, library collections, or laboratory apparatus. Click below to add your first asset.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer mt-2"
            >
              + Add First Asset
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-700/70 text-slate-400 text-xs uppercase tracking-wider bg-slate-900/40">
                  <th className="p-4 pl-6">Item Name & Asset ID</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Stock Quantity</th>
                  <th className="p-4">Storage Location</th>
                  <th className="p-4 text-center">Condition Status</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 pl-6">
                      <p className="font-bold text-white">{item.name}</p>
                      <span className="text-[11px] font-mono text-slate-400">ID: {item.id.slice(-6)}</span>
                    </td>
                    <td className="p-4 text-xs font-semibold text-slate-300">{item.category}</td>
                    <td className="p-4 font-bold text-indigo-300 font-mono">{item.quantity}</td>
                    <td className="p-4 text-xs text-slate-300">{item.location}</td>
                    <td className="p-4 text-center">
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold">
                        {item.condition}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleDeleteItem(item.id, item.name)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD ITEM MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#1E293B] border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-extrabold text-white mb-1">Add Inventory Asset Item 📦</h3>
            <p className="text-xs text-slate-400 mb-6">Register laboratory equipment, uniform batches, or textbooks.</p>

            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Item Description / Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Compound Optical Microscopes (40x-1000x)"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Asset Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  {INVENTORY_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Stock Quantity</label>
                  <input
                    type="text"
                    placeholder="e.g. 25 Units"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Condition Status</label>
                  <select
                    value={form.condition}
                    onChange={(e) => setForm({ ...form, condition: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Good / Available">Good / Available</option>
                    <option value="New in Packaging">New in Packaging</option>
                    <option value="Needs Maintenance">Needs Maintenance</option>
                    <option value="Low Stock">Low Stock</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Storage Location</label>
                <input
                  type="text"
                  placeholder="e.g. Physics Lab Cabinet 2 or Main Store"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-lg transition-all cursor-pointer"
                >
                  Save Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

