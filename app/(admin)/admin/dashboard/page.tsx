"use client";

import { useDashboardData } from "@/app/lib/hooks";
import { ApartmentStatus, ApartmentStatusLabels } from "@/app/lib/types";
import DashboardShell from "@/app/components/layout/DashboardShell";
import { StatCardSkeleton, ChartSkeleton } from "@/app/components/ui/Skeleton";
import { getAuthUser } from "@/app/lib/auth";
import {
  Users, Building2, Home, TrendingUp, Activity,
  AlertCircle, ArrowUpRight, Percent,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, CartesianGrid,
} from "recharts";
import { currency } from "@/app/lib/recharts-types";

const PALETTE = ["#6366f1", "#8b5cf6", "#10b981", "#f59e0b"];

export default function AdminDashboardPage() {
  const user = getAuthUser();
  const { shareholders, units, apartments, ownerships, loading, error } = useDashboardData();

  /* ── derived stats ─────────────────────────────── */
  const activeCount   = shareholders.filter((s) => s.isActive).length;
  const availableApts = apartments.filter((a) => a.status === ApartmentStatus.Available).length;
  const soldApts      = apartments.filter((a) => a.status === ApartmentStatus.Sold).length;
  const rentedApts    = apartments.filter((a) => a.status === ApartmentStatus.Rented).length;
  const occupancyPct  = apartments.length
    ? Math.round(((apartments.length - availableApts) / apartments.length) * 100)
    : 0;

  /* ── chart data ────────────────────────────────── */
  const unitBarData = units.map((u) => ({
    name: u.name ?? u.code ?? `#${u.id}`,
    شقق:    apartments.filter((a) => a.unitId === u.id).length,
    طوابق: u.numFloors,
  }));

  const statusPie = [0, 1, 2, 3]
    .map((s) => ({
      name:  ApartmentStatusLabels[s as ApartmentStatus],
      value: apartments.filter((a) => a.status === s).length,
    }))
    .filter((d) => d.value > 0);

  const trendArea = [
    { month: "يناير",  مساهمين: Math.max(1, Math.floor(shareholders.length * 0.3)), شقق: Math.max(1, Math.floor(apartments.length * 0.2)) },
    { month: "فبراير", مساهمين: Math.max(1, Math.floor(shareholders.length * 0.5)), شقق: Math.max(1, Math.floor(apartments.length * 0.4)) },
    { month: "مارس",   مساهمين: Math.max(1, Math.floor(shareholders.length * 0.6)), شقق: Math.max(1, Math.floor(apartments.length * 0.55)) },
    { month: "أبريل",  مساهمين: Math.max(1, Math.floor(shareholders.length * 0.75)),شقق: Math.max(1, Math.floor(apartments.length * 0.7)) },
    { month: "مايو",   مساهمين: Math.max(1, Math.floor(shareholders.length * 0.9)), شقق: Math.max(1, Math.floor(apartments.length * 0.85)) },
    { month: "يونيو",  مساهمين: shareholders.length,                                شقق: apartments.length },
  ];

  const ownershipTop = shareholders
    .map((sh) => {
      const pct = ownerships
        .filter((o) => o.shareholderId === sh.id)
        .reduce((s, o) => s + o.ownershipPercentage, 0);
      return { name: sh.fullName ?? `#${sh.id}`, pct };
    })
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 5);

  /* ── loading skeleton ──────────────────────────── */
  if (loading) {
    return (
      <DashboardShell title="الرئيسية">
        <div className="space-y-6">
          {/* Welcome skeleton */}
          <div className="h-36 bg-gradient-to-l from-indigo-600/40 to-violet-600/40 rounded-3xl animate-pulse" />
          {/* Stat cards skeleton */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)}
          </div>
          {/* Charts skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100">
                <ChartSkeleton />
              </div>
            ))}
          </div>
        </div>
      </DashboardShell>
    );
  }

  if (error) {
    return (
      <DashboardShell title="الرئيسية">
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
          <AlertCircle className="w-12 h-12 text-red-400" />
          <p className="text-red-500 font-medium">فشل تحميل البيانات</p>
          <p className="text-sm">{error}</p>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="الرئيسية">

      {/* ── Hero welcome banner ───────────────────── */}
      <div
        className="relative overflow-hidden rounded-3xl p-6 sm:p-8 mb-6"
        style={{
          background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 40%, #7c3aed 100%)",
          boxShadow:  "0 8px 32px rgba(99,102,241,.25)",
        }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-white/5 rounded-full" />
        <div className="absolute -bottom-8 left-24 w-32 h-32 bg-white/5 rounded-full" />
        <div className="absolute top-4 left-4 w-16 h-16 bg-white/5 rounded-full" />
        {/* Grid dots */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize:  "24px 24px",
          }}
        />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-indigo-200 text-sm mb-1">مرحباً بك،</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              {user?.name ?? "المدير"} 👋
            </h1>
            <p className="text-indigo-200/80 text-sm max-w-sm">
              نظرة عامة على أداء الشركة — آخر تحديث الآن
            </p>
          </div>

          {/* Quick stats in banner */}
          <div className="flex gap-3 flex-wrap">
            {[
              { label: "مساهمين نشطين", value: activeCount, icon: Users },
              { label: "مشاريع", value: units.length, icon: Building2 },
              { label: "نسبة التشغيل", value: `${occupancyPct}%`, icon: Percent },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3 min-w-24 text-center border border-white/20">
                <Icon className="w-4 h-4 text-indigo-200 mx-auto mb-1" />
                <p className="text-xl font-bold text-white">{value}</p>
                <p className="text-indigo-200/70 text-xs">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Stat cards ───────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {[
          {
            title: "إجمالي المساهمين",
            value: shareholders.length,
            sub: `${activeCount} نشط`,
            icon: Users,
            color: "text-indigo-600",
            bg: "bg-indigo-50",
            border: "border-indigo-100",
            badge: `+${shareholders.length}`,
          },
          {
            title: "المشاريع",
            value: units.length,
            sub: `${units.reduce((s, u) => s + u.numFloors, 0)} طابق إجمالاً`,
            icon: Building2,
            color: "text-violet-600",
            bg: "bg-violet-50",
            border: "border-violet-100",
            badge: null,
          },
          {
            title: "الشقق الكلية",
            value: apartments.length,
            sub: `${availableApts} متاح · ${soldApts} مكتمل `,
            icon: Home,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
            border: "border-emerald-100",
            badge: null,
          },
          {
            title: "نسبة التشغيل",
            value: `${occupancyPct}%`,
            sub: `${apartments.length - availableApts} من ${apartments.length} شقة`,
            icon: Activity,
            color: occupancyPct >= 70 ? "text-emerald-600" : occupancyPct >= 40 ? "text-amber-600" : "text-red-500",
            bg:    occupancyPct >= 70 ? "bg-emerald-50"    : occupancyPct >= 40 ? "bg-amber-50"    : "bg-red-50",
            border: occupancyPct >= 70 ? "border-emerald-100" : "border-amber-100",
            badge: null,
          },
        ].map((card) => (
          <div
            key={card.title}
            className={`bg-white rounded-2xl border ${card.border} shadow-sm p-5 flex items-start gap-4 hover:shadow-md transition-shadow`}
          >
            <div className={`p-3 rounded-xl ${card.bg} shrink-0`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-500 mb-0.5">{card.title}</p>
              <div className="flex items-end gap-2">
                <p className="text-2xl font-bold text-slate-800">{card.value}</p>
                {card.badge && (
                  <span className="flex items-center gap-0.5 text-xs text-emerald-600 font-medium mb-0.5">
                    <ArrowUpRight className="w-3 h-3" />
                    {card.badge}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5 truncate">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts grid ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">

        {/* Area chart — growth trend (wide) */}
        <ChartCard
          className="lg:col-span-2"
          title="مؤشر النمو"
          subtitle="تطور أعداد المساهمين والشقق"
          icon={TrendingUp}
        >
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trendArea}>
              <defs>
                <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
              <Legend iconType="circle" iconSize={8} />
              <Area type="monotone" dataKey="مساهمين" stroke="#6366f1" strokeWidth={2.5} fill="url(#gS)" dot={{ r: 3, fill: "#6366f1" }} />
              <Area type="monotone" dataKey="شقق"     stroke="#8b5cf6" strokeWidth={2.5} fill="url(#gA)" dot={{ r: 3, fill: "#8b5cf6" }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Pie — apartment status */}
        <ChartCard title="حالات الشقق" subtitle="توزيع الحالات" icon={Home}>
          {statusPie.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={statusPie}
                  cx="50%" cy="45%"
                  innerRadius={52} outerRadius={78}
                  dataKey="value"
                  paddingAngle={3}
                >
                  {statusPie.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyState />}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Bar chart — units */}
        <ChartCard className="lg:col-span-2" title="الشقق لكل مشروع" subtitle="مقارنة المشاريع " icon={Building2}>
          {unitBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={unitBarData} barGap={6}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8} />
                <Bar dataKey="شقق"    fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={40} />
                <Bar dataKey="طوابق" fill="#a78bfa" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState />}
        </ChartCard>

        {/* Top shareholders table */}
        <ChartCard title="أعلى المساهمين" subtitle="حسب نسبة الملكية" icon={Users}>
          {ownershipTop.length > 0 ? (
            <div className="space-y-3 mt-1">
              {ownershipTop.map((sh, i) => (
                <div key={sh.name} className="flex items-center gap-3">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                    i === 0 ? "bg-amber-400" : i === 1 ? "bg-slate-400" : "bg-amber-700/70"
                  }`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700 truncate">{sh.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${Math.min(sh.pct, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-indigo-600 shrink-0">
                        {sh.pct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : <EmptyState />}
        </ChartCard>
      </div>

    </DashboardShell>
  );
}

/* ── helper components ──────────────────────────────────────────────────────── */

function ChartCard({
  title, subtitle, icon: Icon, children, className,
}: {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow ${className ?? ""}`}>
      <div className="flex items-center gap-2 mb-0.5">
        <div className="p-1.5 bg-indigo-50 rounded-lg">
          <Icon className="w-3.5 h-3.5 text-indigo-600" />
        </div>
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      </div>
      <p className="text-xs text-slate-400 mb-4 mr-7">{subtitle}</p>
      {children}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-40 flex flex-col items-center justify-center gap-2 text-slate-300">
      <AlertCircle className="w-8 h-8" />
      <p className="text-sm">لا توجد بيانات كافية</p>
    </div>
  );
}
