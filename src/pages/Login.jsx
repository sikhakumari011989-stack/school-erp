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

  // Auto-redirect if already logged in
  useEffect(() => {
    if (user) {
      if (user.role === 'accountant') {
        navigate('/accountant/dashboard');
      } else if (user.role === 'trustee') {
        navigate('/trustee/dashboard');
      } else if (user.role === 'staff') {
        navigate('/staff/dashboard');
      } else {
        navigate(`/${user.role}/dashboard`);
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

      // 1. ADMIN LOGIN
      if (code2.includes('admin')) {
        login({ id: "admin-123", name: "Super Admin", role: "admin", school_id: code1 });
        navigate('/admin/dashboard');
      } 
      // 2. TRUSTEE LOGIN
      else if (code2.includes('tru') || code2.includes('trust')) {
        login({ id: "tru-123", name: "Board Trustee", role: "trustee", school_id: code1 });
        navigate('/trustee/dashboard');
      }
      // 3. ACCOUNTANT LOGIN
      else if (code2.includes('acc')) {
        login({ id: "acc-123", name: "Chief Accountant", role: "accountant", school_id: code1 });
        navigate('/accountant/dashboard');
      }
      // 4. NON-TEACHING STAFF LOGIN (NEW)
      else if (code2.includes('stf') || code2.includes('staff')) {
        login({ id: "stf-123", name: "Operations Staff", role: "staff", school_id: code1 });
        navigate('/staff/dashboard');
      }
      // 5. TEACHER LOGIN
      else if (code2.includes('tch')) {
        login({ id: "teacher-123", name: "Faculty Member", role: "teacher", school_id: code1 });
        navigate('/teacher/dashboard');
      } 
      // 6. STUDENT LOGIN
      else {
        login({ id: "student-123", name: "Student", role: "student", school_id: code1 });
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
          <span className="text-4xl">🏫</span>
        </div>
        
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 text-center mb-2 tracking-tight">
          System Access
        </h1>
        <p className="text-slate-400 mb-8 text-sm text-center font-medium">Enter your 2-Tier credentials to continue</p>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm p-3 rounded-lg mb-6 text-center font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          
          {/* TIER 1: INSTITUTION CODE */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 ml-1">
              Code 1: Institution
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-slate-500">🏢</span>
              <input 
                type="text" 
                placeholder="e.g., DEMO-SCHOOL-01" 
                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono uppercase tracking-wider"
                value={formData.institutionCode}
                onChange={(e) => setFormData({...formData, institutionCode: e.target.value})}
              />
            </div>
          </div>

          {/* TIER 2: PERSONAL CODE */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 ml-1">
              Code 2: Personal ID (admin, tru, acc, stf, tch, student)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-slate-500">👤</span>
              <input 
                type="text" 
                placeholder="e.g., STF-01 or STU-1024" 
                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono uppercase tracking-wider"
                value={formData.personalCode}
                onChange={(e) => setFormData({...formData, personalCode: e.target.value})}
              />
            </div>
          </div>

          {/* PASSWORD */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 ml-1">
              Secure Password
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
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-extrabold py-4 px-4 rounded-xl shadow-lg shadow-blue-600/20 disabled:opacity-50 transition-all mt-4 border border-blue-500/50 hover:scale-[1.02]"
          >
            {loading ? "Authenticating..." : "Access Dashboard"}
          </button>
        </form>

      </div>
    </div>
  );
}