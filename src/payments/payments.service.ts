import { BadRequestException, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { ChargeCardDto } from './dto/charge-card.dto';
import { isValidLuhn } from './utils/luhn.util';
import { CardPaymentVerificationService } from './card-payment-verification.service';
import { lookupTestCard } from './utils/test-card.utils';
import { SavedCardsService, SavedCardView } from './saved-cards.service';

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
    private readonly savedCardsService: SavedCardsService,
  ) {}

  // Fake/test-mode charge — no real gateway. Accepts Stripe-style test
  // card numbers (see test-cards.util.ts) and rejects anything that
  // fails basic structural checks a real processor would reject on
  // (Luhn checksum, expiry, positive amount). Raw card number and CVV
  // are NEVER persisted, logged, or returned — only last4 and a signed
  // proof token leave this function. (Saving a card for later, when
  // requested, is handled separately by SavedCardsService and still
  // never touches the CVV.)
  private runCharge(digits: string, expiry: string, amount: number): CardChargeResult {
    if (!isValidLuhn(digits)) {
      throw new BadRequestException(
        'Card number failed validation. Please check and try again.',
      );
    }

    const [monthStr, yearStr] = expiry.split('/');
    const month = parseInt(monthStr, 10);
    const year = 2000 + parseInt(yearStr, 10);
    const expiryEnd = new Date(year, month, 0, 23, 59, 59); // last day of expiry month
    if (expiryEnd < new Date()) {
      throw new BadRequestException('This card has expired.');
    }

    if (amount <= 0) {
      throw new BadRequestException('Invalid charge amount.');
    }

    const outcome = lookupTestCard(digits);
    if (outcome.result === 'declined') {
      throw new BadRequestException(outcome.reason ?? 'Your card was declined.');
    }

    const transactionId = `txn_${crypto.randomBytes(10).toString('hex')}`;
    const last4 = digits.slice(-4);
    const token = this.cardPaymentVerificationService.sign(transactionId, last4, amount);

    return { transactionId, last4, amount, status: 'succeeded', token };
  }

  async chargeCard(dto: ChargeCardDto, userId?: string | null): Promise<CardChargeResult & { savedCard?: SavedCardView }> {
    const digits = dto.cardNumber.replace(/\D/g, '');
    const result = this.runCharge(digits, dto.expiry, dto.amount);

    if (dto.saveCard && userId) {
      const [monthStr, yearStr] = dto.expiry.split('/');
      const savedCard = await this.savedCardsService.save(userId, digits, monthStr, yearStr);
      return { ...result, savedCard };
    }

    return result;
  }

  // Charges using a previously-saved card. The CVV is still required and
  // format-checked (never stored, so there's nothing to compare it
  // against beyond that — identical to how the fake gateway already
  // treats CVV for a fresh card).
  async chargeSavedCard(userId: string, cardId: string, amount: number): Promise<CardChargeResult> {
    const { digits, expiry } = await this.savedCardsService.getForCharge(userId, cardId);
    return this.runCharge(digits, expiry, amount);
  }
}