import React, { createContext, useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export const AppContext = createContext();

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

    // 3. Check LocalStorage
    const saved = localStorage.getItem("erp_active_tenant");
    if (saved) return saved.trim().toUpperCase();
  } catch (err) {
    console.warn("Tenant resolution check:", err);
  }

  // 4. Fallback Default
  return "CAMPUS-01";
}

export const AppProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(() => {
    try {
      const saved =
        localStorage.getItem("erp_session_user") ||
        localStorage.getItem("erp_demo_session");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // If local session already exists, start with loading=false for 0ms dashboard render
  const [loading, setLoading] = useState(() => {
    try {
      const saved =
        localStorage.getItem("erp_session_user") ||
        localStorage.getItem("erp_demo_session");
      return saved ? false : true;
    } catch {
      return true;
    }
  });

  const [tenant, setTenant] = useState({
    id: "campus-default-node",
    name: "EduSaaS Institutional Node",
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
          name: data.name || "Apex International Academy",
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

  // Reads the authenticated user's profile strictly from Supabase
  const loadProfile = async (currentSession) => {
    try {
      if (!currentSession?.user) {
        setSession(null);
        if (typeof window !== "undefined" && window.location.search.includes("signedOut=true")) {
          setUser(null);
          return;
        }
        const saved =
          localStorage.getItem("erp_session_user") ||
          localStorage.getItem("erp_demo_session");
        if (saved) {
          try {
            setUser(JSON.parse(saved));
          } catch {
            setUser(null);
          }
        }
        return;
      }

      setSession(currentSession);

      // Fetch user profile from Supabase profiles table
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id, role, role_code, full_name, school_id, schools ( code, name )")
        .eq("id", currentSession.user.id)
        .maybeSingle();

      if (profile && !error) {
        const userObj = {
          id: profile.id,
          name: profile.full_name || currentSession.user.email?.split("@")[0] || "User",
          role: profile.role || "student",
          role_code: profile.role_code || "STU",
          school_id: profile.school_id || "default-school-node",
          institution_code: profile.schools?.code || resolveTenantCode(),
          institution_name: profile.schools?.name || "Academic Campus",
          email: currentSession.user.email,
          authUid: currentSession.user.id,
        };
        setUser(userObj);
        localStorage.setItem("erp_session_user", JSON.stringify(userObj));

        if (profile.schools?.code) {
          loadTenantDetails(profile.schools.code);
        }
      } else {
        // Fallback: Check metadata on Supabase Auth user
        const meta = currentSession.user.user_metadata || {};
        const userObj = {
          id: currentSession.user.id,
          name: meta.full_name || currentSession.user.email?.split("@")[0] || "Authenticated Member",
          role: meta.role || "student",
          role_code: meta.role_code || "MEMBER",
          school_id: meta.school_id || "default-school-node",
          institution_code: meta.institution_code || resolveTenantCode(),
          institution_name: meta.institution_name || "Academic Campus",
          email: currentSession.user.email,
          authUid: currentSession.user.id,
        };
        setUser(userObj);
        localStorage.setItem("erp_session_user", JSON.stringify(userObj));
      }
    } catch (err) {
      console.warn("Error loading Supabase profile, preserving local cache:", err);
    } finally {
      // Unconditionally clear loading state
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
      localStorage.setItem("erp_demo_session", JSON.stringify(userData));
      if (userData?.institution_code) {
        loadTenantDetails(userData.institution_code);
      }
    } catch (e) {
      console.warn("Storage error:", e);
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem("erp_session_user");
      localStorage.removeItem("erp_demo_session");
      sessionStorage.clear();
    } catch (e) {
      console.warn("Storage clear error:", e);
    }

    if (supabase?.auth?.signOut) {
      try {
        await supabase.auth.signOut().catch(() => {});
      } catch (e) {
        console.warn("Supabase sign out error:", e);
      }
    }

    setSession(null);
    setUser(null);
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