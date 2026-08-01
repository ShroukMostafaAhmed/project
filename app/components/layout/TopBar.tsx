"use client";

import { useState } from "react";
import { Menu, Bell, ChevronRight, RefreshCw, LogOut, Sun, Moon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { getAuthUser, clearAuthUser } from "@/app/lib/auth";
import { useTheme } from "@/app/components/providers/ThemeProvider";

const LABELS: Record<string, string> = {
  dashboard:          "لوحة التحكم",
  home:               "الرئيسية",
  users:              "المساهمين",
  projects:           "المشاريع",
  "shareholder-units":"مساهمو الوحدات",
  contracts:          "العقود",
  finance:            "الماليه",
  expenses:           "المصاريف",
  analysis:           "التحليلات",
  reports:            "التقارير",
  edit:               "تعديل",
};

export default function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const user      = getAuthUser();
  const pathname  = usePathname();
  const router    = useRouter();
  const { isDark, toggle } = useTheme();

  const [menuOpen, setMenuOpen] = useState(false);

  /* breadcrumb */
  const segments = pathname.split("/").filter(Boolean);
  const crumbs   = segments
    .map((s) => LABELS[s] ?? (s.match(/^\d+$/) ? `#${s}` : null))
    .filter(Boolean) as string[];

  function logout() { clearAuthUser(); router.push("/login"); }

  /* ── shared icon button style ── */
  const iconBtn = {
    background: "transparent",
    color: "var(--muted)",
  } as React.CSSProperties;

  return (
    <header
      className="h-14 shrink-0 sticky top-0 z-20 flex items-center px-4 gap-3 no-print transition-colors duration-200"
      style={{
        background:          "var(--topbar-bg)",
        backdropFilter:      "blur(16px)",
        WebkitBackdropFilter:"blur(16px)",
        borderBottom:        "1px solid var(--card-border)",
        boxShadow:           "0 1px 3px rgba(0,0,0,.04)",
      }}
    >
      {/* Mobile burger */}
      <button
        onClick={onMenuClick}
        className="lg:hidden w-8 h-8 rounded-xl flex items-center justify-center hover:opacity-80 transition-opacity"
        style={iconBtn}
      >
        <Menu className="w-[18px] h-[18px]" />
      </button>

      {/* Breadcrumb */}
      <nav className="hidden sm:flex items-center gap-1.5 flex-1 min-w-0">
        {crumbs.length === 0 ? (
          <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            لوحة التحكم
          </span>
        ) : crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="w-3 h-3 rotate-180 shrink-0" style={{ color: "var(--muted)" }} />}
            <span
              className="text-sm"
              style={{
                color:      i === crumbs.length - 1 ? "var(--foreground)" : "var(--muted)",
                fontWeight: i === crumbs.length - 1 ? 600 : 400,
              }}
            >
              {c}
            </span>
          </span>
        ))}
      </nav>

      {/* Mobile: current page */}
      <span className="sm:hidden flex-1 text-sm font-semibold truncate" style={{ color: "var(--foreground)" }}>
        {crumbs[crumbs.length - 1] ?? "الرئيسية"}
      </span>

      {/* Right actions */}
      <div className="flex items-center gap-1 shrink-0">

        {/* Dark / Light toggle */}
        <button
          onClick={toggle}
          title={isDark ? "الوضع الفاتح" : "الوضع الداكن"}
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
          style={iconBtn}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(99,102,241,0.1)"; e.currentTarget.style.color = "#6366f1"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--muted)"; }}
        >
          {isDark
            ? <Sun  className="w-[15px] h-[15px]" />
            : <Moon className="w-[15px] h-[15px]" />
          }
        </button>

        {/* Bell */}
        <button
          className="relative w-8 h-8 rounded-xl flex items-center justify-center transition-all"
          style={iconBtn}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(128,128,128,0.1)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          <Bell className="w-[15px] h-[15px]" />
          <span className="absolute top-1.5 right-1.5 w-[7px] h-[7px] rounded-full bg-red-500"
            style={{ border: "2px solid var(--topbar-bg)" }} />
        </button>

        {/* Divider */}
        <div className="w-px h-5 mx-1" style={{ background: "var(--card-border)" }} />

        {/* Avatar + dropdown */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-xl transition-all"
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(128,128,128,0.1)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <span className="hidden sm:block text-sm font-medium max-w-[120px] truncate"
              style={{ color: "var(--foreground)" }}>
              {user?.name}
            </span>
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center text-white text-[11px] font-bold shrink-0"
              style={{ background: "linear-gradient(135deg,#6366f1,#7c3aed)", boxShadow: "0 2px 8px rgba(99,102,241,.35)" }}
            >
              {user?.name?.[0] ?? "U"}
            </div>
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div
                className="absolute left-0 top-full mt-2 w-52 z-50 rounded-xl overflow-hidden transition-all"
                style={{
                  background:  "var(--card)",
                  border:      "1px solid var(--card-border)",
                  boxShadow:   isDark
                    ? "0 8px 40px rgba(0,0,0,.4)"
                    : "0 8px 40px rgba(0,0,0,.12)",
                  animation:   "ddIn .15s ease",
                }}
              >
                {/* User info */}
                <div className="px-4 py-3 flex items-center gap-3"
                  style={{ borderBottom: "1px solid var(--card-border)", background: "rgba(99,102,241,0.06)" }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ background: "linear-gradient(135deg,#6366f1,#7c3aed)" }}>
                    {user?.name?.[0] ?? "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold truncate" style={{ color: "var(--foreground)" }}>
                      {user?.name}
                    </p>
                    <p className="text-[11px]" style={{ color: "var(--muted)" }}>
                      {user?.role === "admin" ? "مدير النظام" : "مساهم"}
                    </p>
                  </div>
                </div>

               
                {/* Logout */}
                <button
                  onClick={() => { setMenuOpen(false); logout(); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium transition-colors text-red-500"
                  style={{ borderTop: "1px solid var(--card-border)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <LogOut className="w-4 h-4" />
                  تسجيل الخروج
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes ddIn {
          from { opacity:0; transform:translateY(-4px) }
          to   { opacity:1; transform:translateY(0) }
        }
      `}</style>
    </header>
  );
}
