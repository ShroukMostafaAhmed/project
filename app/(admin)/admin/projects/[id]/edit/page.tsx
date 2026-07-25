"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Save, Building2, DollarSign } from "lucide-react";
import DashboardShell from "@/app/components/layout/DashboardShell";
import { Skeleton } from "@/app/components/ui/Skeleton";
import { api } from "@/app/lib/api";
import { UpdateUnitDto } from "@/app/lib/types";

function iStyle(): React.CSSProperties {
  return { background:"var(--input-bg)", borderColor:"var(--input-border)", color:"var(--foreground)" };
}

function Section({ title, icon: Icon, children }: {
  title: string; icon: React.ElementType; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl p-5 border" style={{ background:"var(--card)", borderColor:"var(--card-border)" }}>
      <div className="flex items-center gap-2 mb-4 pb-3 border-b" style={{ borderColor:"var(--card-border)" }}>
        <div className="p-1.5 rounded-lg" style={{ background:"rgba(99,102,241,.1)" }}>
          <Icon className="w-4 h-4" style={{ color:"#6366f1" }} />
        </div>
        <h3 className="text-sm font-semibold" style={{ color:"var(--foreground)" }}>{title}</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {children}
      </div>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="block text-xs font-semibold mb-1.5" style={{ color:"var(--muted)" }}>{label}</label>
      {children}
    </div>
  );
}

export default function ProjectEditPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [unitId, setUnitId] = useState<number | null>(null);
  const [form, setForm] = useState<UpdateUnitDto>({});
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  useEffect(() => {
    params.then(({ id }: { id: string }) => {
      const n = parseInt(id);
      setUnitId(n);
      api.units.get(n).then((u) => {
        setForm({
          name:               u.name,
          description:        u.description,
          totalApartments:    u.totalApartments,
          numFloors:          u.numFloors,
          numApartmentsFloor: u.numApartmentsFloor,
          address:            u.address,
        });
      }).finally(() => setLoading(false));
    });
  }, [params]);

  function setStr(field: keyof UpdateUnitDto, val: string) {
    setForm(p => ({ ...p, [field]: val || null }));
  }
  function setNum(field: keyof UpdateUnitDto, val: string) {
    setForm(p => ({ ...p, [field]: val ? parseFloat(val) : null }));
  }
  function setInt(field: keyof UpdateUnitDto, val: string) {
    setForm(p => ({ ...p, [field]: val ? parseInt(val) : null }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!unitId) return;
    setSaving(true); setError("");
    try {
      await api.units.update(unitId, form);
      router.push(`/admin/projects/${unitId}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <DashboardShell title="تعديل المشروع">
        <div className="space-y-4">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </DashboardShell>
    );
  }

  const inputCls = "w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none transition-all";

  return (
    <DashboardShell title="تعديل المشروع">
      <div className="mb-5">
        <Link href={`/admin/projects/${unitId}`}
          className="flex items-center gap-1.5 text-sm w-fit transition-colors"
          style={{ color:"var(--muted)" }}>
          <ArrowRight className="w-4 h-4" />
          العودة للمشروع
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">

        {/* ── Basic info ── */}
        <Section title="المعلومات الأساسية" icon={Building2}>
          <Field label="الاسم" full>
            <input type="text" value={form.name ?? ""} onChange={e => setStr("name", e.target.value)}
              className={inputCls} style={iStyle()} />
          </Field>
          <Field label="الكود / الرمز">
            {/* code not in UpdateUnitDto but shown read-only if needed */}
            <input type="text" placeholder="— غير قابل للتعديل —" disabled
              className={inputCls + " opacity-40 cursor-not-allowed"} style={iStyle()} />
          </Field>
          <Field label="العنوان">
            <input type="text" value={form.address ?? ""} onChange={e => setStr("address", e.target.value)}
              className={inputCls} style={iStyle()} />
          </Field>
          <Field label="الوصف">
            <input type="text" value={form.description ?? ""} onChange={e => setStr("description", e.target.value)}
              className={inputCls} style={iStyle()} />
          </Field>
          <Field label="إجمالي الشقق">
            <input type="number" min={0} value={form.totalApartments ?? ""}
              onChange={e => setInt("totalApartments", e.target.value)}
              className={inputCls} style={iStyle()} />
          </Field>
          <Field label="عدد الطوابق">
            <input type="number" min={0} value={form.numFloors ?? ""}
              onChange={e => setInt("numFloors", e.target.value)}
              className={inputCls} style={iStyle()} />
          </Field>
          <Field label="شقق لكل طابق">
            <input type="number" min={0} value={form.numApartmentsFloor ?? ""}
              onChange={e => setInt("numApartmentsFloor", e.target.value)}
              className={inputCls} style={iStyle()} />
          </Field>
          <Field label="عدد المساهمين">
            <input type="number" min={0} value={form.numOfShareholders ?? ""}
              onChange={e => setInt("numOfShareholders", e.target.value)}
              className={inputCls} style={iStyle()} />
          </Field>
          <Field label="عدد الأسهم الإجمالي">
            <input type="number" min={0} value={form.numOfShares ?? ""}
              onChange={e => setInt("numOfShares", e.target.value)}
              className={inputCls} style={iStyle()} />
          </Field>
          <Field label="نسبة السهم (%)">
            <input type="number" min={0} step="0.01" value={form.stockRatio ?? ""}
              onChange={e => setNum("stockRatio", e.target.value)}
              className={inputCls} style={iStyle()} />
          </Field>
        </Section>

        {/* ── Financial info ── */}
        <Section title="البيانات المالية" icon={DollarSign}>
          {[
            { key:"purchasePrice",         label:"سعر الشراء" },
            { key:"commission",            label:"العمولة" },
            { key:"legalContractCosts",    label:"تكاليف التعاقد القانوني" },
            { key:"realEstateRegExpenses", label:"مصاريف التسجيل العقاري" },
            { key:"demolitionPermit",      label:"تصريح الهدم" },
            { key:"buildingPermit",        label:"تصريح البناء" },
            { key:"landSharePrice",        label:"سعر سهم الأرض" },
          ].map(({ key, label }) => (
            <Field key={key} label={label}>
              <input type="number" min={0} step="0.01"
                value={(form as Record<string, unknown>)[key] as number ?? ""}
                onChange={e => setNum(key as keyof UpdateUnitDto, e.target.value)}
                className={inputCls} style={iStyle()}
                placeholder="0.00"
              />
            </Field>
          ))}
        </Section>

        {/* Error */}
        {error && (
          <p className="text-xs px-4 py-3 rounded-xl"
            style={{ background:"rgba(239,68,68,.1)", color:"#ef4444", border:"1px solid rgba(239,68,68,.25)" }}>
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 text-white text-sm font-semibold px-5 py-2.5 rounded-xl disabled:opacity-60"
            style={{ background:"linear-gradient(135deg,#6366f1,#7c3aed)" }}>
            <Save className="w-4 h-4" />
            {saving ? "جاري الحفظ..." : "حفظ التعديلات"}
          </button>
          <Link href={`/admin/projects/${unitId}`}
            className="px-5 py-2.5 rounded-xl text-sm font-medium border transition-colors"
            style={{ background:"var(--card)", borderColor:"var(--card-border)", color:"var(--foreground)" }}>
            إلغاء
          </Link>
        </div>
      </form>
    </DashboardShell>
  );
}
