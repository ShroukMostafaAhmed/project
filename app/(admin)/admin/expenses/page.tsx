"use client";

import { useState, useMemo } from "react";
import {
  Plus, ArrowUpCircle, ArrowDownCircle, Search,
  Printer, SlidersHorizontal, X,
  TrendingUp, TrendingDown, Wallet, Pencil, Trash2,
} from "lucide-react";
import DashboardShell from "@/app/components/layout/DashboardShell";
import PageHeader from "@/app/components/ui/PageHeader";
import Modal from "@/app/components/ui/Modal";
import { formatCurrency, formatDate } from "@/app/lib/utils";

type TxType = "صرف" | "إيداع";

interface Transaction {
  id: number; type: TxType; amount: number;
  description: string; category: string; date: string; unit?: string;
}

const INIT: Transaction[] = [
  { id:1, type:"صرف",   amount:15000, description:"صيانة المصعد",        category:"صيانة",  date:"2026-01-15", unit:"برج A1"  },
  { id:2, type:"إيداع", amount:50000, description:"إيجار الطابق الأرضي", category:"إيجار",  date:"2026-01-20", unit:"برج A1"  },
  { id:3, type:"صرف",   amount:8000,  description:"فواتير الكهرباء",     category:"مرافق",  date:"2026-01-25", unit:"برج A2"  },
  { id:4, type:"صرف",   amount:3500,  description:"نظافة المبنى",        category:"خدمات",  date:"2026-02-01", unit:"برج A1"  },
  { id:5, type:"إيداع", amount:75000, description:"بيع شقة 304",         category:"مبيعات", date:"2026-02-10", unit:"برج A2"  },
  { id:6, type:"صرف",   amount:12000, description:"رواتب الحراسة",       category:"رواتب",  date:"2026-02-15", unit:"الشركة" },
  { id:7, type:"إيداع", amount:30000, description:"دفعة مقدمة شقة 201",  category:"مبيعات", date:"2026-03-01", unit:"برج A1"  },
  { id:8, type:"صرف",   amount:5000,  description:"رسوم قانونية",        category:"أخرى",   date:"2026-03-05", unit:"الشركة" },
];

const CATS = ["الكل","صيانة","مرافق","رواتب","خدمات","إيجار","مبيعات","أخرى"];

/* ── small helpers ──────────────────────────────────────────────────────────── */
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted)" }}>
        {label}{required && <span className="text-red-400 mr-1">*</span>}
      </label>
      {children}
    </div>
  );
}

function inputCls(extra = "") {
  return `w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none transition-all ${extra}`;
}

export default function AdminExpensesPage() {
  const [transactions, setTransactions] = useState<Transaction[]>(INIT);

  /* filters */
  const [search,      setSearch]      = useState("");
  const [filterType,  setFilterType]  = useState<"الكل" | TxType>("الكل");
  const [filterCat,   setFilterCat]   = useState("الكل");
  const [dateFrom,    setDateFrom]    = useState("");
  const [dateTo,      setDateTo]      = useState("");
  const [showFilters, setShowFilters] = useState(false);

  /* add / edit modal */
  const [showAdd,  setShowAdd]  = useState(false);
  const [editId,   setEditId]   = useState<number | null>(null);
  const [form, setForm] = useState({
    type:"صرف" as TxType, amount:"", description:"",
    category:"أخرى", date: new Date().toISOString().split("T")[0], unit:"",
  });

  function openAdd() {
    setEditId(null);
    setForm({ type:"صرف", amount:"", description:"", category:"أخرى", date:new Date().toISOString().split("T")[0], unit:"" });
    setShowAdd(true);
  }

  function openEdit(t: Transaction) {
    setEditId(t.id);
    setForm({ type:t.type, amount:String(t.amount), description:t.description, category:t.category, date:t.date, unit:t.unit ?? "" });
    setShowAdd(true);
  }

  /* derived */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return transactions.filter((t) => {
      const mQ  = !q || t.description.toLowerCase().includes(q) || (t.unit??"").toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
      const mT  = filterType === "الكل" || t.type === filterType;
      const mC  = filterCat  === "الكل" || t.category === filterCat;
      const mDF = !dateFrom || t.date >= dateFrom;
      const mDT = !dateTo   || t.date <= dateTo;
      return mQ && mT && mC && mDF && mDT;
    });
  }, [transactions, search, filterType, filterCat, dateFrom, dateTo]);

  const totalIn  = transactions.filter(t => t.type === "إيداع").reduce((s,t) => s+t.amount, 0);
  const totalOut = transactions.filter(t => t.type === "صرف").  reduce((s,t) => s+t.amount, 0);
  const balance  = totalIn - totalOut;
  const fIn      = filtered.filter(t => t.type === "إيداع").reduce((s,t) => s+t.amount, 0);
  const fOut     = filtered.filter(t => t.type === "صرف").  reduce((s,t) => s+t.amount, 0);
  const hasFilter = !!(search || filterType !== "الكل" || filterCat !== "الكل" || dateFrom || dateTo);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (editId !== null) {
      // Update existing
      setTransactions(p => p.map(t => t.id === editId
        ? { ...t, type:form.type, amount:parseFloat(form.amount), description:form.description, category:form.category, date:form.date, unit:form.unit||undefined }
        : t
      ));
    } else {
      // New entry
      setTransactions(p => [{ id:Date.now(), type:form.type, amount:parseFloat(form.amount),
        description:form.description, category:form.category, date:form.date, unit:form.unit||undefined }, ...p]);
    }
    setShowAdd(false);
    setEditId(null);
  }

  function handleDelete(id: number) {
    if (!confirm("هل أنت متأكد من حذف هذه الحركة؟")) return;
    setTransactions(p => p.filter(t => t.id !== id));
  }

  function clear() { setSearch(""); setFilterType("الكل"); setFilterCat("الكل"); setDateFrom(""); setDateTo(""); }

  /* ── render ── */
  return (
    <DashboardShell title="المصاريف">
      <PageHeader
        title="المصاريف والإيرادات"
        subtitle="سجل جميع حركات الصرف والإيداع"
        actions={
          <div className="flex gap-2 no-print">
            <button onClick={() => window.print()}
              className="flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-xl border transition-colors"
              style={{ background:"var(--card)", color:"var(--foreground)", borderColor:"var(--card-border)" }}>
              <Printer className="w-4 h-4" /> طباعة
            </button>
            <button onClick={openAdd}
              className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl text-white transition-colors"
              style={{ background:"linear-gradient(135deg,#6366f1,#7c3aed)", boxShadow:"0 3px 12px rgba(99,102,241,.3)" }}>
              <Plus className="w-4 h-4" /> إضافة حركة
            </button>
          </div>
        }
      />

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        {[
          { label:"إجمالي الإيداعات", value:totalIn,  icon:TrendingUp,   clr:"#10b981", bg:"rgba(16,185,129,.1)",  border:"rgba(16,185,129,.25)"  },
          { label:"إجمالي المصاريف",  value:totalOut, icon:TrendingDown, clr:"#ef4444", bg:"rgba(239,68,68,.1)",   border:"rgba(239,68,68,.25)"   },
          { label:"الرصيد الصافي",    value:balance,  icon:Wallet,
            clr:balance>=0?"#6366f1":"#f59e0b",
            bg:balance>=0?"rgba(99,102,241,.1)":"rgba(245,158,11,.1)",
            border:balance>=0?"rgba(99,102,241,.25)":"rgba(245,158,11,.25)" },
        ].map(({ label, value, icon:Icon, clr, bg, border }) => (
          <div key={label}
            className="rounded-2xl p-4 flex items-center gap-4 transition-all hover:-translate-y-0.5"
            style={{ background:"var(--card)", border:`1px solid var(--card-border)` }}>
            {/* Icon */}
            <div className="p-3 rounded-xl shrink-0" style={{ background: bg, border:`1px solid ${border}` }}>
              <Icon className="w-5 h-5" style={{ color: clr }} />
            </div>
            <div>
              <p className="text-xs font-medium mb-0.5" style={{ color:"var(--muted)" }}>{label}</p>
              <p className="text-xl font-bold" style={{ color: clr }}>{formatCurrency(value)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter bar ── */}
      <div className="flex flex-wrap gap-2 mb-3 no-print">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color:"var(--muted)" }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث..."
            className={inputCls("pr-9 pl-8")}
            style={{ background:"var(--card)", borderColor:"var(--card-border)", color:"var(--foreground)" }}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:"var(--muted)" }}>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Type pills */}
        <div className="flex rounded-xl p-1 gap-0.5 border"
          style={{ background:"var(--card)", borderColor:"var(--card-border)" }}>
          {(["الكل","إيداع","صرف"] as const).map((v) => (
            <button key={v} onClick={() => setFilterType(v)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={filterType===v
                ? { background: v==="إيداع"?"#10b981":v==="صرف"?"#ef4444":"#6366f1", color:"#fff" }
                : { color:"var(--muted)", background:"transparent" }
              }>
              {v}
            </button>
          ))}
        </div>

        {/* Filters button */}
        <button
          onClick={() => setShowFilters(v => !v)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all no-print"
          style={{
            background:   showFilters ? "rgba(99,102,241,.1)" : "var(--card)",
            color:        showFilters ? "#6366f1" : "var(--muted)",
            borderColor:  showFilters ? "rgba(99,102,241,.3)" : "var(--card-border)",
          }}>
          <SlidersHorizontal className="w-4 h-4" />
          فلترة
          {hasFilter && <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />}
        </button>
      </div>

      {/* ── Expanded filters ── */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 mb-4 p-4 rounded-2xl border no-print"
          style={{ background:"var(--card)", borderColor:"var(--card-border)" }}>
          {[
            { label:"التصنيف", type:"select" as const },
            { label:"من تاريخ", type:"date" as const, name:"dateFrom" },
            { label:"إلى تاريخ", type:"date" as const, name:"dateTo"  },
          ].map((f) => (
            <div key={f.label}>
              <label className="block text-xs font-medium mb-1.5" style={{ color:"var(--muted)" }}>{f.label}</label>
              {f.type === "select" ? (
                <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
                  className={inputCls("w-36")}
                  style={{ background:"var(--input-bg)", borderColor:"var(--input-border)", color:"var(--foreground)" }}>
                  {CATS.map(c => <option key={c}>{c}</option>)}
                </select>
              ) : (
                <input type="date"
                  value={f.name === "dateFrom" ? dateFrom : dateTo}
                  onChange={e => f.name === "dateFrom" ? setDateFrom(e.target.value) : setDateTo(e.target.value)}
                  className={inputCls("")}
                  style={{ background:"var(--input-bg)", borderColor:"var(--input-border)", color:"var(--foreground)" }}
                />
              )}
            </div>
          ))}

          {hasFilter && (
            <button onClick={clear} className="self-end px-3 py-2 text-xs font-medium rounded-xl border transition-colors"
              style={{ color:"#ef4444", borderColor:"rgba(239,68,68,.3)", background:"rgba(239,68,68,.06)" }}>
              مسح الكل
            </button>
          )}

          <div className="self-end flex gap-3 mr-auto text-xs font-semibold">
            <span style={{ color:"#10b981" }}>+{formatCurrency(fIn)}</span>
            <span style={{ color:"#ef4444" }}>−{formatCurrency(fOut)}</span>
            <span style={{ color:"var(--muted)" }}>({filtered.length} حركة)</span>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <div className="rounded-2xl border overflow-hidden shadow-sm"
        style={{ background:"var(--card)", borderColor:"var(--card-border)" }}>

        {/* Table toolbar */}
        <div className="flex items-center justify-between px-5 py-3 border-b"
          style={{ borderColor:"var(--card-border)", background:"rgba(128,128,128,.04)" }}>
          <span className="text-sm font-semibold" style={{ color:"var(--foreground)" }}>الحركات المالية</span>
          <span className="text-xs px-2.5 py-1 rounded-full"
            style={{ background:"rgba(128,128,128,.1)", color:"var(--muted)" }}>
            {filtered.length} / {transactions.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr style={{ borderBottom:`1px solid var(--card-border)` }}>
                {["النوع","البيان","التصنيف","الوحدة","المبلغ","التاريخ",""].map(h => (
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
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="w-10 h-10 opacity-20" style={{ color:"var(--muted)" }} />
                      <p className="text-sm" style={{ color:"var(--muted)" }}>لا توجد نتائج</p>
                      {hasFilter && (
                        <button onClick={clear} className="text-xs text-indigo-500 hover:underline mt-1">مسح الفلاتر</button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : filtered.map((t) => (
                <tr key={t.id}
                  className="transition-colors"
                  style={{ borderBottom:`1px solid var(--card-border)` }}
                  onMouseEnter={e => e.currentTarget.style.background="rgba(128,128,128,.04)"}
                  onMouseLeave={e => e.currentTarget.style.background="transparent"}
                >
                  {/* Type */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg"
                        style={{ background: t.type==="إيداع"?"rgba(16,185,129,.12)":"rgba(239,68,68,.12)" }}>
                        {t.type==="إيداع"
                          ? <ArrowUpCircle   className="w-3.5 h-3.5" style={{ color:"#10b981" }} />
                          : <ArrowDownCircle className="w-3.5 h-3.5" style={{ color:"#ef4444" }} />
                        }
                      </div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          background: t.type==="إيداع"?"rgba(16,185,129,.12)":"rgba(239,68,68,.12)",
                          color:      t.type==="إيداع"?"#10b981":"#ef4444",
                        }}>
                        {t.type}
                      </span>
                    </div>
                  </td>

                  {/* Description */}
                  <td className="px-4 py-3.5 font-medium max-w-xs" style={{ color:"var(--foreground)" }}>
                    {t.description}
                  </td>

                  {/* Category */}
                  <td className="px-4 py-3.5">
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background:"rgba(99,102,241,.1)", color:"#818cf8" }}>
                      {t.category}
                    </span>
                  </td>

                  {/* Unit */}
                  <td className="px-4 py-3.5 text-xs">
                    {t.unit
                      ? <span className="px-2 py-0.5 rounded-lg" style={{ background:"rgba(128,128,128,.1)", color:"var(--muted)" }}>{t.unit}</span>
                      : <span style={{ color:"var(--muted)" }}>—</span>
                    }
                  </td>

                  {/* Amount */}
                  <td className="px-4 py-3.5 font-bold tabular-nums"
                    style={{ color: t.type==="إيداع"?"#10b981":"#ef4444" }}>
                    {t.type==="إيداع" ? "+" : "−"}{formatCurrency(t.amount)}
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3.5 text-xs whitespace-nowrap" style={{ color:"var(--muted)" }}>
                    {formatDate(t.date)}
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => openEdit(t)}
                        title="تعديل"
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                        style={{ color:"#6366f1" }}
                        onMouseEnter={e => e.currentTarget.style.background="rgba(99,102,241,.12)"}
                        onMouseLeave={e => e.currentTarget.style.background="transparent"}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        title="حذف"
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                        style={{ color:"#ef4444" }}
                        onMouseEnter={e => e.currentTarget.style.background="rgba(239,68,68,.12)"}
                        onMouseLeave={e => e.currentTarget.style.background="transparent"}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>

            {/* Footer totals */}
            {filtered.length > 1 && (
              <tfoot>
                <tr style={{ borderTop:`2px solid var(--card-border)`, background:"rgba(128,128,128,.04)" }}>
                  <td colSpan={5} className="px-4 py-3 text-xs font-semibold" style={{ color:"var(--muted)" }}>
                    الإجمالي ({filtered.length} حركة)
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold" style={{ color:"#10b981" }}>+{formatCurrency(fIn)}</span>
                      <span className="text-xs font-bold" style={{ color:"#ef4444" }}>−{formatCurrency(fOut)}</span>
                    </div>
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ── Add Modal ── */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); setEditId(null); }} title={editId ? "تعديل الحركة" : "إضافة حركة مالية"}>
        <form onSubmit={handleAdd} className="space-y-4">
          {/* Type toggle */}
          <div className="grid grid-cols-2 gap-2">
            {(["صرف","إيداع"] as TxType[]).map((t) => (
              <button key={t} type="button" onClick={() => setForm(p => ({ ...p, type:t }))}
                className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all border-2"
                style={form.type===t
                  ? t==="صرف"
                    ? { borderColor:"#ef4444", background:"rgba(239,68,68,.1)", color:"#ef4444" }
                    : { borderColor:"#10b981", background:"rgba(16,185,129,.1)", color:"#10b981" }
                  : { borderColor:"var(--card-border)", background:"transparent", color:"var(--muted)" }
                }>
                {t==="صرف"
                  ? <><ArrowDownCircle className="w-4 h-4" /> صرف</>
                  : <><ArrowUpCircle   className="w-4 h-4" /> إيداع</>
                }
              </button>
            ))}
          </div>

          {/* Fields */}
          <Field label="البيان" required>
            <input type="text" required value={form.description}
              onChange={e => setForm(p => ({ ...p, description:e.target.value }))}
              className={inputCls("")}
              style={{ background:"var(--input-bg)", borderColor:"var(--input-border)", color:"var(--foreground)" }}
            />
          </Field>
          <Field label="المبلغ (جنيه)" required>
            <input type="number" required value={form.amount}
              onChange={e => setForm(p => ({ ...p, amount:e.target.value }))}
              className={inputCls("")}
              style={{ background:"var(--input-bg)", borderColor:"var(--input-border)", color:"var(--foreground)" }}
            />
          </Field>
          <Field label="التاريخ" required>
            <input type="date" required value={form.date}
              onChange={e => setForm(p => ({ ...p, date:e.target.value }))}
              className={inputCls("")}
              style={{ background:"var(--input-bg)", borderColor:"var(--input-border)", color:"var(--foreground)" }}
            />
          </Field>
          <Field label="الوحدة">
            <input type="text" value={form.unit}
              onChange={e => setForm(p => ({ ...p, unit:e.target.value }))}
              className={inputCls("")}
              style={{ background:"var(--input-bg)", borderColor:"var(--input-border)", color:"var(--foreground)" }}
            />
          </Field>
          <Field label="التصنيف">
            <select value={form.category} onChange={e => setForm(p => ({ ...p, category:e.target.value }))}
              className={inputCls("w-full")}
              style={{ background:"var(--input-bg)", borderColor:"var(--input-border)", color:"var(--foreground)" }}>
              {CATS.filter(c => c!=="الكل").map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>

          <div className="flex gap-2 pt-1">
            <button type="submit"
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background:"linear-gradient(135deg,#6366f1,#7c3aed)" }}>
              {editId ? "حفظ التعديل" : "إضافة"}
            </button>
            <button type="button" onClick={() => { setShowAdd(false); setEditId(null); }}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors"
              style={{ background:"var(--card)", borderColor:"var(--card-border)", color:"var(--foreground)" }}>
              إلغاء
            </button>
          </div>
        </form>
      </Modal>
    </DashboardShell>
  );
}
