"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import LoadingScreen from "@/app/components/ui/LoadingScreen";
import SplashScreen  from "@/app/components/ui/SplashScreen";

interface NavContextValue {
  isNavigating: boolean;
}

const NavContext = createContext<NavContextValue>({ isNavigating: false });
export function useNavigation() { return useContext(NavContext); }

const SPLASH_KEY = "app_splashed";

export default function NavigationProvider({ children }: { children: React.ReactNode }) {
  const pathname     = usePathname();
  const prevPathname = useRef(pathname);
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Splash — show once per session
  const [showSplash, setShowSplash] = useState(false);
  const [splashDone, setSplashDone] = useState(false);

  // Page-transition loading bar
  const [navigating, setNavigating] = useState(false);

  // ── First-load splash ──────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const already = sessionStorage.getItem(SPLASH_KEY);
    if (already) {
      setSplashDone(true);        // skip
    } else {
      setShowSplash(true);        // show
    }
  }, []);

  function handleSplashDone() {
    sessionStorage.setItem(SPLASH_KEY, "1");
    setShowSplash(false);
    setSplashDone(true);
  }

  // ── Route-change loading indicator ────────────────────
  useEffect(() => {
    if (!splashDone) return;
    if (prevPathname.current === pathname) return;
    prevPathname.current = pathname;

    setNavigating(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setNavigating(false), 700);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [pathname, splashDone]);

  return (
    <NavContext.Provider value={{ isNavigating: navigating }}>
      {/* Splash — first visit only */}
      {showSplash && <SplashScreen onDone={handleSplashDone} />}

      {/* Page-change loading overlay */}
      {navigating && !showSplash && <LoadingScreen message="جاري الانتقال..." />}

      {/* App content (render behind splash so it's ready) */}
      <div style={{ visibility: showSplash ? "hidden" : "visible" }}>
        {children}
      </div>
    </NavContext.Provider>
  );
}
