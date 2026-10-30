import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

/**
 * The Stealth Toggle
 * A discreet, ultra-responsive Sun/Moon icon button for seamless
 * instant switching between Voyager Light and Dark modes.
 */
export default function ThemeToggle({ className = "" }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to High-Contrast Light Mode" : "Switch to Voyager Dark Mode"}
      title={isDark ? "Switch to Light Mode (Voyager Clean)" : "Switch to Dark Mode (Voyager Deep Space)"}
      className={`relative inline-flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200 ease-in-out hover:-translate-y-0.5 active:scale-95 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer ${
        isDark
          ? "bg-slate-900/90 hover:bg-slate-800 text-amber-300 border border-white/10 shadow-lg shadow-cyan-500/5"
          : "bg-white hover:bg-slate-100 text-indigo-600 border border-slate-200 shadow-sm"
      } ${className}`}
    >
      <span className="sr-only">Toggle Theme</span>
      {isDark ? (
        <Sun className="w-4 h-4 transition-transform duration-300 rotate-0 hover:rotate-45 text-amber-400" />
      ) : (
        <Moon className="w-4 h-4 transition-transform duration-300 -rotate-12 hover:rotate-0 text-indigo-600" />
      )}
    </button>
  );
}

