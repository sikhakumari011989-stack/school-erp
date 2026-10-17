import React, { useState } from "react";
import { useToast } from "../context/ToastContext";

export default function StudentTransport() {
  const { showToast } = useToast();
  const [routes] = useState([
    { id: 1, routeNo: "Route #3", driver: "Rajesh Kumar", phone: "+91 98230 12345", busNo: "MH-04-AB-5512", status: "On Time (En Route)", eta: "07:45 AM" },
    { id: 2, routeNo: "Route #3 (Return)", driver: "Rajesh Kumar", phone: "+91 98230 12345", busNo: "MH-04-AB-5512", status: "Scheduled", eta: "02:15 PM" }
  ]);

  return (
    <div className="relative text-slate-200 min-h-full pb-10 font-sans">
      <div className="fixed top-0 left-10 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="mb-8">
          <p className="text-blue-300 text-sm font-semibold mb-1 uppercase tracking-widest">Student Portal</p>
          <h1 className="text-3xl font-extrabold text-white">Transport Fleet & GPS Tracking 🚌</h1>
          <p className="text-slate-400 text-sm mt-1">Monitor school bus schedules, driver contact details, and live GPS transit routes</p>
        </div>

        {/* LIVE GPS BANNER */}
        <div className="bg-gradient-to-r from-blue-600/25 to-indigo-600/10 border border-blue-500/30 rounded-3xl p-6 shadow-2xl mb-8 flex justify-between items-center flex-wrap gap-4">
          <div>
            <span className="text-xs font-extrabold text-blue-400 uppercase tracking-widest">Live GPS Status</span>
            <h2 className="text-2xl font-black text-white mt-1">Bus currently approaching Station Road 📍</h2>
            <p className="text-slate-300 text-sm mt-1">Driver: Rajesh Kumar | Vehicle: MH-04-AB-5512</p>
          </div>
          <button
            onClick={() => showToast("Connecting to live transit GPS telemetry stream...", "info")}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
          >
            Open Live Map 🗺️
          </button>
        </div>

        {/* ROUTES TABLE */}
        <div className="bg-[#1E293B] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-700 bg-slate-800/50">
            <h2 className="text-lg font-bold text-white">Assigned Bus Routes & Timings</h2>
          </div>
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
                <th className="p-5">Route & Bus No</th>
                <th className="p-5">Driver Contact</th>
                <th className="p-5">Estimated Arrival (ETA)</th>
                <th className="p-5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50 text-sm">
              {routes.map((r) => (
                <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-5">
                    <p className="font-bold text-white text-base">{r.routeNo}</p>
                    <p className="text-xs font-mono text-slate-400">{r.busNo}</p>
                  </td>
                  <td className="p-5">
                    <p className="font-bold text-slate-300">{r.driver}</p>
                    <p className="text-xs font-mono text-blue-400">{r.phone}</p>
                  </td>
                  <td className="p-5 font-mono font-bold text-emerald-400">{r.eta}</td>
                  <td className="p-5 text-center">
                    <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-full text-xs font-extrabold uppercase">
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>

      </div>
    </div>
  );
}