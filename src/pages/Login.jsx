import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';

export default function Login() {
  const { login, user } = useContext(AppContext);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    institutionCode: '',
    personalCode: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-redirect if already logged in based on role
  useEffect(() => {
    if (user) {
      if (user.role === 'accountant') {
        navigate('/accountant/dashboard');
      } else if (user.role === 'trustee') {
        navigate('/trustee/dashboard'); // HOD / Trustee dashboard
      } else if (user.role === 'teacher') {
        navigate('/teacher/dashboard');
      } else {
        navigate('/student/dashboard');
      }
    }
  }, [user, navigate]);

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    setTimeout(() => {
      const code2 = formData.personalCode.toLowerCase();
      const code1 = formData.institutionCode.toUpperCase();

      if (!code1 || !code2 || !formData.password) {
        setError('All fields are required.');
        setLoading(false);
        return;
      }

      // 1. HOD / TRUSTEE LOGIN (Code 2 contains 'hod' or 'tru')
      if (code2.includes('hod') || code2.includes('tru')) {
        login({ id: "hod-123", name: "HOD / Board Trustee", role: "trustee", school_id: code1 });
        navigate('/trustee/dashboard');
      } 
      // 2. ACCOUNTANT LOGIN (Code 2 contains 'acc')
      else if (code2.includes('acc')) {
        login({ id: "acc-123", name: "Tuition Accountant", role: "accountant", school_id: code1 });
        navigate('/accountant/dashboard');
      }
      // 3. TEACHER / TUTOR LOGIN (Code 2 contains 'tch')
      else if (code2.includes('tch') || code2.includes('teacher')) {
        login({ id: "teacher-123", name: "Faculty / Tutor", role: "teacher", school_id: code1 });
        navigate('/teacher/dashboard');
      } 
      // 4. STUDENT LOGIN (Default for student IDs)
      else {
        login({ id: "student-123", name: "Tuition Student", role: "student", school_id: code1 });
        navigate('/student/dashboard');
      }
    }, 800);
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
                placeholder="e.g., OASI-TUTORIALS" 
                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono uppercase tracking-wider"
                value={formData.institutionCode}
                onChange={(e) => setFormData({...formData, institutionCode: e.target.value})}
              />
            </div>
          </div>

          {/* TIER 2: PERSONAL ROLE CODE */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 ml-1">
              Code 2: Position (hod, acc, tch, or student id)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-slate-500">👤</span>
              <input 
                type="text" 
                placeholder="e.g., HOD-01, ACC-01, TCH-01, STU-101" 
                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono uppercase tracking-wider"
                value={formData.personalCode}
                onChange={(e) => setFormData({...formData, personalCode: e.target.value})}
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
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold py-4 px-4 rounded-xl shadow-lg shadow-blue-600/30 disabled:opacity-50 transition-all mt-4 border border-blue-500/50 hover:scale-[1.02]"
          >
            {loading ? "Authenticating Position..." : "Access Tuition Portal"}
          </button>
        </form>

      </div>
    </div>
  );
}