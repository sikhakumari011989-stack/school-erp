import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { purgeOfflineQueue } from "../utils/offlineSyncQueue";

export const AppContext = createContext();
export const useAppContext = () => useContext(AppContext);

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
      localStorage.setItem("erp_active_tenant", clean);
      return clean;
    }

    // 2. Check Subdomain (e.g. campus.domain.com or apex.localhost)
    const host = window.location.hostname;
    const parts = host.split(".");
    if (parts.length > 2 && parts[0] !== "www" && parts[0] !== "app") {
      return parts[0].toUpperCase();
    }

    // 3. Check LocalStorage active tenant
    const saved = localStorage.getItem("erp_active_tenant");
    if (saved) return saved.trim().toUpperCase();

    // 4. Check locally registered institutions
    const rawSchools = localStorage.getItem("erp_registered_schools");
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
  const [user, setUser] = useState(null);
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
  });

  // Dynamic White-Labeling: Load active institution branding
  const loadTenantDetails = async (tenantCode) => {
    const code = tenantCode || resolveTenantCode();
    try {
      const { data } = await supabase
        .from("schools")
        .select("*")
        .ilike("code", code)
        .maybeSingle();

      if (data) {
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
        };
        setTenant(resolved);
        document.title = `${resolved.name} | Multi-Tenant Tuition ERP`;
        document.documentElement.style.setProperty("--tenant-primary", resolved.primaryColor);
        document.documentElement.style.setProperty("--tenant-accent", resolved.accentColor);
      }
    } catch (err) {
      console.warn("Failed to load custom tenant branding:", err);
    }
  };

  /**
   * Normalizes any incoming role to Academic OS canonical roles:
   * 'PRIN' | 'HOD' | 'ACC' | 'TCH' | 'STU' | 'NTS'
   */
  function normalizeRole(role, roleCode) {
    const code = String(roleCode || "").toUpperCase();
    if (code === "MASTER_OWNER" || role === "MASTER_OWNER") return "MASTER_OWNER";
    if (code.startsWith("PRIN")) return "PRIN";
    if (code.startsWith("HOD") || code.startsWith("TR")) return "HOD";
    if (code.startsWith("ACC")) return "ACC";
    if (code.startsWith("TCH") || code.startsWith("FAC")) return "TCH";
    if (code.startsWith("NON") || code.startsWith("NTS") || code.startsWith("STF") || code.startsWith("STAFF")) return "NTS";
    if (code.startsWith("ADM") || code.startsWith("SUPER")) return "PRIN";

    const r = String(role || "").toUpperCase();
    if (r === "MASTER_OWNER") return "MASTER_OWNER";
    if (r === "PRIN" || r === "PRINCIPAL" || r === "ADMIN" || r === "SUPER_ADMIN" || r === "SUPERADMIN") return "PRIN";
    if (r === "HOD" || r === "TRUSTEE") return "HOD";
    if (r === "ACC" || r === "ACCOUNTANT") return "ACC";
    if (r === "TCH" || r === "TEACHER" || r === "FACULTY" || r === "FAC") return "TCH";
    if (r === "NTS" || r === "STAFF" || r === "NON_TEACHING" || r === "NON-TEACHING") return "NTS";
    if (r === "STU" || r === "STUDENT" || r === "PARENT") return "STU";
    return "STU";
  }

  // Reads the authenticated user's profile strictly from Supabase
  const loadProfile = async (currentSession) => {
    try {
      if (!currentSession?.user) {
        setSession(null);
        setUser(null);
        return;
      }

      setSession(currentSession);

      // Server-controlled app_metadata is the authoritative identity authority for RLS
      const appMeta = currentSession.user.app_metadata || {};
      const userMeta = currentSession.user.user_metadata || {};

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

      // 2. Fail closed on missing profile or unassociated user
      if (!profileData && !appMeta.role && !appMeta.school_id) {
        console.warn("[AuthSecurity] No authoritative profile or app_metadata found. Rejecting session.");
        await supabase.auth.signOut().catch(() => {});
        localStorage.removeItem("erp_session_user");
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      // 3. Fail closed on inactive or suspended accounts
      if (profileData && (profileData.status === "inactive" || profileData.status === "suspended" || profileData.is_active === false)) {
        console.warn("[AuthSecurity] User account is deactivated or suspended. Failing closed.");
        await supabase.auth.signOut().catch(() => {});
        localStorage.removeItem("erp_session_user");
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      // 4. Authoritative role: server app_metadata is primary authority, then verified public.profiles record
      // NEVER allow client-controlled user_metadata to assign privileged roles
      const rawVerifiedRole =
        appMeta.role ||
        profileData?.role;

      const authoritativeRole =
        rawVerifiedRole ||
        (userMeta.role && ["student", "stu"].includes(String(userMeta.role).toLowerCase()) ? "STU" : "STU");

      const authoritativeRoleCode =
        appMeta.role_code ||
        profileData?.role_code ||
        "";

      const canonicalRole = normalizeRole(authoritativeRole, authoritativeRoleCode);

      // 5. Authoritative Tenant Resolution:
      // Authenticated tenant identity MUST strictly derive from server app_metadata or verified profiles record
      // NEVER allow client URL params (?tenant=...) or localStorage to alter authenticated tenant
      const verifiedTenant =
        canonicalRole === "MASTER_OWNER"
          ? (appMeta.school_id || profileData?.schools?.code || profileData?.school_id || "MASTER")
          : (appMeta.school_id || profileData?.schools?.code || profileData?.school_id);

      if (!verifiedTenant) {
        console.warn("[AuthSecurity] Authenticated user has no assigned institution. Failing closed.");
        await supabase.auth.signOut().catch(() => {});
        localStorage.removeItem("erp_session_user");
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      const tenantCode = verifiedTenant.toUpperCase().trim();

      const fullName =
        profileData?.full_name ||
        userMeta.full_name ||
        userMeta.name ||
        currentSession.user.email?.split("@")[0] ||
        "Authenticated Member";

      const userObj = {
        id: currentSession.user.id,
        name: fullName,
        full_name: fullName,
        role: canonicalRole,
        role_code: authoritativeRoleCode || canonicalRole,
        school_id: tenantCode,
        institution_code: tenantCode,
        institution_name: profileData?.schools?.name || userMeta.institution_name || "Academic Campus",
        email: currentSession.user.email,
        authUid: currentSession.user.id,
      };

      setUser(userObj);
      localStorage.setItem("erp_session_user", JSON.stringify(userObj));
      localStorage.setItem("erp_active_tenant", tenantCode);

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
    // Hard 800ms safety timeout: guarantees loading screen never hangs on slow mobile networks
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
    }, 800);

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
          if (event === "SIGNED_OUT" || !currentSession) {
            setSession(null);
            setUser(null);
            try {
              localStorage.removeItem("erp_session_user");
            } catch {}
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
      localStorage.setItem("erp_session_user", JSON.stringify(userData));
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

    // 1. Explicitly purge localStorage & sessionStorage, preserving theme preference
    try {
      const savedTheme = localStorage.getItem("erp_theme_mode");
      localStorage.clear();
      sessionStorage.clear();
      if (savedTheme) {
        localStorage.setItem("erp_theme_mode", savedTheme);
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
    localStorage.setItem("erp_active_tenant", clean);
    loadTenantDetails(clean);
  };

  return (
    <AppContext.Provider
      value={{
        session,
        user,
        setUser,
        tenant,
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