/**
 * Auto-Increment 2-Tier ID Generator for Multi-Tenant School ERP
 * Calculates sequential Tier-2 Personal IDs based on active directory and existing records.
 * 
 * - Students: Sequential IDs starting at STU-101 (e.g. STU-101, STU-102, etc.).
 * - Teachers: Sequential faculty IDs starting at TCH-01 (e.g. TCH-01, TCH-02, etc.).
 */

export function getNextMemberId(role = "student", directory = [], existingMembers = []) {
  const isTeacher = (role || "").toLowerCase() === "teacher";
  const prefix = isTeacher ? "TCH" : "STU";

  // Combine all known records
  const allItems = [...(directory || []), ...(existingMembers || [])];
  let maxNum = isTeacher ? 0 : 100;

  allItems.forEach((item) => {
    if (!item) return;
    const rawCode = (
      item.role_code ||
      item.roll_number ||
      item.personal_code ||
      item.id ||
      ""
    ).toString().toUpperCase().trim();

    if (rawCode.startsWith(`${prefix}-`)) {
      const numPart = rawCode.replace(`${prefix}-`, "");
      const parsed = parseInt(numPart, 10);
      if (!isNaN(parsed) && parsed > maxNum) {
        maxNum = parsed;
      }
    }
  });

  const nextNum = maxNum + 1;
  if (isTeacher) {
    // Format TCH-01, TCH-02 ... TCH-10
    return `TCH-${String(nextNum).padStart(2, "0")}`;
  } else {
    // Format STU-101, STU-102 ...
    return `STU-${nextNum}`;
  }
}

/**
 * Returns empty array for brand new institutions (no hardcoded mock users).
 */
export function getDefaultSchoolDirectory(schoolId = "") {
  return [];
}
