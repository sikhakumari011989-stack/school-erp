/**
 * Academic OS — Credential Standardization & Role Utilities
 */

/**
 * Standardizes email generation pattern for 2-Tier institutional credentials:
 * [institution_code].[personal_code]@erp-login.com (forced lowercase, trimmed of spaces)
 */
export function buildStandardErpEmail(institutionCode, personalCode) {
  const cleanInst = String(institutionCode || "campus")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  const cleanRole = String(personalCode || "")
    .trim()
    .toLowerCase()
    .replace(/@.*$/, "") // Strip domain if user accidentally typed an email
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  return `${cleanInst || "campus"}.${cleanRole || "user"}@erp-login.com`;
}

/**
 * Infers canonical or operational role from Tier-2 Credential Code
 */
export function inferRoleFromCode(code) {
  const upper = String(code || "").toUpperCase();
  if (upper === "MASTER_OWNER" || upper.startsWith("MASTER")) return "master_owner";
  if (upper.startsWith("PRIN")) return "principal";
  if (upper.startsWith("HOD") || upper.startsWith("TR")) return "trustee";
  if (upper.startsWith("ACC")) return "accountant";
  if (upper.startsWith("TCH") || upper.startsWith("FAC")) return "teacher";
  if (upper.startsWith("NON") || upper.startsWith("NTS") || upper.startsWith("STF") || upper.startsWith("STAFF")) return "staff";
  if (upper.startsWith("ADM") || upper.startsWith("SUPER")) return "admin";

  const lower = String(code || "").toLowerCase();
  if (lower === "master_owner") return "master_owner";
  if (lower === "principal" || lower === "prin") return "principal";
  if (lower === "trustee" || lower === "hod") return "trustee";
  if (lower === "accountant" || lower === "acc") return "accountant";
  if (lower === "teacher" || lower === "tch") return "teacher";
  if (lower === "staff" || lower === "non_teaching" || lower === "nts") return "staff";
  if (lower === "admin" || lower === "super_admin") return "admin";
  return "student";
}

/**
 * Unified Canonical Role Normalization Function
 * Maps any role string, alias, or Tier-2 credential code into the project's canonical role set:
 * - TRUSTEE / HOD -> HOD
 * - PRINCIPAL / PRIN -> PRIN
 * - SUPERADMIN / ADMIN / ADM -> PRIN (executive leadership suite)
 * - TEACHER / FACULTY / TCH -> TCH
 * - ACCOUNTANT / ACC -> ACC
 * - NON-TEACHING / STAFF / NTS -> NTS
 * - STUDENT / STU -> STU
 * - MASTER_OWNER -> MASTER_OWNER
 */
export function normalizeRole(role, personalCode = "") {
  const codeStr = String(personalCode || "").trim().toUpperCase();
  const roleStr = String(role || "").trim().toUpperCase();

  // 1. MASTER_OWNER
  if (roleStr === "MASTER_OWNER" || codeStr === "MASTER_OWNER" || roleStr.startsWith("MASTER") || codeStr.startsWith("MASTER")) {
    return "MASTER_OWNER";
  }

  // 2. Map based on personalCode prefix (e.g. HOD-01, PRIN-01, ACC-01, etc.)
  if (codeStr.startsWith("HOD") || codeStr.startsWith("TR-") || codeStr.startsWith("TRUSTEE")) {
    return "HOD";
  }
  if (codeStr.startsWith("PRIN")) {
    return "PRIN";
  }
  if (codeStr.startsWith("ADM") || codeStr.startsWith("SUPER")) {
    return "PRIN";
  }
  if (codeStr.startsWith("ACC")) {
    return "ACC";
  }
  if (codeStr.startsWith("TCH") || codeStr.startsWith("FAC")) {
    return "TCH";
  }
  if (codeStr.startsWith("NON") || codeStr.startsWith("NTS") || codeStr.startsWith("STF") || codeStr.startsWith("STAFF")) {
    return "NTS";
  }

  // 3. Map based on role string
  if (roleStr === "TRUSTEE" || roleStr === "HOD") {
    return "HOD";
  }
  if (roleStr === "PRINCIPAL" || roleStr === "PRIN") {
    return "PRIN";
  }
  if (roleStr === "SUPERADMIN" || roleStr === "SUPER_ADMIN" || roleStr === "ADMIN" || roleStr === "ADM") {
    return "PRIN";
  }
  if (roleStr === "TEACHER" || roleStr === "FACULTY" || roleStr === "TCH" || roleStr === "FAC") {
    return "TCH";
  }
  if (roleStr === "ACCOUNTANT" || roleStr === "ACC") {
    return "ACC";
  }
  if (roleStr === "STAFF" || roleStr === "NON_TEACHING" || roleStr === "NON-TEACHING" || roleStr === "NTS" || roleStr === "STF") {
    return "NTS";
  }
  if (roleStr === "STUDENT" || roleStr === "STU") {
    return "STU";
  }

  // 4. Substring fallback
  if (roleStr.includes("TRUSTEE") || roleStr.includes("HOD")) return "HOD";
  if (roleStr.includes("PRINCIPAL") || roleStr.includes("PRIN")) return "PRIN";
  if (roleStr.includes("SUPERADMIN") || roleStr.includes("ADMIN")) return "PRIN";
  if (roleStr.includes("TEACHER") || roleStr.includes("FACULTY")) return "TCH";
  if (roleStr.includes("ACCOUNTANT")) return "ACC";
  if (roleStr.includes("STAFF") || roleStr.includes("NON")) return "NTS";

  return "STU";
}

/**
 * Maps any role to its corresponding portal route
 */
export function dashboardFor(role) {
  const raw = String(role || "").trim().toLowerCase();
  if (raw === "master_owner") return "/master-setup";
  if (raw === "admin" || raw === "super_admin") return "/principal/dashboard";
  const canonical = normalizeRole(role);
  if (canonical === "MASTER_OWNER") return "/master-setup";
  if (canonical === "ACC") return "/accountant/dashboard";
  if (canonical === "PRIN" || canonical === "HOD") return "/principal/dashboard";
  if (canonical === "TCH") return "/teacher/dashboard";
  if (canonical === "NTS") return "/staff/dashboard";
  return "/student/dashboard";
}
