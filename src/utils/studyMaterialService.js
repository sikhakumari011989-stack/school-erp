import { supabase } from "../supabaseClient";
import { logSecurityAction } from "./auditLogger";

/**
 * Loads study materials from Supabase or localStorage with strict school isolation
 * Returns empty array for clean slate if no faculty has uploaded materials.
 */
export async function getStudyMaterials(schoolId) {
  const cleanSchoolId = schoolId ? String(schoolId).trim().toUpperCase() : null;

  try {
    if (supabase) {
      let query = supabase.from("study_materials").select("*");
      if (cleanSchoolId) {
        query = query.eq("school_id", cleanSchoolId);
      }
      const { data, error } = await query.order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((d) => ({
          id: d.id,
          title: d.title,
          subject: d.subject || "General",
          className: d.class_name || "General Batch",
          type: d.file_type || d.type || "PDF",
          size: d.size || "1.5 MB",
          description: d.description || "",
          school_id: d.school_id,
          created_at: d.created_at,
          author: d.author || "Departmental Faculty",
        }));
      }
    }
  } catch (err) {
    console.warn("Study materials DB query notice:", err);
  }

  // Fallback to tenant-scoped localStorage
  try {
    if (cleanSchoolId) {
      const savedTenant = localStorage.getItem(`erp_study_materials_${cleanSchoolId}`);
      if (savedTenant) {
        const parsed = JSON.parse(savedTenant);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }

    const savedGlobal = localStorage.getItem("erp_study_materials");
    if (savedGlobal) {
      const parsed = JSON.parse(savedGlobal);
      if (Array.isArray(parsed)) {
        if (cleanSchoolId) {
          return parsed.filter(
            (m) => String(m.school_id || "").toUpperCase() === cleanSchoolId
          );
        }
        return parsed;
      }
    }
  } catch {
    // ignore
  }

  // Clean Slate: zero default mock notes
  return [];
}

/**
 * Uploads/publishes new study material to Supabase & localStorage
 */
export async function publishStudyMaterial({
  title,
  subject,
  className,
  type = "PDF",
  size = "2.1 MB",
  description,
  schoolId,
  user,
}) {
  const cleanSchoolId = (schoolId || "CAMPUS-01").trim().toUpperCase();
  const newMaterial = {
    id: `mat_${Date.now()}`,
    title: title.trim(),
    subject: subject ? subject.trim() : "General",
    className: className ? className.trim() : "All Batches",
    type: type || "PDF",
    size: size || "2.1 MB",
    description: description ? description.trim() : "Faculty uploaded syllabus reference and notes.",
    school_id: cleanSchoolId,
    author: user?.name || user?.full_name || "Faculty Member",
    created_at: new Date().toISOString(),
  };

  // 1. Try Supabase insert
  try {
    if (supabase) {
      await supabase.from("study_materials").insert([
        {
          title: newMaterial.title,
          subject: newMaterial.subject,
          class_name: newMaterial.className,
          file_type: newMaterial.type,
          size: newMaterial.size,
          description: newMaterial.description,
          school_id: newMaterial.school_id,
          author: newMaterial.author,
        },
      ]);
    }
  } catch (err) {
    console.warn("Study materials DB insert notice:", err);
  }

  // 2. Save to tenant-scoped localStorage
  try {
    const tenantKey = `erp_study_materials_${cleanSchoolId}`;
    const rawTenant = localStorage.getItem(tenantKey);
    const tenantList = rawTenant ? JSON.parse(rawTenant) : [];
    const updatedTenant = [newMaterial, ...tenantList.filter((m) => m.id !== newMaterial.id)];
    localStorage.setItem(tenantKey, JSON.stringify(updatedTenant));

    // Also sync global cache
    const globalRaw = localStorage.getItem("erp_study_materials");
    const globalList = globalRaw ? JSON.parse(globalRaw) : [];
    const updatedGlobal = [newMaterial, ...globalList.filter((m) => m.id !== newMaterial.id)];
    localStorage.setItem("erp_study_materials", JSON.stringify(updatedGlobal));

    // Dispatch event for student LMS real-time sync
    window.dispatchEvent(new Event("erp-study-materials-updated"));
  } catch (e) {
    console.warn("LocalStorage study materials sync error:", e);
  }

  // 3. Audit log
  try {
    logSecurityAction({
      action: "STUDY_MATERIAL_PUBLISHED",
      entityType: "LMS_MATERIAL",
      entityId: newMaterial.id,
      details: `Faculty published ${newMaterial.type} study note "${newMaterial.title}" (${newMaterial.subject}) for ${newMaterial.className}`,
      user,
      schoolId: cleanSchoolId,
    });
  } catch {}

  return newMaterial;
}

/**
 * Delete a study material
 */
export async function deleteStudyMaterial(id, schoolId) {
  const cleanSchoolId = schoolId ? String(schoolId).trim().toUpperCase() : null;

  try {
    if (supabase) {
      await supabase.from("study_materials").delete().eq("id", id);
    }
  } catch (err) {
    console.warn("Study materials DB delete notice:", err);
  }

  try {
    if (cleanSchoolId) {
      const tenantKey = `erp_study_materials_${cleanSchoolId}`;
      const savedTenant = localStorage.getItem(tenantKey);
      if (savedTenant) {
        const filtered = JSON.parse(savedTenant).filter((m) => m.id !== id);
        localStorage.setItem(tenantKey, JSON.stringify(filtered));
      }
    }

    const saved = localStorage.getItem("erp_study_materials");
    if (saved) {
      const parsed = JSON.parse(saved);
      const filtered = parsed.filter((m) => m.id !== id);
      localStorage.setItem("erp_study_materials", JSON.stringify(filtered));
    }

    window.dispatchEvent(new Event("erp-study-materials-updated"));
  } catch {}
}

