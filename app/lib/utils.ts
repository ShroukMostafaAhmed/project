export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    // Invalid/default dates from backend (year < 2000)
    if (d.getFullYear() < 2000) return "—";
    return new Intl.DateTimeFormat("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(d);
  } catch {
    return "—";
  }
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("ar-EG").format(n);
}

export function formatCurrency(n: number): string {
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 0,
  }).format(n);
}
