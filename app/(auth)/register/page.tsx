"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, UserPlus, CheckCircle, Eye, EyeOff } from "lucide-react";
import { setAuthUser } from "@/app/lib/auth";
import { api } from "@/app/lib/api";

type Step = "form" | "success";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");

  const [form, setForm] = useState({
    fullName: "",
    nationalId: "",
    phone: "",
    email: "",
    address: "",
  });

  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdName, setCreatedName] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    // Clear field error on change
    if (errors[name as keyof typeof errors]) {
      setErrors((p) => ({ ...p, [name]: "" }));
    }
  }

  function validate(): boolean {
    const newErrors: Partial<typeof form> = {};

    if (!form.fullName.trim()) {
      newErrors.fullName = "الاسم الكامل مطلوب";
    }
    if (!form.nationalId.trim()) {
      newErrors.nationalId = "الرقم القومي مطلوب";
    } else if (form.nationalId.trim().length !== 14) {
      newErrors.nationalId = "الرقم القومي يجب أن يكون 14 رقم";
    }
    if (form.phone && !/^01[0-9]{9}$/.test(form.phone.trim())) {
      newErrors.phone = "رقم هاتف غير صحيح (مثال: 01xxxxxxxxx)";
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "بريد إلكتروني غير صحيح";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");
    if (!validate()) return;

    setLoading(true);
    try {
      // Check duplicate nationalId first
      const existing = await api.shareholders.list();
      const duplicate = existing.find(
        (s) => s.nationalId?.trim() === form.nationalId.trim()
      );
      if (duplicate) {
        setErrors((p) => ({ ...p, nationalId: "هذا الرقم القومي مسجل بالفعل" }));
        return;
      }

      const shareholder = await api.shareholders.create({
        fullName: form.fullName.trim(),
        nationalId: form.nationalId.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
      });

      setCreatedName(shareholder.fullName ?? form.fullName);

      // Auto login after register
      setAuthUser({
        id: shareholder.id,
        name: shareholder.fullName ?? form.fullName,
        role: "shareholder",
        shareholderId: shareholder.id,
      });

      setStep("success");
    } catch (err) {
      setServerError(
        (err as Error).message?.includes("fetch")
          ? "تعذر الاتصال بالخادم، تحقق من اتصالك"
          : ((err as Error).message ?? "حدث خطأ أثناء التسجيل")
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-indigo-900 via-violet-900 to-slate-900 flex items-center justify-center p-4"
      dir="rtl"
    >
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-2xl shadow-indigo-500/40 mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">شركة المساهمين</h1>
          <p className="text-indigo-300 text-sm mt-1">نظام إدارة المشاريع العقارية</p>
        </div>

        {step === "success" ? (
          /* ── Success Screen ── */
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">تم التسجيل بنجاح!</h2>
            <p className="text-white/60 text-sm mb-6">
              أهلاً بك <span className="text-white font-medium">{createdName}</span>،
              تم إنشاء حسابك وتسجيل دخولك تلقائياً.
            </p>
            <button
              onClick={() => router.push("/shareholder/home")}
              className="w-full bg-gradient-to-l from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/30"
            >
              الذهاب للوحة التحكم
            </button>
          </div>
        ) : (
          /* ── Register Form ── */
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">
            <h2 className="text-lg font-semibold text-white mb-6 text-center">
              تسجيل مساهم جديد
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>

              {/* Full Name */}
              <Field
                label="الاسم الكامل"
                required
                error={errors.fullName}
              >
                <input
                  type="text"
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  placeholder="محمد أحمد علي"
                  autoFocus
                  className={inputClass(!!errors.fullName)}
                />
              </Field>

              {/* National ID */}
              <Field
                label="الرقم القومي"
                required
                error={errors.nationalId}
                hint="14 رقم"
              >
                <input
                  type="text"
                  name="nationalId"
                  value={form.nationalId}
                  onChange={handleChange}
                  placeholder="29xxxxxxxxxxxxxxx"
                  maxLength={14}
                  inputMode="numeric"
                  className={inputClass(!!errors.nationalId) + " tracking-widest"}
                />
              </Field>

              {/* Phone */}
              <Field label="رقم الهاتف" error={errors.phone}>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="01xxxxxxxxx"
                  className={inputClass(!!errors.phone)}
                />
              </Field>

              {/* Email */}
              <Field label="البريد الإلكتروني" error={errors.email}>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="example@email.com"
                  className={inputClass(!!errors.email)}
                />
              </Field>

              {/* Address */}
              <Field label="العنوان">
                <input
                  type="text"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="المحافظة، الحي، الشارع"
                  className={inputClass(false)}
                />
              </Field>

              {/* Server error */}
              {serverError && (
                <div className="flex items-start gap-2 bg-red-500/15 border border-red-500/30 rounded-xl px-3 py-2.5">
                  <span className="text-red-400 text-xs mt-0.5">⚠</span>
                  <p className="text-red-300 text-xs leading-5">{serverError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-l from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/30 disabled:opacity-60 mt-2"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                {loading ? "جاري التسجيل..." : "تسجيل"}
              </button>
            </form>

            <p className="text-center text-white/50 text-xs mt-5">
              لديك حساب بالفعل؟{" "}
              <Link
                href="/login"
                className="text-indigo-300 hover:text-indigo-200 font-medium hover:underline underline-offset-2"
              >
                تسجيل الدخول
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function inputClass(hasError: boolean) {
  return [
    "w-full px-4 py-3 rounded-xl bg-white/10 border text-white placeholder-white/30",
    "focus:outline-none focus:bg-white/15 transition-all text-sm",
    hasError
      ? "border-red-400/60 focus:border-red-400"
      : "border-white/20 focus:border-indigo-400",
  ].join(" ");
}

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm text-white/80">
          {label}
          {required && <span className="text-red-400 mr-1">*</span>}
        </label>
        {hint && <span className="text-xs text-white/30">{hint}</span>}
      </div>
      {children}
      {error && (
        <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  );
}
