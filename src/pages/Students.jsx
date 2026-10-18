import { useState } from "react";

export default function Students() {
  const [searchTerm, setSearchTerm] = useState("");
  const [classFilter, setClassFilter] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Mock Student Data
  const [students, setStudents] = useState([
    { id: 1, roll: "101", name: "Raj Kumar", class: "10-A", contact: "+91 9876543210", status: "Active" },
    { id: 2, roll: "102", name: "Priya Singh", class: "10-A", contact: "+91 9876543211", status: "Active" },
    { id: 3, roll: "205", name: "Amit Patel", class: "9-B", contact: "+91 9876543212", status: "Inactive" },
    { id: 4, roll: "301", name: "Neha Sharma", class: "11-Sci", contact: "+91 9876543213", status: "Active" },
    { id: 5, roll: "105", name: "Aarush Verma", class: "10-A", contact: "+91 9876543214", status: "Active" },
  ]);

  // Filtering Logic
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) || student.roll.includes(searchTerm);
    const matchesClass = classFilter === "All" || student.class === classFilter;
    return matchesSearch && matchesClass;
  });

  return (
    <div className="text-slate-200 relative">
      
      {/* HEADER */}
      <div className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Student Management</h1>
          <p className="text-slate-400 mt-1">Manage enrollments, profiles, and directories</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-all shadow-lg">
            📥 Import CSV
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-all shadow-lg shadow-blue-600/20"
          >
            + Add New Student
          </button>
        </div>
      </div>

      {/* FILTERS & SEARCH */}
      <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-4 shadow-lg mb-6 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-96">
          <span className="absolute left-3 top-2.5 text-slate-400">🔍</span>
          <input 
            type="text" 
            placeholder="Search by name or roll number..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0F172A] border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all text-sm"
          />
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-sm font-semibold text-slate-400 whitespace-nowrap">Filter Class:</label>
          <select 
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="bg-[#0F172A] border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-all text-sm w-full sm:w-auto"
          >
            <option value="All">All Classes</option>
            <option value="9-B">9-B</option>
            <option value="10-A">10-A</option>
            <option value="11-Sci">11-Sci</option>
          </select>
        </div>
      </div>

      {/* STUDENT TABLE */}
      <div className="bg-[#1E293B] border border-slate-700 rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/50 border-b border-slate-700 text-slate-300 text-sm">
                <th className="p-4 font-semibold">Roll No</th>
                <th className="p-4 font-semibold">Student Name</th>
                <th className="p-4 font-semibold">Class</th>
                <th className="p-4 font-semibold">Guardian Contact</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="border-b border-slate-700/50 hover:bg-slate-800/20 transition-colors">
                    <td className="p-4 font-mono text-slate-400">{student.roll}</td>
                    <td className="p-4 font-semibold text-white">{student.name}</td>
                    <td className="p-4">
                      <span className="bg-slate-800 border border-slate-600 px-2 py-1 rounded text-xs text-blue-400 font-semibold">
                        {student.class}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400">{student.contact}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        student.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {student.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button className="text-blue-400 hover:text-blue-300 p-1 mx-1 transition-colors" title="Edit">✏️</button>
                      <button className="text-red-400 hover:text-red-300 p-1 mx-1 transition-colors" title="Delete">🗑️</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500">
                    No students found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-700 text-xs text-slate-500 flex justify-between items-center">
          <span>Showing {filteredStudents.length} of {students.length} students</span>
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-[#0F172A] border border-slate-600 rounded hover:bg-slate-800 disabled:opacity-50" disabled>Previous</button>
            <button className="px-3 py-1 bg-[#0F172A] border border-slate-600 rounded hover:bg-slate-800 disabled:opacity-50" disabled>Next</button>
          </div>
        </div>
      </div>

      {/* ADD STUDENT MODAL (OVERLAY) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E293B] border border-slate-600 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="flex justify-between items-center p-6 border-b border-slate-700 bg-slate-800/50">
              <h2 className="text-lg font-bold text-white">Enroll New Student</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                ✕
              </button>
            </div>
            
            <form className="p-6 space-y-4" onSubmit={(e) => { e.preventDefault(); setIsModalOpen(false); }}>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Full Name</label>
                <input type="text" required placeholder="e.g. Rahul Sharma" className="w-full bg-[#0F172A] border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Class/Section</label>
                  <select className="w-full bg-[#0F172A] border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500">
                    <option>10-A</option>
                    <option>9-B</option>
                    <option>11-Sci</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Roll Number</label>
                  <input type="text" required placeholder="e.g. 106" className="w-full bg-[#0F172A] border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Guardian Contact</label>
                <input type="tel" required placeholder="+91" className="w-full bg-[#0F172A] border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Base Annual Fee (₹)</label>
                <input type="number" required placeholder="50000" className="w-full bg-[#0F172A] border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500" />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 rounded-lg border border-slate-600 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg shadow-lg shadow-blue-600/20 transition-colors">
                  Save Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
    </div>
  );
}