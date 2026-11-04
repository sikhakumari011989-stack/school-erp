import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

/**
 * Vercel Serverless Function: Razorpay Webhook Handler
 * Endpoint: /api/razorpay-webhook
 *
 * Verifies mathematical HMAC-SHA256 signature from Razorpay servers
 * and updates Supabase fee_ledger table for financial compliance.
 */
export default async function handler(req, res) {
  // Prevent Vercel CDN cross-tenant data caching
  res.setHeader("Cache-Control", "private, no-store, max-age=0");

  // 1. Healthcheck / CORS Preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-razorpay-signature");
    return res.status(200).end();
  }

  if (req.method === "GET") {
    return res.status(200).json({
      status: "active",
      service: "Razorpay Serverless Webhook Gateway",
      timestamp: new Date().toISOString(),
      supportedEvents: ["payment.captured", "payment.failed", "refund.processed"],
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed. Use POST." });
  }

  try {
    const receivedSignature = req.headers["x-razorpay-signature"];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("[Razorpay Webhook] RAZORPAY_WEBHOOK_SECRET is not configured on the server.");
      return res.status(500).json({ error: "Server configuration error: Webhook secret unconfigured." });
    }

    if (!receivedSignature) {
      console.error("[Razorpay Webhook] Missing mandatory x-razorpay-signature header.");
      return res.status(401).json({ error: "Missing required signature header." });
    }

    // 2. Validate Payload Signature with timing-safe comparison
    const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    const sigBuf = Buffer.from(receivedSignature.trim(), "utf8");
    const expBuf = Buffer.from(expectedSignature.trim(), "utf8");

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      console.error("[Razorpay Webhook] Signature mismatch! Rejecting untrusted payload.");
      return res.status(400).json({ error: "Invalid cryptographic signature." });
    }

    const event = typeof req.body === "object" ? req.body : JSON.parse(rawBody);

    // 3. Catch payment.captured Event
    if (event.event === "payment.captured") {
      const payment = event.payload?.payment?.entity;
      if (!payment) {
        return res.status(400).json({ error: "Missing payment entity in payload." });
      }

      const paymentId = payment.id;
      const amountInRupees = Number(payment.amount) / 100;
      const notes = payment.notes || {};
      const studentName = notes.student_name || "Enrolled Student";
      const ledgerId = notes.ledger_id || null;
      const schoolId = notes.school_id;

      if (!schoolId) {
        return res.status(400).json({ error: "Missing mandatory school_id in payment notes metadata." });
      }

      console.info(
        `[Razorpay Webhook] Verified payment.captured: ${paymentId} for ₹${amountInRupees} (Student: ${studentName}, School: ${schoolId})`
      );

      // 4. Initialize Supabase Client with Service Role Key
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseKey) {
        console.error("[Razorpay Webhook] SUPABASE_SERVICE_ROLE_KEY missing on server.");
        return res.status(500).json({ error: "Server database configuration error: Service role key missing." });
      }

      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
      });

      // 5. Idempotent check: prevent duplicate credit if webhook is redelivered
      const { data: existingTxn } = await supabase
        .from("fee_ledger")
        .select("id, status")
        .eq("razorpay_payment_id", paymentId)
        .maybeSingle();

      if (existingTxn && existingTxn.status === "paid") {
        return res.status(200).json({
          success: true,
          idempotent: true,
          message: "Payment already captured and ledger updated.",
          paymentId,
        });
      }

      // 6. Update or Insert into Supabase fee_ledger table
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      let updatedRows = null;

      if (ledgerId && uuidRegex.test(String(ledgerId))) {
        const { data, error: updateError } = await supabase
          .from("fee_ledger")
          .update({
            status: "paid",
            payment_mode: `Online (Razorpay ${payment.method || "Verified"})`,
            razorpay_payment_id: paymentId,
          })
          .eq("id", ledgerId)
          .eq("school_id", schoolId)
          .select();

        if (updateError) {
          console.error("[Razorpay Webhook] Error updating fee_ledger:", updateError);
          return res.status(500).json({ error: "Database error updating fee ledger: " + updateError.message });
        }
        updatedRows = data;
      } else {
        const { data, error: insertError } = await supabase
          .from("fee_ledger")
          .insert([
            {
              school_id: schoolId,
              student_name: studentName,
              class_name: notes.class_name || "Online Checkout",
              amount: amountInRupees,
              status: "paid",
              payment_mode: `Online (Razorpay ${payment.method || "Verified"})`,
              razorpay_payment_id: paymentId,
              date: new Date().toISOString().split("T")[0],
            },
          ])
          .select();

        if (insertError) {
          console.error("[Razorpay Webhook] Error inserting fee_ledger row:", insertError);
          return res.status(500).json({ error: "Database error creating fee ledger record: " + insertError.message });
        }
        updatedRows = data;
      }

      return res.status(200).json({
        success: true,
        event: event.event,
        paymentId,
        amount: amountInRupees,
        recordsUpdated: updatedRows?.length || 1,
        verifiedServerSide: true,
      });
    }

    // Default response for other webhook events
    return res.status(200).json({
      received: true,
      event: event.event || "unknown",
      message: "Webhook processed successfully.",
    });
  } catch (err) {
    console.error("[Razorpay Webhook Error]:", err);
    return res.status(500).json({ error: "Internal server error processing webhook." });
  }
}
