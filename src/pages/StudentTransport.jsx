import React, { useState } from "react";
import { useToast } from "../context/ToastContext";

export default function StudentTransport() {
  const { showToast } = useToast();
  const [search, setSearch] = useState("");

  const [routes] = useState([
    {
      id: 1,
      routeNo: "Route #01 - North Link",
      morningStop: "Station Road Circle (07:15 AM)",
      afternoonStop: "Station Road Circle (02:45 PM)",
      timings: "07:15 AM / 02:45 PM",
      busPlate: "MH-04-AB-5512",
      driver: "Rajesh Kumar",
      phone: "+919820012345",
      displayPhone: "+91 98200 12345",
      capacity: "42 Seats",
      status: "On Schedule (Daily Running)",
    },
    {
      id: 2,
      routeNo: "Route #02 - Metro Express",
      morningStop: "City Center Metro Gate 3 (07:30 AM)",
      afternoonStop: "City Center Metro Gate 3 (03:00 PM)",
      timings: "07:30 AM / 03:00 PM",
      busPlate: "MH-04-CD-7821",
      driver: "Suresh Patil",
      phone: "+919820023456",
      displayPhone: "+91 98200 23456",
      capacity: "40 Seats",
      status: "On Schedule (Daily Running)",
    },
    {
      id: 3,
      routeNo: "Route #03 - Central Hub",
      morningStop: "Shivaji Nagar Garden (07:20 AM)",
      afternoonStop: "Shivaji Nagar Garden (02:50 PM)",
      timings: "07:20 AM / 02:50 PM",
      busPlate: "MH-04-EF-9904",
      driver: "Mahesh Sawant",
      phone: "+919820034567",
      displayPhone: "+91 98200 34567",
      capacity: "45 Seats",
      status: "On Schedule (Daily Running)",
    },
    {
      id: 4,
      routeNo: "Route #04 - South Ridge",
      morningStop: "Hill View Highway Stop (07:35 AM)",
      afternoonStop: "Hill View Highway Stop (03:10 PM)",
      timings: "07:35 AM / 03:10 PM",
      busPlate: "MH-04-GH-3341",
      driver: "Vikram Jadhav",
      phone: "+919820045678",
      displayPhone: "+91 98200 45678",
      capacity: "38 Seats",
      status: "On Schedule (Daily Running)",
    },
  ]);

  const filteredRoutes = routes.filter((r) => {
    const q = search.toLowerCase();
    return (
      r.routeNo.toLowerCase().includes(q) ||
      r.morningStop.toLowerCase().includes(q) ||
      r.afternoonStop.toLowerCase().includes(q) ||
      r.driver.toLowerCase().includes(q) ||
      r.busPlate.toLowerCase().includes(q)
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
              All 4 Fleet Routes Operational Today
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Daily Safe Transport Schedule & Driver Directory
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm max-w-xl">
              Morning pickup starts between 07:15 AM - 07:35 AM. Afternoon departure from campus commences sharply at 02:30 PM. For emergency route diversions or delay notifications, call the assigned driver directly below.
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 flex flex-col gap-2 shrink-0">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
              Transport Helpdesk & Safety Cell
            </p>
            <p className="text-sm font-bold text-white flex items-center gap-2">
              <span>📞</span> +91 (022) 2855-4900
            </p>
            <p className="text-xs text-blue-400 font-mono">transport@schoolerp.internal</p>
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

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-700/70 text-slate-400 text-xs uppercase tracking-wider bg-slate-900/40">
                  <th className="p-4 pl-6">Route & Plate</th>
                  <th className="p-4">Morning Pick-up Stop</th>
                  <th className="p-4">Afternoon Drop-off Stop</th>
                  <th className="p-4">Timings</th>
                  <th className="p-4">Assigned Driver</th>
                  <th className="p-4 text-center">Operational Status</th>
                  <th className="p-4 pr-6 text-right">Direct Call</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {filteredRoutes.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-500 italic">
                      No routes found matching "{search}".
                    </td>
                  </tr>
                ) : (
                  filteredRoutes.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-4 pl-6">
                        <p className="font-bold text-white text-sm">{r.routeNo}</p>
                        <span className="inline-block px-2 py-0.5 mt-1 text-[11px] font-mono font-bold bg-slate-900 text-blue-300 border border-slate-700 rounded">
                          {r.busPlate}
                        </span>
                      </td>
                      <td className="p-4">
                        <p className="font-semibold text-slate-200 text-xs sm:text-sm">
                          {r.morningStop}
                        </p>
                      </td>
                      <td className="p-4">
                        <p className="font-semibold text-slate-200 text-xs sm:text-sm">
                          {r.afternoonStop}
                        </p>
                      </td>
                      <td className="p-4 font-mono text-xs font-bold text-amber-300 whitespace-nowrap">
                        {r.timings}
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-slate-200 text-xs sm:text-sm">{r.driver}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{r.displayPhone}</p>
                      </td>
                      <td className="p-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          <span className="text-emerald-400">●</span> On Schedule (Daily Running)
                        </span>
                      </td>
                      <td className="p-4 pr-6 text-right whitespace-nowrap">
                        <a
                          href={`tel:${r.phone}`}
                          onClick={() => showToast(`Initiating direct call to ${r.driver}...`, "info")}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 text-xs font-extrabold rounded-xl transition-all shadow cursor-pointer"
                        >
                          <span>📞</span> Call Driver
                        </a>
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