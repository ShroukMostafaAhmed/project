"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Upload, Download, Trash2, Search, Eye,
  FileText, RefreshCw, X, Pencil, AlertCircle, Users,
} from "lucide-react";
import DashboardShell from "@/app/components/layout/DashboardShell";
import PageHeader from "@/app/components/ui/PageHeader";
import Modal from "@/app/components/ui/Modal";
import { ListSkeleton } from "@/app/components/ui/Skeleton";
import { useShareholders } from "@/app/lib/hooks";
import { api } from "@/app/lib/api";
import { ShareholderContractDto } from "@/app/lib/types";
import { formatDate } from "@/app/lib/utils";


function cStyle(): React.CSSProperties {
  return { background: "var(--card)", border: "1px solid var(--card-border)" };
}
function iStyle(): React.CSSProperties {
  return { background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--foreground)" };
}

export default function AdminContractsPage() {
  const { shareholders } = useShareholders();

  const [contracts,    setContracts]    = useState<ShareholderContractDto[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [search,       setSearch]       = useState("");
  const [filterSh,     setFilterSh]     = useState("");

  /* upload modal */
  const [showUpload,   setShowUpload]   = useState(false);
  const [uploadForm,   setUploadForm]   = useState({
    shareholderId: "", description: "",
  });
  const [file,         setFile]         = useState<File | null>(null);
  const [uploading,    setUploading]    = useState(false);
  const [uploadErr,    setUploadErr]    = useState("");

  /* edit modal */
  const [editItem,     setEditItem]     = useState<ShareholderContractDto | null>(null);
  const [editForm,     setEditForm]     = useState({ description: ""});
  const [editSaving,   setEditSaving]   = useState(false);

  /* delete */
  const [deleteId,     setDeleteId]     = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const data = await api.contracts.getAll();
      setContracts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = contracts.filter(c => {
    const q = search.toLowerCase();
    const mQ = !q ||
      (c.fileName ?? "").toLowerCase().includes(q) ||
      (c.description ?? "").toLowerCase().includes(q) ;
    const mSh = !filterSh || String(c.shareholderId) === filterSh;
    return mQ && mSh;
  });

  /* ── Upload ── */
  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !uploadForm.shareholderId) {
      setUploadErr("اختر مساهم وملف"); return;
    }
    setUploading(true); setUploadErr("");
    try {
      await api.contracts.upload(
        parseInt(uploadForm.shareholderId),
        file,
        uploadForm.description || undefined,
      );
      setShowUpload(false);
      setFile(null);
      setUploadForm({ shareholderId: "", description: "" });
      await load();
    } catch (err) {
      setUploadErr((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  /* ── Download ── */
  async function handleDownload(c: ShareholderContractDto) {
    try {
      const blob = await api.contracts.download(c.id);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = c.fileName ?? `contract-${c.id}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert((err as Error).message);
    }
  }

  /* ── Edit ── */
  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editItem) return;
    setEditSaving(true);
    try {
      await api.contracts.update(editItem.id, {
        description:  editForm.description  || undefined,
      });
      setEditItem(null);
      await load();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setEditSaving(false);
    }
  }

  /* ── Delete ── */
  async function handleDelete() {
    if (!deleteId) return;
    try {
      await api.contracts.delete(deleteId);
      setDeleteId(null);
      await load();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  return (
    <DashboardShell title="العقود">
      <PageHeader
        title="عقود المساهمين"
        subtitle={`${contracts.length} عقد مسجل`}
        actions={
          <div className="flex gap-2">
            <button onClick={load}
              className="w-9 h-9 rounded-xl border flex items-center justify-center"
              style={cStyle()} title="تحديث">
              <RefreshCw className="w-4 h-4" style={{ color: "var(--muted)" }} />
            </button>
            <button onClick={() => { setShowUpload(true); setUploadErr(""); }}
              className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl text-white"
              style={{ background: "linear-gradient(135deg,#6366f1,#7c3aed)", boxShadow: "0 3px 12px rgba(99,102,241,.3)" }}>
              <Upload className="w-4 h-4" /> رفع عقد
            </button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--muted)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو النوع..."
            className="w-full pr-9 pl-8 py-2 rounded-xl text-sm border focus:outline-none"
            style={iStyle()} />
          {search && (
            <button onClick={() => setSearch("")} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }}>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="relative">
          <Users className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--muted)" }} />
          <select value={filterSh} onChange={e => setFilterSh(e.target.value)}
            className="pr-9 pl-4 py-2 rounded-xl text-sm border focus:outline-none appearance-none min-w-44"
            style={iStyle()}>
            <option value="">كل المساهمين</option>
            {shareholders.map(s => (
              <option key={s.id} value={s.id}>{s.fullName}</option>
            ))}
          </select>
        </div>
        {(search || filterSh) && (
          <button onClick={() => { setSearch(""); setFilterSh(""); }}
            className="px-3 py-2 rounded-xl text-xs font-medium border"
            style={{ color: "#ef4444", borderColor: "rgba(239,68,68,.3)", background: "rgba(239,68,68,.06)" }}>
            مسح
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl mb-4 text-sm"
          style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.25)", color: "#ef4444" }}>
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <ListSkeleton rows={6} cols={5} />
      ) : (
        <div className="rounded-2xl border overflow-hidden shadow-sm" style={cStyle()}>
          <div className="flex items-center justify-between px-5 py-3 border-b"
            style={{ borderColor: "var(--card-border)", background: "rgba(128,128,128,.04)" }}>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" style={{ color: "#6366f1" }} />
              <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>سجل العقود</span>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full"
              style={{ background: "rgba(128,128,128,.1)", color: "var(--muted)" }}>
              {filtered.length} / {contracts.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                  {["م", "المساهم", "اسم الملف", "الوصف", "تاريخ الرفع", "إجراءات"].map(h => (
                    <th key={h} className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                      style={{ color: "var(--muted)", background: "rgba(128,128,128,.04)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="w-10 h-10 opacity-20" style={{ color: "var(--muted)" }} />
                        <p className="text-sm" style={{ color: "var(--muted)" }}>لا توجد عقود</p>
                      </div>
                    </td>
                  </tr>
                ) : filtered.map((c, i) => {
                  const sh = shareholders.find(s => s.id === c.shareholderId);
                  return (
                    <tr key={c.id}
                      style={{ borderBottom: "1px solid var(--card-border)" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(128,128,128,.04)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td className="px-4 py-3.5 text-xs" style={{ color: "var(--muted)" }}>{i + 1}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{ background: "linear-gradient(135deg,#6366f1,#7c3aed)" }}>
                            {(sh?.fullName ?? "?")[0]}
                          </div>
                          <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                            {sh?.fullName ?? `#${c.shareholderId}`}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 shrink-0" style={{ color: "#6366f1" }} />
                          <span className="text-sm truncate max-w-48" style={{ color: "var(--foreground)" }}>
                            {c.fileName ?? "—"}
                          </span>
                        </div>
                      </td>
                     
                      <td className="px-4 py-3.5 text-xs max-w-40 truncate" style={{ color: "var(--muted)" }}>
                        {c.description ?? "—"}
                      </td>
                      <td className="px-4 py-3.5 text-xs whitespace-nowrap" style={{ color: "var(--muted)" }}>
                        {c.uploadedAt ? formatDate(c.uploadedAt) : "—"}
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleDownload(c)} title="تحميل"
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                            style={{ color: "#10b981" }}
                            onMouseEnter={e => e.currentTarget.style.background = "rgba(16,185,129,.12)"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => { setEditItem(c); setEditForm({ description: c.description ?? "" }); }}
                            title="تعديل"
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                            style={{ color: "#6366f1" }}
                            onMouseEnter={e => e.currentTarget.style.background = "rgba(99,102,241,.12)"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setDeleteId(c.id)} title="حذف"
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                            style={{ color: "#ef4444" }}
                            onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,.12)"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Upload Modal ── */}
      <Modal open={showUpload} onClose={() => setShowUpload(false)} title="رفع عقد جديد">
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted)" }}>
              المساهم <span className="text-red-400">*</span>
            </label>
            <select required value={uploadForm.shareholderId}
              onChange={e => setUploadForm(p => ({ ...p, shareholderId: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none" style={iStyle()}>
              <option value="">اختر مساهم...</option>
              {shareholders.filter(s => s.isActive).map(s => (
                <option key={s.id} value={s.id}>{s.fullName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted)" }}>
              الملف <span className="text-red-400">*</span>
            </label>
            <div
              className="relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer"
              style={{
                borderColor: file ? "rgba(99,102,241,.5)" : "var(--card-border)",
                background: file ? "rgba(99,102,241,.05)" : "transparent",
              }}
              onClick={() => document.getElementById("contract-file")?.click()}
            >
              <input id="contract-file" type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                className="hidden"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
              />
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="w-5 h-5" style={{ color: "#6366f1" }} />
                  <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{file.name}</span>
                  <button type="button" onClick={e => { e.stopPropagation(); setFile(null); }}
                    className="mr-1" style={{ color: "#ef4444" }}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div>
                  <Upload className="w-8 h-8 mx-auto mb-2 opacity-30" style={{ color: "var(--muted)" }} />
                  <p className="text-sm" style={{ color: "var(--muted)" }}>اضغط لاختيار ملف</p>
                  <p className="text-xs mt-1" style={{ color: "var(--muted)", opacity: 0.6 }}>PDF, Word, صور</p>
                </div>
              )}
            </div>
          </div>

          

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted)" }}>الوصف</label>
            <input type="text" value={uploadForm.description}
              onChange={e => setUploadForm(p => ({ ...p, description: e.target.value }))}
              placeholder="وصف مختصر للعقد..."
              className="w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none" style={iStyle()} />
          </div>

          {uploadErr && (
            <p className="text-xs p-2.5 rounded-lg" style={{ background: "rgba(239,68,68,.1)", color: "#ef4444" }}>
              {uploadErr}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={uploading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: "linear-gradient(135deg,#6366f1,#7c3aed)" }}>
              {uploading ? "جاري الرفع..." : "رفع العقد"}
            </button>
            <button type="button" onClick={() => setShowUpload(false)}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium border" style={cStyle()}>
              إلغاء
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Modal ── */}
      <Modal open={!!editItem} onClose={() => setEditItem(null)} title="تعديل بيانات العقد" size="sm">
        {editItem && (
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="rounded-xl p-3" style={{ background: "rgba(99,102,241,.07)", border: "1px solid rgba(99,102,241,.15)" }}>
              <p className="text-xs" style={{ color: "var(--muted)" }}>الملف</p>
              <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{editItem.fileName}</p>
            </div>
           
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted)" }}>الوصف</label>
              <input type="text" value={editForm.description}
                onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none" style={iStyle()} />
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={editSaving}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: "linear-gradient(135deg,#6366f1,#7c3aed)" }}>
                {editSaving ? "جاري الحفظ..." : "حفظ"}
              </button>
              <button type="button" onClick={() => setEditItem(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium border" style={cStyle()}>
                إلغاء
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Delete ── */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="تأكيد الحذف" size="sm">
        <p className="text-sm mb-5" style={{ color: "var(--muted)" }}>
          هل أنت متأكد من حذف هذا العقد؟ لا يمكن التراجع.
        </p>
        <div className="flex gap-2">
          <button onClick={handleDelete}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: "#ef4444" }}>
            حذف
          </button>
          <button onClick={() => setDeleteId(null)}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium border" style={cStyle()}>
            إلغاء
          </button>
        </div>
      </Modal>
    </DashboardShell>
  );
}
