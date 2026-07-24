// Helper types for recharts to avoid TypeScript issues
export type TooltipFormatter = (value: unknown) => string;

export function currency(value: unknown): string {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 0,
  }).format(n);
}

export function percent(value: unknown): string {
  return `${Number(value ?? 0).toFixed(1)}%`;
}
