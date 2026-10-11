import React, { useState } from "react";
import { supabase } from "../supabaseClient";

export default function AddTeacherModal({ isOpen, onClose, onRefresh }) {
  const [formData, setFormData] = useState({ name: "", email: "", subject: "" });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from("teachers").insert([{
        school_id: "school-demo-01",
        name: formData.name,
        email: formData.email,
        subject: formData.subject,
        is_active: true
      }]);

      if (error) throw error;

      alert("Teacher added successfully!");
      onRefresh(); // Updates the dashboard stats instantly
      onClose();   // Closes the popup
    } catch (error) {
      console.error("Database Error:", error);
      alert("Failed to add teacher.");
    } finally {
      setLoading(false);
      setFormData({ name: "", email: "", subject: "" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1E293B] border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        
        <div className="bg-slate-800/50 p-6 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Add New Teacher</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors text-2xl leading-none">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
            <input 
              type="text" required placeholder="e.g., Satwik" 
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
              value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
            <input 
              type="email" required placeholder="e.g., satwik@school.com" 
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
              value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Subject Specialty</label>
            <input 
              type="text" required placeholder="e.g., Mathematics" 
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
              value={formData.subject} onChange={(e) => setFormData({...formData, subject: e.target.value})}
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg shadow-purple-600/20 disabled:opacity-50 transition-colors">
              {loading ? "Saving..." : "Add Teacher"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}