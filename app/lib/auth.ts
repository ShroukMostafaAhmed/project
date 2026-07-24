"use client";

import { AuthUser, UserRole } from "./types";

const STORAGE_KEY = "auth_user";

export function getAuthUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function setAuthUser(user: AuthUser): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export function clearAuthUser(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function getToken(): string | null {
  return getAuthUser()?.token ?? null;
}

export function isAdmin(user: AuthUser | null): boolean {
  return user?.role === "admin";
}

export function isShareholder(user: AuthUser | null): boolean {
  return user?.role === "shareholder";
}

export function getRedirectPath(role: UserRole): string {
  return role === "admin" ? "/admin/dashboard" : "/shareholder/home";
}
