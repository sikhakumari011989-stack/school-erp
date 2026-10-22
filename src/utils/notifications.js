/**
 * Enterprise Notification Service
 * Supports WhatsApp (Wati / Twilio) and SMS (Twilio) with Mock/Sandbox fallback
 *
 * STRICT OUTBOUND MESSAGING POLICY:
 * Outbound WhatsApp and SMS dispatches are STRICTLY restricted to:
 * 1. Absenteeism Alerts (Daily roll call absences with 60-second teacher undo window)
 * 2. Fee Receipts, UPI Settlements & Defaulter Dues Reminders
 *
 * All other updates (Homework assignments, test marks, exam report cards, general notices)
 * remain STRICTLY IN-APP alerts to eliminate messaging spam.
 */

const STORAGE_KEY = "erp_notification_history";

export const PERMITTED_OUTBOUND_SCOPES = ["ABSENTEEISM", "FEE_FINANCE"];

/**
 * Persists a notification to the local audit history
 */
function recordNotification(notification) {
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    const updated = [notification, ...existing].slice(0, 100); // keep latest 100
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn("Failed to persist notification history:", err);
  }
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

/**
 * Dispatches an SMS alert via Twilio REST API (or dev simulation)
 */
export async function sendSMS({ to, message, studentName = "Student", scope = "FEE_FINANCE" }) {
  if (!PERMITTED_OUTBOUND_SCOPES.includes(scope)) {
    console.info(`[Notification Policy] Suppressed outbound SMS for non-permitted scope "${scope}". In-app alert retained.`);
    return { success: false, reason: "OUTBOUND_SCOPE_RESTRICTED" };
  }
  const accountSid = import.meta.env.VITE_TWILIO_ACCOUNT_SID;
  const authToken = import.meta.env.VITE_TWILIO_AUTH_TOKEN;
  const fromNumber = import.meta.env.VITE_TWILIO_PHONE_NUMBER || "+18005550199";
  const recipient = to || "+919876543210";

  const payload = {
    id: `sms_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    channel: "SMS",
    recipient,
    studentName,
    message,
    timestamp: new Date().toISOString(),
    status: "delivered",
  };

  // If live Twilio credentials are configured, execute real HTTPS dispatch
  if (accountSid && authToken && fromNumber) {
    try {
      const auth = btoa(`${accountSid}:${authToken}`);
      const body = new URLSearchParams({
        To: recipient,
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
      payload.status = res.ok ? "delivered" : "failed";
      payload.providerResponse = data;
    } catch (err) {
      console.warn("Live Twilio SMS dispatch error, falling back to sandbox log:", err);
      payload.status = "simulated";
    }
  } else {
    // Dev / Demo Sandbox simulation
    payload.status = "sandbox_delivered";
  }

  recordNotification(payload);
  console.info(`[SMS DISPATCHED] To: ${recipient} | Student: ${studentName}\nMessage: "${message}"`);
  return { success: true, ...payload };
}

/**
 * Dispatches a WhatsApp alert via WATI / Twilio WhatsApp (or dev simulation)
 */
export async function sendWhatsApp({ to, message, studentName = "Student", scope = "FEE_FINANCE" }) {
  if (!PERMITTED_OUTBOUND_SCOPES.includes(scope)) {
    console.info(`[Notification Policy] Suppressed outbound WhatsApp for non-permitted scope "${scope}". In-app alert retained.`);
    return { success: false, reason: "OUTBOUND_SCOPE_RESTRICTED" };
  }

  const watiEndpoint = import.meta.env.VITE_WATI_API_ENDPOINT;
  const watiToken = import.meta.env.VITE_WATI_ACCESS_TOKEN;
  const recipient = to || "+919876543210";

  const payload = {
    id: `wa_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    channel: "WhatsApp",
    recipient,
    studentName,
    message,
    timestamp: new Date().toISOString(),
    status: "delivered",
  };

  // If live WATI API endpoint is configured
  if (watiEndpoint && watiToken) {
    try {
      const res = await fetch(`${watiEndpoint}/api/v1/sendSessionMessage/${recipient}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${watiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messageText: message }),
      });

      payload.status = res.ok ? "delivered" : "failed";
    } catch (err) {
      console.warn("Live WATI WhatsApp dispatch error, falling back to sandbox log:", err);
      payload.status = "simulated";
    }
  } else {
    payload.status = "sandbox_delivered";
  }

  recordNotification(payload);
  console.info(`[WHATSAPP DISPATCHED] To: ${recipient} | Student: ${studentName}\nMessage: "${message}"`);
  return { success: true, ...payload };
}

/**
 * Triggered when a student is marked Absent during daily roll call
 */
export async function notifyAttendanceAbsent({
  studentName,
  rollNumber = "N/A",
  guardianPhone = "+91 98765 43210",
  schoolName = "Apex International Academy",
  date = new Date().toLocaleDateString("en-IN"),
  className = "10th Standard",
}) {
  const message = `[${schoolName}] Attendance Alert: Student ${studentName} (Roll: ${rollNumber}, Class: ${className}) has been marked ABSENT on ${date}. Please contact the institution office if this is an error.`;

  // Dispatch concurrently via SMS and WhatsApp (strictly scoped to absenteeism)
  const [smsResult, waResult] = await Promise.allSettled([
    sendSMS({ to: guardianPhone, message, studentName, scope: "ABSENTEEISM" }),
    sendWhatsApp({ to: guardianPhone, message, studentName, scope: "ABSENTEEISM" }),
  ]);

  return {
    studentName,
    sms: smsResult.status === "fulfilled" ? smsResult.value : null,
    whatsapp: waResult.status === "fulfilled" ? waResult.value : null,
  };
}

/**
 * Triggered when a fee payment is successfully authorized and confirmed
 */
export async function notifyFeePaymentConfirmed({
  studentName,
  amount,
  invoiceNo,
  guardianPhone = "+91 98765 43210",
  schoolName = "Apex International Academy",
  date = new Date().toLocaleDateString("en-IN"),
  paymentId = "PAY-REF",
}) {
  const formattedAmount = Number(amount || 0).toLocaleString("en-IN");
  const message = `[${schoolName}] Payment Receipt Confirmed: Fee of Rs. ${formattedAmount} received for ${studentName}. Invoice: ${invoiceNo}. Ref: ${paymentId}. Date: ${date}. Thank you!`;

  // Dispatch concurrently via SMS and WhatsApp (strictly scoped to fee settlement)
  const [smsResult, waResult] = await Promise.allSettled([
    sendSMS({ to: guardianPhone, message, studentName, scope: "FEE_FINANCE" }),
    sendWhatsApp({ to: guardianPhone, message, studentName, scope: "FEE_FINANCE" }),
  ]);

  return {
    studentName,
    sms: smsResult.status === "fulfilled" ? smsResult.value : null,
    whatsapp: waResult.status === "fulfilled" ? waResult.value : null,
  };
}

