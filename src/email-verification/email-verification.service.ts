// src/bookings/email-verification.service.ts
//
// "Does this email actually exist" can't be checked with a regex — the only
// reliable way is to make the owner prove they can receive mail there. This
// service sends a 6-digit code to the address, and once the customer enters
// it back correctly, issues a short-lived signed token. The booking-creation
// endpoint should require and validate that token (see
// EmailVerificationService.assertVerified below) before creating a booking,
// rather than trusting a boolean the frontend could fake.
import { Injectable, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import { MailService } from '../mail/mail.service';

interface PendingCode {
  code: string;
  expiresAt: number;
  attempts: number;
}

const CODE_TTL_MS   = 10 * 60 * 1000; // code valid for 10 minutes
const TOKEN_TTL_MS  = 30 * 60 * 1000; // verified-token valid for 30 minutes (enough to finish checkout)
const MAX_ATTEMPTS  = 5;

@Injectable()
export class EmailVerificationService {
  // NOTE: in-memory store. Fine for a single backend instance. If you run
  // multiple instances behind a load balancer, move this to Redis or a DB
  // table — otherwise a code sent by one instance won't be verifiable by
  // whichever instance handles the verify request.
  private pending = new Map<string, PendingCode>();

  private readonly tokenSecret =
    process.env.EMAIL_VERIFICATION_SECRET ?? 'dev-only-insecure-secret-change-me';

  constructor(private readonly mailService: MailService) {}

  async sendCode(email: string): Promise<void> {
    const normalized = email.trim().toLowerCase();
    const code = crypto.randomInt(100000, 999999).toString();

    this.pending.set(normalized, {
      code,
      expiresAt: Date.now() + CODE_TTL_MS,
      attempts: 0,
    });

    await this.mailService.sendVerificationCode(normalized, code);
  }

  /** Verifies the code and, on success, returns a signed token proving this email was verified. */
  verifyCode(email: string, code: string): string {
    const normalized = email.trim().toLowerCase();
    const entry = this.pending.get(normalized);

    if (!entry) {
      throw new BadRequestException(
        'No verification code was requested for this email, or it already expired. Please request a new one.',
      );
    }
    if (Date.now() > entry.expiresAt) {
      this.pending.delete(normalized);
      throw new BadRequestException('This verification code has expired. Please request a new one.');
    }
    if (entry.attempts >= MAX_ATTEMPTS) {
      this.pending.delete(normalized);
      throw new BadRequestException('Too many incorrect attempts. Please request a new code.');
    }
    if (entry.code !== code.trim()) {
      entry.attempts += 1;
      throw new BadRequestException('Incorrect verification code.');
    }

    this.pending.delete(normalized);
    return this.issueToken(normalized);
  }

  private issueToken(email: string): string {
    const expiresAt = Date.now() + TOKEN_TTL_MS;
    // JSON-encode + base64url the payload rather than joining fields with
    // '.' — email addresses almost always contain dots themselves (every
    // domain: gmail.com, yahoo.com, etc.), so a naive `${email}.${expiresAt}`
    // scheme can't be safely split back apart later: decoded.split('.')
    // would produce more than the expected 3 segments for any real email
    // and grab the wrong pieces. base64url's alphabet has no '.', so
    // exactly one '.' unambiguously separates the payload from the
    // signature below (the same approach JWTs use for this reason).
    const payloadB64 = Buffer.from(JSON.stringify({ email, expiresAt })).toString('base64url');
    const signature = crypto.createHmac('sha256', this.tokenSecret).update(payloadB64).digest('hex');
    return `${payloadB64}.${signature}`;
  }

  /**
   * Call this from BookingsService right before creating a booking. Throws
   * if the token is missing, malformed, expired, tampered with, or doesn't
   * match the email being booked — so a booking can never be created for an
   * email that was never actually verified, regardless of what the
   * frontend claims.
   */
  assertVerified(email: string, token: string | undefined): void {
    if (!token) {
      throw new BadRequestException(
        'Email is not verified. Please verify your email address before confirming the booking.',
      );
    }

    // Exactly one '.' separates the base64url payload from the hex
    // signature — base64url and hex alphabets never contain '.', so this
    // split is unambiguous regardless of what characters are in the email.
    const [payloadB64, signature] = token.split('.');
    if (!payloadB64 || !signature) {
      throw new BadRequestException('Invalid email verification token.');
    }

    const expected = crypto.createHmac('sha256', this.tokenSecret).update(payloadB64).digest('hex');
    if (signature !== expected) {
      throw new BadRequestException('Invalid email verification token.');
    }

    let payload: { email: string; expiresAt: number };
    try {
      payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    } catch {
      throw new BadRequestException('Invalid email verification token.');
    }

    if (Date.now() > payload.expiresAt) {
      throw new BadRequestException('Email verification has expired. Please verify your email again.');
    }
    if (payload.email !== email.trim().toLowerCase()) {
      throw new BadRequestException('Email verification does not match the email on this booking.');
    }
  }
}