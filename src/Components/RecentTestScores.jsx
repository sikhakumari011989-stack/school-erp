import React from "react";
import StudentMyMarks from "./StudentMyMarks";

/**
 * RECENT TEST SCORES (MY MARKS)
 * Forwarding component rendering the authentic, leak-proof Student My Marks portal.
 */
export default function RecentTestScores({ studentRoll = "", className = "" }) {
  return <StudentMyMarks studentRoll={studentRoll} className={className} />;
}
