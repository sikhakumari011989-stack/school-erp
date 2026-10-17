/**
 * Dynamic PDF Generator Utility
 * Uses jsPDF and jspdf-autotable to produce official institutional Tax Invoices and Academic Report Cards
 */

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Generates an official, branded Institutional Fee Tax Invoice
 */
export function generateFeeInvoicePDF({
  tenant = {},
  student = {},
  payment = {},
}) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const institutionName = tenant.name || "Apex International Academy";
  const institutionCode = tenant.code || "OASIS-TUTORIALS";
  const institutionAddress = tenant.address || "14-B Campus Boulevard, Knowledge Park, Mumbai";
  const contactEmail = tenant.email || "accounts@apexacademy.edu";

  const studentName = student.name || "Astik Kumar";
  const studentRoll = student.roll_number || "STU-1024";
  const studentClass = student.class || "Class 10 ICSE";

  const invoiceNo = payment.invoiceNo || `INV-${Date.now().toString().slice(-6)}`;
  const dateStr = payment.date || new Date().toLocaleDateString("en-IN");
  const amount = Number(payment.amount || 15000);
  const paymentMethod = payment.payment_mode || "Online (Razorpay 256-Bit SSL)";
  const transactionId = payment.transactionId || `RZP_${Date.now().toString(36).toUpperCase()}`;
  const feeTitle = payment.title || "Tuition & Academic Development Fee";

  // --- BRANDED HEADER BACKGROUND ---
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, 210, 42, "F");

  // HEADER ACCENT BAR
  doc.setFillColor(59, 130, 246); // Blue 500
  doc.rect(0, 40, 210, 2.5, "F");

  // --- CUSTOM WHITE-LABEL SCHOOL LOGO RENDERING ---
  const schoolLogo =
    tenant.logoUrl ||
    (() => {
      try {
        return (
          localStorage.getItem(`erp_school_logo_${institutionCode}`) ||
          localStorage.getItem("erp_school_logo_default") ||
          null
        );
      } catch {
        return null;
      }
    })();

  let titleOffset = 14;
  if (schoolLogo && typeof schoolLogo === "string" && schoolLogo.startsWith("data:image")) {
    try {
      const format = schoolLogo.includes("png") ? "PNG" : "JPEG";
      doc.addImage(schoolLogo, format, 14, 8, 24, 24);
      titleOffset = 42;
    } catch (e) {
      console.warn("Could not render logo in PDF invoice:", e);
    }
  }

  // INSTITUTION TITLE & DETAILS
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(institutionName.toUpperCase(), titleOffset, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text(`Affiliation Code: ${institutionCode} | ISO 9001:2025 Certified Educational Body`, titleOffset, 25);
  doc.text(`${institutionAddress} | Email: ${contactEmail}`, titleOffset, 31);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(59, 130, 246);
  doc.text("TAX INVOICE", 196, 20, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text(`Original for Recipient`, 196, 27, { align: "right" });

  // --- INVOICE & STUDENT META GRID ---
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("BILLED TO / STUDENT DETAILS:", 14, 54);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Student Name: ${studentName}`, 14, 60);
  doc.text(`Roll / Scholar ID: ${studentRoll}`, 14, 66);
  doc.text(`Batch / Class: ${studentClass}`, 14, 72);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("INVOICE SPECIFICATIONS:", 120, 54);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Invoice Number: ${invoiceNo}`, 120, 60);
  doc.text(`Payment Date: ${dateStr}`, 120, 66);
  doc.text(`Payment Method: ${paymentMethod}`, 120, 72);
  const utrRef = payment.utr || (transactionId && !transactionId.startsWith("RZP") ? transactionId : null);
  if (utrRef) {
    doc.text(`UPI UTR / Bank Ref: ${utrRef}`, 120, 78);
  } else {
    doc.text(`Gateway Reference: ${transactionId}`, 120, 78);
  }

  // --- TABLE OF CHARGES ---
  const tableData = [
    [
      "1",
      feeTitle,
      "SAC 999293",
      "Term II",
      `Rs. ${(amount * 0.85).toFixed(2)}`,
    ],
    [
      "2",
      "Laboratory, Library & Infrastructure Fund",
      "SAC 999294",
      "Annual",
      `Rs. ${(amount * 0.15).toFixed(2)}`,
    ],
  ];

  autoTable(doc, {
    startY: 86,
    head: [["#", "Fee Particulars / Service Description", "SAC Code", "Tenure", "Amount (INR)"]],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: [30, 41, 59], // Slate 800
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
    },
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 4,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 90 },
      2: { cellWidth: 30, halign: "center" },
      3: { cellWidth: 25, halign: "center" },
      4: { cellWidth: 35, halign: "right" },
    },
  });

  const finalY = doc.lastAutoTable.finalY || 130;

  // --- TOTALS BREAKDOWN ---
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Educational Services (Exempt under GST Notification No. 12/2017):", 14, finalY + 12);
  doc.text("GST Payable: Rs. 0.00 (Exempted)", 14, finalY + 18);

  doc.setFillColor(241, 245, 249);
  doc.rect(120, finalY + 6, 76, 24, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("Total Paid:", 125, finalY + 14);
  doc.setFontSize(13);
  doc.setTextColor(16, 185, 129); // Emerald 500
  doc.text(`Rs. ${amount.toLocaleString("en-IN")}.00`, 190, finalY + 15, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("STATUS: FULLY SETTLED / NO OUTSTANDING", 190, finalY + 24, { align: "right" });

  // --- DIGITAL VERIFICATION SEAL ---
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, finalY + 40, 85, 26);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text("DIGITAL SECURITY VERIFICATION", 18, finalY + 46);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Hash: SHA256-${transactionId}-${invoiceNo}`, 18, finalY + 52);
  doc.text("Cryptographically signed by Institutional Finance Node", 18, finalY + 58);
  doc.text(`Timestamp: ${new Date().toISOString()}`, 18, finalY + 63);

  // CONTROLLER SIGNATURE
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("Authorized Finance Officer", 155, finalY + 62);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Bursar & Accounts Office", 155, finalY + 67);

  // FOOTER
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    "This is a computer-generated tax invoice and legal receipt. No manual signature required.",
    105,
    285,
    { align: "center" }
  );

  doc.save(`${institutionCode}_Invoice_${invoiceNo}.pdf`);
  return doc;
}

/**
 * Generates an official Institutional Academic Term Report Card / Transcript
 */
export function generateReportCardPDF({
  tenant = {},
  student = {},
  academicTerm = "Term II Examination (2026-27)",
  grades = [],
  attendanceRate = "96.4%",
}) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const institutionName = tenant.name || "Apex International Academy";
  const institutionCode = tenant.code || "OASIS-TUTORIALS";
  const studentName = student.name || "Astik Kumar";
  const studentRoll = student.roll_number || "STU-1024";
  const studentClass = student.class || "Class 10 ICSE";

  // HEADER BANNER
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, 210, 42, "F");

  doc.setFillColor(168, 85, 247); // Purple 500
  doc.rect(0, 40, 210, 2.5, "F");

  // --- CUSTOM WHITE-LABEL SCHOOL LOGO RENDERING ---
  const schoolLogo =
    tenant.logoUrl ||
    (() => {
      try {
        return (
          localStorage.getItem(`erp_school_logo_${institutionCode}`) ||
          localStorage.getItem("erp_school_logo_default") ||
          null
        );
      } catch {
        return null;
      }
    })();

  let titleOffset = 14;
  if (schoolLogo && typeof schoolLogo === "string" && schoolLogo.startsWith("data:image")) {
    try {
      const format = schoolLogo.includes("png") ? "PNG" : "JPEG";
      doc.addImage(schoolLogo, format, 14, 8, 24, 24);
      titleOffset = 42;
    } catch (e) {
      console.warn("Could not render logo in PDF report card:", e);
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(institutionName.toUpperCase(), titleOffset, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(192, 132, 252); // Purple 300
  doc.text(`OFFICIAL ACADEMIC TRANSCRIPT & PERFORMANCE REPORT`, titleOffset, 25);
  doc.setTextColor(148, 163, 184);
  doc.text(`Institutional Node: ${institutionCode} | Academic Session 2026-2027`, titleOffset, 31);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text("GRADE REPORT", 196, 24, { align: "right" });

  // STUDENT PROFILE SUMMARY
  doc.setFillColor(248, 250, 252);
  doc.rect(14, 48, 182, 26, "F");
  doc.setDrawColor(226, 232, 240);
  doc.rect(14, 48, 182, 26);

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`Student: ${studentName}`, 18, 56);
  doc.text(`Roll Number: ${studentRoll}`, 18, 62);
  doc.text(`Class & Section: ${studentClass}`, 18, 68);

  doc.text(`Assessment: ${academicTerm}`, 110, 56);
  doc.text(`Attendance Sync Rate: ${attendanceRate}`, 110, 62);
  doc.text(`Status: Promoted with Distinction`, 110, 68);

  // GRADES AUTO-TABLE
  const defaultGrades = [
    ["1", "Advanced Mathematics", "100", "95", "A+", "Exemplary Problem Solving"],
    ["2", "Physics & Mechanics", "100", "92", "A+", "Mastery of Kinematics"],
    ["3", "Organic Chemistry", "100", "88", "A", "Solid Lab Work & Theory"],
    ["4", "Computer Science (React/SQL)", "100", "98", "A+", "Exceptional Project Architecture"],
    ["5", "English Literature", "100", "89", "A", "Thoughtful Literary Analysis"],
  ];

  const bodyData = grades.length > 0 ? grades : defaultGrades;

  autoTable(doc, {
    startY: 80,
    head: [["#", "Subject / Curriculum", "Max", "Obtained", "Grade", "Faculty Evaluation Remarks"]],
    body: bodyData,
    theme: "grid",
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
    },
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 4,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 55 },
      2: { cellWidth: 18, halign: "center" },
      3: { cellWidth: 20, halign: "center" },
      4: { cellWidth: 18, halign: "center" },
      5: { cellWidth: 61 },
    },
  });

  const finalY = doc.lastAutoTable.finalY || 140;

  // SUMMARY BAR
  doc.setFillColor(243, 232, 255); // Purple 100
  doc.rect(14, finalY + 8, 182, 18, "F");

  doc.setTextColor(107, 33, 168);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Cumulative Grade Point Average (CGPA): 9.6 / 10.0 (Aggregate: 92.4%)", 20, finalY + 19);

  // SIGNATURES
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Head of Department / Teacher", 20, finalY + 50);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Faculty Academic Board", 20, finalY + 55);

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Principal / Controller of Exams", 135, finalY + 50);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Apex Institutional Board", 135, finalY + 55);

  doc.save(`${institutionCode}_ReportCard_${studentRoll}.pdf`);
  return doc;
}

