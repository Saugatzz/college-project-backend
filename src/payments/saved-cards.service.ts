import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavedCard } from 'src/entities/saved-card.entity';
import { encryptCardNumber, decryptCardNumber } from './utils/card-crypto.util';
import { detectCardBrand } from './utils/card-brand.util';

export interface SavedCardView {
  id: string;
  brand: string;
  last4: string;
  expiryMonth: string;
  expiryYear: string;
  createdAt: Date;
}

function toView(card: SavedCard): SavedCardView {
  return {
    id: card.id,
    brand: card.brand,
    last4: card.last4,
    expiryMonth: card.expiryMonth,
    expiryYear: card.expiryYear,
    createdAt: card.createdAt,
  };
}

@Injectable()
export class SavedCardsService {
  constructor(
    @InjectRepository(SavedCard)
    private readonly repo: Repository<SavedCard>,
  ) {}

  async listForUser(userId: string): Promise<SavedCardView[]> {
    const cards = await this.repo.find({ where: { userId }, order: { createdAt: 'DESC' } });
    return cards.map(toView);
  }

  /**
   * Saves a card for later use. Digits/expiry are the same fields that
   * were just used for a successful charge — never the CVV, which this
   * method doesn't even accept. De-dupes on (userId, last4, expiry) so
   * re-using the same card repeatedly doesn't pile up duplicate rows.
   */
  async save(userId: string, digits: string, expiryMonth: string, expiryYear: string): Promise<SavedCardView> {
    const last4 = digits.slice(-4);
    const existing = await this.repo.findOne({
      where: { userId, last4, expiryMonth, expiryYear },
    });
    if (existing) return toView(existing);

    const card = this.repo.create({
      userId,
      encryptedNumber: encryptCardNumber(digits),
      last4,
      brand: detectCardBrand(digits),
      expiryMonth,
      expiryYear,
    });
    const saved = await this.repo.save(card);
    return toView(saved);
  }

  async remove(userId: string, cardId: string): Promise<void> {
    const card = await this.repo.findOne({ where: { id: cardId } });
    if (!card) throw new NotFoundException('Saved card not found.');
    if (card.userId !== userId) throw new ForbiddenException('This card does not belong to you.');
    await this.repo.remove(card);
  }

  /**
   * Resolves a saved card back to its full number + expiry for charging.
   * Only ever called server-side (PaymentsService) — the decrypted
   * number never leaves the backend.
   */
  async getForCharge(userId: string, cardId: string): Promise<{ digits: string; expiry: string }> {
    const card = await this.repo.findOne({ where: { id: cardId } });
    if (!card) throw new NotFoundException('Saved card not found.');
    if (card.userId !== userId) throw new ForbiddenException('This card does not belong to you.');
    return {
      digits: decryptCardNumber(card.encryptedNumber),
      expiry: `${card.expiryMonth}/${card.expiryYear}`,
    };
  }
}
