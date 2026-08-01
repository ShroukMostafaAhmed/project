"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, Building2, Wallet,
  Receipt, BarChart3, FileText, LogOut, Home, X, Key, KeyRound,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { clearAuthUser, getAuthUser } from "@/app/lib/auth";

interface NavItem { href: string; label: string; icon: React.ElementType; }

const adminNav: NavItem[] = [
  { href: "/admin/dashboard",        label: "الرئيسية",       icon: LayoutDashboard },
  { href: "/admin/users",            label: "المساهمين",      icon: Users           },
  { href: "/admin/projects",         label: "المشاريع",       icon: Building2       },
  { href: "/admin/shareholder-units",label: "مساهمو الوحدات", icon: Key             },
  { href: "/admin/ownerships",       label: "الملكيات",       icon: KeyRound        },
  { href: "/admin/finance",          label: "الماليه",        icon: Wallet          },
  { href: "/admin/expenses",         label: "المصاريف",       icon: Receipt         },
  { href: "/admin/analysis",         label: "التحليلات",      icon: BarChart3       },
  { href: "/admin/reports",          label: "التقارير",       icon: FileText        },
  { href: "/admin/contracts",        label: "العقود",         icon: FileText        },

];

const shareholderNav: NavItem[] = [
  { href: "/shareholder/home",     label: "الرئيسية",  icon: Home      },
  { href: "/shareholder/projects", label: "مشاريعي",   icon: Building2 },
  { href: "/shareholder/finance",  label: "الماليه",   icon: Wallet    },
  { href: "/shareholder/analysis", label: "التحليلات", icon: BarChart3 },
  { href: "/shareholder/reports",  label: "التقارير",  icon: FileText  },
];

interface SidebarProps {
  variant: "desktop" | "mobile";
  open?:    boolean;
  onClose?: () => void;
}

export default function Sidebar({ variant, open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router   = useRouter();
  const user     = getAuthUser();
  const isAdmin  = user?.role === "admin";
  const nav      = isAdmin ? adminNav : shareholderNav;

  function handleLogout() { clearAuthUser(); router.push("/login"); }

  const inner = (
    <Inner
      nav={nav} pathname={pathname} user={user}
      isAdmin={isAdmin} onLogout={handleLogout}
      showClose={variant === "mobile"} onClose={onClose}
    />
  );

  if (variant === "desktop") {
    return (
      <aside
        className="w-[220px] sticky top-0 h-screen flex flex-col transition-colors duration-200"
        style={{
          background:   "var(--sidebar-bg)",
          borderRight:  "1px solid var(--sidebar-border)",
        }}
      >
        {inner}
      </aside>
    );
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}
      <aside
        className={cn(
          "fixed top-0 right-0 z-40 h-full w-[220px] flex flex-col",
          "shadow-2xl transition-all duration-300 ease-out lg:hidden",
          open ? "translate-x-0" : "translate-x-full"
        )}
        style={{
          background:  "var(--sidebar-bg)",
          borderRight: "1px solid var(--sidebar-border)",
        }}
      >
        {inner}
      </aside>
    </>
  );
}

/* ── Inner ──────────────────────────────────────────── */
interface InnerProps {
  nav:       NavItem[];
  pathname:  string;
  user:      ReturnType<typeof getAuthUser>;
  isAdmin:   boolean;
  onLogout:  () => void;
  showClose: boolean;
  onClose?:  () => void;
}

function Inner({ nav, pathname, user, isAdmin, onLogout, showClose, onClose }: InnerProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Brand */}
      <div className="px-4 pt-5 pb-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#6366f1,#7c3aed)", boxShadow: "0 3px 10px rgba(99,102,241,.35)" }}>
            <Building2 className="w-[17px] h-[17px] text-white" strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-[13px] font-bold leading-tight" style={{ color: "var(--foreground)" }}>
            Top First House            </p>
            <p className="text-[10px] leading-tight mt-0.5" style={{ color: "var(--muted)" }}>
              {isAdmin ? "لوحة الإدارة" : "لوحة المساهم"}
            </p>
          </div>
        </div>
        {showClose && (
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:opacity-80"
            style={{ color: "var(--muted)", background: "rgba(128,128,128,0.1)" }}>
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 overflow-y-auto pb-2 space-y-0.5">
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href} onClick={onClose}
              className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 group")}
              style={
                active
                  ? {
                      color:      "#ffffff",
                      background: "linear-gradient(135deg,#6366f1,#7c3aed)",
                      boxShadow:  "0 3px 12px rgba(99,102,241,.3)",
                    }
                  : {
                      color: "var(--muted)",
                    }
              }
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = "rgba(99,102,241,0.08)";
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = "transparent";
              }}
            >
              <item.icon className="w-4 h-4 shrink-0 transition-all duration-150" />
              <span className="flex-1 truncate">{item.label}</span>
              {active && <span className="w-1.5 h-1.5 rounded-full bg-white/70 shrink-0" />}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-2 pb-4 pt-2 shrink-0"
        style={{ borderTop: "1px solid var(--card-border)" }}>
        <button onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 group"
          style={{ color: "var(--muted)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(239,68,68,0.1)";
            e.currentTarget.style.color = "#ef4444";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--muted)";
          }}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          تسجيل الخروج
        </button>
      </div>

    </div>
  );
}
