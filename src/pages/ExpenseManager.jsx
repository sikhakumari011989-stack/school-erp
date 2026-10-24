import React from "react";
import ExpenseManager from "../Components/ExpenseManager";

export default function ExpenseManagerPage() {
  return (
    <div className="relative text-slate-200 min-h-full pb-10 font-sans">
      <div className="fixed top-0 left-10 w-96 h-96 bg-amber-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="relative z-10 max-w-7xl mx-auto">
        <ExpenseManager />
      </div>
    </div>
  );
}

