"use client";

import { BarChart3, AlertCircle } from "lucide-react";
import DashboardShell from "@/app/components/layout/DashboardShell";
import PageHeader from "@/app/components/ui/PageHeader";
import { ChartSkeleton } from "@/app/components/ui/Skeleton";
import { useShareholders, useUnits, useApartments } from "@/app/lib/hooks";
import { ApartmentStatus, ApartmentStatusLabels } from "@/app/lib/types";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, AreaChart, Area, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, ScatterChart, Scatter, ZAxis,
} from "recharts";

const COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899"];

export default function AdminAnalysisPage() {
  const { shareholders, loading: ls } = useShareholders();
  const { units,        loading: lu } = useUnits();
  const { apartments,   loading: la } = useApartments();
  const loading = ls || lu || la;

  /* ── chart data ────────────────────────────── */
  const aptPerUnit = units.map((u) => ({
    name:    u.name ?? u.code ?? `#${u.id}`,
    شقق:    apartments.filter((a) => a.unitId === u.id).length,
    طوابق: u.numFloors,
  }));

  const statusDist = [0,1,2,3].map((s) => ({
    name:  ApartmentStatusLabels[s as ApartmentStatus],
    value: apartments.filter((a) => a.status === s).length,
  })).filter((d) => d.value > 0);

  const monthMap: Record<string, number> = {};
  shareholders.forEach((s) => {
    const m = new Date(s.createdAt).toLocaleDateString("ar-EG", { month: "short", year: "2-digit" });
    monthMap[m] = (monthMap[m] ?? 0) + 1;
  });
  const shareholderGrowth = Object.entries(monthMap).map(([month, count]) => ({ month, مساهمين: count }));

  const radarData = units.slice(0, 6).map((u) => ({
    unit:    u.name ?? u.code ?? `#${u.id}`,
    اكتمال: Math.round((apartments.filter((a) => a.unitId === u.id).length / Math.max(u.totalApartments, 1)) * 100),
    طوابق: Math.min(u.numFloors * 10, 100),
  }));

  const scatterData = units.map((u) => ({
    x: u.numFloors,
    y: apartments.filter((a) => a.unitId === u.id).length,
    z: u.totalApartments,
    name: u.name ?? u.code,
  }));

  const n = shareholders.length;
  const ap = apartments.length;
  const cumulativeData = ["يناير","فبراير","مارس","أبريل","مايو","يونيو"].map((m, i) => ({
    month: m,
    مساهمين: Math.round(n * (i + 1) / 6),
    شقق:    Math.round(ap * (i + 1) / 6),
  }));

  if (loading) return (
    <DashboardShell title="التحليلات">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100"><ChartSkeleton /></div>
        ))}
      </div>
    </DashboardShell>
  );

  return (
    <DashboardShell title="التحليلات">
      <PageHeader title="التحليلات" subtitle="6 تحليلات مختلفة للبيانات" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <Card title="الشقق والطوابق لكل مشروع" sub="مقارنة المشاريع ">
          {aptPerUnit.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={aptPerUnit}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8} />
                <Bar dataKey="شقق"    fill="#6366f1" radius={[6,6,0,0]} maxBarSize={36} />
                <Bar dataKey="طوابق" fill="#a78bfa" radius={[6,6,0,0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </Card>

        <Card title="توزيع حالات الشقق" sub="نسبة كل حالة من الإجمالي">
          {statusDist.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusDist} cx="50%" cy="50%" outerRadius={80} innerRadius={44}
                  dataKey="value" paddingAngle={3}
                  label={({ name, percent }) => `${name} ${((percent??0)*100).toFixed(0)}%`} labelLine={false}>
                  {statusDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} strokeWidth={0} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </Card>

        <Card title="النمو التراكمي" sub="تطور المساهمين والشقق" wide>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={cumulativeData}>
              <defs>
                <linearGradient id="gS2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gA2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Legend iconType="circle" iconSize={8} />
              <Area type="monotone" dataKey="مساهمين" stroke="#6366f1" strokeWidth={2.5} fill="url(#gS2)" dot={{ r: 3 }} />
              <Area type="monotone" dataKey="شقق"     stroke="#8b5cf6" strokeWidth={2.5} fill="url(#gA2)" dot={{ r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card title="مؤشر اكتمال المشاريع" sub="نسبة الشقق المضافة من الإجمالي">
          {radarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="unit" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis tick={{ fontSize: 9 }} domain={[0, 100]} />
                <Radar name="اكتمال" dataKey="اكتمال" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
                <Radar name="طوابق"  dataKey="طوابق"  stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} />
                <Legend iconType="circle" iconSize={8} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              </RadarChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </Card>

        <Card title="علاقة الطوابق بالشقق" sub="توزيع المشاريع — حجم النقطة = الإجمالي">
          {scatterData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="x" name="طوابق" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="y" name="شقق"   tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <ZAxis dataKey="z" range={[60, 400]} />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-white border border-slate-200 rounded-xl p-2.5 text-xs shadow-lg">
                      <p className="font-semibold text-slate-800 mb-1">{d.name}</p>
                      <p className="text-slate-500">طوابق: {d.x} | شقق مضافة: {d.y}</p>
                    </div>
                  );
                }} />
                <Scatter data={scatterData} fill="#6366f1" fillOpacity={0.8} />
              </ScatterChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </Card>

        <Card title="تسجيل المساهمين بالشهر" sub="عدد المساهمين الجدد لكل شهر">
          {shareholderGrowth.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={shareholderGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="مساهمين" fill="#6366f1" radius={[6,6,0,0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </Card>

      </div>
    </DashboardShell>
  );
}

function Card({ title, sub, children, wide }: { title: string; sub: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow ${wide ? "lg:col-span-2" : ""}`}>
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
