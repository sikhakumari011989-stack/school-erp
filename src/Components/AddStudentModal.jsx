import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export default function AddStudentModal({ isOpen, onClose, onRefresh }) {
  const [formData, setFormData] = useState({ name: "", roll_number: "", class_id: "" });
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch available classes when the modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchClasses = async () => {
        const { data } = await supabase.from("classes").select("*");
        if (data) setClasses(data);
      };
      fetchClasses();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from("students").insert([{
        school_id: "school-demo-01",
        name: formData.name,
        roll_number: formData.roll_number,
        class_id: formData.class_id
      }]);

      if (error) throw error;

      alert("Student added successfully!");
      onRefresh(); // Updates the dashboard numbers
      onClose();   // Closes the popup
    } catch (error) {
      console.error("Database Error:", error);
      alert("Failed to add student.");
    } finally {
      setLoading(false);
      setFormData({ name: "", roll_number: "", class_id: "" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1E293B] border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        
        <div className="bg-slate-800/50 p-6 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Add New Student</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors text-2xl leading-none">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
            <input 
              type="text" required placeholder="e.g., John Doe" 
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
              value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Roll Number</label>
            <input 
              type="text" required placeholder="e.g., 42" 
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
              value={formData.roll_number} onChange={(e) => setFormData({...formData, roll_number: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Assign Class</label>
            <select 
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
              value={formData.class_id} onChange={(e) => setFormData({...formData, class_id: e.target.value})}
            >
              <option value="">Select a Class...</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>Class {cls.name}</option>
              ))}
            </select>
          </div>

          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-lg">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg shadow-blue-600/20 disabled:opacity-50">
              {loading ? "Saving..." : "Add Student"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}