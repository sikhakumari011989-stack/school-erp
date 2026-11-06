import { createClient } from "@supabase/supabase-js";
import { verifyMasterToken } from "./auth.js";

function getSupabaseClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing Supabase configuration: SUPABASE_SERVICE_ROLE_KEY is required for master provisioning operations.");
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-master-token"
  );
  res.setHeader("Cache-Control", "private, no-store, max-age=0");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // 1. Authorize Master Operator Token unconditionally in all environments
  const authHeader = req.headers.authorization || req.headers["x-master-token"];
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  if (!verifyMasterToken(bearerToken)) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized: Valid Master Session Token required.",
    });
  }

  let supabase;
  try {
    supabase = getSupabaseClient();
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }

  // 2. GET /api/master/schools — Retrieve all registered schools
  if (req.method === "GET") {
    try {
      // First attempt using RPC get_master_schools_roster
      const { data: rpcData, error: rpcErr } = await supabase.rpc(
        "get_master_schools_roster"
      );

      if (!rpcErr && Array.isArray(rpcData)) {
        return res.status(200).json({ success: true, schools: rpcData });
      }

      // Fallback: Direct select from public.schools
      const { data: directData, error: directErr } = await supabase
        .from("schools")
        .select("*")
        .order("created_at", { ascending: false });

      if (directErr) {
        throw directErr;
      }

      const formatted = (directData || []).map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        address: s.address,
        city: s.city,
        state: s.state,
        phone: s.phone,
        status: s.status || "active",
        subscription_status: s.subscription_status || "active",
        subscription_tier: s.subscription_tier || "enterprise",
        subscription_expires_at:
          s.subscription_expires_at ||
          new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: s.created_at,
      }));

      return res.status(200).json({ success: true, schools: formatted });
    } catch (err) {
      console.error("[MasterAPI] List schools error:", err);
      return res.status(500).json({
        success: false,
        error: "Failed to query schools repository: " + err.message,
      });
    }
  }

  // 3. POST /api/master/schools — Provision or Update School Status
  if (req.method === "POST") {
    const { action = "provision" } = req.body || {};

    // A. Provision New Institutional School
    if (action === "provision") {
      const {
        institutionName,
        institutionCode,
        adminName,
        adminRoleCode = "HOD-01",
        phone = "",
        email = "",
        address = "",
        institutionMode = "school",
        tier = "enterprise",
        validityDays = 365,
      } = req.body || {};

      if (!institutionName || !institutionCode) {
        return res.status(400).json({
          success: false,
          error: "Institution Name and Code are required.",
        });
      }

      const cleanCode = institutionCode.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");

      try {
        // Attempt provision via RPC
        const { data: rpcRes, error: rpcErr } = await supabase.rpc(
          "provision_institutional_school",
          {
            p_name: institutionName.trim(),
            p_code: cleanCode,
            p_admin_name: (adminName || "").trim(),
            p_admin_role_code: adminRoleCode,
            p_admin_email: (email || "").trim(),
            p_admin_phone: (phone || "").trim(),
            p_address: (address || "").trim(),
            p_mode: institutionMode,
            p_tier: tier,
            p_validity_days: parseInt(validityDays, 10) || 365,
          }
        );

        const strictAdminRole = (adminRoleCode || "HOD-01").toUpperCase().startsWith("PRIN") ? "principal" : "trustee";
        const standardEmail = (email || "").trim() || `${cleanCode.toLowerCase()}.${(adminRoleCode || "HOD-01").toLowerCase().replace(/[^a-z0-9]/g, "")}@academicos.internal`;

        const targetSchoolId = rpcRes?.school_id;
        // Guarantee administrator exists in public.profiles for instant login capability
        if (targetSchoolId) {
          try {
            await supabase.from("profiles").upsert(
              [
                {
                  school_id: targetSchoolId,
                  full_name: (adminName || "Trustee Administrator").trim(),
                  role: strictAdminRole,
                  role_code: (adminRoleCode || "HOD-01").trim().toUpperCase(),
                  email: standardEmail,
                  phone: (phone || "").trim(),
                  is_active: true,
                  status: "active",
                },
              ],
              { onConflict: "school_id,role_code" }
            );
          } catch (profErr) {
            console.warn("[MasterAPI] Admin profile persistence notice:", profErr.message);
          }
        }

        if (!rpcErr && rpcRes) {
          return res.status(201).json({
            success: true,
            message: `School ${cleanCode} provisioned successfully in Supabase PostgreSQL.`,
            school: rpcRes,
          });
        }

        // Fallback: Direct insert into schools table
        const expiresAt = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000).toISOString();
        const { data: inserted, error: insertErr } = await supabase
          .from("schools")
          .upsert(
            [
              {
                code: cleanCode,
                name: institutionName.trim(),
                phone: (phone || "").trim(),
                address: (address || "").trim(),
                status: "active",
                subscription_status: "active",
                subscription_tier: tier,
                subscription_expires_at: expiresAt,
                institution_mode: institutionMode,
              },
            ],
            { onConflict: "code" }
          )
          .select()
          .single();

        if (insertErr) {
          throw insertErr;
        }

        return res.status(201).json({
          success: true,
          message: `School ${cleanCode} created successfully in Supabase PostgreSQL.`,
          school: inserted,
        });
      } catch (err) {
        console.error("[MasterAPI] Provision error:", err);
        return res.status(500).json({
          success: false,
          error: "Provisioning failed: " + err.message,
        });
      }
    }

    // B. Set School License Status (Suspend / Activate / Update Expiry)
    if (action === "set_status") {
      const {
        schoolCode,
        status = "active",
        expiryDate,
        notes = "Updated by master operator",
      } = req.body || {};

      if (!schoolCode) {
        return res.status(400).json({
          success: false,
          error: "schoolCode is required.",
        });
      }

      const cleanCode = schoolCode.trim().toUpperCase();
      const validStatus = status.toLowerCase() === "suspended" ? "suspended" : "active";

      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc(
          "set_school_license_status",
          {
            p_school_code: cleanCode,
            p_status: validStatus,
            p_expires_at: expiryDate ? new Date(expiryDate).toISOString() : null,
            p_notes: notes,
          }
        );

        if (!rpcErr && rpcRes) {
          return res.status(200).json({
            success: true,
            message: `School ${cleanCode} status updated to ${validStatus}.`,
            result: rpcRes,
          });
        }

        // Direct update fallback
        const updatePayload = {
          status: validStatus,
          subscription_status: validStatus,
        };
        if (expiryDate) {
          updatePayload.subscription_expires_at = new Date(expiryDate).toISOString();
        }

        const { error: updErr } = await supabase
          .from("schools")
          .update(updatePayload)
          .eq("code", cleanCode);

        if (updErr) {
          throw updErr;
        }

        return res.status(200).json({
          success: true,
          message: `School ${cleanCode} status updated to ${validStatus}.`,
        });
      } catch (err) {
        console.error("[MasterAPI] Update status error:", err);
        return res.status(500).json({
          success: false,
          error: "Status update failed: " + err.message,
        });
      }
    }

    return res.status(400).json({
      success: false,
      error: `Unknown action: "${action}". Supported actions: "provision", "set_status".`,
    });
  }

  return res.status(405).json({ success: false, error: "Method not allowed." });
}

