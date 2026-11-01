import React, { useState, useEffect, useContext, useMemo } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import {
  DEFAULT_VEHICLES,
  DEFAULT_ROUTES,
  DEFAULT_ALLOCATIONS,
  getGpsTrackingStatus,
  calculateFleetMetrics,
} from "../utils/transportService";
import {
  Bus,
  MapPin,
  Users,
  AlertTriangle,
  ShieldCheck,
  Radio,
  FileText,
  Plus,
  Clock,
  Phone,
  Search,
  CheckCircle2,
  Calendar,
  X,
} from "lucide-react";

export default function TransportManager() {
  const { user, tenant } = useContext(AppContext) || {};
  const { showToast } = useToast();

  const schoolCode = (
    user?.institution_code ||
    user?.school_id ||
    tenant?.code ||
    "CAMPUS-01"
  ).toUpperCase();

  const [activeTab, setActiveTab] = useState("fleet"); // 'fleet' | 'routes' | 'manifest'
  const [vehicles, setVehicles] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const gpsStatus = useMemo(() => getGpsTrackingStatus(), []);

  useEffect(() => {
    loadTransportData();
  }, [schoolCode]);

  const loadTransportData = () => {
    try {
      const vKey = `erp_transport_vehicles_${schoolCode}`;
      const rKey = `erp_transport_routes_${schoolCode}`;
      const aKey = `erp_transport_allocations_${schoolCode}`;

      const savedV = localStorage.getItem(vKey);
      const savedR = localStorage.getItem(rKey);
      const savedA = localStorage.getItem(aKey);

      setVehicles(savedV ? JSON.parse(savedV) : DEFAULT_VEHICLES);
      setRoutes(savedR ? JSON.parse(savedR) : DEFAULT_ROUTES);
      setAllocations(savedA ? JSON.parse(savedA) : DEFAULT_ALLOCATIONS);
    } catch (e) {
      setVehicles(DEFAULT_VEHICLES);
      setRoutes(DEFAULT_ROUTES);
      setAllocations(DEFAULT_ALLOCATIONS);
    }
  };

  const metrics = useMemo(() => {
    return calculateFleetMetrics(vehicles, routes, allocations);
  }, [vehicles, routes, allocations]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 transition-colors duration-200">
      {/* HEADER BAR */}
      <div className="bg-white/90 dark:bg-slate-900/80 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
            <Bus className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Transport Intelligence & Fleet Ops
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold">
                {schoolCode}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Bus fleet manifests, driver verification, stop schedules, and regulatory document expiry compliance.
            </p>
          </div>
        </div>

        {/* GPS HARDWARE STATUS PILL */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300">
          <Radio className={`w-4 h-4 ${gpsStatus.isLive ? "text-emerald-500 animate-pulse" : "text-amber-500"}`} />
          <span className="font-semibold">{gpsStatus.statusText}</span>
        </div>
      </div>

      {/* METRIC KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/90 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Active Fleet</span>
            <Bus className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1.5">{metrics.totalVehicles}</p>
          <span className="text-[10px] text-slate-400">Total authorized school buses</span>
        </div>

        <div className="bg-white/90 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Transport Routes</span>
            <MapPin className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1.5">{metrics.totalRoutes}</p>
          <span className="text-[10px] text-slate-400">Covering morning & evening runs</span>
        </div>

        <div className="bg-white/90 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Seat Capacity Fill</span>
            <Users className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5">
            {metrics.capacityUtilization}%
          </p>
          <span className="text-[10px] text-slate-400">{metrics.totalStudentsTransported} / {metrics.totalSeats} seats allocated</span>
        </div>

        <div className="bg-white/90 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Document Alerts</span>
            <AlertTriangle className={`w-4 h-4 ${metrics.expiringVehicles.length > 0 ? "text-rose-500 animate-pulse" : "text-slate-400"}`} />
          </div>
          <p className="text-2xl font-black text-rose-500 mt-1.5">{metrics.expiringVehicles.length}</p>
          <span className="text-[10px] text-slate-400">Fitness / Insurance expiring &le; 30d</span>
        </div>
      </div>

      {/* DOCUMENT EXPIRY ALERT BANNER */}
      {metrics.expiringVehicles.length > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs">
            <AlertTriangle className="w-4 h-4" />
            <span>Statutory Transport Compliance Notice</span>
          </div>
          <div className="space-y-1 text-xs">
            {metrics.expiringVehicles.map((ev, i) => (
              <p key={i} className="text-slate-700 dark:text-slate-300">
                &bull; Bus <span className="font-bold">{ev.vehicleNumber}</span>: <span className="font-semibold text-rose-500">{ev.document}</span> expires on {ev.expiryDate} ({ev.daysRemaining} days left). RTO renewal required.
              </p>
            ))}
          </div>
        </div>
      )}

      {/* TABS */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("fleet")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "fleet"
              ? "bg-amber-600 text-white shadow-md shadow-amber-500/20"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800/60"
          }`}
        >
          <Bus className="w-4 h-4" />
          Vehicle & Driver Registry
        </button>
        <button
          onClick={() => setActiveTab("routes")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "routes"
              ? "bg-amber-600 text-white shadow-md shadow-amber-500/20"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800/60"
          }`}
        >
          <MapPin className="w-4 h-4" />
          Routes & Stop Timing
        </button>
        <button
          onClick={() => setActiveTab("manifest")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "manifest"
              ? "bg-amber-600 text-white shadow-md shadow-amber-500/20"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800/60"
          }`}
        >
          <FileText className="w-4 h-4" />
          Student Transport Manifest ({allocations.length})
        </button>
      </div>

      {/* FLEET TAB */}
      {activeTab === "fleet" && (
        <div className="bg-white/90 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-bold">
                  <th className="py-3 px-4">Vehicle Number</th>
                  <th className="py-3 px-4">Model & Capacity</th>
                  <th className="py-3 px-4">Driver Details</th>
                  <th className="py-3 px-4">License Number</th>
                  <th className="py-3 px-4">Fitness Expiry</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {vehicles.map((v) => (
                  <tr key={v.id}>
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{v.vehicle_number}</td>
                    <td className="py-3.5 px-4">
                      <span>{v.vehicle_model}</span>
                      <span className="block text-[10px] text-slate-400">{v.capacity} Passenger Capacity</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold">{v.driver_name}</p>
                      <a href={`tel:${v.driver_phone}`} className="text-blue-500 hover:underline text-[11px] flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {v.driver_phone}
                      </a>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px]">{v.driver_license_no || "On File"}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-600 dark:text-slate-300">{v.fitness_expiry || "Valid"}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                        {v.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ROUTES TAB */}
      {activeTab === "routes" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {routes.map((r) => (
            <div key={r.id} className="bg-white/90 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-xl space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-bold">
                    {r.route_code}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1">{r.route_name}</h3>
                </div>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  ₹{r.monthly_transport_fee}/mo
                </span>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Morning: {r.morning_departure_time}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Return: {r.afternoon_departure_time}
                </span>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Stops & Timings:</span>
                <div className="space-y-1 text-xs">
                  {r.stops?.map((st, i) => (
                    <div key={i} className="flex items-center justify-between text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5 rounded-lg">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-amber-500" />
                        {st.stop_name}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">{st.pickup_time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MANIFEST TAB */}
      {activeTab === "manifest" && (
        <div className="bg-white/90 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 dark:text-white">Active Student Bus Pass Holders</span>
            <button
              onClick={() => window.print()}
              className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Print Route Manifest
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-bold">
                  <th className="py-3 px-4">Scholar</th>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4">Route</th>
                  <th className="py-3 px-4">Stop Name</th>
                  <th className="py-3 px-4">Pickup Time</th>
                  <th className="py-3 px-4">Parent Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {allocations.map((a) => (
                  <tr key={a.id}>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900 dark:text-white">{a.student_name}</p>
                      <span className="text-[10px] text-slate-400">{a.student_id}</span>
                    </td>
                    <td className="py-3 px-4 font-semibold">{a.class_name}</td>
                    <td className="py-3 px-4 text-blue-500 font-medium">{a.route_code}</td>
                    <td className="py-3 px-4">{a.stop_name}</td>
                    <td className="py-3 px-4 font-mono">{a.pickup_time}</td>
                    <td className="py-3 px-4">
                      <a href={`tel:${a.emergency_parent_phone}`} className="text-slate-500 hover:text-blue-500 text-xs">
                        {a.emergency_parent_phone}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

