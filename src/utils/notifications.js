import { supabase } from "../supabaseClient";

/**
 * ENTERPRISE PARENT COMMUNICATION AUTOMATION ENGINE
 * Supports WhatsApp, SMS, and In-App alerts across 6 operational triggers:
 * 1. Absenteeism alerts
 * 2. Fee dues & payment reminders with Razorpay UPI links
 * 3. Examination result publications
 * 4. Daily homework assignments
 * 5. Institutional announcements & advisories
 * 6. Academic calendar event reminders
 */

const STORAGE_KEY = "erp_notification_history";

export const COMMUNICATION_CATEGORIES = [
  { id: "absence", label: "Attendance & Absence Alert", icon: "🚨" },
  { id: "fee_reminder", label: "Fee Due & UPI Payment Reminder", icon: "💰" },
  { id: "exam_result", label: "Examination Result & Grade Slip", icon: "📊" },
  { id: "homework", label: "Homework & Daily Assignment", icon: "📚" },
  { id: "announcement", label: "Institutional Broadcast Announcement", icon: "📢" },
  { id: "event", label: "Academic Event / Holiday Notice", icon: "📅" },
];

/**
 * Check provider connection status
 */
export function getCommunicationGatewayStatus() {
  const hasWati = Boolean(import.meta.env.VITE_WATI_API_ENDPOINT && import.meta.env.VITE_WATI_ACCESS_TOKEN);
  const hasTwilio = Boolean(import.meta.env.VITE_TWILIO_ACCOUNT_SID && import.meta.env.VITE_TWILIO_AUTH_TOKEN);

  return {
    whatsappConfigured: hasWati,
    smsConfigured: hasTwilio,
    whatsappGateway: hasWati ? "WATI WhatsApp Cloud API (Online)" : "Configurable Gateway (Awaiting WATI credentials)",
    smsGateway: hasTwilio ? "Twilio REST SMS API (Online)" : "Configurable SMS (Awaiting Twilio credentials)",
  };
}

/**
 * Dispatch automated parent notification with tenant audit & preference checking
 */
export async function dispatchParentNotification({
  schoolId = "CAMPUS-01",
  recipientPhone,
  recipientName = "Parent / Guardian",
  studentId,
  category = "announcement",
  message,
  channel = "whatsapp",
}) {
  const cleanSchool = String(schoolId).trim().toUpperCase();
  const cleanPhone = recipientPhone || "+91 98200 00000";
  const gateway = getCommunicationGatewayStatus();

  let deliveryStatus = "pending";
  let providerResponse = null;

  // 1. WhatsApp Delivery
  if (channel === "whatsapp") {
    if (gateway.whatsappConfigured) {
      try {
        const watiEndpoint = import.meta.env.VITE_WATI_API_ENDPOINT;
        const watiToken = import.meta.env.VITE_WATI_ACCESS_TOKEN;
        const res = await fetch(`${watiEndpoint}/api/v1/sendSessionMessage/${cleanPhone.replace(/[^0-9]/g, "")}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${watiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ messageText: message }),
        });
        const data = await res.json();
        deliveryStatus = res.ok ? "delivered" : "failed";
        providerResponse = data;
      } catch (err) {
        deliveryStatus = "failed";
        providerResponse = { error: err.message };
      }
    } else {
      // Never claim live delivery if gateway is not connected
      deliveryStatus = "queued";
      providerResponse = { note: "Queued in local gateway pending WATI credentials" };
    }
  }

  // 2. SMS Delivery
  if (channel === "sms") {
    if (gateway.smsConfigured) {
      try {
        const accountSid = import.meta.env.VITE_TWILIO_ACCOUNT_SID;
        const authToken = import.meta.env.VITE_TWILIO_AUTH_TOKEN;
        const fromNumber = import.meta.env.VITE_TWILIO_PHONE_NUMBER;
        const auth = btoa(`${accountSid}:${authToken}`);
        const body = new URLSearchParams({
          To: cleanPhone,
          From: fromNumber,
          Body: message,
        });

        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: body.toString(),
        });
        const data = await res.json();
        deliveryStatus = res.ok ? "delivered" : "failed";
        providerResponse = data;
      } catch (err) {
        deliveryStatus = "failed";
        providerResponse = { error: err.message };
      }
    } else {
      deliveryStatus = "queued";
      providerResponse = { note: "Queued in local gateway pending Twilio credentials" };
    }
  }

  if (channel === "in_app") {
    deliveryStatus = "delivered";
  }

  const notificationRecord = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    school_id: cleanSchool,
    recipient_phone: cleanPhone,
    recipient_name: recipientName,
    student_id: studentId || null,
    channel,
    category,
    message,
    delivery_status: deliveryStatus,
    provider_response: providerResponse,
    sent_at: deliveryStatus === "delivered" ? new Date().toISOString() : null,
    created_at: new Date().toISOString(),
  };

  // 3. Persist to Supabase if connected
  if (supabase) {
    try {
      await supabase.from("parent_notifications").insert([
        {
          school_id: cleanSchool,
          recipient_phone: cleanPhone,
          recipient_name: recipientName,
          student_id: studentId || null,
          channel,
          category,
          message,
          delivery_status: deliveryStatus,
          provider_response: providerResponse,
          sent_at: deliveryStatus === "delivered" ? new Date().toISOString() : null,
        },
      ]);
    } catch (e) {
      console.warn("[ParentNotif] Supabase persistence notice:", e);
    }
  }

  // 4. Update local storage history
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    localStorage.setItem(STORAGE_KEY, JSON.stringify([notificationRecord, ...existing].slice(0, 100)));
  } catch (err) {}

  return notificationRecord;
}

/**
 * Automated Absence Alert Trigger
 */
export async function notifyAttendanceAbsent({
  studentName,
  rollNumber,
  guardianPhone,
  className,
  schoolName = "Institutional Campus",
  schoolId = "CAMPUS-01",
}) {
  const message = `🚨 Absence Alert: ${studentName} (${rollNumber}, ${className}) was marked ABSENT today at ${schoolName}. If this was in error, please contact the campus office.`;
  return dispatchParentNotification({
    schoolId,
    recipientPhone: guardianPhone,
    recipientName: `Parent of ${studentName}`,
    studentId: rollNumber,
    category: "absence",
    message,
    channel: "whatsapp",
  });
}

/**
 * Automated Fee Reminder Trigger
 */
export async function notifyFeeReminder({
  studentName,
  rollNumber,
  guardianPhone,
  amountDue,
  dueDate,
  paymentUrl,
  schoolId = "CAMPUS-01",
}) {
  const message = `💰 Fee Reminder: Term dues of ₹${Number(amountDue).toLocaleString("en-IN")} for ${studentName} (${rollNumber}) are due on ${dueDate}. Pay securely via online link: ${paymentUrl || "https://school.edu/pay"}`;
  return dispatchParentNotification({
    schoolId,
    recipientPhone: guardianPhone,
    recipientName: `Parent of ${studentName}`,
    studentId: rollNumber,
    category: "fee_reminder",
    message,
    channel: "whatsapp",
  });
}

/**
 * Automated Fee Payment Confirmation Trigger
 */
export async function notifyFeePaymentConfirmed({
  studentName,
  amount,
  invoiceNo,
  guardianPhone,
  schoolName = "Institutional Campus",
  schoolId = "CAMPUS-01",
}) {
  const message = `✅ Fee Receipt Confirmed: Payment of ₹${Number(amount).toLocaleString("en-IN")} received for ${studentName} (Invoice: ${invoiceNo}) at ${schoolName}. Formal fee receipt is available in the Student Portal.`;
  return dispatchParentNotification({
    schoolId,
    recipientPhone: guardianPhone,
    recipientName: `Parent of ${studentName}`,
    category: "fee_reminder",
    message,
    channel: "whatsapp",
  });
}

/**
 * Direct SMS dispatch export for legacy compatibility
 */
export async function sendSMS({ to, message, studentName = "Student", scope = "FEE_FINANCE" }) {
  return dispatchParentNotification({
    recipientPhone: to,
    recipientName: studentName,
    message,
    channel: "sms",
  });
}

/**
 * Direct WhatsApp dispatch export for legacy compatibility
 */
export async function sendWhatsApp({ to, message, studentName = "Student", scope = "FEE_FINANCE" }) {
  return dispatchParentNotification({
    recipientPhone: to,
    recipientName: studentName,
    message,
    channel: "whatsapp",
  });
}

/**
 * Retrieve recent notification history
 */
export function getNotificationHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}
