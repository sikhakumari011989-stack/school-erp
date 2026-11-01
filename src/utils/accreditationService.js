import { supabase } from "../supabaseClient";

/**
 * ACCREDITATION & STATUTORY COMPLIANCE SERVICE
 * Configurable standards for CBSE Affiliation, NAAC Quality Criteria,
 * RTE Statutory Norms, and Statutory Document Expiries.
 */

export const ACCREDITATION_FRAMEWORKS = [
  { id: "cbse_bye_laws", name: "CBSE Affiliation Bye-Laws (2018 Ed.)", version: "v2018.4" },
  { id: "naac_criteria", name: "NAAC Institutional Assessment Manual", version: "v2024.1" },
  { id: "rte_statutory", name: "Right to Education (RTE) Statutory Norms", version: "Section 12(1)(c)" },
];

export const DEFAULT_CRITERIA = [
  {
    id: "crit_1",
    framework: "CBSE Affiliation Bye-Laws (2018 Ed.)",
    criterion_code: "CBSE-BL-4.1",
    title: "Fire Safety Certificate & Emergency Evacuation Plan",
    description: "Annual verification from local Fire Department confirming operational fire hydrants, alarms, and bi-annual mock drill documentation.",
    assigned_officer: "Campus Estate Officer",
    compliance_status: "compliant",
    score_weightage: 15.0,
    score_achieved: 15.0,
    evidence_documents: [
      { title: "Fire Safety NOC 2026-27", expiry_date: "2027-03-31", file_url: "#", verified: true },
    ],
  },
  {
    id: "crit_2",
    framework: "CBSE Affiliation Bye-Laws (2018 Ed.)",
    criterion_code: "CBSE-BL-4.4",
    title: "Safe Drinking Water & Sanitation Certificate",
    description: "Certified water bacteriological testing report and clean sanitary facility audit by Municipal Public Health Officer.",
    assigned_officer: "Health & Hygiene Supervisor",
    compliance_status: "compliant",
    score_weightage: 10.0,
    score_achieved: 10.0,
    evidence_documents: [
      { title: "Water Quality Lab Report", expiry_date: "2026-11-25", file_url: "#", verified: true }, // Expiring soon!
    ],
  },
  {
    id: "crit_3",
    framework: "CBSE Affiliation Bye-Laws (2018 Ed.)",
    criterion_code: "CBSE-BL-5.2",
    title: "Pupil-to-Teacher Ratio (PTR) Compliance (<= 30:1)",
    description: "Sectional student strength ceiling of 40 students per class and institutional PTR not exceeding 30:1.",
    assigned_officer: "Academic Principal",
    compliance_status: "compliant",
    score_weightage: 20.0,
    score_achieved: 20.0,
    evidence_documents: [
      { title: "U-DISE+ Teacher-Pupil Allocation Roster", expiry_date: "2027-05-30", file_url: "#", verified: true },
    ],
  },
  {
    id: "crit_4",
    framework: "CBSE Affiliation Bye-Laws (2018 Ed.)",
    criterion_code: "CBSE-BL-7.1",
    title: "Building Structural Safety Certificate",
    description: "Stability certificate issued by Govt-empanelled Chartered Structural Engineer confirming earthquake and load compliance.",
    assigned_officer: "Trustee Infrastructure Rep",
    compliance_status: "in_progress",
    score_weightage: 15.0,
    score_achieved: 7.5,
    evidence_documents: [
      { title: "Preliminary Structural Assessment", expiry_date: "2026-12-15", file_url: "#", verified: false },
    ],
  },
  {
    id: "crit_5",
    framework: "Right to Education (RTE) Statutory Norms",
    criterion_code: "RTE-SEC-12.1.C",
    title: "25% Economically Weaker Section (EWS) Quota Compliance",
    description: "Mandatory admission and free education quota compliance with district education office reimbursement filings.",
    assigned_officer: "Admissions & Legal Cell",
    compliance_status: "compliant",
    score_weightage: 20.0,
    score_achieved: 20.0,
    evidence_documents: [
      { title: "District Education Officer RTE Roster Approval", expiry_date: "2027-03-31", file_url: "#", verified: true },
    ],
  },
];

/**
 * Calculates overall Institutional Readiness Score (%)
 */
export function calculateReadinessScore(criteria = []) {
  if (criteria.length === 0) return { percentage: 0, compliantCount: 0, totalCount: 0, expiringEvidences: [] };

  let totalWeight = 0;
  let achievedWeight = 0;
  let compliantCount = 0;
  const now = new Date();
  const expiringEvidences = [];

  criteria.forEach((c) => {
    const maxW = Number(c.score_weightage || 10);
    const achW = Number(c.score_achieved || 0);
    totalWeight += maxW;
    achievedWeight += achW;

    if (c.compliance_status === "compliant") compliantCount += 1;

    // Check evidence document expiries
    const docs = Array.isArray(c.evidence_documents) ? c.evidence_documents : [];
    docs.forEach((doc) => {
      if (doc.expiry_date) {
        const d = new Date(doc.expiry_date);
        const daysRemaining = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
        if (daysRemaining <= 30) {
          expiringEvidences.push({
            criterion: c.criterion_code,
            title: doc.title,
            expiryDate: doc.expiry_date,
            daysRemaining,
          });
        }
      }
    });
  });

  const percentage = totalWeight > 0 ? Math.round((achievedWeight / totalWeight) * 100) : 0;

  return {
    percentage,
    compliantCount,
    totalCount: criteria.length,
    expiringEvidences,
  };
}

