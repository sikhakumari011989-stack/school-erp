import React, { useState, useEffect, useContext, useMemo } from "react";
import { AppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { supabase } from "../supabaseClient";
import {
  processDocumentFile,
  verifyAndCommitDocument,
  getOcrProviderStatus,
  DOCUMENT_TYPES,
} from "../utils/documentOcrEngine";
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Search,
  Filter,
  Eye,
  RefreshCw,
  Sparkles,
  Info,
  Layers,
  X,
  FileCheck,
  Check,
} from "lucide-react";

export default function DocumentIntelligence() {
  const { user, tenant } = useContext(AppContext) || {};
  const { showToast } = useToast();

  const schoolCode = (
    user?.institution_code ||
    user?.school_id ||
    tenant?.code ||
    "CAMPUS-01"
  ).toUpperCase();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState("admission_form");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // Review Modal State
  const [reviewDoc, setReviewDoc] = useState(null);
  const [editedFields, setEditedFields] = useState({});
  const [verifying, setVerifying] = useState(false);

  const providerStatus = useMemo(() => getOcrProviderStatus(), []);

  useEffect(() => {
    fetchDocuments();
  }, [schoolCode]);

  const fetchDocuments = async () => {
    setLoading(true);
    let loaded = [];

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("digitized_documents")
          .select("*")
          .eq("school_id", schoolCode)
          .order("created_at", { ascending: false });

        if (!error && data) loaded = data;
      } catch (err) {
        console.warn("[DocIntelligence] Supabase fetch notice:", err);
      }
    }

    if (loaded.length === 0) {
      try {
        const raw = localStorage.getItem(`erp_digitized_docs_${schoolCode}`);
        if (raw) loaded = JSON.parse(raw);
      } catch (e) {}
    }

    setDocuments(loaded);
    setLoading(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await processDocumentFile({
        file,
        documentType: selectedType,
        schoolId: schoolCode,
        uploadedBy: user?.name || "Administrative Staff",
      });

      setDocuments((prev) => [result.document, ...prev]);
      showToast(`Document "${file.name}" ingested and parsed (${result.document.confidence_score}% confidence)`, "success");
    } catch (err) {
      showToast(err.message || "Failed to process document.", "error");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const openReviewModal = (doc) => {
    setReviewDoc(doc);
    setEditedFields(doc.verified_data || doc.extracted_data || {});
  };

  const handleCommitVerification = async () => {
    if (!reviewDoc) return;
    setVerifying(true);

    try {
      const updated = await verifyAndCommitDocument({
        documentId: reviewDoc.id,
        verifiedData: editedFields,
        verifiedBy: user?.name || "Staff Verifier",
        schoolId: schoolCode,
      });

      if (updated) {
        setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
        showToast("Document verified and synchronized with institutional record.", "success");
        setReviewDoc(null);
      }
    } catch (err) {
      showToast("Verification notice: " + err.message, "error");
    } finally {
      setVerifying(false);
    }
  };

  const filteredDocs = useMemo(() => {
    return documents.filter((d) => {
      const matchesSearch =
        (d.document_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.target_student_id || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || d.extraction_status === statusFilter;
      const matchesType = typeFilter === "all" || d.document_type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [documents, searchQuery, statusFilter, typeFilter]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 transition-colors duration-200">
      {/* HEADER BAR */}
      <div className="bg-white/90 dark:bg-slate-900/80 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                AI Document Intelligence
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 font-bold">
                {schoolCode}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Automated OCR ingestion, structured field extraction, and human-in-the-loop validation workbench.
            </p>
          </div>
        </div>

        {/* PROVIDER INTEGRATION NOTICE PILL */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300">
          <Sparkles className="w-4 h-4 text-cyan-500" />
          <span className="font-semibold">{providerStatus.providerName}</span>
          <span className={`w-2 h-2 rounded-full ${providerStatus.isConfigured ? "bg-emerald-400" : "bg-amber-400"}`} />
        </div>
      </div>

      {/* UPLOAD & INGESTION BENCH */}
      <div className="bg-white/90 dark:bg-slate-900/60 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-md">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <UploadCloud className="w-4 h-4 text-cyan-500" />
          Document Intake & AI OCR Extractor
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Select Document Category
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              {DOCUMENT_TYPES.map((dt) => (
                <option key={dt.id} value={dt.id}>
                  {dt.icon} {dt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2 flex flex-col justify-end">
            <label className="relative border-2 border-dashed border-cyan-500/40 hover:border-cyan-500 dark:hover:border-cyan-400 rounded-xl p-4 flex items-center justify-center gap-3 cursor-pointer bg-cyan-500/5 hover:bg-cyan-500/10 transition-colors">
              <UploadCloud className="w-5 h-5 text-cyan-600 dark:text-cyan-400 animate-bounce" />
              <div className="text-center sm:text-left">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {uploading ? "Analyzing Document with OCR..." : "Click or drag document to analyze"}
                </span>
                <p className="text-[10px] text-slate-500">Supports PDF, PNG, JPEG, WebP up to 10MB</p>
              </div>
              <input
                type="file"
                disabled={uploading}
                onChange={handleFileUpload}
                accept=".pdf,image/png,image/jpeg,image/webp"
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white/80 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search document name, scholar ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-cyan-500 placeholder-slate-400"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs rounded-xl px-3 py-2"
          >
            <option value="all">All Statuses</option>
            <option value="extracted">Extracted (Pending Review)</option>
            <option value="human_verified">Human Verified</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs rounded-xl px-3 py-2"
          >
            <option value="all">All Categories</option>
            {DOCUMENT_TYPES.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* DOCUMENT VAULT LIST */}
      <div className="bg-white/90 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-500 mb-2" />
            Loading digitized document repository...
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <Info className="w-6 h-6 text-slate-400 mx-auto mb-2" />
            No documents found in vault. Ingest a document above to begin OCR extraction.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-bold">
                  <th className="py-3.5 px-4">Document</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Extraction Confidence</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Uploaded</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {filteredDocs.map((doc) => {
                  const typeObj = DOCUMENT_TYPES.find((t) => t.id === doc.document_type) || DOCUMENT_TYPES[0];
                  const isVerified = doc.extraction_status === "human_verified";

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <FileText className="w-4 h-4 text-cyan-500" />
                          {doc.document_name}
                        </div>
                        {doc.target_student_id && (
                          <span className="text-[10px] text-slate-400">Target ID: {doc.target_student_id}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-medium">
                          {typeObj.icon} {typeObj.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          doc.confidence_score >= 90
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                        }`}>
                          <Sparkles className="w-3 h-3" />
                          {doc.confidence_score}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isVerified
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                        }`}>
                          {isVerified ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {isVerified ? "Human Verified" : "Extracted (Needs Review)"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => openReviewModal(doc)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-cyan-500/20 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {isVerified ? "View Record" : "Review & Validate"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* HUMAN-IN-THE-LOOP VERIFICATION MODAL */}
      {reviewDoc && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-cyan-500/10 text-cyan-500 rounded-xl">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Human-in-the-Loop Verification
                  </h3>
                  <p className="text-xs text-slate-400">{reviewDoc.document_name}</p>
                </div>
              </div>
              <button
                onClick={() => setReviewDoc(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Verify extracted fields below. Correct any character discrepancies prior to committing to institutional records.
            </p>

            {/* Extracted JSON/Key-Value Editor */}
            <div className="max-h-[350px] overflow-y-auto space-y-3 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              {Object.entries(editedFields).map(([key, val]) => {
                if (typeof val === "object" && val !== null) {
                  return (
                    <div key={key} className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                        {key.replace(/_/g, " ")}:
                      </span>
                      <pre className="text-[10px] bg-slate-100 dark:bg-slate-900 p-2 rounded-lg overflow-x-auto text-slate-600 dark:text-slate-400">
                        {JSON.stringify(val, null, 2)}
                      </pre>
                    </div>
                  );
                }
                return (
                  <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 capitalize">
                      {key.replace(/_/g, " ")}
                    </label>
                    <input
                      type="text"
                      value={String(val ?? "")}
                      onChange={(e) => setEditedFields({ ...editedFields, [key]: e.target.value })}
                      className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white sm:w-72 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setReviewDoc(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={verifying}
                onClick={handleCommitVerification}
                className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                {verifying ? "Validating..." : "Approve & Commit Record"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

