"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight, User, Phone, Mail, MapPin, CreditCard,
  Building2, Percent, Edit2, CheckCircle, XCircle,
} from "lucide-react";
import DashboardShell from "@/app/components/layout/DashboardShell";
import Badge from "@/app/components/ui/Badge";
import { api } from "@/app/lib/api";
import { ShareholderDto, ApartmentOwnershipDto } from "@/app/lib/types";
import { formatDate } from "@/app/lib/utils";

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [shareholder, setShareholder] = useState<ShareholderDto | null>(null);
  const [ownerships, setOwnerships] = useState<ApartmentOwnershipDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then(({ id }: { id: string }) => {
      const numId = parseInt(id);
      Promise.all([
        api.shareholders.get(numId),
        api.ownerships.byShareholder(numId),
      ]).then(([s, o]) => {
        setShareholder(s);
        setOwnerships(o);
      }).catch(() => router.push("/admin/users"))
        .finally(() => setLoading(false));
    });
  }, [params, router]);

  if (loading) {
    return (
      <DashboardShell title="تفاصيل المساهم">
        <div className="flex justify-center py-20">
          <span className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      </DashboardShell>
    );
  }

  if (!shareholder) return null;

  const totalPercentage = ownerships.reduce((s, o) => s + o.ownershipPercentage, 0);

  return (
    <DashboardShell title="تفاصيل المساهم">
      <div className="mb-4 flex items-center gap-2">
        <Link
          href="/admin/users"
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          العودة للمساهمين
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-2xl font-bold mb-3">
              {(shareholder.fullName ?? "?")[0]}
            </div>
            <h2 className="text-lg font-bold text-slate-800">{shareholder.fullName}</h2>
            <Badge
              variant={shareholder.isActive ? "success" : "danger"}
              className="mt-2"
            >
              {shareholder.isActive ? (
                <><CheckCircle className="w-3 h-3 ml-1 inline" /> نشط</>
              ) : (
                <><XCircle className="w-3 h-3 ml-1 inline" /> غير نشط</>
              )}
            </Badge>
          </div>

          <div className="space-y-3">
            {[
              { icon: CreditCard, label: "الرقم القومي", value: shareholder.nationalId },
              { icon: Phone, label: "الهاتف", value: shareholder.phone },
              { icon: Mail, label: "البريد", value: shareholder.email },
              { icon: MapPin, label: "العنوان", value: shareholder.address },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="p-2 bg-slate-50 rounded-lg shrink-0">
                  <Icon className="w-4 h-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">{label}</p>
                  <p className="text-sm text-slate-700">{value ?? "—"}</p>
                </div>
              </div>
            ))}
            <div className="flex items-start gap-3">
              <div className="p-2 bg-slate-50 rounded-lg shrink-0">
                <User className="w-4 h-4 text-slate-500" />
              </div>
              <div>
                <p className="text-xs text-slate-400">تاريخ التسجيل</p>
                <p className="text-sm text-slate-700">{formatDate(shareholder.createdAt)}</p>
              </div>
            </div>
          </div>

          <Link
            href={`/admin/users/${shareholder.id}/edit`}
            className="mt-5 flex items-center justify-center gap-2 w-full border border-indigo-200 text-indigo-600 hover:bg-indigo-50 text-sm font-medium py-2.5 rounded-xl transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            تعديل البيانات
          </Link>
        </div>

        {/* Ownerships */}
        <div className="lg:col-span-2 space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-indigo-50 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <Building2 className="w-6 h-6 text-indigo-600" />
                <div>
                  <p className="text-xs text-indigo-500">عدد الشقق</p>
                  <p className="text-2xl font-bold text-indigo-700">{ownerships.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-violet-50 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <Percent className="w-6 h-6 text-violet-600" />
                <div>
                  <p className="text-xs text-violet-500">إجمالي نسبة الملكية</p>
                  <p className="text-2xl font-bold text-violet-700">
                    {totalPercentage.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Ownerships Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">الشقق المملوكة</h3>
            </div>
            {ownerships.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                لا توجد ملكيات مسجلة
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      {["رقم الشقة", "نسبة الملكية"].map((h) => (
                        <th key={h} className="px-4 py-3 text-right font-semibold text-slate-600">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {ownerships.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-800">
                          شقة {o.apartmentNumber ?? o.apartmentId}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-100 rounded-full h-2 max-w-24">
                              <div
                                className="bg-indigo-500 h-2 rounded-full"
                                style={{ width: `${Math.min(o.ownershipPercentage, 100)}%` }}
                              />
                            </div>
                            <span className="text-slate-700 font-medium">
                              {o.ownershipPercentage}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
