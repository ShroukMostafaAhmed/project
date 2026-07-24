"use client";

import { useState, useMemo } from "react";
import { FileText, Printer, Search, X, SlidersHorizontal } from "lucide-react";
import DashboardShell from "@/app/components/layout/DashboardShell";
import PageHeader from "@/app/components/ui/PageHeader";
import { TableRowSkeleton } from "@/app/components/ui/Skeleton";
import { useOwnershipsByShareholder, useUnits, useApartments } from "@/app/lib/hooks";
import { getAuthUser } from "@/app/lib/auth";
import { ApartmentStatusLabels, ApartmentStatusColors, ApartmentStatus } from "@/app/lib/types";
import { formatDate, formatCurrency } from "@/app/lib/utils";

function mockAptFinance(aptId: number, pct: number) {
  const seed = aptId * 137;
  const share = pct / 100;
  return {
    revenue:  (10000 + (seed % 30000)) * share,
    expenses: (3000  + (seed % 10000)) * share,
    deposit:  (1000  + (seed % 5000))  * share,
    debt:     seed % 3 === 0 ? (2000 + (seed % 8000)) * share : 0,
  };
}

export default function ShareholderReportsPage() {
  const user         = getAuthUser();
  const shareholderId = user?.shareholderId ?? null;

  const { ownerships, loading: lo } = useOwnershipsByShareholder(shareholderId);
  const { units,      loading: lu } = useUnits();
  const { apartments, loading: la } = useApartments();
  const loading = lo || lu || la;

  const [search,      setSearch]      = useState("");
  const [filterUnit,  setFilterUnit]  = useState("");
  const [filterStatus,setFilterStatus]= useState("");
  const [showFilters, setShowFilters] = useState(false);

  const reportData = useMemo(() => ownerships.map((o) => {
    const apt  = apartments.find((a) => a.id === o.apartmentId);
    const unit = units.find((u) => u.id === apt?.unitId);
    const fin  = mockAptFinance(o.apartmentId, o.ownershipPercentage);
    return { ownership: o, apartment: apt, unit, finance: fin, net: fin.revenue - fin.expenses };
  }), [ownerships, apartments, units]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return reportData.filter((r) => {
      const matchQ =
        !q ||
        (r.apartment?.apartmentNumber ?? "").toLowerCase().includes(q) ||
        (r.unit?.name ?? r.unit?.code ?? "").toLowerCase().includes(q);
      const matchUnit   = !filterUnit   || String(r.unit?.id) === filterUnit;
      const matchStatus = !filterStatus || String(r.apartment?.status) === filterStatus;
      return matchQ && matchUnit && matchStatus;
    });
  }, [reportData, search, filterUnit, filterStatus]);

  const totals = {
    revenue:  filtered.reduce((s, r) => s + r.finance.revenue,  0),
    expenses: filtered.reduce((s, r) => s + r.finance.expenses, 0),
    deposit:  filtered.reduce((s, r) => s + r.finance.deposit,  0),
    debt:     filtered.reduce((s, r) => s + r.finance.debt,     0),
    net:      filtered.reduce((s, r) => s + r.net,              0),
  };

  // Unique units for filter dropdown
  const myUnits = useMemo(() => {
    const ids = new Set(reportData.map((r) => r.unit?.id).filter(Boolean));
    return units.filter((u) => ids.has(u.id));
  }, [reportData, units]);

  return (
    <DashboardShell title="التقارير">
      <PageHeader
        title="تقاريري"
        subtitle="تقارير ملكياتي المالية (للعرض والطباعة)"
        actions={
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-xl shadow-sm shadow-indigo-200"
          >
            <Printer className="w-4 h-4" /> طباعة
          </button>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
        {[
          { label: "الإيرادات", value: totals.revenue,  cls: "text-emerald-600 bg-emerald-50" },
          { label: "المصاريف",  value: totals.expenses, cls: "text-red-500    bg-red-50"     },
          { label: "الودائع",   value: totals.deposit,  cls: "text-blue-600  bg-blue-50"     },
          { label: "المديونية", value: totals.debt,     cls: "text-amber-600 bg-amber-50"    },
          { label: "الصافي",    value: totals.net,      cls: totals.net >= 0 ? "text-indigo-600 bg-indigo-50" : "text-red-500 bg-red-50" },
        ].map((c) => (
          <div key={c.label} className={`${c.cls.split(" ")[1]} rounded-2xl p-3 text-center`}>
            <p className="text-xs text-slate-500 mb-1">{c.label}</p>
            <p className={`text-sm font-bold ${c.cls.split(" ")[0]}`}>{formatCurrency(c.value)}</p>
          </div>
        ))}
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-44">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالشقة أو المشروع..."
            className="w-full pr-9 pl-8 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm border ${showFilters ? "bg-indigo-50 border-indigo-300 text-indigo-600" : "bg-white border-slate-200 text-slate-600"}`}
        >
          <SlidersHorizontal className="w-4 h-4" /> فلترة
        </button>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-3 mb-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
          <div>
            <label className="block text-xs text-slate-500 mb-1">المشروع</label>
            <select value={filterUnit} onChange={(e) => setFilterUnit(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 bg-white">
              <option value="">الكل</option>
              {myUnits.map((u) => <option key={u.id} value={u.id}>{u.name ?? u.code}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">حالة الشقة</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 bg-white">
              <option value="">الكل</option>
              {[0,1,2,3].map((s) => <option key={s} value={s}>{ApartmentStatusLabels[s as ApartmentStatus]}</option>)}
            </select>
          </div>
          <button
            onClick={() => { setFilterUnit(""); setFilterStatus(""); }}
            className="self-end px-3 py-2 text-xs text-red-500 border border-red-200 rounded-xl bg-white hover:bg-red-50"
          >
            مسح
          </button>
        </div>
      )}

      {/* Report table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden print:shadow-none">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-500" />
            <span className="font-semibold text-slate-800">تقرير الملكيات المالية</span>
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{filtered.length} سجل</span>
          </div>
          <span className="text-xs text-slate-400">{formatDate(new Date().toISOString())}</span>
        </div>

        {loading ? (
          <table className="min-w-full">
            <tbody className="divide-y divide-slate-50">
              {[...Array(5)].map((_, i) => <TableRowSkeleton key={i} cols={11} />)}
            </tbody>
          </table>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {["م","الشقة","الطابق","المشروع","الحالة","ملكيتي","الإيرادات","المصاريف","الودائع","المديونية","الصافي"].map((h) => (
                    <th key={h} className="px-3 py-3 text-right font-semibold text-slate-600 whitespace-nowrap text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={11} className="text-center py-12 text-slate-400">لا توجد نتائج</td></tr>
                ) : filtered.map((r, i) => (
                  <tr key={r.ownership.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-3 text-slate-400 text-xs">{i+1}</td>
                    <td className="px-3 py-3 font-medium text-slate-800">شقة {r.apartment?.apartmentNumber ?? r.ownership.apartmentId}</td>
                    <td className="px-3 py-3 text-slate-500">{r.apartment?.floor ?? "—"}</td>
                    <td className="px-3 py-3 text-slate-500">{r.unit?.name ?? r.unit?.code ?? "—"}</td>
                    <td className="px-3 py-3">
                      {r.apartment && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ApartmentStatusColors[r.apartment.status]}`}>
                          {ApartmentStatusLabels[r.apartment.status]}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-indigo-600 font-semibold">{r.ownership.ownershipPercentage}%</td>
                    <td className="px-3 py-3 text-emerald-600">{formatCurrency(r.finance.revenue)}</td>
                    <td className="px-3 py-3 text-red-500">{formatCurrency(r.finance.expenses)}</td>
                    <td className="px-3 py-3 text-blue-600">{formatCurrency(r.finance.deposit)}</td>
                    <td className="px-3 py-3 text-amber-600">{formatCurrency(r.finance.debt)}</td>
                    <td className={`px-3 py-3 font-semibold ${r.net >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {formatCurrency(r.net)}
                    </td>
                  </tr>
                ))}
                {filtered.length > 0 && (
                  <tr className="bg-indigo-50/50 font-semibold border-t-2 border-indigo-100">
                    <td colSpan={6} className="px-3 py-3 text-slate-700 text-xs">الإجمالي ({filtered.length} سجل)</td>
                    <td className="px-3 py-3 text-emerald-600 text-xs">{formatCurrency(totals.revenue)}</td>
                    <td className="px-3 py-3 text-red-500 text-xs">{formatCurrency(totals.expenses)}</td>
                    <td className="px-3 py-3 text-blue-600 text-xs">{formatCurrency(totals.deposit)}</td>
                    <td className="px-3 py-3 text-amber-600 text-xs">{formatCurrency(totals.debt)}</td>
                    <td className={`px-3 py-3 text-xs ${totals.net >= 0 ? "text-emerald-600" : "text-red-500"}`}>{formatCurrency(totals.net)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-400 flex justify-between">
          <span>شركة المساهمين — {user?.name}</span>
          <span>المساهم #{shareholderId} | {filtered.length} من {reportData.length} سجل</span>
        </div>
      </div>
    </DashboardShell>
  );
}
