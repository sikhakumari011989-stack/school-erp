import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { logSecurityAction } from "../utils/auditLogger";
import {
  DEFAULT_VENDORS,
  DEFAULT_REQUISITIONS,
  approvePurchaseRequisition,
  confirmGoodsReceived,
} from "../utils/procurementService";
import {
  Box,
  ShoppingCart,
  Building2,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Plus,
  ArrowRight,
  Filter,
  DollarSign,
  Phone,
  Mail,
  Truck,
  X,
} from "lucide-react";

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
  const [activeTab, setActiveTab] = useState("inventory"); // 'inventory' | 'procurement' | 'vendors'

  const [requisitions, setRequisitions] = useState(() => {
    try {
      const saved = localStorage.getItem(`erp_requisitions_${schoolId}`);
      return saved ? JSON.parse(saved) : DEFAULT_REQUISITIONS;
    } catch {
      return DEFAULT_REQUISITIONS;
    }
  });

  const [vendors, setVendors] = useState(() => {
    try {
      const saved = localStorage.getItem(`erp_vendors_${schoolId}`);
      return saved ? JSON.parse(saved) : DEFAULT_VENDORS;
    } catch {
      return DEFAULT_VENDORS;
    }
  });

  const handleApprovePO = async (po) => {
    try {
      const approverName = user?.name || "Executive Principal";
      const updated = await approvePurchaseRequisition({
        requisition: po,
        approverName,
        schoolId,
        user,
      });

      const nextList = requisitions.map((r) => (r.id === po.id ? updated : r));
      setRequisitions(nextList);
      localStorage.setItem(`erp_requisitions_${schoolId}`, JSON.stringify(nextList));
      showToast(`Purchase Order ${po.po_number} approved! Maker-Checker verified.`, "success");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleReceiveGoods = async (po) => {
    try {
      const updated = await confirmGoodsReceived({
        requisition: po,
        schoolId,
        user,
      });

      const nextList = requisitions.map((r) => (r.id === po.id ? updated : r));
      setRequisitions(nextList);
      localStorage.setItem(`erp_requisitions_${schoolId}`, JSON.stringify(nextList));
      showToast(`Goods received confirmed for ${po.po_number}! Stock updated.`, "success");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

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

      {/* NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("inventory")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "inventory"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800/60"
          }`}
        >
          <Box className="w-4 h-4" />
          Physical Asset Inventory ({items.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("procurement")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "procurement"
              ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800/60"
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          Procurement & Purchase Orders ({requisitions.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("vendors")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "vendors"
              ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-500/20"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800/60"
          }`}
        >
          <Building2 className="w-4 h-4" />
          Vendor Directory ({vendors.length})
        </button>
      </div>

      {/* PROCUREMENT TAB */}
      {activeTab === "procurement" && (
        <div className="bg-white/90 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-emerald-500" />
                Purchase Requisitions & Maker-Checker Workflow
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Separation of duties: orders require two-party verification before goods release.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {requisitions.map((po) => {
              const isApproved = po.stage === "approved";
              const isGoodsReceived = po.stage === "goods_received";
              const isPending = po.stage === "pending_approval";

              return (
                <div
                  key={po.id}
                  className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-blue-500/10 text-blue-500 font-bold">
                          {po.po_number}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{po.title}</h4>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Dept: {po.department} &bull; Requested by: <span className="font-semibold text-slate-700 dark:text-slate-300">{po.requested_by}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-base font-black text-slate-900 dark:text-white">
                        ₹{Number(po.estimated_amount).toLocaleString("en-IN")}
                      </span>

                      {isPending && (
                        <button
                          type="button"
                          onClick={() => handleApprovePO(po)}
                          className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Approve PO (Checker)
                        </button>
                      )}

                      {isApproved && (
                        <button
                          type="button"
                          onClick={() => handleReceiveGoods(po)}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          Confirm Goods Received
                        </button>
                      )}

                      {isGoodsReceived && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                          Stock Checked-In
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quotations comparison */}
                  {po.quotations && po.quotations.length > 0 && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700/50 flex items-center gap-2 text-xs flex-wrap">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Quotations:</span>
                      {po.quotations.map((q, qIdx) => (
                        <span
                          key={qIdx}
                          className={`px-2 py-0.5 rounded-lg text-[11px] font-medium border ${
                            q.selected
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold"
                              : "bg-slate-100 dark:bg-slate-700 text-slate-500 border-slate-200 dark:border-slate-600"
                          }`}
                        >
                          {q.vendor_name}: ₹{q.quoted_amount.toLocaleString("en-IN")} {q.selected && "✓ (L1)"}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VENDORS TAB */}
      {activeTab === "vendors" && (
        <div className="bg-white/90 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xl p-5 space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-500" />
            Empaneled Institutional Vendors & Service Providers
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {vendors.map((v) => (
              <div key={v.id} className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{v.vendor_name}</h4>
                    <span className="text-[10px] text-slate-400">{v.category}</span>
                  </div>
                  <span className="text-[11px] font-bold text-amber-500">★ {v.rating}</span>
                </div>

                <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                  <p>Contact: {v.contact_person}</p>
                  <a href={`tel:${v.phone}`} className="text-blue-500 flex items-center gap-1 text-[11px]">
                    <Phone className="w-3 h-3" /> {v.phone}
                  </a>
                  <p className="font-mono text-[10px] text-slate-400">GSTIN: {v.gstin}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* INVENTORY TABLE */}
      {activeTab === "inventory" && (
      <div className="bg-white/90 dark:bg-[#1E293B]/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700/70 rounded-3xl shadow-2xl overflow-hidden">
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
      )}

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

