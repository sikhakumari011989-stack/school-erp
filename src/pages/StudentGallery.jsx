import React, { useState } from "react";

export default function StudentGallery() {
  const [photos] = useState([
    { id: 1, title: "Annual Inter-School Football Championship Finals", category: "Sports", image: "🏆", date: "October 2026" },
    { id: 2, title: "Science Exhibition & Robotics Showcase", category: "Academics", image: "🔬", date: "September 2026" },
    { id: 3, title: "Independence Day Cultural Fest & Parade", category: "Events", image: "🇮🇳", date: "August 2026" },
    { id: 4, title: "Computer Lab Full-Stack Coding Session", category: "Technology", image: "💻", date: "October 2026" },
    { id: 5, title: "Annual Library Reading Week", category: "Academics", image: "📚", date: "September 2026" },
    { id: 6, title: "Tree Plantation Drive by Eco Club", category: "Community", image: "🌱", date: "August 2026" }
  ]);

  return (
    <div className="relative text-slate-200 min-h-full pb-10 font-sans">
      <div className="fixed top-0 left-10 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="mb-8">
          <p className="text-purple-300 text-sm font-semibold mb-1 uppercase tracking-widest">Student Portal</p>
          <h1 className="text-3xl font-extrabold text-white">Campus Photo Gallery 📸</h1>
          <p className="text-slate-400 text-sm mt-1">Explore memorable moments, events, and activities across campus</p>
        </div>

        {/* GALLERY GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {photos.map((item) => (
            <div key={item.id} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col justify-between group hover:border-purple-500/50 transition-all">
              <div>
                <div className="w-full h-40 rounded-2xl bg-slate-900/80 border border-slate-700 flex items-center justify-center text-6xl mb-6 group-hover:scale-105 transition-transform shadow-inner">
                  {item.image}
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="bg-purple-500/20 text-purple-400 border border-purple-500/30 px-3 py-1 rounded-xl text-xs font-bold uppercase">
                    {item.category}
                  </span>
                  <span className="text-slate-400 text-xs font-bold">{item.date}</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-4 group-hover:text-purple-300 transition-colors">
                  {item.title}
                </h3>
              </div>
              <button 
                onClick={() => alert(`Opening photo view for: ${item.title}`)}
                className="w-full bg-slate-800 hover:bg-purple-600 text-white font-bold py-3 px-4 rounded-xl transition-all border border-slate-700 hover:border-purple-500 flex items-center justify-center gap-2"
              >
                <span>🔍</span> View Full Resolution
              </button>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}