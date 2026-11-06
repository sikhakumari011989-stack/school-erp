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
 * Maps any role to its corresponding portal route
 */
export function dashboardFor(role) {
  const normalized = String(role || "student").toLowerCase();
  if (normalized === "master_owner") return "/master-setup";
  if (normalized === "admin" || normalized === "super_admin") return "/admin/dashboard";
  if (normalized === "accountant" || normalized === "acc") return "/accountant/dashboard";
  if (normalized === "principal" || normalized === "prin") return "/principal/dashboard";
  if (normalized === "trustee" || normalized === "hod") return "/trustee/dashboard";
  if (normalized === "teacher" || normalized === "tch") return "/teacher/dashboard";
  if (normalized === "staff" || normalized === "non_teaching" || normalized === "nts") return "/staff/dashboard";
  return "/student/dashboard";
}
