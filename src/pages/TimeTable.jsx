import React from "react";
import { useAppContext } from "../context/AppContext";
import MasterTimetableManager from "../Components/MasterTimetableManager";

export default function TimeTable() {
  const { user, tenant } = useAppContext() || {};
  const schoolCode = (user?.institution_code || user?.school_id || tenant?.code || "CAMPUS-01").toUpperCase();

  return (
    <div className="w-full">
      <MasterTimetableManager schoolId={schoolCode} />
    </div>
  );
}
