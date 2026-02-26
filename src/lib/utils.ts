import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number as Indonesian Rupiah.
 *
 * @example formatRupiah(1234567)         → "Rp 1.234.567"
 * @example formatRupiah(-500000)         → "-Rp 500.000"
 * @example formatRupiah(1234567, true)   → "Rp 1.234.567,00"
 * @example formatRupiah(100000000.23)    → "Rp 100.000.000,23"
 */
export function formatRupiah(amount: number, withCents?: boolean): string {
  // Auto-detect: jika ada desimal, tampilkan sen
  const hasCents = withCents ?? (amount % 1 !== 0);

  const formatted = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  }).format(Math.abs(amount));

  return amount < 0 ? `-${formatted}` : formatted;
}
