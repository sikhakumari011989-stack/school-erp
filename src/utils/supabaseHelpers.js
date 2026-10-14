import { supabase } from "../supabaseClient";

/**
 * Checks if a string is a valid UUID
 */
export function isUUID(str) {
  if (!str || typeof str !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());
}

/**
 * Resolves an institution code (e.g. 'OASIS-TUTORIALS' or 'school-demo-01')
 * to its Supabase UUID in the schools table.
 * If none found, safely returns the canonical demo school UUID.
 */
export async function resolveSchoolUuid(codeOrUuid = "OASIS-TUTORIALS") {
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

    // Fallback: fetch the first school from database
    const { data: firstSchool } = await supabase
      .from("schools")
      .select("id")
      .limit(1)
      .maybeSingle();

    return firstSchool?.id || "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
  } catch (err) {
    console.warn("Could not resolve school UUID, using fallback:", err);
    return "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
  }
}

/**
 * Formats tuition role code nicely (e.g. 'HOD-01' -> 'Head of Department / Trustee')
 */
export function formatRoleTitle(role = "") {
  const map = {
    trustee: "HOD / Board Trustee",
    teacher: "Faculty / Tutor",
    accountant: "Tuition Accountant",
    student: "Enrolled Student",
    admin: "Super Administrator",
    staff: "Operations Staff",
  };
  return map[role.toLowerCase()] || role;
}

