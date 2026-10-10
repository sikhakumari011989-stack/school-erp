import { useState } from "react";

export default function CertificateGenerator() {
  const [formData, setFormData] = useState({
    studentName: "Astik Kumar",
    className: "Class 10 - ICSE",
    rollNumber: "42",
    certType: "bonafide",
    issueDate: new Date().toISOString().split('T')[0],
    remarks: "has been a highly disciplined and outstanding student."
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="text-slate-200">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Certificate Generator</h1>
        <p className="text-slate-400 mt-1">Generate official school documents with live preview.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: CONTROL PANEL */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-lg">
            <h2 className="text-lg font-bold text-white mb-4">Document Details</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5">Certificate Type</label>
                <select 
                  name="certType" 
                  value={formData.certType} 
                  onChange={handleChange}
                  className="w-full bg-[#0F172A] border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-all"
                >
                  <option value="bonafide">Bonafide Certificate</option>
                  <option value="transfer">Transfer / Leaving Certificate</option>
                  <option value="achievement">Certificate of Achievement</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5">Student Full Name</label>
                <input 
                  type="text" 
                  name="studentName"
                  value={formData.studentName}
                  onChange={handleChange}
                  className="w-full bg-[#0F172A] border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1.5">Class / Grade</label>
                  <input 
                    type="text" 
                    name="className"
                    value={formData.className}
                    onChange={handleChange}
                    className="w-full bg-[#0F172A] border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1.5">Roll Number</label>
                  <input 
                    type="text" 
                    name="rollNumber"
                    value={formData.rollNumber}
                    onChange={handleChange}
                    className="w-full bg-[#0F172A] border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5">Date of Issue</label>
                <input 
                  type="date" 
                  name="issueDate"
                  value={formData.issueDate}
                  onChange={handleChange}
                  className="w-full bg-[#0F172A] border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2">
            <span>🖨️</span> Generate & Print PDF
          </button>
        </div>

        {/* RIGHT COLUMN: LIVE PREVIEW */}
        <div className="lg:col-span-8 flex items-start justify-center p-8 bg-slate-950 rounded-xl border border-slate-800 overflow-x-auto">
          
          {/* THE PAPER (A4 Ratio styling) */}
          <div className="bg-white w-full max-w-[800px] aspect-[1.414] p-12 relative shadow-2xl shrink-0">
            {/* Outer Border */}
            <div className="absolute inset-4 border-[6px] border-double border-slate-800 pointer-events-none"></div>
            
            {/* Certificate Header */}
            <div className="text-center mt-8 mb-12">
              <h1 className="text-4xl font-serif font-bold text-slate-900 uppercase tracking-widest">
                EduCore Academy
              </h1>
              <p className="text-slate-600 font-serif italic mt-2 text-lg">Excellence in Education</p>
              
              <div className="mt-8">
                <span className="bg-slate-100 text-slate-800 border border-slate-300 px-6 py-2 text-xl font-bold uppercase tracking-widest shadow-sm">
                  {formData.certType === 'bonafide' && "Bonafide Certificate"}
                  {formData.certType === 'transfer' && "Leaving Certificate"}
                  {formData.certType === 'achievement' && "Certificate of Achievement"}
                </span>
              </div>
            </div>

            {/* Certificate Body */}
            <div className="text-center font-serif text-slate-800 text-xl leading-loose max-w-2xl mx-auto mt-12">
              <p>This is to certify that</p>
              <p className="text-4xl font-bold text-slate-900 my-6 border-b-2 border-dotted border-slate-400 inline-block px-12 pb-2">
                {formData.studentName || "_______________________"}
              </p>
              <p>
                Roll Number <span className="font-bold border-b border-dotted border-slate-400 px-4">{formData.rollNumber || "____"}</span> is a bona fide student of this institution, 
                currently studying in <span className="font-bold border-b border-dotted border-slate-400 px-4">{formData.className || "________________"}</span>.
              </p>
              <p className="mt-6 italic text-lg text-slate-600">
                To the best of our knowledge, {formData.studentName ? formData.studentName.split(' ')[0] : "the student"} {formData.remarks}
              </p>
            </div>

            {/* Certificate Footer */}
            <div className="absolute bottom-16 left-16 right-16 flex justify-between items-end font-serif text-slate-800">
              <div className="text-center">
                <p className="mb-2 font-bold">{formData.issueDate}</p>
                <div className="border-t border-slate-400 pt-2 w-32">Date</div>
              </div>
              
              {/* Fake Seal */}
              <div className="w-24 h-24 rounded-full border-4 border-slate-200 flex items-center justify-center opacity-50">
                <span className="text-slate-300 font-bold rotate-[-15deg]">SEAL</span>
              </div>

              <div className="text-center">
                <p className="mb-2 text-transparent select-none">Signature</p>
                <div className="border-t border-slate-400 pt-2 w-48">Principal Signature</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}