import { supabase } from "../supabaseClient";
import { logSecurityAction } from "./auditLogger";

/**
 * Loads notices from Supabase or localStorage fallback with strict tenant isolation
 * Clean Slate: returns empty array if no notices have been published.
 */
export async function getNotices(schoolId) {
  const cleanSchoolId = schoolId ? String(schoolId).trim().toUpperCase() : null;

  try {
    if (supabase) {
      let query = supabase.from("notices").select("*");
      if (cleanSchoolId) {
        query = query.eq("school_id", cleanSchoolId);
      }
      const { data, error } = await query.order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return data;
      }
    }
  } catch (err) {
    console.warn("Notice DB load notice:", err);
  }

  // Fallback to tenant-scoped localStorage
  try {
    if (cleanSchoolId) {
      const savedTenant = localStorage.getItem(`erp_broadcasts_${cleanSchoolId}`);
      if (savedTenant) {
        const parsed = JSON.parse(savedTenant);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }

    const savedGlobal = localStorage.getItem("erp_institutional_notices");
    if (savedGlobal) {
      const parsed = JSON.parse(savedGlobal);
      if (Array.isArray(parsed)) {
        if (cleanSchoolId) {
          return parsed.filter(
            (n) => String(n.school_id || "").toUpperCase() === cleanSchoolId
          );
        }
        return parsed;
      }
    }
  } catch {
    // ignore
  }

  // True clean slate: zero mock notices for newly registered schools
  return [];
}

/**
 * Publishes a new notice to Supabase and syncs local storage
 */
export async function publishNotice({ title, category, audience, content, date, schoolId, user }) {
  const cleanSchoolId = (schoolId || "CAMPUS-01").trim().toUpperCase();
  const newNotice = {
    id: `notice-${Date.now().toString(36)}`,
    title: title.trim(),
    category: category || "Academic",
    audience: audience || "All",
    date: date || new Date().toISOString().split("T")[0],
    content: content.trim(),
    school_id: cleanSchoolId,
    author: user?.name || "Executive Administration",
    created_at: new Date().toISOString(),
  };

  // Try Supabase insert
  try {
    if (supabase) {
      await supabase.from("notices").insert([
        {
          title: newNotice.title,
          type: newNotice.category,
          audience: newNotice.audience,
          date: newNotice.date,
          content: newNotice.content,
          school_id: newNotice.school_id,
        },
      ]);
    }
  } catch (err) {
    console.warn("Notice insertion in Supabase notice:", err);
  }

  // Update tenant localStorage
  try {
    const tenantKey = `erp_broadcasts_${cleanSchoolId}`;
    const rawTenant = localStorage.getItem(tenantKey);
    const tenantList = rawTenant ? JSON.parse(rawTenant) : [];
    const updatedTenant = [newNotice, ...tenantList.filter((n) => n.id !== newNotice.id)];
    localStorage.setItem(tenantKey, JSON.stringify(updatedTenant));

    // Also update global cache
    const globalRaw = localStorage.getItem("erp_institutional_notices");
    const globalList = globalRaw ? JSON.parse(globalRaw) : [];
    const updatedGlobal = [newNotice, ...globalList.filter((n) => n.id !== newNotice.id)];
    localStorage.setItem("erp_institutional_notices", JSON.stringify(updatedGlobal));

    // Dispatch real-time live event for all active dashboards
    window.dispatchEvent(new Event("erp-notices-updated"));
  } catch (e) {
    console.warn("Storage notice sync error:", e);
  }

  // Log Security / Audit action
  try {
    logSecurityAction({
      action: "NOTICE_PUBLISHED",
      entityType: "CIRCULAR",
      entityId: newNotice.title,
      details: `Broadcasted ${newNotice.category} notice to ${newNotice.audience}: "${newNotice.title}"`,
      user,
      schoolId: cleanSchoolId,
    });
  } catch {
    // audit logger optional
  }

  return newNotice;
}

/**
 * Delete notice
 */
export async function deleteNotice(id, schoolId) {
  const cleanSchoolId = schoolId ? String(schoolId).trim().toUpperCase() : null;

  try {
    if (supabase) {
      await supabase.from("notices").delete().eq("id", id);
    }
  } catch (err) {
    console.warn("Notice delete error in DB:", err);
  }

  try {
    if (cleanSchoolId) {
      const tenantKey = `erp_broadcasts_${cleanSchoolId}`;
      const savedTenant = localStorage.getItem(tenantKey);
      if (savedTenant) {
        const filtered = JSON.parse(savedTenant).filter((n) => n.id !== id);
        localStorage.setItem(tenantKey, JSON.stringify(filtered));
      }
    }

    const saved = localStorage.getItem("erp_institutional_notices");
    if (saved) {
      const parsed = JSON.parse(saved);
      const filtered = parsed.filter((n) => n.id !== id);
      localStorage.setItem("erp_institutional_notices", JSON.stringify(filtered));
    }

    window.dispatchEvent(new Event("erp-notices-updated"));
  } catch {
    // ignore
  }
}
