import crypto from "crypto";

export function getMasterKey() {
  return (
    process.env.MASTER_SETUP_KEY ||
    process.env.MASTER_SETUP_PASSKEY ||
    process.env.MASTER_ADMIN_PASSKEY ||
    process.env.VITE_MASTER_SETUP_PASSKEY ||
    process.env.VITE_MASTER_SETUP_KEY ||
    ""
  );
}

export function getTokenSecret() {
  return (
    process.env.MASTER_TOKEN_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    (process.env.NODE_ENV === "test" ? "test-master-provisioning-secret-2026" : "academic-os-master-provisioning-secret-2026")
  );
}

/**
 * Creates an HMAC-signed session token for the Master Setup Gateway
 */
export function signMasterToken(expiryMs = 4 * 60 * 60 * 1000) {
  const secret = getTokenSecret();
  if (!secret) {
    throw new Error("Master token secret is unconfigured. Cannot sign tokens.");
  }
  const expiresAt = Date.now() + expiryMs;
  const payload = JSON.stringify({ role: "master_operator", exp: expiresAt });
  const hmac = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return Buffer.from(JSON.stringify({ p: payload, s: hmac })).toString("base64");
}

/**
 * Validates a signed Master Setup session token
 */
export function verifyMasterToken(token) {
  if (!token) return false;
  const secret = getTokenSecret();
  if (!secret) return false;
  try {
    const raw = Buffer.from(token, "base64").toString("utf-8");
    const { p, s } = JSON.parse(raw);
    const expectedHmac = crypto.createHmac("sha256", secret).update(p).digest("hex");
    if (s !== expectedHmac) return false;
    const data = JSON.parse(p);
    return data.exp > Date.now();
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "private, no-store, max-age=0");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed. Use POST." });
  }

  try {
    const masterKey = getMasterKey();
    if (!masterKey) {
      return res.status(500).json({
        success: false,
        error: "Master setup passkey is not configured on the server. Access disabled.",
      });
    }

    const tokenSecret = getTokenSecret();
    if (!tokenSecret) {
      return res.status(500).json({
        success: false,
        error: "Master token secret is not configured on the server. Access disabled.",
      });
    }

    const { passkey } = req.body || {};
    if (!passkey || typeof passkey !== "string") {
      return res.status(400).json({ success: false, error: "Master passkey is required." });
    }

    // Constant-time comparison to prevent timing attacks
    const inputBuf = Buffer.from(passkey.trim());
    const expectedBuf = Buffer.from(masterKey.trim());

    const isMatch =
      inputBuf.length === expectedBuf.length &&
      crypto.timingSafeEqual(inputBuf, expectedBuf);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Access Denied: Invalid Master Passkey.",
      });
    }

    const token = signMasterToken();
    return res.status(200).json({
      success: true,
      message: "Master Gateway Unlocked! Access Granted.",
      token,
      expires_in: 14400, // 4 hours
    });
  } catch (_err) {
    return res.status(500).json({ success: false, error: "Internal authentication error." });
  }
}
