"use client";

import { useMemo } from "react";
import { BarChart3, AlertCircle } from "lucide-react";
import DashboardShell from "@/app/components/layout/DashboardShell";
import PageHeader from "@/app/components/ui/PageHeader";
import { ChartSkeleton } from "@/app/components/ui/Skeleton";
import { useOwnershipsByShareholder, useUnits, useApartments } from "@/app/lib/hooks";
import { getAuthUser } from "@/app/lib/auth";
import { ApartmentStatus, ApartmentStatusLabels } from "@/app/lib/types";
import {
  PieChart, Pie, Legend, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  RadialBarChart, RadialBar,
} from "recharts";
import { percent } from "@/app/lib/recharts-types";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function ShareholderAnalysisPage() {
  const user          = getAuthUser();
  const shareholderId = user?.shareholderId ?? null;

  const { ownerships, loading: lo } = useOwnershipsByShareholder(shareholderId);
  const { units,      loading: lu } = useUnits();
  const { apartments, loading: la } = useApartments();
  const loading = lo || lu || la;

  /* ── derived data ──────────────────────────────── */
  const unitGroups = useMemo(() => {
    const acc: Record<number, { name: string; count: number; pct: number }> = {};
    ownerships.forEach((o) => {
      const apt  = apartments.find((a) => a.id === o.apartmentId);
      const unit = units.find((u) => u.id === apt?.unitId);
      if (!unit) return;
      if (!acc[unit.id]) acc[unit.id] = { name: unit.name ?? unit.code ?? `#${unit.id}`, count: 0, pct: 0 };
      acc[unit.id].count++;
      acc[unit.id].pct += o.ownershipPercentage;
    });
    return Object.values(acc);
  }, [ownerships, apartments, units]);

  const myApts   = useMemo(() => apartments.filter((a) => ownerships.some((o) => o.apartmentId === a.id)), [apartments, ownerships]);
  const statusDist = useMemo(() =>
    [0,1,2,3].map((s) => ({
      name:  ApartmentStatusLabels[s as ApartmentStatus],
      value: myApts.filter((a) => a.status === s).length,
    })).filter((d) => d.value > 0),
  [myApts]);

  const ownershipBar = useMemo(() =>
    ownerships.map((o) => {
      const apt = apartments.find((a) => a.id === o.apartmentId);
      return { name: `شقة ${apt?.apartmentNumber ?? o.apartmentId}`, نسبة: o.ownershipPercentage };
    }),
  [ownerships, apartments]);

  const totalPct   = ownerships.reduce((s, o) => s + o.ownershipPercentage, 0);
  const radialData = [{ name: "ملكيتي", value: Math.min(totalPct, 100), fill: "#6366f1" }];

  /* ── loading skeleton ──────────────────────────── */
  if (loading) return (
    <DashboardShell title="التحليلات">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100"><ChartSkeleton /></div>
        ))}
      </div>
    </DashboardShell>
  );

  return (
    <DashboardShell title="التحليلات">
      <PageHeader title="تحليلاتي" subtitle="نظرة تحليلية على محفظتك العقارية" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* 1. Donut - distribution by unit */}
        <Card title="توزيع الملكية على المشاريع" sub="عدد الشقق لكل مشروع">
          {unitGroups.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={unitGroups} dataKey="count" nameKey="name"
                  cx="50%" cy="50%" outerRadius={80} innerRadius={44} paddingAngle={3}
                  label={({ name, value }) => `${name} (${value})`} labelLine={false}
                >
                  {unitGroups.map((_, i) => (
                    <rect key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </Card>

        {/* 2. Donut - apartment status */}
        <Card title="حالة شققي" sub="توزيع حالات الشقق المملوكة">
          {statusDist.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={statusDist} dataKey="value"
                  cx="50%" cy="50%" outerRadius={80} innerRadius={48} paddingAngle={3}
                >
                  {statusDist.map((_, i) => (
                    <rect key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </Card>

        {/* 3. Bar - ownership per apartment */}
        <Card title="نسبة ملكيتي لكل شقة" sub="مقارنة نسب الملكية">
          {ownershipBar.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ownershipBar}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} axisLine={false} tickLine={false} />
                <Tooltip formatter={percent} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="نسبة" fill="#6366f1" radius={[6,6,0,0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </Card>

        {/* 4. Radial - total ownership */}
        <Card title="إجمالي نسبة ملكيتي" sub={`${totalPct.toFixed(2)}% من الإجمالي`}>
          <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={170}>
              <RadialBarChart
                cx="50%" cy="50%" innerRadius="55%" outerRadius="90%"
                data={radialData} startAngle={90} endAngle={-270}
              >
                <RadialBar dataKey="value" background={{ fill: "#f1f5f9" }} cornerRadius={8} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="text-center -mt-3">
              <p className="text-4xl font-bold text-indigo-600">{totalPct.toFixed(1)}<span className="text-2xl">%</span></p>
              <p className="text-xs text-slate-400 mt-1">إجمالي نسبة الملكية</p>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">{ownerships.length} شقة مملوكة</p>
            </div>
          </div>
        </Card>

      </div>
    </DashboardShell>
  );
}

function Card({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-0.5">
        <div className="p-1.5 bg-indigo-50 rounded-lg">
          <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
        </div>
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      </div>
      <p className="text-xs text-slate-400 mb-4 mr-7">{sub}</p>
      {children}
    </div>
  );
}

function Empty() {
  return (
    <div className="h-40 flex flex-col items-center justify-center gap-2 text-slate-300">
      <AlertCircle className="w-8 h-8" />
      <p className="text-sm">لا توجد بيانات كافية</p>
    </div>
  );
}
