import React, { useContext } from "react";
import { AppContext } from "../context/AppContext";
import LeaveManager from "../Components/LeaveManager";

export default function LeaveManagement() {
  const { user, tenant } = useContext(AppContext) || {};
  const schoolId = user?.institution_code || user?.school_id || tenant?.code || "CAMPUS-01";

  return (
    <div className="w-full font-sans">
      <LeaveManager schoolId={schoolId} />
    </div>
  );
}
