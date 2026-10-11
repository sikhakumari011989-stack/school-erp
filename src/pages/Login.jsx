import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";

export default function Login() {
  const [email, setEmail] = useState("admin@demo.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useContext(AppContext);
  const navigate = useNavigate();

  // ===== MANUAL LOGIN (via Supabase) =====
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { supabase } = await import("../supabaseClient");
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        login({
          id: data.user.id,
          email: data.user.email,
          role: "admin",
          school_id: "school-demo-01",
        });
        navigate("/admin/dashboard");
      }
    } catch (err) {
      setError("Connection failed. Use test buttons below.");
      setLoading(false);
    }
  };

  // ===== QUICK TEST LOGIN (HARDCODED - NO SUPABASE) =====
  const handleQuickLogin = (role) => {
    const testUsers = {
      admin: {
        id: "admin-123",
        email: "admin@demo.com",
        role: "admin",
        school_id: "school-demo-01",
        school_name: "Demo School",
      },
      teacher: {
        id: "teacher-123",
        email: "teacher@demo.com",
        role: "teacher",
        school_id: "school-demo-01",
      },
      student: {
        id: "student-123",
        email: "student@demo.com",
        role: "student",
        school_id: "school-demo-01",
      },
    };

    const user = testUsers[role];
    login(user);
    navigate(`/${role}/dashboard`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl -z-10 animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl -z-10 animate-pulse"></div>

      <div className="w-full max-w-md">
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-3/4 h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-green-500 rounded-full"></div>

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl mb-4 shadow-lg">
              <span className="text-3xl">🏫</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">School ERP</h1>
            <p className="text-slate-400">Login to your account</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                EMAIL
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition"
                placeholder="admin@demo.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                PASSWORD
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition"
                placeholder="Enter password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-lg transition duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading && <span className="animate-spin">⚙️</span>}
              {loading ? "Connecting..." : "Login"}
            </button>
          </form>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-slate-700/50"></div>
            <span className="text-slate-500 text-sm">OR</span>
            <div className="flex-1 h-px bg-slate-700/50"></div>
          </div>

          <div>
            <p className="text-center text-slate-400 text-xs uppercase tracking-wide mb-3">
              One-Click Tier Testing
            </p>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => handleQuickLogin("admin")}
                className="py-3 px-4 bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600/50 hover:border-blue-500/50 rounded-lg text-white text-sm font-medium transition"
              >
                Admin
              </button>
              <button
                onClick={() => handleQuickLogin("teacher")}
                className="py-3 px-4 bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600/50 hover:border-cyan-500/50 rounded-lg text-white text-sm font-medium transition"
              >
                Teacher
              </button>
              <button
                onClick={() => handleQuickLogin("student")}
                className="py-3 px-4 bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600/50 hover:border-green-500/50 rounded-lg text-white text-sm font-medium transition"
              >
                Student
              </button>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-700/50 text-center text-slate-500 text-xs">
            Test credentials are pre-filled. Click a role button to login instantly.
          </div>
        </div>
      </div>
    </div>
  );
}