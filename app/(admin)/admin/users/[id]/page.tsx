"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight, User, Phone, Mail, MapPin, CreditCard,
  Building2, Percent, Edit2, CheckCircle, XCircle,
  Key, Hash, AlertCircle, Home, Eye, EyeOff,
} from "lucide-react";
import DashboardShell from "@/app/components/layout/DashboardShell";
import Badge from "@/app/components/ui/Badge";
import { Skeleton } from "@/app/components/ui/Skeleton";
import { api } from "@/app/lib/api";
import {
  ShareholderDto, ApartmentOwnershipDto,
  ShareholderFullDto, ShareholderUnitEntry,
} from "@/app/lib/types";
import { formatDate } from "@/app/lib/utils";

function cStyle(): React.CSSProperties {
  return { background:"var(--card)", border:"1px solid var(--card-border)" };
}

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [shareholder, setShareholder]   = useState<ShareholderDto | null>(null);
  const [ownerships,  setOwnerships]    = useState<ApartmentOwnershipDto[]>([]);
  const [fullData,    setFullData]      = useState<ShareholderFullDto | null>(null);
  const [loading,     setLoading]       = useState(true);
  const [showPw,      setShowPw]        = useState(false);

  useEffect(() => {
    params.then(({ id }: { id: string }) => {
      const numId = parseInt(id);
      Promise.all([
        api.shareholders.get(numId),
        api.ownerships.byShareholder(numId),
        api.shareholderUnits.byShareholder(numId),
      ]).then(([s, o, full]) => {
        setShareholder(s);
        setOwnerships(Array.isArray(o) ? o : []);
        // byShareholder returns ShareholderFullDto (single object)
        setFullData(full as ShareholderFullDto);
      }).catch(() => router.push("/admin/users"))
        .finally(() => setLoading(false));
    });
  }, [params, router]);

  if (loading) {
    return (
      <DashboardShell title="تفاصيل المساهم">
        <div className="space-y-4">
          <Skeleton className="h-8 w-40" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Skeleton className="h-80 rounded-2xl" />
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-24 rounded-2xl" />
              <Skeleton className="h-48 rounded-2xl" />
              <Skeleton className="h-48 rounded-2xl" />
            </div>
          </div>
        </div>
      </DashboardShell>
    );
  }

  if (!shareholder) return null;

  const units          = fullData?.units ?? [];
  const totalShares    = units.reduce((s, u) => s + u.sharesCount, 0);
  const totalPct       = ownerships.reduce((s, o) => s + o.ownershipPercentage, 0);

  return (
    <DashboardShell title="تفاصيل المساهم">
      <div className="mb-4">
        <Link href="/admin/users"
          className="flex items-center gap-1.5 text-sm w-fit transition-colors"
          style={{ color:"var(--muted)" }}>
          <ArrowRight className="w-4 h-4" />
          العودة للمساهمين
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Profile card ── */}
        <div className="rounded-2xl p-6 flex flex-col" style={cStyle()}>
          <div className="flex flex-col items-center text-center mb-5">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-3xl font-bold mb-3"
              style={{ background:"linear-gradient(135deg,#6366f1,#7c3aed)", boxShadow:"0 8px 24px rgba(99,102,241,.35)" }}>
              {(shareholder.fullName ?? "?")[0]}
            </div>
            <h2 className="text-lg font-bold" style={{ color:"var(--foreground)" }}>
              {shareholder.fullName}
            </h2>
            <Badge variant={shareholder.isActive ? "success" : "danger"} className="mt-2">
              {shareholder.isActive
                ? <><CheckCircle className="w-3 h-3 ml-1 inline" /> نشط</>
                : <><XCircle    className="w-3 h-3 ml-1 inline" /> غير نشط</>
              }
            </Badge>
          </div>

          <div className="space-y-3 flex-1">
            {[
              { icon: CreditCard, label: "الرقم القومي",  value: shareholder.nationalId },
              { icon: Phone,      label: "الهاتف",         value: shareholder.phone      },
              { icon: Mail,       label: "البريد",         value: shareholder.email      },
              { icon: MapPin,     label: "العنوان",        value: shareholder.address    },
              { icon: User,       label: "تاريخ التسجيل", value: formatDate(shareholder.createdAt) },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="p-2 rounded-lg shrink-0" style={{ background:"rgba(99,102,241,.08)" }}>
                  <Icon className="w-3.5 h-3.5" style={{ color:"#6366f1" }} />
                </div>
                <div>
                  <p className="text-xs" style={{ color:"var(--muted)" }}>{label}</p>
                  <p className="text-sm font-medium" style={{ color:"var(--foreground)" }}>{value ?? "—"}</p>
                </div>
              </div>
            ))}

            {/* Password */}
            {shareholder.generatedPassword && (
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg shrink-0" style={{ background:"rgba(245,158,11,.1)" }}>
                  <Key className="w-3.5 h-3.5" style={{ color:"#f59e0b" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs" style={{ color:"var(--muted)" }}>كلمة المرور</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-sm font-mono font-bold" style={{ color:"var(--foreground)" }}>
                      {showPw ? shareholder.generatedPassword : "••••••••"}
                    </p>
                    <button onClick={() => setShowPw(v => !v)}
                      className="p-1 rounded-md transition-colors"
                      style={{ background:"rgba(99,102,241,.1)", color:"#6366f1" }}
                      title={showPw ? "إخفاء" : "إظهار"}>
                      {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Link href={`/admin/users/${shareholder.id}/edit`}
            className="mt-5 flex items-center justify-center gap-2 w-full text-sm font-semibold py-2.5 rounded-xl text-white"
            style={{ background:"linear-gradient(135deg,#6366f1,#7c3aed)" }}>
            <Edit2 className="w-4 h-4" />
            تعديل البيانات
          </Link>
        </div>

        {/* ── Right column ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label:"الوحدات المرتبط بها", value:units.length,      clr:"#6366f1", bg:"rgba(99,102,241,.1)",  icon:Building2 },
              { label:"إجمالي الملكيات في الشقق",  value:`${totalPct.toFixed(1)}%`, clr:"#7c3aed", bg:"rgba(124,58,237,.1)", icon:Percent },
              { label:"إجمالي الأسهم",   value:totalShares,       clr:"#0ea5e9", bg:"rgba(14,165,233,.1)",  icon:Hash },
            ].map(({ label, value, clr, bg, icon:Icon }) => (
              <div key={label} className="rounded-2xl p-4 flex items-center gap-3" style={cStyle()}>
                <div className="p-2.5 rounded-xl shrink-0" style={{ background:bg }}>
                  <Icon className="w-4 h-4" style={{ color:clr }} />
                </div>
                <div>
                  <p className="text-xs" style={{ color:"var(--muted)" }}>{label}</p>
                  <p className="text-xl font-bold" style={{ color:clr }}>{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Unit memberships — from by-shareholder API */}
          <div className="rounded-2xl border overflow-hidden" style={cStyle()}>
            <div className="px-5 py-3 border-b flex items-center gap-2"
              style={{ borderColor:"var(--card-border)", background:"rgba(128,128,128,.04)" }}>
              <Building2 className="w-4 h-4" style={{ color:"#6366f1" }} />
              <h3 className="text-sm font-semibold" style={{ color:"var(--foreground)" }}>
                الوحدات المرتبط بها
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={{ background:"rgba(99,102,241,.1)", color:"#6366f1" }}>
                {units.length}
              </span>
            </div>

            {units.length === 0 ? (
              <div className="py-10 text-center flex flex-col items-center gap-2">
                <AlertCircle className="w-8 h-8 opacity-20" style={{ color:"var(--muted)" }} />
                <p className="text-sm" style={{ color:"var(--muted)" }}>لا توجد وحدات مرتبطة</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor:"var(--card-border)" }}>
                {units.map((u: ShareholderUnitEntry) => (
                  <div key={u.unitId}>
                    {/* Unit header */}
                    <div className="flex items-center justify-between px-5 py-3.5 transition-colors"
                      onMouseEnter={e => e.currentTarget.style.background="rgba(128,128,128,.04)"}
                      onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold"
                          style={{ background:"linear-gradient(135deg,#6366f1,#7c3aed)" }}>
                          {(u.unitCode ?? u.unitName ?? "?")[0]}
                        </div>
                        <div>
                          <p className="text-sm font-semibold" style={{ color:"var(--foreground)" }}>
                            {u.unitName ?? `وحدة #${u.unitId}`}
                          </p>
                          {u.unitCode && (
                            <p className="text-[10px] font-mono" style={{ color:"var(--muted)" }}>{u.unitCode}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-base font-bold" style={{ color:"#0ea5e9" }}>{u.sharesCount}</p>
                          <p className="text-[10px]" style={{ color:"var(--muted)" }}>سهم</p>
                        </div>
                        <div className="text-center">
                          <p className="text-base font-bold" style={{ color:"#7c3aed" }}>{u.sharePercentage.toFixed(1)}%</p>
                          <p className="text-[10px]" style={{ color:"var(--muted)" }}>نسبة</p>
                        </div>
                      </div>
                    </div>

                    {/* Apartments in this unit */}
                    {u.apartments.length > 0 && (
                      <div className="px-5 pb-3"
                        style={{ background:"rgba(128,128,128,.03)", borderTop:"1px solid var(--card-border)" }}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3">
                          {u.apartments.map(apt => (
                            <div key={apt.apartmentId}
                              className="flex items-center justify-between px-3 py-2 rounded-xl"
                              style={{ background:"rgba(99,102,241,.07)", border:"1px solid rgba(99,102,241,.12)" }}>
                              <div className="flex items-center gap-2">
                                <Home className="w-3.5 h-3.5" style={{ color:"#818cf8" }} />
                                <div>
                                  <p className="text-xs font-semibold" style={{ color:"var(--foreground)" }}>
                                    شقة {apt.apartmentNumber ?? apt.apartmentId}
                                  </p>
                                  {apt.floor && (
                                    <p className="text-[10px]" style={{ color:"var(--muted)" }}>
                                      الطابق {apt.floor}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <span className="text-sm font-bold" style={{ color:"#6366f1" }}>
                                {apt.ownershipPercentage}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </DashboardShell>
  );
}