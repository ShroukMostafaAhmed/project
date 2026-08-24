"use client";

import { useState, useMemo } from "react";
import {
  Plus, Search, X, Percent, Home, Users,
  Building2, RefreshCw, Trash2, Pencil, AlertCircle, KeyRound,
} from "lucide-react";
import DashboardShell from "@/app/components/layout/DashboardShell";
import PageHeader from "@/app/components/ui/PageHeader";
import Modal from "@/app/components/ui/Modal";
import { ListSkeleton, StatCardSkeleton } from "@/app/components/ui/Skeleton";
import {
  useOwnerships, useShareholders, useApartments, useUnits,
} from "@/app/lib/hooks";
import {
  ApartmentOwnershipDto,
  CreateApartmentOwnershipDto,
  UpdateApartmentOwnershipDto,
  ownershipBadge,
} from "@/app/lib/types";
import { api } from "@/app/lib/api";

/* ── helpers ── */
function inputStyle(): React.CSSProperties {
  return { background:"var(--input-bg)", borderColor:"var(--input-border)", color:"var(--foreground)" };
}
function cardStyle(): React.CSSProperties {
  return { background:"var(--card)", border:"1px solid var(--card-border)" };
}

export default function AdminOwnershipsPage() {
  const { ownerships, loading: lo, error: eo, reload } = useOwnerships();
  const { shareholders, loading: ls } = useShareholders();
  const { apartments,   loading: la } = useApartments();
  const { units,        loading: lu } = useUnits();

  const loading = lo || ls || la || lu;

  /* ── filters ── */
  const [search,     setSearch]     = useState("");
  const [filterUnit, setFilterUnit] = useState("");

  /* ── shareholders by unit (from API) ── */
  const [unitShareholders, setUnitShareholders] = useState<import("@/app/lib/types").ShareholderUnitDto[]>([]);
  const [loadingUnit,      setLoadingUnit]      = useState(false);

  /* ── apartments for selected unit (fetched from API) ── */
  const [unitApts, setUnitApts] = useState<import("@/app/lib/types").AvailableApartmentDto[]>([]);
  const [loadingUnitApts, setLoadingUnitApts] = useState(false);

  async function handleUnitChange(unitId: string) {
    setFilterUnit(unitId);
    setSearch("");
    setUnitShareholders([]);
    setUnitApts([]);
    if (!unitId) return;

    // Fetch both in parallel
    setLoadingUnit(true);
    setLoadingUnitApts(true);
    try {
      const [shData, aptData] = await Promise.all([
        api.shareholderUnits.byUnit(parseInt(unitId)),
        api.apartments.availableByUnit(parseInt(unitId)),
      ]);
      setUnitShareholders(shData);
      setUnitApts(aptData);
    } catch {
      setUnitShareholders([]);
      setUnitApts([]);
    } finally {
      setLoadingUnit(false);
      setLoadingUnitApts(false);
    }
  }

  // Filter ownerships by the apartments of the selected unit
  const unitAptIds = useMemo(
    () => filterUnit ? new Set(unitApts.map(a => a.apartmentId)) : null,
    [filterUnit, unitApts]
  );

  /* ── modals ── */
  const [showAdd,  setShowAdd]  = useState(false);
  const [editItem, setEditItem] = useState<ApartmentOwnershipDto | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [saving,   setSaving]   = useState(false);
  const [formErr,  setFormErr]  = useState("");

  /* ── add form ── */
  const [form, setForm] = useState<CreateApartmentOwnershipDto>({
    apartmentId: undefined, shareholderId: undefined, ownershipPercentage: 0,
  });
  const [editPct, setEditPct] = useState<number>(0);

  /* ── modal: available apts for selected shareholder+unit ── */
  const [modalUnitId,    setModalUnitId]    = useState<string>("");
  const [modalAvailApts, setModalAvailApts] = useState<import("@/app/lib/types").AvailableApartmentDto[]>([]);
  const [loadingAvail,   setLoadingAvail]   = useState(false);

  /* ── modal: units (projects) belonging to selected shareholder ── */
  // /api/Units/by-shareholder/{id} returns ShareholderFullDto → { ..., units: ShareholderUnitEntry[] }
  const [shareholderUnits, setShareholderUnits] = useState<import("@/app/lib/types").ShareholderUnitEntry[]>([]);
  const [loadingShUnits,   setLoadingShUnits]   = useState(false);

  async function loadShareholderUnits(shareholderId: string) {
    if (!shareholderId) { setShareholderUnits([]); return; }
    setLoadingShUnits(true);
    try {
      const data = await api.units.byShareholder(parseInt(shareholderId));
      setShareholderUnits(Array.isArray(data?.units) ? data.units : []);
    } catch {
      setShareholderUnits([]);
    } finally {
      setLoadingShUnits(false);
    }
  }

  async function loadAvailableApts(shareholderId: string, unitId: string) {
    if (!shareholderId) { setModalAvailApts([]); return; }
    setLoadingAvail(true);
    try {
      const data = await api.apartments.availableForShareholder(
        parseInt(shareholderId),
        unitId ? parseInt(unitId) : undefined,
      );
      setModalAvailApts(Array.isArray(data) ? data : []);
    } catch { setModalAvailApts([]); }
    finally { setLoadingAvail(false); }
  }

  /* ── derived ── */
  // Map: apartmentId → total ownership %
  const aptTotalPct = useMemo(() => {
    const map: Record<number, number> = {};
    ownerships.forEach(o => {
      map[o.apartmentId] = (map[o.apartmentId] ?? 0) + o.ownershipPercentage;
    });
    return map;
  }, [ownerships]);

  /* ── filter ownerships by unit's apartments ── */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return ownerships.filter((o) => {
      const apt  = apartments.find(a => a.id === o.apartmentId);
      const unit = units.find(u => u.id === apt?.unitId);
      const mQ   = !q ||
        (o.shareholderName ?? "").toLowerCase().includes(q) ||
        (o.apartmentNumber ?? "").toLowerCase().includes(q) ||
        (unit?.name ?? "").toLowerCase().includes(q);
      // If unit selected: only show ownerships for apartments in that unit
      const mUnit = !unitAptIds || unitAptIds.has(o.apartmentId);
      return mQ && mUnit;
    });
  }, [ownerships, apartments, units, search, unitAptIds]);

  /* ── summary stats ── */
  // "إجمالي الملكيات" counts each FULLY-owned apartment (total = 100%) as ONE,
  // regardless of how many shareholders split that 100% between them.
  // e.g. apartment split 50% / 50% between two shareholders → counts as 1, not 2.
  const totalOwnerships = useMemo(
    () => Object.values(aptTotalPct).filter(pct => pct >= 100).length,
    [aptTotalPct]
  );
  const uniqueShareholders = new Set(ownerships.map(o => o.shareholderId)).size;
  const uniqueApartments   = new Set(ownerships.map(o => o.apartmentId)).size;
  const avgPct = useMemo(() => {
  const totals = Object.values(aptTotalPct);
  if (!totals.length) return "0";
  const sum = totals.reduce((s, pct) => s + Math.min(pct, 100), 0);
  return (sum / totals.length).toFixed(1);
}, [aptTotalPct]);

  /* ── actions ── */
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setFormErr("");
    try {
      await api.ownerships.create(form);
      await reload();
      setShowAdd(false);
      setForm({ apartmentId: undefined, shareholderId: undefined, ownershipPercentage: 0 });
    } catch (err) { setFormErr((err as Error).message); }
    finally { setSaving(false); }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editItem) return;
    setSaving(true); setFormErr("");
    try {
      await api.ownerships.update(editItem.id, { ownershipPercentage: editPct });
      await reload();
      setEditItem(null);
    } catch (err) { setFormErr((err as Error).message); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await api.ownerships.delete(deleteId);
      await reload();
      setDeleteId(null);
    } catch (err) { alert((err as Error).message); }
  }

  /* ── get unit name for an ownership ── */
  function getUnitName(o: ApartmentOwnershipDto) {
    const apt = apartments.find(a => a.id === o.apartmentId);
    const unit = units.find(u => u.id === apt?.unitId);
    return unit?.name ?? unit?.code ?? "—";
  }

  return (
    <DashboardShell title="ملكية المساهمين">
      <PageHeader
        title="إدارة الملكيات"
        subtitle="ربط المساهمين بالشقق وتحديد نسب الملكية"
        actions={
          <div className="flex gap-2">
            <button onClick={reload}
              className="w-9 h-9 rounded-xl border flex items-center justify-center transition-colors"
              style={cardStyle()}
              title="تحديث">
              <RefreshCw className="w-4 h-4" style={{ color:"var(--muted)" }} />
            </button>
            <button onClick={() => {
                setShowAdd(true); setFormErr(""); setModalUnitId("");
                setModalAvailApts([]); setShareholderUnits([]);
                setForm({ apartmentId:undefined, shareholderId:undefined, ownershipPercentage:0 });
              }}
              className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl text-white"
              style={{ background:"linear-gradient(135deg,#6366f1,#7c3aed)", boxShadow:"0 3px 12px rgba(99,102,241,.3)" }}>
              <Plus className="w-4 h-4" /> إضافة ملكية
            </button>
          </div>
        }
      />

      {/* ── Summary cards ── */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
          {[...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
          {[
            { label:"إجمالي الملكيات",  value:totalOwnerships,  icon:Percent,   clr:"#6366f1", bg:"rgba(99,102,241,.1)",   border:"rgba(99,102,241,.2)"  },
            { label:"مساهمين مشتركين",  value:uniqueShareholders,icon:Users,    clr:"#7c3aed", bg:"rgba(124,58,237,.1)",   border:"rgba(124,58,237,.2)"  },
            { label:"شقق بها ملكية",        value:uniqueApartments,  icon:Home,     clr:"#0ea5e9", bg:"rgba(14,165,233,.1)",   border:"rgba(14,165,233,.2)"  },
            { label:"متوسط نسبة الملكية",value:`${avgPct}%`,     icon:Building2,clr:"#10b981", bg:"rgba(16,185,129,.1)",   border:"rgba(16,185,129,.2)"  },
          ].map(({ label, value, icon:Icon, clr, bg, border }) => (
            <div key={label} className="rounded-2xl p-4 flex items-center gap-3 hover:-translate-y-0.5 transition-all"
              style={{ background:"var(--card)", border:"1px solid var(--card-border)" }}>
              <div className="p-2.5 rounded-xl shrink-0" style={{ background:bg, border:`1px solid ${border}` }}>
                <Icon className="w-4 h-4" style={{ color:clr }} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium truncate" style={{ color:"var(--muted)" }}>{label}</p>
                <p className="text-xl font-bold" style={{ color:clr }}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-2 mb-4">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color:"var(--muted)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالمساهم أو الشقة..."
            className="w-full pr-9 pl-4 py-2 rounded-xl text-sm border focus:outline-none transition-all"
            style={inputStyle()}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:"var(--muted)" }}>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Unit dropdown — calls API ShareholderUnits/by-unit on change */}
        <div className="relative min-w-52">
          <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color:"var(--muted)" }} />
          <select
            value={filterUnit}
            onChange={e => handleUnitChange(e.target.value)}
            className="w-full pr-9 pl-4 py-2 rounded-xl text-sm border focus:outline-none appearance-none"
            style={inputStyle()}
          >
            <option value="">كل المشاريع</option>
            {units.map(u => (
              <option key={u.id} value={u.id}>
                {u.name ?? u.code}
              </option>
            ))}
          </select>
          {loadingUnit && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
          )}
        </div>

        {(search || filterUnit) && (
          <button
            onClick={() => { setSearch(""); handleUnitChange(""); }}
            className="px-3 py-2 rounded-xl text-xs font-medium border transition-colors"
            style={{ color:"#ef4444", borderColor:"rgba(239,68,68,.3)", background:"rgba(239,68,68,.06)" }}>
            مسح
          </button>
        )}
      </div>

      {/* Unit summary — shown when unit selected */}
      {filterUnit && (() => {
        const selectedUnit = units.find(u => String(u.id) === filterUnit);
        const totalPct = filtered.reduce((s, o) => s + o.ownershipPercentage, 0);
        return (
          <div className="mb-4 p-4 rounded-2xl border flex flex-wrap items-center gap-4"
            style={{ background:"rgba(99,102,241,.06)", borderColor:"rgba(99,102,241,.2)" }}>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold"
                style={{ background:"linear-gradient(135deg,#6366f1,#7c3aed)" }}>
                {selectedUnit?.code?.[0] ?? selectedUnit?.name?.[0] ?? "P"}
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color:"var(--foreground)" }}>
                  {selectedUnit?.name ?? selectedUnit?.code}
                </p>
                <p className="text-xs" style={{ color:"var(--muted)" }}>{selectedUnit?.address}</p>
              </div>
            </div>
            <div className="flex gap-4 flex-wrap">
              {[
                { label:"مساهمون",        value: unitShareholders.length,              clr:"#7c3aed" },
                { label:"إجمالي الأسهم",  value: unitShareholders.reduce((s,su)=>s+su.sharesCount,0), clr:"#6366f1" },
                { label:"ملكيات مسجلة",   value: filtered.length,                     clr:"#0ea5e9" },
                { label:"إجمالي النسب",   value:`${totalPct.toFixed(1)}%`, clr: totalPct >= 100 ? "#10b981" : "#f59e0b" },
              ].map(({ label, value, clr }) => (
                <div key={label} className="text-center">
                  <p className="text-lg font-bold" style={{ color:clr }}>{value}</p>
                  <p className="text-[10px]" style={{ color:"var(--muted)" }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── Error ── */}
      {eo && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl mb-4 text-sm"
          style={{ background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.25)", color:"#ef4444" }}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          {eo}
        </div>
      )}

      {/* ── Table ── */}
      {loading ? (
        <ListSkeleton rows={8} cols={6} />
      ) : (
        <div className="rounded-2xl border overflow-hidden shadow-sm" style={cardStyle()}>
          {/* Toolbar */}
          <div className="flex items-center justify-between px-5 py-3 border-b"
            style={{ borderColor:"var(--card-border)", background:"rgba(128,128,128,.04)" }}>
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4" style={{ color:"#6366f1" }} />
              <span className="text-sm font-semibold" style={{ color:"var(--foreground)" }}>سجلات الملكية</span>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full"
              style={{ background:"rgba(128,128,128,.1)", color:"var(--muted)" }}>
              {filtered.length} / {ownerships.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr style={{ borderBottom:"1px solid var(--card-border)" }}>
                  {["م","المساهم","الشقة","المشروع","حالة الملكية","نسبة الملكية","إجراءات"].map(h => (
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
                    <td colSpan={7} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Percent className="w-10 h-10 opacity-20" style={{ color:"var(--muted)" }} />
                        <p className="text-sm" style={{ color:"var(--muted)" }}>
                          {ownerships.length === 0 ? "لا توجد ملكيات مسجلة" : "لا توجد نتائج"}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : filtered.map((o, i) => {
                  const apt  = apartments.find(a => a.id === o.apartmentId);
                  const unit = units.find(u => u.id === apt?.unitId);
                  return (
                    <tr key={o.id} className="transition-colors"
                      style={{ borderBottom:"1px solid var(--card-border)" }}
                      onMouseEnter={e => e.currentTarget.style.background="rgba(128,128,128,.04)"}
                      onMouseLeave={e => e.currentTarget.style.background="transparent"}
                    >
                      {/* # */}
                      <td className="px-4 py-3.5 text-xs" style={{ color:"var(--muted)" }}>{i+1}</td>

                      {/* Shareholder */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                            style={{ background:"linear-gradient(135deg,#6366f1,#7c3aed)" }}>
                            {(o.shareholderName ?? "?")[0]}
                          </div>
                          <span className="text-sm font-medium" style={{ color:"var(--foreground)" }}>
                            {o.shareholderName ?? `#${o.shareholderId}`}
                          </span>
                        </div>
                      </td>

                      {/* Apartment */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <Home className="w-3.5 h-3.5" style={{ color:"var(--muted)" }} />
                          <span className="text-sm" style={{ color:"var(--foreground)" }}>
                            شقة {o.apartmentNumber ?? o.apartmentId}
                          </span>
                          {apt?.floor && (
                            <span className="text-xs" style={{ color:"var(--muted)" }}>— الطابق {apt.floor}</span>
                          )}
                        </div>
                      </td>

                      {/* Unit */}
                      <td className="px-4 py-3.5">
                        <span className="text-xs px-2.5 py-1 rounded-full"
                          style={{ background:"rgba(99,102,241,.1)", color:"#818cf8" }}>
                          {unit?.name ?? unit?.code ?? `#${apt?.unitId}`}
                        </span>
                      </td>

                      {/* Completion status */}
                      <td className="px-4 py-3.5">
                        {(() => {
                          const totalPct = aptTotalPct[o.apartmentId] ?? 0;
                          const b = ownershipBadge(totalPct);
                          return (
                            <div className={`inline-flex flex-col items-start gap-0.5 px-2.5 py-1.5 rounded-xl border ${b.bg}`}>
                              <div className="flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${b.dot}`} />
                                <span className={`text-xs font-bold ${b.color}`}>{b.label}</span>
                              </div>
                              <span className={`text-[10px] ${b.color} opacity-70`}>{b.sub}</span>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Ownership % */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-24 h-2 rounded-full overflow-hidden" style={{ background:"rgba(128,128,128,.15)" }}>
                            <div className="h-full rounded-full transition-all"
                              style={{
                                width:`${Math.min(o.ownershipPercentage,100)}%`,
                                background:`linear-gradient(90deg,#6366f1,#7c3aed)`,
                              }} />
                          </div>
                          <span className="text-sm font-bold" style={{ color:"#6366f1" }}>
                            {o.ownershipPercentage}%
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-1">
                          <button onClick={() => { setEditItem(o); setEditPct(o.ownershipPercentage); setFormErr(""); }}
                            title="تعديل النسبة"
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                            style={{ color:"#6366f1" }}
                            onMouseEnter={e => e.currentTarget.style.background="rgba(99,102,241,.12)"}
                            onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setDeleteId(o.id)}
                            title="حذف"
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                            style={{ color:"#ef4444" }}
                            onMouseEnter={e => e.currentTarget.style.background="rgba(239,68,68,.12)"}
                            onMouseLeave={e => e.currentTarget.style.background="transparent"}>
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

          {/* Footer */}
          <div className="px-5 py-3 flex items-center justify-between text-xs border-t"
            style={{ borderColor:"var(--card-border)", background:"rgba(128,128,128,.04)", color:"var(--muted)" }}>
            <span>إجمالي نسب الملكية المسجلة</span>
            <span className="font-semibold" style={{ color:"#6366f1" }}>
              {filtered.reduce((s,o) => s+o.ownershipPercentage, 0).toFixed(1)}%
            </span>
          </div>
        </div>
      )}

      {/* ── Add Modal ── */}
      <Modal open={showAdd} onClose={() => {
          setShowAdd(false); setModalUnitId("");
          setModalAvailApts([]); setShareholderUnits([]);
        }} title="إضافة ملكية جديدة">
        <form onSubmit={handleAdd} className="space-y-4">

          {/* 1. المساهم */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color:"var(--muted)" }}>
              المساهم <span className="text-red-400">*</span>
            </label>
            <select required value={form.shareholderId ?? ""}
              onChange={e => {
                const shId = e.target.value;
                setForm(p => ({ ...p, shareholderId: shId ? parseInt(shId) : undefined, apartmentId: undefined }));
                setModalAvailApts([]);
                setModalUnitId("");           // نصفّر المشروع المختار لأنه ممكن ميبقاش تابع للمساهم الجديد
                setShareholderUnits([]);
                if (shId) {
                  loadAvailableApts(shId, "");
                  loadShareholderUnits(shId);
                }
              }}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none"
              style={inputStyle()}>
              <option value="">اختر مساهم...</option>
              {shareholders.filter(s => s.isActive).map(s => (
                <option key={s.id} value={s.id}>{s.fullName}</option>
              ))}
            </select>
          </div>

          {/* 2. المشروع (اختياري — لتضييق البحث) — يعرض مشاريع المساهم فقط */}
          {form.shareholderId && (
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color:"var(--muted)" }}>
                المشروع (اختياري — لتصفية الشقق)
              </label>
              <div className="relative">
                <select value={modalUnitId}
                  disabled={loadingShUnits}
                  onChange={e => {
                    const uid = e.target.value;
                    setModalUnitId(uid);
                    setForm(p => ({ ...p, apartmentId: undefined }));
                    if (form.shareholderId) loadAvailableApts(String(form.shareholderId), uid);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none"
                  style={loadingShUnits ? { ...inputStyle(), opacity:.6, cursor:"not-allowed" } : inputStyle()}>
                  <option value="">كل المشاريع</option>
                  {shareholderUnits.map(u => (
                    <option key={u.unitId} value={u.unitId}>
                      {u.unitName ?? u.unitCode}
                      {u.apartments.length === 0 ? " (لا توجد شقق)" : ""}
                    </option>
                  ))}
                  {!loadingShUnits && shareholderUnits.length === 0 && (
                    <option disabled value="">لا توجد مشاريع لهذا المساهم</option>
                  )}
                </select>
                {loadingShUnits && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                )}
              </div>
            </div>
          )}

          {/* 3. الشقة */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color:"var(--muted)" }}>
              الشقة <span className="text-red-400">*</span>
            </label>
            <select required value={form.apartmentId ?? ""}
              disabled={!form.shareholderId || loadingAvail}
              onChange={e => {
                const aptId = e.target.value ? parseInt(e.target.value) : undefined;
                const apt = modalAvailApts.find(a => a.apartmentId === aptId);
                setForm(p => ({
                  ...p,
                  apartmentId: aptId,
                  ownershipPercentage: apt ? Math.min(p.ownershipPercentage ?? 0, apt.remainingOwnershipPercentage) : p.ownershipPercentage,
                }));
              }}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none"
              style={!form.shareholderId || loadingAvail ? { ...inputStyle(), opacity: .6, cursor: "not-allowed" } : inputStyle()}>
              <option value="">
                {!form.shareholderId ? "اختر مساهم أولاً..." : loadingAvail ? "جاري التحميل..." : "اختر شقة..."}
              </option>
              {modalAvailApts.map(a => (
                <option key={a.apartmentId} value={a.apartmentId}>
                  شقة {a.apartmentNumber ?? a.apartmentId} — {a.unitName ?? ""} (طابق {a.floor ?? "—"})
                  {` | متاح: ${a.remainingOwnershipPercentage.toFixed(1)}%`}
                  {a.totalOwnershipPercentage > 0 ? ` (مسجّل: ${a.totalOwnershipPercentage.toFixed(1)}%)` : ""}
                </option>
              ))}
              {/* fallback لو ما في شقق متاحة */}
              {form.shareholderId && !loadingAvail && modalAvailApts.length === 0 && (
                <option disabled value="">لا توجد شقق متاحة</option>
              )}
            </select>
            {/* النسبة المتاحة للشقة المختارة */}
            {form.apartmentId && (() => {
              const apt = modalAvailApts.find(a => a.apartmentId === form.apartmentId);
              if (!apt) return null;
              return (
                <p className="text-xs mt-1.5 px-1" style={{ color: apt.remainingOwnershipPercentage > 0 ? "#10b981" : "#ef4444" }}>
                  متاح: <strong>{apt.remainingOwnershipPercentage.toFixed(2)}%</strong>
                  {apt.totalOwnershipPercentage > 0 && ` · مسجّل مسبقاً: ${apt.totalOwnershipPercentage.toFixed(2)}%`}
                  {apt.currentShareholderOwnershipPercentage > 0 && ` · حصته الحالية: ${apt.currentShareholderOwnershipPercentage.toFixed(2)}%`}
                </p>
              );
            })()}
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color:"var(--muted)" }}>
              نسبة الملكية (%) <span className="text-red-400">*</span>
            </label>
            <div className="flex items-center gap-3">
              <input type="range" min={0.01}
                max={modalAvailApts.length > 0 && form.apartmentId
                  ? (modalAvailApts.find(a => a.apartmentId === form.apartmentId)?.remainingOwnershipPercentage ?? 100)
                  : 100}
                step={0.01}
                value={form.ownershipPercentage ?? 0}
                onChange={e => setForm(p => ({ ...p, ownershipPercentage: parseFloat(e.target.value) }))}
                className="flex-1 accent-indigo-600"
              />
              <div className="w-20 text-center">
                <input type="number" min={0.01}
                  max={modalAvailApts.length > 0 && form.apartmentId
                    ? (modalAvailApts.find(a => a.apartmentId === form.apartmentId)?.remainingOwnershipPercentage ?? 100)
                    : 100}
                  step={0.01}
                  value={form.ownershipPercentage ?? 0}
                  onChange={e => setForm(p => ({ ...p, ownershipPercentage: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-2 py-1.5 rounded-lg text-sm border text-center font-bold focus:outline-none"
                  style={{ ...inputStyle(), color:"#6366f1" }}
                />
              </div>
              <span className="text-sm font-bold" style={{ color:"#6366f1" }}>%</span>
            </div>
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
              className="flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors"
              style={cardStyle()}>
              إلغاء
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Modal ── */}
      <Modal open={!!editItem} onClose={() => setEditItem(null)} title="تعديل نسبة الملكية" size="sm">
        {editItem && (
          <form onSubmit={handleEdit} className="space-y-4">
            {/* Info */}
            <div className="rounded-xl p-3 space-y-1.5" style={{ background:"rgba(99,102,241,.08)", border:"1px solid rgba(99,102,241,.15)" }}>
              <p className="text-xs" style={{ color:"var(--muted)" }}>المساهم</p>
              <p className="text-sm font-semibold" style={{ color:"var(--foreground)" }}>
                {editItem.shareholderName ?? `#${editItem.shareholderId}`}
              </p>
              <p className="text-xs mt-1" style={{ color:"var(--muted)" }}>الشقة</p>
              <p className="text-sm font-semibold" style={{ color:"var(--foreground)" }}>
                شقة {editItem.apartmentNumber ?? editItem.apartmentId} — {getUnitName(editItem)}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color:"var(--muted)" }}>
                نسبة الملكية الجديدة (%)
              </label>
              <div className="flex items-center gap-3">
                <input type="range" min={0.01} max={100} step={0.01}
                  value={editPct}
                  onChange={e => setEditPct(parseFloat(e.target.value))}
                  className="flex-1 accent-indigo-600"
                />
                <div className="w-20">
                  <input type="number" min={0.01} max={100} step={0.01}
                    value={editPct}
                    onChange={e => setEditPct(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 rounded-lg text-sm border text-center font-bold focus:outline-none"
                    style={{ ...inputStyle(), color:"#6366f1" }}
                  />
                </div>
                <span className="text-sm font-bold" style={{ color:"#6366f1" }}>%</span>
              </div>
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
                className="flex-1 py-2.5 rounded-xl text-sm font-medium border"
                style={cardStyle()}>
                إلغاء
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Delete Confirm ── */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="تأكيد الحذف" size="sm">
        <p className="text-sm mb-5" style={{ color:"var(--muted)" }}>
          هل أنت متأكد من حذف هذه الملكية؟ لا يمكن التراجع.
        </p>
        <div className="flex gap-2">
          <button onClick={handleDelete}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background:"#ef4444" }}>
            حذف
          </button>
          <button onClick={() => setDeleteId(null)}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium border"
            style={cardStyle()}>
            إلغاء
          </button>
        </div>
      </Modal>

    </DashboardShell>
  );
}