/**
 * Strict Global CSV Exporter Utility
 * Enforces strict MIME type text/csv;charset=utf-8; with UTF-8 BOM (\uFEFF)
 * and guarantees a clean .csv filename so OS defaults (Windows, macOS) route directly
 * to Excel or Google Sheets, completely preventing OneNote or 3D Viewer hijack.
 * Supports both object argument ({ filename, headers, rows }) and positional arguments (filename, headers, rows).
 */

export function exportToCSV(arg1, arg2, arg3) {
  let filename;
  let headers;
  let rows;

  if (typeof arg1 === "object" && arg1 !== null && !Array.isArray(arg1)) {
    filename = arg1.filename || "export";
    headers = arg1.headers || [];
    rows = arg1.rows || [];
  } else {
    filename = arg1 || "export";
    headers = arg2 || [];
    rows = arg3 || [];
  }

  // Guarantee clean .csv extension
  const baseName = filename.replace(/\.csv$/i, "").trim() || "export";
  const cleanFilename = `${baseName}.csv`;

  // Format headers
  const headerLine = headers
    .map((h) => `"${String(h ?? "").replace(/"/g, '""')}"`)
    .join(",");

  // Format row entries
  const rowLines = rows.map((row) => {
    if (Array.isArray(row)) {
      return row.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",");
    }
    return headers
      .map((h) => `"${String(row[h] ?? "").replace(/"/g, '""')}"`)
      .join(",");
  });

  // Prepend UTF-8 BOM (\uFEFF) for immediate native Microsoft Excel UTF-8 recognition
  const csvContent = "\uFEFF" + [headerLine, ...rowLines].join("\r\n");

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", cleanFilename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

