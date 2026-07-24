"use client";

import { Building2 } from "lucide-react";

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({
  message = "جاري تحميل البيانات...",
}: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "radial-gradient(ellipse at 60% 40%, #1e1b4b 0%, #0f0a2e 50%, #020617 100%)" }}
    >
      {/* ── Animated mesh blobs ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full opacity-30"
          style={{ background: "radial-gradient(circle, #6366f1 0%, transparent 70%)", animation: "blob1 8s ease-in-out infinite" }} />
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #7c3aed 0%, transparent 70%)", animation: "blob2 10s ease-in-out infinite" }} />
        <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #a78bfa 0%, transparent 70%)", animation: "blob3 7s ease-in-out infinite" }} />
      </div>

      {/* ── Grid overlay ── */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(rgba(99,102,241,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.06) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* ── Noise texture ── */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }}
      />

      {/* ── Main content ── */}
      <div className="relative z-10 flex flex-col items-center gap-10">

        {/* Logo stack */}
        <div className="relative flex items-center justify-center w-28 h-28">
          {/* Outer pulse ring */}
          <span className="absolute inset-0 rounded-3xl border border-indigo-500/20 animate-ping" style={{ animationDuration: "2s" }} />
          {/* Middle ring */}
          <span className="absolute inset-2 rounded-2xl border border-violet-500/30 animate-ping" style={{ animationDuration: "2.4s", animationDelay: "0.4s" }} />

          {/* Logo box */}
          <div className="relative w-20 h-20 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/40"
            style={{ background: "linear-gradient(135deg, #6366f1 0%, #7c3aed 50%, #4f46e5 100%)" }}
          >
            {/* Inner shine */}
            <div className="absolute inset-0 rounded-2xl"
              style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.22) 0%, transparent 60%)" }} />
            <Building2 className="w-9 h-9 text-white drop-shadow-lg relative z-10" />
          </div>
        </div>

        {/* Text */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight"
            style={{ background: "linear-gradient(135deg, #fff 30%, #a5b4fc 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
          >
            شركة المساهمين
          </h1>
          <p className="text-indigo-300/70 text-sm font-medium tracking-wide">
            نظام إدارة المشاريع العقارية
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-64 space-y-3">
          <div className="relative h-[3px] bg-white/10 rounded-full overflow-hidden">
            <div className="absolute inset-y-0 left-0 w-2/3 rounded-full animate-loading-bar"
              style={{ background: "linear-gradient(90deg, transparent, #818cf8, #a78bfa, transparent)" }} />
          </div>
          <p className="text-center text-white/40 text-xs tracking-wider">{message}</p>
        </div>

        {/* Dots */}
        <div className="flex gap-2">
          {[0, 1, 2, 3].map((i) => (
            <span key={i}
              className="rounded-full bg-indigo-400/60 animate-bounce"
              style={{ width: i === 1 || i === 2 ? 8 : 5, height: i === 1 || i === 2 ? 8 : 5, animationDelay: `${i * 0.12}s` }}
            />
          ))}
        </div>
      </div>

      {/* ── Keyframes injected via style tag ── */}
      <style>{`
        @keyframes blob1 {
          0%,100% { transform: translate(0,0) scale(1); }
          33%      { transform: translate(-40px, 60px) scale(1.1); }
          66%      { transform: translate(30px,-40px) scale(0.9); }
        }
        @keyframes blob2 {
          0%,100% { transform: translate(0,0) scale(1); }
          33%      { transform: translate(60px,-30px) scale(1.15); }
          66%      { transform: translate(-20px,50px) scale(0.95); }
        }
        @keyframes blob3 {
          0%,100% { transform: translate(0,0) scale(1); }
          50%      { transform: translate(-30px,-30px) scale(1.2); }
        }
      `}</style>
    </div>
  );
}
