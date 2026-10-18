import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";

const DEFAULT_GALLERY_PHOTOS = [];

const CATEGORIES = [
  "ALL",
  "SPORTS",
  "ACADEMICS",
  "CULTURAL EVENTS",
  "SCIENCE & TECH",
  "COMMUNITY",
];

const CATEGORY_COLORS = {
  SPORTS: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  ACADEMICS: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "CULTURAL EVENTS": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "SCIENCE & TECH": "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  COMMUNITY: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

export default function StudentGallery() {
  const { user, tenant } = useContext(AppContext) || {};
  const { showToast } = useToast();

  const activeSchoolId = user?.institution_code || user?.school_id || tenant?.code || "CAMPUS-01";
  const userRole = (user?.role || "").toLowerCase();
  const canUpload = ["teacher", "principal", "trustee", "admin"].includes(userRole);

  const [photos, setPhotos] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null);

  // Upload Form State
  const [formCategory, setFormCategory] = useState("SPORTS");
  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState("October 2026");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formEmoji, setFormEmoji] = useState("📸");
  const [uploading, setUploading] = useState(false);

  const loadPhotos = () => {
    try {
      const storageKey = `erp_campus_gallery_${activeSchoolId}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setPhotos(JSON.parse(saved));
      } else {
        setPhotos([]);
      }
    } catch (err) {
      console.warn("Failed to load campus gallery:", err);
      setPhotos([]);
    }
  };

  useEffect(() => {
    loadPhotos();

    const handleUpdate = () => loadPhotos();
    window.addEventListener("erp-gallery-updated", handleUpdate);
    return () => window.removeEventListener("erp-gallery-updated", handleUpdate);
  }, [activeSchoolId]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match("image.*")) {
      showToast("Please choose a valid image file (.png, .jpg, .jpeg, .webp).", "error");
      return;
    }

    // Limit to 5MB
    if (file.size > 5 * 1024 * 1024) {
      showToast("Selected image is larger than 5MB. Please choose a smaller file.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setFormImageUrl(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadSubmit = (e) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showToast("Please enter a photo event title.", "error");
      return;
    }

    setUploading(true);

    const newPhoto = {
      id: Date.now(),
      title: formTitle.trim(),
      category: formCategory,
      image: formEmoji || "📸",
      imageUrl: formImageUrl || null,
      date: formDate.trim() || "October 2026",
      uploadedBy: user?.name || (userRole ? userRole.toUpperCase() : "Faculty"),
      school_id: activeSchoolId,
    };

    try {
      const storageKey = `erp_campus_gallery_${activeSchoolId}`;
      const existing = JSON.parse(localStorage.getItem(storageKey) || "[]");
      const updated = [newPhoto, ...existing];
      localStorage.setItem(storageKey, JSON.stringify(updated));
      localStorage.setItem("erp_campus_gallery", JSON.stringify(updated));

      // Trigger custom sync event
      window.dispatchEvent(new Event("erp-gallery-updated"));

      setPhotos(updated);
      setIsUploadModalOpen(false);
      setFormTitle("");
      setFormImageUrl("");
      setFormEmoji("📸");

      showToast("Photo published to institutional gallery successfully!", "success");
    } catch (err) {
      console.error("Gallery upload error:", err);
      showToast("Failed to save photo to gallery.", "error");
    } finally {
      setUploading(false);
    }
  };

  const filteredPhotos = photos.filter((p) => {
    if (selectedCategory === "ALL") return true;
    return p.category === selectedCategory;
  });

  return (
    <div className="relative text-slate-200 min-h-full pb-10 font-sans">
      <div className="fixed top-0 left-10 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-6xl mx-auto space-y-8">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <p className="text-purple-300 text-sm font-semibold mb-1 uppercase tracking-widest">
              Campus Life & Archives
            </p>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
              Campus Photo Gallery 📸
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Explore and preserve memorable moments, sports feats, and academic achievements
            </p>
          </div>

          {canUpload && (
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold px-5 py-3 rounded-2xl shadow-lg shadow-purple-600/30 transition-all cursor-pointer flex items-center gap-2"
            >
              <span>📸</span>
              <span>Upload Campus Photo</span>
            </button>
          )}
        </div>

        {/* CATEGORY FILTER PILLS */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                  : "bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700/60"
              }`}
            >
              {cat === "ALL" ? "✨ All Moments" : cat}
            </button>
          ))}
        </div>

        {/* GALLERY GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPhotos.length === 0 ? (
            <div className="col-span-full bg-[#1E293B]/70 border border-slate-700/60 rounded-3xl p-12 text-center text-slate-400 space-y-3">
              <span className="text-5xl">📷</span>
              <h3 className="text-lg font-bold text-white">No photos in this category</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No events have been tagged under this category yet.
              </p>
            </div>
          ) : (
            filteredPhotos.map((item) => (
              <div
                key={item.id}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-2xl flex flex-col justify-between group hover:border-purple-500/50 hover:bg-white/[0.08] transition-all"
              >
                <div>
                  {/* PHOTO / VISUAL CONTAINER */}
                  <div
                    onClick={() => setPreviewPhoto(item)}
                    className="w-full h-48 rounded-2xl bg-slate-900/90 border border-slate-700/80 overflow-hidden flex items-center justify-center mb-4 group-hover:scale-[1.02] transition-transform cursor-pointer shadow-inner relative"
                  >
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-6xl select-none">{item.image || "📸"}</span>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5 backdrop-blur-[2px]">
                      <span>🔍</span> Expand Preview
                    </div>
                  </div>

                  {/* METADATA */}
                  <div className="flex justify-between items-center mb-2">
                    <span
                      className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border ${
                        CATEGORY_COLORS[item.category] || "bg-purple-500/20 text-purple-400 border-purple-500/30"
                      }`}
                    >
                      {item.category}
                    </span>
                    <span className="text-slate-400 text-xs font-mono font-medium">{item.date}</span>
                  </div>

                  <h3 className="text-base font-bold text-white mb-2 line-clamp-2 group-hover:text-purple-300 transition-colors">
                    {item.title}
                  </h3>
                  {item.uploadedBy && (
                    <p className="text-[11px] text-slate-400 mb-4">
                      By <span className="text-slate-300 font-semibold">{item.uploadedBy}</span>
                    </p>
                  )}
                </div>

                <button
                  onClick={() => setPreviewPhoto(item)}
                  className="w-full bg-slate-800/90 hover:bg-purple-600 text-white font-bold py-2.5 px-4 rounded-xl transition-all border border-slate-700 hover:border-purple-500 text-xs flex items-center justify-center gap-2 cursor-pointer shadow"
                >
                  <span>🔍</span> View Full Resolution
                </button>
              </div>
            ))
          )}
        </div>

        {/* UPLOAD PHOTO MODAL */}
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
            <div className="bg-[#1E293B] border border-slate-700/80 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center border-b border-slate-700/60 pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl p-2 bg-purple-500/20 text-purple-400 rounded-xl">
                    📸
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-white">Upload Campus Photo</h3>
                    <p className="text-xs text-slate-400">
                      Publish institutional events and milestone memories
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsUploadModalOpen(false)}
                  className="text-slate-400 hover:text-white text-2xl font-bold cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleUploadSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Event Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm font-semibold focus:outline-none focus:border-purple-500"
                  >
                    <option value="SPORTS">SPORTS</option>
                    <option value="ACADEMICS">ACADEMICS</option>
                    <option value="CULTURAL EVENTS">CULTURAL EVENTS</option>
                    <option value="SCIENCE & TECH">SCIENCE & TECH</option>
                    <option value="COMMUNITY">COMMUNITY</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Photo Title / Event Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Inter-House Athletic Meet 2026 Finals"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Event Month & Year
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. October 2026"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Event Icon / Badge
                    </label>
                    <select
                      value={formEmoji}
                      onChange={(e) => setFormEmoji(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm font-bold focus:outline-none focus:border-purple-500"
                    >
                      <option value="📸">📸 Camera</option>
                      <option value="🏆">🏆 Trophy</option>
                      <option value="🔬">🔬 Science</option>
                      <option value="🎨">🎨 Art & Culture</option>
                      <option value="💻">💻 Computer/Tech</option>
                      <option value="🌱">🌱 Environment</option>
                      <option value="📚">📚 Academics</option>
                      <option value="⚽">⚽ Football/Sports</option>
                      <option value="🎭">🎭 Drama/Theatre</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Upload Photo File (.png, .jpg, .jpeg, .webp)
                  </label>
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp"
                    onChange={handleFileSelect}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-purple-600 file:text-white hover:file:bg-purple-500 cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Images are processed in-browser and converted to secure DataURLs.
                  </p>
                </div>

                {/* IMAGE PREVIEW */}
                {formImageUrl && (
                  <div className="rounded-2xl border border-slate-700 p-2 bg-slate-900">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Preview</p>
                    <img
                      src={formImageUrl}
                      alt="Upload Preview"
                      className="w-full h-40 object-cover rounded-xl"
                    />
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-700/60">
                  <button
                    type="button"
                    onClick={() => setIsUploadModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl text-slate-400 hover:text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-extrabold px-6 py-2.5 rounded-xl shadow-lg shadow-purple-600/30 text-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {uploading ? "Publishing..." : "Publish to Gallery 🚀"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* FULL RESOLUTION PREVIEW MODAL */}
        {previewPhoto && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
            onClick={() => setPreviewPhoto(null)}
          >
            <div
              className="bg-[#1E293B] border border-slate-700 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center border-b border-slate-700 pb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border ${
                      CATEGORY_COLORS[previewPhoto.category] || "bg-purple-500/20 text-purple-400 border-purple-500/30"
                    }`}
                  >
                    {previewPhoto.category}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">{previewPhoto.date}</span>
                </div>
                <button
                  onClick={() => setPreviewPhoto(null)}
                  className="text-slate-400 hover:text-white text-2xl font-bold cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <div className="w-full max-h-[60vh] rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center">
                {previewPhoto.imageUrl ? (
                  <img
                    src={previewPhoto.imageUrl}
                    alt={previewPhoto.title}
                    className="w-full h-full object-contain max-h-[60vh]"
                  />
                ) : (
                  <div className="py-20 text-center">
                    <span className="text-8xl">{previewPhoto.image || "📸"}</span>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">{previewPhoto.title}</h3>
                {previewPhoto.uploadedBy && (
                  <p className="text-xs text-slate-400 mt-1">
                    Archived by: <span className="text-purple-300 font-medium">{previewPhoto.uploadedBy}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}