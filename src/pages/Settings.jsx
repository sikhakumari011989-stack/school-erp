import { useState } from "react";
import { motion } from "framer-motion";

export default function Settings() {
  const [schoolName, setSchoolName] = useState("My School ERP");
  const [academicYear, setAcademicYear] = useState("2025-2026");

  const [fees, setFees] = useState({
    tuition: 30000,
    exam: 5000,
    labEquipment: 10000,
  });

  return (
    <div className="space-y-6 max-w-4xl">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-purple-600 dark:text-purple-400">
          System Settings
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          Configure your institutional ERP system preferences
        </p>
      </div>

      {/* SCHOOL INFO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none">
          <h2 className="text-slate-900 dark:text-white font-semibold mb-3">School Info</h2>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                School Name
              </label>
              <input
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="School Name"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Academic Year
              </label>
              <input
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="Academic Year (e.g. 2025-2026)"
              />
            </div>
          </div>
        </div>

        {/* FEE STRUCTURE */}
        <div className="p-5 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none">
          <h2 className="text-slate-900 dark:text-white font-semibold mb-3">Fee Structure</h2>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Tuition Fee (₹)
              </label>
              <input
                type="number"
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                value={fees.tuition}
                onChange={(e) => setFees({ ...fees, tuition: e.target.value })}
                placeholder="Tuition Fee"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Exam Fee (₹)
              </label>
              <input
                type="number"
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                value={fees.exam}
                onChange={(e) => setFees({ ...fees, exam: e.target.value })}
                placeholder="Exam Fee"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Laboratory & IT Fee (₹)
              </label>
              <input
                type="number"
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                value={fees.labEquipment}
                onChange={(e) => setFees({ ...fees, labEquipment: e.target.value })}
                placeholder="Laboratory & IT Fee"
              />
            </div>
          </div>
        </div>
      </div>

      {/* SAVE BUTTON */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-lg shadow-purple-500/20 transition cursor-pointer"
      >
        Save Settings
      </motion.button>
    </div>
  );
}
