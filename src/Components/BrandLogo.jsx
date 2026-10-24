import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";

/**
 * Visual SVG Icon: The EduSaaS Nexus Crest
 * Electric Indigo (#4F46E5) to Deep Violet (#7C3AED) squircle container
 * with crisp white Academic Shield & Mortarboard + Emerald/Cyan ascending data bars
 */
export function EduSaaSVectorEmblem({ className = "w-full h-full" }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="EduSaaS Nexus Crest"
    >
      <defs>
        <linearGradient
          id="edusaas-indigo-violet"
          x1="0"
          y1="0"
          x2="64"
          y2="64"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
        <linearGradient
          id="edusaas-glow-border"
          x1="0"
          y1="0"
          x2="64"
          y2="64"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#34D399" stopOpacity="0.15" />
        </linearGradient>
      </defs>

      {/* Rounded Squircle Container */}
      <rect
        x="1"
        y="1"
        width="62"
        height="62"
        rx="16"
        fill="url(#edusaas-indigo-violet)"
        stroke="rgba(255, 255, 255, 0.22)"
        strokeWidth="1.5"
      />
      <rect
        x="2.5"
        y="2.5"
        width="59"
        height="59"
        rx="14.5"
        stroke="url(#edusaas-glow-border)"
        strokeWidth="1"
      />

      {/* Academic Mortarboard Cap */}
      {/* Top Diamond Rhombus */}
      <path
        d="M32 12.5L49.5 19.5L32 26.5L14.5 19.5L32 12.5Z"
        fill="#FFFFFF"
      />
      {/* Cap Skull Band Underneath */}
      <path
        d="M21 23.2V27.8C21 31.8 43 31.8 43 27.8V23.2L32 27.6L21 23.2Z"
        fill="#E0E7FF"
        fillOpacity="0.95"
      />
      {/* Tassel Cord & Hanging Cyan Droplet */}
      <path
        d="M43.5 21.5L47.5 26.5V32"
        stroke="#38BDF8"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="47.5" cy="33.5" r="1.5" fill="#38BDF8" />

      {/* Geometric Academic Shield Contour */}
      <path
        d="M19 29.5C19 41.5 32 48.5 32 48.5C32 48.5 45 41.5 45 29.5"
        stroke="#FFFFFF"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Three Ascending Data Bars (Institutional Growth & Ledger Sync) */}
      {/* Bar 1 (Left - Emerald #34D399) */}
      <rect x="24.5" y="38" width="3.5" height="6" rx="1.5" fill="#34D399" />
      {/* Bar 2 (Center - Cyan #38BDF8) */}
      <rect x="30.25" y="33.5" width="3.5" height="10.5" rx="1.5" fill="#38BDF8" />
      {/* Bar 3 (Right - Emerald #34D399) */}
      <rect x="36" y="29" width="3.5" height="15" rx="1.5" fill="#34D399" />

      {/* Dynamic Ledger Sync Node Ray */}
      <path
        d="M26.25 38L32 33.5L37.75 29"
        stroke="#A7F3D0"
        strokeWidth="1"
        strokeLinecap="round"
        strokeDasharray="1.5 1.5"
      />
    </svg>
  );
}

export default function BrandLogo({
  size = "md",
  showText = false,
  customLogoUrl = null,
  className = "",
  iconClassName = "",
  ...props
}) {
  const context = useContext(AppContext);
  const user = context?.user;
  const tenant = context?.tenant;

  const [imageError, setImageError] = useState(false);
  const [resolvedCustomLogo, setResolvedCustomLogo] = useState(customLogoUrl);

  // Size mapping
  const sizeMap = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
    xl: "w-16 h-16",
  };

  const containerSize = sizeMap[size] || sizeMap.md;

  // Resolve active school tenant code
  const getActiveSchoolCode = () => {
    return (
      user?.institution_code ||
      user?.school_id ||
      tenant?.code ||
      localStorage.getItem("erp_active_tenant") ||
      "CAMPUS-01"
    )
      .trim()
      .toUpperCase();
  };

  // Resolve custom logo from props, tenant, or localStorage (both erp_logo_ and erp_school_logo_ keys)
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
        localStorage.getItem(`erp_logo_${activeCode}`) ||
        localStorage.getItem(`erp_school_logo_${activeCode}`);
      if (storedLogo) {
        setResolvedCustomLogo(storedLogo);
      } else {
        setResolvedCustomLogo(null);
      }
    } catch {
      setResolvedCustomLogo(null);
    }
  }, [customLogoUrl, tenant?.logoUrl, tenant?.code, user?.institution_code, user?.school_id]);

  // Real-time listener for white-label logo updates across all windows/components
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
    if (resolvedCustomLogo && !imageError) {
      return (
        <div
          className={`${containerSize} rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 p-1 flex items-center justify-center shadow-lg shadow-indigo-600/30 border border-white/20 overflow-hidden flex-shrink-0 ${iconClassName}`}
        >
          <img
            src={resolvedCustomLogo}
            alt="School Crest"
            className="w-full h-full object-contain rounded-xl"
            onError={() => setImageError(true)}
          />
        </div>
      );
    }

    return (
      <div
        className={`${containerSize} rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/30 border border-white/10 overflow-hidden flex-shrink-0 ${iconClassName}`}
      >
        <EduSaaSVectorEmblem className="w-full h-full" />
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
    <div className={`inline-flex items-center gap-3 ${className}`} {...props}>
      {renderIcon()}
      <div className="flex flex-col text-left min-w-0">
        <div className="flex items-center leading-tight">
          <span className="text-lg md:text-xl font-extrabold text-white tracking-tight">
            EduSaaS
          </span>
          <span className="text-lg md:text-xl font-black text-indigo-400 ml-1 tracking-tight">
            ERP
          </span>
        </div>
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400 truncate">
          MULTI-TENANT INSTITUTION OS
        </span>
      </div>
    </div>
  );
}
