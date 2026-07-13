import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Prisma serialises `Decimal` columns as strings over the wire. `Intl.NumberFormat`
// coerces them, but the coercion is lossy and silent — use this everywhere we
// sum or compare prices/quantities to keep the value numerically safe.
export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function formatCurrency(amount: number | string | null | undefined, currency = "KES") {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(toNumber(amount));
}

export function formatNumber(num: number | string | null | undefined) {
  return new Intl.NumberFormat("en-KE").format(toNumber(num));
}

export function formatDate(date: string | Date | null | undefined) {
  if (!date) return "—";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export function formatPercent(value: number | null | undefined) {
  const v = toNumber(value);
  const sign = v >= 0 ? "+" : "";
  return `${sign}${v.toFixed(1)}%`;
}
