"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getAuthUser } from "@/app/lib/auth";
import LoadingScreen from "@/app/components/ui/LoadingScreen";

const PUBLIC_PATHS = ["/login"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const user = getAuthUser();
    const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

    if (!user && !isPublic) {
      // Not logged in → redirect to login
      router.replace("/login");
      return;
    }

    if (user && isPublic) {
      // Already logged in → redirect to dashboard
      router.replace(user.role === "admin" ? "/admin/dashboard" : "/shareholder/home");
      return;
    }

    if (user && !isPublic) {
      // Role-based protection
      if (user.role === "shareholder" && pathname.startsWith("/admin")) {
        router.replace("/shareholder/home");
        return;
      }
      if (user.role === "admin" && pathname.startsWith("/shareholder")) {
        router.replace("/admin/dashboard");
        return;
      }
    }

    setChecked(true);
  }, [pathname, router]);

  if (!checked) {
    return <LoadingScreen message="جاري التحقق من الهوية..." />;
  }

  return <>{children}</>;
}
