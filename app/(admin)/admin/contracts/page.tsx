"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Upload, Download, Trash2, Search, FolderOpen,
  FileText, RefreshCw, X, Pencil, AlertCircle,
  ChevronDown, ChevronUp, Folder, FolderX, Building2,
} from "lucide-react";
import DashboardShell from "@/app/components/layout/DashboardShell";
import PageHeader from "@/app/components/ui/PageHeader";
import Modal from "@/app/components/ui/Modal";
import { ListSkeleton } from "@/app/components/ui/Skeleton";
import { useUnits } from "@/app/lib/hooks";
import { api } from "@/app/lib/api";
import { ShareholderContractDto } from "@/app/lib/types";
import { formatDate } from "@/app/lib/utils";

function cStyle(): React.CSSProperties {
  return { background: "var(--card)", border: "1px solid var(--card-border)" };
}
function iStyle(): React.CSSProperties {
  return { background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--foreground)" };
}
const ic = "w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none transition-all";

export default function AdminContractsPage() {
  const { units } = useUnits();

  const [contracts,  setContracts]  = useState<ShareholderContractDto[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [search,     setSearch]     = useState("");
  const [filterUnit, setFilterUnit] = useState("");

  /* expanded folders — key: folderName||unitId */
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  /* upload modal */
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    unitId: "", folderName: "", description: "",
  });
  const [files,     setFiles]     = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");

  /* edit */
  const [editItem,   setEditItem]   = useState<ShareholderContractDto | null>(null);
  const [editForm,   setEditForm]   = useState({ description: "" });
  const [editSaving, setEditSaving] = useState(false);

  /* delete */
  const [deleteId,           setDeleteId]           = useState<number | null>(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<{ folderName: string; unitId?: number } | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const data = await api.contracts.getAll();
      setContracts(Array.isArray(data) ? data : []);
    } catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* group by folderName + unitId */
  const grouped = useMemo(() => {
    const filtered = contracts.filter(c => {
      const q   = search.toLowerCase();
      const mQ  = !q ||
        (c.fileName   ?? "").toLowerCase().includes(q) ||
        (c.folderName ?? "").toLowerCase().includes(q) ||
        (c.description ?? "").toLowerCase().includes(q) ||
        (c.unitName   ?? "").toLowerCase().includes(q);
      const mUnit = !filterUnit || String(c.unitId) === filterUnit;
      return mQ && mUnit;
    });

    const map = new Map<string, { key: string; folderName: string | null; unitId: number | null; unitName: string | null; contracts: ShareholderContractDto[] }>();
    filtered.forEach(c => {
      const folder = c.folderName ?? "بدون فولدر";
      const key    = `${folder}||${c.unitId ?? "null"}`;
      if (!map.has(key)) map.set(key, {
        key,
        folderName: c.folderName ?? null,
        unitId:     c.unitId     ?? null,
        unitName:   c.unitName   ?? (c.unitId ? units.find(u => u.id === c.unitId)?.name ?? null : null),
        contracts:  [],
      });
      map.get(key)!.contracts.push(c);
    });
    return Array.from(map.values());
  }, [contracts, search, filterUnit, units]);

  function toggleExpand(key: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  /* ── Upload ── */
  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!files?.length || !uploadForm.unitId) { setUploadErr("اختر المشروع والملف/الملفات"); return; }
    setUploading(true); setUploadErr("");
    try {
      const fileArr = Array.from(files);
      await api.contracts.upload(
        0,                                           
        fileArr[0],
        uploadForm.description || undefined,
        undefined,
        parseInt(uploadForm.unitId),
        uploadForm.folderName || undefined,
        fileArr.length > 1 ? fileArr.slice(1) : undefined,
      );
      setShowUpload(false);
      setFiles(null);
      setUploadForm({ unitId: "", folderName: "", description: "" });
      await load();
    } catch (err) { setUploadErr((err as Error).message); }
    finally { setUploading(false); }
  }

  /* ── Download single ── */
  async function handleDownload(c: ShareholderContractDto) {
    try {
      const blob = await api.contracts.download(c.id);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = c.fileName ?? `file-${c.id}`; a.click();
      URL.revokeObjectURL(url);
    } catch (err) { alert((err as Error).message); }
  }

  /* ── Download folder ── */
  async function handleDownloadFolder(folderName: string | null, unitId: number | null) {
    try {
      const blob = await api.contracts.downloadFolder({
        folderName: folderName ?? undefined,
        unitId:     unitId     ?? undefined,
      });
      const url = URL.createObjectURL(blob);
      const a   = document.createElement("a");
      a.href = url; a.download = `${folderName ?? "contracts"}.zip`; a.click();
      URL.revokeObjectURL(url);
    } catch (err) { alert((err as Error).message); }
  }

  /* ── Edit ── */
  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editItem) return;
    setEditSaving(true);
    try {
      await api.contracts.update(editItem.id, { description: editForm.description || undefined });
      setEditItem(null);
      await load();
    } catch (err) { alert((err as Error).message); }
    finally { setEditSaving(false); }
  }

  /* ── Delete single ── */
  async function handleDelete() {
    if (!deleteId) return;
    try { await api.contracts.delete(deleteId); setDeleteId(null); await load(); }
    catch (err) { alert((err as Error).message); }
  }

  /* ── Delete folder ── */
  async function handleDeleteFolder() {
    if (!deleteFolderTarget) return;
    try {
      await api.contracts.deleteFolder(deleteFolderTarget);
      setDeleteFolderTarget(null);
      await load();
    } catch (err) { alert((err as Error).message); }
  }

  return (
    <DashboardShell title="العقود">
      <PageHeader
        title="عقود الملكيه"
        subtitle={`${contracts.length} ملف في ${grouped.length} فولدر`}
        actions={
          <div className="flex gap-2">
            <button onClick={load} className="w-9 h-9 rounded-xl border flex items-center justify-center" style={cStyle()}>
              <RefreshCw className="w-4 h-4" style={{ color: "var(--muted)" }} />
            </button>
            <button onClick={() => { setShowUpload(true); setUploadErr(""); }}
              className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl text-white"
              style={{ background: "linear-gradient(135deg,#6366f1,#7c3aed)", boxShadow: "0 3px 12px rgba(99,102,241,.3)" }}>
              <Upload className="w-4 h-4" /> رفع ملف
            </button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4 no-print">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--muted)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو الفولدر..."
            className="w-full pr-9 pl-8 py-2 rounded-xl text-sm border focus:outline-none" style={iStyle()} />
          {search && <button onClick={() => setSearch("")} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }}><X className="w-3.5 h-3.5" /></button>}
        </div>
        <div className="relative">
          <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--muted)" }} />
          <select value={filterUnit} onChange={e => setFilterUnit(e.target.value)}
            className="pr-9 pl-4 py-2 rounded-xl text-sm border focus:outline-none appearance-none min-w-44" style={iStyle()}>
            <option value="">كل المشاريع</option>
            {units.map(u => <option key={u.id} value={u.id}>{u.name ?? u.code}</option>)}
          </select>
        </div>
        {(search || filterUnit) && (
          <button onClick={() => { setSearch(""); setFilterUnit(""); }}
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

      {/* Folder groups */}
      {loading ? <ListSkeleton rows={4} cols={5} /> : (
        <div className="space-y-3">
          {grouped.length === 0 ? (
            <div className="rounded-2xl border py-16 text-center" style={cStyle()}>
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: "var(--muted)" }} />
              <p className="text-sm" style={{ color: "var(--muted)" }}>لا توجد ملفات</p>
            </div>
          ) : grouped.map(({ key, folderName, unitId, unitName, contracts: folderContracts }) => {
            const isOpen = expanded.has(key);
            return (
              <div key={key} className="rounded-2xl border overflow-hidden" style={cStyle()}>
                {/* Folder header */}
                <div
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors"
                  style={{ background: isOpen ? "rgba(99,102,241,.04)" : "transparent" }}
                  onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = "rgba(128,128,128,.04)"; }}
                  onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = "transparent"; }}
                  onClick={() => toggleExpand(key)}>
                  <div className="p-2 rounded-xl shrink-0" style={{ background: "rgba(99,102,241,.1)" }}>
                    {folderName
                      ? <Folder className="w-5 h-5" style={{ color: "#6366f1" }} />
                      : <FolderOpen className="w-5 h-5" style={{ color: "var(--muted)" }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm" style={{ color: "var(--foreground)" }}>
                      {folderName ?? "بدون فولدر"}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                      {unitName ?? (unitId ? `مشروع #${unitId}` : "—")}
                      <span className="mr-2">· {folderContracts.length} ملف</span>
                    </p>
                  </div>
                  {/* Folder actions */}
                  <div className="flex items-center gap-1 shrink-0 no-print" onClick={e => e.stopPropagation()}>
                    {folderName && (
                      <>
                        <button onClick={() => handleDownloadFolder(folderName, unitId)}
                          title="تحميل الفولدر كامل"
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                          style={{ color: "#10b981" }}
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(16,185,129,.12)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          <Download className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteFolderTarget({ folderName, unitId: unitId ?? undefined })}
                          title="حذف الفولدر"
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                          style={{ color: "#ef4444" }}
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,.12)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          <FolderX className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <span className="text-xs px-2 py-1 rounded-full ml-1" style={{ background: "rgba(99,102,241,.1)", color: "#6366f1" }}>
                      {folderContracts.length}
                    </span>
                    {isOpen
                      ? <ChevronUp className="w-4 h-4 mr-1" style={{ color: "var(--muted)" }} />
                      : <ChevronDown className="w-4 h-4 mr-1" style={{ color: "var(--muted)" }} />}
                  </div>
                </div>

                {/* Files table */}
                {isOpen && (
                  <div className="border-t" style={{ borderColor: "var(--card-border)" }}>
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                          {["م", "اسم الملف", "الوصف", "تاريخ الرفع", "إجراءات"].map((h, i) => (
                            <th key={h} style={{ color: "var(--muted)", background: "rgba(128,128,128,.04)", padding: "8px 14px", textAlign: i === 4 ? "center" : "right", fontSize: 11, fontWeight: 700 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {folderContracts.map((c, i) => (
                          <tr key={c.id}
                            style={{ borderBottom: "1px solid var(--card-border)" }}
                            onMouseEnter={e => e.currentTarget.style.background = "rgba(128,128,128,.04)"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                            <td style={{ padding: "10px 14px", color: "var(--muted)", fontSize: 12 }}>{i + 1}</td>
                            <td style={{ padding: "10px 14px" }}>
                              <div className="flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 shrink-0" style={{ color: "#6366f1" }} />
                                <span className="text-sm truncate max-w-52" style={{ color: "var(--foreground)" }}>
                                  {c.fileName ?? "—"}
                                </span>
                              </div>
                            </td>
                            <td style={{ padding: "10px 14px", color: "var(--muted)", fontSize: 12, maxWidth: 160 }}>
                              <span className="truncate block">{c.description ?? "—"}</span>
                            </td>
                            <td style={{ padding: "10px 14px", color: "var(--muted)", fontSize: 12, whiteSpace: "nowrap" }}>
                              {c.uploadedAt ? formatDate(c.uploadedAt) : "—"}
                            </td>
                            <td style={{ padding: "10px 14px", textAlign: "center" }}>
                              <div className="flex items-center gap-1 justify-center no-print">
                                <button onClick={() => handleDownload(c)} title="تحميل"
                                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                                  style={{ color: "#10b981" }}
                                  onMouseEnter={e => e.currentTarget.style.background = "rgba(16,185,129,.12)"}
                                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => { setEditItem(c); setEditForm({ description: c.description ?? "" }); }}
                                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                                  style={{ color: "#6366f1" }}
                                  onMouseEnter={e => e.currentTarget.style.background = "rgba(99,102,241,.12)"}
                                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => setDeleteId(c.id)}
                                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                                  style={{ color: "#ef4444" }}
                                  onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,.12)"}
                                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Upload Modal ── */}
      <Modal open={showUpload} onClose={() => setShowUpload(false)} title="رفع ملف / فولدر">
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted)" }}>
              المشروع <span className="text-red-400">*</span>
            </label>
            <select required value={uploadForm.unitId}
              onChange={e => setUploadForm(p => ({ ...p, unitId: e.target.value }))}
              className={ic} style={iStyle()}>
              <option value="">اختر المشروع...</option>
              {units.map(u => <option key={u.id} value={u.id}>{u.name ?? u.code}</option>)}
            </select>
          </div>

          {/* الفولدر */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted)" }}>
              اسم الفولدر (اختياري)
            </label>
            <input type="text" value={uploadForm.folderName}
              onChange={e => setUploadForm(p => ({ ...p, folderName: e.target.value }))}
              placeholder="مثال: عقود 2026، وثائق الملكية..."
              className={ic} style={iStyle()} />
          </div>

          {/* الملفات */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted)" }}>
              الملف / الملفات <span className="text-red-400">*</span>
            </label>
            <div
              className="relative border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all"
              style={{
                borderColor: files?.length ? "rgba(99,102,241,.5)" : "var(--card-border)",
                background:  files?.length ? "rgba(99,102,241,.05)" : "transparent",
              }}
              onClick={() => document.getElementById("contract-files")?.click()}>
              <input id="contract-files" type="file" multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip"
                className="hidden"
                onChange={e => setFiles(e.target.files)} />
              {files?.length ? (
                <div className="space-y-1">
                  {Array.from(files).map((f, i) => (
                    <div key={i} className="flex items-center justify-center gap-2 text-sm" style={{ color: "var(--foreground)" }}>
                      <FileText className="w-4 h-4" style={{ color: "#6366f1" }} /> {f.name}
                    </div>
                  ))}
                  <button type="button" onClick={e => { e.stopPropagation(); setFiles(null); }}
                    className="mt-2 text-xs" style={{ color: "#ef4444" }}>مسح</button>
                </div>
              ) : (
                <div>
                  <Upload className="w-7 h-7 mx-auto mb-2 opacity-30" style={{ color: "var(--muted)" }} />
                  <p className="text-sm" style={{ color: "var(--muted)" }}>اضغط لاختيار ملف أو أكثر</p>
                  <p className="text-xs mt-1 opacity-60" style={{ color: "var(--muted)" }}>PDF, Word, صور, ZIP</p>
                </div>
              )}
            </div>
          </div>

          {/* الوصف */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted)" }}>الوصف</label>
            <input type="text" value={uploadForm.description}
              onChange={e => setUploadForm(p => ({ ...p, description: e.target.value }))}
              placeholder="وصف مختصر للملف..."
              className={ic} style={iStyle()} />
          </div>

          {uploadErr && <p className="text-xs p-2.5 rounded-lg" style={{ background: "rgba(239,68,68,.1)", color: "#ef4444" }}>{uploadErr}</p>}

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={uploading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: "linear-gradient(135deg,#6366f1,#7c3aed)" }}>
              {uploading ? "جاري الرفع..." : "رفع"}
            </button>
            <button type="button" onClick={() => setShowUpload(false)}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium border" style={cStyle()}>إلغاء</button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Modal ── */}
      <Modal open={!!editItem} onClose={() => setEditItem(null)} title="تعديل بيانات الملف" size="sm">
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
                className={ic} style={iStyle()} />
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={editSaving}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: "linear-gradient(135deg,#6366f1,#7c3aed)" }}>
                {editSaving ? "جاري الحفظ..." : "حفظ"}
              </button>
              <button type="button" onClick={() => setEditItem(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium border" style={cStyle()}>إلغاء</button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Delete single ── */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="تأكيد حذف الملف" size="sm">
        <p className="text-sm mb-5" style={{ color: "var(--muted)" }}>هل أنت متأكد من حذف هذا الملف؟</p>
        <div className="flex gap-2">
          <button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "#ef4444" }}>حذف</button>
          <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium border" style={cStyle()}>إلغاء</button>
        </div>
      </Modal>

      {/* ── Delete folder ── */}
      <Modal open={!!deleteFolderTarget} onClose={() => setDeleteFolderTarget(null)} title="تأكيد حذف الفولدر" size="sm">
        <p className="text-sm mb-2" style={{ color: "var(--muted)" }}>
          هل أنت متأكد من حذف الفولدر{" "}
          <strong style={{ color: "var(--foreground)" }}>"{deleteFolderTarget?.folderName}"</strong>{" "}
          وكل ملفاته؟
        </p>
        <p className="text-xs mb-5 px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,.08)", color: "#ef4444" }}>
          لا يمكن التراجع — كل الملفات داخل الفولدر ستُحذف.
        </p>
        <div className="flex gap-2">
          <button onClick={handleDeleteFolder} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "#ef4444" }}>حذف الفولدر</button>
          <button onClick={() => setDeleteFolderTarget(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium border" style={cStyle()}>إلغاء</button>
        </div>
      </Modal>
    </DashboardShell>
  );
}
