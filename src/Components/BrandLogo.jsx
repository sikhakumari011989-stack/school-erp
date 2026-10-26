import React, { useState, useEffect, useContext } from "react";
import { AppContext } from "../context/AppContext";

/**
 * Visual SVG Icon: Premium Blue/Purple Gradient Book & Chart Vector Emblem
 * Represents academic excellence & fiscal intelligence in the EduSaaS platform.
 * Features an open knowledge book at the foundation and an ascending growth/analytics chart.
 */
export function EduSaaSVectorEmblem({ className = "w-full h-full" }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="EduSaaS Book & Chart Emblem"
    >
      <defs>
        {/* Futuristic Blue to Purple Linear Gradient */}
        <linearGradient
          id="edusaas-book-chart-grad"
          x1="0"
          y1="0"
          x2="64"
          y2="64"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="45%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>

        {/* Neon Glow Cyan / Emerald Rim */}
        <linearGradient
          id="edusaas-neon-rim"
          x1="0"
          y1="0"
          x2="64"
          y2="64"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#34D399" stopOpacity="0.4" />
        </linearGradient>

        <linearGradient
          id="chart-line-glow"
          x1="18"
          y1="34"
          x2="48"
          y2="16"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="50%" stopColor="#A78BFA" />
          <stop offset="100%" stopColor="#34D399" />
        </linearGradient>
      </defs>

      {/* Rounded Squircle Container */}
      <rect
        x="1.5"
        y="1.5"
        width="61"
        height="61"
        rx="16"
        fill="url(#edusaas-book-chart-grad)"
        stroke="rgba(255, 255, 255, 0.2)"
        strokeWidth="1.2"
      />
      <rect
        x="3"
        y="3"
        width="58"
        height="58"
        rx="14.5"
        stroke="url(#edusaas-neon-rim)"
        strokeWidth="1"
        strokeOpacity="0.6"
      />

      {/* --- SECTION 1: ASCENDING GROWTH BARS & TREND LINE (CHART LOGIC) --- */}
      {/* Bar 1 (Left - Blue/Cyan) */}
      <rect
        x="21"
        y="25"
        width="4"
        height="12"
        rx="1.5"
        fill="#38BDF8"
        fillOpacity="0.9"
      />
      {/* Bar 2 (Center - Violet/Purple) */}
      <rect
        x="29"
        y="19"
        width="4"
        height="18"
        rx="1.5"
        fill="#A78BFA"
        fillOpacity="0.9"
      />
      {/* Bar 3 (Right - Emerald) */}
      <rect
        x="37"
        y="14"
        width="4"
        height="23"
        rx="1.5"
        fill="#34D399"
        fillOpacity="0.95"
      />

      {/* Upward Trending Growth Vector Polyline */}
      <path
        d="M17 31 L23 23 L31 18 L39 12 L47 11"
        stroke="url(#chart-line-glow)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Glowing Peak Node */}
      <circle cx="47" cy="11" r="2.2" fill="#FFFFFF" />
      <circle cx="47" cy="11" r="4.2" stroke="#34D399" strokeWidth="1" strokeOpacity="0.7" />

      {/* --- SECTION 2: OPEN ACADEMIC KNOWLEDGE BOOK (BOOK LOGIC) --- */}
      {/* Left Page (Spread with curvature) */}
      <path
        d="M32 44.5 C26 42 19 43 14 45.5 V35.5 C19 33 26 34 32 36.5 Z"
        fill="#FFFFFF"
        fillOpacity="0.95"
      />
      {/* Right Page (Spread with curvature) */}
      <path
        d="M32 44.5 C38 42 45 43 50 45.5 V35.5 C45 33 38 34 32 36.5 Z"
        fill="#F1F5F9"
        fillOpacity="0.95"
      />
      {/* Page Inset Seam Lines (Left Page Details) */}
      <path
        d="M18 38 C22 36.5 27 36 30 37.5"
        stroke="#94A3B8"
        strokeWidth="0.8"
        strokeLinecap="round"
      />
      <path
        d="M18 41 C22 39.5 27 39 30 40.5"
        stroke="#94A3B8"
        strokeWidth="0.8"
        strokeLinecap="round"
      />
      {/* Page Inset Seam Lines (Right Page Details) */}
      <path
        d="M34 37.5 C37 36 42 36.5 46 38"
        stroke="#94A3B8"
        strokeWidth="0.8"
        strokeLinecap="round"
      />
      <path
        d="M34 40.5 C37 39 42 39.5 46 41"
        stroke="#94A3B8"
        strokeWidth="0.8"
        strokeLinecap="round"
      />

      {/* Book Spine Center Ridge */}
      <path
        d="M32 36.5 V49"
        stroke="#4F46E5"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* Book Under-Cover Depth Contour */}
      <path
        d="M14 46 C21 44 28 45 32 48 C36 45 43 44 50 46"
        stroke="#E2E8F0"
        strokeWidth="1.5"
        strokeLinecap="round"
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
