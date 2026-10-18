import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { supabase } from "../supabaseClient";

export default function StudentTransport() {
  const { user } = useContext(AppContext);
  const { showToast } = useToast();
  const schoolId = user?.school_id || user?.institution_code || "CAMPUS-01";

  const [search, setSearch] = useState("");
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLiveRoutes = async () => {
    setLoading(true);
    let loaded = [];

    // 1. Check local storage
    try {
      const saved = localStorage.getItem(`erp_transport_routes_${schoolId}`);
      if (saved) {
        loaded = JSON.parse(saved);
      }
    } catch (e) {
      console.warn("Local routes read notice:", e);
    }

    // 2. Query Supabase if connected
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from("transport_routes")
          .select("*")
          .eq("school_id", schoolId)
          .order("created_at", { ascending: false });

        if (!error && data && data.length > 0) {
          const existingIds = new Set(data.map((d) => d.id));
          const unSynced = loaded.filter((r) => !existingIds.has(r.id));
          loaded = [...data, ...unSynced];
        }
      }
    } catch (e) {
      // Supabase offline fallback
    }

    setRoutes(loaded);
    setLoading(false);
  };

  useEffect(() => {
    fetchLiveRoutes();
    const handleUpdate = () => fetchLiveRoutes();
    window.addEventListener("erp-transport-updated", handleUpdate);
    return () => window.removeEventListener("erp-transport-updated", handleUpdate);
  }, [schoolId]);

  const filteredRoutes = routes.filter((r) => {
    const q = search.toLowerCase();
    const routeName = (r.routeNo || r.route_number || "").toLowerCase();
    const morning = (r.morningStop || r.morning_timing || "").toLowerCase();
    const afternoon = (r.afternoonStop || r.afternoon_timing || "").toLowerCase();
    const driver = (r.driver || r.driver_name || "").toLowerCase();
    const plate = (r.busPlate || r.bus_plate || "").toLowerCase();

    return (
      routeName.includes(q) ||
      morning.includes(q) ||
      afternoon.includes(q) ||
      driver.includes(q) ||
      plate.includes(q)
    );
  });

  return (
    <div className="relative text-slate-200 min-h-full pb-10 font-sans">
      <div className="fixed top-0 left-10 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-6xl mx-auto space-y-8">
        {/* HEADER */}
        <div>
          <p className="text-blue-300 text-sm font-semibold mb-1 uppercase tracking-widest">
            Institutional Transit Logistics
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
            🚌 Campus Bus Routes & Schedule
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-2xl">
            Verified institutional bus schedules, designated morning/afternoon stops, bus license plates, and direct driver contact telephone lines.
          </p>
        </div>

        {/* TRANSIT NOTICE & HELPLINE BANNER */}
        <div className="bg-gradient-to-r from-blue-600/20 via-indigo-600/15 to-purple-600/10 border border-blue-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-black uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {routes.length > 0
                ? `${routes.length} Fleet Route${routes.length === 1 ? "" : "s"} Operational Today`
                : "Transit Network Active"}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Daily Safe Transport Schedule & Driver Directory
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm max-w-xl">
              Morning pickup starts between listed checkpoints. Afternoon departure commences sharply after final class bell. For emergency route inquiries or delays, call the assigned driver directly below.
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 flex flex-col gap-2 shrink-0">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
              Transport Helpdesk & Safety Cell
            </p>
            <p className="text-sm font-bold text-white flex items-center gap-2">
              <span>📞</span> +91 (022) 2855-4900
            </p>
            <p className="text-xs text-blue-400 font-mono">transport@{String(schoolId).toLowerCase()}.internal</p>
          </div>
        </div>

        {/* SEARCH AND TABLE */}
        <div className="bg-[#1E293B]/80 backdrop-blur-xl border border-slate-700/70 rounded-3xl shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-700/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-800/40">
            <div>
              <h2 className="text-lg font-bold text-white">
                Assigned Bus Routes & Checkpoint Timetable
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Always arrive at your designated stop 5 minutes prior to listed departure
              </p>
            </div>

            <div className="w-full sm:w-72">
              <input
                type="text"
                placeholder="Search by stop, route, or driver..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading verified routes...</div>
          ) : routes.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <span className="text-5xl block opacity-60">🚌</span>
              <h3 className="text-lg font-bold text-white">No Transport Routes Configured (Clean Slate)</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No active bus routes have been configured yet for this institution. The school administration has not published route schedules.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-700/70 text-slate-400 text-xs uppercase tracking-wider bg-slate-900/40">
                    <th className="p-4 pl-6">Route & Plate</th>
                    <th className="p-4">Morning Pick-up Stop</th>
                    <th className="p-4">Afternoon Drop-off Stop</th>
                    <th className="p-4">Assigned Driver</th>
                    <th className="p-4 text-center">Operational Status</th>
                    <th className="p-4 pr-6 text-right">Direct Call</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {filteredRoutes.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-slate-500 italic">
                        No routes found matching "{search}".
                      </td>
                    </tr>
                  ) : (
                    filteredRoutes.map((r) => {
                      const routeName = r.routeNo || r.route_number || "Bus Route";
                      const busPlate = r.busPlate || r.bus_plate || "MH-04";
                      const morning = r.morningStop || r.morning_timing || "Campus Main Gate";
                      const afternoon = r.afternoonStop || r.afternoon_timing || "Campus Main Gate";
                      const driver = r.driver || r.driver_name || "Assigned Driver";
                      const phone = r.phone || r.driver_phone || "";

                      return (
                        <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="p-4 pl-6">
                            <p className="font-bold text-white text-sm">{routeName}</p>
                            <span className="inline-block px-2 py-0.5 mt-1 text-[11px] font-mono font-bold bg-slate-900 text-blue-300 border border-slate-700 rounded">
                              {busPlate}
                            </span>
                          </td>
                          <td className="p-4">
                            <p className="font-semibold text-slate-200 text-xs sm:text-sm">
                              {morning}
                            </p>
                          </td>
                          <td className="p-4">
                            <p className="font-semibold text-slate-200 text-xs sm:text-sm">
                              {afternoon}
                            </p>
                          </td>
                          <td className="p-4">
                            <p className="font-bold text-slate-200 text-xs sm:text-sm">{driver}</p>
                            <p className="text-[11px] text-slate-400 font-mono">{phone}</p>
                          </td>
                          <td className="p-4 text-center whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              <span className="text-emerald-400">●</span> On Schedule (Daily Running)
                            </span>
                          </td>
                          <td className="p-4 pr-6 text-right whitespace-nowrap">
                            {phone ? (
                              <a
                                href={`tel:${phone.replace(/[^0-9+]/g, "")}`}
                                onClick={() => showToast(`Initiating direct call to driver ${driver}...`, "info")}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 text-xs font-extrabold rounded-xl transition-all shadow cursor-pointer"
                              >
                                <span>📞</span> Call Driver
                              </a>
                            ) : (
                              <span className="text-xs text-slate-500 italic">No direct phone</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}