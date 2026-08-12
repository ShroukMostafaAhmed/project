"use client";

import { useState, useMemo, useRef } from "react";
import { FileText, Printer, Search, SlidersHorizontal, X, Eye } from "lucide-react";
import DashboardShell from "@/app/components/layout/DashboardShell";
import PageHeader from "@/app/components/ui/PageHeader";
import Badge from "@/app/components/ui/Badge";
import Modal from "@/app/components/ui/Modal";
import { TableRowSkeleton } from "@/app/components/ui/Skeleton";
import { useShareholders, useUnits, useApartments, useOwnerships } from "@/app/lib/hooks";
import {
  ShareholderDto, UnitDto, ApartmentDto, ApartmentOwnershipDto,
  ApartmentStatus, ApartmentStatusLabels, ApartmentStatusColors,
} from "@/app/lib/types";
import { formatDate } from "@/app/lib/utils";

type ReportType = "shareholders" | "units" | "apartments" | "ownerships";

type DetailItem =
  | { kind: "shareholder"; data: ShareholderDto }
  | { kind: "unit";        data: UnitDto }
  | { kind: "apartment";   data: ApartmentDto; owners?: ApartmentOwnershipDto[] }
  | { kind: "ownership";   data: ApartmentOwnershipDto; unitName?: string };

export default function AdminReportsPage() {
  const { shareholders, loading: ls } = useShareholders();
  const { units,        loading: lu } = useUnits();
  const { apartments,   loading: la } = useApartments();
  const { ownerships,   loading: lo } = useOwnerships();

  const loading = ls || lu || la || lo;

  const [activeReport, setActiveReport] = useState<ReportType>("shareholders");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [detail, setDetail] = useState<DetailItem | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // ── Per-report filter state ──────────────────────
  const [filterActive, setFilterActive]   = useState<"" | "true" | "false">("");
  const [filterStatus, setFilterStatus]   = useState<"" | string>("");
  const [filterUnit,   setFilterUnit]     = useState<"" | string>("");

  // reset filters when switching report
  function switchReport(r: ReportType) {
    setActiveReport(r);
    setSearch("");
    setFilterActive("");
    setFilterStatus("");
    setFilterUnit("");
  }

  // ── Filtered data ────────────────────────────────
  const filteredShareholders = useMemo(() => {
    const q = search.toLowerCase();
    return shareholders.filter((s) => {
      const matchQ =
        !q ||
        (s.fullName ?? "").toLowerCase().includes(q) ||
        (s.nationalId ?? "").includes(q) ||
        (s.phone ?? "").includes(q) ||
        (s.email ?? "").toLowerCase().includes(q);
      const matchActive =
        !filterActive ||
        (filterActive === "true" ? s.isActive : !s.isActive);
      return matchQ && matchActive;
    });
  }, [shareholders, search, filterActive]);

  const filteredUnits = useMemo(() => {
    const q = search.toLowerCase();
    return units.filter((u) => {
      return (
        !q ||
        (u.name ?? "").toLowerCase().includes(q) ||
        (u.code ?? "").toLowerCase().includes(q) ||
        (u.address ?? "").toLowerCase().includes(q)
      );
    });
  }, [units, search]);

  const filteredApartments = useMemo(() => {
    const q = search.toLowerCase();
    return apartments.filter((a) => {
      const matchQ =
        !q ||
        (a.apartmentNumber ?? "").toLowerCase().includes(q) ||
        (a.floor ?? "").toLowerCase().includes(q) ||
        (a.unitName ?? "").toLowerCase().includes(q);
      const matchStatus = !filterStatus || String(a.status) === filterStatus;
      const matchUnit   = !filterUnit   || String(a.unitId) === filterUnit;
      return matchQ && matchStatus && matchUnit;
    });
  }, [apartments, search, filterStatus, filterUnit]);

  const filteredOwnerships = useMemo(() => {
    const q = search.toLowerCase();
    return ownerships.filter((o) => {
      const matchQ =
        !q ||
        (o.shareholderName ?? "").toLowerCase().includes(q) ||
        (o.apartmentNumber ?? "").toLowerCase().includes(q);
      const matchUnit =
        !filterUnit ||
        (() => {
          const apt = apartments.find((a) => a.id === o.apartmentId);
          return apt ? String(apt.unitId) === filterUnit : false;
        })();
      return matchQ && matchUnit;
    });
  }, [ownerships, search, filterUnit, apartments]);

  const counts = {
    shareholders: filteredShareholders.length,
    units:        filteredUnits.length,
    apartments:   filteredApartments.length,
    ownerships:   filteredOwnerships.length,
  };

  const reportTabs: { key: ReportType; label: string; total: number }[] = [
    { key: "shareholders", label: "المساهمين",  total: shareholders.length },
    { key: "units",        label: "الوحدات",     total: units.length },
    { key: "apartments",   label: "الشقق",       total: apartments.length },
    { key: "ownerships",   label: "الملكيات",    total: ownerships.length },
  ];

  /* ── print the detail panel ── */
  function printDetail() {
    const el = printRef.current;
    if (!el) return;
    const w = window.open("", "_blank", "width=800,height=600");
    if (!w) return;
    w.document.write(`
      <html dir="rtl"><head><title>تقرير تفصيلي</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #1e293b; }
        h2 { border-bottom: 2px solid #6366f1; padding-bottom: 8px; color: #4f46e5; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: right; font-size: 13px; }
        th { background: #f8fafc; font-weight: 600; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; }
        .green { background:#dcfce7; color:#166534; }
        .red   { background:#fee2e2; color:#991b1b; }
        .footer { margin-top: 24px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px; }
      </style></head><body>
      ${el.innerHTML}
      <div class="footer"> Top First House — تاريخ الطباعة: ${new Date().toLocaleDateString("ar-EG")}</div>
      </body></html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 400);
  }

  return (
    <DashboardShell title="التقارير">
      <PageHeader
        title="التقارير"
        subtitle="تقارير شاملة قابلة للبحث والطباعة"
      />

      {/* Header للطباعة — مخفي في الشاشة */}
      <div className="print-header hidden">
        <h1>Top First House — تقارير النظام</h1>
        <p>تاريخ الطباعة: {new Date().toLocaleDateString("ar-EG")} | تقرير {reportTabs.find(r => r.key === activeReport)?.label}</p>
      </div>

      {/* Report tabs */}
      <div className="flex flex-wrap gap-2 mb-5 no-print">
        {reportTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => switchReport(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
              activeReport === t.key
                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200"
                : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
            }`}
          >
            {t.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeReport === t.key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
            }`}>
              {t.total}
            </span>
          </button>
        ))}
      </div>

      {/* Search + filters bar */}
      <div className="flex flex-wrap gap-2 mb-4 no-print">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث..."
            className="w-full pr-9 pl-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition-all ${
            showFilters ? "bg-indigo-50 border-indigo-300 text-indigo-600" : "bg-white border-slate-200 text-slate-600 hover:border-indigo-300"
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          فلترة
        </button>
      </div>

      {/* Expanded filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 mb-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 no-print">
          {activeReport === "shareholders" && (
            <div>
              <label className="block text-xs text-slate-500 mb-1">الحالة</label>
              <select
                value={filterActive}
                onChange={(e) => setFilterActive(e.target.value as typeof filterActive)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 bg-white"
              >
                <option value="">الكل</option>
                <option value="true">نشط</option>
                <option value="false">غير نشط</option>
              </select>
            </div>
          )}

          {(activeReport === "apartments" || activeReport === "ownerships") && (
            <>
              {activeReport === "apartments" && (
                <div>
                  <label className="block text-xs text-slate-500 mb-1">حالة الشقة</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 bg-white"
                  >
                    <option value="">الكل</option>
                    {[0,1,2,3].map((s) => (
                      <option key={s} value={s}>{ApartmentStatusLabels[s as ApartmentStatus]}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs text-slate-500 mb-1">الوحدة</label>
                <select
                  value={filterUnit}
                  onChange={(e) => setFilterUnit(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 bg-white"
                >
                  <option value="">كل الوحدات</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>{u.name ?? u.code}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <button
            onClick={() => { setFilterActive(""); setFilterStatus(""); setFilterUnit(""); }}
            className="self-end px-3 py-2 text-xs text-slate-500 hover:text-red-500 border border-slate-200 rounded-xl bg-white"
          >
            مسح الفلاتر
          </button>
        </div>
      )}

      {/* Report table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden print:shadow-none">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-500" />
            <h3 className="font-semibold text-slate-800">
              تقرير {reportTabs.find((r) => r.key === activeReport)?.label}
            </h3>
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {counts[activeReport]} نتيجة
            </span>
          </div>
          <span className="text-xs text-slate-400">{formatDate(new Date().toISOString())}</span>
        </div>

        {loading ? (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <tbody className="divide-y divide-slate-50">
                {[...Array(8)].map((_, i) => <TableRowSkeleton key={i} cols={6} />)}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* ── Shareholders table ── */}
            {activeReport === "shareholders" && (
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {["م","الاسم","الرقم القومي","الهاتف","البريد","العنوان","الحالة","تاريخ التسجيل"].map((h) => (
                      <th key={h} className="px-4 py-3 text-right font-semibold text-slate-600 whitespace-nowrap text-xs">{h}</th>
                    ))}
                    <th className="no-print px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredShareholders.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-12 text-slate-400">لا توجد نتائج</td></tr>
                  ) : filteredShareholders.map((s, i) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-400 text-xs">{i+1}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{s.fullName ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-600 font-mono text-xs">{s.nationalId ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{s.phone ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{s.email ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{s.address ?? "—"}</td>
                      <td className="px-4 py-3">
                        <Badge variant={s.isActive ? "success" : "danger"}>{s.isActive ? "نشط" : "غير نشط"}</Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{formatDate(s.createdAt)}</td>
                      <td className="no-print px-3 py-3">
                        <EyeBtn onClick={() => setDetail({ kind:"shareholder", data:s })} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* ── Units table ── */}
            {activeReport === "units" && (
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {["م","الكود","الاسم","العنوان","إجمالي الشقق","الطوابق","شقق/طابق","الوصف"].map((h) => (
                      <th key={h} className="px-4 py-3 text-right font-semibold text-slate-600 whitespace-nowrap text-xs">{h}</th>
                    ))}
                    <th className="no-print px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredUnits.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-12 text-slate-400">لا توجد نتائج</td></tr>
                  ) : filteredUnits.map((u, i) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-400 text-xs">{i+1}</td>
                      <td className="px-4 py-3 font-mono text-indigo-600 font-semibold">{u.code ?? "—"}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{u.name ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{u.address ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-700 font-medium">{u.totalApartments}</td>
                      <td className="px-4 py-3 text-slate-700">{u.numFloors}</td>
                      <td className="px-4 py-3 text-slate-700">{u.numApartmentsFloor ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{u.description ?? "—"}</td>
                      <td className="no-print px-3 py-3">
                        <EyeBtn onClick={() => setDetail({ kind:"unit", data:u })} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* ── Apartments table ── */}
            {activeReport === "apartments" && (
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {["م","رقم الشقة","الطابق","الوحدة","الحالة"].map((h) => (
                      <th key={h} className="px-4 py-3 text-right font-semibold text-slate-600 whitespace-nowrap text-xs">{h}</th>
                    ))}
                    <th className="no-print px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredApartments.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-12 text-slate-400">لا توجد نتائج</td></tr>
                  ) : filteredApartments.map((a, i) => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-400 text-xs">{i+1}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{a.apartmentNumber ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{a.floor ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{a.unitName ?? `#${a.unitId}`}</td>
                      <td className="px-4 py-3">
                        <Badge className={ApartmentStatusColors[a.status]}>
                          {ApartmentStatusLabels[a.status]}
                        </Badge>
                      </td>
                      <td className="no-print px-3 py-3">
                        <EyeBtn onClick={() => {
                          const owners = ownerships.filter(o => o.apartmentId === a.id);
                          setDetail({ kind:"apartment", data:a, owners });
                        }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* ── Ownerships table ── */}
            {activeReport === "ownerships" && (
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {["م","المساهم","رقم الشقة","الوحدة","نسبة الملكية"].map((h) => (
                      <th key={h} className="px-4 py-3 text-right font-semibold text-slate-600 whitespace-nowrap text-xs">{h}</th>
                    ))}
                    <th className="no-print px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredOwnerships.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-12 text-slate-400">لا توجد نتائج</td></tr>
                  ) : filteredOwnerships.map((o, i) => {
                    const apt = apartments.find((a) => a.id === o.apartmentId);
                    const unit = units.find((u) => u.id === apt?.unitId);
                    return (
                      <tr key={o.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-400 text-xs">{i+1}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{o.shareholderName ?? `#${o.shareholderId}`}</td>
                        <td className="px-4 py-3 text-slate-600">شقة {o.apartmentNumber ?? o.apartmentId}</td>
                        <td className="px-4 py-3 text-slate-600">{unit?.name ?? unit?.code ?? "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${Math.min(o.ownershipPercentage, 100)}%` }} />
                            </div>
                            <span className="font-semibold text-indigo-600 text-xs">{o.ownershipPercentage}%</span>
                          </div>
                        </td>
                        <td className="no-print px-3 py-3">
                          <EyeBtn onClick={() => setDetail({ kind:"ownership", data:o, unitName: unit?.name ?? unit?.code ?? undefined })} />
                        </td>
                      </tr>
                    );
                  })}                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-400 flex justify-between">
          <span> Top First House — نظام إدارة المشاريع العقارية</span>
          <span>
            {counts[activeReport]} نتيجة من {reportTabs.find(r=>r.key===activeReport)?.total} إجمالي
          </span>
        </div>
      </div>

      {/* ── Detail modal ── */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title="تفاصيل السجل" size="md">
        {detail && (
          <div>
            {/* Printable area */}
            <div ref={printRef}>
              {detail.kind === "shareholder" && (
                <>
                  <h2 className="text-base font-bold mb-3" style={{ color:"var(--foreground)" }}>بيانات المساهم</h2>
                  <DetailTable rows={[
                    ["الاسم الكامل",   detail.data.fullName ?? "—"],
                    ["الرقم القومي",   detail.data.nationalId ?? "—"],
                    ["الهاتف",         detail.data.phone ?? "—"],
                    ["البريد الإلكتروني", detail.data.email ?? "—"],
                    ["العنوان",        detail.data.address ?? "—"],
                    ["تاريخ التسجيل",  formatDate(detail.data.createdAt)],
                    ["الحالة",         detail.data.isActive ? "✅ نشط" : "❌ غير نشط"],
                  ]} />
                </>
              )}

              {detail.kind === "unit" && (
                <>
                  <h2 className="text-base font-bold mb-3" style={{ color:"var(--foreground)" }}>بيانات الوحدة</h2>
                  <DetailTable rows={[
                    ["الكود",           detail.data.code ?? "—"],
                    ["الاسم",           detail.data.name ?? "—"],
                    ["العنوان",         detail.data.address ?? "—"],
                    ["الوصف",           detail.data.description ?? "—"],
                    ["إجمالي الشقق",    String(detail.data.totalApartments)],
                    ["عدد الطوابق",    String(detail.data.numFloors)],
                    ["شقق لكل طابق",  String(detail.data.numApartmentsFloor ?? "—")],
                  ]} />
                </>
              )}

              {detail.kind === "apartment" && (
                <>
                  <h2 className="text-base font-bold mb-3" style={{ color:"var(--foreground)" }}>بيانات الشقة</h2>
                  <DetailTable rows={[
                    ["رقم الشقة",  detail.data.apartmentNumber ?? "—"],
                    ["الطابق",     detail.data.floor ?? "—"],
                    ["الوحدة",     detail.data.unitName ?? `#${detail.data.unitId}`],
                    ["الحالة",     ApartmentStatusLabels[detail.data.status]],
                  ]} />
                  {detail.owners && detail.owners.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-bold mb-2 uppercase tracking-wide" style={{ color:"var(--muted)" }}>الملاك</p>
                      <div className="space-y-2">
                        {detail.owners.map(o => (
                          <div key={o.id} className="flex items-center justify-between px-3 py-2 rounded-xl"
                            style={{ background:"rgba(99,102,241,.08)", border:"1px solid rgba(99,102,241,.15)" }}>
                            <span className="text-sm font-medium" style={{ color:"var(--foreground)" }}>{o.shareholderName}</span>
                            <span className="text-sm font-bold" style={{ color:"#6366f1" }}>{o.ownershipPercentage}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {detail.kind === "ownership" && (
                <>
                  <h2 className="text-base font-bold mb-3" style={{ color:"var(--foreground)" }}>بيانات الملكية</h2>
                  <DetailTable rows={[
                    ["المساهم",        detail.data.shareholderName ?? `#${detail.data.shareholderId}`],
                    ["رقم الشقة",      `شقة ${detail.data.apartmentNumber ?? detail.data.apartmentId}`],
                    ["الوحدة",         detail.unitName ?? "—"],
                    ["نسبة الملكية",   `${detail.data.ownershipPercentage}%`],
                  ]} />
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs" style={{ color:"var(--muted)" }}>نسبة الملكية</span>
                      <span className="text-sm font-bold" style={{ color:"#6366f1" }}>{detail.data.ownershipPercentage}%</span>
                    </div>
                    <div className="h-2.5 rounded-full overflow-hidden" style={{ background:"rgba(128,128,128,.15)" }}>
                      <div className="h-full rounded-full" style={{
                        width:`${Math.min(detail.data.ownershipPercentage,100)}%`,
                        background:"linear-gradient(90deg,#6366f1,#7c3aed)"
                      }} />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Print button */}
            <div className="mt-5 pt-4 flex justify-end gap-2" style={{ borderTop:"1px solid var(--card-border)" }}>
              <button onClick={() => setDetail(null)}
                className="px-4 py-2 text-sm font-medium rounded-xl border transition-colors"
                style={{ background:"var(--card)", borderColor:"var(--card-border)", color:"var(--foreground)" }}>
                إغلاق
              </button>
              <button onClick={printDetail}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl text-white"
                style={{ background:"linear-gradient(135deg,#6366f1,#7c3aed)", boxShadow:"0 3px 10px rgba(99,102,241,.3)" }}>
                <Printer className="w-4 h-4" />
                طباعة هذا السجل
              </button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardShell>
  );
}

/* ── Eye button ─────────────────────────────────────────────────────────────── */
function EyeBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
      style={{ color:"#6366f1" }}
      onMouseEnter={e => e.currentTarget.style.background="rgba(99,102,241,.12)"}
      onMouseLeave={e => e.currentTarget.style.background="transparent"}
      title="عرض التفاصيل"
    >
      <Eye className="w-3.5 h-3.5" />
    </button>
  );
}

/* ── Detail table ───────────────────────────────────────────────────────────── */
function DetailTable({ rows }: { rows: [string, string][] }) {
  return (
    <table style={{ width:"100%", borderCollapse:"collapse" }}>
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label} style={{ borderBottom:"1px solid var(--card-border)" }}>
            <td style={{
              padding:"8px 12px", width:"40%",
              fontSize:12, fontWeight:600,
              color:"var(--muted)",
              background:"rgba(128,128,128,.04)",
            }}>
              {label}
            </td>
            <td style={{
              padding:"8px 12px",
              fontSize:13,
              color:"var(--foreground)",
            }}>
              {value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
