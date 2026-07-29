// src/payments/utils/card-brand.util.ts
//
// Cosmetic only (which logo/label to show on a saved card) — never used
// for any charge-eligibility decision.
export function detectCardBrand(digits: string): string {
  if (/^4/.test(digits)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'Mastercard';
  if (/^3[47]/.test(digits)) return 'Amex';
  if (/^6(011|5)/.test(digits)) return 'Discover';
  return 'Card';
}
