import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import AuthGuard from "@/app/components/providers/AuthGuard";
import NavigationProvider from "@/app/components/providers/NavigationProvider";
import ThemeProvider from "@/app/components/providers/ThemeProvider";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "شركة المساهمين — نظام إدارة المشاريع العقارية",
  description: "نظام متكامل لإدارة مشاريع الشركة والمساهمين",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <ThemeProvider>
          <NavigationProvider>
            <AuthGuard>
              {children}
            </AuthGuard>
          </NavigationProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
