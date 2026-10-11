import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { supabase } from "../supabaseClient";

export default function TeacherHomework() {
  const { user } = useContext(AppContext);
  const [classes, setClasses] = useState([]);
  const [homeworkList, setHomeworkList] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    subject: "",
    description: "",
    due_date: "",
    class_id: ""
  });

  // Fetch data on page load
  useEffect(() => {
    fetchClasses();
    fetchHomework();
  }, []);

  const fetchClasses = async () => {
    const { data } = await supabase.from("classes").select("*");
    if (data) setClasses(data);
  };

  const fetchHomework = async () => {
    const { data } = await supabase.from("homework").select("*").order('created_at', { ascending: false });
    if (data) setHomeworkList(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { error } = await supabase.from("homework").insert([{
        school_id: user?.school_id || "school-demo-01",
        teacher_id: user?.id,
        title: formData.title,
        subject: formData.subject,
        description: formData.description,
        due_date: formData.due_date,
        class_id: formData.class_id
      }]);

      if (error) throw error;
      
      alert("Homework assigned successfully!");
      setFormData({ title: "", subject: "", description: "", due_date: "", class_id: "" });
      fetchHomework(); // Refresh the list instantly
    } catch (error) {
      console.error("Database error:", error);
      alert("Failed to assign homework.");
    } finally {
      setLoading(false);
    }
  };

  // Helper to map the class ID back to a readable class name
  const getClassName = (id) => {
    const cls = classes.find(c => c.id === id);
    return cls ? `Class ${cls.name}` : "Unknown Class";
  };

  return (
    <div className="relative text-slate-200 min-h-full pb-10">
      <div className="fixed top-0 left-10 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="relative z-10">
        <div className="mb-8">
          <p className="text-blue-300 text-sm font-semibold mb-1 uppercase tracking-widest">Faculty Operations</p>
          <h1 className="text-3xl font-extrabold text-white">Upload Homework 📚</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT: ASSIGNMENT FORM */}
          <div className="lg:col-span-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl h-fit">
            <h2 className="text-xl font-bold text-white mb-6">Create Assignment</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Target Class</label>
                <select 
                  required 
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500" 
                  value={formData.class_id} 
                  onChange={(e) => setFormData({...formData, class_id: e.target.value})}
                >
                  <option value="">Select a Class...</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>Class {cls.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Subject</label>
                <input 
                  type="text" required placeholder="e.g., Mathematics" 
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500" 
                  value={formData.subject} onChange={(e) => setFormData({...formData, subject: e.target.value})} 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Topic / Title</label>
                <input 
                  type="text" required placeholder="e.g., Algebra Chapter 4" 
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500" 
                  value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Due Date</label>
                <input 
                  type="date" required 
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 [color-scheme:dark]" 
                  value={formData.due_date} onChange={(e) => setFormData({...formData, due_date: e.target.value})} 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Instructions</label>
                <textarea 
                  required placeholder="Write the assignment details here..." rows="3" 
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500" 
                  value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}
                ></textarea>
              </div>

              <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-4 rounded-xl shadow-lg shadow-blue-600/20 disabled:opacity-50 transition-all mt-4">
                {loading ? "Publishing..." : "Publish Homework"}
              </button>
            </form>
          </div>

          {/* RIGHT: RECENT ASSIGNMENTS LIST */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-bold text-white mb-6">Recent Assignments</h2>
            <div className="bg-[#1E293B] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
              {homeworkList.length === 0 ? (
                <div className="p-10 text-center text-slate-400">
                  <span className="text-4xl block mb-3 opacity-50">📂</span>
                  No homework assigned yet.
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-800/50 border-b border-slate-700 text-slate-400 text-sm">
                      <th className="p-5 font-bold">Subject / Title</th>
                      <th className="p-5 font-bold">Class</th>
                      <th className="p-5 font-bold">Due Date</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {homeworkList.map((hw, idx) => (
                      <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-800/30 transition-colors">
                        <td className="p-5">
                          <p className="font-bold text-white text-base">{hw.subject}</p>
                          <p className="text-slate-400 mt-1">{hw.title}</p>
                        </td>
                        <td className="p-5">
                          <span className="bg-slate-700 text-slate-300 px-3 py-1 rounded-lg text-xs font-bold">
                            {getClassName(hw.class_id)}
                          </span>
                        </td>
                        <td className="p-5 text-orange-400 font-bold">{hw.due_date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}