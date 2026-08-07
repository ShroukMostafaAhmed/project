"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus, Trash2, AlertCircle, RefreshCw,
  TrendingUp, TrendingDown, ChevronDown, ChevronUp, Calendar, Lock,
  Search, X,
} from "lucide-react";
import DashboardShell from "@/app/components/layout/DashboardShell";
import PageHeader from "@/app/components/ui/PageHeader";
import Modal from "@/app/components/ui/Modal";
import { Skeleton } from "@/app/components/ui/Skeleton";
import { api } from "@/app/lib/api";
import { FinancialAuditDto, CreateFinancialAuditDto } from "@/app/lib/types";
import { formatCurrency, formatDate } from "@/app/lib/utils";

function cStyle(): React.CSSProperties {
  return { background: "var(--card)", border: "1px solid var(--card-border)" };
}
function iStyle(): React.CSSProperties {
  return { background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--foreground)" };
}
const ic = "w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none transition-all";

type Preview = Omit<CreateFinancialAuditDto, "previousAuditId" | "name">;

export default function AdminAuditsPage() {
  const [audits,     setAudits]     = useState<FinancialAuditDto[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showNew,    setShowNew]    = useState(false);
  const [deleteId,   setDeleteId]   = useState<number | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [formErr,    setFormErr]    = useState("");
  const [preview,    setPreview]    = useState<Preview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [form, setForm] = useState({ name: "", fromDate: "", toDate: "", openingBalance: "" });

  /* ══ فلتر الجرد: بالتاريخ أو برقم الجرد ══ */
  const [filterMode, setFilterMode] = useState<"date" | "number">("date");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo,   setFilterTo]   = useState("");
  const [filterNum,  setFilterNum]  = useState("");

  const hasActiveFilter = filterMode === "date" ? !!(filterFrom || filterTo) : !!filterNum;

  function clearFilter() {
    setFilterFrom(""); setFilterTo(""); setFilterNum("");
  }

  /* ══ ترتيب زمني حقيقي (بالتاريخ مش بالـ id) — عشان "آخر جرد" يبقى صح دايمًا ══ */
  const sortedAudits = useMemo(
    () => [...audits].sort((a, b) => new Date(a.toDate).getTime() - new Date(b.toDate).getTime()),
    [audits]
  );
  const lastAudit = sortedAudits.length ? sortedAudits[sortedAudits.length - 1] : null;

  /* ══ تطبيق الفلتر فوق القايمة المرتبة، مع الحفاظ على رقم الجرد الأصلي (idx) ══ */
  const numberedAudits = useMemo(
    () => sortedAudits.map((a, idx) => ({ ...a, __num: idx + 1 })),
    [sortedAudits]
  );

  const filteredAudits = useMemo(() => {
    if (filterMode === "date") {
      if (!filterFrom && !filterTo) return numberedAudits;
      return numberedAudits.filter(a => {
        const okFrom = filterFrom ? a.toDate >= filterFrom : true;
        const okTo   = filterTo   ? a.fromDate <= filterTo : true;
        return okFrom && okTo;
      });
    }
    if (!filterNum.trim()) return numberedAudits;
    const q = filterNum.trim();
    return numberedAudits.filter(a =>
      String(a.__num).includes(q) || a.name.toLowerCase().includes(q.toLowerCase())
    );
  }, [numberedAudits, filterMode, filterFrom, filterTo, filterNum]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const data = await api.financialAudits.list();
      setAudits(Array.isArray(data) ? data : []);
    } catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setForm({
      name: `جرد ${audits.length + 1}`,
      fromDate: "",
      toDate: "",
      // أول جرد بس هو اللي بيتدخل رصيده يدوي (رأس المال الأصلي)، أي جرد بعده مقفول ومرحّل تلقائي
      openingBalance: lastAudit ? String(lastAudit.closingBalance) : "0",
    });
    setPreview(null);
    setFormErr("");
    setShowNew(true);
  }

  async function handleCalc() {
    if (!form.fromDate || !form.toDate) { setFormErr("اختر الفترة الزمنية أولاً"); return; }
    if (form.fromDate > form.toDate) { setFormErr("تاريخ البداية لازم يكون قبل تاريخ النهاية"); return; }
    setPreviewLoading(true); setFormErr("");
    try {
      const sum = await api.financialTransactions.summary({ fromDate: form.fromDate, toDate: form.toDate });
      // الرصيد الافتتاحي: يدوي بس لو ده أول جرد، وإلا بياخد من رصيد آخر جرد تلقائي (مش قابل للتعديل)
      const opening = lastAudit ? lastAudit.closingBalance : (parseFloat(form.openingBalance) || 0);
      // API يرجع totalRevenues (بـ s) و netBalance — مش totalRevenue / netProfit
      const rev = sum.totalRevenues ?? sum.totalRevenue ?? 0;
      const exp = sum.totalExpenses ?? 0;
      const net = sum.netBalance    ?? sum.netProfit    ?? (rev - exp);
      setPreview({
        fromDate:       form.fromDate,
        toDate:         form.toDate,
        openingBalance: opening,
        totalRevenue:   rev,
        totalExpenses:  exp,
        netResult:      net,
        closingBalance: opening + net,
      });
    } catch (err) { setFormErr((err as Error).message); }
    finally { setPreviewLoading(false); }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!preview) { setFormErr("احسب من الحركات أولاً"); return; }
    setSaving(true); setFormErr("");
    try {
      const payload: CreateFinancialAuditDto = {
        ...preview,
        name: form.name || `جرد ${audits.length + 1}`,
        previousAuditId: lastAudit?.id ?? null,
      };
      await api.financialAudits.create(payload);
      setShowNew(false);
      await load();
    } catch (err) { setFormErr((err as Error).message); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try { await api.financialAudits.delete(deleteId); setDeleteId(null); await load(); }
    catch (err) { alert((err as Error).message); }
  }

  function previousName(id: number | null) {
    if (!id) return null;
    return audits.find(a => a.id === id)?.name ?? `#${id}`;
  }

  return (
    <DashboardShell title="الجرد">
      <PageHeader
        title="الجرد المالي"
        subtitle={`${audits.length} جرد مسجل${hasActiveFilter ? ` — ${filteredAudits.length} ظاهر بعد الفلتر` : ""}`}
        actions={
          <div className="flex gap-2">
            <button onClick={load} className="w-9 h-9 rounded-xl border flex items-center justify-center" style={cStyle()} title="تحديث">
              <RefreshCw className="w-4 h-4" style={{ color: "var(--muted)" }} />
            </button>
            <button onClick={openNew}
              className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl text-white"
              style={{ background: "linear-gradient(135deg,#6366f1,#7c3aed)", boxShadow: "0 3px 12px rgba(99,102,241,.3)" }}>
              <Plus className="w-4 h-4" /> جرد جديد
            </button>
          </div>
        }
      />

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl mb-4 text-sm" style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.25)", color: "#ef4444" }}>
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* ══ شريط الفلترة ══ */}
      <div className="rounded-2xl border p-4 mb-4" style={cStyle()}>
        <div className="flex items-center gap-2 mb-3">
          <Search className="w-4 h-4" style={{ color: "var(--muted)" }} />

          <div className="flex items-center gap-1 mr-auto rtl:mr-0 rtl:ml-auto p-1 rounded-xl" style={{ background: "var(--input-bg)" }}>
            <button
              onClick={() => { setFilterMode("date"); setFilterNum(""); }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={filterMode === "date"
                ? { background: "linear-gradient(135deg,#6366f1,#7c3aed)", color: "#fff" }
                : { color: "var(--muted)" }}>
              بالتاريخ
            </button>
            <button
              onClick={() => { setFilterMode("number"); setFilterFrom(""); setFilterTo(""); }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={filterMode === "number"
                ? { background: "linear-gradient(135deg,#6366f1,#7c3aed)", color: "#fff" }
                : { color: "var(--muted)" }}>
              برقم الجرد
            </button>
          </div>
        </div>

        {filterMode === "date" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted)" }}>من تاريخ</label>
              <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className={ic} style={iStyle()} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted)" }}>إلى تاريخ</label>
              <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} className={ic} style={iStyle()} />
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted)" }}>رقم الجرد أو اسمه</label>
            <input type="text" inputMode="numeric" value={filterNum} onChange={e => setFilterNum(e.target.value)} className={ic} style={iStyle()} placeholder="مثال: 3" />
          </div>
        )}

        {hasActiveFilter && (
          <button onClick={clearFilter} className="flex items-center gap-1.5 text-xs font-semibold mt-3" style={{ color: "#ef4444" }}>
            <X className="w-3.5 h-3.5" /> مسح الفلتر
          </button>
        )}
      </div>

      {/* Audits list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : filteredAudits.length === 0 ? (
        <div className="rounded-2xl border py-20 text-center" style={cStyle()}>
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: "var(--muted)" }} />
          <p className="font-semibold" style={{ color: "var(--foreground)" }}>
            {hasActiveFilter ? "لا توجد نتائج مطابقة للفلتر" : "لا توجد جرود بعد"}
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            {hasActiveFilter ? "جرّب تغيير معايير البحث" : "أنشئ أول جرد مالي"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAudits.map((a) => {
            const isExpanded = expandedId === a.id;
            const isProfit   = a.netResult >= 0;
            return (
              <div key={a.id} className="rounded-2xl border overflow-hidden transition-all" style={cStyle()}>
                <div
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                  style={{ background: isExpanded ? "rgba(99,102,241,.04)" : "transparent" }}
                  onClick={() => setExpandedId(isExpanded ? null : a.id)}
                >
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
                      style={{ background: "linear-gradient(135deg,#6366f1,#7c3aed)", boxShadow: "0 3px 10px rgba(99,102,241,.3)" }}>
                      {a.__num}
                    </div>
                    <div>
                      <p className="font-bold text-sm" style={{ color: "var(--foreground)" }}>{a.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                        {formatDate(a.fromDate)} — {formatDate(a.toDate)}
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 flex items-center justify-around gap-4 min-w-0">
                    <div className="text-center hidden sm:block">
                      <p className="text-xs mb-1" style={{ color: "var(--muted)" }}>صافي الربح</p>
                      <p className="text-base font-bold" style={{ color: isProfit ? "#10b981" : "#ef4444" }}>
                        {isProfit ? "+" : ""}{formatCurrency(a.netResult)}
                      </p>
                    </div>
                    <div className="text-center hidden sm:block">
                      <p className="text-xs mb-1" style={{ color: "var(--muted)" }}>الرصيد الختامي</p>
                      <p className="text-base font-bold" style={{ color: "#6366f1" }}>{formatCurrency(a.closingBalance)}</p>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full font-semibold hidden sm:inline-flex items-center gap-1"
                      style={{ background: isProfit ? "rgba(16,185,129,.1)" : "rgba(239,68,68,.1)", color: isProfit ? "#10b981" : "#ef4444" }}>
                      {isProfit ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {isProfit ? "زيادة" : "عجز"}
                    </span>
                  </div>

                  <div className="shrink-0">
                    {isExpanded ? <ChevronUp className="w-4 h-4" style={{ color: "var(--muted)" }} /> : <ChevronDown className="w-4 h-4" style={{ color: "var(--muted)" }} />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-5 pb-5 pt-1 border-t" style={{ borderColor: "var(--card-border)" }}>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-4">
                      {[
                        { label: "رصيد افتتاحي",     value: a.openingBalance,  clr: "#6366f1" },
                        { label: "إجمالي الإيرادات", value: a.totalRevenue,   clr: "#10b981" },
                        { label: "إجمالي المصروفات", value: a.totalExpenses,  clr: "#ef4444" },
                        { label: "صافي الربح",       value: a.netResult,      clr: isProfit ? "#10b981" : "#ef4444" },
                        { label: "الرصيد الختامي",   value: a.closingBalance, clr: "#6366f1" },
                      ].map(({ label, value, clr }) => (
                        <div key={label} className="rounded-xl p-3.5 text-center" style={{ background: `${clr}10` }}>
                          <p className="text-[10px] font-medium mb-1.5" style={{ color: "var(--muted)" }}>{label}</p>
                          <p className="text-sm font-bold" style={{ color: clr }}>{formatCurrency(value)}</p>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        {a.previousAuditId && (
                          <p className="text-xs" style={{ color: "var(--muted)" }}>
                            مرحّل من: «{previousName(a.previousAuditId)}»
                          </p>
                        )}
                        <p className="text-xs" style={{ color: "var(--muted)" }}>
                          تاريخ الإنشاء: {formatDate(a.createdAt)}
                        </p>
                      </div>
                     
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ══ New Audit Modal ══ */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="إنشاء جرد جديد" size="md">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted)" }}>اسم الجرد</label>
            <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={ic} style={iStyle()} placeholder={`جرد ${audits.length + 1}`} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted)" }}>من تاريخ <span className="text-red-400">*</span></label>
              <input type="date" required value={form.fromDate} onChange={e => { setForm(p => ({ ...p, fromDate: e.target.value })); setPreview(null); }} className={ic} style={iStyle()} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted)" }}>إلى تاريخ <span className="text-red-400">*</span></label>
              <input type="date" required value={form.toDate} onChange={e => { setForm(p => ({ ...p, toDate: e.target.value })); setPreview(null); }} className={ic} style={iStyle()} />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5" style={{ color: "var(--muted)" }}>
              الرصيد الافتتاحي
              {lastAudit && <Lock className="w-3 h-3" />}
              {lastAudit
                ? <span className="text-indigo-500">(مرحّل تلقائي من «{lastAudit.name}» — مش قابل للتعديل)</span>
                : <span className="text-amber-500">(أول جرد — دخّل رأس المال الأصلي)</span>}
            </label>
            <input
              type="number"
              value={lastAudit ? lastAudit.closingBalance : form.openingBalance}
              onChange={e => { if (!lastAudit) { setForm(p => ({ ...p, openingBalance: e.target.value })); setPreview(null); } }}
              readOnly={!!lastAudit}
              className={ic}
              style={lastAudit ? { ...iStyle(), opacity: .6, cursor: "not-allowed" } : iStyle()}
              placeholder="0.00"
            />
          </div>

          <button type="button" onClick={handleCalc} disabled={previewLoading}
            className="w-full py-2.5 rounded-xl text-sm font-semibold border-2 transition-all disabled:opacity-60"
            style={{ borderColor: "#6366f1", color: "#6366f1", background: "rgba(99,102,241,.07)" }}>
            {previewLoading ? "جاري الحساب..." : "احسب من الحركات"}
          </button>

          {preview && (
            <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(99,102,241,.06)", border: "1px solid rgba(99,102,241,.2)" }}>
              <p className="text-xs font-bold" style={{ color: "#6366f1" }}>معاينة الجرد</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "رصيد افتتاحي",     value: preview.openingBalance,  clr: "#6366f1" },
                  { label: "إجمالي الإيرادات", value: preview.totalRevenue,   clr: "#10b981" },
                  { label: "إجمالي المصروفات", value: preview.totalExpenses,  clr: "#ef4444" },
                  { label: "صافي الربح",       value: preview.netResult,      clr: preview.netResult >= 0 ? "#10b981" : "#ef4444" },
                  { label: "الرصيد الختامي",   value: preview.closingBalance, clr: "#6366f1" },
                ].map(({ label, value, clr }) => (
                  <div key={label} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/50">
                    <span className="text-xs" style={{ color: "var(--muted)" }}>{label}</span>
                    <span className="text-sm font-bold" style={{ color: clr }}>{formatCurrency(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {formErr && <p className="text-xs p-2.5 rounded-lg" style={{ background: "rgba(239,68,68,.1)", color: "#ef4444" }}>{formErr}</p>}

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving || !preview}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#6366f1,#7c3aed)" }}>
              {saving ? "جاري الحفظ..." : "حفظ الجرد"}
            </button>
            <button type="button" onClick={() => setShowNew(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium border" style={cStyle()}>إلغاء</button>
          </div>
        </form>
      </Modal>

    
    </DashboardShell>
  );
}