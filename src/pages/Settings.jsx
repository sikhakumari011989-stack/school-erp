    import { useState } from "react";
import { motion } from "framer-motion";

export default function Settings() {
  const [schoolName, setSchoolName] = useState("My School ERP");
  const [academicYear, setAcademicYear] = useState("2025-2026");

  const [fees, setFees] = useState({
    tuition: 30000,
    exam: 5000,
    transport: 10000
  });

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-purple-400">
          System Settings
        </h1>
        <p className="text-gray-400 text-sm">
          Configure your school ERP system
        </p>
      </div>

      {/* SCHOOL INFO */}
      <div className="grid grid-cols-2 gap-6">

        <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
          <h2 className="text-white font-semibold mb-3">School Info</h2>

          <input
            className="w-full p-3 mb-3 rounded-xl bg-white/5 border border-white/10 text-white"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            placeholder="School Name"
          />

          <input
            className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white"
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            placeholder="Academic Year"
          />
        </div>

        {/* FEE STRUCTURE */}
        <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
          <h2 className="text-white font-semibold mb-3">Fee Structure</h2>

          <input
            className="w-full p-3 mb-3 rounded-xl bg-white/5 border border-white/10 text-white"
            value={fees.tuition}
            onChange={(e) => setFees({ ...fees, tuition: e.target.value })}
            placeholder="Tuition Fee"
          />

          <input
            className="w-full p-3 mb-3 rounded-xl bg-white/5 border border-white/10 text-white"
            value={fees.exam}
            onChange={(e) => setFees({ ...fees, exam: e.target.value })}
            placeholder="Exam Fee"
          />

          <input
            className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white"
            value={fees.transport}
            onChange={(e) => setFees({ ...fees, transport: e.target.value })}
            placeholder="Transport Fee"
          />
        </div>

      </div>

      {/* SAVE BUTTON */}
      <motion.button
        whileHover={{ scale: 1.03 }}
        className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold"
      >
        Save Settings
      </motion.button>

    </div>
  );
}