import { supabase } from "../supabaseClient";

/**
 * Checks if a string is a valid UUID
 */
export function isUUID(str) {
  if (!str || typeof str !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());
}

/**
 * Resolves an institution code (e.g. 'CAMPUS-01')
 * to its Supabase UUID in the schools table.
 * If none found, returns null (never silently assign a default or foreign school).
 */
export async function resolveSchoolUuid(codeOrUuid = "CAMPUS-01") {
  if (isUUID(codeOrUuid)) {
    return codeOrUuid;
  }

  try {
    const { data } = await supabase
      .from("schools")
      .select("id")
      .ilike("code", (codeOrUuid || "").trim())
      .maybeSingle();

    if (data?.id) return data.id;

    // Strict tenant isolation: never silently return a foreign or default school UUID
    return null;
  } catch (err) {
    console.warn("Could not resolve school UUID:", err);
    return null;
  }
}

/**
 * Formats tuition role code nicely (e.g. 'HOD-01' -> 'Head of Department / Trustee')
 */
export function formatRoleTitle(role = "", institutionType = "school") {
  const isTuition = (institutionType || "").toLowerCase() === "tuition";
  const map = {
    trustee: isTuition ? "HOD / Board Trustee" : "Principal / Trustee",
    teacher: isTuition ? "Faculty / Tutor" : "Faculty / Teacher",
    accountant: isTuition ? "Tuition Accountant" : "School Accountant",
    student: "Enrolled Student",
    admin: "Super Administrator",
    staff: "Operations Staff",
  };
  return map[role.toLowerCase()] || role;
}

