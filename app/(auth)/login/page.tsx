"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Eye, EyeOff, LogIn } from "lucide-react";
import { setAuthUser, getRedirectPath } from "@/app/lib/auth";
import { api } from "@/app/lib/api";

export default function LoginPage() {
  const router = useRouter();

  const [userName,     setUserName]     = useState("");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error,        setError]        = useState("");
  const [loading,      setLoading]      = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.auth.login({ userName, password });

      if (!res.token) {
        setError("بيانات غير صحيحة أو الحساب غير مفعل");
        return;
      }

      // Role determined by API: shareholderId present → shareholder, else → admin
      const role = res.shareholderId != null ? "shareholder" : "admin";

      setAuthUser({
        id:            res.shareholderId ?? 0,
        name:          res.shareholderName ?? res.userName ?? "مستخدم",
        role,
        shareholderId: res.shareholderId ?? undefined,
        token:         res.token,
        email:         res.email ?? undefined,
      });

      router.push(getRedirectPath(role));

    } catch (err) {
      const msg = (err as Error).message ?? "";
      if (msg.includes("401") || msg.includes("400")) {
        setError("اسم المستخدم أو كلمة المرور غير صحيحة");
      } else {
        setError("تعذر الاتصال بالخادم، تحقق من اتصالك");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      dir="rtl"
      style={{
        background:
          "radial-gradient(ellipse at 60% 40%, #1e1b4b 0%, #0f0a2e 50%, #020617 100%)",
      }}
    >
      {/* Ambient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-25"
          style={{ background: "radial-gradient(circle,#6366f1,transparent 70%)" }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle,#7c3aed,transparent 70%)" }}
        />
        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.1) 1px,transparent 1px)," +
              "linear-gradient(90deg,rgba(255,255,255,.1) 1px,transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{
              background:  "linear-gradient(135deg,#6366f1,#7c3aed)",
              boxShadow:   "0 0 48px rgba(99,102,241,.45)",
            }}
          >
            <Building2 className="w-8 h-8 text-white" strokeWidth={1.8} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            شركة المساهمين
          </h1>
          <p className="text-indigo-300/60 text-sm mt-1">
            نظام إدارة المشاريع العقارية
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-3xl p-8 shadow-2xl"
          style={{
            background:     "rgba(255,255,255,0.06)",
            backdropFilter: "blur(24px)",
            border:         "1px solid rgba(255,255,255,0.10)",
          }}
        >
          <h2 className="text-base font-semibold text-white/90 mb-6 text-center tracking-wide">
            تسجيل الدخول
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: "rgba(255,255,255,0.65)" }}
              >
                اسم المستخدم
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="أدخل اسم المستخدم"
                required
                autoFocus
                autoComplete="username"
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/25 focus:outline-none transition-all"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border:     "1px solid rgba(255,255,255,0.12)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "rgba(99,102,241,.7)";
                  e.currentTarget.style.background  = "rgba(255,255,255,.11)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,.12)";
                  e.currentTarget.style.background  = "rgba(255,255,255,.08)";
                }}
              />
            </div>

            {/* Password */}
            <div>
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: "rgba(255,255,255,0.65)" }}
              >
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/25 focus:outline-none transition-all"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border:     "1px solid rgba(255,255,255,0.12)",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "rgba(99,102,241,.7)";
                    e.currentTarget.style.background  = "rgba(255,255,255,.11)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,.12)";
                    e.currentTarget.style.background  = "rgba(255,255,255,.08)";
                  }}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "rgba(255,255,255,0.35)" }}
                  aria-label={showPassword ? "إخفاء" : "إظهار"}
                >
                  {showPassword
                    ? <EyeOff className="w-4 h-4" />
                    : <Eye    className="w-4 h-4" />
                  }
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs"
                style={{
                  background: "rgba(239,68,68,.12)",
                  border:     "1px solid rgba(239,68,68,.25)",
                  color:      "#fca5a5",
                }}
              >
                <span className="text-sm">⚠</span>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-60 mt-1"
              style={{
                background:  "linear-gradient(135deg,#6366f1,#7c3aed)",
                boxShadow:   "0 4px 24px rgba(99,102,241,.4)",
              }}
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              {loading ? "جاري التحقق..." : "دخول"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
