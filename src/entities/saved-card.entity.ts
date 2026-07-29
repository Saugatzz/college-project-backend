// src/entities/saved-card.entity.ts
//
// Lets a logged-in user skip re-typing their card next time they check
// out. Consistent with the rest of this app's payment handling (see
// CardPaymentVerificationService / PaymentsService): the CVV is NEVER
// stored here or anywhere else — it must always be re-entered, exactly
// like a real saved-card flow (Stripe, Amazon, etc. all still ask for
// the CVV on a saved card). The card number itself is encrypted at rest
// (see payments/card-crypto.util.ts) since it's needed again to run the
// (test-mode) charge; only last4/brand/expiry are ever exposed to the
// client.
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('saved_cards')
@Index(['userId'])
export class SavedCard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  userId: string;

  // AES-256-GCM ciphertext of the full card number — see card-crypto.util.ts.
  @Column({ type: 'text' })
  encryptedNumber: string;

  @Column({ type: 'varchar', length: 4 })
  last4: string;

  @Column({ type: 'varchar', length: 20 })
  brand: string; // 'Visa' | 'Mastercard' | 'Amex' | 'Card'

  @Column({ type: 'varchar', length: 2 })
  expiryMonth: string;

  @Column({ type: 'varchar', length: 2 })
  expiryYear: string;

  @CreateDateColumn()
  createdAt: Date;
}
