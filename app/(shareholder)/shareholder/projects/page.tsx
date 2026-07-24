"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Building2, Home, Percent, MapPin, Layers, ArrowLeft } from "lucide-react";
import DashboardShell from "@/app/components/layout/DashboardShell";
import PageHeader from "@/app/components/ui/PageHeader";
import { CardSkeleton } from "@/app/components/ui/Skeleton";
import { useOwnershipsByShareholder, useUnits, useApartments } from "@/app/lib/hooks";
import { getAuthUser } from "@/app/lib/auth";
import { UnitDto, ApartmentOwnershipDto, ApartmentDto } from "@/app/lib/types";

interface ProjectGroup {
  unit:            UnitDto;
  ownerships:      ApartmentOwnershipDto[];
  apartmentsCount: number;
  totalPercentage: number;
}

export default function ShareholderProjectsPage() {
  const user          = getAuthUser();
  const shareholderId = user?.shareholderId ?? null;

  const { ownerships, loading: lo } = useOwnershipsByShareholder(shareholderId);
  const { units,      loading: lu } = useUnits();
  const { apartments, loading: la } = useApartments();
  const loading = lo || lu || la;

  const projects = useMemo<ProjectGroup[]>(() => {
    const map = new Map<number, ProjectGroup>();
    ownerships.forEach((o) => {
      const apt  = apartments.find((a) => a.id === o.apartmentId);
      if (!apt) return;
      const unit = units.find((u) => u.id === apt.unitId);
      if (!unit) return;
      if (!map.has(unit.id)) {
        map.set(unit.id, {
          unit, ownerships: [],
          apartmentsCount: apartments.filter((a) => a.unitId === unit.id).length,
          totalPercentage: 0,
        });
      }
      const g = map.get(unit.id)!;
      g.ownerships.push(o);
      g.totalPercentage += o.ownershipPercentage;
    });
    return Array.from(map.values());
  }, [ownerships, units, apartments]);

  if (loading) return (
    <DashboardShell title="مشاريعي">
      <PageHeader title="مشاريعي" subtitle="جاري التحميل..." />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => <CardSkeleton key={i} />)}
      </div>
    </DashboardShell>
  );

  return (
    <DashboardShell title="مشاريعي">
      <PageHeader
        title="مشاريعي"
        subtitle={`${projects.length} وحدة عقارية مشترك فيها`}
      />

      {projects.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm py-20 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-slate-600 font-semibold">لا توجد مشاريع مسجلة</p>
          <p className="text-slate-400 text-sm mt-1">تواصل مع الإدارة لإضافة ملكياتك</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((p) => (
            <ProjectCard key={p.unit.id} project={p} />
          ))}
        </div>
      )}
    </DashboardShell>
  );
}

function ProjectCard({ project: p }: { project: ProjectGroup }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden group">
      {/* Gradient top bar */}
      <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg,#6366f1,#7c3aed,#a78bfa)" }} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md shadow-indigo-200 shrink-0"
              style={{ background: "linear-gradient(135deg,#6366f1,#7c3aed)" }}
            >
              {p.unit.code?.[0] ?? p.unit.name?.[0] ?? "P"}
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm leading-tight">{p.unit.name ?? p.unit.code}</p>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{p.unit.code}</p>
            </div>
          </div>
        </div>

        {/* Address */}
        {p.unit.address && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-4 bg-slate-50 rounded-lg px-2.5 py-1.5">
            <MapPin className="w-3 h-3 shrink-0 text-slate-300" />
            <span className="truncate">{p.unit.address}</span>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-indigo-50 rounded-xl p-2.5 text-center border border-indigo-100">
            <Percent className="w-3.5 h-3.5 text-indigo-500 mx-auto mb-1" />
            <p className="text-sm font-bold text-indigo-700">{p.totalPercentage.toFixed(1)}%</p>
            <p className="text-[10px] text-indigo-400 mt-0.5">ملكيتي</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-2.5 text-center border border-slate-100">
            <Home className="w-3.5 h-3.5 text-slate-400 mx-auto mb-1" />
            <p className="text-sm font-bold text-slate-700">{p.ownerships.length}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">شققي</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-2.5 text-center border border-slate-100">
            <Layers className="w-3.5 h-3.5 text-slate-400 mx-auto mb-1" />
            <p className="text-sm font-bold text-slate-700">{p.unit.numFloors}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">طوابق</p>
          </div>
        </div>

        {/* CTA */}
        <Link
          href={`/shareholder/projects/${p.unit.id}`}
          className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
          style={{ background: "linear-gradient(135deg,#6366f1,#7c3aed)" }}
        >
          عرض التفاصيل
          <ArrowLeft className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
