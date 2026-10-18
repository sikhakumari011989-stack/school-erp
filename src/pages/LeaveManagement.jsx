import { useState, useContext } from "react";
import { AppContext } from "../context/AppContext";

export default function LeaveManagement() {
  const { user } = useContext(AppContext) || { user: { role: 'admin' } }; // Fallback for testing
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [leaves, setLeaves] = useState([
    { id: 1, name: "Mr. Sharma", role: "Teacher", date: "2026-10-12", reason: "Family Function", status: "Pending" },
    { id: 2, name: "Mrs. Gupta", role: "Teacher", date: "2026-10-15", reason: "Medical Appointment", status: "Approved" },
    { id: 3, name: "Rohan Mehta", role: "Student", date: "2026-10-10", reason: "Fever", status: "Pending" }
  ]);

  return (
    <div className="text-slate-200 relative">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white">Leave Management</h1>
          <p className="text-slate-400 mt-1">Manage staff and student leave requests</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-lg shadow-blue-600/20">
          + Apply for Leave
        </button>
      </div>

      <div className="bg-[#1E293B] border border-slate-700 rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-800/50 border-b border-slate-700 text-slate-300 text-sm">
              <th className="p-4 font-semibold">Applicant</th>
              <th className="p-4 font-semibold">Role</th>
              <th className="p-4 font-semibold">Date Requested</th>
              <th className="p-4 font-semibold">Reason</th>
              <th className="p-4 font-semibold">Status</th>
              {user.role === 'admin' && <th className="p-4 font-semibold text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="text-sm">
            {leaves.map((leave) => (
              <tr key={leave.id} className="border-b border-slate-700/50 hover:bg-slate-800/20">
                <td className="p-4 font-bold text-white">{leave.name}</td>
                <td className="p-4 text-slate-400">{leave.role}</td>
                <td className="p-4 font-mono text-slate-300">{leave.date}</td>
                <td className="p-4 text-slate-400">{leave.reason}</td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    leave.status === 'Approved' ? 'text-emerald-400 bg-emerald-500/10' : 
                    leave.status === 'Pending' ? 'text-orange-400 bg-orange-500/10' : 'text-red-400 bg-red-500/10'
                  }`}>
                    {leave.status}
                  </span>
                </td>
                {user.role === 'admin' && (
                  <td className="p-4 text-right">
                    {leave.status === 'Pending' && (
                      <>
                        <button className="text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 px-2 py-1 rounded text-xs mr-2">Approve</button>
                        <button className="text-red-400 hover:text-red-300 border border-red-500/30 px-2 py-1 rounded text-xs">Reject</button>
                      </>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E293B] border border-slate-600 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Leave Application</h2>
            <form onSubmit={(e) => { e.preventDefault(); setIsModalOpen(false); }} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Date</label>
                <input type="date" required className="w-full bg-[#0F172A] border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Reason</label>
                <textarea required rows="3" className="w-full bg-[#0F172A] border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"></textarea>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-800 text-white py-2 rounded-lg">Cancel</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}