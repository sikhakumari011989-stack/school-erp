import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";
import { safeStorage } from "../utils/safeStorage";

/**
 * Visual SVG Icon / Vector Fallback
 */
export function EduSaaSVectorEmblem({ className = "w-full h-full" }) {
  return (
    <div className={`flex items-center justify-center rounded-lg overflow-hidden ${className}`}>
      <img
        src="/astinex-logo.png"
        alt="ASTINEX Emblem"
        className="w-full h-full object-contain rounded-lg"
      />
    </div>
  );
}

export const AstinexVectorEmblem = EduSaaSVectorEmblem;

/**
 * ASTINEX Official Brand Logo Component
 * Renders `/astinex-logo.png` cleanly with subtle rounding (`rounded-lg`) as the platform brand.
 * Multi-tenant guardrail: If an active school/tuition tenant has uploaded its custom crest,
 * it strictly renders the school's authenticated logo instead.
 */
export default function BrandLogo({
  size = "md",
  showText = false,
  customLogoUrl = null,
  schoolCode = null,
  className = "",
  iconClassName = "",
  ...props
}) {
  const context = useContext(AppContext);
  const user = context?.user;
  const tenant = context?.tenant;

  const [imageError, setImageError] = useState(false);
  const [resolvedCustomLogo, setResolvedCustomLogo] = useState(customLogoUrl);

  // Size mapping with support for prominent hero display
  const sizeMap = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-16 h-16",
    xl: "w-20 h-20",
    hero: "w-40 h-24 sm:w-52 sm:h-28",
  };

  const containerSize = sizeMap[size] || sizeMap.md;

  // Resolve active school tenant code
  const getActiveSchoolCode = () => {
    return (
      schoolCode ||
      user?.institution_code ||
      user?.school_id ||
      tenant?.code ||
      (typeof safeStorage !== "undefined" && safeStorage.getItem("erp_active_tenant")) ||
      "CAMPUS-01"
    )
      .trim()
      .toUpperCase();
  };

  // Resolve custom logo from props, tenant, or safeStorage
  useEffect(() => {
    setImageError(false);

    if (customLogoUrl) {
      setResolvedCustomLogo(customLogoUrl);
      return;
    }

    if (tenant?.logoUrl) {
      setResolvedCustomLogo(tenant.logoUrl);
      return;
    }

    try {
      const activeCode = getActiveSchoolCode();
      const storedLogo =
        safeStorage.getItem(`erp_logo_${activeCode}`) ||
        safeStorage.getItem(`erp_school_logo_${activeCode}`);
      if (storedLogo) {
        setResolvedCustomLogo(storedLogo);
      } else {
        setResolvedCustomLogo(null);
      }
    } catch {
      setResolvedCustomLogo(null);
    }
  }, [customLogoUrl, schoolCode, tenant?.logoUrl, tenant?.code, user?.institution_code, user?.school_id]);

  // Real-time listener for tenant logo updates
  useEffect(() => {
    const handleLogoUpdated = (e) => {
      if (e?.detail) {
        setResolvedCustomLogo(e.detail.logoUrl || null);
        setImageError(false);
      }
    };

    const handleStorageChange = () => {
      try {
        const activeCode = getActiveSchoolCode();
        const storedLogo =
          localStorage.getItem(`erp_logo_${activeCode}`) ||
          localStorage.getItem(`erp_school_logo_${activeCode}`);
        setResolvedCustomLogo(storedLogo || null);
        setImageError(false);
      } catch {}
    };

    window.addEventListener("erp-logo-updated", handleLogoUpdated);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("erp-logo-updated", handleLogoUpdated);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [user, tenant]);

  const renderIcon = () => {
    // 1. Authenticated Custom School Crest Override
    if (resolvedCustomLogo && !imageError) {
      return (
        <div
          className={`${containerSize} rounded-xl bg-slate-800/80 p-1 flex items-center justify-center shadow-lg border border-slate-700/60 overflow-hidden flex-shrink-0 ${iconClassName}`}
        >
          <img
            src={resolvedCustomLogo}
            alt="School Crest"
            className="w-full h-full object-contain rounded-lg"
            onError={() => setImageError(true)}
          />
        </div>
      );
    }

    // 2. Default ASTINEX Platform Logo
    return (
      <div
        className={`${containerSize} rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 ${iconClassName}`}
      >
        <img
          src="/astinex-logo.png"
          alt="ASTINEX"
          className="w-full h-full object-contain rounded-lg"
          onError={(e) => {
            // Fallback to square icon if full logo fails
            e.currentTarget.src = "/astinex-icon.png";
          }}
        />
      </div>
    );
  };

  if (!showText) {
    return (
      <div className={`inline-flex items-center justify-center ${className}`} {...props}>
        {renderIcon()}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-3.5 ${className}`} {...props}>
      {renderIcon()}
      <div className="flex flex-col text-left min-w-0">
        <div className="flex items-center leading-tight">
          <span className="text-xl md:text-2xl font-black text-white tracking-wider">
            ASTINEX
          </span>
        </div>
        <span className="text-[10px] font-mono font-bold tracking-wider text-cyan-400 truncate">
          One Platform. Every School Operation.
        </span>
      </div>
    </div>
  );
}
