/**
 * Dynamic Pricing & Special Offers Engine
 * Manages institutional subscription tiers, live Supabase queries, and real-time promo code validation.
 */

import { supabase } from "../supabaseClient";

export const CANONICAL_SUBSCRIPTION_TIERS = [
  {
    id: "starter",
    code: "TIER_STARTER",
    name: "Campus Starter",
    description: "Ideal for boutique tuition centers and single-campus academies",
    monthly_price: 4999,
    annual_price: 47990, // ~20% discount
    student_limit: 250,
    badge: "Foundation",
    is_popular: false,
    features: [
      "Up to 250 Enrolled Students",
      "Teacher Daily Attendance Register",
      "Automated WhatsApp & SMS Absent Alerts",
      "Homework & Syllabus Task Manager",
      "Basic Role-Based Access Control",
      "Offline Progressive Web App (PWA)",
    ],
  },
  {
    id: "growth",
    code: "TIER_GROWTH",
    name: "Institutional Growth",
    description: "Complete ERP automation for mid-to-large schools and coaching chains",
    monthly_price: 14999,
    annual_price: 143990, // ~20% discount
    student_limit: 1500,
    badge: "Most Popular",
    is_popular: true,
    features: [
      "Up to 1,500 Enrolled Students",
      "Everything in Campus Starter",
      "Real-Time Razorpay Fee Settlement Ledger",
      "Dynamic PDF Tax Invoices & Term Transcripts",
      "Mobile Deep-Linking & WhatsApp Invite Hub",
      "Server-Verified Webhook Payment Gateway",
      "HOD & Trustee Governance Command Center",
      "Cryptographic Security Audit Vault",
    ],
  },
  {
    id: "enterprise",
    code: "TIER_ENTERPRISE",
    name: "Enterprise Multi-Academy",
    description: "Unlimited scalability for educational trusts and national coaching brands",
    monthly_price: 39999,
    annual_price: 383990,
    student_limit: 10000,
    badge: "Flagship",
    is_popular: false,
    features: [
      "Unlimited Students & Multi-Campus Branches",
      "Custom Subdomain & Full Brand White-Labeling",
      "Dedicated PostgreSQL Instance & Custom Storage Bucket",
      "Certified Serverless Webhooks & API Webhooks",
      "Custom Report Card Formats & Letterheads",
      "24/7 Dedicated Technical Account Manager (TAM)",
      "99.99% Enterprise Uptime SLA Guarantee",
    ],
  },
];

export const CANONICAL_DISCOUNT_CODES = [
  {
    code: "LAUNCH2026",
    description: "Official Launch Celebration Discount",
    discount_percent: 20,
    discount_fixed: 0,
    applicable_tiers: ["starter", "growth", "enterprise"],
    is_active: true,
  },
  {
    code: "EARLYBIRD30",
    description: "Early Adopter Institutional Grant",
    discount_percent: 30,
    discount_fixed: 0,
    applicable_tiers: ["growth", "enterprise"],
    is_active: true,
  },
  {
    code: "OCTOBER31",
    description: "October 31 Launch Readiness Special",
    discount_percent: 31,
    discount_fixed: 0,
    applicable_tiers: ["starter", "growth", "enterprise"],
    is_active: true,
  },
  {
    code: "FLAT5000",
    description: "Flat ₹5,000 Institutional Grant",
    discount_percent: 0,
    discount_fixed: 5000,
    applicable_tiers: ["growth", "enterprise"],
    is_active: true,
  },
];

/**
 * Fetch live subscription tiers from Supabase (with fallback to canonical schema)
 */
export async function fetchSubscriptionTiers() {
  try {
    const { data, error } = await supabase
      .from("subscription_tiers")
      .select("*")
      .order("monthly_price", { ascending: true });

    if (!error && data && data.length > 0) {
      return data;
    }
  } catch (err) {
    console.info("[Pricing Engine] Using canonical subscription tiers fallback:", err.message);
  }

  return CANONICAL_SUBSCRIPTION_TIERS;
}

/**
 * Validates a promo discount code against Supabase / active registry
 */
export async function validatePromoCode(rawCode, tierId = "growth", baseAmount = 14999) {
  if (!rawCode || typeof rawCode !== "string") {
    return { valid: false, message: "Please provide a promo code." };
  }

  const cleanCode = rawCode.trim().toUpperCase();

  let promo = null;

  // 1. Try querying Supabase discount_codes table
  try {
    const { data, error } = await supabase
      .from("discount_codes")
      .select("*")
      .ilike("code", cleanCode)
      .eq("is_active", true)
      .maybeSingle();

    if (!error && data) {
      promo = data;
    }
  } catch (err) {
    console.info("[Pricing Engine] Checking canonical discount codes cache:", err.message);
  }

  // 2. Check canonical discount codes if DB record not found
  if (!promo) {
    promo = CANONICAL_DISCOUNT_CODES.find((c) => c.code === cleanCode && c.is_active);
  }

  if (!promo) {
    return {
      valid: false,
      code: cleanCode,
      message: `Promo code "${cleanCode}" is invalid or expired. Try "LAUNCH2026" or "EARLYBIRD30".`,
    };
  }

  // Verify tier applicability
  if (promo.applicable_tiers && !promo.applicable_tiers.includes(tierId)) {
    return {
      valid: false,
      code: cleanCode,
      message: `Code "${cleanCode}" is only applicable to ${promo.applicable_tiers.join(", ")} plans.`,
    };
  }

  // Calculate discount amount
  let discountAmount = 0;
  if (promo.discount_percent > 0) {
    discountAmount = Math.round((baseAmount * promo.discount_percent) / 100);
  } else if (promo.discount_fixed > 0) {
    discountAmount = Math.min(baseAmount, promo.discount_fixed);
  }

  const finalAmount = Math.max(0, baseAmount - discountAmount);

  return {
    valid: true,
    code: cleanCode,
    description: promo.description,
    discountPercent: promo.discount_percent || 0,
    discountFixed: promo.discount_fixed || 0,
    discountAmount,
    baseAmount,
    finalAmount,
    savingsText: `Saved ₹${discountAmount.toLocaleString("en-IN")} (${promo.discount_percent ? `${promo.discount_percent}% OFF` : `₹${promo.discount_fixed} Flat OFF`})`,
  };
}
