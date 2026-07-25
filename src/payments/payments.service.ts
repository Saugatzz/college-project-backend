import { BadRequestException, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { ChargeCardDto } from './dto/charge-card.dto';
import { isValidLuhn } from './utils/luhn.util';
import { CardPaymentVerificationService } from './card-payment-verification.service';
import { lookupTestCard } from './utils/test-card.utils';

export interface CardChargeResult {
  transactionId: string;
  last4: string;
  amount: number;
  status: 'succeeded';
  token: string;
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly cardPaymentVerificationService: CardPaymentVerificationService,
  ) {}

  // Fake/test-mode charge — no real gateway. Accepts Stripe-style test
  // card numbers (see test-cards.util.ts) and rejects anything that
  // fails basic structural checks a real processor would reject on
  // (Luhn checksum, expiry, positive amount). Raw card number and CVV
  // are NEVER persisted, logged, or returned — only last4 and a signed
  // proof token leave this function.
  chargeCard(dto: ChargeCardDto): CardChargeResult {
    const digits = dto.cardNumber.replace(/\D/g, '');

    if (!isValidLuhn(digits)) {
      throw new BadRequestException(
        'Card number failed validation. Please check and try again.',
      );
    }

    const [monthStr, yearStr] = dto.expiry.split('/');
    const month = parseInt(monthStr, 10);
    const year = 2000 + parseInt(yearStr, 10);
    const expiryEnd = new Date(year, month, 0, 23, 59, 59); // last day of expiry month
    if (expiryEnd < new Date()) {
      throw new BadRequestException('This card has expired.');
    }

    if (dto.amount <= 0) {
      throw new BadRequestException('Invalid charge amount.');
    }

    const outcome = lookupTestCard(digits);
    if (outcome.result === 'declined') {
      throw new BadRequestException(outcome.reason ?? 'Your card was declined.');
    }

    const transactionId = `txn_${crypto.randomBytes(10).toString('hex')}`;
    const last4 = digits.slice(-4);
    const token = this.cardPaymentVerificationService.sign(transactionId, last4, dto.amount);

    return { transactionId, last4, amount: dto.amount, status: 'succeeded', token };
  }
}