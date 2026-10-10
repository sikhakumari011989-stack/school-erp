import { useState } from "react";
import { supabase } from "../supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
    // If successful, App.jsx's auth listener instantly takes over and redirects
  };

  // 3-Tier Quick Fill (Matches the demo emails you created in Supabase)
  const fillCredentials = (tier) => {
    if (tier === 'admin') {
      setEmail("admin@demo.com");
      setPassword("admin123");
    } else if (tier === 'teacher') {
      setEmail("teacher@demo.com");
      setPassword("teacher123");
    } else if (tier === 'student') {
      setEmail("student@demo.com");
      setPassword("student123");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A] p-4 font-sans text-slate-200">
      <div className="bg-[#1E293B] p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-700/50 relative overflow-hidden">
        
        {/* Top accent line */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-emerald-500"></div>

        {/* Logo and Header matching the video */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-[#0F172A] to-blue-900 border border-blue-500/30 rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-4">
            <span className="text-3xl">🏫</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">School ERP</h2>
          <p className="text-sm text-slate-400 mt-1">Login to your account</p>
        </div>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg mb-6 text-sm text-center flex items-center justify-center gap-2 font-semibold">
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@demo.com"
              className="w-full bg-[#0F172A] border border-slate-600 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600 font-medium" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#0F172A] border border-slate-600 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600 font-medium" 
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-blue-600/20 mt-2 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Connecting...
              </>
            ) : (
              "Login"
            )}
          </button>
        </form>

        {/* 3-Tier Demo Login Helpers */}
        <div className="mt-8 border-t border-slate-700/50 pt-6">
          <p className="text-[10px] text-center font-bold text-slate-500 uppercase tracking-wider mb-3">One-Click Tier Testing</p>
          <div className="grid grid-cols-3 gap-2">
            <button type="button" onClick={() => fillCredentials('admin')} className="text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded border border-slate-600 transition-colors">
              Admin
            </button>
            <button type="button" onClick={() => fillCredentials('teacher')} className="text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded border border-slate-600 transition-colors">
              Teacher
            </button>
            <button type="button" onClick={() => fillCredentials('student')} className="text-[10px] font-bold bg-blue-900/30 hover:bg-blue-800/40 text-blue-400 py-2 rounded border border-blue-500/30 transition-colors">
              Student
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}