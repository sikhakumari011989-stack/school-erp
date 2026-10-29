import React from 'react';

export default class ErrorBoundary extends React.Component {
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
    console.error('[EduSaaS Global ErrorBoundary Caught]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleSafeReset = () => {
    try {
      sessionStorage.clear();
    } catch (_) {
      // Ignore storage errors
    }
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/login';
  };

  handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[100dvh] bg-[#0b0f19] text-slate-100 flex items-center justify-center p-4 font-sans">
          <div className="max-w-lg w-full bg-[#111827] border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-2xl mb-5">
              ⚠️
            </div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-md">
              Runtime Protection Active
            </span>
            <h1 className="text-xl md:text-2xl font-bold text-white mt-3">
              Component State Recovery Triggered
            </h1>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              An unexpected rendering exception occurred during route transition. Your multi-tenant institutional ledger and session data remain intact.
            </p>

            {this.state.error && (
              <div className="mt-4 p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 overflow-x-auto">
                <p className="text-xs font-mono text-rose-400 break-words">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleReload}
                className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition cursor-pointer"
              >
                ↻ Reload Current View
              </button>
              <button
                onClick={this.handleSafeReset}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition cursor-pointer"
              >
                🛡️ Return to Portal Login
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}