import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { supabase } from '../supabaseClient';

const dashboardFor = (role) => {
  if (role === 'accountant') return '/accountant/dashboard';
  if (role === 'trustee') return '/trustee/dashboard';
  if (role === 'teacher') return '/teacher/dashboard';
  return '/student/dashboard';
};

export default function Login() {
  const { user, loading: sessionLoading } = useContext(AppContext);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    institutionCode: '',
    personalCode: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If already logged in, go straight to the right dashboard
  useEffect(() => {
    if (!sessionLoading && user) {
      navigate(dashboardFor(user.role));
    }
  }, [user, sessionLoading, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    const inst = formData.institutionCode.trim().toLowerCase();
    const code = formData.personalCode.trim().toLowerCase();
    const pass = formData.password;

    if (!inst || !code || !pass) {
      setError('All fields are required.');
      return;
    }

    setLoading(true);

    // Build the account email from the two codes
    const email = `${inst}.${code}@erp-login.com`;

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });

    if (signInError || !data.user) {
      setError('Wrong institution code, position code, or password.');
      setLoading(false);
      return;
    }

    // Confirm this account has a profile in the system
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile) {
      await supabase.auth.signOut();
      setError('This account is not linked to any institution yet.');
      setLoading(false);
      return;
    }

    navigate(dashboardFor(profile.role));
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#0F172A] relative overflow-hidden font-sans">

      {/* Ambient Glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="bg-white/5 backdrop-blur-2xl p-10 rounded-[2rem] shadow-2xl border border-white/10 max-w-md w-full relative z-10">

        <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-blue-600/30 border border-white/10">
          <span className="text-4xl">🏛️</span>
        </div>

        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 text-center mb-2 tracking-tight">
          Tuition Portal Login
        </h1>
        <p className="text-slate-400 mb-8 text-sm text-center font-medium">Enter your 2-Tier tuition credentials</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm p-3 rounded-lg mb-6 text-center font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">

          {/* TIER 1: TUITION CODE */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 ml-1">
              Code 1: Tuition Center ID
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-slate-500">🏢</span>
              <input
                type="text"
                placeholder="e.g., OASIS-TUTORIALS"
                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono uppercase tracking-wider"
                value={formData.institutionCode}
                onChange={(e) => setFormData({ ...formData, institutionCode: e.target.value })}
              />
            </div>
          </div>

          {/* TIER 2: PERSONAL ROLE CODE */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 ml-1">
              Code 2: Position (HOD-01, ACC-01, TCH-01, STU-1024)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-slate-500">👤</span>
              <input
                type="text"
                placeholder="e.g., HOD-01, ACC-01, TCH-01, STU-1024"
                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono uppercase tracking-wider"
                value={formData.personalCode}
                onChange={(e) => setFormData({ ...formData, personalCode: e.target.value })}
              />
            </div>
          </div>

          {/* PASSWORD */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 ml-1">
              Password
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-slate-500">🔑</span>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold py-4 px-4 rounded-xl shadow-lg shadow-blue-600/30 disabled:opacity-50 transition-all mt-4 border border-blue-500/50 hover:scale-[1.02]"
          >
            {loading ? "Checking..." : "Access Tuition Portal"}
          </button>
        </form>

      </div>
    </div>
  );
}