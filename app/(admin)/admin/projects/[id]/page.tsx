"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight, Building2, Home, Layers, MapPin,
  Plus, Trash2, ChevronDown, ChevronUp,
  Printer, Edit2, Users, CheckCircle,
} from "lucide-react";
import DashboardShell from "@/app/components/layout/DashboardShell";
import Badge from "@/app/components/ui/Badge";
import Modal from "@/app/components/ui/Modal";
import { Skeleton } from "@/app/components/ui/Skeleton";
import { api } from "@/app/lib/api";
import {
  UnitDto, ApartmentDto, ApartmentOwnershipDto,
  ApartmentStatus, ApartmentStatusColors, ApartmentStatusLabels,
  CreateApartmentDto,
} from "@/app/lib/types";

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();

  const [unit,       setUnit]      = useState<UnitDto | null>(null);
  const [apartments, setApartments]= useState<ApartmentDto[]>([]);
  const [loading,    setLoading]   = useState(true);
  const [expandedId, setExpandedId]= useState<number | null>(null);
  const [ownMap,     setOwnMap]    = useState<Record<number, ApartmentOwnershipDto[]>>({});
  const [showAdd,    setShowAdd]   = useState(false);
  const [form,       setForm]      = useState<CreateApartmentDto>({
    apartmentNumber: "", floor: "", status: ApartmentStatus.Available,
  });
  const [saving,  setSaving]  = useState(false);
  const [unitId,  setUnitId]  = useState<number | null>(null);

  /* ── Load ── */
  useEffect(() => {
    params.then(({ id }: { id: string }) => {
      const n = parseInt(id);
      setUnitId(n);
      Promise.all([api.units.get(n), api.apartments.byUnit(n)])
        .then(([u, a]) => { setUnit(u); setApartments(a); })
        .catch(() => router.push("/admin/projects"))
        .finally(() => setLoading(false));
    });
  }, [params, router]);

  const loadOwn = useCallback(async (aptId: number) => {
    if (ownMap[aptId]) return;
    const d = await api.ownerships.byApartment(aptId);
    setOwnMap((p) => ({ ...p, [aptId]: d }));
  }, [ownMap]);

  function toggle(id: number) {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    loadOwn(id);
  }

  async function addApartment(e: React.FormEvent) {
    e.preventDefault();
    if (!unitId) return;
    setSaving(true);
    try {
      await api.apartments.create({ ...form, unitId });
      setApartments(await api.apartments.byUnit(unitId));
      setShowAdd(false);
      setForm({ apartmentNumber: "", floor: "", status: ApartmentStatus.Available });
    } catch (err) { alert((err as Error).message); }
    finally { setSaving(false); }
  }

  async function deleteApartment(id: number) {
    if (!confirm("حذف هذه الشقة؟")) return;
    try {
      await api.apartments.delete(id);
      setApartments((p) => p.filter((a) => a.id !== id));
    } catch (err) { alert((err as Error).message); }
  }

  /* ── Print only this project ── */
  function printProject() {
    window.print();
  }

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <DashboardShell title="المشروع">
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-2xl" />
          <div className="grid grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </DashboardShell>
    );
  }

  if (!unit) return null;

  const statusCounts = ([0,1,2,3] as ApartmentStatus[]).map((s) => ({
    s,
    label: ApartmentStatusLabels[s],
    count: apartments.filter((a) => a.status === s).length,
    bg:    s===0?"bg-emerald-50 border-emerald-200 text-emerald-700"
          :s===1?"bg-blue-50 border-blue-200 text-blue-700"
          :s===2?"bg-amber-50 border-amber-200 text-amber-700"
                :"bg-red-50 border-red-200 text-red-700",
    dot:   s===0?"bg-emerald-500":s===1?"bg-blue-500":s===2?"bg-amber-500":"bg-red-500",
  }));

  const occupancy = apartments.length > 0
    ? Math.round(((apartments.length - apartments.filter(a=>a.status===ApartmentStatus.Available).length) / apartments.length)*100)
    : 0;

  return (
    <>
      {/* ── Print stylesheet ─────────────────────────────── */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #project-print, #project-print * { visibility: visible !important; }
          #project-print { position: fixed; inset: 0; padding: 24px; background: white; }
          .no-print { display: none !important; }
        }
      `}</style>

      <DashboardShell title={unit.name ?? unit.code ?? "المشروع"}>

        {/* Back + Print — no-print */}
        <div className="flex items-center justify-between mb-4 no-print">
          <Link href="/admin/projects"
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 transition-colors">
            <ArrowRight className="w-4 h-4" />
            العودة للمشاريع
          </Link>
          <div className="flex gap-2">
            <button
              onClick={printProject}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-sm font-medium transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4" />
              طباعة المشروع
            </button>
            <Link href={`/admin/projects/${unit.id}/edit`}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold transition-colors"
              style={{ background: "linear-gradient(135deg,#6366f1,#7c3aed)" }}>
              <Edit2 className="w-4 h-4" />
              تعديل
            </Link>
          </div>
        </div>

        {/* ── Printable content ─────────────────────────────── */}
        <div id="project-print">

          {/* Print-only header */}
          <div className="hidden print:block mb-6 pb-4 border-b-2 border-slate-200">
            <p className="text-xs text-slate-400 mb-1">تقرير مشروع — شركة المساهمين</p>
            <h1 className="text-2xl font-bold text-slate-800">{unit.name}</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {unit.code} {unit.address ? `· ${unit.address}` : ""}
            </p>
          </div>

          {/* Hero banner */}
          <div
            className="rounded-2xl p-6 text-white mb-5 relative overflow-hidden print:bg-slate-800 print:text-white"
            style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5,#7c3aed)" }}
          >
            <div className="absolute -top-8 -left-8 w-32 h-32 rounded-full bg-white/10" />
            <div className="absolute bottom-0 left-20 w-20 h-20 rounded-full bg-white/5" />

            <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">{unit.code}</span>
                </div>
                <h1 className="text-2xl font-bold">{unit.name}</h1>
                {unit.address && (
                  <div className="flex items-center gap-1.5 text-white/70 text-sm mt-2">
                    <MapPin className="w-3.5 h-3.5" /> {unit.address}
                  </div>
                )}
                {unit.description && (
                  <p className="text-white/60 text-sm mt-1">{unit.description}</p>
                )}
              </div>

              {/* Occupancy ring */}
              <div className="bg-white/15 rounded-2xl px-6 py-4 text-center min-w-28 no-print">
                <p className="text-3xl font-extrabold">{occupancy}%</p>
                <p className="text-white/70 text-xs mt-0.5">نسبة الإشغال</p>
              </div>
            </div>

            {/* Mini stats */}
            <div className="relative grid grid-cols-3 gap-3 mt-5">
              {[
                { icon: Home,    label: "إجمالي الشقق", value: unit.totalApartments },
                { icon: Layers,  label: "الطوابق",      value: unit.numFloors       },
                { icon: Building2,label:"شقة / طابق",   value: unit.numApartmentsFloor ?? "—" },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-white/15 rounded-xl p-3 text-center">
                  <Icon className="w-4 h-4 mx-auto mb-1 text-white/70" />
                  <p className="text-xl font-bold">{value}</p>
                  <p className="text-white/60 text-[11px]">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Status cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {statusCounts.map(({ s, label, count, bg, dot }) => (
              <div key={s} className={`rounded-xl border p-4 ${bg}`}>
                <div className={`w-2.5 h-2.5 rounded-full ${dot} mb-2`} />
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs font-medium mt-0.5 opacity-80">{label}</p>
              </div>
            ))}
          </div>

          {/* Apartments table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 text-indigo-500" />
                <h3 className="font-semibold text-slate-800">الشقق</h3>
                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{apartments.length}</span>
              </div>
              <button onClick={() => setShowAdd(true)}
                className="no-print flex items-center gap-1.5 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                style={{ background: "linear-gradient(135deg,#6366f1,#7c3aed)" }}>
                <Plus className="w-3.5 h-3.5" /> إضافة شقة
              </button>
            </div>

            {apartments.length === 0 ? (
              <div className="py-14 text-center text-slate-400">
                <Home className="w-10 h-10 mx-auto mb-2 text-slate-200" />
                <p className="text-sm">لا توجد شقق مضافة بعد</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {apartments.map((apt) => {
                  const isOpen = expandedId === apt.id;
                  const owners = ownMap[apt.id];
                  return (
                    <div key={apt.id}>
                      <div
                        className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 cursor-pointer transition-colors"
                        onClick={() => toggle(apt.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                            <Home className="w-4 h-4 text-indigo-500" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              شقة {apt.apartmentNumber}
                            </p>
                            <p className="text-xs text-slate-400">الطابق {apt.floor ?? "—"}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge className={ApartmentStatusColors[apt.status]}>
                            {ApartmentStatusLabels[apt.status]}
                          </Badge>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteApartment(apt.id); }}
                            className="no-print w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </div>
                        </div>
                      </div>

                      {/* Expanded owners */}
                      {isOpen && (
                        <div className="px-5 pb-4 pt-1 bg-slate-50/70 border-t border-slate-100">
                          <div className="flex items-center gap-1.5 mb-2.5">
                            <Users className="w-3.5 h-3.5 text-indigo-400" />
                            <p className="text-xs font-semibold text-slate-600">ملاك هذه الشقة</p>
                          </div>

                          {!owners ? (
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                              <span className="w-3.5 h-3.5 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                              جاري التحميل...
                            </div>
                          ) : owners.length === 0 ? (
                            <p className="text-xs text-slate-400">لا توجد ملكيات مسجلة</p>
                          ) : (
                            <div className="space-y-2">
                              {owners.map((o) => (
                                <div key={o.id}
                                  className="flex items-center justify-between bg-white rounded-xl px-4 py-2.5 border border-slate-100 shadow-sm">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[11px] font-bold"
                                      style={{ background: "linear-gradient(135deg,#6366f1,#7c3aed)" }}>
                                      {(o.shareholderName ?? "?")[0]}
                                    </div>
                                    <span className="text-sm text-slate-700 font-medium">
                                      {o.shareholderName ?? `مساهم #${o.shareholderId}`}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                      <div className="h-full rounded-full"
                                        style={{
                                          width: `${Math.min(o.ownershipPercentage,100)}%`,
                                          background: "linear-gradient(90deg,#6366f1,#7c3aed)",
                                        }} />
                                    </div>
                                    <span className="text-sm font-bold text-indigo-600 w-10 text-left">
                                      {o.ownershipPercentage}%
                                    </span>
                                    {o.ownershipPercentage === 100 && (
                                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                                    )}
                                  </div>
                                </div>
                              ))}

                              {/* Total bar */}
                              {owners.length > 1 && (
                                <div className="flex items-center justify-between px-1 pt-1">
                                  <span className="text-[10px] text-slate-400">الإجمالي</span>
                                  <span className={`text-xs font-bold ${
                                    owners.reduce((s,o)=>s+o.ownershipPercentage,0)===100
                                      ? "text-emerald-600" : "text-amber-600"
                                  }`}>
                                    {owners.reduce((s,o)=>s+o.ownershipPercentage,0)}%
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Print footer */}
          <div className="hidden print:block mt-8 pt-4 border-t border-slate-200 text-xs text-slate-400 flex justify-between">
            <span>شركة المساهمين — نظام إدارة المشاريع</span>
            <span>تاريخ الطباعة: {new Date().toLocaleDateString("ar-EG")}</span>
          </div>
        </div>

        {/* Add Apartment Modal */}
        <Modal open={showAdd} onClose={() => setShowAdd(false)} title="إضافة شقة" size="sm">
          <form onSubmit={addApartment} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                رقم الشقة <span className="text-red-500">*</span>
              </label>
              <input type="text" required value={form.apartmentNumber ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, apartmentNumber: e.target.value }))}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 focus:bg-white transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">الطابق</label>
              <input type="text" value={form.floor ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, floor: e.target.value }))}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 focus:bg-white transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">الحالة</label>
              <select value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: parseInt(e.target.value) as ApartmentStatus }))}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 focus:bg-white transition-all">
                {[0,1,2,3].map((s) => (
                  <option key={s} value={s}>{ApartmentStatusLabels[s as ApartmentStatus]}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving}
                className="flex-1 text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-60"
                style={{ background: "linear-gradient(135deg,#6366f1,#7c3aed)" }}>
                {saving ? "جاري الحفظ..." : "إضافة"}
              </button>
              <button type="button" onClick={() => setShowAdd(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm py-2.5 rounded-xl transition-colors">
                إلغاء
              </button>
            </div>
          </form>
        </Modal>

      </DashboardShell>
    </>
  );
}
