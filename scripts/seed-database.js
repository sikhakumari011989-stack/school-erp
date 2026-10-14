/**
 * Supabase Database Seeding Script
 * Run with: node scripts/seed-database.js
 */

import fs from "fs";
import { createClient } from "@supabase/supabase-js";

// Read environment variables from .env
const envText = fs.readFileSync(".env", "utf8");
const url = envText.match(/VITE_SUPABASE_URL\s*=\s*(.*)/)?.[1]?.trim();
const key = envText.match(/VITE_SUPABASE_ANON_KEY\s*=\s*(.*)/)?.[1]?.trim();

if (!url || !key) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env");
  process.exit(1);
}

const supabase = createClient(url, key);

async function seed() {
  console.log("==================================================");
  console.log("🌱 STARTING SUPABASE MULTI-TENANT SEEDING RUN...");
  console.log("==================================================");

  // 1. Verify or Seed School
  let schoolUuid = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
  const { data: schools } = await supabase.from("schools").select("*").limit(1);
  if (schools && schools.length > 0) {
    schoolUuid = schools[0].id;
    console.log(`✅ Verified School Node: "${schools[0].name}" [Code: ${schools[0].code}] (ID: ${schoolUuid})`);
  } else {
    const { data: newSchool, error: schoolErr } = await supabase.from("schools").insert([
      {
        id: schoolUuid,
        name: "Apex International Academy",
        code: "OASIS-TUTORIALS",
        city: "Mumbai",
        state: "Maharashtra",
      },
    ]).select();
    if (!schoolErr && newSchool?.[0]) {
      console.log(`✅ Seeded new School: "Apex International Academy" [Code: OASIS-TUTORIALS]`);
    }
  }

  // 2. Seed Classroom Batches
  const demoClasses = [
    { grade: "10", section: "ICSE", name: "10-ICSE", school_id: "school-demo-01" },
    { grade: "10", section: "A", name: "10-A", school_id: "school-demo-01" },
    { grade: "12", section: "Sci", name: "12-Sci", school_id: "school-demo-01" },
  ];

  let targetClassId = null;
  for (const cls of demoClasses) {
    const { data: existing } = await supabase.from("classes").select("id").eq("name", cls.name).maybeSingle();
    if (!existing) {
      const { data: inserted, error: clsErr } = await supabase.from("classes").insert([cls]).select();
      if (!clsErr && inserted?.[0]) {
        console.log(`✅ Seeded Class Batch: "${cls.name}"`);
        if (!targetClassId) targetClassId = inserted[0].id;
      }
    } else {
      if (!targetClassId) targetClassId = existing.id;
      console.log(`ℹ️ Class "${cls.name}" already exists.`);
    }
  }

  // 3. Seed Students
  const demoStudents = [
    { name: "Astik Kumar", roll_number: "101", school_id: "OASIS-TUTORIALS", class_id: targetClassId },
    { name: "Satwik Sharma", roll_number: "102", school_id: "OASIS-TUTORIALS", class_id: targetClassId },
    { name: "Priya Singh", roll_number: "103", school_id: "OASIS-TUTORIALS", class_id: targetClassId },
    { name: "Anshika Kumari", roll_number: "104", school_id: "OASIS-TUTORIALS", class_id: targetClassId },
    // Also with school-demo-01 code
    { name: "Rohan Verma", roll_number: "105", school_id: "school-demo-01", class_id: targetClassId },
  ];

  for (const st of demoStudents) {
    const { data: existing } = await supabase.from("students").select("id").eq("name", st.name).maybeSingle();
    if (!existing) {
      const { error: stErr } = await supabase.from("students").insert([st]);
      if (!stErr) console.log(`✅ Seeded Student: "${st.name}" (Roll: ${st.roll_number})`);
    } else {
      console.log(`ℹ️ Student "${st.name}" already in directory.`);
    }
  }

  // 4. Seed Homework Assignments
  const demoHomework = [
    {
      school_id: schoolUuid,
      class_id: targetClassId,
      subject: "Mathematics",
      title: "Algebra Chapter 4 Practice Set",
      description: "Complete exercise problems 4.1 to 4.3 in student revision notebook.",
      due_date: "2026-10-25",
    },
    {
      school_id: schoolUuid,
      class_id: targetClassId,
      subject: "Physics",
      title: "Laws of Motion & Friction Case Study",
      description: "Solve numerical questions 1 through 8 from reference chapter notes.",
      due_date: "2026-10-28",
    },
  ];

  for (const hw of demoHomework) {
    const { data: existing } = await supabase.from("homework").select("id").eq("title", hw.title).maybeSingle();
    if (!existing) {
      const { error: hwErr } = await supabase.from("homework").insert([hw]);
      if (!hwErr) console.log(`✅ Seeded Homework Assignment: "${hw.title}" (${hw.subject})`);
    }
  }

  // 5. Seed Financial Ledger Transactions
  const demoLedger = [
    {
      school_id: "school-demo-01",
      student_name: "Astik Kumar",
      class_name: "Class 10 ICSE",
      amount: 15000,
      status: "paid",
      payment_mode: "Online (Razorpay)",
      date: new Date().toISOString().split("T")[0],
    },
    {
      school_id: "school-demo-01",
      student_name: "Satwik Sharma",
      class_name: "Class 10 ICSE",
      amount: 15000,
      status: "pending",
      payment_mode: "Online (Razorpay)",
      date: new Date().toISOString().split("T")[0],
    },
    {
      school_id: "school-demo-01",
      student_name: "Anshika Kumari",
      class_name: "Class 8 Maharashtra Board",
      amount: 4500,
      status: "paid",
      payment_mode: "Cash / Cheque",
      date: new Date().toISOString().split("T")[0],
    },
  ];

  for (const tx of demoLedger) {
    const { data: existing } = await supabase
      .from("fee_ledger")
      .select("id")
      .eq("student_name", tx.student_name)
      .eq("amount", tx.amount)
      .maybeSingle();

    if (!existing) {
      const { error: txErr } = await supabase.from("fee_ledger").insert([tx]);
      if (!txErr) console.log(`✅ Seeded Fee Ledger Transaction: ₹${tx.amount} (${tx.student_name} - ${tx.status})`);
    }
  }

  console.log("==================================================");
  console.log("🎉 SEEDING COMPLETED SUCCESSFULLY!");
  console.log("🔑 TEST CREDENTIALS READY IN APP LOGIN:");
  console.log("   - Institution Code: OASIS-TUTORIALS");
  console.log("   - HOD / Trustee:     HOD-01");
  console.log("   - Accountant:        ACC-01");
  console.log("   - Teacher:           TCH-01");
  console.log("   - Student:           STU-1024");
  console.log("   - Super Admin:       ADMIN-01");
  console.log("   - Password:          password123");
  console.log("==================================================");
}

seed().catch(console.error);

