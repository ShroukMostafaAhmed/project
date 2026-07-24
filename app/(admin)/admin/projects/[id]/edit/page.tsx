"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Save } from "lucide-react";
import DashboardShell from "@/app/components/layout/DashboardShell";
import { api } from "@/app/lib/api";
import { UpdateUnitDto } from "@/app/lib/types";

export default function ProjectEditPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [id, setId] = useState<number | null>(null);
  const [form, setForm] = useState<UpdateUnitDto>({
    name: "", description: "", totalApartments: null, numFloors: null, numApartmentsFloor: null, address: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    params.then(({ id: rawId }: { id: string }) => {
      const numId = parseInt(rawId);
      setId(numId);
      api.units.get(numId).then((u) => {
        setForm({ name: u.name, description: u.description, totalApartments: u.totalApartments, numFloors: u.numFloors, numApartmentsFloor: u.numApartmentsFloor, address: u.address });
      }).finally(() => setLoading(false));
    });
  }, [params]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    setError("");
    try {
      await api.units.update(id, form);
      router.push(`/admin/projects/${id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <DashboardShell title="تعديل المشروع">
        <div className="flex justify-center py-20">
          <span className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="تعديل المشروع">
      <div className="mb-4">
        <Link
          href={`/admin/projects/${id}`}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600 w-fit"
        >
          <ArrowRight className="w-4 h-4" />
          العودة للمشروع
        </Link>
      </div>

      <div className="max-w-lg bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-5">تعديل بيانات الوحدة</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { name: "name", label: "الاسم", type: "text" },
            { name: "address", label: "العنوان", type: "text" },
            { name: "description", label: "الوصف", type: "text" },
          ].map((f) => (
            <div key={f.name}>
              <label className="block text-sm font-medium text-slate-700 mb-1">{f.label}</label>
              <input
                type={f.type}
                value={(form as Record<string, unknown>)[f.name] as string ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, [f.name]: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400"
              />
            </div>
          ))}
          {[
            { name: "totalApartments", label: "إجمالي الشقق" },
            { name: "numFloors", label: "عدد الطوابق" },
            { name: "numApartmentsFloor", label: "شقق لكل طابق" },
          ].map((f) => (
            <div key={f.name}>
              <label className="block text-sm font-medium text-slate-700 mb-1">{f.label}</label>
              <input
                type="number"
                value={(form as Record<string, unknown>)[f.name] as number ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, [f.name]: e.target.value ? parseInt(e.target.value) : null }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400"
              />
            </div>
          ))}

          {error && <p className="text-red-500 text-xs">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              {saving ? "جاري الحفظ..." : "حفظ"}
            </button>
            <Link
              href={`/admin/projects/${id}`}
              className="border border-slate-200 text-slate-600 text-sm px-5 py-2.5 rounded-xl hover:bg-slate-50"
            >
              إلغاء
            </Link>
          </div>
        </form>
      </div>
    </DashboardShell>
  );
}
