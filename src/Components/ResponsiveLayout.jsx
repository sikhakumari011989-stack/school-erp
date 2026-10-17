import React, { useContext } from "react";
import Sidebar from "./Sidebar";
import BrandLogo from "./BrandLogo";
import { AppContext } from "../context/AppContext";

export default function ResponsiveLayout({ children, title, subtitle }) {
  const { tenant } = useContext(AppContext) || {};

  return (
    <div className="flex min-h-screen bg-[#0F172A] font-sans w-full relative">
      <Sidebar />
      <main className="flex-1 w-full overflow-y-auto min-h-screen p-4 sm:p-6 lg:p-8 pt-20 md:pt-8 pb-24 md:pb-8">
        {(title || subtitle) && (
          <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
            <div>
              {title && <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{title}</h1>}
              {subtitle && <p className="text-slate-400 text-sm mt-1">{subtitle}</p>}
            </div>
            <BrandLogo size="md" customLogoUrl={tenant?.logoUrl} />
          </div>
        )}
        {children}
      </main>
    </div>
  );
}