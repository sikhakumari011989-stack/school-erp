import React, { useState, useEffect } from "react";
import { useAppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { supabase } from "../supabaseClient";
import { resolveSchoolUuid } from "../utils/supabaseHelpers";

export default function Reports() {
  const { user, tenant } = useAppContext() || {};
  const { showToast } = useToast();

  const schoolCode = (
    user?.institution_code ||
    user?.school_id ||
    tenant?.code ||
    "CAMPUS-01"
  ).toUpperCase();

  const [availableClasses, setAvailableClasses] = useState([
    { id: "Class 10-A", name: "Class 10-A" },
    { id: "Class 10-B", name: "Class 10-B" },
    { id: "Class 9-A", name: "Class 9-A" },
    { id: "Class 9-B", name: "Class 9-B" },
  ]);

  const [reportType, setReportType] = useState("fees");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [classId, setClassId] = useState("");
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load classes from Supabase
  useEffect(() => {
    let isMounted = true;
    async function loadSchoolClasses() {
      if (!supabase) return;
      try {
        const { data, error } = await supabase
          .from("classes")
          .select("id, name, grade, section")
          .eq("school_id", schoolCode);

        if (!error && data && data.length > 0 && isMounted) {
          setAvailableClasses(
            data.map((c) => ({
              id: c.name || c.id,
              name: c.name || `Grade ${c.grade}-${c.section}`,
            }))
          );
        }
      } catch (err) {
        console.warn("Could not load classes for reports:", err);
      }
    }
    loadSchoolClasses();
    return () => {
      isMounted = false;
    };
  }, [schoolCode]);

  // Generate Report from live Supabase tables
  const handleGenerateReport = async () => {
    setLoading(true);
    setReportData(null);

    try {
      if (reportType === "fees") {
        let query = supabase
          .from("fee_ledger")
          .select("id, student_id, student_name, class_name, amount, status, date, payment_mode")
          .eq("school_id", schoolCode);

        if (startDate) query = query.gte("date", startDate);
        if (endDate) query = query.lte("date", endDate);
        if (classId) query = query.ilike("class_name", `%${classId}%`);

        const { data, error } = await query.order("date", { ascending: false });

        if (error) throw error;

        const records = data || [];
        let total = 0;
        let collected = 0;
        let pending = 0;

        records.forEach((r) => {
          const amt = Number(r.amount) || 0;
          total += amt;
          const st = String(r.status || "").toLowerCase();
          if (st === "paid" || st === "completed") {
            collected += amt;
          } else {
            pending += amt;
          }
        });

        setReportData({
          type: "fees",
          total_fees: total,
          collected,
          pending,
          records,
        });

        showToast(`Fee report generated: ${records.length} transactions found.`, "success");
      } else if (reportType === "attendance") {
        const schoolUuid = await resolveSchoolUuid(schoolCode);

        let query = supabase.from("attendance").select("id, class_name, date, records");
        if (schoolUuid) {
          query = query.or(`school_id.eq.${schoolCode},school_id.eq.${schoolUuid}`);
        } else {
          query = query.eq("school_id", schoolCode);
        }

        if (startDate) query = query.gte("date", startDate);
        if (endDate) query = query.lte("date", endDate);
        if (classId) query = query.ilike("class_name", `%${classId}%`);

        const { data, error } = await query.order("date", { ascending: false });
        if (error) throw error;

        const sessions = data || [];
        let totalPresent = 0;
        let totalAbsent = 0;
        const studentMap = {};

        sessions.forEach((s) => {
          const recs = Array.isArray(s.records) ? s.records : [];
          recs.forEach((r) => {
            const sid = r.student_id || r.roll_number || r.name || "Unknown";
            if (!studentMap[sid]) {
              studentMap[sid] = {
                name: r.name || sid,
                roll_number: r.roll_number || sid,
                class_name: s.class_name,
                present: 0,
                absent: 0,
              };
            }
            if (String(r.status || "").toLowerCase() === "absent") {
              studentMap[sid].absent += 1;
              totalAbsent += 1;
            } else {
              studentMap[sid].present += 1;
              totalPresent += 1;
            }
          });
        });

        const totalRecords = totalPresent + totalAbsent;
        const percentage = totalRecords > 0 ? ((totalPresent / totalRecords) * 100).toFixed(1) : "0.0";

        setReportData({
          type: "attendance",
          total_days: sessions.length,
          present: totalPresent,
          absent: totalAbsent,
          percentage,
          records: Object.values(studentMap),
        });

        showToast(`Attendance report generated: ${sessions.length} sessions analyzed.`, "success");
      } else if (reportType === "marks") {
        let testsQuery = supabase
          .from("class_tests")
          .select("id, title, subject, class_id, max_score, test_date")
          .eq("school_id", schoolCode);

        if (classId) testsQuery = testsQuery.ilike("class_id", `%${classId}%`);

        const { data: tests, error: testErr } = await testsQuery;
        if (testErr) throw testErr;

        let scoresQuery = supabase
          .from("test_scores")
          .select("id, test_id, student_id, student_name, roll_number, marks_obtained, max_score, is_absent")
          .eq("school_id", schoolCode);

        const { data: scores, error: scoreErr } = await scoresQuery;
        if (scoreErr) throw scoreErr;

        const testLookup = {};
        (tests || []).forEach((t) => {
          testLookup[t.id] = t;
        });

        const records = (scores || []).map((sc) => {
          const parentTest = testLookup[sc.test_id] || {};
          const max = Number(sc.max_score) || Number(parentTest.max_score) || 20;
          const obtained = Number(sc.marks_obtained) || 0;
          const pct = max > 0 ? ((obtained / max) * 100).toFixed(1) : "0.0";
          let grade = "F";
          if (pct >= 90) grade = "A+";
          else if (pct >= 80) grade = "A";
          else if (pct >= 70) grade = "B";
          else if (pct >= 60) grade = "C";
          else if (pct >= 40) grade = "D";

          return {
            student_id: sc.roll_number || sc.student_id,
            student_name: sc.student_name,
            subject: parentTest.subject || "General",
            test_title: parentTest.title || "Unit Test",
            marks_obtained: obtained,
            max_score: max,
            percentage: pct,
            grade,
            is_absent: sc.is_absent,
          };
        });

        let totalMarksSum = 0;
        let totalMaxSum = 0;
        records.forEach((r) => {
          if (!r.is_absent) {
            totalMarksSum += r.marks_obtained;
            totalMaxSum += r.max_score;
          }
        });

        const classAverage = totalMaxSum > 0 ? ((totalMarksSum / totalMaxSum) * 100).toFixed(1) : "0.0";

        setReportData({
          type: "marks",
          total_students: new Set(records.map((r) => r.student_id)).size,
          total_marks: totalMarksSum,
          class_average: classAverage,
          records,
        });

        showToast(`Marks report generated: ${records.length} student scores loaded.`, "success");
      }
    } catch (err) {
      console.error("Report generation error:", err);
      showToast(err.message || "Failed to generate report from database.", "error");
    } finally {
      setLoading(false);
    }
  };

  // CSV Export
  const handleDownloadCSV = () => {
    if (!reportData || !reportData.records || reportData.records.length === 0) {
      showToast("No report records available to export.", "info");
      return;
    }

    let csv = "";
    if (reportData.type === "fees") {
      csv = "Student ID,Student Name,Class,Amount,Status,Date,Payment Mode\n";
      reportData.records.forEach((r) => {
        csv += `"${r.student_id || ""}","${r.student_name || ""}","${r.class_name || ""}","${r.amount || 0}","${r.status || ""}","${r.date || ""}","${r.payment_mode || ""}"\n`;
      });
    } else if (reportData.type === "attendance") {
      csv = "Roll Number,Student Name,Class,Present Days,Absent Days,Attendance Rate\n";
      reportData.records.forEach((r) => {
        const total = (r.present || 0) + (r.absent || 0);
        const rate = total > 0 ? (((r.present || 0) / total) * 100).toFixed(1) : "0.0";
        csv += `"${r.roll_number || ""}","${r.name || ""}","${r.class_name || ""}","${r.present || 0}","${r.absent || 0}","${rate}%"\n`;
      });
    } else if (reportData.type === "marks") {
      csv = "Student ID,Student Name,Subject,Test,Marks Obtained,Max Score,Percentage,Grade\n";
      reportData.records.forEach((r) => {
        csv += `"${r.student_id || ""}","${r.student_name || ""}","${r.subject || ""}","${r.test_title || ""}","${r.marks_obtained || 0}","${r.max_score || 0}","${r.percentage}%","${r.grade}"\n`;
      });
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${schoolCode}_${reportData.type}_report_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    showToast("Report exported successfully to CSV!", "success");
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-[100dvh] bg-slate-950 text-slate-100 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-2">
              <span>📊 Institutional Intelligence</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Reports & Ledger Analytics
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Generate verified administrative reports scoped to campus node <span className="font-mono text-cyan-300">{schoolCode}</span>
            </p>
          </div>
        </div>

        {/* Filter Section */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span>⚙️</span> Report Configuration
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Report Type */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Report Type
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800/80 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500 transition"
              >
                <option value="fees">💰 Fee Collection & Dues</option>
                <option value="attendance">📋 Attendance Audit</option>
                <option value="marks">📈 Class Test Marks</option>
              </select>
            </div>

            {/* Class Filter */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Class / Batch (Optional)
              </label>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800/80 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500 transition"
              >
                <option value="">All Classes</option>
                {availableClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                From Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800/80 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500 transition"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                To Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800/80 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500 transition"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={handleGenerateReport}
              disabled={loading}
              className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Querying Database...</span>
                </>
              ) : (
                <>
                  <span>🔍</span>
                  <span>Generate Report</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Report Display */}
        {reportData && (
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl space-y-6">
            {/* KPI Summary Cards */}
            {reportData.type === "fees" && (
              <div>
                <h2 className="text-xl font-black text-white mb-4 flex items-center gap-2">
                  <span>💰</span> Fee Collection Summary
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div className="bg-slate-800/60 border border-white/10 rounded-xl p-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Billed</p>
                    <p className="text-2xl sm:text-3xl font-black text-white mt-2">
                      ₹{reportData.total_fees.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">Total Collected</p>
                    <p className="text-2xl sm:text-3xl font-black text-emerald-300 mt-2">
                      ₹{reportData.collected.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-rose-400">Total Pending</p>
                    <p className="text-2xl sm:text-3xl font-black text-rose-300 mt-2">
                      ₹{reportData.pending.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {reportData.type === "attendance" && (
              <div>
                <h2 className="text-xl font-black text-white mb-4 flex items-center gap-2">
                  <span>📋</span> Attendance Summary
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  <div className="bg-slate-800/60 border border-white/10 rounded-xl p-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Sessions</p>
                    <p className="text-2xl sm:text-3xl font-black text-white mt-2">{reportData.total_days}</p>
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">Present Marks</p>
                    <p className="text-2xl sm:text-3xl font-black text-emerald-300 mt-2">{reportData.present}</p>
                  </div>
                  <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-rose-400">Absent Marks</p>
                    <p className="text-2xl sm:text-3xl font-black text-rose-300 mt-2">{reportData.absent}</p>
                  </div>
                  <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-cyan-400">Attendance Rate</p>
                    <p className="text-2xl sm:text-3xl font-black text-cyan-300 mt-2">{reportData.percentage}%</p>
                  </div>
                </div>
              </div>
            )}

            {reportData.type === "marks" && (
              <div>
                <h2 className="text-xl font-black text-white mb-4 flex items-center gap-2">
                  <span>📈</span> Marks Performance Summary
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div className="bg-slate-800/60 border border-white/10 rounded-xl p-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Scholars Evaluated</p>
                    <p className="text-2xl sm:text-3xl font-black text-white mt-2">{reportData.total_students}</p>
                  </div>
                  <div className="bg-slate-800/60 border border-white/10 rounded-xl p-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Cumulative Score</p>
                    <p className="text-2xl sm:text-3xl font-black text-white mt-2">{reportData.total_marks}</p>
                  </div>
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-400">Class Average</p>
                    <p className="text-2xl sm:text-3xl font-black text-amber-300 mt-2">{reportData.class_average}%</p>
                  </div>
                </div>
              </div>
            )}

            {/* Table or Empty State */}
            {reportData.records.length === 0 ? (
              <div className="p-8 text-center bg-slate-800/40 rounded-xl border border-white/5">
                <p className="text-slate-400 text-sm font-medium">
                  No records match the selected filters for this time window.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-800/90 text-slate-300 uppercase tracking-wider text-[11px] font-bold">
                    <tr>
                      {reportData.type === "fees" && (
                        <>
                          <th className="p-3.5">Student</th>
                          <th className="p-3.5">Class</th>
                          <th className="p-3.5">Amount</th>
                          <th className="p-3.5">Status</th>
                          <th className="p-3.5">Date</th>
                          <th className="p-3.5">Mode</th>
                        </>
                      )}
                      {reportData.type === "attendance" && (
                        <>
                          <th className="p-3.5">Roll No</th>
                          <th className="p-3.5">Student Name</th>
                          <th className="p-3.5">Class</th>
                          <th className="p-3.5">Present</th>
                          <th className="p-3.5">Absent</th>
                          <th className="p-3.5">Attendance %</th>
                        </>
                      )}
                      {reportData.type === "marks" && (
                        <>
                          <th className="p-3.5">Roll / ID</th>
                          <th className="p-3.5">Student Name</th>
                          <th className="p-3.5">Subject</th>
                          <th className="p-3.5">Test Title</th>
                          <th className="p-3.5">Marks</th>
                          <th className="p-3.5">Grade</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 bg-slate-900/40 font-medium">
                    {reportData.type === "fees" &&
                      reportData.records.slice(0, 50).map((r, idx) => (
                        <tr key={r.id || idx} className="hover:bg-white/5 transition">
                          <td className="p-3.5 text-white font-bold">{r.student_name || r.student_id || "Student"}</td>
                          <td className="p-3.5 text-slate-300">{r.class_name || "N/A"}</td>
                          <td className="p-3.5 text-white font-mono font-bold">₹{Number(r.amount || 0).toLocaleString("en-IN")}</td>
                          <td className="p-3.5">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                                String(r.status).toLowerCase() === "paid" || String(r.status).toLowerCase() === "completed"
                                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                  : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                              }`}
                            >
                              {r.status || "due"}
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-400 font-mono">{r.date || "N/A"}</td>
                          <td className="p-3.5 text-slate-400">{r.payment_mode || "School Cash/UPI"}</td>
                        </tr>
                      ))}

                    {reportData.type === "attendance" &&
                      reportData.records.slice(0, 50).map((r, idx) => {
                        const tot = (r.present || 0) + (r.absent || 0);
                        const rate = tot > 0 ? (((r.present || 0) / tot) * 100).toFixed(1) : "0.0";
                        return (
                          <tr key={r.roll_number || idx} className="hover:bg-white/5 transition">
                            <td className="p-3.5 font-mono text-cyan-300 font-bold">{r.roll_number}</td>
                            <td className="p-3.5 text-white font-bold">{r.name}</td>
                            <td className="p-3.5 text-slate-300">{r.class_name || "Class 10"}</td>
                            <td className="p-3.5 text-emerald-400 font-bold">{r.present}</td>
                            <td className="p-3.5 text-rose-400 font-bold">{r.absent}</td>
                            <td className="p-3.5 text-white font-mono font-bold">{rate}%</td>
                          </tr>
                        );
                      })}

                    {reportData.type === "marks" &&
                      reportData.records.slice(0, 50).map((r, idx) => (
                        <tr key={idx} className="hover:bg-white/5 transition">
                          <td className="p-3.5 font-mono text-cyan-300 font-bold">{r.student_id}</td>
                          <td className="p-3.5 text-white font-bold">{r.student_name}</td>
                          <td className="p-3.5 text-slate-300">{r.subject}</td>
                          <td className="p-3.5 text-slate-400">{r.test_title}</td>
                          <td className="p-3.5 text-white font-mono font-bold">
                            {r.marks_obtained} / {r.max_score}
                          </td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-black text-xs">
                              {r.grade}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* CSV Download Action */}
            <div className="flex justify-end pt-2">
              <button
                onClick={handleDownloadCSV}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center gap-2 cursor-pointer text-sm"
              >
                <span>⬇️</span>
                <span>Download Report CSV</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
