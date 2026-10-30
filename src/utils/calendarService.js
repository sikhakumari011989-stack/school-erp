/**
 * Academic Calendar & Daily Campus Pulse Service
 * Supports sparse date inputs (only special holidays, exams, functions need to be listed).
 * Any unlisted date automatically defaults to a normal working academic day.
 */

const STORAGE_PREFIX = "erp_calendar_";

/**
 * Normalizes date string to YYYY-MM-DD format
 * Supports YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, MM/DD/YYYY
 */
export function normalizeDateString(dateInput) {
  if (!dateInput) return "";
  const trimmed = String(dateInput).trim();

  // 1. If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // 2. If DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, "0");
    const month = dmyMatch[2].padStart(2, "0");
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // 3. Fallback Date parsing
  try {
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, "0");
      const d = String(parsed.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  } catch {}

  return trimmed;
}

/**
 * Formats a YYYY-MM-DD date into friendly readable string (e.g. 27 Oct 2026)
 */
export function formatDisplayDate(dateStr) {
  const normalized = normalizeDateString(dateStr);
  try {
    const [y, m, d] = normalized.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/**
 * Reads calendar records for a specific school node
 */
export function getCalendarEvents(schoolCode = "CAMPUS-01") {
  const key = `${STORAGE_PREFIX}${schoolCode.toUpperCase()}`;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("Failed to read calendar events:", err);
    return [];
  }
}

/**
 * Saves calendar records and broadcasts an update event
 */
export function saveCalendarEvents(schoolCode = "CAMPUS-01", events = []) {
  const cleanSchool = schoolCode.toUpperCase();
  const key = `${STORAGE_PREFIX}${cleanSchool}`;
  try {
    localStorage.setItem(key, JSON.stringify(events));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("erp-calendar-updated", { detail: { schoolCode: cleanSchool, events } }));
    }
  } catch (err) {
    console.error("Failed to save calendar events:", err);
  }
}

/**
 * Parses a sparse CSV containing only special dates
 * Required columns: Date, Title, Category, Reason / Details
 */
export function parseSparseCalendarCsv(csvText) {
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) {
    throw new Error("CSV must include a header and at least one event row.");
  }

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));
  
  // Detect date, title, category, reason column indexes
  const dateIdx = headers.findIndex((h) => h.includes("date"));
  const titleIdx = headers.findIndex((h) => h.includes("title") || h.includes("name") || h.includes("event"));
  const catIdx = headers.findIndex((h) => h.includes("cat") || h.includes("type"));
  const reasonIdx = headers.findIndex((h) => h.includes("reason") || h.includes("detail") || h.includes("desc"));

  if (dateIdx === -1 || titleIdx === -1) {
    throw new Error("CSV must contain at least 'Date' and 'Title' columns.");
  }

  const parsedEvents = [];

  lines.slice(1).forEach((line, index) => {
    // Comma-separated with quote tolerance
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const rawDate = values[dateIdx] || "";
    const rawTitle = values[titleIdx] || "";
    const rawCategory = catIdx !== -1 ? values[catIdx] : "Event";
    const rawReason = reasonIdx !== -1 ? values[reasonIdx] : "";

    if (!rawDate || !rawTitle) return;

    const normalizedDate = normalizeDateString(rawDate);

    // Standardize category into Holiday | Exam | Function | Event
    let category = "Event";
    const catLower = rawCategory.toLowerCase();
    if (catLower.includes("holi") || catLower.includes("vacation") || catLower.includes("break") || catLower.includes("off")) {
      category = "Holiday";
    } else if (catLower.includes("exam") || catLower.includes("test") || catLower.includes("cbt") || catLower.includes("assess")) {
      category = "Exam";
    } else if (catLower.includes("func") || catLower.includes("fest") || catLower.includes("cultur") || catLower.includes("annual")) {
      category = "Function";
    }

    parsedEvents.push({
      id: `ev_${Date.now()}_${index}`,
      date: normalizedDate,
      title: rawTitle,
      category,
      reason: rawReason || `${category} scheduled on institutional calendar`,
      isHoliday: category === "Holiday",
    });
  });

  return parsedEvents;
}

/**
 * Daily Live Auto-Sync Engine
 * Checks today's system date and next 7 days against erp_calendar_${schoolCode}.
 * If today is not in calendar, automatically returns "Regular Academic Day".
 */
export function getTodayAndUpcomingPulse(schoolCode = "CAMPUS-01") {
  const cleanSchool = schoolCode.toUpperCase();
  const events = getCalendarEvents(cleanSchool);

  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const todayIso = `${y}-${m}-${d}`;

  // Find if today is listed as a special date
  const todayEvent = events.find((e) => normalizeDateString(e.date) === todayIso);

  // Scan upcoming 7 days
  const upcomingEvents = [];
  for (let i = 1; i <= 7; i++) {
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + i);
    const ty = targetDate.getFullYear();
    const tm = String(targetDate.getMonth() + 1).padStart(2, "0");
    const td = String(targetDate.getDate()).padStart(2, "0");
    const targetIso = `${ty}-${tm}-${td}`;

    const match = events.find((e) => normalizeDateString(e.date) === targetIso);
    if (match) {
      upcomingEvents.push({
        ...match,
        daysAway: i,
        dayLabel: i === 1 ? "Tomorrow" : `In ${i} days`,
        formattedDate: formatDisplayDate(targetIso),
      });
    }
  }

  let todayPulse;

  if (todayEvent) {
    todayPulse = {
      isSpecial: true,
      category: todayEvent.category, // 'Holiday' | 'Exam' | 'Function' | 'Event'
      title: todayEvent.title,
      reason: todayEvent.reason || "Scheduled on institutional calendar.",
      badge:
        todayEvent.category === "Holiday"
          ? "Campus Closed (Holiday)"
          : todayEvent.category === "Exam"
          ? "Examination Day"
          : todayEvent.category === "Function"
          ? "Campus Function / Event"
          : "Special Event Day",
      isHoliday: todayEvent.category === "Holiday",
      isExam: todayEvent.category === "Exam",
    };
  } else {
    // Normal working academic day (Sparse fallback)
    todayPulse = {
      isSpecial: false,
      category: "Working Day",
      title: "Regular Academic Day 📚",
      reason: "All regular class lectures, lab sessions, and academic timetable in full effect.",
      badge: "Campus Open (Working Day)",
      isHoliday: false,
      isExam: false,
    };
  }

  return {
    todayIso,
    todayFormatted: formatDisplayDate(todayIso),
    todayPulse,
    upcomingEvents,
    totalScheduledEvents: events.length,
  };
}

/**
 * Generates sample sparse calendar CSV content
 */
export function generateSampleSparseCalendarCsv() {
  return `Date,Title,Category,Reason / Details
2026-11-04,Diwali Festival Break,Holiday,Campus closed for Diwali festivities
2026-11-05,Govardhan Puja,Holiday,Public holiday
2026-11-20,Mid-Term Computer CBT Examination,Exam,Online timed test arena active
2026-12-25,Christmas Day,Holiday,Winter recess
2027-01-26,Republic Day Flag Hoisting,Function,Campus assembly and cultural presentations`;
}
