"use client";

import { useState } from "react";
import { Plus, Search, Edit2, Trash2, Eye, RefreshCw, AlertCircle, Key, EyeOff } from "lucide-react";
import Link from "next/link";
import DashboardShell from "@/app/components/layout/DashboardShell";
import PageHeader from "@/app/components/ui/PageHeader";
import Badge from "@/app/components/ui/Badge";
import Modal from "@/app/components/ui/Modal";
import { TableRowSkeleton } from "@/app/components/ui/Skeleton";
import { useShareholders } from "@/app/lib/hooks";
import { CreateShareholderDto } from "@/app/lib/types";
import { formatDate } from "@/app/lib/utils";

export default function AdminUsersPage() {
  const { shareholders, loading, error, reload, create, remove } = useShareholders();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState<CreateShareholderDto>({
    fullName: "", nationalId: "", phone: "", email: "", address: "", password: "",
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const filtered = shareholders.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch =
      (s.fullName ?? "").toLowerCase().includes(q) ||
      (s.phone ?? "").includes(q) ||
      (s.email ?? "").toLowerCase().includes(q) ||
      (s.nationalId ?? "").includes(q);
    const matchStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && s.isActive) ||
      (filterStatus === "inactive" && !s.isActive);
    return matchSearch && matchStatus;
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      await create(form);
      setShowCreate(false);
      setForm({ fullName: "", nationalId: "", phone: "", email: "", address: "", password: "" });
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await remove(deleteId);
      setDeleteId(null);
    } catch (err) {
      setDeleteId(null);
      const msg = (err as Error).message;
      setFormError(msg.includes("404") ? "المساهم غير موجود في قاعدة البيانات" : msg);
    }
  }

  return (
    <DashboardShell title="المساهمين">
      <PageHeader
        title="إدارة المساهمين"
        subtitle={`${shareholders.length} مساهم — ${shareholders.filter(s=>s.isActive).length} نشط`}
        actions={
          <div className="flex gap-2">
            <button onClick={reload} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors" title="تحديث">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors shadow-sm shadow-indigo-200"
            >
              <Plus className="w-4 h-4" />
              إضافة مساهم
            </button>
          </div>
        }
      />

      {/* Filters row */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم، هاتف، رقم قومي..."
            className="pr-9 pl-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 w-64"
          />
        </div>
        {(["all","active","inactive"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setFilterStatus(v)}
            className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
              filterStatus === v
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
            }`}
          >
            {v === "all" ? "الكل" : v === "active" ? "نشط" : "غير نشط"}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-slate-50">
              <tr>{["الاسم","الرقم القومي","الهاتف","البريد","الحالة","كلمة المرور","التسجيل",""].map(h=>(
                <th key={h} className="px-4 py-3 text-right text-xs font-semibold text-slate-500">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {[...Array(6)].map((_, i) => <TableRowSkeleton key={i} cols={8} />)}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {["الاسم", "الرقم القومي", "الهاتف", "البريد", "الحالة", "كلمة المرور", "تاريخ التسجيل", "إجراءات"].map((h) => (
                  <th key={h} className="px-4 py-3 text-right font-semibold text-slate-600 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    لا توجد بيانات
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {s.fullName ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.nationalId ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{s.phone ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{s.email ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={s.isActive ? "success" : "danger"}>
                        {s.isActive ? "نشط" : "غير نشط"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {s.generatedPassword ? (
                        <div className="flex items-center gap-1.5">
                          <Key className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <code className="text-xs font-mono bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-lg">
                            {s.generatedPassword}
                          </code>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(s.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/admin/users/${s.id}`}
                          className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-600 transition-colors"
                          title="عرض"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/admin/users/${s.id}/edit`}
                          className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors"
                          title="تعديل"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => setDeleteId(s.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="إضافة مساهم جديد">
        <form onSubmit={handleCreate} className="space-y-3">
          {[
            { name: "fullName", label: "الاسم الكامل", required: true },
            { name: "nationalId", label: "الرقم القومي", required: true },
            { name: "phone", label: "الهاتف", required: false },
            { name: "email", label: "البريد الإلكتروني", required: false },
            { name: "address", label: "العنوان", required: false },
          ].map((field) => (
            <div key={field.name}>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {field.label}
                {field.required && <span className="text-red-500 mr-1">*</span>}
              </label>
              <input
                type="text"
                required={field.required}
                value={(form as Record<string, string>)[field.name] ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, [field.name]: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400"
              />
            </div>
          ))}

          {/* Password field */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              كلمة المرور
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={form.password ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                className="w-full px-3 py-2 pl-10 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {formError && <p className="text-red-500 text-xs">{formError}</p>}
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2.5 rounded-xl transition-colors disabled:opacity-60"
            >
              {saving ? "جاري الحفظ..." : "حفظ"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="flex-1 border border-slate-200 text-slate-600 text-sm font-medium py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
            >
              إلغاء
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="تأكيد الحذف" size="sm">
        <p className="text-sm text-slate-600 mb-4">
          هل أنت متأكد من حذف هذا المساهم؟ لا يمكن التراجع عن هذه العملية.
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
          >
            حذف
          </button>
          <button
            onClick={() => setDeleteId(null)}
            className="flex-1 border border-slate-200 text-slate-600 text-sm font-medium py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
          >
            إلغاء
          </button>
        </div>
      </Modal>
    </DashboardShell>
  );
}