import React, { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';

export default function Login() {
  const { login, user } = useContext(AppContext);
  const navigate = useNavigate();

  // If user is already logged in, push them to their dashboard
  useEffect(() => {
    if (user) {
      navigate(`/${user.role}/dashboard`);
    }
  }, [user, navigate]);

  const handleLogin = (role) => {
    if (role === 'student') {
      login({ id: "student-123", name: "Astik", role: "student", school_id: "school-demo-01" });
      navigate('/student/dashboard');
    } else if (role === 'teacher') {
      login({ id: "teacher-123", name: "Satwik", role: "teacher", school_id: "school-demo-01" });
      navigate('/teacher/dashboard');
    } else if (role === 'admin') {
      login({ id: "admin-123", name: "Super Admin", role: "admin", school_id: "school-demo-01" });
      navigate('/admin/dashboard');
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#0F172A] relative overflow-hidden">
      {/* Background glow for aesthetics */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600/20 rounded-full blur-[120px]"></div>
      
      <div className="bg-white/5 backdrop-blur-xl p-10 rounded-3xl shadow-2xl border border-white/10 max-w-md w-full text-center relative z-10">
        <div className="w-20 h-20 bg-blue-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-blue-600/30">
          <span className="text-4xl">🏫</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">School ERP</h1>
        <p className="text-slate-400 mb-8 text-sm">Select your demo role to continue</p>
        
        <div className="flex flex-col gap-4">
          <button onClick={() => handleLogin('student')} className="bg-white/5 hover:bg-blue-600/20 text-white border border-white/10 hover:border-blue-500/50 font-bold py-4 px-4 rounded-xl transition-all flex items-center justify-center gap-3 group">
            <span className="text-xl group-hover:scale-110 transition-transform">🎓</span> Login as Student
          </button>
          <button onClick={() => handleLogin('teacher')} className="bg-white/5 hover:bg-emerald-600/20 text-white border border-white/10 hover:border-emerald-500/50 font-bold py-4 px-4 rounded-xl transition-all flex items-center justify-center gap-3 group">
            <span className="text-xl group-hover:scale-110 transition-transform">👨‍🏫</span> Login as Teacher
          </button>
          <button onClick={() => handleLogin('admin')} className="bg-white/5 hover:bg-purple-600/20 text-white border border-white/10 hover:border-purple-500/50 font-bold py-4 px-4 rounded-xl transition-all flex items-center justify-center gap-3 group">
            <span className="text-xl group-hover:scale-110 transition-transform">🛡️</span> Login as Admin
          </button>
        </div>
      </div>
    </div>
  );
}