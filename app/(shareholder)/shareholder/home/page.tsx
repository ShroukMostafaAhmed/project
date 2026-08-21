"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2, Home, Percent, ChevronDown, ChevronUp,
  ArrowLeft, MapPin, Layers, TrendingUp,
} from "lucide-react";
import DashboardShell from "@/app/components/layout/DashboardShell";
import { CardSkeleton } from "@/app/components/ui/Skeleton";
import { useOwnershipsByShareholder, useUnits, useApartments, useShareholderUnitsByShareholder } from "@/app/lib/hooks";
import { getAuthUser } from "@/app/lib/auth";
import { ApartmentStatusLabels, ApartmentStatusColors, UnitDto, ApartmentOwnershipDto, ApartmentDto } from "@/app/lib/types";

interface ProjectGroup {
  unit:           UnitDto;
  ownerships:     ApartmentOwnershipDto[];
  apartments:     ApartmentDto[];
  totalPercentage:number;
}

export default function ShareholderHomePage() {
  const user          = getAuthUser();
  const shareholderId = user?.shareholderId ?? null;

  const { ownerships, loading: lo } = useOwnershipsByShareholder(shareholderId);
  const { units,      loading: lu } = useUnits();
  const { apartments, loading: la } = useApartments();
  const { shareholderFull: shFull, loading: lsu } = useShareholderUnitsByShareholder(shareholderId);
  const loading = lo || lu || la || lsu;

  const [expandedUnit, setExpandedUnit] = useState<number | null>(null);

  /* ── group ownerships by unit ──────────────────── */
  const projects = useMemo<ProjectGroup[]>(() => {
    const map = new Map<number, ProjectGroup>();
    ownerships.forEach((o) => {
      const apt  = apartments.find((a) => a.id === o.apartmentId);
      if (!apt) return;
      const unit = units.find((u) => u.id === apt.unitId);
      if (!unit) return;
      if (!map.has(unit.id)) {
        map.set(unit.id, {
          unit,
          ownerships:      [],
          apartments:      apartments.filter((a) => a.unitId === unit.id),
          totalPercentage: 0,
        });
      }
      const g = map.get(unit.id)!;
      g.ownerships.push(o);
      g.totalPercentage += o.ownershipPercentage;
    });
    return Array.from(map.values());
  }, [ownerships, apartments, units]);

  const totalOwned = projects.reduce((s, p) => s + p.ownerships.length, 0);
  // النسبة الصحيحة من ShareholderUnit — مش مجموع نسب الشقق
  const totalPct   = (shFull?.units ?? []).reduce((s, u) => s + (u.sharePercentage ?? 0), 0);

  /* ── loading ───────────────────────────────────── */
  if (loading) return (
    <DashboardShell title="الرئيسية">
      <div className="space-y-4">
        <div className="h-40 bg-gradient-to-l from-indigo-500/30 to-violet-500/30 rounded-3xl animate-pulse" />
        <div className="grid grid-cols-1 gap-3">
          {[...Array(3)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      </div>
    </DashboardShell>
  );

  return (
    <DashboardShell title="الرئيسية">

      {/* ── Hero banner ────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 mb-6"
        style={{
          background:  "linear-gradient(135deg, #4f46e5 0%, #6366f1 40%, #7c3aed 100%)",
          boxShadow:   "0 8px 32px rgba(99,102,241,.25)",
        }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute top-4 right-32 w-20 h-20 rounded-full bg-white/5" />
        <div className="absolute -bottom-10 left-10 w-36 h-36 rounded-full bg-white/5" />
        <div className="absolute bottom-4 left-48 w-14 h-14 rounded-full bg-white/8" />

        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize:  "24px 24px",
          }}
        />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          {/* Left: greeting */}
          <div>
            <p className="text-indigo-200/80 text-sm mb-1">مرحباً بك،</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              {user?.name ?? "المساهم"} 👋
            </h1>
            <p className="text-indigo-200/70 text-sm mt-1.5">
              مساهم في {projects.length} مشروع عقاري
            </p>
          </div>

          {/* Right: quick stats */}
          <div className="grid grid-cols-3 gap-3 sm:min-w-64">
            {[
              { icon: Building2, value: projects.length,             label: "مشروع"         },
              { icon: Home,      value: totalOwned,                   label: "شقة مملوكة"    },
              { icon: Percent,   value: `${totalPct.toFixed(1)}%`,   label: "إجمالي ملكيتي" },
            ].map(({ icon: Icon, value, label }) => (
              <div
                key={label}
                className="flex flex-col items-center py-3 px-2 rounded-2xl border text-center"
                style={{ background: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.18)" }}
              >
                <Icon className="w-4 h-4 text-indigo-200 mb-1.5" />
                <p className="text-xl font-bold text-white leading-tight">{value}</p>
                <p className="text-[11px] text-indigo-200/70 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Section header ─────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">مشاريعي</h2>
          <p className="text-xs text-slate-400 mt-0.5">{projects.length}مشروع مشترك فيه</p>
        </div>
        <Link
          href="/shareholder/projects"
          className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-colors"
        >
          عرض الكل
          <ArrowLeft className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* ── Projects list ──────────────────────────── */}
      {projects.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm py-20 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-slate-600 font-semibold">لا توجد مشاريع مسجلة</p>
          <p className="text-slate-400 text-sm mt-1">تواصل مع الإدارة لإضافة ملكياتك</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => {
            const isOpen = expandedUnit === project.unit.id;
            return (
              <div key={project.unit.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">

                {/* ── Collapsed header ── */}
                <button
                  onClick={() => setExpandedUnit(isOpen ? null : project.unit.id)}
                  className="w-full flex items-center justify-between p-5 hover:bg-slate-50/70 transition-colors text-right"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-indigo-200 shrink-0">
                      {project.unit.code?.[0] ?? project.unit.name?.[0] ?? "P"}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-800">{project.unit.name ?? project.unit.code}</p>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {project.unit.address && (
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate max-w-32">{project.unit.address}</span>
                          </span>
                        )}
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          {project.unit.numFloors} طوابق
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-center hidden sm:block">
                      <p className="text-xs text-slate-400">نسبة ملكيتي</p>
                      <p className="text-base font-bold text-indigo-600">{project.totalPercentage.toFixed(1)}%</p>
                    </div>
                    <div className="text-center hidden sm:block">
                      <p className="text-xs text-slate-400">شققي</p>
                      <p className="text-base font-bold text-slate-700">{project.ownerships.length}</p>
                    </div>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${isOpen ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-400"}`}>
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </button>

                {/* ── Expanded dropdown ── */}
                {isOpen && (
                  <div className="border-t border-slate-100 bg-slate-50/60 p-5 space-y-4">

                    {/* Mini stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: "شققي",          value: project.ownerships.length,           color: "text-indigo-600",  bg: "bg-indigo-50"  },
                        { label: "نسبة ملكيتي",   value: `${project.totalPercentage.toFixed(1)}%`, color: "text-violet-600",  bg: "bg-violet-50"  },
                        { label: "إجمالي الشقق",  value: project.unit.totalApartments,        color: "text-slate-700",   bg: "bg-white"      },
                        { label: "الطوابق",        value: project.unit.numFloors,              color: "text-slate-700",   bg: "bg-white"      },
                      ].map(({ label, value, color, bg }) => (
                        <div key={label} className={`${bg} rounded-xl p-3 text-center border border-slate-100`}>
                          <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                          <p className={`text-lg font-bold ${color}`}>{value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Apartments list */}
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
                        <Home className="w-3.5 h-3.5" />
                        شققي في هذا المشروع
                      </p>
                      <div className="space-y-2">
                        {project.ownerships.map((o) => {
                          const apt = project.apartments.find((a) => a.id === o.apartmentId);
                          return (
                            <div key={o.id} className="bg-white rounded-xl px-4 py-3 flex items-center justify-between border border-slate-100 hover:border-indigo-200 transition-colors">
                              <div>
                                <p className="text-sm font-semibold text-slate-800">
                                  شقة {apt?.apartmentNumber ?? o.apartmentId}
                                </p>
                                <p className="text-xs text-slate-400">
                                  {apt?.floor ? `الطابق ${apt.floor}` : "—"}
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                {apt && (
                                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${ApartmentStatusColors[apt.status]}`}>
                                    {ApartmentStatusLabels[apt.status]}
                                  </span>
                                )}
                                <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">
                                  {o.ownershipPercentage}%
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* CTA */}
                    <Link
                      href={`/shareholder/projects/${project.unit.id}`}
                      className="flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2.5 rounded-xl transition-colors shadow-sm shadow-indigo-200"
                    >
                      <TrendingUp className="w-4 h-4" />
                      عرض تفاصيل المشروع كاملة
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}
