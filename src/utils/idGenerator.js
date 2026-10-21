/**
 * Auto-Increment 2-Tier ID Generator for Multi-Tenant School ERP
 * Calculates sequential Tier-2 Personal IDs based on active directory and existing records.
 * 
 * - Students: Sequential IDs starting at STU-101 (e.g. STU-101, STU-102, etc.).
 * - Teachers: Sequential faculty IDs starting at TCH-01 (e.g. TCH-01, TCH-02, etc.).
 */

export function getNextMemberId(role = "student", directory = [], existingMembers = []) {
  const r = (role || "").toLowerCase();
  let prefix = "STU";
  let maxNum = 100;

  if (r === "teacher") {
    prefix = "TCH";
    maxNum = 0;
  } else if (r === "accountant") {
    prefix = "ACC";
    maxNum = 0;
  } else if (r === "staff" || r === "non_teaching") {
    prefix = "NON";
    maxNum = 0;
  } else if (r === "trustee" || r === "principal") {
    prefix = "PRIN";
    maxNum = 0;
  }

  // Combine all known records
  const allItems = [...(directory || []), ...(existingMembers || [])];

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
  if (prefix === "STU") {
    // Format STU-101, STU-102 ...
    return `STU-${nextNum}`;
  } else {
    // Format TCH-01, ACC-01, NON-01, PRIN-01 ...
    return `${prefix}-${String(nextNum).padStart(2, "0")}`;
  }
}

/**
 * Returns empty array for brand new institutions (no hardcoded mock users).
 */
export function getDefaultSchoolDirectory(schoolId = "") {
  return [];
}
