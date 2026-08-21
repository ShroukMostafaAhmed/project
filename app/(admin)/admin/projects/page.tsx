"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Plus, Building2, Home, Layers, MapPin,
  Eye, Edit2, Trash2, Search, RefreshCw,
} from "lucide-react";
import Link from "next/link";
import DashboardShell from "@/app/components/layout/DashboardShell";
import PageHeader from "@/app/components/ui/PageHeader";
import Modal from "@/app/components/ui/Modal";
import { CardSkeleton } from "@/app/components/ui/Skeleton";
import { useUnits, useApartments } from "@/app/lib/hooks";
import { UnitDto, CreateUnitDto, ApartmentStatus } from "@/app/lib/types";

// One colour per unit index (cycles)
const CARD_PALETTES = [
  { from: "#6366f1", to: "#7c3aed", shadow: "rgba(99,102,241,.3)"  },
  { from: "#0ea5e9", to: "#0284c7", shadow: "rgba(14,165,233,.3)"  },
  { from: "#10b981", to: "#059669", shadow: "rgba(16,185,129,.3)"  },
  { from: "#f59e0b", to: "#d97706", shadow: "rgba(245,158,11,.3)"  },
  { from: "#f43f5e", to: "#e11d48", shadow: "rgba(244,63,94,.3)"   },
  { from: "#8b5cf6", to: "#6d28d9", shadow: "rgba(139,92,246,.3)"  },
];

export default function AdminProjectsPage() {
  const { units, loading, error, reload, create, remove } = useUnits();
  const { apartments } = useApartments();

  const [search,     setSearch]     = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId,   setDeleteId]   = useState<number | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [formError,  setFormError]  = useState("");
  const [form, setForm] = useState<CreateUnitDto>({
    code: "", name: "", description: "",
    totalApartments: 0, numFloors: 0,
    numApartmentsFloor: null, address: "",
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return units.filter(
      (u) =>
        (u.name ?? "").toLowerCase().includes(q) ||
        (u.code ?? "").toLowerCase().includes(q) ||
        (u.address ?? "").toLowerCase().includes(q)
    );
  }, [units, search]);

  // ── Auto-generated next unit code (A1, A2, A3...) ──────────────────────────
  const nextCode = useMemo(() => {
    const nums = units
      .map((u) => u.code?.match(/^A(\d+)$/i))
      .filter(Boolean)
      .map((m) => parseInt(m![1], 10));
    const max = nums.length ? Math.max(...nums) : 0;
    return `A${max + 1}`;
  }, [units]);

  // Whenever the create modal opens, stamp the form with the freshly computed code
  useEffect(() => {
    if (showCreate) {
      setForm((p) => ({ ...p, code: nextCode }));
    }
  }, [showCreate, nextCode]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setFormError("");
    try {
      await create(form);
      setShowCreate(false);
      setForm({ code: "", name: "", description: "", totalApartments: 0, numFloors: 0, numApartmentsFloor: null, address: "" });
    } catch (err) { setFormError((err as Error).message); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try { await remove(deleteId); setDeleteId(null); }
    catch (err) { alert((err as Error).message); }
  }

  return (
    <DashboardShell title="المشاريع">
      <PageHeader
        title=" كارت وصف المشاريع"
        subtitle={`${units.length}مشروع `}
        actions={
          <div className="flex gap-2">
            <button onClick={reload}
              className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-500 transition-colors"
              title="تحديث">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 text-sm font-semibold text-white px-4 py-2 rounded-xl transition-colors"
              style={{ background: "linear-gradient(135deg,#6366f1,#7c3aed)", boxShadow: "0 3px 12px rgba(99,102,241,.35)" }}>
              <Plus className="w-4 h-4" /> إضافة مشروع
            </button>
          </div>
        }
      />

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث بالاسم أو الكود..."
          className="w-full pr-10 pl-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
        />
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
          <Building2 className="w-14 h-14 text-slate-200" />
          <p className="text-slate-500 font-medium">لا توجد مشاريع</p>
          <button onClick={() => setShowCreate(true)}
            className="mt-1 text-sm text-indigo-600 hover:underline">
            أضف أول مشروع →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((unit, idx) => {
            const palette  = CARD_PALETTES[idx % CARD_PALETTES.length];
            const aptCount = apartments.filter((a) => a.unitId === unit.id).length;
            const sold     = apartments.filter((a) => a.unitId === unit.id && a.status === ApartmentStatus.Sold).length;
            const available= apartments.filter((a) => a.unitId === unit.id && a.status === ApartmentStatus.Available).length;
            return (
              <UnitCard
                key={unit.id}
                unit={unit}
                palette={palette}
                aptCount={aptCount}
                sold={sold}
                available={available}
                onDelete={() => setDeleteId(unit.id)}
              />
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="إضافة مشروع جديد" size="lg">
        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-3">

          {/* ── Text fields: code is auto-generated & read-only ────────────── */}
          {[
            { name: "code",        label: "الكود (A1)",  full: false, required: true,  readOnly: true  },
            { name: "name",        label: "الاسم",        full: false, required: true,  readOnly: false },
            { name: "address",     label: "العنوان",      full: true,  required: false, readOnly: false },
            { name: "description", label: "الوصف",        full: true,  required: false, readOnly: false },
          ].map((f) => (
            <div key={f.name} className={f.full ? "sm:col-span-2" : ""}>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                {f.label}{f.required && <span className="text-red-500 mr-1">*</span>}
              </label>
              <input
                type="text"
                required={f.required}
                readOnly={f.readOnly}
                value={(form as Record<string, unknown>)[f.name] as string ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, [f.name]: e.target.value }))}
                className={`w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none transition-all ${
                  f.readOnly
                    ? "bg-slate-100 text-slate-500 cursor-not-allowed"
                    : "bg-slate-50 focus:border-indigo-400 focus:bg-white"
                }`}
              />
            </div>
          ))}

          {/* ── Total apartments & floors: drive the auto-calculated ratio ── */}
          {[
            { name: "totalApartments", label: "إجمالي الشقق", required: true },
            { name: "numFloors",       label: "عدد الطوابق",   required: true },
          ].map((f) => (
            <div key={f.name}>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                {f.label}<span className="text-red-500 mr-1">*</span>
              </label>
              <input
                type="number"
                required
                value={(form as Record<string, unknown>)[f.name] as number ?? ""}
                onChange={(e) => {
                  const val = e.target.value ? parseInt(e.target.value) : 0;
                  setForm((p) => {
                    const totalApartments = f.name === "totalApartments" ? val : (p.totalApartments ?? 0);
                    const numFloors       = f.name === "numFloors"       ? val : (p.numFloors ?? 0);
                    return {
                      ...p,
                      [f.name]: e.target.value ? val : null,
                      numApartmentsFloor: numFloors > 0
                        ? Math.round(totalApartments / numFloors)
                        : null,
                    };
                  });
                }}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 focus:bg-white transition-all"
              />
            </div>
          ))}

          {/* ── Apartments/floor: auto-calculated, read-only ────────────────── */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              شقق/طابق
            </label>
            <input
              type="number"
              readOnly
              value={form.numApartmentsFloor ?? ""}
              className="w-full px-3 py-2.5 bg-slate-100 text-slate-500 border border-slate-200 rounded-xl text-sm cursor-not-allowed"
            />
          </div>

          {formError && <p className="text-red-500 text-xs sm:col-span-2">{formError}</p>}
          <div className="sm:col-span-2 flex gap-2 pt-2">
            <button type="submit" disabled={saving}
              className="flex-1 text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-60 transition-colors"
              style={{ background: "linear-gradient(135deg,#6366f1,#7c3aed)" }}>
              {saving ? "جاري الحفظ..." : "حفظ"}
            </button>
            <button type="button" onClick={() => setShowCreate(false)}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium py-2.5 rounded-xl transition-colors">
              إلغاء
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="تأكيد الحذف" size="sm">
        <p className="text-sm text-slate-600 mb-5">هل أنت متأكد من حذف هذا المشروع لا يمكن التراجع.</p>
        <div className="flex gap-2">
          <button onClick={handleDelete}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
            حذف
          </button>
          <button onClick={() => setDeleteId(null)}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm py-2.5 rounded-xl transition-colors">
            إلغاء
          </button>
        </div>
      </Modal>
    </DashboardShell>
  );
}

/* ── Unit Card ──────────────────────────────────────────────────────────────── */
interface CardProps {
  unit:      UnitDto;
  palette:   { from: string; to: string; shadow: string };
  aptCount:  number;
  sold:      number;
  available: number;
  onDelete:  () => void;
}

function UnitCard({ unit, palette, aptCount, sold, available, onDelete }: CardProps) {
  const occupancy = aptCount > 0 ? Math.round(((aptCount - available) / aptCount) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 group flex flex-col">

      {/* Coloured header */}
      <div
        className="px-5 pt-5 pb-4 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg,${palette.from},${palette.to})` }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-6 -left-6 w-20 h-20 rounded-full bg-white/10" />
        <div className="absolute -bottom-4 -left-2 w-12 h-12 rounded-full bg-white/10" />

        <div className="relative flex items-start justify-between">
          {/* Icon + name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-sm">
              {unit.code?.[0] ?? unit.name?.[0] ?? "P"}
            </div>
            <div>
              <p className="font-bold text-white leading-tight">{unit.name ?? unit.code}</p>
              <p className="text-white/60 text-[11px] font-mono mt-0.5">{unit.code}</p>
            </div>
          </div>

          {/* Actions — always visible */}
          <div className="flex items-center gap-1">
            <Link href={`/admin/projects/${unit.id}/edit`}
              className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/35 flex items-center justify-center text-white transition-colors"
              title="تعديل">
              <Edit2 className="w-3.5 h-3.5" />
            </Link>
            <button onClick={onDelete}
              className="w-7 h-7 rounded-lg bg-white/20 hover:bg-red-500/60 flex items-center justify-center text-white transition-colors"
              title="حذف">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Address */}
        {unit.address && (
          <div className="relative flex items-center gap-1.5 text-white/70 text-[11px] mt-2">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{unit.address}</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="px-5 py-4 flex-1 flex flex-col gap-4">

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: Home,   label: "شقة",      value: unit.totalApartments,      bg: "bg-slate-50", clr: "text-slate-700" },
            { icon: Layers, label: "طابق",     value: unit.numFloors,            bg: "bg-slate-50", clr: "text-slate-700" },
            { icon: Home,   label: "شقة/طابق", value: unit.numApartmentsFloor ?? "—", bg: "bg-slate-50", clr: "text-slate-700" },
          ].map(({ icon: Icon, label, value, bg, clr }) => (
            <div key={label} className={`${bg} rounded-xl p-2.5 text-center border border-slate-100`}>
              <Icon className="w-3.5 h-3.5 text-slate-400 mx-auto mb-1" />
              <p className={`text-base font-bold ${clr}`}>{value}</p>
              <p className="text-[10px] text-slate-400">{label}</p>
            </div>
          ))}
        </div>

        {/* Occupancy bar */}
        {aptCount > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-slate-500">نسبة التشغيل</span>
              <span className="text-[11px] font-bold text-slate-700">{occupancy}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${occupancy}%`,
                  background: `linear-gradient(90deg,${palette.from},${palette.to})`,
                }}
              />
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[10px] text-slate-400">{sold} مكتمل</span>
              <span className="text-[10px] text-slate-400">{available} متاح</span>
            </div>
          </div>
        )}

        {/* CTA */}
        <Link href={`/admin/projects/${unit.id}`}
          className="mt-auto flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
          style={{
            background:  `linear-gradient(135deg,${palette.from},${palette.to})`,
            boxShadow:   `0 3px 12px ${palette.shadow}`,
          }}>
          <Eye className="w-4 h-4" /> عرض التفاصيل
        </Link>
      </div>
    </div>
  );
}