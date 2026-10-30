import React from 'react';
import { captureException } from '../telemetry/sentry';

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
    console.error('[EduSaaS ErrorBoundary Caught]:', error, errorInfo);
    try {
      captureException(error, { component: this.props.viewName || 'ErrorBoundary', errorInfo });
    } catch (_) {
      // Ignore telemetry transport failures
    }
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

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
      if (this.props.inline) {
        return (
          <div className="p-6 m-4 rounded-2xl bg-slate-900/90 border border-rose-500/30 text-slate-100 space-y-3">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
              <span>⚠️</span>
              <span>Module Exception: {this.props.viewName || 'Dashboard View'}</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              This module encountered an unexpected runtime exception. Other institutional portals and navigation links remain operational.
            </p>
            {this.state.error && (
              <p className="text-[11px] font-mono text-rose-300 break-words bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                {this.state.error.message || String(this.state.error)}
              </p>
            )}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition cursor-pointer"
              >
                ↻ Retry Module
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition cursor-pointer"
              >
                Reload Page
              </button>
            </div>
          </div>
        );
      }

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
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition cursor-pointer"
              >
                ↻ Reload Current View
              </button>
              <button
                type="button"
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
