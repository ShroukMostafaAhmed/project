"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus, TrendingDown, Wallet, RefreshCw, X,
  AlertCircle, Building2, Users, Pencil, Trash2,
  CreditCard, BadgeDollarSign, BookOpen,
  ChevronDown, ChevronUp, Calendar, PiggyBank,
} from "lucide-react";
import DashboardShell from "@/app/components/layout/DashboardShell";
import PageHeader from "@/app/components/ui/PageHeader";
import Modal from "@/app/components/ui/Modal";
import { ListSkeleton, Skeleton } from "@/app/components/ui/Skeleton";
import { api } from "@/app/lib/api";
import { useUnits, useShareholders } from "@/app/lib/hooks";
import {
  FinanceDto, CreateFinanceDto, FinanceType,
  ProjectFinanceSummaryDto, ShareholderFinanceReportDto,
  UnitAuditDto, UnitAuditStatus,
} from "@/app/lib/types";
import { formatCurrency, formatDate } from "@/app/lib/utils";

function cStyle(): React.CSSProperties {
  return { background: "var(--card)", border: "1px solid var(--card-border)" };
}
function iStyle(): React.CSSProperties {
  return { background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--foreground)" };
}
const ic = "w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none transition-all";

/** بتبني تاريخ YYYY-MM-DD من غير أي تحويل UTC — تمنع مشكلة الـ timezone */
function toDateOnlyString(d: Date): string {
  const y   = d.getFullYear();
  const m   = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * الـ API بترجع حقول إضافية على مستوى الوحدة (unitBaseCosts, shareholderBaseCostsShare,
 * unitProjectExpenses, shareholderAuditExpensesShare, generalPaidAmount, auditPaidAmount,
 * excessGeneralPayment, auditDeductedFromCredit, creditBalance) لسه معملهاش تعريف في
 * ShareholderFinanceReportDto. بنقراها بأمان من غير ما نكسر التايبات الحالية.
 */
function creditOf(u: unknown): number {
  const v = (u as { creditBalance?: number })?.creditBalance;
  return typeof v === "number" ? v : 0;
}
function generalPaidOf(u: unknown): number {
  const v = (u as { generalPaidAmount?: number })?.generalPaidAmount;
  return typeof v === "number" ? v : 0;
}
function auditPaidOf(u: unknown): number {
  const v = (u as { auditPaidAmount?: number })?.auditPaidAmount;
  return typeof v === "number" ? v : 0;
}
/** حصة المساهم من التكلفة الأساسية للوحدة (بعيدًا عن مصاريف الجرود) — أساس السداد العام */
function baseCostsShareOf(u: unknown): number {
  const v = (u as { shareholderBaseCostsShare?: number })?.shareholderBaseCostsShare;
  return typeof v === "number" ? v : 0;
}
/** الدين "العام" فقط (بدون ديون الجرود) = حصته الأساسية − اللي سدده كسداد عام */
function generalDebtOf(u: unknown): number {
  return Math.max(0, baseCostsShareOf(u) - generalPaidOf(u));
}

const EMPTY_FORM = {
  unitId: "", shareholderId: "", amount: "", description: "", notes: "",
  date: new Date().toISOString().split("T")[0],
  type: FinanceType.Expense as FinanceType,
};

const EMPTY_PAY = {
  auditId: "" as string,
  amount:  "",
  notes:   "",
  date:    new Date().toISOString().split("T")[0],
};

export default function AdminFinancePage() {
  const { units, loading: luUnits } = useUnits();
  const { shareholders }            = useShareholders();

  const [activeTab, setActiveTab] = useState<"units" | "shareholders">("units");

  /* ── Units tab state ── */
  const [activeUnitId, setActiveUnitId] = useState<number | "all" | null>(null);
  const [finances,     setFinances]     = useState<FinanceDto[]>([]);
  const [summary,      setSummary]      = useState<ProjectFinanceSummaryDto | null>(null);
  const [unitLoading,  setUnitLoading]  = useState(false);
  const [unitError,    setUnitError]    = useState("");
  const [unitSearch,   setUnitSearch]   = useState("");

  /* finance modal */
  const [showAdd,  setShowAdd]  = useState(false);
  const [editItem, setEditItem] = useState<FinanceDto | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [saving,   setSaving]   = useState(false);
  const [formErr,  setFormErr]  = useState("");
  const [form,     setForm]     = useState({ ...EMPTY_FORM });

  /* unit audit state */
  const [unitAudits,     setUnitAudits]     = useState<UnitAuditDto[]>([]);
  const [auditsLoading,  setAuditsLoading]  = useState(false);
  const [expandedAudit,  setExpandedAudit]  = useState<number | null>(null);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditSaving,    setAuditSaving]    = useState(false);
  const [auditFormErr,   setAuditFormErr]   = useState("");
  const [auditForm, setAuditForm] = useState({ name: "", fromDate: "", toDate: "" });

  const [shReport,   setShReport]   = useState<ShareholderFinanceReportDto[]>([]);
  const [shLoading,  setShLoading]  = useState(false);
  const [shError,    setShError]    = useState("");
  const [expandedSh, setExpandedSh] = useState<number | null>(null);
  const [shUnitAudits, setShUnitAudits] = useState<Record<number, UnitAuditDto[]>>({});
  const [shPayments, setShPayments] = useState<Record<string, number>>({});
  const [shFinancesLoaded, setShFinancesLoaded] = useState<Record<number, boolean>>({});

  const [showPayModal, setShowPayModal] = useState(false);
  const [payTarget,    setPayTarget]    = useState<{
    shareholderId:   number;
    shareholderName: string | null;
    unitId:          number;
    unitName:        string | null;
    auditId:         number | null;
    auditName:       string;
    maxAmount:       number;
    capped:          boolean;
    currentCredit:   number;
  } | null>(null);
  const [payForm,  setPayForm]  = useState({ ...EMPTY_PAY });
  const [paySaving,setPaySaving]= useState(false);
  const [payErr,   setPayErr]   = useState("");

  /* ── init: pick first unit ── */
  useEffect(() => {
    if (!luUnits && units.length > 0 && activeUnitId === null) setActiveUnitId(units[0].id);
  }, [luUnits, units, activeUnitId]);

  /* ── load finances ── */
  const loadFinances = useCallback(async () => {
    if (activeUnitId === null) return;
    setUnitLoading(true); setUnitError("");
    try {
      const params = activeUnitId !== "all" ? { unitId: activeUnitId as number } : undefined;
      const data   = await api.finances.list(params);
      setFinances(Array.isArray(data) ? data : []);
      if (activeUnitId !== "all") {
        const sum = await api.finances.summaryByUnit(activeUnitId as number).catch(() => null);
        setSummary(sum);
      } else { setSummary(null); }
    } catch (err) { setUnitError((err as Error).message); }
    finally { setUnitLoading(false); }
  }, [activeUnitId]);

  /* ── load unit audits ── */
  const loadUnitAudits = useCallback(async () => {
    if (!activeUnitId || activeUnitId === "all") { setUnitAudits([]); return; }
    setAuditsLoading(true);
    try {
      const data = await api.unitAudits.list(activeUnitId as number);
      setUnitAudits(Array.isArray(data) ? data : []);
    } catch { setUnitAudits([]); }
    finally { setAuditsLoading(false); }
  }, [activeUnitId]);

  useEffect(() => { loadFinances();    }, [loadFinances]);
  useEffect(() => { loadUnitAudits();  }, [loadUnitAudits]);

  /* ── shareholders report ── */
  const loadShReport = useCallback(async () => {
    setShLoading(true); setShError("");
    try { const d = await api.finances.shareholdersReport(); setShReport(Array.isArray(d) ? d : []); }
    catch (err) { setShError((err as Error).message); }
    finally { setShLoading(false); }
  }, []);
  useEffect(() => { if (activeTab === "shareholders" && shReport.length === 0) loadShReport(); }, [activeTab, loadShReport, shReport.length]);

  function openPayModal(params: {
    shareholderId:   number;
    shareholderName: string | null;
    unitId:          number;
    unitName:        string | null;
    auditId:         number | null;
    auditName:       string;
    debtAmount:      number;
    currentCredit?:  number;
  }) {
    setPayTarget({
      shareholderId:   params.shareholderId,
      shareholderName: params.shareholderName,
      unitId:          params.unitId,
      unitName:        params.unitName,
      auditId:         params.auditId,
      auditName:       params.auditName,
      maxAmount:       params.debtAmount,
      capped:          params.auditId !== null,
      currentCredit:   params.currentCredit ?? 0,
    });
    setPayForm({ ...EMPTY_PAY, auditId: params.auditId ? String(params.auditId) : "" });
    setPayErr("");
    setShowPayModal(true);
  }

async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!payTarget) return;
    const amt = parseFloat(payForm.amount);
    if (!amt || amt <= 0) { setPayErr("أدخل مبلغ صح"); return; }
    setPaySaving(true); setPayErr("");
    try {
      await api.finances.create({
        date:          payForm.date,
        amount:        amt,
        type:          FinanceType.Payment,
        unitId:        payTarget.unitId,
        shareholderId: payTarget.shareholderId,
        // auditId بس لو السداد مرتبط بجرد — لو null بيتسجل كسداد عام
        ...(payTarget.auditId !== null ? { auditId: payTarget.auditId } : {}),
        notes:         payForm.notes || null,
        description:   payTarget.auditId
          ? `سداد — ${payTarget.auditName}`
          : `سداد عام — ${payTarget.unitName ?? ""}`,
      } as CreateFinanceDto);
      setShowPayModal(false);

      // حدّث المدفوعات في الـ state مباشرة
      if (payTarget.auditId !== null) {
        const key = `${payTarget.unitId}-${payTarget.auditId}-${payTarget.shareholderId}`;
        setShPayments(prev => ({ ...prev, [key]: (prev[key] ?? 0) + amt }));
      }

      // reset تقرير المساهمين عشان يتحدث فيه creditBalance/debtAmount من السيرفر
      setShReport([]);
      setShFinancesLoaded({});
      await loadFinances();
    } catch (err) { setPayErr((err as Error).message); }
    finally { setPaySaving(false); }
  }

  /* ── filtered rows ── */
  const filtered = useMemo(() => {
    const q = unitSearch.toLowerCase();
    return finances.filter(f =>
      !q || (f.description ?? "").toLowerCase().includes(q) ||
      (f.unitName ?? "").toLowerCase().includes(q) ||
      (f.shareholderName ?? "").toLowerCase().includes(q)
    );
  }, [finances, unitSearch]);

  const totalDebt = filtered.filter(f => f.type === FinanceType.Expense).reduce((s, f) => s + f.amount, 0);
  const totalPaid = filtered.filter(f => f.type === FinanceType.Payment).reduce((s, f) => s + f.amount, 0);
  const remaining = totalDebt - totalPaid;

  /* ── finance CRUD ── */
  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setFormErr("");
    try {
      if (editItem) {
        await api.finances.update(editItem.id, {
          date: form.date, description: form.description || null,
          amount: parseFloat(form.amount), type: form.type,
          unitId: parseInt(form.unitId),
          shareholderId: form.shareholderId ? parseInt(form.shareholderId) : null,
          notes: form.notes || null,
        });
        setEditItem(null);
      } else {
        await api.finances.create({
          date: form.date, description: form.description || null,
          amount: parseFloat(form.amount), type: form.type,
          unitId: parseInt(form.unitId),
          shareholderId: form.shareholderId ? parseInt(form.shareholderId) : null,
          notes: form.notes || null,
        } as CreateFinanceDto);
        setShowAdd(false);
      }
      await loadFinances();
    } catch (err) { setFormErr((err as Error).message); }
    finally { setSaving(false); }
  }

  function openAdd() {
    setForm({ ...EMPTY_FORM, unitId: activeUnitId !== "all" && activeUnitId !== null ? String(activeUnitId) : "" });
    setFormErr(""); setShowAdd(true);
  }

  function openEdit(f: FinanceDto) {
    setEditItem(f);
    setForm({
      type: f.type, unitId: String(f.unitId),
      shareholderId: f.shareholderId ? String(f.shareholderId) : "",
      amount: String(f.amount), description: f.description ?? "", notes: f.notes ?? "",
      date: f.date && !f.date.startsWith("0001") ? f.date.split("T")[0] : "",
    });
    setFormErr("");
  }

  async function handleDelete() {
    if (!deleteId) return;
    try { await api.finances.delete(deleteId); setDeleteId(null); await loadFinances(); }
    catch (err) { alert((err as Error).message); }
  }

  /* ── unit audit ── */
  const lastAudit = useMemo(() =>
    unitAudits.length
      ? [...unitAudits].sort((a, b) => new Date(b.toDate).getTime() - new Date(a.toDate).getTime())[0]
      : null,
    [unitAudits]
  );

  const hasPendingAudit = unitAudits.some(a => a.status === UnitAuditStatus.Pending);

  function openAuditModal() {
    const autoFrom = lastAudit
      ? (() => { const d = new Date(lastAudit.toDate); d.setDate(d.getDate() + 1); return toDateOnlyString(d); })()
      : "";
    setAuditForm({ name: `جرد ${unitAudits.length + 1}`, fromDate: autoFrom, toDate: "" });
    setAuditFormErr("");
    setShowAuditModal(true);
  }

  async function handleAuditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!auditForm.fromDate || !auditForm.toDate) { setAuditFormErr("اختر الفترة أولاً"); return; }
    if (auditForm.fromDate > auditForm.toDate) { setAuditFormErr("تاريخ البداية لازم يكون قبل النهاية"); return; }
    setAuditSaving(true); setAuditFormErr("");
    try {
      await api.unitAudits.create(activeUnitId as number, {
        name: auditForm.name || `جرد ${unitAudits.length + 1}`,
        fromDate: auditForm.fromDate,
        toDate:   auditForm.toDate,
        previousUnitAuditId: lastAudit?.id ?? null,
      });
      setShowAuditModal(false);
      await loadUnitAudits();
      // reset تبويب المساهمين عشان يتحدث لما يرجعله
      setShReport([]);
    } catch (err) { setAuditFormErr((err as Error).message); }
    finally { setAuditSaving(false); }
  }

  const activeUnitName = activeUnitId !== "all" && activeUnitId !== null
    ? (units.find(u => u.id === activeUnitId)?.name ?? "")
    : "";

  const tabs = [
    { key: "units"        as const, label: "ماليه المشاريع",   icon: Building2 },
    { key: "shareholders" as const, label: "ماليه المساهمين", icon: Users     },
  ];

  return (
    <DashboardShell title="الماليه">
      <PageHeader title="الماليه" subtitle="متابعة المديونيات والمدفوعات لكل مشروع ومساهم" />

      {/* ══ Tabs ══ */}
      <div className="flex gap-1 p-1 rounded-2xl mb-5 w-fit no-print" style={{ background: "var(--input-bg)", border: "1px solid var(--card-border)" }}>
        {tabs.map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.key;
          return (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={isActive
                ? { background: "linear-gradient(135deg,#6366f1,#7c3aed)", color: "#fff", boxShadow: "0 3px 12px rgba(99,102,241,.3)" }
                : { color: "var(--muted)" }}>
              <Icon className="w-4 h-4" />{t.label}
            </button>
          );
        })}
      </div>

    
      {activeTab === "units" && (
        <>
          {luUnits ? (
            <div className="flex gap-2 mb-6">
              {[...Array(3)].map((_, i) => <div key={i} className="h-9 w-24 rounded-xl animate-pulse" style={{ background: "rgba(128,128,128,.1)" }} />)}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 mb-6 items-center justify-between">
              <div className="flex flex-wrap gap-2">
                <button onClick={() => { setActiveUnitId("all"); setUnitSearch(""); setSummary(null); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all"
                  style={activeUnitId === "all"
                    ? { background: "linear-gradient(135deg,#6366f1,#7c3aed)", color: "#fff", borderColor: "transparent", boxShadow: "0 3px 12px rgba(99,102,241,.3)" }
                    : { ...cStyle(), color: "var(--muted)" }}>
                  الكل
                  <span className="text-[11px] px-1.5 py-0.5 rounded-full"
                    style={activeUnitId === "all" ? { background: "rgba(255,255,255,.2)", color: "#fff" } : { background: "rgba(128,128,128,.1)", color: "var(--muted)" }}>
                    {finances.length}
                  </span>
                </button>
                {units.map(u => (
                  <button key={u.id} onClick={() => { setActiveUnitId(u.id); setUnitSearch(""); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all"
                    style={activeUnitId === u.id
                      ? { background: "linear-gradient(135deg,#6366f1,#7c3aed)", color: "#fff", borderColor: "transparent", boxShadow: "0 3px 12px rgba(99,102,241,.3)" }
                      : { ...cStyle(), color: "var(--muted)" }}>
                    {u.name ?? u.code ?? `مشروع ${u.id}`}
                  </button>
                ))}
              </div>
              {/* الأزرار اليمين */}
              <div className="flex gap-2">
                <button onClick={openAdd}
                  className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl text-white"
                  style={{ background: "linear-gradient(135deg,#6366f1,#7c3aed)", boxShadow: "0 3px 12px rgba(99,102,241,.3)" }}>
                  <Plus className="w-4 h-4" /> إضافة حركة
                </button>
                {activeUnitId !== "all" && activeUnitId !== null && (
                  <button onClick={openAuditModal} disabled={hasPendingAudit}
                    className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl transition-all"
                    title={hasPendingAudit ? "يوجد جرد منتظر — انتظر حتى يتقفل أولاً" : ""}
                    style={hasPendingAudit
                      ? { background: "rgba(128,128,128,.1)", color: "var(--muted)", cursor: "not-allowed", border: "1px solid var(--card-border)" }
                      : { background: "rgba(16,185,129,.1)", color: "#10b981", border: "1px solid rgba(16,185,129,.25)" }}>
                    <BookOpen className="w-4 h-4" />
                    {hasPendingAudit ? "جرد منتظر..." : "جرد جديد"}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Summary cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            {[
              { label: "إجمالي المديونية",    value: summary ? summary.totalCost                : totalDebt,
                clr: "#ef4444", bg: "rgba(239,68,68,.1)",   icon: TrendingDown,
                sub: summary ? "التكلفة الكاملة للمشروع" : "مجموع المبالغ المطلوبة" },
              { label: "المسدَّد",             value: summary ? summary.totalPaymentsReceived    : totalPaid,
                clr: "#10b981", bg: "rgba(16,185,129,.1)",  icon: CreditCard,
                sub: "إجمالي الدفعات المستلمة" },
              { label: "المتبقي (الدين)",
                value: summary ? Math.max(0, summary.totalCost - summary.totalPaymentsReceived) : remaining,
                clr: (summary ? Math.max(0, summary.totalCost - summary.totalPaymentsReceived) : remaining) > 0 ? "#f59e0b" : "#10b981",
                bg:  (summary ? Math.max(0, summary.totalCost - summary.totalPaymentsReceived) : remaining) > 0 ? "rgba(245,158,11,.1)" : "rgba(16,185,129,.1)",
                icon: Wallet,
                sub: (summary ? Math.max(0, summary.totalCost - summary.totalPaymentsReceived) : remaining) <= 0 ? "تم السداد بالكامل ✓" : "مستحق الدفع" },
              { label: "مصروفات المشروع",     value: summary ? summary.totalProjectExpenses     : 0,
                clr: "#6366f1", bg: "rgba(99,102,241,.1)",  icon: BadgeDollarSign,
                sub: summary ? "مصاريف تشغيلية تراكمية" : "اختر مشروع لعرض التفاصيل" },
            ].map(({ label, value, clr, bg, icon: Icon, sub }) => (
              <div key={label} className="rounded-2xl p-4 flex items-start gap-3" style={cStyle()}>
                <div className="p-2.5 rounded-xl shrink-0 mt-0.5" style={{ background: bg }}>
                  <Icon className="w-4 h-4" style={{ color: clr }} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium mb-0.5" style={{ color: "var(--muted)" }}>{label}</p>
                  <p className="text-lg font-bold leading-tight" style={{ color: clr }}>{formatCurrency(value)}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--muted)" }}>{sub}</p>
                </div>
              </div>
            ))}
          </div>

          {unitError && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl mb-4 text-sm" style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.25)", color: "#ef4444" }}>
              <AlertCircle className="w-4 h-4 shrink-0" /> {unitError}
            </div>
          )}

          {activeUnitId !== "all" && activeUnitId !== null && (
            <div className="rounded-2xl border overflow-hidden mb-5 shadow-sm" style={cStyle()}>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "var(--card-border)", background: "rgba(128,128,128,.04)" }}>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" style={{ color: "#10b981" }} />
                  <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                    جرود {activeUnitName}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,.1)", color: "#10b981" }}>
                    {unitAudits.length} جرد
                  </span>
                </div>
                <button onClick={loadUnitAudits} className="w-7 h-7 rounded-lg border flex items-center justify-center" style={cStyle()}>
                  <RefreshCw className="w-3 h-3" style={{ color: "var(--muted)" }} />
                </button>
              </div>

              {auditsLoading ? (
                <div className="p-4 space-y-2">
                  {[...Array(2)].map((_, i) => <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: "rgba(128,128,128,.1)" }} />)}
                </div>
              ) : unitAudits.length === 0 ? (
                <div className="py-10 text-center">
                  <Calendar className="w-8 h-8 mx-auto mb-2 opacity-25" style={{ color: "var(--muted)" }} />
                  <p className="text-sm" style={{ color: "var(--muted)" }}>لا توجد جرود لهذا المشروع بعد</p>
                  <button onClick={openAuditModal}
                    className="mt-3 text-xs font-semibold px-3 py-1.5 rounded-lg"
                    style={{ background: "rgba(16,185,129,.1)", color: "#10b981", border: "1px solid rgba(16,185,129,.2)" }}>
                    + أنشئ أول جرد
                  </button>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: "var(--card-border)" }}>
                  {[...unitAudits]
                    .sort((a, b) => new Date(a.fromDate).getTime() - new Date(b.fromDate).getTime())
                    .map((audit, idx) => {
                      const isExp     = expandedAudit === audit.id;
                      const isPending = audit.status === UnitAuditStatus.Pending;
                      const today     = new Date().toISOString().split("T")[0];
                      const closesIn  = isPending
                        ? Math.ceil((new Date(audit.toDate).getTime() - new Date(today).getTime()) / 86400000)
                        : 0;
                      return (
                        <div key={audit.id}>
                          {/* صف الجرد */}
                          <div
                            className="flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-colors"
                            style={{ background: isExp ? "rgba(16,185,129,.04)" : "transparent" }}
                            onMouseEnter={e => { if (!isExp) e.currentTarget.style.background = "rgba(128,128,128,.04)"; }}
                            onMouseLeave={e => { if (!isExp) e.currentTarget.style.background = "transparent"; }}
                            onClick={() => setExpandedAudit(isExp ? null : audit.id)}>
                            {/* رقم دائري */}
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
                              style={{ background: "linear-gradient(135deg,#10b981,#059669)", boxShadow: "0 2px 8px rgba(16,185,129,.3)" }}>
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{audit.name}</p>
                              <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                                {formatDate(audit.fromDate)} — {formatDate(audit.toDate)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {/* status badge */}
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                                style={isPending
                                  ? { background: "rgba(245,158,11,.12)", color: "#f59e0b" }
                                  : { background: "rgba(16,185,129,.1)",  color: "#10b981" }}>
                                {isPending
                                  ? (closesIn > 0 ? `⏳ يقفل بعد ${closesIn} يوم` : "⏳ جاري القفل...")
                                  : "✓ مقفول"}
                              </span>
                              <div className="text-right">
                                <p className="text-sm font-bold" style={{ color: isPending ? "#f59e0b" : "#ef4444" }}>
                                  {formatCurrency(audit.totalExpenses)}
                                </p>
                                <p className="text-[11px]" style={{ color: "var(--muted)" }}>
                                  {isPending ? "معاينة حية" : "إجمالي نهائي"}
                                </p>
                              </div>
                            </div>
                            {isExp ? <ChevronUp className="w-4 h-4 shrink-0" style={{ color: "var(--muted)" }} /> : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: "var(--muted)" }} />}
                          </div>

                          {/* توزيع المساهمين — Accordion */}
                          {isExp && (
                            <div className="px-5 pb-4 pt-2 border-t" style={{ borderColor: "var(--card-border)", background: "rgba(16,185,129,.02)" }}>
                              <p className="text-xs font-semibold mb-2" style={{ color: "var(--muted)" }}>توزيع النصيب على المساهمين</p>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                                      {["المساهم", "النسبة %", "نصيبه"].map((h, i) => (
                                        <th key={h} style={{ color: "var(--muted)", fontSize: 11, fontWeight: 700, padding: "6px 8px", textAlign: i === 0 ? "right" : "center" }}>{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {audit.shareholderShares.map(s => (
                                      <tr key={s.shareholderId} style={{ borderBottom: "1px solid var(--card-border)" }}>
                                        <td style={{ padding: "8px", fontSize: 13, color: "var(--foreground)", fontWeight: 500 }}>{s.shareholderName ?? `#${s.shareholderId}`}</td>
                                        <td style={{ padding: "8px", fontSize: 12, color: "var(--muted)", textAlign: "center" }}>{s.sharePercentage.toFixed(1)}%</td>
                                        <td style={{ padding: "8px", fontSize: 13, fontWeight: 700, color: "#ef4444", textAlign: "center" }}>{formatCurrency(s.shareAmount)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* ════ جدول الحركات ════ */}
          {unitLoading ? <ListSkeleton rows={5} cols={6} /> : (
            <div className="rounded-2xl border overflow-hidden shadow-sm" style={cStyle()}>
              <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "var(--card-border)", background: "rgba(128,128,128,.04)" }}>
                <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                  {activeUnitId === "all" ? "جميع الحركات" : activeUnitName}
                </span>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <input value={unitSearch} onChange={e => setUnitSearch(e.target.value)} placeholder="بحث..."
                      className="pl-4 pr-8 py-1.5 rounded-xl text-xs border focus:outline-none"
                      style={{ ...iStyle(), width: 160 }} />
                    {unitSearch && <button onClick={() => setUnitSearch("")} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }}><X className="w-3 h-3" /></button>}
                  </div>
                  <button onClick={loadFinances} className="w-8 h-8 rounded-xl border flex items-center justify-center" style={cStyle()}>
                    <RefreshCw className="w-3.5 h-3.5" style={{ color: "var(--muted)" }} />
                  </button>
                  <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: "rgba(128,128,128,.1)", color: "var(--muted)" }}>{filtered.length} حركة</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm" style={{ tableLayout: "fixed" }}>
                  <colgroup>
  <col style={{ width: "6%" }} /><col style={{ width: "14%" }} /><col style={{ width: "32%" }} />
  <col style={{ width: "13%" }} /><col style={{ width: "20%" }} /><col style={{ width: "15%" }} />
</colgroup>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--card-border)" }}>
                    {["م", "التاريخ", "الوصف", "النوع", "المبلغ", "إجراءات"].map((h, i) => (
  <th key={h} style={{ color: "var(--muted)", background: "rgba(128,128,128,.05)", padding: "12px", textAlign: i === 0 || i === 5 ? "center" : "right", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>{h}</th>
))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan={7} className="py-16 text-center" style={{ color: "var(--muted)" }}>لا توجد حركات مالية</td></tr>
                    ) : filtered.map((f, i) => {
                      const isDebt  = f.type === FinanceType.Expense;
                      const rawDate = f.date ?? "";
                      const dateStr = rawDate && !rawDate.startsWith("0001") ? formatDate(rawDate) : "—";
                      return (
                        <tr key={f.id} style={{ borderBottom: "1px solid var(--card-border)" }}
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(128,128,128,.05)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          <td style={{ padding: "12px", color: "var(--muted)", fontSize: 12, textAlign: "center" }}>{i + 1}</td>
                          <td style={{ padding: "12px", color: "var(--foreground)", fontSize: 12, whiteSpace: "nowrap" }}>{dateStr}</td>
                          <td style={{ padding: "12px", overflow: "hidden" }}>
                            <p style={{ color: "var(--foreground)", fontSize: 13, fontWeight: 500, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {f.description || "—"}
                              {/* لو دفعة وفيها اسم مساهم — نعرضه بين قوسين */}
                              {f.type === FinanceType.Payment && f.shareholderName && (
                                <span style={{ color: "#6366f1", fontWeight: 600, marginRight: 4 }}>
                                  ({f.shareholderName})
                                </span>
                              )}
                            </p>
                            {f.unitName && activeUnitId === "all" && (
                              <p style={{ color: "var(--muted)", fontSize: 11, margin: "2px 0 0 0" }}>{f.unitName}</p>
                            )}
                          </td>
                          <td style={{ padding: "12px", textAlign: "right" }}>
                            <span className="text-[11px] font-semibold px-2 py-1 rounded-lg"
                              style={isDebt ? { background: "rgba(239,68,68,.1)", color: "#ef4444" } : { background: "rgba(16,185,129,.1)", color: "#10b981" }}>
                              {isDebt ? "مديونية" : "دفعة"}
                            </span>
                          </td>
                         <td style={{ padding: "12px", textAlign: "right", fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", color: isDebt ? "#ef4444" : "#10b981" }}>
  {isDebt ? "− " : "+ "}{formatCurrency(f.amount)}
</td>
                         
                          <td style={{ padding: "12px", textAlign: "center" }}>
                            <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                              <button onClick={() => openEdit(f)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: "#6366f1" }}
                                onMouseEnter={e => { e.currentTarget.style.background = "rgba(99,102,241,.12)"; }}
                                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setDeleteId(f.id)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: "#ef4444" }}
                                onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,.12)"; }}
                                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {filtered.length > 0 && (
                    <tfoot>
                      <tr style={{ borderTop: "2px solid var(--card-border)", background: "rgba(128,128,128,.05)" }}>
                       <td colSpan={4} style={{ padding: "12px 16px", fontSize: 14, fontWeight: 700, textAlign: "right", color: "var(--foreground)" }}>الإجمالي</td>
<td colSpan={2} style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                            {totalDebt > 0 && <span style={{ color: "#ef4444", fontWeight: 700, fontSize: 13, whiteSpace: "nowrap" }}>− {formatCurrency(totalDebt)}</span>}
                            {totalPaid > 0 && <span style={{ color: "#10b981", fontWeight: 700, fontSize: 13, whiteSpace: "nowrap" }}>+ {formatCurrency(totalPaid)}</span>}
                            <span style={{ color: remaining > 0 ? "#f59e0b" : "#10b981", fontWeight: 800, fontSize: 15, whiteSpace: "nowrap" }}>
                              = {remaining > 0 ? "متبقي " : "مسدَّد "}{formatCurrency(Math.abs(remaining))}
                            </span>
                            <span style={{ fontSize: 11, color: "var(--muted)", marginRight: "auto" }}>{filtered.length} حركة</span>
                          </div>
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════
          TAB 2 — ماليه المساهمين
      ════════════════════════════════════════════ */}
      {activeTab === "shareholders" && (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={loadShReport} className="w-9 h-9 rounded-xl border flex items-center justify-center" style={cStyle()}>
              <RefreshCw className="w-4 h-4" style={{ color: "var(--muted)" }} />
            </button>
          </div>

          {shError && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl mb-4 text-sm" style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.25)", color: "#ef4444" }}>
              <AlertCircle className="w-4 h-4 shrink-0" /> {shError}
            </div>
          )}

          {shLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
          ) : shReport.length === 0 ? (
            <div className="rounded-2xl border py-16 text-center" style={cStyle()}>
              <Users className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: "var(--muted)" }} />
              <p className="text-sm" style={{ color: "var(--muted)" }}>لا توجد بيانات مالية للمساهمين</p>
            </div>
          ) : (
            <div className="space-y-3">
              {shReport.map(sh => {
                const isExpanded = expandedSh === sh.shareholderId;
                const hasDebt    = sh.totalDebtAmount > 0;
                const totalCredit = (sh.units ?? []).reduce((s, u) => s + creditOf(u), 0);
                return (
                  <div key={sh.shareholderId} className="rounded-2xl border overflow-hidden" style={cStyle()}>
                    {/* Header */}
                    <div className="flex items-center gap-4 px-5 py-4 cursor-pointer"
                      style={{ background: isExpanded ? "rgba(99,102,241,.04)" : "transparent" }}
                      onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = "rgba(128,128,128,.04)"; }}
                      onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = "transparent"; }}
                      onClick={() => {
                        const newId = isExpanded ? null : sh.shareholderId;
                        setExpandedSh(newId);
                        if (newId && sh.units) {
                          sh.units.forEach(u => {
                            if (!shUnitAudits[u.unitId]) {
                              api.unitAudits.list(u.unitId)
                                .then(data => {
                                  setShUnitAudits(prev => ({ ...prev, [u.unitId]: Array.isArray(data) ? data : [] }));
                                })
                                .catch(() => {});
                            }
                          });
                          if (sh.units.length > 0) {
                            const unitIds = sh.units
                              .map(u => u.unitId)
                              .filter(uid => !shFinancesLoaded[uid]);
                            if (unitIds.length > 0) {
                              Promise.all(
                                unitIds.map(uid =>
                                  api.finances.list({ unitId: uid }).catch(() => [] as FinanceDto[])
                                )
                              ).then(results => {
                                const newPayments: Record<string, number> = {};
                                results.forEach((txList, i) => {
                                  const uid = unitIds[i];
                                  txList
                                    .filter(f => f.type === FinanceType.Payment && f.shareholderId === sh.shareholderId && f.auditId)
                                    .forEach(f => {
                                      const key = `${uid}-${f.auditId}-${sh.shareholderId}`;
                                      newPayments[key] = (newPayments[key] ?? 0) + f.amount;
                                    });
                                });
                                setShPayments(prev => ({ ...prev, ...newPayments }));
                                const loaded: Record<number, boolean> = {};
                                unitIds.forEach(uid => { loaded[uid] = true; });
                                setShFinancesLoaded(prev => ({ ...prev, ...loaded }));
                              });
                            }
                          }
                        }
                      }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
                        style={{ background: "linear-gradient(135deg,#6366f1,#7c3aed)" }}>
                        {(sh.shareholderName ?? "؟")[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm" style={{ color: "var(--foreground)" }}>{sh.shareholderName ?? `مساهم #${sh.shareholderId}`}</p>
                        {sh.nationalId && <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{sh.nationalId}</p>}
                      </div>
                      <div className="hidden sm:flex items-center gap-6 shrink-0">
                        {[
                          { label: "المطلوب",  value: sh.totalOwedAmount, clr: "#ef4444" },
                          { label: "المسدَّد", value: sh.totalPaidAmount, clr: "#10b981" },
                          { label: "الدين",    value: sh.totalDebtAmount, clr: hasDebt ? "#f59e0b" : "#10b981" },
                        ].map(({ label, value, clr }) => (
                          <div key={label} className="text-center">
                            <p className="text-[11px] mb-1" style={{ color: "var(--muted)" }}>{label}</p>
                            <p className="text-sm font-bold" style={{ color: clr }}>{formatCurrency(value)}</p>
                          </div>
                        ))}
                        {totalCredit > 0.009 && (
                          <div className="text-center">
                            <p className="text-[11px] mb-1" style={{ color: "var(--muted)" }}>رصيدي </p>
                            <p className="text-sm font-bold" style={{ color: "#0ea5e9" }}>{formatCurrency(totalCredit)}</p>
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
                        style={hasDebt ? { background: "rgba(245,158,11,.1)", color: "#f59e0b" } : { background: "rgba(16,185,129,.1)", color: "#10b981" }}>
                        {hasDebt ? "لديه دين" : "مسدَّد ✓"}
                      </span>
                      {isExpanded
                        ? <ChevronUp  className="w-4 h-4 shrink-0" style={{ color: "var(--muted)" }} />
                        : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: "var(--muted)" }} />}
                    </div>

                    {isExpanded && sh.units && sh.units.length > 0 && (
                      <div className="border-t px-5 pb-5 pt-3 space-y-4" style={{ borderColor: "var(--card-border)" }}>
                        {sh.units.map(u => {
                          const uDebt        = u.debtAmount > 0;
                          const uCredit      = creditOf(u);
                          // الدين "العام" بس (من غير حصة الجرود اللي بتتسدد من تفصيل الجرود تحت)
                          const uGeneralDebt = generalDebtOf(u);
                          return (
                            <div key={u.unitId} className="rounded-xl p-4" style={{ background: "rgba(128,128,128,.03)", border: "1px solid var(--card-border)" }}>
                              <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                                <p className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
                                  {u.unitName ?? `مشروع ${u.unitId}`}
                                  {u.unitCode && <span className="text-xs font-normal mr-1.5" style={{ color: "var(--muted)" }}>({u.unitCode})</span>}
                                </p>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(99,102,241,.1)", color: "#6366f1" }}>
                                    {u.sharesCount} سهم — {u.sharePercentage?.toFixed(1)}%
                                  </span>
                                  {/* رصيد دائن على مستوى الوحدة */}
                                  {uCredit > 0.009 && (
                                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold"
                                      style={{ background: "rgba(14,165,233,.1)", color: "#0ea5e9" }}>
                                      <PiggyBank className="w-3 h-3" />رصيدي {formatCurrency(uCredit)}
                                    </span>
                                  )}
                                  {/* سداد عام — بس على حصته الأساسية (شامل مصاريف الجرود المفتوحة، بس مش المقفولة).
                                      دين الجرود المقفولة له زرار "سداد" منفصل جوه تفصيل الجرود تحت. */}
                                  {uGeneralDebt > 0.009 && (
                                    <button
                                      onClick={() => openPayModal({
                                        shareholderId:   sh.shareholderId,
                                        shareholderName: sh.shareholderName ?? null,
                                        unitId:          u.unitId,
                                        unitName:        u.unitName ?? null,
                                        auditId:         null,
                                        auditName:       "سداد عام",
                                        debtAmount:      uGeneralDebt,
                                        currentCredit:   uCredit,
                                      })}
                                      className="text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all"
                                      style={{ background: "rgba(44, 126, 117, 0.1)", color: "#10b981", border: "1px solid rgba(77, 233, 178, 0.2)" }}>
                                      سداد كامل ({formatCurrency(uGeneralDebt)})
                                    </button>
                                  )}
                                  {/* لو الدين العام اتسدد بالكامل — يفضل السداد متاح كسداد مقدَّم (رصيد دائن) */}
                                  {uGeneralDebt <= 0.009 && (
                                    <button
                                      onClick={() => openPayModal({
                                        shareholderId:   sh.shareholderId,
                                        shareholderName: sh.shareholderName ?? null,
                                        unitId:          u.unitId,
                                        unitName:        u.unitName ?? null,
                                        auditId:         null,
                                        auditName:       "سداد عام",
                                        debtAmount:      0,
                                        currentCredit:   uCredit,
                                      })}
                                      className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all"
                                      style={{ background: "rgba(44, 126, 117, 0.1)",  color: "#10b981", border: "1px solid rgba(77, 233, 178, 0.2)" }}>
                                      <PiggyBank className="w-3 h-3" /> سداد مقدَّم
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* الكروت */}
                              <div className={`grid grid-cols-2 ${uCredit > 0.009 ? "sm:grid-cols-5" : "sm:grid-cols-4"} gap-2 mb-3`}>
                                {[
                                  { label: "إجمالي التكلفة", value: u.totalUnitCost,  clr: "#ef4444" },
                                  { label: "حصته المطلوبة",  value: u.owedAmount,     clr: "#6366f1" },
                                  { label: "سدَّد",          value: u.paidAmount,     clr: "#10b981" },
                                  { label: "الدين المتبقي",  value: u.debtAmount,     clr: uDebt ? "#f59e0b" : "#10b981" },
                                  ...(uCredit > 0.009 ? [{ label: "رصيدي ", value: uCredit, clr: "#0ea5e9" }] : []),
                                ].map(({ label, value, clr }) => (
                                  <div key={label} className="rounded-lg p-2.5 text-center" style={{ background: `${clr}10` }}>
                                    <p className="text-[10px] font-medium mb-1" style={{ color: "var(--muted)" }}>{label}</p>
                                    <p className="text-sm font-bold" style={{ color: clr }}>{formatCurrency(value)}</p>
                                  </div>
                                ))}
                              </div>

                              {/* ── سطر تجميعي ── */}
                              <div className="flex flex-wrap items-center gap-3 px-3 py-2.5 rounded-xl mb-3" style={{ background: "rgba(128,128,128,.06)" }}>
                                <span className="text-xs" style={{ color: "var(--muted)" }}>
                                  حصته: <strong style={{ color: "#6366f1" }}>{formatCurrency(u.owedAmount)}</strong>
                                </span>
                                <span className="text-xs" style={{ color: "var(--muted)" }}>−</span>
                                <span className="text-xs" style={{ color: "var(--muted)" }}>
                                  سدَّد: <strong style={{ color: "#10b981" }}>{formatCurrency(u.paidAmount)}</strong>
                                </span>
                                <span className="text-xs" style={{ color: "var(--muted)" }}>=</span>
                                <span className="text-xs font-bold" style={{ color: uDebt ? "#f59e0b" : "#10b981" }}>
                                  {uDebt ? `دين: ${formatCurrency(u.debtAmount)}` : "مسدَّد ✓"}
                                </span>
                                {uCredit > 0.009 && (
                                  <>
                                    <span className="text-xs" style={{ color: "var(--muted)" }}>+</span>
                                    <span className="text-xs font-bold" style={{ color: "#0ea5e9" }}>
                                      رصيدي : {formatCurrency(uCredit)}
                                    </span>
                                  </>
                                )}
                              </div>

                              {/* ── تفصيل الجرود مع السداد ── */}
                              {(() => {
                                const uAudits = (shUnitAudits[u.unitId] ?? [])
                                  .filter(a => a.status === UnitAuditStatus.Closed)
                                  .sort((a, b) => new Date(a.fromDate).getTime() - new Date(b.fromDate).getTime());

                                if (!uAudits.length) {
                                  return (
                                    <div className="rounded-lg px-3 py-3 mt-3 text-xs text-center"
                                      style={{ background: "rgba(128,128,128,.04)", border: "1px solid var(--card-border)", color: "var(--muted)" }}>
                                      {shUnitAudits[u.unitId] === undefined ? "جاري تحميل الجرود..." : "لا توجد جرود مقفولة بعد"}
                                    </div>
                                  );
                                }

                                
                                let auditPaidPool = Math.max(auditPaidOf(u), 0);

                                const auditRows = uAudits.map(a => {
                                  const myShare  = a.shareholderShares.find(s => s.shareholderId === sh.shareholderId);
                                  const isEstimate = !myShare;
                                  const owed = myShare?.shareAmount
                                    ?? (a.totalExpenses * (u.sharePercentage / 100));
                                  const paid = Math.min(auditPaidPool, owed);
                                  auditPaidPool = Math.max(0, auditPaidPool - paid);
                                  const debt    = Math.max(0, owed - paid);
                                  const settled = debt <= 0.009;
                                  return { audit: a, owed, paid, debt, settled, isEstimate };
                                });

                                const totalOwed  = auditRows.reduce((s, r) => s + r.owed,  0);
                                const totalPaid  = auditRows.reduce((s, r) => s + r.paid,  0);
                                const totalDebt  = auditRows.reduce((s, r) => s + r.debt,  0);

                                return (
                                  <div className="rounded-lg overflow-hidden border mt-3" style={{ borderColor: "var(--card-border)" }}>
                                    <div className="px-3 py-2 flex items-center justify-between"
                                      style={{ background: "rgba(99,102,241,.06)" }}>
                                      <span className="text-[11px] font-semibold" style={{ color: "#6366f1" }}>تفصيل الجرود</span>
                                      <span className="text-[10px]" style={{ color: "var(--muted)" }}>
                                        الديون المقفولة فقط
                                      </span>
                                    </div>
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                                          {["الجرد", "الفترة", "المطلوب", "المسدَّد", "المتبقي", ""].map((h, i) => (
                                            <th key={i} style={{ padding: "6px 10px", color: "var(--muted)", fontWeight: 600, textAlign: i === 0 ? "right" : "center", fontSize: 10, whiteSpace: "nowrap" }}>{h}</th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {auditRows.map(({ audit: a, owed, paid, debt, settled, isEstimate }) => (
                                          <tr key={a.id} style={{ borderBottom: "1px solid var(--card-border)" }}>
                                            <td style={{ padding: "8px 10px", color: "var(--foreground)", fontWeight: 600 }}>
                                              {a.name}
                                            </td>
                                            <td style={{ padding: "8px 10px", color: "var(--muted)", textAlign: "center", whiteSpace: "nowrap" }}>
                                              {formatDate(a.fromDate)} — {formatDate(a.toDate)}
                                            </td>
                                            <td style={{ padding: "8px 10px", fontWeight: 700, color: "#ef4444", textAlign: "center" }}>
                                              {formatCurrency(owed)}
                                              {isEstimate && (
                                                <span
                                                  title="تقديري — لسه مفيش بيانات توزيع دقيقة من الجرد"
                                                  style={{ color: "#f59e0b", fontSize: 10, marginRight: 2 }}>
                                                  *
                                                </span>
                                              )}
                                            </td>
                                            <td style={{ padding: "8px 10px", fontWeight: 700, color: "#10b981", textAlign: "center" }}>
                                              {formatCurrency(paid)}
                                            </td>
                                            <td style={{ padding: "8px 10px", fontWeight: 800, textAlign: "center",
                                              color: settled ? "#10b981" : "#f59e0b" }}>
                                              {settled ? "✓ مسدَّد" : formatCurrency(debt)}
                                            </td>
                                            <td style={{ padding: "8px 10px", textAlign: "center" }}>
                                              {!settled && (
                                                <button
                                                  onClick={() => openPayModal({
                                                    shareholderId:   sh.shareholderId,
                                                    shareholderName: sh.shareholderName ?? null,
                                                    unitId:          u.unitId,
                                                    unitName:        u.unitName ?? null,
                                                    auditId:         a.id,
                                                    auditName:       a.name,
                                                    debtAmount:      debt,
                                                    currentCredit:   uCredit,
                                                  })}
                                                  className="text-[11px] font-semibold px-2 py-1 rounded-lg transition-all"
                                                  style={{ background: "rgba(16,185,129,.1)", color: "#10b981", border: "1px solid rgba(16,185,129,.2)" }}>
                                                  سداد
                                                </button>
                                              )}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                      <tfoot>
                                        <tr style={{ borderTop: "2px solid var(--card-border)", background: "rgba(128,128,128,.04)" }}>
                                          <td colSpan={2} style={{ padding: "7px 10px", fontWeight: 700, fontSize: 11, color: "var(--foreground)" }}>الإجمالي</td>
                                          <td style={{ padding: "7px 10px", fontWeight: 700, color: "#ef4444", textAlign: "center" }}>
                                            {formatCurrency(totalOwed)}
                                          </td>
                                          <td style={{ padding: "7px 10px", fontWeight: 700, color: "#10b981", textAlign: "center" }}>
                                            {formatCurrency(totalPaid)}
                                          </td>
                                          <td style={{ padding: "7px 10px", fontWeight: 800, textAlign: "center",
                                            color: totalDebt <= 0.009 ? "#10b981" : "#f59e0b" }}>
                                            {totalDebt <= 0.009 ? "✓ مسدَّد" : formatCurrency(totalDebt)}
                                          </td>
                                          <td />
                                        </tr>
                                      </tfoot>
                                    </table>
                                  </div>
                                );
                              })()}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ════ مودال إضافة/تعديل حركة ════ */}
      <Modal open={showAdd || !!editItem} onClose={() => { setShowAdd(false); setEditItem(null); }}
        title={editItem ? "تعديل الحركة" : "إضافة حركة مالية"}>
        <form onSubmit={handleSave} className="space-y-4">
          {/* النوع — في الإضافة: مديونية فقط. في التعديل: يتحدد من الحركة الأصلية */}
          {editItem ? (
            <div className="px-3.5 py-2.5 rounded-xl text-xs font-semibold"
              style={form.type === FinanceType.Payment
                ? { background: "rgba(16,185,129,.08)", color: "#10b981", border: "1px solid rgba(16,185,129,.2)" }
                : { background: "rgba(239,68,68,.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,.2)" }}>
              النوع: {form.type === FinanceType.Payment ? "دفعة (سداد)" : "مديونية (دين)"}
              <span className="mr-2 opacity-60 font-normal">— السداد يتم من تفصيل الجرود</span>
            </div>
          ) : (
            <div className="px-3.5 py-2.5 rounded-xl text-xs font-semibold"
              style={{ background: "rgba(239,68,68,.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,.2)" }}>
              مديونية (دين)
              <span className="mr-2 opacity-60 font-normal">— لإضافة سداد: افتح كارت المساهم واضغط "سداد" جنب الجرد</span>
            </div>
          )}
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--muted)" }}>المشروع <span className="text-red-400">*</span></label>
            <select required value={form.unitId} onChange={e => setForm(p => ({ ...p, unitId: e.target.value }))} className={ic} style={iStyle()}>
              <option value="">— اختر المشروع —</option>
              {units.map(u => <option key={u.id} value={u.id}>{u.name ?? u.code ?? `مشروع ${u.id}`}</option>)}
            </select>
          </div>
         
          {/* الوصف */}
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--muted)" }}>الوصف</label>
            <input type="text" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="مثال: دفعة أولى، مصاريف بناء..." className={ic} style={iStyle()} />
          </div>
          {/* التاريخ + المبلغ */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--muted)" }}>
                التاريخ
                <span className="mr-1.5 text-[10px] font-normal" style={{ color: "var(--muted)" }}>(اليوم — ثابت)</span>
              </label>
              <input type="date" required value={form.date}
                readOnly
                className={ic} style={{ ...iStyle(), opacity: .75, cursor: "not-allowed" }} />
            </div>
          <div>
  <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--muted)" }}>المبلغ (ج.م) <span className="text-red-400">*</span></label>
  <input type="number" min={0.01} step="0.01" required
    value={form.amount}
    onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
    placeholder="0.00"
    className={ic} style={{ ...iStyle(), fontWeight: 700 }} />
</div>
          </div>
          {/* ملاحظات */}
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--muted)" }}>ملاحظات</label>
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="ملاحظات إضافية..." rows={2} className={ic} style={{ ...iStyle(), resize: "vertical" }} />
          </div>
          {formErr && <p className="text-xs p-2.5 rounded-lg" style={{ background: "rgba(239,68,68,.1)", color: "#ef4444" }}>{formErr}</p>}
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving || !form.unitId || !form.amount}
              className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50"
              style={{ background: (!form.unitId || !form.amount) ? "rgba(128,128,128,.3)" : "linear-gradient(135deg,#6366f1,#7c3aed)" }}>
              {saving ? "جاري الحفظ..." : editItem ? "حفظ التعديل" : "إضافة"}
            </button>
            <button type="button" onClick={() => { setShowAdd(false); setEditItem(null); }}
              className="flex-1 py-3 rounded-xl text-sm font-medium border" style={cStyle()}>إلغاء</button>
          </div>
        </form>
      </Modal>

      {/* ════ مودال جرد جديد ════ */}
      <Modal open={showAuditModal} onClose={() => setShowAuditModal(false)}
        title={`جرد جديد — ${activeUnitName}`} size="md">
        <form onSubmit={handleAuditSave} className="space-y-4">

          {/* شرح المنطق */}
          <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl"
            style={{ background: "rgba(99,102,241,.07)", border: "1px solid rgba(99,102,241,.2)" }}>
            <BookOpen className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#6366f1" }} />
            <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
              الجرد هيبقى <strong style={{ color: "#f59e0b" }}>منتظر</strong> طول الفترة، وكل المصاريف اللي بتتسجل فيها بتتحسب تلقائياً تحته.
              لما الفترة تخلص، الجرد بيتقفل تلقائياً ويتوزع الدين على المساهمين — وأي رصيد دائن عند المساهم بيتخصم منه أولاً.
            </p>
          </div>

          {/* اسم الجرد */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted)" }}>اسم الجرد</label>
            <input type="text" value={auditForm.name}
              onChange={e => setAuditForm(p => ({ ...p, name: e.target.value }))}
              className={ic} style={iStyle()} placeholder={`جرد ${unitAudits.length + 1}`} />
          </div>

          {/* من / إلى */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted)" }}>
                من تاريخ <span className="text-red-400">*</span>
                {lastAudit && <span className="text-[10px] mr-1" style={{ color: "#6366f1" }}>(مقفول)</span>}
              </label>
              <input type="date" required value={auditForm.fromDate}
                readOnly={!!lastAudit}
                onChange={e => { if (!lastAudit) setAuditForm(p => ({ ...p, fromDate: e.target.value })); }}
                className={ic}
                style={lastAudit ? { ...iStyle(), opacity: .6, cursor: "not-allowed" } : iStyle()} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted)" }}>
                إلى تاريخ <span className="text-red-400">*</span>
              </label>
              <input type="date" required value={auditForm.toDate}
                min={auditForm.fromDate || undefined}
                onChange={e => setAuditForm(p => ({ ...p, toDate: e.target.value }))}
                className={ic} style={iStyle()} />
            </div>
          </div>

          {/* معاينة الفترة */}
          {auditForm.fromDate && auditForm.toDate && (
            <div className="px-3.5 py-3 rounded-xl text-xs"
              style={{ background: "rgba(16,185,129,.06)", border: "1px solid rgba(16,185,129,.15)" }}>
              <p style={{ color: "var(--muted)" }}>
                الجرد هيغطي من{" "}
                <strong style={{ color: "#10b981" }}>{formatDate(auditForm.fromDate)}</strong>
                {" "}لـ{" "}
                <strong style={{ color: "#10b981" }}>{formatDate(auditForm.toDate)}</strong>
              </p>
              <p className="mt-1" style={{ color: "var(--muted)" }}>
                الدين هيتوزع تلقائياً بعد{" "}
                <strong style={{ color: "#10b981" }}>{formatDate(auditForm.toDate)}</strong>
              </p>
            </div>
          )}

          {auditFormErr && (
            <p className="text-xs p-2.5 rounded-lg" style={{ background: "rgba(239,68,68,.1)", color: "#ef4444" }}>
              {auditFormErr}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={auditSaving || !auditForm.fromDate || !auditForm.toDate}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#10b981,#059669)" }}>
              {auditSaving ? "جاري الحفظ..." : "إنشاء الجرد"}
            </button>
            <button type="button" onClick={() => setShowAuditModal(false)}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium border" style={cStyle()}>
              إلغاء
            </button>
          </div>
        </form>
      </Modal>

      {/* ════ مودال حذف ════ */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="تأكيد الحذف" size="sm">
        <p className="text-sm mb-5" style={{ color: "var(--muted)" }}>هل أنت متأكد من حذف هذه الحركة؟</p>
        <div className="flex gap-2">
          <button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "#ef4444" }}>حذف</button>
          <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium border" style={cStyle()}>إلغاء</button>
        </div>
      </Modal>

      {/* ════ مودال سداد ════ */}
      <Modal open={showPayModal} onClose={() => setShowPayModal(false)}
        title={payTarget ? `سداد — ${payTarget.shareholderName ?? ""} / ${payTarget.auditName}` : "سداد"}
        size="sm">
        {payTarget && (
          <form onSubmit={handlePay} className="space-y-4">

            {/* معلومات الجرد / السداد */}
            <div className="px-3.5 py-3 rounded-xl"
              style={payTarget.capped
                ? { background: "rgba(239,68,68,.06)", border: "1px solid rgba(239,68,68,.15)" }
                : { background: "rgba(99,102,241,.06)", border: "1px solid rgba(99,102,241,.15)" }}>
              <p className="text-xs font-semibold mb-1" style={{ color: "var(--muted)" }}>
                {payTarget.capped ? "الدين المتبقي في هذا الجرد" : "الدين المتبقي على المشروع (سداد عام)"}
              </p>
              <p className="text-xl font-bold" style={{ color: payTarget.capped ? "#ef4444" : "#6366f1" }}>
                {formatCurrency(payTarget.maxAmount)}
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--muted)" }}>
                {payTarget.unitName}
                {payTarget.capped ? ` — ${payTarget.auditName}` : " — سيُسجَّل بدون ربط بجرد محدد"}
              </p>
              {/* الرصيد الدائن الحالي، للعلم فقط */}
              {payTarget.currentCredit > 0.009 && (
                <p className="text-[11px] mt-1.5 flex items-center gap-1" style={{ color: "#0ea5e9" }}>
                  <PiggyBank className="w-3 h-3" /> رصيده المتبقي الحالي: {formatCurrency(payTarget.currentCredit)}
                </p>
              )}
            </div>

            {/* المبلغ */}
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--muted)" }}>
                المبلغ (ج.م) <span className="text-red-400">*</span>
              </label>
             <input type="number" min={0.01} step="0.01" required
  value={payForm.amount}
  onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))}
  placeholder="0.00"
  className={ic} style={{ ...iStyle(), fontWeight: 700 }} />

              {/* زرار سداد كامل — بيظهر بس لو فيه دين فعلي */}
              {payTarget.maxAmount > 0.009 && (
                <button type="button"
                  onClick={() => setPayForm(p => ({ ...p, amount: payTarget.maxAmount.toFixed(2) }))}
                  className="mt-1.5 text-xs font-semibold"
                  style={{ color: "#10b981" }}>
                  سداد كامل ({formatCurrency(payTarget.maxAmount)})
                </button>
              )}

             
           
            </div>

            {/* التاريخ */}
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--muted)" }}>
                التاريخ
                <span className="mr-1.5 text-[10px] font-normal" style={{ color: "var(--muted)" }}>(اليوم — ثابت)</span>
              </label>
              <input type="date" required value={payForm.date}
                readOnly
                className={ic} style={{ ...iStyle(), opacity: .75, cursor: "not-allowed" }} />
            </div>

            {/* ملاحظات */}
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--muted)" }}>ملاحظات</label>
              <input type="text" value={payForm.notes}
                onChange={e => setPayForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="مثال: دفعة نقدي، تحويل..."
                className={ic} style={iStyle()} />
            </div>

            {payErr && <p className="text-xs p-2.5 rounded-lg" style={{ background: "rgba(239,68,68,.1)", color: "#ef4444" }}>{payErr}</p>}

            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={paySaving || !payForm.amount}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#10b981,#059669)" }}>
                {paySaving ? "جاري الحفظ..." : "تسجيل السداد"}
              </button>
              <button type="button" onClick={() => setShowPayModal(false)}
                className="flex-1 py-3 rounded-xl text-sm font-medium border" style={cStyle()}>
                إلغاء
              </button>
            </div>
          </form>
        )}
      </Modal>

    </DashboardShell>
  );
}