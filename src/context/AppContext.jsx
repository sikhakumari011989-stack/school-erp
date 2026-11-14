import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { purgeOfflineQueue } from "../utils/offlineSyncQueue";
import { getSchoolSubscription } from "../utils/cloudSyncService";
import { normalizeRole } from "../utils/credentials";
import { safeStorage } from "../utils/safeStorage";

export const AppContext = createContext({
  session: null,
  user: null,
  setUser: () => {},
  tenant: null,
  schoolLogoUrl: null,
  setSchoolLogoUrl: () => {},
  subscription: {
    isBlocked: false,
    isSuspended: false,
    isExpired: false,
    expiryDate: null,
    status: "active",
    tier: "enterprise",
  },
  refreshTenant: async () => {},
  loading: false,
  login: async () => {},
  logout: () => {},
  handleSignOut: () => {},
  loadProfile: async () => {},
  switchTenant: () => {},
});
export const useAppContext = () => useContext(AppContext) || {};
export const useApp = useAppContext;

/**
 * Resolves active tenant from subdomain, query params (?tenant=...), or storage
 */
function resolveTenantCode() {
  if (typeof window === "undefined") return "CAMPUS-01";

  try {
    // 1. Check URL search param (?tenant=CAMPUS-01 or ?institution=...)
    const params = new URLSearchParams(window.location.search);
    const paramTenant = params.get("tenant") || params.get("institution");
    if (paramTenant) {
      const clean = paramTenant.trim().toUpperCase();
      safeStorage.setItem("erp_active_tenant", clean);
      return clean;
    }

    // 2. Check Subdomain (e.g. campus.domain.com or apex.localhost)
    const host = window.location.hostname;
    const parts = host.split(".");
    if (parts.length > 2 && parts[0] !== "www" && parts[0] !== "app") {
      return parts[0].toUpperCase();
    }

    // 3. Check SafeStorage active tenant
    const saved = safeStorage.getItem("erp_active_tenant");
    if (saved) return saved.trim().toUpperCase();

    // 4. Check locally registered institutions
    const rawSchools = safeStorage.getItem("erp_registered_schools");
    if (rawSchools) {
      const list = JSON.parse(rawSchools);
      if (Array.isArray(list) && list.length > 0 && list[0]?.code) {
        return list[0].code.trim().toUpperCase();
      }
    }
  } catch (err) {
    console.warn("Tenant resolution check:", err);
  }

  // 5. Unconfigured Fallback
  return "CAMPUS-01";
}

export const AppProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(() => {
    try {
      const s = safeStorage.getItem("erp_session_user");
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  const [tenant, setTenant] = useState({
    id: "campus-default",
    name: "Institutional Campus",
    code: "CAMPUS-01",
    address: "Flat number 201, Jivdani Chaya, near Rajshree Hospital, beside Kalavati Mandir, Mahim Manohar Highway, Palghar 401404",
    city: "Palghar",
    state: "Maharashtra",
    primaryColor: "#3B82F6",
    accentColor: "#8B5CF6",
    logoUrl: null,
    tagline: "Premier Multi-Tenant Academic Institution",
    institution_type: "school",
  });

  const [subscription, setSubscription] = useState({
    isBlocked: false,
    isSuspended: false,
    isExpired: false,
    expiryDate: null,
    status: "active",
    tier: "enterprise",
  });

  const [schoolLogoUrl, setSchoolLogoUrl] = useState(() => {
    try {
      const code = resolveTenantCode().toUpperCase();
      return (
        safeStorage.getItem(`erp_logo_${code}`) ||
        safeStorage.getItem(`erp_school_logo_${code}`) ||
        safeStorage.getItem("erp_school_logo_default") ||
        null
      );
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handleLogoUpdate = (e) => {
      const code = (tenant?.code || resolveTenantCode()).toUpperCase();
      const updatedUrl = e?.detail?.logoUrl !== undefined ? e.detail.logoUrl : (
        safeStorage.getItem(`erp_logo_${code}`) ||
        safeStorage.getItem(`erp_school_logo_${code}`) ||
        safeStorage.getItem("erp_school_logo_default") ||
        null
      );
      setSchoolLogoUrl(updatedUrl);
      setTenant((prev) => (prev ? { ...prev, logoUrl: updatedUrl } : prev));
    };

    window.addEventListener("erp-logo-updated", handleLogoUpdate);
    window.addEventListener("storage", handleLogoUpdate);
    return () => {
      window.removeEventListener("erp-logo-updated", handleLogoUpdate);
      window.removeEventListener("storage", handleLogoUpdate);
    };
  }, [tenant?.code]);

  // Dynamic White-Labeling & Institutional Licensing Check
  const loadTenantDetails = async (tenantCode) => {
    const code = tenantCode || resolveTenantCode();
    try {
      const { data } = await supabase
        .from("schools")
        .select("id, name, code, city, state, primary_color, accent_color, logo_url, tagline, status, subscription_status, subscription_tier, subscription_expires_at, institution_mode, institution_type")
        .ilike("code", code)
        .maybeSingle();

      if (data) {
        const resolvedType = (
          data.institution_mode ||
          data.institution_type ||
          safeStorage.getItem(`erp_institution_type_${data.code || code}`) ||
          "school"
        ).toLowerCase();

        const resolved = {
          id: data.id,
          name: data.name || "Institutional Campus",
          code: data.code || code,
          city: data.city || "Mumbai",
          state: data.state || "Maharashtra",
          primaryColor: data.primary_color || "#3B82F6",
          accentColor: data.accent_color || "#8B5CF6",
          logoUrl: data.logo_url || null,
          tagline: data.tagline || "Enterprise Multi-Tenant Node",
          status: data.status || "active",
          subscriptionStatus: data.subscription_status || "active",
          subscriptionTier: data.subscription_tier || "enterprise",
          subscriptionExpiresAt: data.subscription_expires_at,
          institution_type: resolvedType,
        };
        setTenant(resolved);
        document.title = `${resolved.name} | Multi-Tenant Tuition ERP`;
        document.documentElement.style.setProperty("--tenant-primary", resolved.primaryColor);
        document.documentElement.style.setProperty("--tenant-accent", resolved.accentColor);

        // Automated Institutional Licensing Evaluation:
        // current_date > subscription_expires_at / license_expires_at OR status === 'suspended'
        const todayIso = new Date().toISOString().split("T")[0];
        const rawExpiry = data.subscription_expires_at || data.license_expires_at;
        const expiryIso = rawExpiry
          ? new Date(rawExpiry).toISOString().split("T")[0]
          : null;
        const isExpired = Boolean(expiryIso && todayIso > expiryIso);
        const isExplicitlySuspended =
          String(data.subscription_status || data.status || "").toLowerCase() === "suspended";
        const isBlocked = isExpired || isExplicitlySuspended;

        const evaluatedSub = {
          isBlocked,
          isSuspended: isExplicitlySuspended,
          isExpired,
          expiryDate: expiryIso,
          status: isBlocked ? "suspended" : "active",
          tier: data.subscription_tier || "enterprise",
        };
        setSubscription(evaluatedSub);

        // Sync evaluated subscription to tenant storage for offline resilience
        try {
          safeStorage.setItem(
            `erp_school_sub_${resolved.code.toUpperCase()}`,
            JSON.stringify({
              status: evaluatedSub.status,
              expiryDate: evaluatedSub.expiryDate,
              isBlocked: evaluatedSub.isBlocked,
            })
          );
        } catch {}
      } else {
        // Fallback to local subscription evaluator
        const localSub = getSchoolSubscription(code);
        setSubscription({
          isBlocked: localSub.isBlocked,
          isSuspended: localSub.isSuspended,
          isExpired: localSub.isExpired,
          expiryDate: localSub.expiryDate,
          status: localSub.status,
          tier: "enterprise",
        });
      }
    } catch (err) {
      console.warn("Failed to load custom tenant branding:", err);
      const localSub = getSchoolSubscription(code);
      setSubscription({
        isBlocked: localSub.isBlocked,
        isSuspended: localSub.isSuspended,
        isExpired: localSub.isExpired,
        expiryDate: localSub.expiryDate,
        status: localSub.status,
        tier: "enterprise",
      });
    }
  };

  // Reads the authenticated user's profile strictly from Supabase
  const loadProfile = async (currentSession) => {
    try {
      if (!currentSession?.user) {
        setSession(null);
        let cachedUser = null;
        try {
          const cached = safeStorage.getItem("erp_session_user");
          if (cached) cachedUser = JSON.parse(cached);
        } catch {}

        if (cachedUser && (cachedUser.id || cachedUser.role_code)) {
          setUser(cachedUser);
          if (cachedUser.institution_code || cachedUser.school_id) {
            loadTenantDetails(cachedUser.institution_code || cachedUser.school_id);
          }
        } else {
          setUser(null);
        }
        return;
      }

      setSession(currentSession);

      // Server-controlled app_metadata is the authoritative identity authority for RLS
      const appMeta = currentSession.user.app_metadata || {};
      const userMeta = currentSession.user.user_metadata || {};
      const userEmail = String(currentSession.user.email || "").toLowerCase().trim();

      // Extract institutional identifiers from email format: [school_code].[personal_code]@...
      let emailSchoolCode = "";
      let emailPersonalCode = "";
      if (userEmail.includes("@")) {
        const prefix = userEmail.split("@")[0];
        const dotParts = prefix.split(".");
        if (dotParts.length >= 2) {
          emailSchoolCode = dotParts[0].toUpperCase();
          emailPersonalCode = dotParts[1].toUpperCase();
        }
      }

      let profileData = null;
      try {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("id, role, role_code, full_name, school_id, status, is_active, schools ( code, name )")
          .eq("id", currentSession.user.id)
          .maybeSingle();

        if (!error && profile) {
          profileData = profile;
        }
      } catch (profErr) {
        console.warn("Supabase profile read notice:", profErr);
      }

      // Check cached session if available
      let cachedUser = null;
      try {
        const cached = safeStorage.getItem("erp_session_user");
        if (cached) cachedUser = JSON.parse(cached);
      } catch {}

      // Fail closed on explicitly deactivated or suspended accounts in profiles
      if (profileData && (profileData.status === "inactive" || profileData.status === "suspended" || profileData.is_active === false)) {
        console.warn("[AuthSecurity] User account is deactivated or suspended. Failing closed.");
        await supabase.auth.signOut().catch(() => {});
        safeStorage.removeItem("erp_session_user");
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      // Authoritative Role Resolution via unified normalizeRole:
      // Priority: profiles record -> app_metadata -> email personal code -> cached user role -> user_metadata -> default STU
      const rawRole =
        profileData?.role ||
        appMeta.role ||
        cachedUser?.role ||
        userMeta.role ||
        "";

      const rawRoleCode =
        profileData?.role_code ||
        appMeta.role_code ||
        emailPersonalCode ||
        cachedUser?.role_code ||
        userMeta.role_code ||
        "";

      const canonicalRole = normalizeRole(rawRole, rawRoleCode);

      // Authoritative Tenant Resolution:
      // NEVER allow client URL params (?tenant=...) or localStorage to alter authenticated tenant
      const tenantCode = (
        canonicalRole === "MASTER_OWNER"
          ? (appMeta.school_id || profileData?.schools?.code || profileData?.school_id || cachedUser?.institution_code || "MASTER")
          : (appMeta.school_id || profileData?.schools?.code || profileData?.school_id || emailSchoolCode || cachedUser?.institution_code || userMeta.school_id || userMeta.institution_code || "CAMPUS-01")
      ).toUpperCase().trim();

      const fullName =
        profileData?.full_name ||
        cachedUser?.full_name ||
        cachedUser?.name ||
        userMeta.full_name ||
        userMeta.name ||
        currentSession.user.email?.split("@")[0] ||
        "Authenticated Member";

      const userObj = {
        id: currentSession.user.id,
        name: fullName,
        full_name: fullName,
        role: canonicalRole,
        role_code: rawRoleCode || canonicalRole,
        personal_code: rawRoleCode || canonicalRole,
        school_id: tenantCode,
        institution_code: tenantCode,
        institution_name: profileData?.schools?.name || cachedUser?.institution_name || userMeta.institution_name || "Academic Campus",
        email: currentSession.user.email,
        authUid: currentSession.user.id,
      };

      setUser(userObj);
      try {
        safeStorage.setItem("erp_session_user", JSON.stringify(userObj));
        safeStorage.setItem("erp_active_tenant", tenantCode);
      } catch {}

      if (tenantCode) {
        loadTenantDetails(tenantCode);
      }
    } catch (err) {
      console.warn("Error resolving Supabase session:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Safety timeout: 10s fallback ensures loading screen never hangs permanently if Supabase connection stalls
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
    }, 10000);

    // 1. Initial tenant resolution and branding
    loadTenantDetails();

    // 2. Fetch active Supabase Auth session safely
    supabase.auth.getSession()
      .then(({ data }) => {
        loadProfile(data?.session);
      })
      .catch((err) => {
        console.warn("Supabase getSession notice:", err);
        setLoading(false);
      });

    // 3. Listen to live Supabase Auth state changes (SIGN_IN, SIGN_OUT, TOKEN_REFRESH)
    const { data: listener } = supabase?.auth?.onAuthStateChange
      ? supabase.auth.onAuthStateChange((event, currentSession) => {
          if (event === "SIGNED_OUT") {
            setSession(null);
            setUser(null);
            try {
              safeStorage.removeItem("erp_session_user");
            } catch {}
            setLoading(false);
            return;
          }

          if (!currentSession) {
            let cachedUser = null;
            try {
              const cached = safeStorage.getItem("erp_session_user");
              if (cached) cachedUser = JSON.parse(cached);
            } catch {}

            if (cachedUser && (cachedUser.id || cachedUser.role_code)) {
              setSession(null);
              setUser(cachedUser);
              if (cachedUser.institution_code || cachedUser.school_id) {
                loadTenantDetails(cachedUser.institution_code || cachedUser.school_id);
              }
            } else {
              setSession(null);
              setUser(null);
            }
            setLoading(false);
            return;
          }
          loadProfile(currentSession);
        })
      : { data: { subscription: { unsubscribe: () => {} } } };

    return () => {
      clearTimeout(safetyTimeout);
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  const login = (userData) => {
    setUser(userData);
    try {
      safeStorage.setItem("erp_session_user", JSON.stringify(userData));
      if (userData?.institution_code) {
        loadTenantDetails(userData.institution_code);
      }
    } catch (e) {
      console.warn("Storage error:", e);
    }
  };

  const logout = async () => {
    // 0. Purge durable IndexedDB offline mutation queue to prevent sensitive offline student telemetry from leaking
    try {
      await purgeOfflineQueue();
    } catch (idbErr) {
      console.warn("IndexedDB offline queue purge notice:", idbErr);
    }

    // 1. Explicitly purge storage, preserving theme preference
    try {
      const savedTheme = safeStorage.getItem("erp_theme_mode");
      safeStorage.removeItem("erp_session_user");
      safeStorage.removeItem("erp_active_tenant");
      if (savedTheme) {
        safeStorage.setItem("erp_theme_mode", savedTheme);
      }
    } catch (e) {
      console.warn("Storage clear error:", e);
    }

    // 2. Clear browser CacheStorage (PWA caches, offline SW caches)
    try {
      if (typeof window !== "undefined" && "caches" in window) {
        const cacheNames = await window.caches.keys();
        await Promise.all(cacheNames.map((cacheName) => window.caches.delete(cacheName)));
      }
    } catch (cacheErr) {
      console.warn("CacheStorage purge notice:", cacheErr);
    }

    // 3. Clear React Query / SWR / memory query caches if present
    try {
      if (typeof window !== "undefined") {
        if (window.__REACT_QUERY_CLIENT__?.clear) {
          window.__REACT_QUERY_CLIENT__.clear();
        }
        if (window.__SWR_CACHE__?.clear) {
          window.__SWR_CACHE__.clear();
        }
      }
    } catch (qErr) {
      console.warn("Query cache clear notice:", qErr);
    }

    // 4. Invalidate Supabase session token
    if (supabase?.auth?.signOut) {
      try {
        await supabase.auth.signOut().catch(() => {});
      } catch (e) {
        console.warn("Supabase sign out error:", e);
      }
    }

    // 5. Explicitly wipe all React state
    setSession(null);
    setUser(null);
    setTenant(null);

    // 6. Hard route to login with signedOut flag
    window.location.href = "/login?signedOut=true";
  };

  const switchTenant = (code) => {
    if (!code) return;
    const clean = code.trim().toUpperCase();
    safeStorage.setItem("erp_active_tenant", clean);
    loadTenantDetails(clean);
  };

  const effectiveInstitutionType = (
    tenant?.institution_type ||
    user?.institution_type ||
    (typeof safeStorage !== "undefined" && safeStorage.getItem(`erp_institution_type_${(user?.institution_code || tenant?.code || "").toUpperCase()}`)) ||
    "school"
  ).toLowerCase();

  return (
    <AppContext.Provider
      value={{
        session,
        user,
        setUser,
        tenant,
        schoolLogoUrl,
        setSchoolLogoUrl,
        institution_type: effectiveInstitutionType,
        subscription,
        refreshTenant: loadTenantDetails,
        loading,
        login,
        logout,
        handleSignOut: logout,
        loadProfile,
        switchTenant,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export default AppContext;
