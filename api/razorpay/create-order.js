import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

/**
 * Vercel Serverless Function: Create Razorpay Payment Order
 * Endpoint: /api/razorpay/create-order
 *
 * Secure server-side order generation for student fee payments.
 * Fails closed if merchant keys are unconfigured.
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
    const keyId = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      return res.status(500).json({
        success: false,
        error: "Razorpay payment gateway secret (RAZORPAY_KEY_SECRET) is unconfigured on the server. Online card/UPI checkout disabled.",
      });
    }

    if (!keyId) {
      return res.status(500).json({
        success: false,
        error: "Razorpay Key ID (RAZORPAY_KEY_ID) is unconfigured on the server.",
      });
    }

    const {
      amount,
      currency = "INR",
      schoolId,
      studentId,
      studentName = "Enrolled Student",
      studentEmail = "",
      feeTitle = "Tuition Fee",
      isPartial = false,
    } = req.body || {};

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ success: false, error: "Valid payment amount is required." });
    }

    if (!schoolId) {
      return res.status(400).json({ success: false, error: "schoolId is required." });
    }

    const cleanSchool = schoolId.trim().toUpperCase();
    const amountInPaise = Math.round(numAmount * 100);
    const receiptId = `rcpt_${cleanSchool}_${Date.now().toString().slice(-8)}`;

    const orderPayload = {
      amount: amountInPaise,
      currency,
      receipt: receiptId,
      notes: {
        school_id: cleanSchool,
        student_id: String(studentId || "STU-001"),
        student_name: String(studentName),
        student_email: String(studentEmail),
        fee_title: String(feeTitle),
        is_partial: String(isPartial),
      },
    };

    // Call Razorpay Orders API
    const authHeader = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const rzpResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderPayload),
    });

    if (!rzpResponse.ok) {
      const errBody = await rzpResponse.text();
      console.error("[Razorpay Orders API Error]:", errBody);
      return res.status(rzpResponse.status).json({
        success: false,
        error: "Failed to initiate payment order with payment gateway.",
        details: errBody,
      });
    }

    const orderData = await rzpResponse.json();

    // Optionally record in Supabase payment_orders if service_role is configured
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseUrl && serviceKey) {
        const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
        await supabase.from("payment_orders").insert([
          {
            order_id: orderData.id,
            school_id: cleanSchool,
            student_id: studentId || null,
            student_name: studentName,
            amount: numAmount,
            currency,
            receipt: receiptId,
            status: "created",
            raw_payload: orderData,
          },
        ]);
      }
    } catch (dbErr) {
      // Non-blocking log
      console.warn("[Razorpay] payment_orders record notice:", dbErr.message);
    }

    return res.status(200).json({
      success: true,
      order: {
        id: orderData.id,
        amount: orderData.amount,
        currency: orderData.currency,
        receipt: orderData.receipt,
        key_id: keyId,
      },
    });
  } catch (err) {
    console.error("[Razorpay Create Order Exception]:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error creating payment order: " + err.message,
    });
  }
}

