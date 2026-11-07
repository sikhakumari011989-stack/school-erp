import { safeStorage } from "./safeStorage.js";

/**
 * Multi-Tenant PDF Document Template Configurations & Layout Registry
 */
export const DEFAULT_PDF_TEMPLATES = {
  feeReceipt: {
    headerTitle: "OFFICIAL FEE RECEIPT & TAX INVOICE",
    affiliationText: "Recognized by Directorate of Education • Statutory Board Code: SCH-70912",
    receiptPrefix: "REC",
    accentColor: "#1E3A8A", // Deep Navy
    signatoryTitle: "Authorized Accounts Officer",
    termsNote: "Fees once reconciled are non-refundable. Please preserve this receipt for academic verification and statutory audit.",
    showQrSeal: true,
    layoutStyle: "standard", // standard | compact | modern
    sampleTemplateName: null,
    sampleTemplateData: null,
  },
  reportCard: {
    headerTitle: "ANNUAL ACADEMIC PROGRESS REPORT CARD",
    affiliationText: "Central Board of Secondary Education • Institutional Accreditation Tier-1",
    academicYear: "2025-2026",
    termName: "Term II Comprehensive Evaluation",
    accentColor: "#4F46E5", // Indigo
    gradingScale: "cbse_8point", // cbse_8point | percentage | gpa_10
    principalSignTitle: "Principal & Head of Institution",
    teacherSignTitle: "Homeroom Class Educator",
    remarksDefault: "Exemplary scholastic dedication and active co-curricular engagement throughout the academic term.",
    showQrSeal: true,
    layoutStyle: "standard",
    sampleTemplateName: null,
    sampleTemplateData: null,
  },
};

export function getSchoolPdfTemplates(schoolCode = "CAMPUS-01") {
  const cleanSchool = String(schoolCode || "CAMPUS-01").toUpperCase();
  try {
    const stored = safeStorage.getItem(`erp_pdf_template_${cleanSchool}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        feeReceipt: { ...DEFAULT_PDF_TEMPLATES.feeReceipt, ...(parsed.feeReceipt || {}) },
        reportCard: { ...DEFAULT_PDF_TEMPLATES.reportCard, ...(parsed.reportCard || {}) },
      };
    }
  } catch (err) {
    console.warn("Failed to read PDF templates:", err);
  }
  return DEFAULT_PDF_TEMPLATES;
}

export function saveSchoolPdfTemplates(schoolCode = "CAMPUS-01", templates = DEFAULT_PDF_TEMPLATES) {
  const cleanSchool = String(schoolCode || "CAMPUS-01").toUpperCase();
  try {
    safeStorage.setItem(`erp_pdf_template_${cleanSchool}`, JSON.stringify(templates));
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("erp-pdf-template-updated", {
          detail: { schoolCode: cleanSchool, templates },
        })
      );
    }
  } catch (err) {
    console.error("Failed to save PDF templates:", err);
  }
}
