import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { supabase } from "../supabaseClient";
import BrandLogo from "./BrandLogo";

export default function CustomLogoUploader({ schoolCode, onLogoUpdated }) {
  const { user, tenant } = useContext(AppContext) || {};
  const { showToast } = useToast();

  const activeCode = (
    schoolCode ||
    user?.institution_code ||
    user?.school_id ||
    tenant?.code ||
    "CAMPUS-01"
  )
    .trim()
    .toUpperCase();

  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const stored =
        localStorage.getItem(`erp_logo_${activeCode}`) ||
        localStorage.getItem(`erp_school_logo_${activeCode}`);
      if (stored) {
        setPreview(stored);
      } else {
        setPreview(null);
      }
    } catch (e) {
      console.warn("Error reading stored logo:", e);
    }
  }, [activeCode]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Please select a valid image file (PNG, JPG, SVG, or WEBP).", "error");
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      showToast("Image size must be less than 3 MB.", "error");
      return;
    }

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result;
      if (!base64) {
        showToast("Failed to process image.", "error");
        setLoading(false);
        return;
      }

      try {
        // Persist to both required keys
        localStorage.setItem(`erp_logo_${activeCode}`, base64);
        localStorage.setItem(`erp_school_logo_${activeCode}`, base64);
        setPreview(base64);

        // Try Supabase cloud sync
        try {
          if (supabase) {
            await supabase
              .from("institutions")
              .update({ logo_url: base64 })
              .eq("code", activeCode);
          }
        } catch (dbErr) {
          console.warn("Supabase logo sync notice:", dbErr);
        }

        // Dispatch real-time event
        window.dispatchEvent(
          new CustomEvent("erp-logo-updated", {
            detail: { logoUrl: base64, schoolCode: activeCode },
          })
        );

        showToast("Institution logo uploaded & applied across portal!", "success");
        if (onLogoUpdated) onLogoUpdated(base64);
      } catch (err) {
        console.error("Logo save error:", err);
        showToast("Failed to save logo.", "error");
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      showToast("Failed to read image file.", "error");
      setLoading(false);
    };

    reader.readAsDataURL(file);
  };

  const handleResetDefault = async () => {
    try {
      localStorage.removeItem(`erp_logo_${activeCode}`);
      localStorage.removeItem(`erp_school_logo_${activeCode}`);
      setPreview(null);

      try {
        if (supabase) {
          await supabase
            .from("institutions")
            .update({ logo_url: null })
            .eq("code", activeCode);
        }
      } catch (e) {}

      window.dispatchEvent(
        new CustomEvent("erp-logo-updated", {
          detail: { logoUrl: null, schoolCode: activeCode },
        })
      );

      showToast("Reset to default EduSaaS institutional crest.", "info");
      if (onLogoUpdated) onLogoUpdated(null);
    } catch (err) {
      console.error("Reset logo error:", err);
    }
  };

  return (
    <div className="bg-[#1E293B] border border-slate-700/80 rounded-3xl p-6 shadow-xl space-y-5 text-slate-200">
      <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span>🎨</span> Custom Institutional Branding & Crest
          </h3>
          <p className="text-xs text-slate-400">
            Active Node: <span className="font-mono text-emerald-400 font-bold">{activeCode}</span> &bull; Replaces default logos across headers, login & ID cards
          </p>
        </div>
        {preview && (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Custom Crest Active
          </span>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Crest Preview */}
        <div className="relative group shrink-0">
          <div className="w-24 h-24 rounded-2xl bg-slate-900 border-2 border-dashed border-slate-600 flex items-center justify-center p-2 overflow-hidden shadow-inner">
            {preview ? (
              <img
                src={preview}
                alt="Uploaded Crest"
                className="w-full h-full object-contain rounded-xl"
              />
            ) : (
              <BrandLogo size="lg" />
            )}
          </div>
          <span className="text-[10px] text-slate-400 text-center block mt-1.5 font-medium">
            {preview ? "Active Logo" : "Default Crest"}
          </span>
        </div>

        {/* Controls */}
        <div className="space-y-3 flex-1 w-full text-center sm:text-left">
          <p className="text-xs text-slate-300 leading-relaxed">
            Upload your school or coaching center's official emblem, seal, or logo in high resolution (PNG, JPG, or SVG). Changes reflect instantly without page reload.
          </p>

          <div className="flex flex-wrap items-center gap-3 justify-center sm:justify-start">
            <label className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center gap-2">
              <span>📤</span>
              <span>{loading ? "Processing..." : "Upload New Crest"}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={loading}
                onChange={handleFileChange}
              />
            </label>

            {preview && (
              <button
                type="button"
                onClick={handleResetDefault}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-600 font-bold px-3 py-2 rounded-xl text-xs transition-all cursor-pointer"
              >
                Reset to Default
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

