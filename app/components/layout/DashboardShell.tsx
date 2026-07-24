"use client";

import { useState } from "react";
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
      {/* Sidebar — في RTL هيظهر على اليمين تلقائياً */}
      <div className="hidden lg:flex lg:w-[220px] lg:shrink-0">
        <Sidebar variant="desktop" />
      </div>

      {/* Mobile sidebar overlay */}
      <Sidebar variant="mobile" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
