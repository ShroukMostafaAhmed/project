"use client";

import { useEffect, useState, useMemo } from "react";
import { TrendingDown, Wallet, RefreshCw, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import DashboardShell from "@/app/components/layout/DashboardShell";
import PageHeader from "@/app/components/ui/PageHeader";
import { Skeleton } from "@/app/components/ui/Skeleton";
import { api } from "@/app/lib/api";
import { getAuthUser } from "@/app/lib/auth";
import { ShareholderFinanceReportDto, UnitAuditStatus } from "@/app/lib/types";
import { formatCurrency, formatDate } from "@/app/lib/utils";

function cStyle(): React.CSSProperties {
  return { background: "var(--card)", border: "1px solid var(--card-border)" };
}

export default function ShareholderFinancePage() {
  const user          = getAuthUser();
  const shareholderId = user?.shareholderId ?? null;

  const [report,    setReport]    = useState<ShareholderFinanceReportDto | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [expanded,  setExpanded]  = useState<number | null>(null);

  // جرود لكل وحدة — map: unitId → UnitAuditDto[]
  const [unitAudits, setUnitAudits] = useState<Record<number, import("@/app/lib/types").UnitAuditDto[]>>({});

  async function load() {
    if (!shareholderId) { setLoading(false); return; }
    setLoading(true); setError("");
    try {
      const data = await api.finances.shareholderReport(shareholderId);
      setReport(data);
    } catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [shareholderId]); // eslint-disable-line

  // لما وحدة تتفتح — حمّل جرودها
  function toggleUnit(unitId: number) {
    setExpanded(p => p === unitId ? null : unitId);
    if (!unitAudits[unitId]) {
      api.unitAudits.list(unitId)
        .then(data => setUnitAudits(p => ({ ...p, [unitId]: Array.isArray(data) ? data : [] })))
        .catch(() => {});
    }
  }

  const totalOwed = report?.totalOwedAmount ?? 0;
  const totalPaid = report?.totalPaidAmount ?? 0;
  const totalDebt = report?.totalDebtAmount ?? 0;

  if (loading) return (
    <DashboardShell title="الماليه">
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
        {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
      </div>
    </DashboardShell>
  );

  return (
    <DashboardShell title="الماليه">
      <PageHeader title="وضعي المالي"
        subtitle="ديونك ومدفوعاتك في كل وحدة"
        actions={
          <button onClick={load} className="w-9 h-9 rounded-xl border flex items-center justify-center" style={cStyle()}>
            <RefreshCw className="w-4 h-4" style={{ color: "var(--muted)" }} />
          </button>
        }
      />

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl mb-4 text-sm"
          style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.25)", color: "#ef4444" }}>
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "إجمالي المطلوب",   value: totalOwed, clr: "#ef4444", bg: "rgba(239,68,68,.1)",   icon: TrendingDown },
          { label: "إجمالي المسدَّد",  value: totalPaid, clr: "#10b981", bg: "rgba(16,185,129,.1)",  icon: Wallet },
          { label: "الدين المتبقي",    value: totalDebt, clr: totalDebt > 0 ? "#f59e0b" : "#10b981",
            bg: totalDebt > 0 ? "rgba(245,158,11,.1)" : "rgba(16,185,129,.1)",  icon: Wallet },
        ].map(({ label, value, clr, bg, icon: Icon }) => (
          <div key={label} className="rounded-2xl p-4 flex items-start gap-3" style={cStyle()}>
            <div className="p-2.5 rounded-xl shrink-0 mt-0.5" style={{ background: bg }}>
              <Icon className="w-4 h-4" style={{ color: clr }} />
            </div>
            <div>
              <p className="text-xs font-medium mb-0.5" style={{ color: "var(--muted)" }}>{label}</p>
              <p className="text-lg font-bold" style={{ color: clr }}>{formatCurrency(value)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Per-unit details */}
      {!report || !report.units?.length ? (
        <div className="rounded-2xl border py-16 text-center" style={cStyle()}>
          <p className="text-sm" style={{ color: "var(--muted)" }}>لا توجد بيانات مالية بعد</p>
        </div>
      ) : (
        <div className="space-y-3">
          {report.units.map(u => {
            const isOpen = expanded === u.unitId;
            const hasDebt = u.debtAmount > 0;
            const audits = unitAudits[u.unitId] ?? [];
            const closedAudits = audits.filter(a => a.status === UnitAuditStatus.Closed);

            return (
              <div key={u.unitId} className="rounded-2xl border overflow-hidden" style={cStyle()}>
                {/* Unit header */}
                <div className="flex items-center gap-4 px-5 py-4 cursor-pointer"
                  style={{ background: isOpen ? "rgba(99,102,241,.04)" : "transparent" }}
                  onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = "rgba(128,128,128,.04)"; }}
                  onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = "transparent"; }}
                  onClick={() => toggleUnit(u.unitId)}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ background: "linear-gradient(135deg,#6366f1,#7c3aed)" }}>
                    {(u.unitName ?? "؟")[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm" style={{ color: "var(--foreground)" }}>{u.unitName ?? `وحدة ${u.unitId}`}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                      {u.sharesCount} سهم — {u.sharePercentage?.toFixed(1)}%
                    </p>
                  </div>
                  <div className="hidden sm:flex items-center gap-5 shrink-0">
                    {[
                      { label: "المطلوب",  value: u.owedAmount, clr: "#ef4444" },
                      { label: "المسدَّد", value: u.paidAmount, clr: "#10b981" },
                      { label: "الدين",    value: u.debtAmount, clr: hasDebt ? "#f59e0b" : "#10b981" },
                    ].map(({ label, value, clr }) => (
                      <div key={label} className="text-center">
                        <p className="text-[11px] mb-1" style={{ color: "var(--muted)" }}>{label}</p>
                        <p className="text-sm font-bold" style={{ color: clr }}>{formatCurrency(value)}</p>
                      </div>
                    ))}
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
                    style={hasDebt
                      ? { background: "rgba(245,158,11,.1)", color: "#f59e0b" }
                      : { background: "rgba(16,185,129,.1)", color: "#10b981" }}>
                    {hasDebt ? "لديك دين" : "مسدَّد ✓"}
                  </span>
                  {isOpen ? <ChevronUp className="w-4 h-4 shrink-0" style={{ color: "var(--muted)" }} />
                          : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: "var(--muted)" }} />}
                </div>

                {/* Expanded — audit breakdown */}
                {isOpen && (
                  <div className="border-t px-5 pb-5 pt-3" style={{ borderColor: "var(--card-border)" }}>
                    {/* 4 cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                      {[
                        { label: "إجمالي التكلفة", value: u.totalUnitCost,  clr: "#ef4444" },
                        { label: "حصتي المطلوبة",  value: u.owedAmount,     clr: "#6366f1" },
                        { label: "دفعت",           value: u.paidAmount,     clr: "#10b981" },
                        { label: "الدين المتبقي",  value: u.debtAmount,     clr: hasDebt ? "#f59e0b" : "#10b981" },
                      ].map(({ label, value, clr }) => (
                        <div key={label} className="rounded-xl p-3 text-center" style={{ background: `${clr}10` }}>
                          <p className="text-[10px] font-medium mb-1" style={{ color: "var(--muted)" }}>{label}</p>
                          <p className="text-sm font-bold" style={{ color: clr }}>{formatCurrency(value)}</p>
                        </div>
                      ))}
                    </div>

                    {/* Audit breakdown */}
                    {closedAudits.length > 0 && (
                      <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--card-border)" }}>
                        <div className="px-3 py-2 text-[11px] font-semibold" style={{ background: "rgba(99,102,241,.06)", color: "#6366f1" }}>
                          تفصيل الجرود
                        </div>
                        <table className="w-full text-xs">
                          <thead>
                            <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                              {["الجرد", "الفترة", "حصتي", "الحالة"].map((h, i) => (
                                <th key={h} style={{ padding: "6px 10px", color: "var(--muted)", fontWeight: 600, textAlign: i === 0 ? "right" : "center", fontSize: 10 }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {closedAudits
                              .sort((a, b) => new Date(a.fromDate).getTime() - new Date(b.fromDate).getTime())
                              .map(a => {
                                const myShare = a.shareholderShares.find(s => s.shareholderId === shareholderId);
                                const owed    = myShare?.shareAmount ?? (a.totalExpenses * (u.sharePercentage / 100));
                                return (
                                  <tr key={a.id} style={{ borderBottom: "1px solid var(--card-border)" }}>
                                    <td style={{ padding: "8px 10px", color: "var(--foreground)", fontWeight: 600 }}>
                                      {a.name}
                                      {!myShare && (
                                        <span className="mr-1 text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(245,158,11,.1)", color: "#f59e0b" }}>تقديري</span>
                                      )}
                                    </td>
                                    <td style={{ padding: "8px 10px", color: "var(--muted)", textAlign: "center", whiteSpace: "nowrap" }}>
                                      {formatDate(a.fromDate)} — {formatDate(a.toDate)}
                                    </td>
                                    <td style={{ padding: "8px 10px", fontWeight: 700, color: "#ef4444", textAlign: "center" }}>
                                      {formatCurrency(owed)}
                                    </td>
                                    <td style={{ padding: "8px 10px", textAlign: "center" }}>
                                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                        style={{ background: "rgba(16,185,129,.1)", color: "#10b981" }}>مقفول ✓</span>
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {audits.length === 0 && (
                      <p className="text-xs text-center py-3" style={{ color: "var(--muted)" }}>
                        جاري تحميل الجرود...
                      </p>
                    )}
                    {audits.length > 0 && closedAudits.length === 0 && (
                      <p className="text-xs text-center py-3" style={{ color: "var(--muted)" }}>
                        لا توجد جرود مقفولة بعد
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}
