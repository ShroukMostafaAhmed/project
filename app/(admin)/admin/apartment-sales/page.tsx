"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus, Home, Building2, RefreshCw, AlertCircle,
  X, ChevronDown, ChevronUp, CheckCircle, Clock,
  DollarSign, CreditCard, Wallet, User,
} from "lucide-react";
import DashboardShell from "@/app/components/layout/DashboardShell";
import PageHeader from "@/app/components/ui/PageHeader";
import Modal from "@/app/components/ui/Modal";
import { ListSkeleton, Skeleton } from "@/app/components/ui/Skeleton";
import { api } from "@/app/lib/api";
import { useUnits } from "@/app/lib/hooks";
import {
  ApartmentSaleDto, CreateApartmentSaleDto, ApartmentSaleInstallmentDto,
  ApartmentDto,
} from "@/app/lib/types";
import { formatCurrency, formatDate } from "@/app/lib/utils";

function cStyle(): React.CSSProperties {
  return { background: "var(--card)", border: "1px solid var(--card-border)" };
}
function iStyle(): React.CSSProperties {
  return { background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--foreground)" };
}
const ic = "w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none transition-all";

const today = new Date().toISOString().split("T")[0];
const EMPTY_FORM: Omit<CreateApartmentSaleDto, "apartmentId"> & { apartmentId: string } = {
  apartmentId:            "",
  buyerName:              "",
  buyerPhone:             "",
  buyerNationalId:        "",
  totalPrice:             0,
  downPayment:            0,
  installmentMonthsCount: 12,
  saleDate:               today,
  firstInstallmentDueDate: "",
  notes:                  "",
};

export default function ApartmentSalesPage() {
  const { units, loading: luUnits } = useUnits();

  const [sales,       setSales]       = useState<ApartmentSaleDto[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [expandedId,  setExpandedId]  = useState<number | null>(null);
  const [filterUnit,  setFilterUnit]  = useState("");
  const [search,      setSearch]      = useState("");

  /* add sale modal */
  const [showAdd,     setShowAdd]     = useState(false);
  const [form,        setForm]        = useState({ ...EMPTY_FORM });
  const [saving,      setSaving]      = useState(false);
  const [formErr,     setFormErr]     = useState("");

  /* unit → apartments (for selector) */
  const [selUnitId,   setSelUnitId]   = useState("");
  const [apartments,  setApartments]  = useState<ApartmentDto[]>([]);
  const [aptsLoading, setAptsLoading] = useState(false);

  /* pay installment modal */
  const [payTarget,   setPayTarget]   = useState<ApartmentSaleInstallmentDto | null>(null);
  const [payNotes,    setPayNotes]    = useState("");
  const [paySaving,   setPaySaving]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const data = await api.apartmentSales.list();
      setSales(Array.isArray(data) ? data : []);
    } catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* load apartments when unit selected in form */
  useEffect(() => {
    if (!selUnitId) { setApartments([]); return; }
    setAptsLoading(true);
    api.apartments.byUnit(parseInt(selUnitId))
      .then(data => setApartments(Array.isArray(data) ? data : []))
      .catch(() => setApartments([]))
      .finally(() => setAptsLoading(false));
  }, [selUnitId]);

  /* IDs الشقق اللي ليها صفقة بيع مسجلة بالفعل */
  const soldApartmentIds = useMemo(
    () => new Set(sales.map(s => s.apartmentId)),
    [sales]
  );

  /* الشقق المتاحة فقط (تستبعد أي شقة مباعة بالفعل) داخل الوحدة المختارة */
  const availableApartments = useMemo(
    () => apartments.filter(a => !soldApartmentIds.has(a.id)),
    [apartments, soldApartmentIds]
  );

  /* filter */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return sales.filter(s => {
      const mUnit = !filterUnit || String(s.unitId) === filterUnit;
      const mQ    = !q ||
        (s.buyerName     ?? "").toLowerCase().includes(q) ||
        (s.apartmentNumber ?? "").toLowerCase().includes(q) ||
        (s.unitName      ?? "").toLowerCase().includes(q);
      return mUnit && mQ;
    });
  }, [sales, filterUnit, search]);

  /* computed per sale */
  function saleStats(s: ApartmentSaleDto) {
    const installments = s.installments ?? [];
    const paid    = installments.filter(i => i.isPaid).length;
    const total   = installments.length;
    const paidAmt = installments.filter(i => i.isPaid).reduce((a, i) => a + i.amount, 0);
    const remaining = s.totalPrice - s.downPayment - paidAmt;
    return { paid, total, paidAmt, remaining };
  }

  /* create sale */
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.apartmentId) { setFormErr("اختر الشقة"); return; }
    // حماية إضافية: تأكيد إن الشقة المختارة لسه متاحة قبل الإرسال
    if (soldApartmentIds.has(parseInt(form.apartmentId))) {
      setFormErr("هذه الشقة مباعة بالفعل، برجاء اختيار شقة أخرى");
      return;
    }
    setSaving(true); setFormErr("");
    try {
      await api.apartmentSales.create({
        apartmentId:            parseInt(form.apartmentId),
        buyerName:              form.buyerName      || null,
        buyerPhone:             form.buyerPhone     || null,
        buyerNationalId:        form.buyerNationalId || null,
        totalPrice:             Number(form.totalPrice),
        downPayment:            Number(form.downPayment),
        installmentMonthsCount: Number(form.installmentMonthsCount),
        saleDate:               form.saleDate       || null,
        firstInstallmentDueDate: form.firstInstallmentDueDate || null,
        notes:                  form.notes || null,
      } as CreateApartmentSaleDto);
      setShowAdd(false);
      setForm({ ...EMPTY_FORM });
      setSelUnitId("");
      await load();
    } catch (err) { setFormErr((err as Error).message); }
    finally { setSaving(false); }
  }

  /* pay installment */
  async function handlePay() {
    if (!payTarget) return;
    setPaySaving(true);
    try {
      await api.apartmentSales.payInstallment(payTarget.id, {
        paidDate: today,
        notes:    payNotes || null,
      });
      setPayTarget(null);
      await load();
    } catch (err) { alert((err as Error).message); }
    finally { setPaySaving(false); }
  }

  /* monthly installment preview */
  const monthlyPreview = form.totalPrice > 0 && form.installmentMonthsCount > 0
    ? (Number(form.totalPrice) - Number(form.downPayment)) / Number(form.installmentMonthsCount)
    : 0;

  return (
    <DashboardShell title="مبيعات الشقق">
      <PageHeader
        title="مبيعات الشقق"
        subtitle={`${sales.length} صفقة مسجلة`}
        actions={
          <div className="flex gap-2">
            <button onClick={load} className="w-9 h-9 rounded-xl border flex items-center justify-center" style={cStyle()}>
              <RefreshCw className="w-4 h-4" style={{ color: "var(--muted)" }} />
            </button>
            <button onClick={() => { setShowAdd(true); setFormErr(""); setForm({ ...EMPTY_FORM }); setSelUnitId(""); }}
              className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl text-white"
              style={{ background: "linear-gradient(135deg,#6366f1,#7c3aed)", boxShadow: "0 3px 12px rgba(99,102,241,.3)" }}>
              <Plus className="w-4 h-4" /> صفقة جديدة
            </button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4 no-print">
        <div className="relative flex-1 min-w-48">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث باسم المشتري أو الشقة..."
            className="w-full pr-4 pl-8 py-2 rounded-xl text-sm border focus:outline-none" style={iStyle()} />
          {search && <button onClick={() => setSearch("")} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }}><X className="w-3.5 h-3.5" /></button>}
        </div>
        <div className="relative">
          <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--muted)" }} />
          <select value={filterUnit} onChange={e => setFilterUnit(e.target.value)}
            className="pr-9 pl-4 py-2 rounded-xl text-sm border focus:outline-none appearance-none min-w-44" style={iStyle()}>
            <option value="">كل المشاريع</option>
            {units.map(u => <option key={u.id} value={u.id}>{u.name ?? u.code}</option>)}
          </select>
        </div>
        {(search || filterUnit) && (
          <button onClick={() => { setSearch(""); setFilterUnit(""); }}
            className="px-3 py-2 rounded-xl text-xs font-medium border"
            style={{ color: "#ef4444", borderColor: "rgba(239,68,68,.3)", background: "rgba(239,68,68,.06)" }}>مسح</button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl mb-4 text-sm"
          style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.25)", color: "#ef4444" }}>
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Sales list */}
      {loading ? <ListSkeleton rows={4} cols={5} /> : (
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border py-16 text-center" style={cStyle()}>
              <Home className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: "var(--muted)" }} />
              <p className="text-sm" style={{ color: "var(--muted)" }}>لا توجد صفقات مسجلة</p>
            </div>
          ) : filtered.map(s => {
            const stats   = saleStats(s);
            const isOpen  = expandedId === s.id;
            const paidPct = stats.total > 0 ? (stats.paid / stats.total) * 100 : 0;

            return (
              <div key={s.id} className="rounded-2xl border overflow-hidden" style={cStyle()}>
                {/* Header */}
                <div
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors"
                  style={{ background: isOpen ? "rgba(99,102,241,.04)" : "transparent" }}
                  onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = "rgba(128,128,128,.04)"; }}
                  onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = "transparent"; }}
                  onClick={() => setExpandedId(isOpen ? null : s.id)}>
                  {/* Apartment badge */}
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ background: "linear-gradient(135deg,#6366f1,#7c3aed)" }}>
                    <Home className="w-5 h-5" />
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm" style={{ color: "var(--foreground)" }}>
                      شقة {s.apartmentNumber ?? s.apartmentId}
                      {s.floor && <span className="font-normal text-xs mr-2" style={{ color: "var(--muted)" }}>طابق {s.floor}</span>}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                      {s.unitName ?? `وحدة #${s.unitId}`}
                      {s.buyerName && <span className="mr-2">· {s.buyerName}</span>}
                      <span className="mr-2">· {formatDate(s.saleDate)}</span>
                    </p>
                  </div>
                  {/* Stats */}
                  <div className="hidden sm:flex items-center gap-6 shrink-0">
                    <div className="text-center">
                      <p className="text-[11px] mb-1" style={{ color: "var(--muted)" }}>السعر الكلي</p>
                      <p className="text-sm font-bold" style={{ color: "var(--foreground)" }}>{formatCurrency(s.totalPrice)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[11px] mb-1" style={{ color: "var(--muted)" }}>القسط الشهري</p>
                      <p className="text-sm font-bold" style={{ color: "#6366f1" }}>{formatCurrency(s.monthlyInstallmentAmount)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[11px] mb-1" style={{ color: "var(--muted)" }}>المتبقي</p>
                      <p className="text-sm font-bold" style={{ color: stats.remaining > 0 ? "#f59e0b" : "#10b981" }}>
                        {stats.remaining > 0 ? formatCurrency(stats.remaining) : "مسدَّد ✓"}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[11px] mb-1" style={{ color: "var(--muted)" }}>الأقساط</p>
                      <p className="text-sm font-bold" style={{ color: stats.paid === stats.total && stats.total > 0 ? "#10b981" : "var(--foreground)" }}>
                        {stats.paid}/{stats.total}
                      </p>
                    </div>
                  </div>
                  {isOpen
                    ? <ChevronUp className="w-4 h-4 shrink-0" style={{ color: "var(--muted)" }} />
                    : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: "var(--muted)" }} />}
                </div>

                {/* Expanded */}
                {isOpen && (
                  <div className="border-t px-5 pb-5 pt-4 space-y-4" style={{ borderColor: "var(--card-border)" }}>
                    {/* Summary cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: "السعر الكلي",    value: s.totalPrice,                       clr: "#6366f1", icon: DollarSign  },
                        { label: "المقدم",          value: s.downPayment,                      clr: "#10b981", icon: CreditCard  },
                        { label: "القسط الشهري",   value: s.monthlyInstallmentAmount,         clr: "#6366f1", icon: Wallet      },
                        { label: "المتبقي",         value: stats.remaining,                    clr: stats.remaining > 0 ? "#f59e0b" : "#10b981", icon: Wallet },
                      ].map(({ label, value, clr, icon: Icon }) => (
                        <div key={label} className="rounded-xl p-3 flex items-center gap-2.5" style={{ background: `${clr}10` }}>
                          <Icon className="w-4 h-4 shrink-0" style={{ color: clr }} />
                          <div>
                            <p className="text-[10px] font-medium" style={{ color: "var(--muted)" }}>{label}</p>
                            <p className="text-sm font-bold" style={{ color: clr }}>{formatCurrency(value)}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Buyer info */}
                    {(s.buyerName || s.buyerPhone || s.buyerNationalId) && (
                      <div className="rounded-xl p-3 flex flex-wrap gap-4" style={{ background: "rgba(128,128,128,.05)", border: "1px solid var(--card-border)" }}>
                        <User className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--muted)" }} />
                        {s.buyerName      && <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{s.buyerName}</span>}
                        {s.buyerPhone     && <span className="text-xs" style={{ color: "var(--muted)" }}>📞 {s.buyerPhone}</span>}
                        {s.buyerNationalId && <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>🪪 {s.buyerNationalId}</span>}
                      </div>
                    )}

                    {/* Progress bar */}
                    <div>
                      <div className="flex justify-between text-xs mb-1.5" style={{ color: "var(--muted)" }}>
                        <span>تقدم السداد</span>
                        <span>{stats.paid} من {stats.total} قسط ({paidPct.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(128,128,128,.15)" }}>
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${paidPct}%`, background: "linear-gradient(90deg,#6366f1,#10b981)" }} />
                      </div>
                    </div>

                    {/* Installments table */}
                    {s.installments && s.installments.length > 0 && (
                      <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--card-border)" }}>
                        <div className="px-4 py-2.5 text-xs font-semibold" style={{ background: "rgba(99,102,241,.06)", color: "#6366f1" }}>
                          جدول الأقساط ({s.installments.length} قسط)
                        </div>
                        <table className="w-full text-xs">
                          <thead>
                            <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                              {["#", "تاريخ الاستحقاق", "المبلغ", "الحالة", "تاريخ الدفع", ""].map((h, i) => (
                                <th key={i} style={{ padding: "7px 10px", color: "var(--muted)", fontWeight: 600, textAlign: i === 0 ? "center" : "right", fontSize: 10 }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {s.installments.map(inst => (
                              <tr key={inst.id} style={{ borderBottom: "1px solid var(--card-border)" }}
                                onMouseEnter={e => e.currentTarget.style.background = "rgba(128,128,128,.04)"}
                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                <td style={{ padding: "8px 10px", textAlign: "center", color: "var(--muted)" }}>{inst.installmentNumber}</td>
                                <td style={{ padding: "8px 10px", color: "var(--foreground)" }}>{formatDate(inst.dueDate)}</td>
                                <td style={{ padding: "8px 10px", fontWeight: 700, color: "#6366f1" }}>{formatCurrency(inst.amount)}</td>
                                <td style={{ padding: "8px 10px" }}>
                                  {inst.isPaid ? (
                                    <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: "#10b981" }}>
                                      <CheckCircle className="w-3.5 h-3.5" /> مدفوع
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: "#f59e0b" }}>
                                      <Clock className="w-3.5 h-3.5" /> معلق
                                    </span>
                                  )}
                                </td>
                                <td style={{ padding: "8px 10px", color: "var(--muted)" }}>
                                  {inst.paidDate ? formatDate(inst.paidDate) : "—"}
                                </td>
                                <td style={{ padding: "8px 10px", textAlign: "center" }}>
                                  {!inst.isPaid && (
                                    <button onClick={() => { setPayTarget(inst); setPayNotes(""); }}
                                      className="text-[11px] font-semibold px-2.5 py-1 rounded-lg"
                                      style={{ background: "rgba(16,185,129,.1)", color: "#10b981", border: "1px solid rgba(16,185,129,.2)" }}>
                                      سداد
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Payout breakdown */}
                    {s.shareholdersPayoutBreakdown && s.shareholdersPayoutBreakdown.length > 0 && (
                      <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--card-border)" }}>
                        <div className="px-4 py-2.5 text-xs font-semibold" style={{ background: "rgba(16,185,129,.06)", color: "#10b981" }}>
                          توزيع العائد على المساهمين
                        </div>
                        <table className="w-full text-xs">
                          <thead>
                            <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                              {["المساهم", "النسبة", "نصيبه"].map((h, i) => (
                                <th key={h} style={{ padding: "7px 12px", color: "var(--muted)", fontWeight: 600, textAlign: i === 0 ? "right" : "center", fontSize: 10 }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {s.shareholdersPayoutBreakdown.map(p => (
                              <tr key={p.shareholderId} style={{ borderBottom: "1px solid var(--card-border)" }}>
                                <td style={{ padding: "8px 12px", color: "var(--foreground)", fontWeight: 500 }}>{p.shareholderName ?? `#${p.shareholderId}`}</td>
                                <td style={{ padding: "8px 12px", color: "var(--muted)", textAlign: "center" }}>{p.ownershipPercentage.toFixed(1)}%</td>
                                <td style={{ padding: "8px 12px", fontWeight: 700, color: "#10b981", textAlign: "center" }}>{formatCurrency(p.shareAmount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add Sale Modal ── */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="صفقة بيع جديدة" size="md">
        <form onSubmit={handleCreate} className="space-y-4">
          {/* اختيار المشروع ثم الشقة */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted)" }}>
                المشروع <span className="text-red-400">*</span>
              </label>
              <select value={selUnitId} onChange={e => { setSelUnitId(e.target.value); setForm(p => ({ ...p, apartmentId: "" })); }}
                className={ic} style={iStyle()}>
                <option value="">اختر المشروع...</option>
                {units.map(u => <option key={u.id} value={u.id}>{u.name ?? u.code}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted)" }}>
                الشقة <span className="text-red-400">*</span>
              </label>
              <select value={form.apartmentId} onChange={e => setForm(p => ({ ...p, apartmentId: e.target.value }))}
                disabled={!selUnitId || aptsLoading}
                className={ic} style={selUnitId ? iStyle() : { ...iStyle(), opacity: .6, cursor: "not-allowed" }}>
                <option value="">
                  {aptsLoading
                    ? "جاري التحميل..."
                    : (selUnitId && availableApartments.length === 0
                        ? "لا توجد شقق متاحة في هذا المشروع"
                        : "اختر الشقة...")}
                </option>
                {availableApartments.map(a => (
                  <option key={a.id} value={a.id}>شقة {a.apartmentNumber ?? a.id} — طابق {a.floor ?? "—"}</option>
                ))}
              </select>
              
            </div>
          </div>

          {/* بيانات المشتري */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted)" }}>اسم المشتري</label>
              <input type="text" value={form.buyerName ?? ""} onChange={e => setForm(p => ({ ...p, buyerName: e.target.value }))}
                placeholder="الاسم الكامل" className={ic} style={iStyle()} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted)" }}>الهاتف</label>
              <input type="tel" value={form.buyerPhone ?? ""} onChange={e => setForm(p => ({ ...p, buyerPhone: e.target.value }))}
                placeholder="01xxxxxxxxx" className={ic} style={iStyle()} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted)" }}>الرقم القومي</label>
            <input type="text" value={form.buyerNationalId ?? ""} onChange={e => setForm(p => ({ ...p, buyerNationalId: e.target.value }))}
              placeholder="14 رقم" className={ic} style={iStyle()} />
          </div>

          {/* الأسعار */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted)" }}>
                السعر الكلي (ج.م) <span className="text-red-400">*</span>
              </label>
              <input type="number" min={0} step="0.01" required value={form.totalPrice || ""}
                onChange={e => setForm(p => ({ ...p, totalPrice: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00" className={ic} style={{ ...iStyle(), fontWeight: 700 }} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted)" }}>المقدم (ج.م)</label>
              <input type="number" min={0} step="0.01" value={form.downPayment || ""}
                onChange={e => setForm(p => ({ ...p, downPayment: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00" className={ic} style={iStyle()} />
            </div>
          </div>

          {/* الأقساط */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted)" }}>
              عدد أشهر التقسيط <span className="text-red-400">*</span>
            </label>
            <input type="number" min={1} max={360} required value={form.installmentMonthsCount}
              onChange={e => setForm(p => ({ ...p, installmentMonthsCount: parseInt(e.target.value) || 1 }))}
              className={ic} style={iStyle()} />
            {monthlyPreview > 0 && (
              <p className="text-xs mt-1.5 px-1 font-semibold" style={{ color: "#6366f1" }}>
                القسط الشهري: {formatCurrency(monthlyPreview)}
              </p>
            )}
          </div>

          {/* التواريخ */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted)" }}>تاريخ البيع</label>
              <input type="date" value={form.saleDate ?? today}
                onChange={e => setForm(p => ({ ...p, saleDate: e.target.value }))}
                className={ic} style={iStyle()} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted)" }}>أول قسط</label>
              <input type="date" value={form.firstInstallmentDueDate ?? ""}
                onChange={e => setForm(p => ({ ...p, firstInstallmentDueDate: e.target.value }))}
                className={ic} style={iStyle()} />
            </div>
          </div>

          {/* ملاحظات */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted)" }}>ملاحظات</label>
            <textarea value={form.notes ?? ""} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              rows={2} placeholder="أي ملاحظات..." className={ic} style={{ ...iStyle(), resize: "vertical" }} />
          </div>

          {formErr && <p className="text-xs p-2.5 rounded-lg" style={{ background: "rgba(239,68,68,.1)", color: "#ef4444" }}>{formErr}</p>}

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving || !form.apartmentId}
              className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#6366f1,#7c3aed)" }}>
              {saving ? "جاري الحفظ..." : "تسجيل الصفقة"}
            </button>
            <button type="button" onClick={() => setShowAdd(false)}
              className="flex-1 py-3 rounded-xl text-sm font-medium border" style={cStyle()}>إلغاء</button>
          </div>
        </form>
      </Modal>

      {/* ── Pay Installment Modal ── */}
      <Modal open={!!payTarget} onClose={() => setPayTarget(null)} title="تسجيل سداد قسط" size="sm">
        {payTarget && (
          <div className="space-y-4">
            <div className="rounded-xl p-4" style={{ background: "rgba(99,102,241,.07)", border: "1px solid rgba(99,102,241,.15)" }}>
              <p className="text-xs" style={{ color: "var(--muted)" }}>قسط رقم {payTarget.installmentNumber}</p>
              <p className="text-xl font-bold" style={{ color: "#6366f1" }}>{formatCurrency(payTarget.amount)}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>استحقاق: {formatDate(payTarget.dueDate)}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted)" }}>ملاحظات</label>
              <input type="text" value={payNotes} onChange={e => setPayNotes(e.target.value)}
                placeholder="مثال: نقدي، تحويل..." className={ic} style={iStyle()} />
            </div>
            <div className="flex gap-2">
              <button onClick={handlePay} disabled={paySaving}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: "linear-gradient(135deg,#10b981,#059669)" }}>
                {paySaving ? "جاري الحفظ..." : "تأكيد السداد"}
              </button>
              <button onClick={() => setPayTarget(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium border" style={cStyle()}>إلغاء</button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardShell>
  );
}