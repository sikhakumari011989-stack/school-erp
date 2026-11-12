import React, { useState } from "react";
import AddStudentModal from "../Components/AddStudentModal";
import FeeStructureConfigurator from "../Components/FeeStructureConfigurator";

export default function QaWorkbench() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-white">QA Testing & Component Stress Workbench</h1>
          <p className="text-xs text-slate-400 mt-1">Multi-tenant form validation & layout integrity verification node.</p>
        </div>
        <button
          data-testid="btn-open-add-student-modal"
          onClick={() => setModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-lg transition-all cursor-pointer"
        >
          Open Add Student Modal
        </button>
      </div>

      <AddStudentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onRefresh={() => {}}
      />

      <div className="w-full">
        <FeeStructureConfigurator
          schoolId="SCHOOL-A"
          institutionName="School A Academy"
        />
      </div>
    </div>
  );
}
