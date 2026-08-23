"use client";

import { Fragment, useState, useMemo } from "react";
import {
  Plus, Search, X, Home, Building2, RefreshCw, AlertCircle,
  ShoppingCart, Banknote, CalendarClock, CheckCircle2, Clock,
  ChevronDown, ChevronUp, User, Phone, IdCard, Users,
} from "lucide-react";
import DashboardShell from "@/app/components/layout/DashboardShell";
import PageHeader from "@/app/components/ui/PageHeader";
import Modal from "@/app/components/ui/Modal";
import { ListSkeleton, StatCardSkeleton } from "@/app/components/ui/Skeleton";
import { useApartmentSales, useUnits } from "@/app/lib/hooks";
import {
  ApartmentSaleDto, CreateApartmentSaleDto, AvailableApartmentDto,
} from "@/app/lib/types";
import { api } from "@/app/lib/api";
import { formatCurrency, formatDate } from "@/app/lib/utils";

/* ── helpers ── */
function inputStyle(): React.CSSProperties {
  return { background:"var(--input-bg)", borderColor:"var(--input-border)", color:"var(--foreground)" };
}
function cardStyle(): React.CSSProperties {
  return { background:"var(--card)", border:"1px solid var(--card-border)" };
}
function today(): string {
  return new Date().toISOString().slice(0, 10);
}
function nextMonth(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

const emptyForm: CreateApartmentSaleDto = {
  apartmentId: 0,
  buyerName: "",
  buyerPhone: "",
  buyerNationalId: "",
  totalPrice: 0,
  downPayment: 0,
  installmentMonthsCount: 12,
  saleDate: today(),
  firstInstallmentDueDate: nextMonth(),
  notes: "",
};

export default function AdminApartmentSalesPage() {
  const { sales, loading: lsales, error: esales, reload } = useApartmentSales();
  const { units, loading: lunits } = useUnits();

  const loading = lsales || lunits;

  /* ── filters ── */
  const [search,     setSearch]     = useState("");
  const [filterUnit, setFilterUnit] = useState("");
  const [expanded,   setExpanded]   = useState<number | null>(null);

  /* ── add modal ── */
  const [showAdd,   setShowAdd]   = useState(false);
  const [form,      setForm]      = useState<CreateApartmentSaleDto>(emptyForm);
  const [formUnit,  setFormUnit]  = useState("");
  const [available, setAvailable] = useState<AvailableApartmentDto[]>([]);
  const [loadingApts, setLoadingApts] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [formErr,   setFormErr]   = useState("");
  const [payingId,  setPayingId]  = useState<number | null>(null);

  async function handleFormUnitChange(unitId: string) {
    setFormUnit(unitId);
    setForm(p => ({ ...p, apartmentId: 0 }));
    setAvailable([]);
    if (!unitId) return;
    setLoadingApts(true);
    try {
      setAvailable(await api.apartments.availableByUnit(parseInt(unitId)));
    } catch (err) {
      setFormErr((err as Error).message);
    } finally {
      setLoadingApts(false);
    }
  }

  function openAdd() {
    setForm(emptyForm);
    setFormUnit("");
    setAvailable([]);
    setFormErr("");
    setShowAdd(true);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.apartmentId) { setFormErr("اختر الشقة أولاً"); return; }
    if (form.downPayment > form.totalPrice) { setFormErr("المقدم أكبر من ثمن الشقة"); return; }
    setSaving(true); setFormErr("");
    try {
      await api.apartmentSales.create(form);
      await reload();
      setShowAdd(false);
    } catch (err) { setFormErr((err as Error).message); }
    finally { setSaving(false); }
  }

  async function handlePay(installmentId: number) {
    setPayingId(installmentId);
    try {
      await api.apartmentSales.payInstallment(installmentId, { paidDate: new Date().toISOString() });
      await reload();
    } catch (err) { alert((err as Error).message); }
    finally { setPayingId(null); }
  }

  /* ── monthly installment preview in the add form ── */
  const previewMonthly = useMemo(() => {
    const remaining = (form.totalPrice ?? 0) - (form.downPayment ?? 0);
    const months    = form.installmentMonthsCount ?? 0;
    if (remaining <= 0 || months <= 0) return 0;
    return remaining / months;
  }, [form.totalPrice, form.downPayment, form.installmentMonthsCount]);

  /* ── filtering ── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sales.filter((s) => {
      const mQ = !q ||
        (s.buyerName       ?? "").toLowerCase().includes(q) ||
        (s.buyerPhone      ?? "").toLowerCase().includes(q) ||
        (s.buyerNationalId ?? "").toLowerCase().includes(q) ||
        (s.apartmentNumber ?? "").toLowerCase().includes(q) ||
        (s.unitName        ?? "").toLowerCase().includes(q);
      const mUnit = !filterUnit || String(s.unitId) === filterUnit;
      return mQ && mUnit;
    });
  }, [sales, search, filterUnit]);

  /* ── stats ── */
  const stats = useMemo(() => {
    const totalSales = filtered.reduce((s, x) => s + x.totalPrice,  0);
    const totalDown  = filtered.reduce((s, x) => s + x.downPayment, 0);
    const collected  = filtered.reduce(
      (s, x) => s + (x.installments ?? []).filter(i => i.isPaid).reduce((a, i) => a + i.amount, 0),
      totalDown
    );
    return { count: filtered.length, totalSales, collected, remaining: totalSales - collected };
  }, [filtered]);

  function paidInfo(sale: ApartmentSaleDto) {
    const insts = sale.installments ?? [];
    const paid  = insts.filter(i => i.isPaid).length;
    return { paid, total: insts.length, pct: insts.length ? (paid / insts.length) * 100 : 100 };
  }

  return (
    <DashboardShell title="الشقق المباعة">
      <PageHeader
        title="الشقق المباعة"
        subtitle="بيانات المشترين والأقساط الشهرية لكل شقة مباعة"
        actions={
          <div className="flex gap-2">
            <button onClick={reload}
              className="w-9 h-9 rounded-xl border flex items-center justify-center transition-colors"
              style={cardStyle()}
              title="تحديث">
              <RefreshCw className="w-4 h-4" style={{ color:"var(--muted)" }} />
            </button>
            <button onClick={openAdd}
              className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl text-white"
              style={{ background:"linear-gradient(135deg,#6366f1,#7c3aed)", boxShadow:"0 3px 12px rgba(99,102,241,.3)" }}>
              <Plus className="w-4 h-4" /> إضافة عملية بيع
            </button>
          </div>
        }
      />

      {/* ── Summary cards ── */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
          {[...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
          {[
            { label:"شقق مباعة",       value:stats.count,                     icon:ShoppingCart,  clr:"#6366f1", bg:"rgba(99,102,241,.1)",  border:"rgba(99,102,241,.2)" },
            { label:"إجمالي المبيعات", value:formatCurrency(stats.totalSales), icon:Banknote,     clr:"#7c3aed", bg:"rgba(124,58,237,.1)",  border:"rgba(124,58,237,.2)" },
            { label:"المحصّل",         value:formatCurrency(stats.collected),  icon:CheckCircle2, clr:"#10b981", bg:"rgba(16,185,129,.1)",  border:"rgba(16,185,129,.2)" },
            { label:"المتبقي",         value:formatCurrency(stats.remaining),  icon:Clock,        clr:"#f59e0b", bg:"rgba(245,158,11,.1)",  border:"rgba(245,158,11,.2)" },
          ].map(({ label, value, icon:Icon, clr, bg, border }) => (
            <div key={label} className="rounded-2xl p-4 flex items-center gap-3 hover:-translate-y-0.5 transition-all"
              style={cardStyle()}>
              <div className="p-2.5 rounded-xl shrink-0" style={{ background:bg, border:`1px solid ${border}` }}>
                <Icon className="w-4 h-4" style={{ color:clr }} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium truncate" style={{ color:"var(--muted)" }}>{label}</p>
                <p className="text-lg font-bold truncate" style={{ color:clr }}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color:"var(--muted)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث باسم المشتري أو رقم الشقة..."
            className="w-full pr-9 pl-4 py-2 rounded-xl text-sm border focus:outline-none transition-all"
            style={inputStyle()}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:"var(--muted)" }}>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="relative min-w-52">
          <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color:"var(--muted)" }} />
          <select value={filterUnit} onChange={e => setFilterUnit(e.target.value)}
            className="w-full pr-9 pl-4 py-2 rounded-xl text-sm border focus:outline-none appearance-none"
            style={inputStyle()}>
            <option value="">كل المشاريع</option>
            {units.map(u => (
              <option key={u.id} value={u.id}>{u.name ?? u.code}</option>
            ))}
          </select>
        </div>

        {(search || filterUnit) && (
          <button onClick={() => { setSearch(""); setFilterUnit(""); }}
            className="px-3 py-2 rounded-xl text-xs font-medium border transition-colors"
            style={{ color:"#ef4444", borderColor:"rgba(239,68,68,.3)", background:"rgba(239,68,68,.06)" }}>
            مسح
          </button>
        )}
      </div>

      {/* ── Error ── */}
      {esales && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl mb-4 text-sm"
          style={{ background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.25)", color:"#ef4444" }}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          {esales}
        </div>
      )}

      {/* ── Table ── */}
      {loading ? (
        <ListSkeleton rows={8} cols={7} />
      ) : (
        <div className="rounded-2xl border overflow-hidden shadow-sm" style={cardStyle()}>
          <div className="flex items-center justify-between px-5 py-3 border-b"
            style={{ borderColor:"var(--card-border)", background:"rgba(128,128,128,.04)" }}>
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" style={{ color:"#6366f1" }} />
              <span className="text-sm font-semibold" style={{ color:"var(--foreground)" }}>سجل المبيعات</span>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full"
              style={{ background:"rgba(128,128,128,.1)", color:"var(--muted)" }}>
              {filtered.length} / {sales.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr style={{ borderBottom:"1px solid var(--card-border)" }}>
                  {["م","الشقة","المشروع","المشتري","ثمن الشقة","المقدم","عدد الأقساط","القسط الشهري","السداد","تاريخ البيع",""].map(h => (
                    <th key={h} className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                      style={{ color:"var(--muted)", background:"rgba(128,128,128,.04)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <ShoppingCart className="w-10 h-10 opacity-20" style={{ color:"var(--muted)" }} />
                        <p className="text-sm" style={{ color:"var(--muted)" }}>
                          {sales.length === 0 ? "لا توجد شقق مباعة" : "لا توجد نتائج"}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : filtered.map((s, i) => {
                  const { paid, total, pct } = paidInfo(s);
                  const open = expanded === s.id;
                  return (
                    <Fragment key={s.id}>
                      <tr className="transition-colors"
                        style={{ borderBottom:"1px solid var(--card-border)" }}>
                        <td className="px-4 py-3.5 text-xs" style={{ color:"var(--muted)" }}>{i+1}</td>

                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <Home className="w-3.5 h-3.5" style={{ color:"var(--muted)" }} />
                            <span className="text-sm" style={{ color:"var(--foreground)" }}>
                              شقة {s.apartmentNumber ?? s.apartmentId}
                            </span>
                            {s.floor && (
                              <span className="text-xs" style={{ color:"var(--muted)" }}>— الطابق {s.floor}</span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="text-xs px-2.5 py-1 rounded-full"
                            style={{ background:"rgba(99,102,241,.1)", color:"#818cf8" }}>
                            {s.unitName ?? `#${s.unitId}`}
                          </span>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                              style={{ background:"linear-gradient(135deg,#0ea5e9,#6366f1)" }}>
                              {(s.buyerName ?? "?")[0]}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate" style={{ color:"var(--foreground)" }}>
                                {s.buyerName ?? "—"}
                              </p>
                              <p className="text-[11px] truncate" style={{ color:"var(--muted)" }}>
                                {s.buyerPhone ?? "—"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 font-semibold whitespace-nowrap" style={{ color:"var(--foreground)" }}>
                          {formatCurrency(s.totalPrice)}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap" style={{ color:"var(--muted)" }}>
                          {formatCurrency(s.downPayment)}
                        </td>
                        <td className="px-4 py-3.5 text-center" style={{ color:"var(--foreground)" }}>
                          {s.installmentMonthsCount}
                        </td>
                        <td className="px-4 py-3.5 font-bold whitespace-nowrap" style={{ color:"#7c3aed" }}>
                          {formatCurrency(s.monthlyInstallmentAmount)}
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 rounded-full overflow-hidden" style={{ background:"rgba(128,128,128,.15)" }}>
                              <div className="h-full rounded-full transition-all"
                                style={{ width:`${pct}%`, background:"linear-gradient(90deg,#10b981,#34d399)" }} />
                            </div>
                            <span className="text-xs font-semibold whitespace-nowrap"
                              style={{ color: pct >= 100 ? "#10b981" : "var(--muted)" }}>
                              {paid}/{total}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-xs whitespace-nowrap" style={{ color:"var(--muted)" }}>
                          {formatDate(s.saleDate)}
                        </td>

                        <td className="px-3 py-3.5">
                          <button onClick={() => setExpanded(open ? null : s.id)}
                            title="تفاصيل الأقساط"
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                            style={{ color:"#6366f1" }}>
                            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>

                      {open && (
                        <tr style={{ borderBottom:"1px solid var(--card-border)" }}>
                          <td colSpan={11} className="px-5 py-4" style={{ background:"rgba(128,128,128,.03)" }}>
                            <div className="grid gap-4 lg:grid-cols-3">

                              {/* Buyer card */}
                              <div className="rounded-xl p-4 space-y-2.5" style={cardStyle()}>
                                <p className="text-xs font-bold mb-1" style={{ color:"#6366f1" }}>بيانات المشتري</p>
                                {[
                                  { icon:User,   label:"الاسم",       value:s.buyerName },
                                  { icon:Phone,  label:"التليفون",    value:s.buyerPhone },
                                  { icon:IdCard, label:"الرقم القومي", value:s.buyerNationalId },
                                  { icon:CalendarClock, label:"أول قسط", value:formatDate(s.firstInstallmentDueDate) },
                                ].map(({ icon:Icon, label, value }) => (
                                  <div key={label} className="flex items-center gap-2">
                                    <Icon className="w-3.5 h-3.5 shrink-0" style={{ color:"var(--muted)" }} />
                                    <span className="text-xs" style={{ color:"var(--muted)" }}>{label}:</span>
                                    <span className="text-xs font-medium" style={{ color:"var(--foreground)" }}>
                                      {value || "—"}
                                    </span>
                                  </div>
                                ))}
                                {s.notes && (
                                  <p className="text-xs pt-1" style={{ color:"var(--muted)" }}>ملاحظات: {s.notes}</p>
                                )}
                              </div>

                              {/* Shareholders payout */}
                              <div className="rounded-xl p-4" style={cardStyle()}>
                                <div className="flex items-center gap-1.5 mb-2">
                                  <Users className="w-3.5 h-3.5" style={{ color:"#7c3aed" }} />
                                  <p className="text-xs font-bold" style={{ color:"#7c3aed" }}>نصيب المساهمين</p>
                                </div>
                                {(s.shareholdersPayoutBreakdown ?? []).length === 0 ? (
                                  <p className="text-xs" style={{ color:"var(--muted)" }}>لا يوجد توزيع</p>
                                ) : (
                                  <div className="space-y-2">
                                    {(s.shareholdersPayoutBreakdown ?? []).map(p => (
                                      <div key={p.shareholderId} className="flex items-center justify-between gap-2">
                                        <span className="text-xs truncate" style={{ color:"var(--foreground)" }}>
                                          {p.shareholderName ?? `#${p.shareholderId}`}
                                          <span style={{ color:"var(--muted)" }}> ({p.ownershipPercentage}%)</span>
                                        </span>
                                        <span className="text-xs font-bold whitespace-nowrap" style={{ color:"#7c3aed" }}>
                                          {formatCurrency(p.shareAmount)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Installments */}
                              <div className="rounded-xl p-4 lg:col-span-1" style={cardStyle()}>
                                <div className="flex items-center gap-1.5 mb-2">
                                  <CalendarClock className="w-3.5 h-3.5" style={{ color:"#0ea5e9" }} />
                                  <p className="text-xs font-bold" style={{ color:"#0ea5e9" }}>الأقساط</p>
                                </div>
                                <div className="max-h-56 overflow-y-auto space-y-1.5">
                                  {(s.installments ?? []).length === 0 ? (
                                    <p className="text-xs" style={{ color:"var(--muted)" }}>لا توجد أقساط</p>
                                  ) : (s.installments ?? []).map(inst => (
                                    <div key={inst.id} className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg"
                                      style={{ background: inst.isPaid ? "rgba(16,185,129,.08)" : "rgba(128,128,128,.06)" }}>
                                      <span className="text-[11px] font-medium" style={{ color:"var(--foreground)" }}>
                                        #{inst.installmentNumber}
                                      </span>
                                      <span className="text-[11px]" style={{ color:"var(--muted)" }}>
                                        {formatDate(inst.dueDate)}
                                      </span>
                                      <span className="text-[11px] font-bold" style={{ color:"var(--foreground)" }}>
                                        {formatCurrency(inst.amount)}
                                      </span>
                                      {inst.isPaid ? (
                                        <span className="text-[10px] font-bold flex items-center gap-1" style={{ color:"#10b981" }}>
                                          <CheckCircle2 className="w-3 h-3" /> مدفوع
                                        </span>
                                      ) : (
                                        <button onClick={() => handlePay(inst.id)} disabled={payingId === inst.id}
                                          className="text-[10px] font-bold px-2 py-1 rounded-md text-white disabled:opacity-60"
                                          style={{ background:"linear-gradient(135deg,#6366f1,#7c3aed)" }}>
                                          {payingId === inst.id ? "..." : "تحصيل"}
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>

                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 flex items-center justify-between text-xs border-t"
            style={{ borderColor:"var(--card-border)", background:"rgba(128,128,128,.04)", color:"var(--muted)" }}>
            <span>إجمالي قيمة المبيعات المعروضة</span>
            <span className="font-semibold" style={{ color:"#6366f1" }}>{formatCurrency(stats.totalSales)}</span>
          </div>
        </div>
      )}

      {/* ── Add Modal ── */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="إضافة عملية بيع" size="lg">
        <form onSubmit={handleAdd} className="space-y-4">

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color:"var(--muted)" }}>
                المشروع <span className="text-red-400">*</span>
              </label>
              <select required value={formUnit} onChange={e => handleFormUnitChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none"
                style={inputStyle()}>
                <option value="">اختر مشروع...</option>
                {units.map(u => (
                  <option key={u.id} value={u.id}>{u.name ?? u.code}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color:"var(--muted)" }}>
                الشقة <span className="text-red-400">*</span>
              </label>
              <select required disabled={!formUnit || loadingApts}
                value={form.apartmentId || ""}
                onChange={e => setForm(p => ({ ...p, apartmentId: parseInt(e.target.value) || 0 }))}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none disabled:opacity-60"
                style={inputStyle()}>
                <option value="">
                  {!formUnit ? "اختر المشروع أولاً" : loadingApts ? "جاري التحميل..." : "اختر شقة..."}
                </option>
                {available.map(a => (
                  <option key={a.apartmentId} value={a.apartmentId}>
                    شقة {a.apartmentNumber} — الطابق {a.floor ?? "—"} ({a.statusName ?? ""})
                  </option>
                ))}
              </select>
              {formUnit && !loadingApts && available.length === 0 && (
                <p className="text-[11px] mt-1" style={{ color:"#f59e0b" }}>لا توجد شقق متاحة في هذا المشروع</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color:"var(--muted)" }}>
                اسم المشتري <span className="text-red-400">*</span>
              </label>
              <input required value={form.buyerName ?? ""}
                onChange={e => setForm(p => ({ ...p, buyerName: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none"
                style={inputStyle()} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color:"var(--muted)" }}>التليفون</label>
              <input value={form.buyerPhone ?? ""}
                onChange={e => setForm(p => ({ ...p, buyerPhone: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none"
                style={inputStyle()} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color:"var(--muted)" }}>الرقم القومي</label>
              <input value={form.buyerNationalId ?? ""}
                onChange={e => setForm(p => ({ ...p, buyerNationalId: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none"
                style={inputStyle()} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color:"var(--muted)" }}>
                ثمن الشقة <span className="text-red-400">*</span>
              </label>
              <input required type="number" min={0} step={0.01} value={form.totalPrice || ""}
                onChange={e => setForm(p => ({ ...p, totalPrice: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none"
                style={inputStyle()} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color:"var(--muted)" }}>المقدم</label>
              <input type="number" min={0} step={0.01} value={form.downPayment || ""}
                onChange={e => setForm(p => ({ ...p, downPayment: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none"
                style={inputStyle()} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color:"var(--muted)" }}>
                مدة التقسيط (شهر) <span className="text-red-400">*</span>
              </label>
              <input required type="number" min={1} step={1} value={form.installmentMonthsCount || ""}
                onChange={e => setForm(p => ({ ...p, installmentMonthsCount: parseInt(e.target.value) || 0 }))}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none"
                style={inputStyle()} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color:"var(--muted)" }}>تاريخ البيع</label>
              <input type="date" value={(form.saleDate ?? "").slice(0, 10)}
                onChange={e => setForm(p => ({ ...p, saleDate: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none"
                style={inputStyle()} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color:"var(--muted)" }}>تاريخ أول قسط</label>
              <input type="date" value={(form.firstInstallmentDueDate ?? "").slice(0, 10)}
                onChange={e => setForm(p => ({ ...p, firstInstallmentDueDate: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none"
                style={inputStyle()} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color:"var(--muted)" }}>ملاحظات</label>
            <textarea rows={2} value={form.notes ?? ""}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none resize-none"
              style={inputStyle()} />
          </div>

          {/* Live preview */}
          <div className="rounded-xl p-3 flex flex-wrap gap-5"
            style={{ background:"rgba(99,102,241,.06)", border:"1px solid rgba(99,102,241,.2)" }}>
            {[
              { label:"المتبقي بعد المقدم", value:formatCurrency(Math.max((form.totalPrice ?? 0) - (form.downPayment ?? 0), 0)), clr:"#6366f1" },
              { label:"عدد الأقساط",        value:String(form.installmentMonthsCount ?? 0),  clr:"#0ea5e9" },
              { label:"القسط الشهري",       value:formatCurrency(previewMonthly),            clr:"#7c3aed" },
            ].map(({ label, value, clr }) => (
              <div key={label}>
                <p className="text-[10px]" style={{ color:"var(--muted)" }}>{label}</p>
                <p className="text-sm font-bold" style={{ color:clr }}>{value}</p>
              </div>
            ))}
          </div>

          {formErr && (
            <p className="text-xs p-2.5 rounded-lg" style={{ background:"rgba(239,68,68,.1)", color:"#ef4444" }}>
              {formErr}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
              style={{ background:"linear-gradient(135deg,#6366f1,#7c3aed)" }}>
              {saving ? "جاري الحفظ..." : "حفظ عملية البيع"}
            </button>
            <button type="button" onClick={() => setShowAdd(false)}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors"
              style={cardStyle()}>
              إلغاء
            </button>
          </div>
        </form>
      </Modal>

    </DashboardShell>
  );
}
