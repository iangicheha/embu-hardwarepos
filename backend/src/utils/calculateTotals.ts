export interface TotalResult {
  subtotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  totalWithTax: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export const calculateTotals = (
  subtotal: number,
  discount = 0,
  taxRate = 0
): TotalResult => {
  const safeSubtotal = Math.max(0, subtotal);
  const safeDiscount = Math.max(
    0,
    Math.min(discount, safeSubtotal)
  );
  const afterDiscount = safeSubtotal - safeDiscount;
  const taxAmount = round2(afterDiscount * (taxRate / 100));
  const totalWithTax = round2(afterDiscount + taxAmount);

  return {
    subtotal: round2(safeSubtotal),
    discount: round2(safeDiscount),
    taxRate,
    taxAmount,
    totalWithTax
  };
};
