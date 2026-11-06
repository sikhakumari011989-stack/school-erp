import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

/**
 * Vercel Serverless Function: Verify Razorpay Payment Signature
 * Endpoint: /api/razorpay/verify-payment
 *
 * Verifies mathematical HMAC-SHA256 signature of (order_id + "|" + payment_id)
 * against server secret RAZORPAY_KEY_SECRET, and credits fee_ledger idempotently.
 */
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method Not Allowed. Use POST." });
  }

  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      return res.status(500).json({
        success: false,
        error: "Server configuration error: RAZORPAY_KEY_SECRET is unconfigured.",
      });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      schoolId,
      studentId,
      studentName = "Enrolled Student",
      studentEmail = "",
      className = "Class 10",
      amount,
      feeTitle = "Tuition Fee Settlement",
      isPartial = false,
    } = req.body || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: "Missing mandatory signature verification parameters (order_id, payment_id, signature).",
      });
    }

    // 1. Constant-time cryptographic HMAC-SHA256 verification
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const sigBuf = Buffer.from(razorpay_signature.trim(), "utf8");
    const expBuf = Buffer.from(expectedSignature.trim(), "utf8");

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      console.error("[Razorpay Verify] Invalid signature mismatch for payment:", razorpay_payment_id);
      return res.status(400).json({
        success: false,
        error: "Cryptographic signature verification failed. Untrusted payment assertion.",
      });
    }

    const cleanSchool = (schoolId || "CAMPUS-01").trim().toUpperCase();
    const numAmount = Number(amount) || 0;
    const invoiceNo = `INV-${Date.now().toString().slice(-6)}`;
    const today = new Date().toISOString().split("T")[0];

    // 2. Database reconciliation via Supabase service_role
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceKey) {
      const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

      // Validate payment-order idempotency and ownership if payment_orders table has the order
      try {
        const { data: orderRecord } = await supabase
          .from("payment_orders")
          .select("*")
          .eq("order_id", razorpay_order_id)
          .maybeSingle();

        if (orderRecord) {
          // Verify tenant ownership
          if (orderRecord.school_id && orderRecord.school_id.toUpperCase() !== cleanSchool.toUpperCase()) {
            return res.status(403).json({
              success: false,
              error: "Tenant ownership violation: Payment order does not belong to the asserting school.",
            });
          }

          // Verify order amount consistency
          if (orderRecord.amount && numAmount > 0 && Math.abs(Number(orderRecord.amount) - numAmount) > 0.01) {
            return res.status(400).json({
              success: false,
              error: "Payment amount mismatch between gateway order and settlement assertion.",
            });
          }

          // Verify payment order idempotency: already marked paid
          if (orderRecord.status === "paid" && orderRecord.payment_id === razorpay_payment_id) {
            return res.status(200).json({
              success: true,
              verified: true,
              duplicate: true,
              message: "Payment signature verified. Order was previously settled and reconciled.",
              payment_id: razorpay_payment_id,
              invoice_no: invoiceNo,
            });
          }
        }
      } catch (orderCheckErr) {
        console.warn("[Razorpay Verify] Order validation notice:", orderCheckErr.message);
      }

      // Idempotency check: verify this razorpay_payment_id has not already been credited
      const { data: existingLedger } = await supabase
        .from("fee_ledger")
        .select("id, status")
        .eq("school_id", cleanSchool)
        .eq("razorpay_payment_id", razorpay_payment_id)
        .maybeSingle();

      if (existingLedger) {
        return res.status(200).json({
          success: true,
          verified: true,
          duplicate: true,
          message: "Payment signature verified. Transaction was previously reconciled.",
          payment_id: razorpay_payment_id,
          invoice_no: invoiceNo,
        });
      }

      // Insert confirmed ledger record
      const { error: insertErr } = await supabase.from("fee_ledger").insert([
        {
          school_id: cleanSchool,
          student_id: studentId || null,
          student_name: studentName,
          student_email: studentEmail,
          class_name: className,
          amount: numAmount,
          fee_component: feeTitle,
          payment_mode: "Razorpay Online Gateway",
          razorpay_payment_id: razorpay_payment_id,
          transaction_reference: razorpay_order_id,
          status: "completed",
          is_reversal: false,
          entry_timestamp: new Date().toISOString(),
        },
      ]);

      if (insertErr) {
        console.error("[Razorpay Verify] Supabase ledger insert error:", insertErr);
        return res.status(500).json({
          success: false,
          error: "Signature verified, but failed to write ledger entry to database: " + insertErr.message,
        });
      }

      // Update payment_orders if exists
      try {
        await supabase
          .from("payment_orders")
          .update({
            status: "paid",
            payment_id: razorpay_payment_id,
            updated_at: new Date().toISOString(),
          })
          .eq("order_id", razorpay_order_id);
      } catch {}
    }

    return res.status(200).json({
      success: true,
      verified: true,
      message: "Payment successfully verified and credited to official institutional ledger.",
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
      invoice_no: invoiceNo,
      amount: numAmount,
      date: today,
    });
  } catch (err) {
    console.error("[Razorpay Verify Exception]:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error verifying payment: " + err.message,
    });
  }
}

