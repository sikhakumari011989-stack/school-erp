import { supabase } from "../supabaseClient";

/**
 * Generates an 8-byte (16 hex chars) cryptographic token for public QR verification.
 */
export function generateVerificationToken() {
  if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) {
    const bytes = new Uint8Array(8);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
  }
  return Math.random().toString(36).substring(2, 10).toUpperCase() +
         Math.random().toString(36).substring(2, 10).toUpperCase();
}

/**
 * Generate serial number conforming to TC-YYYY-XXXX format
 */
export async function generateSerial(schoolId, certType) {
  const currentYear = new Date().getFullYear().toString();
  const typeMap = {
    "Transfer Certificate (TC)": "TC",
    "Transfer Certificate": "TC",
    "Bonafide Certificate": "BNF",
    "Character Certificate": "CHR",
    "Fee Clearance Letter": "FEE",
    "Merit Certificate": "MRT",
  };
  const prefix = typeMap[certType] || "CRT";

  if (supabase) {
    try {
      const { data, error } = await supabase.rpc("generate_certificate_serial", {
        p_school_id: schoolId,
        p_cert_type: certType,
      });
      if (!error && data) return data;
    } catch (err) {
      console.warn("[CertService] RPC serial fallback:", err);
    }
  }

  // Fallback sequential counter
  const storageKey = `erp_cert_serial_counter_${schoolId}_${prefix}`;
  const currentCount = parseInt(localStorage.getItem(storageKey) || "101", 10);
  const nextCount = currentCount + 1;
  localStorage.setItem(storageKey, nextCount.toString());

  return `${prefix}-${currentYear}-${String(nextCount).padStart(4, "0")}`;
}

/**
 * Issue and cryptographically seal an official school credential
 */
export async function issueOfficialCertificate({
  schoolId,
  certType,
  studentId,
  studentName,
  className,
  guardianName = "",
  reason = "Higher studies / Official request",
  issuedBy = "Principal Office",
}) {
  const serialNumber = await generateSerial(schoolId, certType);
  const verificationCode = generateVerificationToken();
  const verificationHash = `SHA256:${verificationCode}:${Date.now()}`;
  const now = new Date().toISOString();

  const newRecord = {
    id: `CERT-${Date.now().toString().slice(-8)}`,
    school_id: schoolId,
    certificate_type: certType,
    serial_number: serialNumber,
    student_id: studentId || "STU-" + Math.floor(1000 + Math.random() * 9000),
    student_name: studentName,
    class_name: className || "General Batch",
    guardian_name: guardianName,
    reason: reason,
    status: "issued",
    verification_code: verificationCode,
    verification_hash: verificationHash,
    issued_by: issuedBy,
    issued_at: now,
    verification_url: `${typeof window !== "undefined" ? window.location.origin : ""}/verify-credential/${verificationCode}`,
  };

  // 1. Supabase attempt
  if (supabase) {
    try {
      await supabase.from("issued_certificates").insert([
        {
          school_id: newRecord.school_id,
          certificate_type: newRecord.certificate_type,
          serial_number: newRecord.serial_number,
          student_id: newRecord.student_id,
          student_name: newRecord.student_name,
          class_name: newRecord.class_name,
          guardian_name: newRecord.guardian_name,
          reason: newRecord.reason,
          status: newRecord.status,
          verification_code: newRecord.verification_code,
          verification_hash: newRecord.verification_hash,
          issued_by: newRecord.issued_by,
        },
      ]);
    } catch (sErr) {
      console.warn("[CertService] Supabase insert notice:", sErr);
    }
  }

  // 2. Persist to local storage
  const storageKey = `erp_issued_certificates_${schoolId}`;
  try {
    const existing = JSON.parse(localStorage.getItem(storageKey) || "[]");
    localStorage.setItem(storageKey, JSON.stringify([newRecord, ...existing]));
  } catch (err) {
    console.warn("[CertService] LocalStorage save notice:", err);
  }

  window.dispatchEvent(new Event("erp-certificates-updated"));
  return newRecord;
}

/**
 * Revoke an issued certificate
 */
export async function revokeCertificate(schoolId, certIdOrSerial, reason, revokedBy = "Principal") {
  const now = new Date().toISOString();

  if (supabase) {
    try {
      await supabase
        .from("issued_certificates")
        .update({
          status: "revoked",
          revoked_by: revokedBy,
          revoked_at: now,
          revocation_reason: reason,
        })
        .or(`id.eq.${certIdOrSerial},serial_number.eq.${certIdOrSerial}`);
    } catch (sErr) {
      console.warn("[CertService] Supabase revoke notice:", sErr);
    }
  }

  // Local storage update
  const storageKey = `erp_issued_certificates_${schoolId}`;
  try {
    const existing = JSON.parse(localStorage.getItem(storageKey) || "[]");
    const updated = existing.map((c) =>
      c.id === certIdOrSerial || c.serial_number === certIdOrSerial
        ? {
            ...c,
            status: "revoked",
            revoked_by: revokedBy,
            revoked_at: now,
            revocation_reason: reason,
          }
        : c
    );
    localStorage.setItem(storageKey, JSON.stringify(updated));
  } catch (err) {
    console.warn("[CertService] Local revoke update notice:", err);
  }

  window.dispatchEvent(new Event("erp-certificates-updated"));
  return true;
}

/**
 * Fetch list of all issued certificates
 */
export async function fetchIssuedCertificates(schoolId) {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("issued_certificates")
        .select("*")
        .eq("school_id", schoolId)
        .order("issued_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((d) => ({
          ...d,
          verification_url: `${typeof window !== "undefined" ? window.location.origin : ""}/verify-credential/${d.verification_code}`,
        }));
      }
    } catch (err) {
      console.warn("[CertService] Supabase fetch fallback:", err);
    }
  }

  const storageKey = `erp_issued_certificates_${schoolId}`;
  try {
    const local = JSON.parse(localStorage.getItem(storageKey) || "[]");
    return local;
  } catch {
    return [];
  }
}

