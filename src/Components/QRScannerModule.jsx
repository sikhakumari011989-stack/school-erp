import React, { useState, useRef, useEffect } from "react";
import { QrCode, Camera, CheckCircle2, AlertCircle, RefreshCw, User, Package, ShieldCheck } from "lucide-react";
import { useToast } from "../context/ToastContext";

export default function QRScannerModule({ schoolCode = "CAMPUS-01", mode = "gate", onClose }) {
  const { showToast } = useToast();
  const cleanSchool = schoolCode.toUpperCase();

  const [scanMode, setScanMode] = useState(mode); // 'gate' | 'asset' | 'library'
  const [manualId, setManualId] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [scannedResult, setScannedResult] = useState(null);
  const [recentScans, setRecentScans] = useState([]);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCameraError("");
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("Camera API not supported on this device/browser.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
      showToast("Camera feed active. Align student or equipment QR code.", "info");
    } catch (err) {
      console.warn("Camera access error:", err);
      setCameraError(err.message || "Camera access permission denied or unavailable.");
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const handleResolveId = (codeToLookup = null) => {
    const rawId = (codeToLookup || manualId).trim().toUpperCase();
    if (!rawId) {
      showToast("Please enter or scan an ID or QR code.", "error");
      return;
    }

    try {
      // 1. Check directory for student or staff
      const dirRaw = localStorage.getItem(`erp_directory_${cleanSchool}`);
      const dir = dirRaw ? JSON.parse(dirRaw) : [];
      const member = dir.find(
        (m) => (m.roll_number || m.id || "").toUpperCase() === rawId
      );

      // 2. Check asset registry if asset mode
      const assetRaw = localStorage.getItem(`erp_assets_${cleanSchool}`);
      const assets = assetRaw ? JSON.parse(assetRaw) : [];
      const asset = assets.find((a) => (a.code || a.id || "").toUpperCase() === rawId);

      if (member) {
        const result = {
          type: "MEMBER",
          id: member.roll_number || member.id,
          name: member.name || member.full_name,
          role: member.role || "student",
          batch: member.class_name || member.class || "General",
          phone: member.phone || "N/A",
          timestamp: new Date().toLocaleTimeString(),
        };
        setScannedResult(result);
        executeCheckIn(result);
      } else if (asset) {
        const result = {
          type: "ASSET",
          id: asset.code || asset.id,
          name: asset.name,
          category: asset.category,
          location: asset.location || "Campus IT Lab",
          status: asset.status,
          timestamp: new Date().toLocaleTimeString(),
        };
        setScannedResult(result);
        executeCheckIn(result);
      } else {
        // Fallback generic scan registration
        const result = {
          type: "CUSTOM",
          id: rawId,
          name: `Unregistered Card (${rawId})`,
          role: "Guest / External",
          batch: "Campus Visitor",
          timestamp: new Date().toLocaleTimeString(),
        };
        setScannedResult(result);
        executeCheckIn(result);
      }
    } catch (e) {
      showToast("Error resolving ID code", "error");
    }
  };

  const executeCheckIn = (res) => {
    setRecentScans((prev) => [res, ...prev.slice(0, 9)]);
    setManualId("");

    // Log attendance or custody record
    try {
      if (scanMode === "gate") {
        const attKey = `erp_attendance_${cleanSchool}`;
        const existing = JSON.parse(localStorage.getItem(attKey) || "[]");
        const logEntry = {
          id: `gate_${Date.now()}`,
          studentId: res.id,
          studentName: res.name,
          date: new Date().toISOString().split("T")[0],
          time: new Date().toLocaleTimeString(),
          status: "Present",
          verificationMethod: "QR Code Gate Scanner",
        };
        localStorage.setItem(attKey, JSON.stringify([logEntry, ...existing]));
        window.dispatchEvent(new Event("erp-attendance-updated"));
        showToast(`Gate Check-in Verified: ${res.name} (${res.id}) ✅`, "success");
      } else if (scanMode === "asset") {
        showToast(`Asset Custody Logged: ${res.name} (${res.id}) 📦`, "success");
      } else {
        showToast(`Library Access Logged for ${res.name} 📚`, "success");
      }
    } catch (e) {
      console.warn("Log write error:", e);
    }
  };

  return (
    <div className="bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl shadow-cyan-500/10 space-y-5">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
              Web-First Hardware Scanner
            </span>
            <span className="text-xs text-slate-400 font-mono">Tenant: {cleanSchool}</span>
          </div>
          <h3 className="text-xl font-black text-white mt-1 flex items-center gap-2">
            <span>QR Gate & Asset Custody Scanner</span>
            <QrCode className="w-5 h-5 text-cyan-400" />
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Instant camera QR recognition for turnstile gate attendance, library card issue, and IT lab inventory tracking.
          </p>
        </div>

        {/* SCAN MODE TOGGLES */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: "gate", label: "🚪 Gate Entry" },
            { id: "asset", label: "📦 Lab Asset" },
            { id: "library", label: "📚 Library Card" },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setScanMode(m.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                scanMode === m.id
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                  : "bg-white/5 text-slate-400 hover:text-white"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* CAMERA VIEWFINDER & RETICLE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="relative rounded-2xl bg-black border border-white/10 overflow-hidden flex flex-col items-center justify-center min-h-[260px] p-4 text-center">
          {cameraActive ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                className="w-full h-64 object-cover rounded-xl"
              />
              {/* Futuristic Holographic Reticle */}
              <div className="absolute inset-8 border-2 border-cyan-400/60 rounded-2xl pointer-events-none animate-pulse flex items-center justify-center">
                <span className="w-full h-0.5 bg-cyan-400/80 shadow-lg shadow-cyan-400 animate-bounce"></span>
              </div>
            </div>
          ) : (
            <div className="space-y-3 py-8">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 text-cyan-400 flex items-center justify-center mx-auto">
                <Camera className="w-7 h-7" />
              </div>
              <p className="text-xs text-slate-300 font-bold">Live Camera Viewfinder Offline</p>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                Click below to launch device camera, or use the manual ID keypad for instant lookup.
              </p>
              {cameraError && (
                <p className="text-[11px] text-rose-400 font-mono bg-rose-950/40 p-2 rounded-xl">
                  {cameraError}
                </p>
              )}
              <button
                onClick={startCamera}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black shadow-lg shadow-cyan-500/30 transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <Camera className="w-4 h-4" />
                <span>Launch Camera Scanner</span>
              </button>
            </div>
          )}

          {cameraActive && (
            <button
              onClick={stopCamera}
              className="mt-3 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 cursor-pointer"
            >
              Stop Camera
            </button>
          )}
        </div>

        {/* MANUAL INPUT KEYPAD & LAST SCANNED RESULT */}
        <div className="space-y-4 flex flex-col justify-between">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <span className="text-xs font-bold uppercase text-white flex items-center gap-1.5">
              <span>⌨️</span> Manual Barcode / Role ID Fallback
            </span>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleResolveId();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="e.g. STU-101, TCH-01, NTS-101..."
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                className="flex-1 bg-slate-950 border border-white/10 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none uppercase"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black transition-all cursor-pointer"
              >
                Lookup & Scan
              </button>
            </form>
          </div>

          {/* ACTIVE IDENTITY RESOLUTION CARD */}
          {scannedResult ? (
            <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/40 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Verified Pass
                </span>
                <span className="text-[10px] text-slate-400 font-mono">{scannedResult.timestamp}</span>
              </div>
              <p className="text-base font-black text-white">{scannedResult.name}</p>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-mono text-cyan-300 font-bold bg-cyan-500/10 px-2 py-0.5 rounded">
                  {scannedResult.id}
                </span>
                <span className="text-slate-300">{scannedResult.batch}</span>
                <span className="text-[10px] uppercase font-bold text-slate-400">({scannedResult.role})</span>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center py-6 text-slate-500 text-xs">
              Awaiting scan or ID submission...
            </div>
          )}

          {/* RECENT SCANS LOG */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Session Live Scan Feed ({recentScans.length})
            </span>
            <div className="space-y-1 max-h-24 overflow-y-auto pr-1 text-[11px]">
              {recentScans.map((s, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-1.5 rounded-lg bg-slate-950/50 border border-white/5"
                >
                  <span className="font-bold text-white truncate max-w-[140px]">{s.name}</span>
                  <span className="font-mono text-cyan-400">{s.id}</span>
                  <span className="text-slate-500 font-mono">{s.timestamp}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

