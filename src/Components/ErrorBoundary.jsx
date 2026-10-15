import React, { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an unhandled runtime error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0B0F19] text-slate-200 flex items-center justify-center p-4 sm:p-6 font-sans relative overflow-hidden">
          {/* Ambient Lighting Orbs */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-600/15 rounded-full blur-[140px] pointer-events-none"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/15 rounded-full blur-[140px] pointer-events-none"></div>

          <div className="relative z-10 w-full max-w-xl bg-[#1E293B]/80 backdrop-blur-2xl border border-rose-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center text-3xl mx-auto shadow-xl shadow-rose-500/20">
              ⚠️
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 inline-block mb-2">
                Runtime Exception Trapped
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white">Something went wrong</h2>
              <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-md mx-auto">
                An unexpected interface error occurred. Our automated error shield prevented a complete system freeze.
              </p>
            </div>

            {/* ERROR DETAILS ACCORDION */}
            {this.state.error && (
              <div className="text-left bg-slate-950/80 border border-slate-800 rounded-2xl p-4 font-mono text-xs text-rose-300 overflow-x-auto max-h-40">
                <p className="font-bold mb-1 text-white">Error Message:</p>
                <p className="text-[11px] leading-relaxed">{this.state.error?.message || String(this.state.error)}</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 px-4 rounded-xl border border-slate-700 transition-all text-xs cursor-pointer flex items-center justify-center gap-2"
              >
                <span>🔄</span> Reload Portal
              </button>
              <button
                onClick={this.handleReset}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black py-3.5 px-4 rounded-xl shadow-lg shadow-blue-600/30 transition-all text-xs cursor-pointer border border-blue-400/30 flex items-center justify-center gap-2"
              >
                <span>🏠</span> Return to Home Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
