import { BadRequestException, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

interface CardPaymentPayload {
  transactionId: string;
  last4: string;
  amount: number;
  iat: number;
  exp: number;
}

// Same trust model as EmailVerificationService: PaymentsService only
// issues a token after a "charge" actually succeeds (see
// PaymentsService.chargeCard), and BookingsService trusts nothing about
// the payment except what this service can verify from the token itself.
// A client can never fabricate cardTransactionId/last4 by hand — the
// signature would fail.
@Injectable()
export class CardPaymentVerificationService {
  // In production this should come from a real secret manager, same as
  // whatever backs EmailVerificationService's signing key.
  private readonly secret =
    process.env.CARD_PAYMENT_TOKEN_SECRET ?? 'dev-only-card-payment-secret';

  private readonly ttlMs = 15 * 60 * 1000; // token valid 15 minutes

  sign(transactionId: string, last4: string, amount: number): string {
    const now = Date.now();
    const payload: CardPaymentPayload = {
      transactionId,
      last4,
      amount,
      iat: now,
      exp: now + this.ttlMs,
    };
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = crypto
      .createHmac('sha256', this.secret)
      .update(body)
      .digest('base64url');
    return `${body}.${sig}`;
  }

  /**
   * Verifies a card payment token proves a real (test-mode) charge for
   * exactly `expectedAmount`. Throws BadRequestException if the token is
   * missing, malformed, tampered with, expired, or doesn't match the
   * amount actually being booked — so a booking total can never diverge
   * from what was "charged".
   */
  assertVerified(token: string | undefined, expectedAmount: number): { transactionId: string; last4: string } {
    if (!token) {
      throw new BadRequestException('Card payment has not been verified.');
    }

    const [body, sig] = token.split('.');
    if (!body || !sig) {
      throw new BadRequestException('Invalid card payment token.');
    }

    const expectedSig = crypto
      .createHmac('sha256', this.secret)
      .update(body)
      .digest('base64url');

    // Constant-time comparison to avoid leaking signature bytes via timing.
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw new BadRequestException('Invalid or tampered card payment token.');
    }

    let payload: CardPaymentPayload;
    try {
      payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    } catch {
      throw new BadRequestException('Invalid card payment token.');
    }

    if (Date.now() > payload.exp) {
      throw new BadRequestException('Card payment verification has expired. Please pay again.');
    }

    // Guard against a stale token from an earlier, different-amount
    // attempt (e.g. user changed add-ons after charging) — allow a tiny
    // epsilon for floating point totals.
    if (Math.abs(payload.amount - expectedAmount) > 0.01) {
      throw new BadRequestException('Card payment amount does not match the booking total.');
    }

    return { transactionId: payload.transactionId, last4: payload.last4 };
  }
}