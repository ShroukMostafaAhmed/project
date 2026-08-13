"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus, TrendingUp, TrendingDown, Wallet, Printer,
  RefreshCw, Trash2, Pencil, AlertCircle, Tag, X,
} from "lucide-react";
import DashboardShell from "@/app/components/layout/DashboardShell";
import PageHeader from "@/app/components/ui/PageHeader";
import Modal from "@/app/components/ui/Modal";
import { ListSkeleton } from "@/app/components/ui/Skeleton";
import { api } from "@/app/lib/api";
import { useUnits } from "@/app/lib/hooks";
import {
  FinancialCategoryDto, FinancialTransactionDto, FinancialSummaryDto,
  TransactionType, TransactionTypeLabels,
  PaymentMethod, PaymentMethodLabels,
} from "@/app/lib/types";
import { formatCurrency, formatDate } from "@/app/lib/utils";

/* ── helpers ── */
function cStyle(): React.CSSProperties {
  return { background:"var(--card)", border:"1px solid var(--card-border)" };
}
function iStyle(): React.CSSProperties {
  return { background:"var(--input-bg)", borderColor:"var(--input-border)", color:"var(--foreground)" };
}
const ic = "w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none transition-all";

/* neutral accent used everywhere EXCEPT the expense/deposit toggle */
const NEUTRAL_ACCENT = "#6366f1";
const NEUTRAL_ACCENT_BG = "rgba(99,102,241,.08)";

/**
 * normalizeType — يحوّل أي قيمة جاية من الـ API (رقم أو string) لـ TransactionType صح.
 * الباك بيرجع 0/1 كـ numbers لكن أحياناً بيجي كـ string أو بشكل مختلف.
 */
function normalizeType(raw: unknown): TransactionType {
  if (raw === TransactionType.Revenue) return TransactionType.Revenue;
  if (raw === TransactionType.Expense) return TransactionType.Expense;
  const s = String(raw).toLowerCase().trim();
  if (s === "1" || s.includes("rev") || s.includes("إيراد") || s.includes("ايراد")) {
    return TransactionType.Revenue;
  }
  return TransactionType.Expense; // 2 أو أي قيمة تانية = مصروف
}

const EMPTY = {
  categoryId:"", amount:"", description:"", notes:"",
  date: new Date().toISOString().split("T")[0],
};

export default function AdminExpensesPage() {
  const { units } = useUnits();

  /* ── data ── */
  const [categories,   setCategories]   = useState<FinancialCategoryDto[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransactionDto[]>([]);
  const [summary,      setSummary]      = useState<FinancialSummaryDto|null>(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");

  /* ── selected category (null = all categories loaded, button selected) ── */
  const [activeCatId, setActiveCatId] = useState<number|"all"|null>(null);

  /* ── date filter ── */
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");

  /* ── search ── */
  const [search, setSearch] = useState("");

  /* ── فلتر الاسم من grouped endpoint ── */
  const [groupedNames,   setGroupedNames]   = useState<string[]>([]);
  const [filterByName,   setFilterByName]   = useState<string>(""); // الاسم المختار

  /* ── modals ── */
  const [showAdd,    setShowAdd]    = useState(false);
  const [editItem,   setEditItem]   = useState<FinancialTransactionDto|null>(null);
  const [deleteId,   setDeleteId]   = useState<number|null>(null);
  const [showAddCat, setShowAddCat] = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [formErr,    setFormErr]    = useState("");
  const [txForm,     setTxForm]     = useState({ ...EMPTY, type: TransactionType.Expense as TransactionType });
  const [catForm,    setCatForm]    = useState({ name:"", type: TransactionType.Expense as TransactionType, description:"" });

  /* ── load categories ── */
  const loadCategories = useCallback(async () => {
    try {
      const data = await api.financialCategories.list();
      const cats = Array.isArray(data) ? data : [];
      setCategories(cats);
      if (activeCatId === null && cats.length > 0) {
        setActiveCatId(cats[0].id);
      }
    } catch { /* ignore */ }
  }, [activeCatId]);

  useEffect(() => { loadCategories(); }, []); // eslint-disable-line

  /* ── تحميل الأسامي المجمّعة للفلتر ── */
  useEffect(() => {
    api.financialCategories.grouped()
      .then(names => setGroupedNames(Array.isArray(names) ? names : []))
      .catch(() => {});
  }, []);

  // Reload categories when opening add modal to ensure they're fresh
  async function openAdd() {
    // load fresh categories before opening
    const data = await api.financialCategories.list().catch(() => [] as FinancialCategoryDto[]);
    const cats = Array.isArray(data) ? (data as FinancialCategoryDto[]) : [] as FinancialCategoryDto[];
    if (cats.length > 0) setCategories(cats);

    // resolve active category type from fresh data (avoids stale state bug)
    const currentCat = activeCatId !== "all" && activeCatId !== null
      ? cats.find(c => c.id === activeCatId) ?? null
      : null;
    const defaultType = currentCat ? normalizeType(currentCat.type) : TransactionType.Expense;
    const defaultCatId = activeCatId && activeCatId !== "all" ? String(activeCatId) : "";

    setTxForm({ ...EMPTY, type: defaultType, categoryId: defaultCatId });
    setFormErr("");
    setShowAdd(true);
  }

  /* ── load transactions for selected category ── */
  const loadTransactions = useCallback(async () => {
    if (activeCatId === null) return;
    setLoading(true); setError("");
    try {
      const params: Record<string,unknown> = {};
      if (activeCatId !== "all") params.categoryId = activeCatId;
      if (dateFrom) params.fromDate = dateFrom;
      if (dateTo)   params.toDate   = dateTo;

      const [txData, sumData] = await Promise.all([
        api.financialTransactions.list(params as Parameters<typeof api.financialTransactions.list>[0]),
        api.financialTransactions.summary(dateFrom||dateTo ? { fromDate:dateFrom||undefined, toDate:dateTo||undefined } : undefined),
      ]);
      setTransactions(Array.isArray(txData) ? txData : []);
      setSummary(sumData);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [activeCatId, dateFrom, dateTo]);

  useEffect(() => { loadTransactions(); }, [loadTransactions]);

  /* ── filtered rows ── */
  const filtered = useMemo(() => {
  const q = search.toLowerCase();
  return transactions.filter(t => {
    if (filterByName && !(t.categoryName ?? "").includes(filterByName)) return false;
    return (
      !q ||
      (t.description  ?? "").toLowerCase().includes(q) ||
      (t.categoryName ?? "").toLowerCase().includes(q) ||
      String(t.auditNo ?? t.auditNu ?? "").includes(q)
    );
  });
}, [transactions, search, filterByName]);
  const getType = (t: FinancialTransactionDto): TransactionType =>
    normalizeType(t.transactionType ?? t.type ?? TransactionType.Expense);

  const totalRevenue  = filtered.filter(t=>getType(t)===TransactionType.Revenue).reduce((s,t)=>s+t.amount,0);
  const totalExpenses = filtered.filter(t=>getType(t)===TransactionType.Expense).reduce((s,t)=>s+t.amount,0);
  const net           = totalRevenue - totalExpenses;

  /* ── active category meta ── */
  const activeCat = activeCatId === "all" ? null : categories.find(c => c.id === activeCatId);
  // normalizeType here guarantees catType is always a proper TransactionType enum value
  const catType   = activeCat ? normalizeType(activeCat.type) : null;
  const accent    = catType === TransactionType.Revenue ? "#10b981"
                  : catType === TransactionType.Expense ? "#ef4444"
                  : "#6366f1";
  const accentBg  = catType === TransactionType.Revenue ? "rgba(16,185,129,.1)"
                  : catType === TransactionType.Expense ? "rgba(239,68,68,.1)"
                  : "rgba(99,102,241,.1)";

  /* ── actions ── */
  async function handleSaveTx(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setFormErr("");
    try {
      if (editItem) {
        await api.financialTransactions.update(editItem.id, {
          categoryId:  txForm.categoryId ? parseInt(txForm.categoryId) : undefined,
          amount:      txForm.amount     ? parseFloat(txForm.amount)   : undefined,
          description: txForm.description || null,
          notes:       txForm.notes || null,
          date:        txForm.date        || undefined,
        });
        setEditItem(null);
      } else {
        await api.financialTransactions.create({
          categoryId:       parseInt(txForm.categoryId),
          transactionType:  txForm.type,   // اسم الحقل الصح للـ API
          type:             txForm.type,   // fallback للتوافق
          amount:           parseFloat(txForm.amount),
          description:      txForm.description || null,
          notes:            txForm.notes || null,
          transactionDate:  txForm.date,   // اسم الحقل الصح للـ API
          date:             txForm.date,   // fallback للتوافق
        });
        setShowAdd(false);
      }
      setTxForm({ ...EMPTY, type: catType ?? TransactionType.Expense });
      await loadTransactions();
    } catch (err) { setFormErr((err as Error).message); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try { await api.financialTransactions.delete(deleteId); setDeleteId(null); await loadTransactions(); }
    catch (err) { alert((err as Error).message); }
  }

  async function handleAddCat(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setFormErr("");
    try {
      const cat = await api.financialCategories.create({ name:catForm.name, type:catForm.type, description:catForm.description||null });
      setShowAddCat(false);
      setCatForm({ name:"", type: TransactionType.Expense, description:"" });
      await loadCategories();
      if (cat) setActiveCatId((cat as FinancialCategoryDto).id);
    } catch (err) { setFormErr((err as Error).message); }
    finally { setSaving(false); }
  }

  function openEdit(t: FinancialTransactionDto) {
    setEditItem(t);
    const txType  = normalizeType(t.transactionType ?? t.type ?? TransactionType.Expense);
    const rawDate = t.transactionDate ?? t.date ?? "";
    setTxForm({
      type:        txType,
      categoryId:  String(t.categoryId),
      amount:      String(t.amount),
      description: t.description ?? "",
      notes:       t.notes ?? "",
      date:        rawDate && !rawDate.startsWith("0001") ? rawDate.split("T")[0] : "",
    });
    setFormErr("");
  }

  /* ── render ── */
  return (
    <DashboardShell title="المصاريف والإيرادات">
      <PageHeader
        title="المصاريف والإيرادات"
        subtitle="اختر تصنيفاً لعرض حركاته"
        actions={
          <div className="flex gap-2 no-print">
            <button onClick={() => window.print()} className="w-9 h-9 rounded-xl border flex items-center justify-center" style={cStyle()} title="طباعة">
              <Printer className="w-4 h-4" style={{ color:"var(--muted)" }} />
            </button>
            <button onClick={() => { setShowAddCat(true); setFormErr(""); }}
              className="flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-xl border" style={cStyle()}>
              <Tag className="w-4 h-4" style={{ color:"var(--muted)" }} />
              تصنيف جديد
            </button>
            <button onClick={openAdd}
              className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl text-white"
              style={{ background:"linear-gradient(135deg,#6366f1,#7c3aed)", boxShadow:"0 3px 12px rgba(99,102,241,.3)" }}>
              <Plus className="w-4 h-4" /> إضافة حركة
            </button>
          </div>
        }
      />

      {/* ══ Category buttons — "الكل" Button and Categories ══ */}
      <div className="flex flex-wrap gap-2 mb-6 no-print">
        {/* "الكل" button */}
        <button
          onClick={() => { setActiveCatId("all"); setSearch(""); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all"
          style={activeCatId === "all"
            ? { background:"linear-gradient(135deg,#6366f1,#7c3aed)", color:"#fff", borderColor:"transparent", boxShadow:"0 3px 12px rgba(99,102,241,.3)" }
            : { ...cStyle(), color:"var(--muted)" }
          }>
          الكل
          <span className="text-[11px] px-1.5 py-0.5 rounded-full"
            style={activeCatId === "all"
              ? { background:"rgba(255,255,255,.2)", color:"#fff" }
              : { background:"rgba(128,128,128,.1)", color:"var(--muted)" }}>
            {transactions.length}
          </span>
        </button>

        {/* Category buttons - Back to Red as requested */}
        {categories.map(cat => {
          const isActive = activeCatId === cat.id;
          return (
            <button key={cat.id}
              onClick={() => { setActiveCatId(cat.id); setSearch(""); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all"
              style={isActive
                ? { background:"linear-gradient(135deg,#6366f1,#7c3aed)", color:"#fff", borderColor:"transparent", boxShadow:"0 3px 12px rgba(99,102,241,.3)" }
                : { ...cStyle(), color:"var(--muted)" }
              }>
              {cat.name}
              <span className="text-[11px] px-1.5 py-0.5 rounded-full"
                style={isActive
                  ? { background:"rgba(255,255,255,.2)", color:"#fff" }
                  : { background:"rgba(128,128,128,.1)", color:"var(--muted)" }}>
                {isActive ? transactions.filter(t => t.categoryId === cat.id).length : ""}
              </span>
            </button>
          );
        })}
      </div>

      {/* ══ Summary cards + Date filter (same row) ══ */}
      <div className="flex flex-wrap items-start gap-4 mb-5">
        {/* Cards */}
        <div className="flex flex-wrap gap-3 flex-1">
          {[
            { label:"الإيرادات",   value: totalRevenue,  clr:"#10b981", bg:"rgba(16,185,129,.1)",  icon:TrendingUp   },
            { label:"المصروفات",   value: totalExpenses, clr:"#ef4444", bg:"rgba(239,68,68,.1)",   icon:TrendingDown  },
            { label:"الصافي",      value: net,           clr: net>=0?"#6366f1":"#f59e0b",
              bg: net>=0?"rgba(99,102,241,.1)":"rgba(245,158,11,.1)", icon:Wallet },
          ].map(({ label, value, clr, bg, icon:Icon }) => (
            <div key={label} className="rounded-2xl p-4 flex items-center gap-3 min-w-40 flex-1" style={cStyle()}>
              <div className="p-2.5 rounded-xl shrink-0" style={{ background:bg }}>
                <Icon className="w-4 h-4" style={{ color:clr }} />
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color:"var(--muted)" }}>{label}</p>
                <p className="text-lg font-bold" style={{ color:clr }}>{formatCurrency(value)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Date filter — جنب الكروت مباشرة */}
        <div className="flex items-end gap-2 shrink-0 no-print">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color:"var(--muted)" }}>من</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className={ic + " w-36"} style={iStyle()} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color:"var(--muted)" }}>إلى</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className={ic + " w-36"} style={iStyle()} />
          </div>
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(""); setDateTo(""); }}
              className="px-3 py-2.5 rounded-xl text-xs font-medium border transition-colors"
              style={{ color:"#ef4444", borderColor:"rgba(239,68,68,.3)", background:"rgba(239,68,68,.06)" }}>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={loadTransactions} className="w-10 h-10 rounded-xl border flex items-center justify-center" style={cStyle()} title="تحديث">
            <RefreshCw className="w-4 h-4" style={{ color:"var(--muted)" }} />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl mb-4 text-sm" style={{ background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.25)", color:"#ef4444" }}>
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* ══ Table ══ */}
      {loading ? <ListSkeleton rows={6} cols={7} /> : (
        <div className="rounded-2xl border overflow-hidden shadow-sm" style={cStyle()}>
          {/* Toolbar - Removed the red side category name label */}
          <div className="flex items-center justify-between px-5 py-3 border-b no-print" style={{ borderColor:"var(--card-border)", background:"rgba(128,128,128,.04)" }}>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold" style={{ color:"var(--foreground)" }}>
                {activeCatId === "all" ? "جميع الحركات" : activeCat?.name ?? ""}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* فلتر الاسم من grouped */}
              {groupedNames.length > 0 && (
                <select
                  value={filterByName}
                  onChange={e => setFilterByName(e.target.value)}
                  className="py-1.5 rounded-xl text-xs border focus:outline-none"
                  style={{ ...iStyle(), paddingRight: 10, paddingLeft: 10, width: 160 }}>
                  <option value="">كل الأسماء</option>
                  {groupedNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              )}
              {/* inline search */}
              <div className="relative">
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..."
                  className="pl-4 pr-8 py-1.5 rounded-xl text-xs border focus:outline-none"
                  style={{ ...iStyle(), width:160 }} />
                {search && <button onClick={() => setSearch("")} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color:"var(--muted)" }}><X className="w-3 h-3" /></button>}
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full" style={{ background:"rgba(128,128,128,.1)", color:"var(--muted)" }}>
                {filtered.length} حركة
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm" style={{ tableLayout:"fixed" }}>
              <colgroup>
                <col style={{ width:"6%" }} />
                <col style={{ width:"12%" }} />
                <col style={{ width:"34%" }} />
                <col style={{ width:"16%" }} />
                <col style={{ width:"16%" }} />
                <col style={{ width:"16%" }} />
              </colgroup>
              <thead>
                <tr style={{ borderBottom:"2px solid var(--card-border)" }}>
                  <th style={{ color:"var(--muted)", background:"rgba(128,128,128,.05)", padding:"10px 12px", textAlign:"right", fontSize:11, fontWeight:700 }}>م</th>
                  <th style={{ color:"var(--muted)", background:"rgba(128,128,128,.05)", padding:"10px 12px", textAlign:"right", fontSize:11, fontWeight:700, whiteSpace:"nowrap" }}>التاريخ</th>
                  <th style={{ color:"var(--muted)", background:"rgba(128,128,128,.05)", padding:"10px 16px", textAlign:"right", fontSize:11, fontWeight:700 }}>البند / الوصف</th>
                  <th style={{ color:"var(--muted)", background:"rgba(128,128,128,.05)", padding:"10px 12px", textAlign:"right", fontSize:11, fontWeight:700, whiteSpace:"nowrap" }}>المبلغ (ج.م)</th>
                  <th style={{ color:"var(--muted)", background:"rgba(128,128,128,.05)", padding:"10px 12px", textAlign:"right", fontSize:11, fontWeight:700 }}>ملاحظات</th>
                  <th style={{ color:"var(--muted)", background:"rgba(128,128,128,.05)", padding:"10px 12px", textAlign:"center", fontSize:11, fontWeight:700 }}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="py-16 text-center" style={{ color:"var(--muted)" }}>
                    لا توجد حركات{(dateFrom||dateTo) && " في هذه الفترة"}
                  </td></tr>
                ) : filtered.map((t,i) => {
                  // normalizeType ensures correct comparison regardless of API response shape
                  const txType  = normalizeType(t.transactionType ?? t.type ?? TransactionType.Expense);
                  const isRev   = txType === TransactionType.Revenue;
                  const rawDate = t.transactionDate ?? t.date ?? "";
                  const dateStr = rawDate && !rawDate.startsWith("0001")
                    ? formatDate(rawDate) : "—";

                  return (
                    <tr key={t.id}
                      style={{ borderBottom:"1px solid var(--card-border)" }}
                      onMouseEnter={e=>e.currentTarget.style.background="rgba(128,128,128,.05)"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>

                      {/* م */}
                      <td style={{ padding:"12px", color:"var(--muted)", fontSize:12, textAlign:"right" }}>
                        {i+1}
                      </td>

                      {/* التاريخ */}
                      <td style={{ padding:"12px", color:"var(--foreground)", fontSize:12, whiteSpace:"nowrap" }}>
                        {dateStr}
                      </td>

                      {/* البند / الوصف — in one column, description + category hint */}
                      <td style={{ padding:"12px 16px", overflow:"hidden" }}>
                        <p style={{ color:"var(--foreground)", fontSize:13, fontWeight:500, lineHeight:1.4, margin:0, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                          {t.description || "—"}
                        </p>
                        {t.categoryName && (
                          <p style={{ color:"var(--muted)", fontSize:11, margin:"2px 0 0 0", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                            {t.categoryName}
                          </p>
                        )}
                      </td>

                      {/* المبلغ — +/- بلون واضح: أخضر للإيراد، أحمر للمصروف */}
                      <td style={{ padding:"12px", fontWeight:700, fontSize:13, whiteSpace:"nowrap",
                          color: isRev ? "#10b981" : "#ef4444" }}>
                        {isRev ? "+ " : "− "}{formatCurrency(t.amount)}
                      </td>

                      {/* ملاحظات */}
                      <td style={{ padding:"12px", color:"var(--muted)", fontSize:12, fontStyle:"italic", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                        {(t as {notes?:string}).notes ?? "—"}
                      </td>

                 {/* إجراءات */}
                      <td style={{ padding:"12px", textAlign:"center" }}>
                        <div style={{ display:"flex", gap:4, justifyContent:"center" }}>
                          <button onClick={() => openEdit(t)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                            style={{ color:"#6366f1" }}
                            onMouseEnter={e=>{ e.currentTarget.style.background="rgba(99,102,241,.12)"; }}
                            onMouseLeave={e=>{ e.currentTarget.style.background="transparent"; }}>
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setDeleteId(t.id)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                            style={{ color:"#ef4444" }}
                            onMouseEnter={e=>{ e.currentTarget.style.background="rgba(239,68,68,.12)"; }}
                            onMouseLeave={e=>{ e.currentTarget.style.background="transparent"; }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* ── Footer / إجمالي — الحركة أقصى الشمال، والأرقام جنب "الإجمالي" ── */}
              {filtered.length > 0 && (
                <tfoot>
                  <tr style={{ borderTop:"2px solid var(--card-border)", background:"rgba(128,128,128,.05)" }}>
                    <td colSpan={3}
                      style={{ padding:"12px 16px", fontSize:14, fontWeight:700, textAlign:"right", color:"var(--foreground)" }}>
                      الإجمالي
                    </td>
                    <td colSpan={3} style={{ padding:"12px 16px" }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:14, flexWrap:"wrap" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                          {totalRevenue > 0 && totalExpenses === 0 && (
                            <span style={{ fontWeight:800, fontSize:15, color:"#10b981", whiteSpace:"nowrap" }}>
                              + {formatCurrency(totalRevenue)}
                            </span>
                          )}
                          {totalExpenses > 0 && totalRevenue === 0 && (
                            <span style={{ fontWeight:800, fontSize:15, color:"#ef4444", whiteSpace:"nowrap" }}>
                              − {formatCurrency(totalExpenses)}
                            </span>
                          )}
                          {totalRevenue > 0 && totalExpenses > 0 && (
                            <>
                              <span style={{ color:"#10b981", fontSize:12, fontWeight:700, whiteSpace:"nowrap" }}>+ {formatCurrency(totalRevenue)}</span>
                              <span style={{ color:"#ef4444", fontSize:12, fontWeight:700, whiteSpace:"nowrap" }}>− {formatCurrency(totalExpenses)}</span>
                              <span style={{ color: net>=0?"#6366f1":"#f59e0b", fontWeight:800, fontSize:15, whiteSpace:"nowrap" }}>
                                = {net>=0?"+":""}{formatCurrency(net)}
                              </span>
                            </>
                          )}
                        </div>
                        <span style={{ fontSize:11, color:"var(--muted)", whiteSpace:"nowrap" }}>
                          {filtered.length} حركة
                        </span>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ══ Add / Edit Transaction Modal ══ */}
      <Modal open={showAdd || !!editItem} onClose={() => { setShowAdd(false); setEditItem(null); }}
        title={editItem ? "تعديل الحركة" : "إضافة حركة مالية"}>
        <form onSubmit={handleSaveTx} className="space-y-4">

          {/* 0. مصروف / إيداع toggle — للإضافة فقط — لون محايد موحّد */}
          {!editItem && (
            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl border" style={{ background:"rgba(128,128,128,.04)", borderColor:"var(--card-border)" }}>
              {([TransactionType.Expense, TransactionType.Revenue] as TransactionType[]).map(t => {
                const isSelected = txForm.type === t;
                const isRev = t === TransactionType.Revenue;
                return (
                  <button key={t} type="button"
                    onClick={() => setTxForm(p => ({ ...p, type:t, categoryId:"" }))}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all"
                    style={isSelected
                      ? { background:"linear-gradient(135deg,#6366f1,#7c3aed)", color:"#fff", boxShadow:"0 3px 12px rgba(99,102,241,.3)" }
                      : { background:"transparent", color:"var(--muted)" }
                    }>
                    {isRev ? "إيداع" : "مصروف"}
                  </button>
                );
              })}
            </div>
          )}

          {/* 1. التصنيف — لون محايد واحد بدل الأحمر/الأخضر */}
          <div>
            <label className="block text-xs font-bold mb-2" style={{ color:"var(--muted)" }}>
              التصنيف <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {categories
                .filter(c => editItem ? true : normalizeType(c.type) === txForm.type)
                .map(c => {
                  const isSelected = txForm.categoryId === String(c.id);
                  return (
                    <button key={c.id} type="button"
                      onClick={() => setTxForm(p => ({ ...p, categoryId: String(c.id) }))}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border-2 text-right transition-all"
                      style={isSelected
                        ? { borderColor: NEUTRAL_ACCENT, background: NEUTRAL_ACCENT_BG, color: NEUTRAL_ACCENT }
                        : { borderColor:"var(--card-border)", background:"transparent", color:"var(--muted)" }
                      }>
                      <span className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: isSelected ? NEUTRAL_ACCENT : "var(--card-border)" }} />
                      {c.name}
                    </button>
                  );
                })}
            </div>
            {categories.filter(c => editItem ? true : normalizeType(c.type) === txForm.type).length === 0 && (
              <p className="text-xs mt-1.5 px-1" style={{ color:"#ef4444" }}>
                لا توجد تصنيفات لهذا النوع — أضف تصنيف أولاً
              </p>
            )}
          </div>

          {/* 2. الوصف */}
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color:"var(--muted)" }}>
              البند / الوصف
            </label>
            <input
              type="text"
              value={txForm.description}
              onChange={e => setTxForm(p => ({ ...p, description: e.target.value }))}
              placeholder="مثال: صيانة المصعد، إيجار الطابق الأرضي..."
              className={ic} style={iStyle()}
            />
          </div>

          {/* 3. التاريخ + المبلغ — المبلغ بلون محايد بدل الأحمر/الأخضر */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color:"var(--muted)" }}>
                التاريخ <span className="text-red-400">*</span>
              </label>
              <input type="date" required value={txForm.date}
                onChange={e => setTxForm(p => ({ ...p, date: e.target.value }))}
                className={ic} style={iStyle()} />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color:"var(--muted)" }}>
                المبلغ (ج.م) <span className="text-red-400">*</span>
              </label>
              <input type="number" min={0} step="0.01" required
                value={txForm.amount}
                onChange={e => setTxForm(p => ({ ...p, amount: e.target.value }))}
                placeholder="0.00"
                className={ic}
                style={{ ...iStyle(), fontWeight:700 }}
              />
            </div>
          </div>

          {/* 4. ملاحظات */}
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color:"var(--muted)" }}>
              ملاحظات
            </label>
            <textarea
              value={txForm.notes}
              onChange={e => setTxForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="أي ملاحظات إضافية..."
              rows={2}
              className={ic} style={{ ...iStyle(), resize:"vertical" }}
            />
          </div>

          {formErr && (
            <p className="text-xs p-2.5 rounded-lg"
              style={{ background:"rgba(239,68,68,.1)", color:"#ef4444" }}>
              {formErr}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving || !txForm.categoryId}
              className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all"
              style={{ background: !txForm.categoryId
                ? "rgba(128,128,128,.3)"
                : "linear-gradient(135deg,#6366f1,#7c3aed)",
                boxShadow: !txForm.categoryId ? "none" : "0 3px 12px rgba(99,102,241,.3)" }}>
              {saving ? "جاري الحفظ..." : editItem ? "حفظ التعديل" : "إضافة"}
            </button>
            <button type="button"
              onClick={() => { setShowAdd(false); setEditItem(null); }}
              className="flex-1 py-3 rounded-xl text-sm font-medium border transition-colors"
              style={cStyle()}>
              إلغاء
            </button>
          </div>
        </form>
      </Modal>

      {/* ══ Add Category Modal ══ */}
      <Modal open={showAddCat} onClose={() => setShowAddCat(false)} title="إضافة تصنيف مالي" size="sm">
        <form onSubmit={handleAddCat} className="space-y-4">
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color:"var(--muted)" }}>
              اسم التصنيف <span className="text-red-400">*</span>
            </label>
            <input type="text" required value={catForm.name}
              onChange={e => setCatForm(p => ({ ...p, name:e.target.value }))}
              placeholder="مثال: مصروفات عموميات، إيرادات أحمد..."
              className={ic} style={iStyle()} />
          </div>
         
          {formErr && (
            <p className="text-xs p-2.5 rounded-lg"
              style={{ background:"rgba(239,68,68,.1)", color:"#ef4444" }}>
              {formErr}
            </p>
          )}
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
              style={{ background:"linear-gradient(135deg,#6366f1,#7c3aed)" }}>
              {saving ? "جاري..." : "إضافة التصنيف"}
            </button>
            <button type="button" onClick={() => setShowAddCat(false)}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium border"
              style={cStyle()}>
              إلغاء
            </button>
          </div>
        </form>
      </Modal>

      {/* ══ Delete ══ */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="تأكيد الحذف" size="sm">
        <p className="text-sm mb-5" style={{ color:"var(--muted)" }}>هل أنت متأكد من حذف هذه الحركة؟</p>
        <div className="flex gap-2">
          <button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background:"#ef4444" }}>حذف</button>
          <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium border" style={cStyle()}>إلغاء</button>
        </div>
      </Modal>

    </DashboardShell>
  );
}