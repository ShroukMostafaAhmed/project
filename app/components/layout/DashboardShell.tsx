"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function DashboardShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div
      className="flex h-full min-h-screen transition-colors duration-200"
      dir="rtl"
      style={{ background: "var(--background)" }}
    >
      <div className="hidden lg:flex lg:w-[220px] lg:shrink-0">
        <Sidebar variant="desktop" />
      </div>

      <Sidebar variant="mobile" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-col flex-1 min-w-0">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          {/* ── Print header — مخفي في الشاشة، يظهر عند الطباعة فوق المحتوى ── */}
          <div className="print-header hidden">
            <h1>Top First House</h1>
            <p>{title ?? "تقرير"} — {new Date().toLocaleDateString("ar-EG", { year:"numeric", month:"long", day:"numeric" })}</p>
          </div>

          {children}

          {/* ── Print footer — يظهر بعد المحتوى مباشرة في آخر صفحة ── */}
          <div className="print-footer hidden">
            Top First House — نظام إدارة المشاريع العقارية
          </div>
        </main>
      </div>

      {/* ── زرار طباعة عائم — يظهر في كل الصفحات ── */}
      <button
        onClick={() => window.print()}
        className="no-print fixed bottom-6 left-6 z-50 w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110"
        style={{ background: "linear-gradient(135deg,#6366f1,#7c3aed)", color: "#fff", boxShadow: "0 4px 20px rgba(99,102,241,.4)" }}
        title="طباعة الصفحة"
      >
        <Printer className="w-5 h-5" />
      </button>
    </div>
  );
}
