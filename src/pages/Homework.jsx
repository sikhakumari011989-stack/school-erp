import { useContext, useState } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";

export default function Homework() {
  const { homework, uploadHomework, getClassHomework, classes, user } = useContext(AppContext);
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    class_id: "",
    subject: "",
    title: "",
    description: "",
    due_date: "",
    file_url: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await uploadHomework(formData);
    setFormData({ class_id: "", subject: "", title: "", description: "", due_date: "", file_url: "" });
    showToast("Homework uploaded successfully!", "success");
  };

  const classHomework = formData.class_id ? getClassHomework(formData.class_id) : homework;

  return (
    <div className="p-8 bg-gradient-to-br from-slate-900 to-slate-800 min-h-screen">
      <h1 className="text-4xl font-bold text-white mb-8">📚 Homework</h1>

      {/* Upload Form - Teacher Only */}
      {user?.role === "teacher" && (
        <div className="bg-slate-700/50 border border-slate-600/50 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Upload Homework</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <select
                name="class_id"
                value={formData.class_id}
                onChange={handleChange}
                className="px-4 py-2 bg-slate-600/50 border border-slate-500/50 rounded-lg text-white"
              >
                <option value="">Select Class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <input
                type="text"
                name="subject"
                placeholder="Subject"
                value={formData.subject}
                onChange={handleChange}
                className="px-4 py-2 bg-slate-600/50 border border-slate-500/50 rounded-lg text-white"
              />
            </div>

            <input
              type="text"
              name="title"
              placeholder="Homework Title"
              value={formData.title}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-slate-600/50 border border-slate-500/50 rounded-lg text-white"
            />

            <textarea
              name="description"
              placeholder="Description"
              value={formData.description}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-slate-600/50 border border-slate-500/50 rounded-lg text-white"
            />

            <div className="grid grid-cols-2 gap-4">
              <input
                type="date"
                name="due_date"
                value={formData.due_date}
                onChange={handleChange}
                className="px-4 py-2 bg-slate-600/50 border border-slate-500/50 rounded-lg text-white"
              />

              <input
                type="text"
                name="file_url"
                placeholder="File URL (optional)"
                value={formData.file_url}
                onChange={handleChange}
                className="px-4 py-2 bg-slate-600/50 border border-slate-500/50 rounded-lg text-white"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-lg transition"
            >
              📤 Upload Homework
            </button>
          </form>
        </div>
      )}

      {/* Homework List */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-white mb-4">📋 Your Homework</h2>
        {classHomework.length === 0 ? (
          <p className="text-slate-400">No homework yet.</p>
        ) : (
          classHomework.map((hw) => (
            <div
              key={hw.id}
              className="bg-slate-700/50 border border-slate-600/50 rounded-xl p-6 hover:border-cyan-500/50 transition"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-white">{hw.title}</h3>
                  <p className="text-slate-400">{hw.subject}</p>
                  <p className="text-slate-300 mt-2">{hw.description}</p>
                  {hw.due_date && (
                    <p className="text-red-400 mt-2">
                      📅 Due: {new Date(hw.due_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
                {hw.file_url && (
                  <a
                    href={hw.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                  >
                    📥 Download
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}