"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Building2, Home, Percent, MapPin, Layers } from "lucide-react";
import DashboardShell from "@/app/components/layout/DashboardShell";
import { api } from "@/app/lib/api";
import { getAuthUser } from "@/app/lib/auth";
import {
  UnitDto, ApartmentDto, ApartmentOwnershipDto,
  ApartmentStatusLabels, ApartmentStatusColors,
} from "@/app/lib/types";

export default function ShareholderProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const user = getAuthUser();
  const [unit, setUnit] = useState<UnitDto | null>(null);
  const [apartments, setApartments] = useState<ApartmentDto[]>([]);
  const [myOwnerships, setMyOwnerships] = useState<ApartmentOwnershipDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then(({ id }: { id: string }) => {
      const numId = parseInt(id);
      const shareholderId = user?.shareholderId;

      Promise.all([
        api.units.get(numId),
        api.apartments.byUnit(numId),
        shareholderId ? api.ownerships.byShareholder(shareholderId) : Promise.resolve([]),
      ]).then(([u, a, o]) => {
        setUnit(u);
        setApartments(a);
        // Filter ownerships for this unit's apartments
        const unitAptIds = a.map((apt) => apt.id);
        setMyOwnerships(o.filter((own) => unitAptIds.includes(own.apartmentId)));
      }).catch(() => router.push("/shareholder/projects"))
        .finally(() => setLoading(false));
    });
  }, [params, router, user?.shareholderId]);

  if (loading) {
    return (
      <DashboardShell title="تفاصيل المشروع">
        <div className="flex justify-center py-20">
          <span className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      </DashboardShell>
    );
  }

  if (!unit) return null;

  const myTotalPct = myOwnerships.reduce((s, o) => s + o.ownershipPercentage, 0);

  return (
    <DashboardShell title={unit.name ?? unit.code ?? "المشروع"}>
      <div className="mb-4">
        <Link href="/shareholder/projects" className="flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600 w-fit">
          <ArrowRight className="w-4 h-4" />
          العودة لمشاريعي
        </Link>
      </div>

      {/* Header */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 text-white mb-5"
        style={{
          background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 40%, #7c3aed 100%)",
          boxShadow:  "0 8px 32px rgba(99,102,241,.25)",
        }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-white/5" />
        <div className="absolute -bottom-8 left-12 w-24 h-24 rounded-full bg-white/5" />
        {/* Dot grid */}
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "22px 22px" }}
        />
        {/* Content */}
        <div className="relative">
        <p className="text-indigo-200 text-sm">{unit.code}</p>
        <h1 className="text-2xl font-bold mt-1">{unit.name}</h1>
        {unit.address && (
          <div className="flex items-center gap-1.5 text-indigo-200 text-sm mt-2">
            <MapPin className="w-4 h-4" />
            {unit.address}
          </div>
        )}
        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className="bg-white/15 rounded-xl p-3 text-center">
            <Percent className="w-5 h-5 mx-auto mb-1.5 text-indigo-200" />
            <p className="text-xl font-bold">{myTotalPct.toFixed(1)}%</p>
            <p className="text-xs text-indigo-200">نسبة ملكيتي</p>
          </div>
          <div className="bg-white/15 rounded-xl p-3 text-center">
            <Home className="w-5 h-5 mx-auto mb-1.5 text-indigo-200" />
            <p className="text-xl font-bold">{myOwnerships.length}</p>
            <p className="text-xs text-indigo-200">شققي</p>
          </div>
          <div className="bg-white/15 rounded-xl p-3 text-center">
            <Layers className="w-5 h-5 mx-auto mb-1.5 text-indigo-200" />
            <p className="text-xl font-bold">{unit.numFloors}</p>
            <p className="text-xs text-indigo-200">طوابق</p>
          </div>
        </div>
        </div>{/* end relative */}
      </div>

      {/* My Apartments */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-4">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">شققي في هذا المشروع</h3>
        </div>
        {myOwnerships.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            لا توجد شقق مملوكة في هذا المشروع
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {myOwnerships.map((o) => {
              const apt = apartments.find((a) => a.id === o.apartmentId);
              return (
                <div key={o.id} className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                      <Home className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        شقة {apt?.apartmentNumber ?? o.apartmentId}
                      </p>
                      <p className="text-xs text-slate-400">
                        {apt?.floor ? `الطابق ${apt.floor}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {apt && (
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${ApartmentStatusColors[apt.status]}`}>
                        {ApartmentStatusLabels[apt.status]}
                      </span>
                    )}
                    <span className="text-sm font-bold text-indigo-600">{o.ownershipPercentage}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* All Unit Apartments (read-only) */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">
            جميع شقق المشروع ({apartments.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {["رقم الشقة", "الطابق", "الحالة", "ملكيتي"].map((h) => (
                  <th key={h} className="px-4 py-3 text-right font-semibold text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {apartments.map((apt) => {
                const ownership = myOwnerships.find((o) => o.apartmentId === apt.id);
                return (
                  <tr key={apt.id} className={ownership ? "bg-indigo-50/50" : "hover:bg-slate-50"}>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {apt.apartmentNumber ?? "—"}
                      {ownership && <span className="mr-2 text-xs text-indigo-500">← مملوكة</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{apt.floor ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${ApartmentStatusColors[apt.status]}`}>
                        {ApartmentStatusLabels[apt.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {ownership ? (
                        <span className="text-sm font-bold text-indigo-600">{ownership.ownershipPercentage}%</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}
