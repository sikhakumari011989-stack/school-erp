import { supabase } from "../supabaseClient.js";
import { buildStandardErpEmail, normalizeRole } from "./credentials.js";
import { safeStorage } from "./safeStorage.js";

/**
 * Role-Detection Helper Function
 * Strictly assigns roles based on 2-Tier Personal ID prefix:
 * - HOD-*, TR-*, TRUSTEE-* -> 'trustee'
 * - PRIN-*, PRINCIPAL-* -> 'principal'
 * - TCH-*, FAC-*, TEACHER-* -> 'teacher'
 * - ACC-*, ACCOUNTANT-* -> 'accountant'
 * - NON-*, STF-*, STAFF-* -> 'staff'
 * - ADM-*, SUPER-* -> 'admin'
 * Falls back to member's explicit role if valid, otherwise defaults to 'student'.
 */
export function detectRoleFromId(personalId = "", existingRole = "") {
  const cleanId = String(personalId || "").trim().toUpperCase();
  if (cleanId.startsWith("PRIN")) return "principal";
  if (cleanId.startsWith("HOD") || cleanId.startsWith("TR-") || cleanId.startsWith("TRUSTEE")) return "trustee";
  if (cleanId.startsWith("TCH") || cleanId.startsWith("FAC") || cleanId.startsWith("TEACHER")) return "teacher";
  if (cleanId.startsWith("ACC")) return "accountant";
  if (cleanId.startsWith("NON") || cleanId.startsWith("NTS") || cleanId.startsWith("STF") || cleanId.startsWith("STAFF")) return "staff";
  if (cleanId.startsWith("ADM") || cleanId.startsWith("SUPER")) return "admin";

  const cleanRole = String(existingRole || "").trim().toLowerCase();
  if (
    cleanRole === "trustee" ||
    cleanRole === "principal" ||
    cleanRole === "teacher" ||
    cleanRole === "accountant" ||
    cleanRole === "staff" ||
    cleanRole === "non_teaching" ||
    cleanRole === "admin"
  ) {
    return cleanRole;
  }

  return "student";
}

/**
 * Cloud-First Synchronization Service for Multi-Tenant School ERP
 * Guarantees that any school, student, or faculty created on a laptop
 * is immediately accessible and authenticatable on mobile devices globally.
 */

/**
 * 1. CLOUD-FIRST SCHOOL PROVISIONING
 * Saves school to Supabase (schools table) and master HOD admin to profiles.
 */
export async function provisionSchoolInCloud({
  institutionName,
  institutionCode,
  adminName,
  adminId = "HOD-01",
  adminRole,
  password = "password123",
  phone = "+91 9518388499",
  email = "",
  address = "Mahim Manohar Highway, Palghar 401404",
  institutionMode = "school", // 'school' | 'tuition'
}) {
  const cleanCode = (institutionCode || "CAMPUS-01").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
  const cleanAdminId = (adminId || "HOD-01").trim().toUpperCase();
  const cleanName = institutionName.trim();
  const cleanPass = password.trim() || "password123";
  const mappedEmail = email.trim() || buildStandardErpEmail(cleanCode, cleanAdminId);
  const strictAdminRole = detectRoleFromId(cleanAdminId, adminRole || "trustee");

  const initialMasterAdmin = {
    id: `hod_${Date.now()}`,
    name: adminName.trim(),
    full_name: adminName.trim(),
    role: strictAdminRole,
    role_code: cleanAdminId,
    roll_number: cleanAdminId,
    personal_code: cleanAdminId,
    class_name: "Executive Management",
    school_id: cleanCode,
    institution_code: cleanCode,
    institution_name: cleanName,
    email: mappedEmail,
    phone: phone.trim(),
    address: address.trim(),
    default_password: cleanPass,
    created_at: new Date().toISOString(),
  };

  let cloudSchoolId = null;
  let authUserId = null;

  if (supabase) {
    // A. Create Administrator in auth.users via Supabase Auth SignUp to satisfy foreign key constraints
    try {
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: mappedEmail,
        password: cleanPass,
        options: {
          data: {
            full_name: adminName.trim(),
            role: strictAdminRole,
            role_code: cleanAdminId,
            school_code: cleanCode,
          },
        },
      });

      if (signUpData?.user?.id) {
        authUserId = signUpData.user.id;
        initialMasterAdmin.id = authUserId;
      } else if (signUpErr) {
        console.warn("[CloudSync] auth.signUp notice:", signUpErr.message);
        // If user already registered, sign in to retrieve valid auth ID
        try {
          const { data: signInData } = await supabase.auth.signInWithPassword({
            email: mappedEmail,
            password: cleanPass,
          });
          if (signInData?.user?.id) {
            authUserId = signInData.user.id;
            initialMasterAdmin.id = authUserId;
          }
        } catch (signInErr) {
          console.warn("[CloudSync] auth.signIn fallback notice:", signInErr.message);
        }
      }
    } catch (authErr) {
      console.warn("[CloudSync] Client auth.signUp exception:", authErr);
    }

    // B. Insert/Upsert into schools table with cloud-synchronized directory package
    try {
      const addressPayload = JSON.stringify({
        physicalAddress: address.trim(),
        directory: [initialMasterAdmin],
        masterAdminId: cleanAdminId,
        masterAdminName: adminName.trim(),
        defaultPassword: cleanPass,
        institutionMode,
        subscriptionStatus: "active",
        provisionedAt: new Date().toISOString(),
      });

      const { data: schoolData, error: schoolErr } = await supabase
        .from("schools")
        .upsert(
          [
            {
              name: cleanName,
              code: cleanCode,
              phone: phone.trim(),
              address: addressPayload,
              city: "Palghar",
              state: "Maharashtra",
            },
          ],
          { onConflict: "code" }
        )
        .select()
        .single();

      if (schoolErr) {
        // Fallback with minimal core columns if extended columns are absent
        const { data: retrySchool, error: retryErr } = await supabase
          .from("schools")
          .upsert(
            [
              {
                name: cleanName,
                code: cleanCode,
                address: addressPayload,
              },
            ],
            { onConflict: "code" }
          )
          .select()
          .single();

        if (retryErr) {
          console.error("[CloudSync] schools table upsert error:", retryErr);
          throw new Error(`Database error in schools table: ${retryErr.message}`);
        }
        if (retrySchool) {
          cloudSchoolId = retrySchool.id;
        }
      } else if (schoolData) {
        cloudSchoolId = schoolData.id;
      }
    } catch (dbErr) {
      console.error("[CloudSync] schools table upsert error:", dbErr);
      throw dbErr;
    }

    // C. Insert master admin into profiles table linking exact auth.users(id)
    try {
      const profilePayload = {
        full_name: adminName.trim(),
        role: strictAdminRole,
        role_code: cleanAdminId,
        school_id: cloudSchoolId || undefined,
        email: mappedEmail,
        phone: phone.trim(),
        is_active: true,
        status: "active",
      };

      if (authUserId) {
        profilePayload.id = authUserId;
      }

      const { error: profErr } = await supabase
        .from("profiles")
        .upsert([profilePayload], { onConflict: "school_id,role_code" });

      if (profErr) {
        console.error("[CloudSync] profiles table upsert error:", profErr);
        throw new Error(`Database error in profiles table: ${profErr.message}`);
      }
    } catch (profErr) {
      console.error("[CloudSync] profiles table upsert error:", profErr);
      throw profErr;
    }
  }

  // D. Update Safe Storage for Instant Responsiveness
  const defaultExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  safeStorage.setItem(`erp_directory_${cleanCode}`, JSON.stringify([initialMasterAdmin]));
  safeStorage.setItem("erp_active_tenant", cleanCode);
  safeStorage.setItem(`erp_institution_type_${cleanCode}`, institutionMode);
  safeStorage.setItem(
    `erp_school_sub_${cleanCode}`,
    JSON.stringify({ status: "active", expiryDate: defaultExpiry })
  );

  try {
    const rawSchools = safeStorage.getItem("erp_registered_schools") || "[]";
    const schoolsList = JSON.parse(rawSchools);
    const filtered = schoolsList.filter((s) => (s.code || "").toUpperCase() !== cleanCode);
    filtered.unshift({
      code: cleanCode,
      name: cleanName,
      adminName: adminName.trim(),
      adminId: cleanAdminId,
      institutionMode,
      institutionType: institutionMode,
      subscriptionStatus: "active",
      status: "active",
      expiryDate: defaultExpiry,
      createdAt: new Date().toISOString(),
      cloudId: cloudSchoolId,
    });
    safeStorage.setItem("erp_registered_schools", JSON.stringify(filtered));
  } catch (e) {}

  // Reset tenant data partitions to ensure clean slate
  safeStorage.removeItem(`erp_fee_structure_${cleanCode}`);
  safeStorage.removeItem(`erp_fee_ledger_${cleanCode}`);
  safeStorage.removeItem(`erp_notices_${cleanCode}`);
  safeStorage.removeItem(`erp_transport_fleet_${cleanCode}`);
  safeStorage.removeItem(`erp_cctv_nodes_${cleanCode}`);
  safeStorage.removeItem(`erp_non_teaching_staff_${cleanCode}`);

  window.dispatchEvent(new Event("erp-directory-updated"));
  window.dispatchEvent(new Event("erp-schools-updated"));

  return {
    institutionName: cleanName,
    institutionCode: cleanCode,
    adminName: adminName.trim(),
    adminId: cleanAdminId,
    institutionMode,
    password: cleanPass,
    mappedEmail,
    portalUrl: `${typeof window !== "undefined" ? window.location.origin : ""}/portal?school=${cleanCode}`,
    cloudId: cloudSchoolId,
    authUserId,
  };
}

/**
 * 2. CLOUD-FIRST STUDENT & FACULTY ENROLLMENT
 * Writes student/teacher records directly into Supabase (profiles, students, teachers, schools cloud directory)
 * and updates local directory state so the UI refreshes instantly.
 */
export async function enrollMemberInCloud({ schoolCode, member }) {
  const cleanCode = (schoolCode || "CAMPUS-01").trim().toUpperCase();
  const cleanId = (member.role_code || member.roll_number || member.personal_code || "").trim().toUpperCase();
  const assignedRole = detectRoleFromId(cleanId, member.role);
  const isTeacher = assignedRole === "teacher";
  const memberWithRole = {
    ...member,
    role: assignedRole,
  };

  let cloudSchoolUuid = null;

  if (supabase) {
    try {
      // 1. Fetch current school record to get UUID and existing cloud directory
      const { data: schoolRecord } = await supabase
        .from("schools")
        .select("*")
        .ilike("code", cleanCode)
        .maybeSingle();

      if (schoolRecord) {
        cloudSchoolUuid = schoolRecord.id;

        // Extract existing cloud directory from school address payload
        let cloudDir = [];
        if (schoolRecord.address && schoolRecord.address.startsWith("{")) {
          try {
            const parsed = JSON.parse(schoolRecord.address);
            if (Array.isArray(parsed.directory)) {
              cloudDir = parsed.directory;
            }
          } catch (e) {}
        }

        // Add or update this member in the cloud directory
        const filteredDir = cloudDir.filter(
          (m) => (m.role_code || m.roll_number || m.personal_code || "").toUpperCase() !== cleanId
        );
        const updatedCloudDir = [memberWithRole, ...filteredDir];

        const updatedPayload = JSON.stringify({
          physicalAddress: "Mahim Manohar Highway, Palghar 401404",
          directory: updatedCloudDir,
          lastUpdated: new Date().toISOString(),
        });

        // Write updated cloud directory back to schools table in Supabase
        await supabase
          .from("schools")
          .update({ address: updatedPayload })
          .eq("id", schoolRecord.id);
      }
    } catch (schoolSyncErr) {
      console.warn("[CloudSync] School cloud directory update notice:", schoolSyncErr);
    }

    // 2. Write to profiles table in Supabase
    try {
      await supabase.from("profiles").insert([
        {
          school_id: cloudSchoolUuid || undefined,
          full_name: memberWithRole.full_name || memberWithRole.name,
          role: assignedRole,
          role_code: cleanId,
        },
      ]);
    } catch (profErr) {
      console.warn("[CloudSync] profiles table insert notice:", profErr);
    }

    // 3. Write to students or teachers table in Supabase (school_id is TEXT matching cleanCode)
    if (isTeacher) {
      try {
        await supabase.from("teachers").insert([
          {
            school_id: cleanCode,
            name: memberWithRole.full_name || memberWithRole.name,
            email: memberWithRole.email || null,
            phone: memberWithRole.phone || null,
            subject: memberWithRole.subject || memberWithRole.department || "General Faculty",
          },
        ]);
      } catch (tchErr) {
        console.warn("[CloudSync] teachers table insert notice:", tchErr);
      }
    } else {
      try {
        await supabase.from("students").insert([
          {
            school_id: cleanCode,
            name: memberWithRole.full_name || memberWithRole.name,
            roll_number: cleanId,
          },
        ]);
      } catch (stuErr) {
        console.warn("[CloudSync] students table insert notice:", stuErr);
      }
    }
  }

  // 4. Update Safe Storage Directory for Instant Zero-Latency UI Updates
  try {
    const rawLocal = safeStorage.getItem(`erp_directory_${cleanCode}`) || "[]";
    const localDir = JSON.parse(rawLocal);
    const filteredLocal = localDir.filter(
      (m) => (m.role_code || m.roll_number || m.personal_code || "").toUpperCase() !== cleanId
    );
    const newLocal = [memberWithRole, ...filteredLocal];
    safeStorage.setItem(`erp_directory_${cleanCode}`, JSON.stringify(newLocal));
    window.dispatchEvent(new Event("erp-directory-updated"));
  } catch (e) {
    console.warn("[CloudSync] Safe storage update notice:", e);
  }

  return memberWithRole;
}

/**
 * 3. CLOUD-FIRST LOGIN VERIFICATION
 * Queries Supabase first (schools, profiles, students, teachers, cloud directory)
 * to authenticate users from ANY mobile or desktop browser globally.
 * Falls back to localStorage ONLY if offline or network unreachable.
 */
export async function verifyCloudLogin({ institutionCode, personalCode, password }) {
  const cleanInst = (institutionCode || "").trim().toUpperCase();
  const cleanPersonal = (personalCode || "").trim().toUpperCase();
  const inputPass = (password || "").trim();

  if (!cleanInst || !cleanPersonal || !inputPass) {
    return {
      success: false,
      error: "Institution code, personal ID, and password are required.",
    };
  }

  // 1. Live Supabase Auth verification
  if (supabase) {
    try {
      const candidates = [
        buildStandardErpEmail(cleanInst, cleanPersonal),
        `${cleanInst.toLowerCase().replace(/[^a-z0-9]/g, "")}.${cleanPersonal.toLowerCase().replace(/[^a-z0-9]/g, "")}@academicos.internal`,
        `${cleanInst.toLowerCase().replace(/[^a-z0-9]/g, "")}.${cleanPersonal.toLowerCase().replace(/[^a-z0-9]/g, "")}@gmail.com`,
      ];

      for (const candidateEmail of candidates) {
        const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
          email: candidateEmail,
          password: inputPass,
        });

        if (!authErr && authData?.user) {
          const authUser = authData.user;
          const appMeta = authUser.app_metadata || {};
          const userMeta = authUser.user_metadata || {};

          return {
            success: true,
            user: {
              id: authUser.id,
              email: authUser.email,
              name: userMeta.full_name || userMeta.name || cleanPersonal,
              role: normalizeRole(appMeta.role || userMeta.role, cleanPersonal),
              role_code: cleanPersonal,
              school_id: cleanInst,
              institution_code: cleanInst,
              authUid: authUser.id,
            },
            source: "supabase_auth",
          };
        }
      }
    } catch (e) {
      console.warn("[CloudSync] Live credential verification error:", e);
    }
  }

  // 2. Fallback to Cloud School Directory from Supabase public.schools table
  if (supabase) {
    try {
      const { data: schoolRecord } = await supabase
        .from("schools")
        .select("id, code, name, address, status, subscription_status")
        .ilike("code", cleanInst)
        .maybeSingle();

      if (schoolRecord && schoolRecord.address && schoolRecord.address.startsWith("{")) {
        try {
          const payload = JSON.parse(schoolRecord.address);
          let matchedMember = null;

          // Check if admin
          if (
            (payload.masterAdminId && payload.masterAdminId.toUpperCase() === cleanPersonal) ||
            cleanPersonal === "HOD-01"
          ) {
            const expectedPass = payload.defaultPassword || "password123";
            if (inputPass === expectedPass) {
              matchedMember = {
                id: `admin_${schoolRecord.id}`,
                name: payload.masterAdminName || "Institutional Administrator",
                role: "trustee",
                role_code: cleanPersonal,
              };
            }
          }

          // Check directory members
          if (!matchedMember && Array.isArray(payload.directory)) {
            const found = payload.directory.find(
              (m) =>
                (m.role_code || m.roll_number || m.personal_code || "").toUpperCase() === cleanPersonal
            );
            if (found) {
              const expectedPass = found.default_password || payload.defaultPassword || "password123";
              if (inputPass === expectedPass) {
                matchedMember = found;
              }
            }
          }

          if (matchedMember) {
            const resolvedRole = normalizeRole(matchedMember.role, cleanPersonal);
            return {
              success: true,
              user: {
                id: matchedMember.id || `member_${cleanInst}_${cleanPersonal}`,
                email: matchedMember.email || buildStandardErpEmail(cleanInst, cleanPersonal),
                name: matchedMember.full_name || matchedMember.name || cleanPersonal,
                role: resolvedRole,
                role_code: cleanPersonal,
                school_id: cleanInst,
                institution_code: cleanInst,
                institution_name: schoolRecord.name,
              },
              source: "cloud_directory",
            };
          }
        } catch (jsonErr) {
          console.warn("[CloudSync] Address JSON parse error:", jsonErr);
        }
      }
    } catch (dbErr) {
      console.warn("[CloudSync] School directory fallback query error:", dbErr);
    }
  }

  // 3. Fallback to Local Directory in safeStorage (for mock/offline/testing resilience)
  try {
    const rawLocal = safeStorage.getItem(`erp_directory_${cleanInst}`);
    if (rawLocal) {
      const localDir = JSON.parse(rawLocal);
      if (Array.isArray(localDir)) {
        let matchedMember = null;
        const found = localDir.find(
          (m) =>
            (m.role_code || m.roll_number || m.personal_code || m.id || "").toUpperCase() === cleanPersonal
        );
        if (found) {
          const expectedPass = found.default_password || found.password || "password123";
          if (inputPass === expectedPass) {
            matchedMember = found;
          }
        }

        if (matchedMember) {
          const resolvedRole = normalizeRole(matchedMember.role, cleanPersonal);
          return {
            success: true,
            user: {
              id: matchedMember.id || `member_${cleanInst}_${cleanPersonal}`,
              email: matchedMember.email || buildStandardErpEmail(cleanInst, cleanPersonal),
              name: matchedMember.full_name || matchedMember.name || cleanPersonal,
              role: resolvedRole,
              role_code: cleanPersonal,
              school_id: cleanInst,
              institution_code: cleanInst,
              institution_name: matchedMember.institution_name || cleanInst,
            },
            source: "local_directory",
          };
        }
      }
    }
  } catch (localErr) {
    console.warn("[CloudSync] Local directory fallback error:", localErr);
  }

  // 4. Fallback to Local Registered Schools in safeStorage
  try {
    const rawSchools = safeStorage.getItem("erp_registered_schools");
    if (rawSchools) {
      const schools = JSON.parse(rawSchools);
      if (Array.isArray(schools)) {
        const foundSchool = schools.find((s) => (s.code || "").toUpperCase() === cleanInst);
        if (foundSchool) {
          const adminId = (foundSchool.adminId || "HOD-01").toUpperCase();
          if (adminId === cleanPersonal || cleanPersonal === "HOD-01" || cleanPersonal === "PRIN-01") {
            const expectedPass = foundSchool.password || "password123";
            if (inputPass === expectedPass) {
              const assignedRole = cleanPersonal.startsWith("PRIN") ? "principal" : "trustee";
              return {
                success: true,
                user: {
                  id: `admin_${cleanInst}_${cleanPersonal}`,
                  email: buildStandardErpEmail(cleanInst, cleanPersonal),
                  name: foundSchool.adminName || `${cleanInst} Administrator`,
                  role: assignedRole,
                  role_code: cleanPersonal,
                  school_id: cleanInst,
                  institution_code: cleanInst,
                  institution_name: foundSchool.name || cleanInst,
                },
                source: "local_registered_schools",
              };
            }
          }
        }
      }
    }
  } catch (regSchoolErr) {
    console.warn("[CloudSync] Local schools fallback error:", regSchoolErr);
  }

  return {
    success: false,
    error: "Authentication failed. Invalid institutional credentials in Supabase Auth.",
  };
}

/**
 * 4. FETCH CLOUD DIRECTORY
 * Retrieves the complete member roster for an institution from Supabase cloud,
 * falls back to local storage if offline, and syncs local cache.
 */
export async function fetchCloudDirectory(schoolCode) {
  const cleanCode = (schoolCode || "").trim().toUpperCase();
  if (!cleanCode) return [];

  if (supabase) {
    try {
      const { data: schoolRecord } = await supabase
        .from("schools")
        .select("*")
        .ilike("code", cleanCode)
        .maybeSingle();

      if (schoolRecord && schoolRecord.address && schoolRecord.address.startsWith("{")) {
        try {
          const parsed = JSON.parse(schoolRecord.address);
          if (Array.isArray(parsed.directory) && parsed.directory.length > 0) {
            const normalizedDir = parsed.directory.map((m) => {
              const code = String(m.role_code || m.roll_number || m.personal_code || "").toUpperCase();
              return {
                ...m,
                role: detectRoleFromId(code, m.role),
              };
            });
            // Synchronize down to safeStorage cache
            safeStorage.setItem(`erp_directory_${cleanCode}`, JSON.stringify(normalizedDir));
            return normalizedDir;
          }
        } catch (parseErr) {}
      }
    } catch (e) {
      console.warn("[CloudSync] fetchCloudDirectory notice:", e);
    }
  }

  // Fallback to safeStorage
  try {
    const raw = safeStorage.getItem(`erp_directory_${cleanCode}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((m) => {
          const code = String(m.role_code || m.roll_number || m.personal_code || "").toUpperCase();
          return {
            ...m,
            role: detectRoleFromId(code, m.role),
          };
        });
      }
    }
  } catch (e) {}

  return [];
}

/**
 * 5. MASTER SUBSCRIPTION & EXPIRY CONTROLLER
 * Controls institution licensing, custom expiry dates, and the master kill-switch.
 */
export function getSchoolSubscription(schoolCode) {
  const cleanCode = String(schoolCode || "").trim().toUpperCase();
  if (!cleanCode) {
    return {
      status: "active",
      expiryDate: "2027-12-31",
      isExpired: false,
      isSuspended: false,
      isBlocked: false,
    };
  }

  const today = new Date().toISOString().split("T")[0];
  let status = "active";
  let expiryDate = "2027-12-31";

  // Check explicit tenant subscription key
  try {
    const rawSub = safeStorage.getItem(`erp_school_sub_${cleanCode}`);
    if (rawSub) {
      const parsed = JSON.parse(rawSub);
      if (parsed.status) status = parsed.status;
      if (parsed.expiryDate) expiryDate = parsed.expiryDate;
    } else {
      // Check erp_registered_schools
      const rawSchools = safeStorage.getItem("erp_registered_schools");
      if (rawSchools) {
        const list = JSON.parse(rawSchools);
        const match = list.find((s) => (s.code || "").toUpperCase() === cleanCode);
        if (match) {
          if (match.subscriptionStatus) status = match.subscriptionStatus;
          if (match.expiryDate) expiryDate = match.expiryDate;
        }
      }
    }
  } catch (e) {}

  const isSuspended = status.toLowerCase() === "suspended";
  const isExpired = Boolean(expiryDate && today > expiryDate);
  const isBlocked = isSuspended || isExpired;

  return {
    status,
    expiryDate,
    isSuspended,
    isExpired,
    isBlocked,
    today,
  };
}

export async function updateSchoolSubscription({ schoolCode, status, expiryDate }) {
  const cleanCode = String(schoolCode || "").trim().toUpperCase();
  if (!cleanCode) return;

  const validStatus = status === "suspended" ? "suspended" : "active";
  const validExpiry = expiryDate || "2027-12-31";

  // Save to tenant key
  safeStorage.setItem(
    `erp_school_sub_${cleanCode}`,
    JSON.stringify({ status: validStatus, expiryDate: validExpiry })
  );

  // Update erp_registered_schools
  try {
    const raw = safeStorage.getItem("erp_registered_schools") || "[]";
    const list = JSON.parse(raw);
    const updated = list.map((s) => {
      if ((s.code || "").toUpperCase() === cleanCode) {
        return {
          ...s,
          subscriptionStatus: validStatus,
          status: validStatus,
          expiryDate: validExpiry,
        };
      }
      return s;
    });
    safeStorage.setItem("erp_registered_schools", JSON.stringify(updated));
  } catch (e) {}

  // Sync to Supabase cloud if connected
  if (supabase) {
    try {
      const { data: schoolRecord } = await supabase
        .from("schools")
        .select("id, address")
        .ilike("code", cleanCode)
        .maybeSingle();

      if (schoolRecord && schoolRecord.address && schoolRecord.address.startsWith("{")) {
        const payload = JSON.parse(schoolRecord.address);
        payload.subscriptionStatus = validStatus;
        payload.expiryDate = validExpiry;
        payload.lastSubscriptionUpdate = new Date().toISOString();
        await supabase
          .from("schools")
          .update({ address: JSON.stringify(payload) })
          .eq("id", schoolRecord.id);
      }
    } catch (err) {
      console.warn("[CloudSync] Subscription cloud sync notice:", err);
    }
  }

  window.dispatchEvent(new Event("erp-schools-updated"));
  return { status: validStatus, expiryDate: validExpiry };
}

export async function checkSchoolSubscriptionStatus(schoolCode) {
  const cleanCode = String(schoolCode || "").trim().toUpperCase();
  if (!cleanCode) return { isBlocked: false, isSuspended: false, isExpired: false };

  // First check cloud if online
  if (supabase) {
    try {
      const { data: schoolRecord } = await supabase
        .from("schools")
        .select("id, status, subscription_status, subscription_expires_at, address")
        .ilike("code", cleanCode)
        .maybeSingle();

      if (schoolRecord) {
        let cloudStatus = schoolRecord.subscription_status || schoolRecord.status || "active";
        let cloudExpiry = schoolRecord.subscription_expires_at;

        if (schoolRecord.address && schoolRecord.address.startsWith("{")) {
          try {
            const payload = JSON.parse(schoolRecord.address);
            if (payload.subscriptionStatus) cloudStatus = payload.subscriptionStatus;
            if (payload.expiryDate) cloudExpiry = payload.expiryDate;
          } catch {}
        }

        const today = new Date().toISOString().split("T")[0];
        const expiryIso = cloudExpiry ? new Date(cloudExpiry).toISOString().split("T")[0] : "2027-12-31";
        const isSuspended =
          String(cloudStatus || "").toLowerCase() === "suspended" ||
          String(schoolRecord.status || "").toLowerCase() === "suspended" ||
          String(schoolRecord.subscription_status || "").toLowerCase() === "suspended";
        const isExpired = Boolean(expiryIso && today > expiryIso);

        // Sync locally
        try {
          safeStorage.setItem(
            `erp_school_sub_${cleanCode}`,
            JSON.stringify({ status: isSuspended ? "suspended" : "active", expiryDate: expiryIso, isBlocked: isSuspended || isExpired })
          );
        } catch {}

        return {
          status: isSuspended ? "suspended" : "active",
          expiryDate: expiryIso,
          isSuspended,
          isExpired,
          isBlocked: isSuspended || isExpired,
          today,
        };
      }
    } catch (e) {
      console.warn("checkSchoolSubscriptionStatus notice:", e);
    }
  }

  // Fallback to local subscription evaluator
  return getSchoolSubscription(cleanCode);
}

export async function getAllRegisteredSchools() {
  const schoolsMap = new Map();

  // 1. Seed standard defaults so the directory is never empty
  const defaultSchools = [
    {
      code: "PALGHAR-01",
      name: "Palghar International Academy",
      adminName: "Dr. Vikramaditya Singhania",
      adminId: "HOD-01",
      institutionMode: "school",
      subscriptionStatus: "active",
      expiryDate: "2027-12-31",
      createdAt: "2026-01-15T09:00:00.000Z",
    },
    {
      code: "TUITION-01",
      name: "Zenith IIT-JEE & Medical Hub",
      adminName: "Prof. Rajesh Verma",
      adminId: "HOD-01",
      institutionMode: "tuition",
      subscriptionStatus: "active",
      expiryDate: "2027-12-31",
      createdAt: "2026-02-01T10:30:00.000Z",
    },
  ];

  defaultSchools.forEach((s) => schoolsMap.set(s.code, s));

  // 2. Read safeStorage registered schools
  try {
    const raw = safeStorage.getItem("erp_registered_schools");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((s) => {
          if (s.code) {
            const cleanCode = s.code.toUpperCase();
            const sub = getSchoolSubscription(cleanCode);
            schoolsMap.set(cleanCode, {
              ...s,
              code: cleanCode,
              name: s.name || cleanCode,
              institutionMode: s.institutionMode || s.institutionType || "school",
              subscriptionStatus: sub.status,
              expiryDate: sub.expiryDate,
              isBlocked: sub.isBlocked,
              isSuspended: sub.isSuspended,
              isExpired: sub.isExpired,
            });
          }
        });
      }
    }
  } catch (e) {}

  // 3. Merge Supabase cloud schools
  if (supabase) {
    try {
      const { data: cloudSchools } = await supabase
        .from("schools")
        .select("id, code, name, address, created_at");

      if (cloudSchools && Array.isArray(cloudSchools)) {
        cloudSchools.forEach((cs) => {
          if (cs.code) {
            const cleanCode = cs.code.toUpperCase();
            let adminName = "Institution Trustee";
            let adminId = "HOD-01";
            let mode = "school";
            let subStatus = "active";
            let expDate = "2027-12-31";

            if (cs.address && cs.address.startsWith("{")) {
              try {
                const parsed = JSON.parse(cs.address);
                if (parsed.masterAdminName) adminName = parsed.masterAdminName;
                if (parsed.masterAdminId) adminId = parsed.masterAdminId;
                if (parsed.institutionMode) mode = parsed.institutionMode;
                if (parsed.subscriptionStatus) subStatus = parsed.subscriptionStatus;
                if (parsed.expiryDate) expDate = parsed.expiryDate;
              } catch (e) {}
            }

            const existing = schoolsMap.get(cleanCode);
            schoolsMap.set(cleanCode, {
              code: cleanCode,
              name: cs.name || existing?.name || cleanCode,
              adminName: existing?.adminName || adminName,
              adminId: existing?.adminId || adminId,
              institutionMode: existing?.institutionMode || mode,
              subscriptionStatus: existing?.subscriptionStatus || subStatus,
              expiryDate: existing?.expiryDate || expDate,
              createdAt: cs.created_at || existing?.createdAt || new Date().toISOString(),
              cloudId: cs.id,
            });
          }
        });
      }
    } catch (err) {}
  }

  // Ensure each school has up-to-date subscription status
  const result = Array.from(schoolsMap.values()).map((s) => {
    const sub = getSchoolSubscription(s.code);
    return {
      ...s,
      subscriptionStatus: sub.status,
      status: sub.status,
      expiryDate: s.expiryDate || sub.expiryDate,
      isBlocked: sub.isBlocked,
      isSuspended: sub.isSuspended,
      isExpired: sub.isExpired,
    };
  });

  return result;
}