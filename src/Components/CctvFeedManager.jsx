import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { logSecurityAction } from "../utils/auditLogger";

export default function CctvFeedManager({ schoolId: propSchoolId }) {
  const { user } = useContext(AppContext);
  const { showToast } = useToast();
  const schoolId = propSchoolId || user?.school_id || user?.institution_code || "CAMPUS-01";

  const [cameras, setCameras] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCam, setSelectedCam] = useState(null);

  const [form, setForm] = useState({
    name: "",
    location: "Main Gate Entrance",
    streamUrl: "",
    status: "Online",
    resolution: "1080p FHD (30 FPS)",
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`erp_cctv_feeds_${schoolId}`);
      if (saved) {
        setCameras(JSON.parse(saved));
      } else {
        setCameras([]);
      }
    } catch (e) {
      setCameras([]);
    }
  }, [schoolId]);

  const handleAddCamera = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast("Please provide camera name / identifier.", "error");
      return;
    }

    const newCam = {
      id: `cam_${Date.now()}`,
      name: form.name.trim(),
      location: form.location,
      streamUrl: form.streamUrl.trim() || "rtsp://192.168.1.100:554/live/ch0",
      status: form.status,
      resolution: form.resolution,
      installedOn: new Date().toISOString().split("T")[0],
    };

    const updated = [newCam, ...cameras];
    setCameras(updated);
    try {
      localStorage.setItem(`erp_cctv_feeds_${schoolId}`, JSON.stringify(updated));
    } catch (e) {}

    logSecurityAction({
      action: "CCTV Surveillance Node Registered",
      entityType: "SECURITY",
      entityId: newCam.name,
      details: `Installed camera node "${newCam.name}" at location ${newCam.location}`,
      user,
      schoolId,
    });

    showToast(`Camera feed "${newCam.name}" connected successfully!`, "success");
    setForm({
      name: "",
      location: "Main Gate Entrance",
      streamUrl: "",
      status: "Online",
      resolution: "1080p FHD (30 FPS)",
    });
    setShowAddModal(false);
  };

  const handleRemoveCamera = (id, name) => {
    const updated = cameras.filter((c) => c.id !== id);
    setCameras(updated);
    try {
      localStorage.setItem(`erp_cctv_feeds_${schoolId}`, JSON.stringify(updated));
    } catch (e) {}

    logSecurityAction({
      action: "CCTV Surveillance Node Removed",
      entityType: "SECURITY",
      entityId: id,
      details: `Archived camera node: ${name || id}`,
      user,
      schoolId,
    });

    showToast(`Camera node "${name || "Camera"}" unlinked from hub.`, "info");
    if (selectedCam?.id === id) setSelectedCam(null);
  };

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-[#1E293B]/80 backdrop-blur-xl border border-slate-700/70 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            Campus Surveillance & Guard Hub
          </div>
          <h2 className="text-2xl font-black text-white">Live Campus CCTV Feed Hub 📹</h2>
          <p className="text-slate-400 text-sm mt-1 max-w-xl">
            Configure institutional IP/RTSP camera streams, gate entrance cameras, and classroom examination feeds.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm shadow-lg shadow-rose-600/30 transition-all cursor-pointer flex items-center gap-2"
          >
            <span>➕</span>
            <span>Connect Camera Node</span>
          </button>
        </div>
      </div>

      {/* CAMERA GRID */}
      {cameras.length === 0 ? (
        <div className="bg-[#1E293B]/80 border border-slate-700/70 rounded-3xl p-12 text-center text-slate-400 space-y-3 shadow-xl">
          <span className="text-5xl block opacity-60">📹</span>
          <h3 className="text-lg font-bold text-white">No CCTV Camera Feeds Configured (Clean Slate)</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Your surveillance hub is ready. Click "Connect Camera Node" above to register IP stream URLs or physical camera locations.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer mt-2"
          >
            + Register First Camera
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cameras.map((cam) => (
            <div
              key={cam.id}
              className="bg-[#1E293B]/80 border border-slate-700/70 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between group hover:border-rose-500/40 transition-all"
            >
              {/* VIDEO STREAM SIMULATION SCREEN */}
              <div className="relative bg-slate-950 h-48 flex items-center justify-center border-b border-slate-800">
                <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
                  <span className="text-[10px] font-black uppercase text-rose-400 tracking-wider bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm">
                    ● REC / LIVE
                  </span>
                </div>
                <div className="absolute top-3 right-3 text-[10px] font-mono font-bold text-slate-400 bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm">
                  {cam.resolution}
                </div>

                <div className="text-center p-4">
                  <span className="text-4xl block mb-1">📹</span>
                  <p className="text-xs font-bold text-slate-300 font-mono line-clamp-1">{cam.streamUrl}</p>
                  <p className="text-[11px] text-emerald-400 font-bold mt-1">Status: {cam.status}</p>
                </div>

                <div className="absolute bottom-2 left-3 text-[10px] text-slate-400 font-mono bg-black/60 px-2 py-0.5 rounded">
                  {cam.location}
                </div>
              </div>

              {/* CARD DETAILS */}
              <div className="p-5 flex justify-between items-center bg-slate-900/40">
                <div>
                  <h4 className="font-bold text-white text-base">{cam.name}</h4>
                  <p className="text-xs text-slate-400">Node ID: {cam.id.slice(-6)} &bull; {cam.location}</p>
                </div>
                <button
                  onClick={() => handleRemoveCamera(cam.id, cam.name)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  title="Disconnect camera"
                >
                  🗑️ Unlink
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD CAMERA MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#1E293B] border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-extrabold text-white mb-1">Connect CCTV Surveillance Node 📹</h3>
            <p className="text-xs text-slate-400 mb-6">Register camera network streaming link or IP camera checkpoint.</p>

            <form onSubmit={handleAddCamera} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Camera Identifier *</label>
                <input
                  type="text"
                  placeholder="e.g. Main Gate Entrance 01"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Physical Location</label>
                <select
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="Main Gate Entrance">Main Gate Entrance</option>
                  <option value="Administration Lobby">Administration Lobby</option>
                  <option value="Computer & Science Labs">Computer & Science Labs</option>
                  <option value="Playground & Sports Field">Playground & Sports Field</option>
                  <option value="Classroom Corridor Floor 1">Classroom Corridor Floor 1</option>
                  <option value="Auditorium & Seminar Hall">Auditorium & Seminar Hall</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">RTSP Stream / IP Feed URL</label>
                <input
                  type="text"
                  placeholder="e.g. rtsp://192.168.1.120:554/live/ch0"
                  value={form.streamUrl}
                  onChange={(e) => setForm({ ...form, streamUrl: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="Online">Online (Streaming)</option>
                    <option value="Standby">Standby</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Resolution</label>
                  <select
                    value={form.resolution}
                    onChange={(e) => setForm({ ...form, resolution: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="1080p FHD (30 FPS)">1080p FHD (30 FPS)</option>
                    <option value="4K UHD (60 FPS)">4K UHD (60 FPS)</option>
                    <option value="720p HD">720p HD</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-lg transition-all cursor-pointer"
                >
                  Link Camera Stream
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

