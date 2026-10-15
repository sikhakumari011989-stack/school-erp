import { supabase } from "../supabaseClient";
import { logSecurityAction } from "./auditLogger";

const DEFAULT_NOTICES = [
  {
    id: "notif-01",
    title: "Diwali & Autumn Semester Break Announced",
    category: "Holiday",
    audience: "All",
    date: "2026-10-20",
    content: "The institution will remain closed from Oct 22 to Oct 28 for the festive season. Regular sessions resume Monday.",
    author: "Trustee Board & Principal",
  },
  {
    id: "notif-02",
    title: "Term II Board Revision & Mock Examinations",
    category: "Exam",
    audience: "Students",
    date: "2026-10-18",
    content: "Comprehensive ICSE Class 10 full syllabus mock examinations commence next week. Review the LMS study bank.",
    author: "Academic Council",
  },
  {
    id: "notif-03",
    title: "Urgent: Second Term Tuition Fee Ledger Clearance",
    category: "Fee",
    audience: "Students",
    date: "2026-10-16",
    content: "Please settle pending Term 2 dues online via the Razorpay gateway before the month-end audit cutoff.",
    author: "Treasury Department",
  },
  {
    id: "notif-04",
    title: "Faculty Academic Review & Curriculum Sync",
    category: "Academic",
    audience: "Teachers",
    date: "2026-10-17",
    content: "Mandatory faculty meeting at 3:30 PM in the Central Conference Hall to finalize ICSE question banks.",
    author: "HOD Operations",
  },
];

/**
 * Loads notices from Supabase or localStorage fallback
 */
export async function getNotices(schoolId) {
  try {
    const { data, error } = await supabase
      .from("notices")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      return data;
    }
  } catch (err) {
    console.warn("Notice DB load notice:", err);
  }

  // Fallback to localStorage
  try {
    const saved = localStorage.getItem("erp_institutional_notices");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }

  return DEFAULT_NOTICES;
}

/**
 * Publishes a new notice to Supabase and syncs local storage
 */
export async function publishNotice({ title, category, audience, content, date, schoolId, user }) {
  const newNotice = {
    id: `notice-${Date.now().toString(36)}`,
    title: title.trim(),
    category: category || "Academic",
    audience: audience || "All",
    date: date || new Date().toISOString().split("T")[0],
    content: content.trim(),
    school_id: schoolId || "OASIS-TUTORIALS",
    author: user?.name || "Executive Administration",
    created_at: new Date().toISOString(),
  };

  // Try Supabase insert
  try {
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
  } catch (err) {
    console.warn("Notice insertion in Supabase notice:", err);
  }

  // Update localStorage
  try {
    const current = await getNotices(schoolId);
    const updated = [newNotice, ...current.filter((n) => n.id !== newNotice.id)];
    localStorage.setItem("erp_institutional_notices", JSON.stringify(updated));
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
      schoolId,
    });
  } catch {
    // audit logger optional
  }

  return newNotice;
}

/**
 * Delete notice
 */
export async function deleteNotice(id) {
  try {
    await supabase.from("notices").delete().eq("id", id);
  } catch (err) {
    console.warn("Notice delete error in DB:", err);
  }

  try {
    const saved = localStorage.getItem("erp_institutional_notices");
    if (saved) {
      const parsed = JSON.parse(saved);
      const filtered = parsed.filter((n) => n.id !== id);
      localStorage.setItem("erp_institutional_notices", JSON.stringify(filtered));
    }
  } catch {
    // ignore
  }
}
