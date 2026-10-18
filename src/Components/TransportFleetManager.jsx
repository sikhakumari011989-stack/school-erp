import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { supabase } from "../supabaseClient";
import { logSecurityAction } from "../utils/auditLogger";

export default function TransportFleetManager({ schoolId: propSchoolId }) {
  const { user } = useContext(AppContext);
  const { showToast } = useToast();
  const schoolId = propSchoolId || user?.school_id || user?.institution_code || "CAMPUS-01";

  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    routeNo: "",
    busPlate: "",
    driver: "",
    phone: "",
    morningTiming: "",
    afternoonTiming: "",
  });

  const loadRoutes = async () => {
    setLoading(true);
    let loaded = [];
    try {
      const storageKey = `erp_transport_routes_${schoolId}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        loaded = JSON.parse(saved);
      }
    } catch (e) {
      console.warn("Transport local read error:", e);
    }

    // Try Supabase fetch if available
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from("transport_routes")
          .select("*")
          .eq("school_id", schoolId)
          .order("created_at", { ascending: false });

        if (!error && data && data.length > 0) {
          // Merge with local routes
          const existingIds = new Set(data.map((r) => r.id));
          const unSynced = loaded.filter((r) => !existingIds.has(r.id));
          loaded = [...data, ...unSynced];
        }
      }
    } catch (e) {
      // Offline fallback
    }

    setRoutes(loaded);
    setLoading(false);
  };

  useEffect(() => {
    loadRoutes();
    const handleUpdate = () => loadRoutes();
    window.addEventListener("erp-transport-updated", handleUpdate);
    return () => window.removeEventListener("erp-transport-updated", handleUpdate);
  }, [schoolId]);

  const handleAddRoute = async (e) => {
    e.preventDefault();
    if (!form.routeNo.trim() || !form.busPlate.trim() || !form.driver.trim() || !form.phone.trim()) {
      showToast("Please provide Route Number, Bus License Plate, Driver Name, and Phone Number.", "error");
      return;
    }

    setSubmitting(true);
    const newRoute = {
      id: `route_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      school_id: schoolId,
      routeNo: form.routeNo.trim(),
      busPlate: form.busPlate.trim().toUpperCase(),
      driver: form.driver.trim(),
      phone: form.phone.trim(),
      morningStop: form.morningTiming.trim() || "Campus Gate (07:30 AM)",
      afternoonStop: form.afternoonTiming.trim() || "Campus Gate (02:45 PM)",
      timings: `${form.morningTiming ? form.morningTiming.split("-")[0].trim() : "07:30 AM"} / ${form.afternoonTiming ? form.afternoonTiming.split("-")[0].trim() : "02:45 PM"}`,
      status: "On Schedule (Daily Running)",
      created_at: new Date().toISOString(),
    };

    // 1. Save to localStorage
    const updated = [newRoute, ...routes];
    setRoutes(updated);
    try {
      localStorage.setItem(`erp_transport_routes_${schoolId}`, JSON.stringify(updated));
      window.dispatchEvent(new Event("erp-transport-updated"));
    } catch (e) {
      console.warn("LocalStorage transport save notice:", e);
    }

    // 2. Try Supabase insert
    try {
      if (supabase) {
        await supabase.from("transport_routes").insert([
          {
            school_id: schoolId,
            route_number: newRoute.routeNo,
            bus_plate: newRoute.busPlate,
            driver_name: newRoute.driver,
            driver_phone: newRoute.phone,
            morning_timing: newRoute.morningStop,
            afternoon_timing: newRoute.afternoonStop,
          },
        ]);
      }
    } catch (dbErr) {
      console.warn("Supabase transport sync notice:", dbErr);
    }

    // 3. Security Audit Log
    logSecurityAction({
      action: "Transport Fleet Route Added",
      entityType: "TRANSPORT",
      entityId: newRoute.routeNo,
      details: `Added Bus Route "${newRoute.routeNo}" (${newRoute.busPlate}) with Driver ${newRoute.driver}`,
      user,
      schoolId,
    });

    showToast(`Bus Route "${newRoute.routeNo}" added to fleet successfully!`, "success");
    setForm({
      routeNo: "",
      busPlate: "",
      driver: "",
      phone: "",
      morningTiming: "",
      afternoonTiming: "",
    });
    setShowAddForm(false);
    setSubmitting(false);
  };

  const handleRemoveRoute = async (id, routeName) => {
    const updated = routes.filter((r) => r.id !== id);
    setRoutes(updated);

    try {
      localStorage.setItem(`erp_transport_routes_${schoolId}`, JSON.stringify(updated));
      window.dispatchEvent(new Event("erp-transport-updated"));
    } catch (e) {}

    try {
      if (supabase) {
        await supabase.from("transport_routes").delete().eq("id", id);
      }
    } catch (e) {}

    logSecurityAction({
      action: "Transport Fleet Route Removed",
      entityType: "TRANSPORT",
      entityId: id,
      details: `Archived/Removed bus route "${routeName || id}"`,
      user,
      schoolId,
    });

    showToast(`Route "${routeName || "selected route"}" removed from active fleet.`, "info");
  };

  return (
    <div className="space-y-6">
      {/* SECTION HEADER BANNER */}
      <div className="bg-[#1E293B]/80 backdrop-blur-xl border border-slate-700/70 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>🚌</span> Transit Fleet Logistics
          </div>
          <h2 className="text-2xl font-black text-white">Bus & Transport Fleet Manager</h2>
          <p className="text-slate-400 text-sm mt-1 max-w-xl">
            Configure designated bus lines, vehicle license plates, morning/afternoon checkpoint schedules, and direct driver phone lines.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm shadow-lg shadow-blue-600/30 transition-all cursor-pointer flex items-center gap-2"
          >
            <span>{showAddForm ? "✕ Close Form" : "➕ Add Bus Route"}</span>
          </button>
        </div>
      </div>

      {/* QUICK ADD ROUTE FORM */}
      {showAddForm && (
        <div className="bg-slate-900/90 border border-blue-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl animate-fade-in">
          <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white">Register New Fleet Transit Route</h3>
              <p className="text-xs text-slate-400 mt-0.5">Route updates reflect instantly on all Student & Parent mobile portals.</p>
            </div>
            <span className="text-2xl">🚌</span>
          </div>

          <form onSubmit={handleAddRoute} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Route Number / Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Route #03 - Central Hub"
                  value={form.routeNo}
                  onChange={(e) => setForm({ ...form, routeNo: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Bus Number Plate *
                </label>
                <input
                  type="text"
                  placeholder="e.g. MH-04-AB-5512"
                  value={form.busPlate}
                  onChange={(e) => setForm({ ...form, busPlate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white uppercase font-mono focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Assigned Driver Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rajesh Kumar"
                  value={form.driver}
                  onChange={(e) => setForm({ ...form, driver: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Driver Direct Phone *
                </label>
                <input
                  type="tel"
                  placeholder="e.g. +91 98200 12345"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Morning Pickup Timing & Stop
                </label>
                <input
                  type="text"
                  placeholder="e.g. 07:15 AM - Station Road Circle"
                  value={form.morningTiming}
                  onChange={(e) => setForm({ ...form, morningTiming: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Afternoon Drop Timing & Stop
                </label>
                <input
                  type="text"
                  placeholder="e.g. 02:45 PM - Station Road Circle"
                  value={form.afternoonTiming}
                  onChange={(e) => setForm({ ...form, afternoonTiming: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-5 py-2.5 rounded-xl text-slate-400 hover:text-white font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-lg shadow-blue-600/30 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>{submitting ? "Saving Route..." : "Publish Route Schedule"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ACTIVE ROUTES ROSTER TABLE */}
      <div className="bg-[#1E293B]/80 backdrop-blur-xl border border-slate-700/70 rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-700/60 flex justify-between items-center bg-slate-800/40">
          <div>
            <h3 className="text-lg font-bold text-white">Active Fleet Routes Directory</h3>
            <p className="text-xs text-slate-400 mt-0.5">Live routing schedules deployed for {schoolId}</p>
          </div>
          <span className="text-xs bg-slate-900 border border-slate-700 text-blue-300 font-bold px-3 py-1 rounded-full">
            {routes.length} Active Bus Line{routes.length === 1 ? "" : "s"}
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading fleet logistics...</div>
        ) : routes.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <span className="text-5xl block opacity-60">🚌</span>
            <h4 className="text-lg font-bold text-white">No Transport Routes Configured (Clean Slate)</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Your institutional transport roster is empty. Click "+ Add Bus Route" above to register morning/afternoon routes, driver telephone contacts, and bus license plates.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer mt-2"
            >
              + Create First Route
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-700/70 text-slate-400 text-xs uppercase tracking-wider bg-slate-900/40">
                  <th className="p-4 pl-6">Route & Plate</th>
                  <th className="p-4">Morning Pick-up</th>
                  <th className="p-4">Afternoon Drop-off</th>
                  <th className="p-4">Driver & Phone</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {routes.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 pl-6">
                      <p className="font-bold text-white text-sm">{r.routeNo}</p>
                      <span className="inline-block px-2 py-0.5 mt-1 text-[11px] font-mono font-bold bg-slate-900 text-blue-300 border border-slate-700 rounded">
                        {r.busPlate}
                      </span>
                    </td>
                    <td className="p-4 text-xs sm:text-sm text-slate-200">
                      {r.morningStop}
                    </td>
                    <td className="p-4 text-xs sm:text-sm text-slate-200">
                      {r.afternoonStop}
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-white text-xs sm:text-sm">{r.driver}</p>
                      <a
                        href={`tel:${r.phone}`}
                        className="text-blue-400 hover:text-blue-300 font-mono text-xs flex items-center gap-1 mt-0.5"
                      >
                        <span>📞</span> {r.phone}
                      </a>
                    </td>
                    <td className="p-4 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        Active Daily Route
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleRemoveRoute(r.id, r.routeNo)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ml-auto"
                      >
                        <span>🗑️</span>
                        <span>Remove Route</span>
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

