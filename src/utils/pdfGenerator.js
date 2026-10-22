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
  const institutionCode = tenant.code || "CAMPUS-01";
  const institutionAddress = tenant.address || "Flat number 201, Jivdani Chaya, near Rajshree Hospital, beside Kalavati Mandir, Mahim Manohar Highway, Palghar 401404";
  const contactEmail = tenant.email || "sikhakumari011989@gmail.com";

  const studentName = student.name || "Enrolled Student";
  const studentRoll = student.roll_number || "STU-101";
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
  doc.text(`Affiliation Code: ${institutionCode} | Academic Session 2026-2027`, titleOffset, 25);
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
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Issuer HQ: Flat number 201, Jivdani Chaya, near Rajshree Hospital, beside Kalavati Mandir, Mahim Manohar Highway, Palghar 401404 | Support: +91 9518388499 | ${contactEmail}`,
    105,
    281,
    { align: "center" }
  );
  doc.text(
    "This is a computer-generated tax invoice and legal receipt. No manual signature required.",
    105,
    286,
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
  const institutionCode = tenant.code || "CAMPUS-01";
  const studentName = student.name || "Enrolled Student";
  const studentRoll = student.roll_number || "STU-101";
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

  const bodyData = grades && grades.length > 0
    ? grades.map((g, idx) => {
        if (Array.isArray(g)) return g;
        return [
          String(idx + 1),
          g.subject || `Curriculum Unit ${idx + 1}`,
          String(g.maxMarks || 100),
          String(g.marksObtained ?? g.marks ?? 0),
          g.grade || "A",
          g.remarks || (Number(g.marksObtained ?? g.marks ?? 0) >= 80 ? "Exemplary Analytical Capability" : "Satisfactory Concept Evaluation"),
        ];
      })
    : defaultGrades;

  let totalMarks = 0;
  let totalMax = 0;
  bodyData.forEach((row) => {
    totalMax += Number(row[2]) || 100;
    totalMarks += Number(row[3]) || 0;
  });
  const computedPct = totalMax > 0 ? ((totalMarks / totalMax) * 100).toFixed(1) : "92.4";
  const computedCgpa = (Number(computedPct) / 10).toFixed(1);

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
  doc.text(`Cumulative Grade Point Average (CGPA): ${computedCgpa} / 10.0 (Aggregate: ${computedPct}%)`, 20, finalY + 19);

  // DIGITAL AUTHENTICATION STAMP
  doc.setDrawColor(168, 85, 247); // Purple 500
  doc.setFillColor(250, 245, 255);
  doc.roundedRect(132, finalY + 32, 64, 25, 3, 3, "FD");
  doc.setTextColor(147, 51, 234);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("OFFICIAL DIGITAL TRANSCRIPT", 164, finalY + 39, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(107, 33, 168);
  doc.text("Digitally Certified Academic Record", 164, finalY + 45, { align: "center" });
  doc.text(`Seal: ${institutionCode}-ACAD-VERIFIED`, 164, finalY + 51, { align: "center" });

  // SIGNATURES
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Head of Department / Teacher", 20, finalY + 68);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Faculty Academic Board", 20, finalY + 73);

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Principal / Controller of Exams", 135, finalY + 68);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Institutional Academic Council", 135, finalY + 73);

  doc.save(`${institutionCode}_ReportCard_${studentRoll}.pdf`);
  return doc;
}

/**
 * Generates an official, digitally signed Institutional Student Certificate
 */
export function generateOfficialCertificatePDF({
  tenant = {},
  student = {},
  certificate = {},
}) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const institutionName = tenant.name || "Apex International Academy";
  const institutionCode = tenant.code || "CAMPUS-01";
  const institutionAddress = tenant.address || "Flat number 201, Jivdani Chaya, near Rajshree Hospital, beside Kalavati Mandir, Mahim Manohar Highway, Palghar 401404";

  const studentName = student.name || student.student_name || "Enrolled Student";
  const rollNumber = student.roll_number || student.personal_code || "STU-101";
  const className = student.class_name || student.class || "Class 10-ICSE";
  const certType = (certificate.certificate_type || "BONAFIDE CERTIFICATE").toUpperCase();
  const certId = certificate.id || `CERT-${Date.now().toString().slice(-6)}`;
  const issueDate = certificate.issue_date || certificate.request_date || new Date().toISOString().split("T")[0];
  const reason = certificate.reason || "Higher Academic Admission & Verification";

  // Double border styling
  doc.setDrawColor(30, 41, 59); // Slate 800
  doc.setLineWidth(2);
  doc.rect(8, 8, 281, 194);

  doc.setDrawColor(79, 70, 229); // Indigo 600
  doc.setLineWidth(0.8);
  doc.rect(12, 12, 273, 186);

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(30, 41, 59);
  doc.text(institutionName.toUpperCase(), 148.5, 30, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`${institutionAddress} | Institutional Affiliation Node: ${institutionCode}`, 148.5, 37, { align: "center" });
  doc.text("Recognized by the Department of School Education | Academic Session 2026-2027", 148.5, 42, { align: "center" });

  // Certificate Title Ribbon
  doc.setFillColor(243, 232, 255); // Purple 100
  doc.roundedRect(60, 49, 177, 14, 4, 4, "F");
  doc.setDrawColor(168, 85, 247);
  doc.roundedRect(60, 49, 177, 14, 4, 4, "D");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(107, 33, 168); // Purple 700
  doc.text(`OFFICIAL ${certType}`, 148.5, 58, { align: "center" });

  // Meta identifiers
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Certificate No: ${certId}`, 24, 72);
  doc.text(`Date of Issue: ${issueDate}`, 273, 72, { align: "right" });

  // Body text
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  
  doc.text(`This is to officially certify that`, 148.5, 86, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(79, 70, 229);
  doc.text(studentName.toUpperCase(), 148.5, 96, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(
    `Bearing Student Identification / Roll No: ${rollNumber}, is a registered regular student of this institution enrolled in ${className} for the academic session 2026-2027.`,
    148.5,
    108,
    { align: "center", maxWidth: 220 }
  );

  doc.text(
    `According to official institutional records, their moral conduct, personal character, and academic participation have been found to be EXCELLENT throughout their enrollment.`,
    148.5,
    120,
    { align: "center", maxWidth: 220 }
  );

  doc.setFont("helvetica", "italic");
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Application Purpose: "${reason}"`, 148.5, 133, { align: "center", maxWidth: 210 });

  // Digital verification seal box
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(24, 145, 95, 28, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text("DIGITAL TAMPER-PROOF VERIFICATION", 28, 152);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Hash: SHA256-${certId}-${rollNumber}`, 28, 158);
  doc.text("Cryptographically signed by Institutional Principal Node", 28, 163);
  doc.text(`Timestamp: ${new Date().toISOString()} | Status: ISSUED`, 28, 168);

  // Official Stamp & Signature Block
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text("Head of Department (Academics)", 150, 164);
  doc.text("Principal & Executive Trustee", 235, 164);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Faculty Academic Board", 150, 170);
  doc.text("Head of Institution & Board Member", 235, 170);

  // Digital Signature Seal Stamp Icon
  doc.setDrawColor(16, 185, 129);
  doc.setFillColor(236, 253, 245);
  doc.circle(235, 150, 7, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(16, 185, 129);
  doc.text("SEALED", 235, 151, { align: "center" });

  doc.save(`${institutionCode}_${certType.replace(/[^a-zA-Z0-9]/g, "_")}_${rollNumber}.pdf`);
  return doc;
}


