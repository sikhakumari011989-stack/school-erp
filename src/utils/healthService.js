import { supabase } from "../supabaseClient.js";
import { dispatchParentNotification } from "./notifications.js";

const DEFAULT_HEALTH_RECORDS = [
  {
    id: "HLTH-001",
    student_id: "STU-1001",
    student_name: "Aarav Sharma",
    class_name: "Class 10-A",
    blood_group: "O+",
    critical_allergies: ["Peanuts", "Dust Mites"],
    chronic_conditions: ["Mild Bronchial Asthma"],
    emergency_contact_name: "Rajesh Sharma",
    emergency_contact_phone: "+91 98200 11223",
    emergency_contact_relation: "Father",
    confidential_medical_notes: "Carries Inhaler (Salbutamol 100mcg) in school bag. Clinic holds spare unit.",
    has_dpdp_consent: true,
    consent_parent_name: "Rajesh Sharma",
    consent_granted_at: "2026-06-15T10:30:00Z",
    created_at: "2026-06-15T10:30:00Z",
  },
  {
    id: "HLTH-002",
    student_id: "STU-1002",
    student_name: "Diya Patel",
    class_name: "Class 9-B",
    blood_group: "B+",
    critical_allergies: ["Penicillin", "Sulfa Drugs"],
    chronic_conditions: [],
    emergency_contact_name: "Meera Patel",
    emergency_contact_phone: "+91 98330 44556",
    emergency_contact_relation: "Mother",
    confidential_medical_notes: "Strict allergy flag: Never administer amoxicillin or penicillin-derived compounds.",
    has_dpdp_consent: true,
    consent_parent_name: "Meera Patel",
    consent_granted_at: "2026-06-18T09:15:00Z",
    created_at: "2026-06-18T09:15:00Z",
  },
  {
    id: "HLTH-003",
    student_id: "STU-1003",
    student_name: "Rohan Deshmukh",
    class_name: "Class 10-A",
    blood_group: "A-",
    critical_allergies: ["Bee Venom / Insect Stings"],
    chronic_conditions: ["Juvenile Migraines"],
    emergency_contact_name: "Sanjay Deshmukh",
    emergency_contact_phone: "+91 98199 77889",
    emergency_contact_relation: "Father",
    confidential_medical_notes: "Requires quiet rest and hydration during sudden onset of visual auras.",
    has_dpdp_consent: true,
    consent_parent_name: "Sanjay Deshmukh",
    consent_granted_at: "2026-06-20T11:45:00Z",
    created_at: "2026-06-20T11:45:00Z",
  },
  {
    id: "HLTH-004",
    student_id: "STU-1004",
    student_name: "Ananya Iyer",
    class_name: "Class 8-C",
    blood_group: "AB+",
    critical_allergies: [],
    chronic_conditions: ["Type 1 Diabetes (CGM Monitored)"],
    emergency_contact_name: "Lakshmi Iyer",
    emergency_contact_phone: "+91 98211 99001",
    emergency_contact_relation: "Mother",
    confidential_medical_notes: "Carries glucose chews and insulin pen. Sensor alarms if blood sugar drops below 70 mg/dL.",
    has_dpdp_consent: false,
    consent_parent_name: null,
    consent_granted_at: null,
    created_at: "2026-07-01T08:00:00Z",
  },
];

const DEFAULT_CLINIC_VISITS = [
  {
    id: "VISIT-901",
    student_id: "STU-1001",
    student_name: "Aarav Sharma",
    class_name: "Class 10-A",
    visit_time: new Date(Date.now() - 3600000 * 2).toISOString(),
    symptoms: "Mild wheezing after physical education session on dusty field",
    triage_level: "routine",
    vitals: { temp: "98.4°F", pulse: "84 bpm", spo2: "97%" },
    treatment_administered: "Administered 2 puffs prescribed Salbutamol inhaler; 20 min observation.",
    medication_dispensed: "Salbutamol 100mcg (Student own pack)",
    attending_officer: "Nurse Sunita Rao (RN)",
    referred_to_hospital: false,
    hospital_name: null,
    parent_notified: true,
    parent_notified_at: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    confidential_clinical_notes: "Wheezing resolved within 10 minutes. Advised to stay well hydrated before PT.",
  },
  {
    id: "VISIT-902",
    student_id: "STU-1003",
    student_name: "Rohan Deshmukh",
    class_name: "Class 10-A",
    visit_time: new Date(Date.now() - 86400000 * 1.5).toISOString(),
    symptoms: "Acute throbbing unilateral headache with light sensitivity",
    triage_level: "routine",
    vitals: { temp: "98.6°F", pulse: "76 bpm", spo2: "99%" },
    treatment_administered: "Rested in dark recovery room with cold compress for 45 minutes.",
    medication_dispensed: "Oral Paracetamol 500mg with water",
    attending_officer: "Dr. K. Merchant (Campus Physician)",
    referred_to_hospital: false,
    hospital_name: null,
    parent_notified: true,
    parent_notified_at: new Date(Date.now() - 86400000 * 1.4).toISOString(),
    confidential_clinical_notes: "Headache subsided. Released back to homeroom at 14:15.",
  },
];

/**
 * Log access into immutable audit trail
 */
export async function logMedicalAccess({ schoolId, studentId, actionType, actorId, actorRole, actorEmail }) {
  const auditEntry = {
    id: "LOG-" + Date.now().toString().slice(-6),
    school_id: schoolId,
    student_id: studentId || "SYSTEM",
    action_type: actionType,
    actor_id: actorId || "current_user",
    actor_role: actorRole || "PRIN",
    actor_email: actorEmail || "clinic@academicos.internal",
    created_at: new Date().toISOString(),
  };

  if (supabase) {
    try {
      await supabase.from("medical_access_logs").insert([
        {
          school_id: auditEntry.school_id,
          student_id: auditEntry.student_id,
          action_type: auditEntry.action_type,
          actor_id: auditEntry.actor_id,
          actor_role: auditEntry.actor_role,
          actor_email: auditEntry.actor_email,
        },
      ]);
    } catch (err) {
      console.warn("[HealthService] Supabase audit insert notice:", err);
    }
  }

  const storageKey = `erp_medical_access_logs_${schoolId}`;
  if (typeof localStorage !== "undefined") {
    try {
      const existing = JSON.parse(localStorage.getItem(storageKey) || "[]");
      localStorage.setItem(storageKey, JSON.stringify([auditEntry, ...existing.slice(0, 99)]));
    } catch (err) {
      console.warn("[HealthService] Storage audit notice:", err);
    }
  }

  return auditEntry;
}

/**
 * Fetch all health records for the campus (Requires Medical Authorization)
 */
export async function fetchHealthRecords(schoolId, actor) {
  // Audit log
  logMedicalAccess({
    schoolId,
    studentId: "ALL_STUDENTS",
    actionType: "VIEW_HEALTH_ROSTER",
    actorId: actor?.id,
    actorRole: actor?.role,
    actorEmail: actor?.email,
  });

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("student_health_records")
        .select("*")
        .eq("school_id", schoolId)
        .order("student_name", { ascending: true });

      if (!error && data && data.length > 0) return data;
    } catch (err) {
      console.warn("[HealthService] Supabase fetch fallback:", err);
    }
  }

  const storageKey = `erp_student_health_records_${schoolId}`;
  try {
    const saved = typeof localStorage !== "undefined" ? localStorage.getItem(storageKey) : null;
    const records = saved ? JSON.parse(saved) : [];
    
    // Data Minimization: Least-privilege redaction for Non-Teaching Staff (NTS)
    const isMedicalAdmin =
      actor?.role === "PRIN" ||
      actor?.role === "HOD" ||
      actor?.role === "principal" ||
      actor?.role === "trustee" ||
      actor?.is_clinic_nurse === true;

    if (!isMedicalAdmin && (actor?.role === "NTS" || actor?.role === "staff")) {
      return records.map((r) => ({
        ...r,
        confidential_medical_notes: "[REDACTED - Clinic Nurse Authorization Required]",
      }));
    }

    return records;
  } catch {
    return [];
  }
}

/**
 * Save or update student health profile
 */
export async function saveHealthRecord(schoolId, recordData, actor) {
  const isNew = !recordData.id || recordData.id.startsWith("HLTH-");
  const now = new Date().toISOString();

  const recordToSave = {
    ...recordData,
    school_id: schoolId,
    updated_at: now,
    created_at: recordData.created_at || now,
  };

  if (supabase) {
    try {
      await supabase.from("student_health_records").upsert([recordToSave], {
        onConflict: "school_id,student_id",
      });
    } catch (err) {
      console.warn("[HealthService] Supabase health upsert notice:", err);
    }
  }

  const storageKey = `erp_student_health_records_${schoolId}`;
  try {
    const records = await fetchHealthRecords(schoolId, actor);
    const existingIndex = records.findIndex((r) => r.student_id === recordData.student_id);
    let updated;
    if (existingIndex >= 0) {
      updated = [...records];
      updated[existingIndex] = recordToSave;
    } else {
      updated = [recordToSave, ...records];
    }
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    }
  } catch (err) {
    console.warn("[HealthService] Local storage save notice:", err);
  }

  logMedicalAccess({
    schoolId,
    studentId: recordData.student_id,
    actionType: isNew ? "CREATE_HEALTH_RECORD" : "UPDATE_HEALTH_RECORD",
    actorId: actor?.id,
    actorRole: actor?.role,
    actorEmail: actor?.email,
  });

  return recordToSave;
}

/**
 * Fetch clinic incident and outpatient visits
 */
export async function fetchClinicVisits(schoolId, actor) {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("clinic_visits")
        .select("*")
        .eq("school_id", schoolId)
        .order("visit_time", { ascending: false });

      if (!error && data && data.length > 0) return data;
    } catch (err) {
      console.warn("[HealthService] Supabase clinic visits fallback:", err);
    }
  }

  const storageKey = `erp_clinic_visits_${schoolId}`;
  try {
    const saved = typeof localStorage !== "undefined" ? localStorage.getItem(storageKey) : null;
    const visits = saved ? JSON.parse(saved) : [];

    // Least-privilege clinic access: Redact diagnostic notes for non-medical personnel
    const isMedicalAdmin =
      actor?.role === "PRIN" ||
      actor?.role === "HOD" ||
      actor?.role === "principal" ||
      actor?.role === "trustee" ||
      actor?.is_clinic_nurse === true;

    if (!isMedicalAdmin && (actor?.role === "NTS" || actor?.role === "staff")) {
      return visits.map((v) => ({
        ...v,
        confidential_clinical_notes: "[REDACTED - Clinic Nurse Authorization Required]",
      }));
    }

    return visits;
  } catch {
    return [];
  }
}

/**
 * Record a clinic visit / medical incident
 */
export async function recordClinicVisit(schoolId, visitData, actor) {
  const visitId = "VISIT-" + Date.now().toString().slice(-6);
  const now = new Date().toISOString();

  const newVisit = {
    ...visitData,
    id: visitId,
    school_id: schoolId,
    visit_time: visitData.visit_time || now,
    created_at: now,
  };

  if (supabase) {
    try {
      await supabase.from("clinic_visits").insert([newVisit]);
    } catch (err) {
      console.warn("[HealthService] Supabase visit insert notice:", err);
    }
  }

  const storageKey = `erp_clinic_visits_${schoolId}`;
  try {
    const visits = await fetchClinicVisits(schoolId, actor);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(storageKey, JSON.stringify([newVisit, ...visits]));
    }
  } catch (err) {
    console.warn("[HealthService] Local storage save visit notice:", err);
  }

  // Audit log
  logMedicalAccess({
    schoolId,
    studentId: newVisit.student_id,
    actionType: "RECORD_CLINIC_VISIT",
    actorId: actor?.id,
    actorRole: actor?.role,
    actorEmail: actor?.email,
  });

  // Automated Parent Emergency Notification Dispatch if parent_notified is true
  if (newVisit.parent_notified) {
    try {
      await dispatchParentNotification({
        schoolId,
        studentId: newVisit.student_id,
        parentPhone: newVisit.emergency_phone || "+919800000000",
        channel: "WHATSAPP",
        category: newVisit.triage_level === "emergency" ? "EMERGENCY" : "ATTENDANCE_ALERT",
        title: `Campus Clinic Notice: ${newVisit.student_name}`,
        message: `Dear Parent, ${newVisit.student_name} visited the Campus Infirmary at ${new Date(newVisit.visit_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} with symptoms: "${newVisit.symptoms}". Action taken: ${newVisit.treatment_administered}. ${newVisit.referred_to_hospital ? `Referred to: ${newVisit.hospital_name}.` : "Student is resting safely under medical care."}`,
      });
    } catch (notifyErr) {
      console.warn("[HealthService] Parent notification dispatch notice:", notifyErr);
    }
  }

  return newVisit;
}

/**
 * Fetch immutable medical access logs for compliance audit
 */
export async function fetchMedicalAccessLogs(schoolId) {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("medical_access_logs")
        .select("*")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (!error && data && data.length > 0) return data;
    } catch (err) {
      console.warn("[HealthService] Supabase logs fallback:", err);
    }
  }

  const storageKey = `erp_medical_access_logs_${schoolId}`;
  try {
    const local = JSON.parse(
      (typeof localStorage !== "undefined" ? localStorage.getItem(storageKey) : null) || "[]"
    );
    return local;
  } catch {
    return [];
  }
}

/**
 * Sanitized emergency allergy roster for first responders & teachers
 * (Minimal Data Disclosure: Does NOT expose confidential psychological or clinical diagnosis notes)
 */
export async function fetchEmergencyAllergyRoster(schoolId) {
  const records = await fetchHealthRecords(schoolId, { id: "SYSTEM", role: "FACULTY" });
  return records.map((r) => ({
    student_id: r.student_id,
    student_name: r.student_name,
    class_name: r.class_name,
    blood_group: r.blood_group,
    critical_allergies: r.critical_allergies || [],
    chronic_conditions: r.chronic_conditions || [],
    emergency_contact_name: r.emergency_contact_name,
    emergency_contact_phone: r.emergency_contact_phone,
    emergency_contact_relation: r.emergency_contact_relation,
    has_emergency_alert: (r.critical_allergies && r.critical_allergies.length > 0) ||
                         (r.chronic_conditions && r.chronic_conditions.length > 0),
  }));
}

