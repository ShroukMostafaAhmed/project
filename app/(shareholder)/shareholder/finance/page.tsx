"use client";

import { useState } from "react";
import { TrendingUp, DollarSign, Percent, Building2 } from "lucide-react";
import DashboardShell from "@/app/components/layout/DashboardShell";
import PageHeader from "@/app/components/ui/PageHeader";
import StatCard from "@/app/components/ui/StatCard";
import { StatCardSkeleton, ChartSkeleton } from "@/app/components/ui/Skeleton";
import { useOwnershipsByShareholder, useUnits, useApartments } from "@/app/lib/hooks";
import { getAuthUser } from "@/app/lib/auth";
import { formatCurrency } from "@/app/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";
import { currency } from "@/app/lib/recharts-types";

const COLORS = ["#6366f1", "#8b5cf6", "#10b981", "#f59e0b"];

// Simulated per-apartment financials
function mockAptFinance(aptId: number) {
  const seed = aptId * 137;
  return {
    revenue: 10000 + (seed % 30000),
    expenses: 3000 + (seed % 10000),
    deposit: 1000 + (seed % 5000),
    debt: seed % 3 === 0 ? 2000 + (seed % 8000) : 0,
  };
}

export default function ShareholderFinancePage() {
  const user          = getAuthUser();
  const shareholderId = user?.shareholderId ?? null;

  const { ownerships, loading: lo } = useOwnershipsByShareholder(shareholderId);
  const { units,      loading: lu } = useUnits();
  const { apartments, loading: la } = useApartments();
  const loading = lo || lu || la;

  const [activeTab, setActiveTab] = useState<"chart" | "table">("chart");
  const aptFinances = ownerships.map((o) => {
    const apt = apartments.find((a) => a.id === o.apartmentId);
    const unit = units.find((u) => u.id === apt?.unitId);
    const fin = mockAptFinance(o.apartmentId);
    const myShare = o.ownershipPercentage / 100;
    return {
      label: `شقة ${apt?.apartmentNumber ?? o.apartmentId}`,
      unit: unit?.name ?? `وحدة #${unit?.id}`,
      ownership: o.ownershipPercentage,
      revenue: fin.revenue * myShare,
      expenses: fin.expenses * myShare,
      deposit: fin.deposit * myShare,
      debt: fin.debt * myShare,
    };
  });

  const totalRevenue = aptFinances.reduce((s, f) => s + f.revenue, 0);
  const totalExpenses = aptFinances.reduce((s, f) => s + f.expenses, 0);
  const totalDeposit = aptFinances.reduce((s, f) => s + f.deposit, 0);
  const totalDebt = aptFinances.reduce((s, f) => s + f.debt, 0);
  const netProfit = totalRevenue - totalExpenses;

  const pieData = [
    { name: "إيرادات", value: Math.round(totalRevenue) },
    { name: "مصاريف", value: Math.round(totalExpenses) },
    { name: "ودائع", value: Math.round(totalDeposit) },
    { name: "مديونية", value: Math.round(totalDebt) },
  ].filter((d) => d.value > 0);

  if (loading) {
    return (
      <DashboardShell title="الماليه">
        <div className="space-y-4">
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
  }

  return (
    <DashboardShell title="الماليه">
      <PageHeader title="الماليه" subtitle="ملخص مالي بناءً على نسبة ملكيتك" />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <StatCard title="حصتي من الإيرادات" value={formatCurrency(totalRevenue)} icon={TrendingUp} iconColor="text-emerald-600" iconBg="bg-emerald-50" />
        <StatCard title="حصتي من المصاريف" value={formatCurrency(totalExpenses)} icon={DollarSign} iconColor="text-red-500" iconBg="bg-red-50" />
        <StatCard title="صافي ربحي" value={formatCurrency(netProfit)} icon={Percent} iconColor={netProfit >= 0 ? "text-indigo-600" : "text-red-500"} iconBg={netProfit >= 0 ? "bg-indigo-50" : "bg-red-50"} />
        <StatCard title="مديونيتي" value={formatCurrency(totalDebt)} icon={Building2} iconColor="text-amber-600" iconBg="bg-amber-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Bar chart per apartment */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">الوضع المالي لكل شقة</h3>
          {aptFinances.length > 0 ? (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={aptFinances}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={currency} />
                <Legend />
                <Bar dataKey="revenue" name="إيرادات" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="مصاريف" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-slate-400">لا توجد بيانات</div>
          )}
        </div>

        {/* Pie */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">التوزيع المالي</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={currency} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-slate-400">لا توجد بيانات</div>
          )}
        </div>
      </div>

      {/* Detailed table per apartment */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">تفاصيل كل شقة (حسب نسبة ملكيتك)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {["الشقة", "الوحدة", "ملكيتي", "الإيرادات", "المصاريف", "الودائع", "المديونية", "الصافي"].map((h) => (
                  <th key={h} className="px-4 py-3 text-right font-semibold text-slate-600 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {aptFinances.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-slate-400">لا توجد بيانات</td></tr>
              ) : (
                aptFinances.map((f, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{f.label}</td>
                    <td className="px-4 py-3 text-slate-500">{f.unit}</td>
                    <td className="px-4 py-3 text-indigo-600 font-medium">{f.ownership}%</td>
                    <td className="px-4 py-3 text-emerald-600">{formatCurrency(f.revenue)}</td>
                    <td className="px-4 py-3 text-red-500">{formatCurrency(f.expenses)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatCurrency(f.deposit)}</td>
                    <td className="px-4 py-3 text-amber-600">{formatCurrency(f.debt)}</td>
                    <td className={`px-4 py-3 font-semibold ${f.revenue - f.expenses >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {formatCurrency(f.revenue - f.expenses)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}
