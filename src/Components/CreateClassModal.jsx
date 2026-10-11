import React, { useState } from "react";
import { supabase } from "../supabaseClient";

export default function CreateClassModal({ isOpen, onClose, onRefresh }) {
  const [formData, setFormData] = useState({ grade: "", section: "" });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Auto-generate the class name (e.g. "10-A")
    const className = `${formData.grade}-${formData.section}`;

    try {
      const { error } = await supabase.from("classes").insert([{
        school_id: "school-demo-01",
        grade: formData.grade,
        section: formData.section,
        name: className
      }]);

      if (error) throw error;

      alert(`Class ${className} created successfully!`);
      onRefresh(); // Updates the dashboard stats instantly
      onClose();   // Closes the popup
    } catch (error) {
      console.error("Database Error:", error);
      alert("Failed to create class. Check console for details.");
    } finally {
      setLoading(false);
      setFormData({ grade: "", section: "" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1E293B] border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="bg-slate-800/50 p-6 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Create New Class</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors text-2xl leading-none">
            &times;
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Grade / Standard</label>
            <input 
              type="text" 
              required
              placeholder="e.g., 10" 
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              value={formData.grade}
              onChange={(e) => setFormData({...formData, grade: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Section</label>
            <input 
              type="text" 
              required
              placeholder="e.g., A" 
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              value={formData.section}
              onChange={(e) => setFormData({...formData, section: e.target.value})}
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-lg transition-colors border border-slate-700"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Class"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}