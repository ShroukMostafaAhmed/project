"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Save } from "lucide-react";
import DashboardShell from "@/app/components/layout/DashboardShell";
import { api } from "@/app/lib/api";
import { UpdateShareholderDto } from "@/app/lib/types";

export default function UserEditPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [id, setId] = useState<number | null>(null);
  const [form, setForm] = useState<UpdateShareholderDto & { fullName?: string | null }>({
    fullName: "",
    phone: "",
    email: "",
    address: "",
    isActive: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    params.then(({ id: rawId }: { id: string }) => {
      const numId = parseInt(rawId);
      setId(numId);
      api.shareholders.get(numId).then((s) => {
        setForm({
          fullName: s.fullName,
          phone: s.phone,
          email: s.email,
          address: s.address,
          isActive: s.isActive,
        });
      }).finally(() => setLoading(false));
    });
  }, [params]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    setError("");
    try {
      await api.shareholders.update(id, {
        fullName: form.fullName,
        phone: form.phone,
        email: form.email,
        address: form.address,
        isActive: form.isActive,
      });
      router.push(`/admin/users/${id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <DashboardShell title="تعديل المساهم">
        <div className="flex justify-center py-20">
          <span className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="تعديل المساهم">
      <div className="mb-4 flex items-center gap-2">
        <Link
          href={`/admin/users/${id}`}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          العودة لتفاصيل المساهم
        </Link>
      </div>

      <div className="max-w-lg bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-5">تعديل بيانات المساهم</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { name: "fullName", label: "الاسم الكامل", type: "text" },
            { name: "phone", label: "الهاتف", type: "tel" },
            { name: "email", label: "البريد الإلكتروني", type: "email" },
            { name: "address", label: "العنوان", type: "text" },
          ].map((field) => (
            <div key={field.name}>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {field.label}
              </label>
              <input
                type={field.type}
                value={(form as Record<string, unknown>)[field.name] as string ?? ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, [field.name]: e.target.value }))
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400"
              />
            </div>
          ))}

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700">الحالة</label>
            <button
              type="button"
              onClick={() => setForm((p) => ({ ...p, isActive: !p.isActive }))}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                form.isActive ? "bg-indigo-600" : "bg-slate-200"
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
                  form.isActive ? "right-1" : "left-1"
                }`}
              />
            </button>
            <span className="text-sm text-slate-500">
              {form.isActive ? "نشط" : "غير نشط"}
            </span>
          </div>

          {error && <p className="text-red-500 text-xs">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
            </button>
            <Link
              href={`/admin/users/${id}`}
              className="border border-slate-200 text-slate-600 text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
            >
              إلغاء
            </Link>
          </div>
        </form>
      </div>
    </DashboardShell>
  );
}
