import React from "react";
import StudentMyMarks from "../Components/StudentMyMarks";

export default function StudentMarks() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 transition-colors duration-200">
      <div className="max-w-5xl mx-auto space-y-6">
        <StudentMyMarks />
      </div>
    </div>
  );
}

