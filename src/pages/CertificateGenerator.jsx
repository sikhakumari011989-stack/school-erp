import React, { useState } from "react";

export default function CertificateGenerator() {
  const [certType, setCertType] = useState("Bonafide Certificate");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleRequest = (e) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 1000);
  };

  return (
    <div className="relative text-slate-200 min-h-full pb-10 font-sans">
      <div className="fixed top-0 left-10 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-2xl mx-auto">
        <div className="mb-8 text-center">
          <p className="text-blue-300 text-sm font-semibold mb-1 uppercase tracking-widest">Student Portal</p>
          <h1 className="text-3xl font-extrabold text-white">Certificate Request Vault 📜</h1>
          <p className="text-slate-400 text-sm mt-1">Apply for official school documents and digital certificates</p>
        </div>

        <div className="bg-[#1E293B] border border-slate-700 rounded-3xl p-8 shadow-2xl">
          {submitted ? (
            <div className="text-center py-10 space-y-4">
              <div className="text-6xl">🎉</div>
              <h2 className="text-2xl font-bold text-white">Request Submitted Successfully!</h2>
              <p className="text-slate-400 text-sm">Your application for a <span className="text-blue-400 font-bold">{certType}</span> has been forwarded to the Principal's office for digital signature approval.</p>
              <button 
                onClick={() => { setSubmitted(false); setReason(""); }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg mt-4 transition-all"
              >
                Request Another Document
              </button>
            </div>
          ) : (
            <form onSubmit={handleRequest} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Select Certificate Type</label>
                <select 
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-blue-500"
                  value={certType}
                  onChange={(e) => setCertType(e.target.value)}
                >
                  <option value="Bonafide Certificate">Bonafide Certificate</option>
                  <option value="Transfer Certificate (TC)">Transfer Certificate (TC)</option>
                  <option value="Character Certificate">Character Certificate</option>
                  <option value="Fee Concession Letter">Fee Concession Letter</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Reason / Purpose</label>
                <textarea 
                  required rows="4"
                  placeholder="Specify why you need this document (e.g., passport application, scholarship, etc.)"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                ></textarea>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-4 rounded-xl shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50"
              >
                {loading ? "Submitting Application..." : "Submit Official Request"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}