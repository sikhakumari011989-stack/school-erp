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

  if (r === "teacher" || r === "faculty" || r === "tch") {
    prefix = "TCH";
    maxNum = 0;
  } else if (r === "accountant" || r === "acc") {
    prefix = "ACC";
    maxNum = 0;
  } else if (r === "nts" || r === "non_teaching" || r === "non-teaching") {
    prefix = "NTS";
    maxNum = 100;
  } else if (r === "staff" || r === "support") {
    prefix = "NON";
    maxNum = 0;
  } else if (r === "principal" || r === "prin") {
    prefix = "PRIN";
    maxNum = 0;
  } else if (r === "trustee" || r === "hod") {
    prefix = "HOD";
    maxNum = 0;
  }

  // Combine all known records
  const allItems = [...(directory || []), ...(existingMembers || [])];

  // Also check browser localStorage if accessible for additional cross-directory coverage
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      // Scan registered schools master admins (e.g. HOD-01, PRIN-01)
      const rawSchools = window.localStorage.getItem("erp_registered_schools");
      if (rawSchools) {
        const schools = JSON.parse(rawSchools);
        if (Array.isArray(schools)) {
          schools.forEach((s) => {
            if (s && s.adminId) {
              allItems.push({ role_code: s.adminId });
            }
          });
        }
      }

      // Scan current session user
      const rawSession = window.localStorage.getItem("erp_session_user") || window.localStorage.getItem("erp_demo_session");
      if (rawSession) {
        const sess = JSON.parse(rawSession);
        if (sess) {
          allItems.push({
            role_code: sess.role_code || sess.roll_number || sess.personal_code || sess.id,
          });
        }
      }
    } catch (e) {
      // Ignore localStorage access errors
    }
  }

  const idPattern = new RegExp(`^${prefix}[-_](\\d+)`, "i");

  allItems.forEach((item) => {
    if (!item) return;
    const rawCode = (
      item.role_code ||
      item.roll_number ||
      item.personal_code ||
      item.customId ||
      item.adminId ||
      item.id ||
      ""
    ).toString().toUpperCase().trim();

    const match = rawCode.match(idPattern);
    if (match && match[1]) {
      const parsed = parseInt(match[1], 10);
      if (!isNaN(parsed) && parsed > maxNum) {
        maxNum = parsed;
      }
    }
  });

  const nextNum = maxNum + 1;
  if (prefix === "STU" || prefix === "NTS") {
    // Format STU-101, NTS-101 ...
    return `${prefix}-${nextNum}`;
  } else {
    // Format TCH-01, ACC-01, NON-01, PRIN-01, HOD-01 ...
    return `${prefix}-${String(nextNum).padStart(2, "0")}`;
  }
}

/**
 * Returns empty array for brand new institutions (no hardcoded mock users).
 */
export function getDefaultSchoolDirectory(schoolId = "") {
  return [];
}
