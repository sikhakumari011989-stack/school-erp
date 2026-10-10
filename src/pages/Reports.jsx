import { useState, useContext } from "react";
import { AppContext } from "../context/AppContext";

export default function Reports() {
  const { generateFullReport } = useContext(AppContext) || {};
  const [activeTab, setActiveTab] = useState("Fees");

  const handleDownload = (e) => {
    e.preventDefault();
    alert(`Generating ${activeTab} Report PDF...`);
    // Connects to your getFeeReport / getAttendanceReport backend
  };

  return (
    <div className="text-slate-200">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">School Reports Engine</h1>
        <p className="text-slate-400 mt-1">Generate and download official PDF analytics</p>
      </div>

      <div className="bg-[#1E293B] border border-slate-700 rounded-xl shadow-lg p-6 mb-8">
        <div className="flex gap-4 mb-6 border-b border-slate-700 pb-4">
          {["Fees", "Attendance", "Academic Marks", "Master Report"].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === tab ? "bg-blue-600 text-white" : "bg-[#0F172A] text-slate-400 border border-slate-600 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <form onSubmit={handleDownload} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Start Date</label>
              <input type="date" required className="w-full bg-[#0F172A] border border-slate-600 rounded-lg px-4 py-2.5 text-white outline-none focus:border-blue-500 custom-calendar-icon" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">End Date</label>
              <input type="date" required className="w-full bg-[#0F172A] border border-slate-600 rounded-lg px-4 py-2.5 text-white outline-none focus:border-blue-500 custom-calendar-icon" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Target Class</label>
              <select className="w-full bg-[#0F172A] border border-slate-600 rounded-lg px-4 py-2.5 text-white outline-none focus:border-blue-500">
                <option>All Classes</option>
                <option>10-A</option>
                <option>9-B</option>
              </select>
            </div>
          </div>
          <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-bold shadow-lg transition-all w-full md:w-auto">
            📥 Download {activeTab} Report (PDF)
          </button>
        </form>
      </div>
    </div>
  );
}