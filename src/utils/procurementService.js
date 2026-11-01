import { supabase } from "../supabaseClient";
import { logSecurityAction } from "./auditLogger";

/**
 * PROCUREMENT & VENDOR INTELLIGENCE SERVICE
 * Maker-Checker Approvals, Quotation Comparisons, and Goods Receipt Tracking.
 */

export const DEFAULT_VENDORS = [
  {
    id: "vend_1",
    vendor_name: "Apex Scientific Instruments Ltd.",
    contact_person: "Dinesh K. Mehta",
    phone: "+91 98201 33410",
    email: "sales@apexscientific.in",
    category: "Lab Chemicals & Apparatus",
    gstin: "27AABCA1234F1Z5",
    rating: 4.8,
  },
  {
    id: "vend_2",
    vendor_name: "Omega IT Systems & Peripherals",
    contact_person: "Virendra Singh",
    phone: "+91 98202 44590",
    email: "contracts@omegait.co.in",
    category: "IT & Hardware",
    gstin: "27BBBCB5678G2Z9",
    rating: 4.6,
  },
  {
    id: "vend_3",
    vendor_name: "Navneet Stationers & Printers",
    contact_person: "Ramesh Gala",
    phone: "+91 98203 11820",
    email: "orders@navneetprint.in",
    category: "Stationery & Printing",
    gstin: "27CCCC19012H3Z1",
    rating: 4.9,
  },
];

export const DEFAULT_REQUISITIONS = [
  {
    id: "po_1",
    po_number: "PO-2026-081",
    title: "10x High-Precision Physics Optical Benches",
    category: "Lab Chemicals & Apparatus",
    department: "Physics Science Wing",
    requested_by: "Dr. V. K. Raman",
    estimated_amount: 45000,
    vendor_name: "Apex Scientific Instruments Ltd.",
    stage: "approved",
    approved_by: "Principal Office",
    approved_at: "2026-10-25T11:00:00Z",
    quotations: [
      { vendor_name: "Apex Scientific", quoted_amount: 45000, selected: true },
      { vendor_name: "National Lab Supplies", quoted_amount: 49500, selected: false },
    ],
  },
  {
    id: "po_2",
    po_number: "PO-2026-084",
    title: "Annual Examination Answer Booklets (50,000 Pcs)",
    category: "Stationery & Printing",
    department: "Examination Control Wing",
    requested_by: "Exam Controller Staff",
    estimated_amount: 68000,
    vendor_name: "Navneet Stationers & Printers",
    stage: "pending_approval",
    quotations: [
      { vendor_name: "Navneet Stationers", quoted_amount: 68000, selected: true },
      { vendor_name: "Pioneer Press Mumbai", quoted_amount: 74000, selected: false },
    ],
  },
];

/**
 * Approves a purchase requisition applying strict Maker-Checker separation of duty
 */
export async function approvePurchaseRequisition({ requisition, approverName, schoolId, user }) {
  const cleanSchool = (schoolId || "CAMPUS-01").trim().toUpperCase();

  // Maker-Checker Hard Rule: Approver cannot be the same individual who requested it
  if (requisition.requested_by && approverName && requisition.requested_by.trim().toLowerCase() === approverName.trim().toLowerCase()) {
    throw new Error("Maker-Checker Violation: Separation of duties requires that purchase orders cannot be approved by the requester.");
  }

  const updatedPayload = {
    ...requisition,
    stage: "approved",
    approved_by: approverName || "Principal Executive",
    approved_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (supabase) {
    try {
      await supabase
        .from("purchase_requisitions")
        .update({
          stage: "approved",
          approved_by: updatedPayload.approved_by,
          approved_at: updatedPayload.approved_at,
          updated_at: updatedPayload.updated_at,
        })
        .eq("id", requisition.id)
        .eq("school_id", cleanSchool);
    } catch (e) {
      console.warn("[Procurement] Supabase update notice:", e);
    }
  }

  logSecurityAction({
    action: `Purchase Order Approved: ${requisition.po_number}`,
    entityType: "PROCUREMENT",
    entityId: requisition.id,
    details: `PO for ₹${requisition.estimated_amount} approved by ${approverName}`,
    user,
    schoolId: cleanSchool,
  });

  return updatedPayload;
}

/**
 * Confirms delivery of goods into institutional inventory
 */
export async function confirmGoodsReceived({ requisition, schoolId, user }) {
  const cleanSchool = (schoolId || "CAMPUS-01").trim().toUpperCase();

  const updatedPayload = {
    ...requisition,
    stage: "goods_received",
    goods_received_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (supabase) {
    try {
      await supabase
        .from("purchase_requisitions")
        .update({
          stage: "goods_received",
          goods_received_at: updatedPayload.goods_received_at,
          updated_at: updatedPayload.updated_at,
        })
        .eq("id", requisition.id)
        .eq("school_id", cleanSchool);
    } catch (e) {}
  }

  logSecurityAction({
    action: `Goods Received: ${requisition.po_number}`,
    entityType: "INVENTORY",
    entityId: requisition.id,
    details: `Goods physically inspected and checked into campus inventory`,
    user,
    schoolId: cleanSchool,
  });

  return updatedPayload;
}

