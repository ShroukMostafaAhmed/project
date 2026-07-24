"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, ArrowUpCircle, ArrowDownCircle, MinusCircle } from "lucide-react";
import DashboardShell from "@/app/components/layout/DashboardShell";
import PageHeader from "@/app/components/ui/PageHeader";
import StatCard from "@/app/components/ui/StatCard";
import { StatCardSkeleton, ChartSkeleton } from "@/app/components/ui/Skeleton";
import { useShareholders, useUnits, useOwnerships } from "@/app/lib/hooks";
import { UnitDto } from "@/app/lib/types";
import { formatCurrency } from "@/app/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";
import { currency } from "@/app/lib/recharts-types";

const COLORS = ["#6366f1", "#f59e0b", "#ef4444", "#10b981"];

// Deterministic mock — no Math.random (stable between renders)
function mockFinance(units: UnitDto[]) {
  return units.map((u, i) => ({
    unitId: u.id,
    name: u.name ?? u.code ?? `وحدة ${u.id}`,
    revenue:  (i + 1) * 85000 + (u.id * 7919) % 20000,
    expenses: (i + 1) * 40000 + (u.id * 3571) % 10000,
    debt:     (u.id % 2 === 0) ? (u.id * 4127) % 15000 : 0,
  }));
}

export default function AdminFinancePage() {
  const { shareholders, loading: ls } = useShareholders();
  const { units,        loading: lu } = useUnits();
  const { ownerships,   loading: lo } = useOwnerships();
  const loading = ls || lu || lo;

  const [activeTab, setActiveTab] = useState<"overview" | "shareholders" | "units">("overview");

  const finance = mockFinance(units);
  const totalRevenue  = finance.reduce((s, f) => s + f.revenue, 0);
  const totalExpenses = finance.reduce((s, f) => s + f.expenses, 0);
  const totalDebt     = finance.reduce((s, f) => s + f.debt, 0);
  const netProfit     = totalRevenue - totalExpenses;

  const shareholderShare = shareholders.map((sh) => {
    const totalPct = ownerships.filter((o) => o.shareholderId === sh.id).reduce((s, o) => s + o.ownershipPercentage, 0);
    return { name: sh.fullName ?? `#${sh.id}`, share: Math.round((totalPct / 100) * netProfit), percentage: totalPct };
  }).sort((a, b) => b.share - a.share);

  const pieData = [
    { name: "إيرادات", value: Math.round(totalRevenue) },
    { name: "مصاريف", value: Math.round(totalExpenses) },
    { name: "مديونية", value: Math.round(totalDebt) },
  ].filter((d) => d.value > 0);

  const tabs = [
    { key: "overview"      as const, label: "نظرة عامة"        },
    { key: "shareholders"  as const, label: "توزيع المساهمين"  },
    { key: "units"         as const, label: "تفاصيل الوحدات"   },
  ];

  if (loading) return (
    <DashboardShell title="الماليه">
      <div className="space-y-5">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100"><ChartSkeleton /></div>
          ))}
        </div>
      </div>
    </DashboardShell>
  );

  return (
    <DashboardShell title="الماليه">
      <PageHeader title="الماليه" subtitle="نظرة مالية شاملة على الشركة" />

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <StatCard title="إجمالي الإيرادات" value={formatCurrency(totalRevenue)} icon={TrendingUp}  iconColor="text-emerald-600" iconBg="bg-emerald-50" />
        <StatCard title="إجمالي المصاريف" value={formatCurrency(totalExpenses)} icon={TrendingDown} iconColor="text-red-500"    iconBg="bg-red-50"     />
        <StatCard title="صافي الربح"       value={formatCurrency(netProfit)}    icon={DollarSign}  iconColor={netProfit >= 0 ? "text-indigo-600" : "text-red-500"} iconBg={netProfit >= 0 ? "bg-indigo-50" : "bg-red-50"} />
        <StatCard title="إجمالي المديونية" value={formatCurrency(totalDebt)}    icon={AlertTriangle} iconColor="text-amber-600" iconBg="bg-amber-50"  />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-5 w-fit">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === t.key ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <p className="text-sm font-semibold text-slate-700 mb-4">إيرادات ومصاريف الوحدات</p>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={finance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={currency} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8} />
                <Bar dataKey="revenue"  name="إيرادات" fill="#6366f1" radius={[6,6,0,0]} maxBarSize={40} />
                <Bar dataKey="expenses" name="مصاريف"  fill="#f59e0b" radius={[6,6,0,0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <p className="text-sm font-semibold text-slate-700 mb-4">التوزيع المالي الكلي</p>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} innerRadius={50} dataKey="value" paddingAngle={3}
                  label={({ name, percent }) => `${name} ${((percent ?? 0)*100).toFixed(0)}%`} labelLine={false}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} strokeWidth={0} />)}
                </Pie>
                <Tooltip formatter={currency} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === "shareholders" && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="font-semibold text-slate-800">توزيع الأرباح على المساهمين</p>
            <p className="text-xs text-slate-500 mt-0.5">بناءً على نسب الملكية الفعلية</p>
          </div>
          {shareholderShare.length === 0 ? (
            <div className="py-16 text-center text-slate-400">لا توجد ملكيات مسجلة</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {shareholderShare.map((sh, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                      {sh.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{sh.name}</p>
                      <p className="text-xs text-slate-400">نسبة الملكية: {sh.percentage.toFixed(1)}%</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className={`text-sm font-bold ${sh.share >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {sh.share >= 0 ? "+" : ""}{formatCurrency(sh.share)}
                    </p>
                    <p className="text-xs text-slate-400">من الربح الصافي</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "units" && (
        <div className="space-y-3">
          {finance.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400">لا توجد وحدات</div>
          ) : finance.map((f) => (
            <div key={f.unitId} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-slate-800">{f.name}</p>
                <span className={`text-sm font-bold ${f.revenue - f.expenses >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {formatCurrency(f.revenue - f.expenses)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: ArrowUpCircle,   color: "text-emerald-500", label: "إيرادات", value: f.revenue   },
                  { icon: ArrowDownCircle, color: "text-red-500",     label: "مصاريف",  value: f.expenses  },
                  { icon: MinusCircle,     color: "text-amber-500",   label: "مديونية", value: f.debt      },
                ].map(({ icon: Icon, color, label, value }) => (
                  <div key={label} className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${color} shrink-0`} />
                    <div>
                      <p className="text-xs text-slate-400">{label}</p>
                      <p className="text-sm font-semibold text-slate-700">{formatCurrency(value)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
