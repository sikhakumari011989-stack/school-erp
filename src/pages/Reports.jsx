import { useContext, useState } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";

export default function Reports() {
  const { getFeeReport, getAttendanceReport, getMarksReport, classes } = useContext(AppContext);
  const { showToast } = useToast();
  const [reportType, setReportType] = useState("fees");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [classId, setClassId] = useState("");
  const [reportData, setReportData] = useState(null);

  const handleGenerateReport = () => {
    if (!startDate || !endDate) {
      showToast("Please select both start and end date range.", "error");
      return;
    }

    let data;
    if (reportType === "fees") {
      data = getFeeReport(startDate, endDate, classId || null);
    } else if (reportType === "attendance") {
      data = getAttendanceReport(startDate, endDate, classId || null);
    } else if (reportType === "marks") {
      data = getMarksReport(classId || null);
    }

    setReportData(data);
  };

  const handleDownloadCSV = () => {
    if (!reportData) return;

    let csv = "";
    if (reportType === "fees") {
      csv = "Student ID,Amount,Status,Date\n";
      reportData.records.forEach((r) => {
        csv += `${r.student_id},${r.amount},${r.status},${r.date}\n`;
      });
    } else if (reportType === "attendance") {
      csv = "Date,Present,Absent,Percentage\n";
      csv += `${reportData.total_days},${reportData.present},${reportData.absent},${reportData.percentage}%\n`;
    } else if (reportType === "marks") {
      csv = "Student,Subject,Percentage,Grade\n";
      reportData.records.forEach((r) => {
        csv += `${r.student_id},${r.subject},${r.percentage},${r.grade}\n`;
      });
    }

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${reportType}-report.csv`;
    a.click();
  };

  return (
    <div className="p-8 bg-gradient-to-br from-slate-900 to-slate-800 min-h-[100dvh]">
      <h1 className="text-4xl font-bold text-white mb-8">📊 Reports</h1>

      {/* Filter Section */}
      <div className="bg-slate-700/50 border border-slate-600/50 rounded-xl p-6 mb-8">
        <h2 className="text-xl font-bold text-white mb-4">Generate Report</h2>
        
        <div className="space-y-4">
          {/* Report Type */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Report Type
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-4 py-2 bg-slate-600/50 border border-slate-500/50 rounded-lg text-white"
            >
              <option value="fees">💰 Fee Report</option>
              <option value="attendance">📋 Attendance Report</option>
              <option value="marks">📈 Marks Report</option>
            </select>
          </div>

          {/* Class Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Class (Optional)
            </label>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="w-full px-4 py-2 bg-slate-600/50 border border-slate-500/50 rounded-lg text-white"
            >
              <option value="">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          {reportType !== "marks" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-600/50 border border-slate-500/50 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-600/50 border border-slate-500/50 rounded-lg text-white"
                />
              </div>
            </div>
          )}

          <button
            onClick={handleGenerateReport}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-lg transition"
          >
            🔍 Generate Report
          </button>
        </div>
      </div>

      {/* Report Display */}
      {reportData && (
        <div className="bg-slate-700/50 border border-slate-600/50 rounded-xl p-6 space-y-4">
          {reportType === "fees" && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">💰 Fee Report</h2>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-600/50 rounded-lg p-4">
                  <p className="text-slate-400">Total Fees</p>
                  <p className="text-2xl font-bold text-green-400">
                    ₹{reportData.total_fees.toFixed(2)}
                  </p>
                </div>
                <div className="bg-slate-600/50 rounded-lg p-4">
                  <p className="text-slate-400">Collected</p>
                  <p className="text-2xl font-bold text-blue-400">
                    ₹{reportData.collected.toFixed(2)}
                  </p>
                </div>
                <div className="bg-slate-600/50 rounded-lg p-4">
                  <p className="text-slate-400">Pending</p>
                  <p className="text-2xl font-bold text-red-400">
                    ₹{reportData.pending.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {reportType === "attendance" && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">📋 Attendance Report</h2>
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-600/50 rounded-lg p-4">
                  <p className="text-slate-400">Total Days</p>
                  <p className="text-2xl font-bold text-white">{reportData.total_days}</p>
                </div>
                <div className="bg-slate-600/50 rounded-lg p-4">
                  <p className="text-slate-400">Present</p>
                  <p className="text-2xl font-bold text-green-400">{reportData.present}</p>
                </div>
                <div className="bg-slate-600/50 rounded-lg p-4">
                  <p className="text-slate-400">Absent</p>
                  <p className="text-2xl font-bold text-red-400">{reportData.absent}</p>
                </div>
                <div className="bg-slate-600/50 rounded-lg p-4">
                  <p className="text-slate-400">Percentage</p>
                  <p className="text-2xl font-bold text-cyan-400">{reportData.percentage}%</p>
                </div>
              </div>
            </div>
          )}

          {reportType === "marks" && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">📈 Marks Report</h2>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-600/50 rounded-lg p-4">
                  <p className="text-slate-400">Total Students</p>
                  <p className="text-2xl font-bold text-white">{reportData.total_students}</p>
                </div>
                <div className="bg-slate-600/50 rounded-lg p-4">
                  <p className="text-slate-400">Total Marks</p>
                  <p className="text-2xl font-bold text-white">{reportData.total_marks}</p>
                </div>
                <div className="bg-slate-600/50 rounded-lg p-4">
                  <p className="text-slate-400">Class Average</p>
                  <p className="text-2xl font-bold text-yellow-400">{reportData.class_average}%</p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleDownloadCSV}
            className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-lg transition"
          >
            ⬇️ Download CSV
          </button>
        </div>
      )}
    </div>
  );
}