"use client";

import { useState, useMemo } from "react";
import {
  Plus, Search, X, Users, Building2,
  RefreshCw, Trash2, Pencil, AlertCircle, Hash, ChevronDown,
} from "lucide-react";
import DashboardShell from "@/app/components/layout/DashboardShell";
import PageHeader from "@/app/components/ui/PageHeader";
import Modal from "@/app/components/ui/Modal";
import { ListSkeleton, StatCardSkeleton } from "@/app/components/ui/Skeleton";
import {
  useShareholderUnits, useShareholders, useUnits,
} from "@/app/lib/hooks";
import { ShareholderUnitDto } from "@/app/lib/types";
import { api } from "@/app/lib/api";

function iStyle(): React.CSSProperties {
  return { background:"var(--input-bg)", borderColor:"var(--input-border)", color:"var(--foreground)" };
}
function cStyle(): React.CSSProperties {
  return { background:"var(--card)", border:"1px solid var(--card-border)" };
}

export default function ShareholderUnitsPage() {
  const { shareholderUnits, loading:lu, error, reload } = useShareholderUnits();
  const { shareholders, loading:ls } = useShareholders();
  const { units, loading:lun } = useUnits();
  const loading = lu || ls || lun;

  /* ── filters ── */
  const [search,      setSearch]      = useState("");
  const [filterUnit,  setFilterUnit]  = useState<string>("");

  /* ── modals ── */
  const [showAdd,  setShowAdd]  = useState(false);
  const [editItem, setEditItem] = useState<ShareholderUnitDto | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [saving,   setSaving]   = useState(false);
  const [formErr,  setFormErr]  = useState("");

  /* ── form ── */
  const [form, setForm] = useState({ shareholderId:"", unitId:"", sharesCount:"" });
  const [editShares, setEditShares] = useState(0);

  /* ── filtered shareholders for selected unit ── */
  const unitShareholders = useMemo(() => {
    if (!filterUnit) return shareholderUnits;
    return shareholderUnits.filter(su => String(su.unitId) === filterUnit);
  }, [shareholderUnits, filterUnit]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return unitShareholders.filter(su =>
      !q ||
      (su.shareholderName ?? "").toLowerCase().includes(q) ||
      (su.unitName ?? "").toLowerCase().includes(q)
    );
  }, [unitShareholders, search]);

  /* ── stats ── */
  const totalShares = filtered.reduce((s, su) => s + su.sharesCount, 0);
  const uniqueUnits = new Set(filtered.map(su => su.unitId)).size;
  const uniqueSh    = new Set(filtered.map(su => su.shareholderId)).size;

  /* ── actions ── */
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setFormErr("");
    try {
      await api.shareholderUnits.create({
        shareholderId: parseInt(form.shareholderId),
        unitId:        parseInt(form.unitId),
        sharesCount:   parseInt(form.sharesCount),
      });
      await reload();
      setShowAdd(false);
      setForm({ shareholderId:"", unitId:"", sharesCount:"" });
    } catch (err) { setFormErr((err as Error).message); }
    finally { setSaving(false); }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editItem) return;
    setSaving(true); setFormErr("");
    try {
      await api.shareholderUnits.update(editItem.id, { sharesCount: editShares });
      await reload();
      setEditItem(null);
    } catch (err) { setFormErr((err as Error).message); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try { await api.shareholderUnits.delete(deleteId); await reload(); setDeleteId(null); }
    catch (err) { alert((err as Error).message); }
  }

  return (
    <DashboardShell title="مساهمين المشاريع">
      <PageHeader
        title="مساهمين المشاريع"
        subtitle="إدارة المساهمين المرتبطين بكل مشروع وعدد أسهمهم"
        actions={
          <div className="flex gap-2">
            <button onClick={reload}
              className="w-9 h-9 rounded-xl border flex items-center justify-center"
              style={cStyle()} title="تحديث">
              <RefreshCw className="w-4 h-4" style={{ color:"var(--muted)" }} />
            </button>
            <button onClick={() => { setShowAdd(true); setFormErr(""); setForm({ shareholderId:"", unitId:"", sharesCount:"" }); }}
              className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl text-white"
              style={{ background:"linear-gradient(135deg,#6366f1,#7c3aed)", boxShadow:"0 3px 12px rgba(99,102,241,.3)" }}>
              <Plus className="w-4 h-4" /> إضافة مساهم لمشروع
            </button>
          </div>
        }
      />

      {/* ── Stats ── */}
      {loading ? (
        <div className="grid grid-cols-3 gap-4 mb-5">
          {[...Array(3)].map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          {[
            { label:"إجمالي السجلات",   value:filtered.length, icon:Hash,     clr:"#6366f1", bg:"rgba(99,102,241,.1)"  },
            { label:"مساهمون مشتركون",  value:uniqueSh,        icon:Users,    clr:"#7c3aed", bg:"rgba(124,58,237,.1)"  },
            { label:"إجمالي الأسهم",    value:totalShares,     icon:Building2,clr:"#0ea5e9", bg:"rgba(14,165,233,.1)"  },
          ].map(({ label, value, icon:Icon, clr, bg }) => (
            <div key={label} className="rounded-2xl p-4 flex items-center gap-3 hover:-translate-y-0.5 transition-all"
              style={cStyle()}>
              <div className="p-2.5 rounded-xl" style={{ background:bg }}>
                <Icon className="w-4 h-4" style={{ color:clr }} />
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color:"var(--muted)" }}>{label}</p>
                <p className="text-xl font-bold" style={{ color:clr }}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Unit dropdown filter ── */}
      <div className="mb-4 p-4 rounded-2xl border" style={cStyle()}>
        <label className="block text-xs font-semibold mb-2" style={{ color:"var(--muted)" }}>
          <Building2 className="w-3.5 h-3.5 inline ml-1" />
          اختر مشروع لعرض مساهميه
        </label>
        <div className="relative">
          <select
            value={filterUnit}
            onChange={e => setFilterUnit(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm border appearance-none focus:outline-none transition-all font-medium"
            style={iStyle()}
          >
            <option value="">كل المشاريع ({shareholderUnits.length} سجل)</option>
            {units.map(u => {
              const count = shareholderUnits.filter(su => su.unitId === u.id).length;
              const shares = shareholderUnits.filter(su => su.unitId === u.id).reduce((s,su)=>s+su.sharesCount,0);
              return (
                <option key={u.id} value={u.id}>
                  {u.name ?? u.code} — {count} مساهم · {shares} سهم
                </option>
              );
            })}
          </select>
          <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color:"var(--muted)" }} />
        </div>

        {/* Unit shareholders summary cards */}
        {filterUnit && (
          <div className="mt-3 pt-3 border-t" style={{ borderColor:"var(--card-border)" }}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {units.filter(u => String(u.id) === filterUnit).map(u => (
                <div key="info" className="col-span-2 sm:col-span-4 flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center text-white text-xs font-bold"
                    style={{ background:"linear-gradient(135deg,#6366f1,#7c3aed)" }}>
                    {u.code?.[0] ?? "P"}
                  </div>
                  <span className="text-sm font-bold" style={{ color:"var(--foreground)" }}>{u.name ?? u.code}</span>
                  <span className="text-xs" style={{ color:"var(--muted)" }}>{u.address}</span>
                </div>
              ))}
              {unitShareholders.map(su => (
                <div key={su.id} className="rounded-xl px-3 py-2.5 flex items-center gap-2"
                  style={{ background:"rgba(99,102,241,.07)", border:"1px solid rgba(99,102,241,.15)" }}>
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                    style={{ background:"linear-gradient(135deg,#6366f1,#7c3aed)" }}>
                    {(su.shareholderName ?? "?")[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color:"var(--foreground)" }}>
                      {su.shareholderName ?? `#${su.shareholderId}`}
                    </p>
                    <p className="text-[10px]" style={{ color:"#818cf8" }}>{su.sharesCount} سهم</p>
                  </div>
                </div>
              ))}
              {unitShareholders.length === 0 && (
                <p className="col-span-4 text-xs text-center py-2" style={{ color:"var(--muted)" }}>
                  لا يوجد مساهمون في هذا المشروع
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Search ── */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color:"var(--muted)" }} />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="بحث بالاسم أو المشروع..."
          className="w-full pr-9 pl-8 py-2 rounded-xl text-sm border focus:outline-none"
          style={iStyle()}
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:"var(--muted)" }}>
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl mb-4 text-sm"
          style={{ background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.25)", color:"#ef4444" }}>
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* ── Table ── */}
      {loading ? (
        <ListSkeleton rows={6} cols={5} />
      ) : (
        <div className="rounded-2xl border overflow-hidden shadow-sm" style={cStyle()}>
          <div className="flex items-center justify-between px-5 py-3 border-b"
            style={{ borderColor:"var(--card-border)", background:"rgba(128,128,128,.04)" }}>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" style={{ color:"#6366f1" }} />
              <span className="text-sm font-semibold" style={{ color:"var(--foreground)" }}>
                {filterUnit
                  ? `مساهمو ${units.find(u=>String(u.id)===filterUnit)?.name ?? "المشروع"}`
                  : "جميع السجلات"}
              </span>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full"
              style={{ background:"rgba(128,128,128,.1)", color:"var(--muted)" }}>
              {filtered.length} سجل
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr style={{ borderBottom:"1px solid var(--card-border)" }}>
                  {["م","المساهم","المشروع","عدد الأسهم","إجراءات"].map(h => (
                    <th key={h} className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                      style={{ color:"var(--muted)", background:"rgba(128,128,128,.04)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="w-10 h-10 opacity-20" style={{ color:"var(--muted)" }} />
                        <p className="text-sm" style={{ color:"var(--muted)" }}>لا توجد سجلات</p>
                      </div>
                    </td>
                  </tr>
                ) : filtered.map((su, i) => (
                  <tr key={su.id}
                    style={{ borderBottom:"1px solid var(--card-border)" }}
                    onMouseEnter={e => e.currentTarget.style.background="rgba(128,128,128,.04)"}
                    onMouseLeave={e => e.currentTarget.style.background="transparent"}
                  >
                    <td className="px-4 py-3.5 text-xs" style={{ color:"var(--muted)" }}>{i+1}</td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                          style={{ background:"linear-gradient(135deg,#6366f1,#7c3aed)" }}>
                          {(su.shareholderName ?? "?")[0]}
                        </div>
                        <span className="text-sm font-medium" style={{ color:"var(--foreground)" }}>
                          {su.shareholderName ?? `#${su.shareholderId}`}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="text-xs px-2.5 py-1 rounded-full"
                        style={{ background:"rgba(14,165,233,.1)", color:"#38bdf8" }}>
                        {su.unitName ?? `مشروع #${su.unitId}`}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold" style={{ color:"#6366f1" }}>{su.sharesCount}</span>
                        <span className="text-xs" style={{ color:"var(--muted)" }}>سهم</span>
                      </div>
                    </td>

                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setEditItem(su); setEditShares(su.sharesCount); setFormErr(""); }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                          style={{ color:"#6366f1" }}
                          onMouseEnter={e => e.currentTarget.style.background="rgba(99,102,241,.12)"}
                          onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteId(su.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                          style={{ color:"#ef4444" }}
                          onMouseEnter={e => e.currentTarget.style.background="rgba(239,68,68,.12)"}
                          onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer: total shares for selected unit */}
          {filtered.length > 0 && (
            <div className="px-5 py-3 flex items-center justify-between text-xs border-t"
              style={{ borderColor:"var(--card-border)", background:"rgba(128,128,128,.04)", color:"var(--muted)" }}>
              <span>إجمالي الأسهم في النتائج</span>
              <span className="font-bold" style={{ color:"#6366f1" }}>
                {filtered.reduce((s,su)=>s+su.sharesCount,0).toLocaleString("ar-EG")} سهم
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Add Modal ── */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="إضافة مساهم لمشروع">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color:"var(--muted)" }}>
              المساهم <span className="text-red-400">*</span>
            </label>
            <select required value={form.shareholderId}
              onChange={e => setForm(p => ({ ...p, shareholderId:e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none" style={iStyle()}>
              <option value="">اختر مساهم...</option>
              {shareholders.filter(s => s.isActive).map(s => (
                <option key={s.id} value={s.id}>{s.fullName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color:"var(--muted)" }}>
              المشروع <span className="text-red-400">*</span>
            </label>
            <select required value={form.unitId}
              onChange={e => setForm(p => ({ ...p, unitId:e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none" style={iStyle()}>
              <option value="">اختر مشروع...</option>
              {units.map(u => (
                <option key={u.id} value={u.id}>{u.name ?? u.code}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color:"var(--muted)" }}>
              عدد الأسهم <span className="text-red-400">*</span>
            </label>
            <input type="number" min={1} required value={form.sharesCount}
              onChange={e => setForm(p => ({ ...p, sharesCount:e.target.value }))}
              placeholder="مثال: 10"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none" style={iStyle()} />
          </div>

          {formErr && (
            <p className="text-xs p-2.5 rounded-lg" style={{ background:"rgba(239,68,68,.1)", color:"#ef4444" }}>
              {formErr}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
              style={{ background:"linear-gradient(135deg,#6366f1,#7c3aed)" }}>
              {saving ? "جاري الحفظ..." : "إضافة"}
            </button>
            <button type="button" onClick={() => setShowAdd(false)}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium border" style={cStyle()}>
              إلغاء
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Modal ── */}
      <Modal open={!!editItem} onClose={() => setEditItem(null)} title="تعديل عدد الأسهم" size="sm">
        {editItem && (
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="rounded-xl p-3 space-y-1" style={{ background:"rgba(99,102,241,.08)", border:"1px solid rgba(99,102,241,.15)" }}>
              <p className="text-xs" style={{ color:"var(--muted)" }}>المساهم</p>
              <p className="text-sm font-bold" style={{ color:"var(--foreground)" }}>
                {editItem.shareholderName ?? `#${editItem.shareholderId}`}
              </p>
              <p className="text-xs mt-1" style={{ color:"var(--muted)" }}>المشروع</p>
              <p className="text-sm font-bold" style={{ color:"var(--foreground)" }}>
                {editItem.unitName ?? `#${editItem.unitId}`}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color:"var(--muted)" }}>
                عدد الأسهم الجديد
              </label>
              <input type="number" min={1} value={editShares}
                onChange={e => setEditShares(parseInt(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none font-bold text-center"
                style={{ ...iStyle(), color:"#6366f1", fontSize:18 }}
              />
            </div>

            {formErr && (
              <p className="text-xs p-2.5 rounded-lg" style={{ background:"rgba(239,68,68,.1)", color:"#ef4444" }}>
                {formErr}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                style={{ background:"linear-gradient(135deg,#6366f1,#7c3aed)" }}>
                {saving ? "جاري الحفظ..." : "حفظ"}
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
        <p className="text-sm mb-5" style={{ color:"var(--muted)" }}>
          هل أنت متأكد من حذف هذا السجل؟
        </p>
        <div className="flex gap-2">
          <button onClick={handleDelete}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background:"#ef4444" }}>
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
