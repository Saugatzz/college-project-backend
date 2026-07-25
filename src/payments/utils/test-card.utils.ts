// Fake test cards for development/demo use — no real payment gateway is
// involved. Mirrors Stripe's published test-card numbers so the behavior
// is familiar: a small set of numbers produce specific outcomes, and any
// other Luhn-valid 13-19 digit number is treated as a generic approval.
export interface TestCardOutcome {
  result: 'approved' | 'declined';
  reason?: string;
}

export const TEST_CARDS: Record<string, TestCardOutcome> = {
  '4242424242424242': { result: 'approved' },
  '4000000000000002': { result: 'declined', reason: 'Your card was declined.' },
  '4000000000009995': { result: 'declined', reason: 'Your card has insufficient funds.' },
  '4000000000000069': { result: 'declined', reason: 'Your card has expired.' },
  '4000000000000127': { result: 'declined', reason: 'Your card\'s security code is incorrect.' },
};

export function lookupTestCard(digits: string): TestCardOutcome {
  return TEST_CARDS[digits] ?? { result: 'approved' };
}