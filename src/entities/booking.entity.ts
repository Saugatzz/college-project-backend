// src/entities/booking.entity.ts
import {
  Column, CreateDateColumn, Entity, ManyToOne,
  PrimaryGeneratedColumn, UpdateDateColumn, JoinColumn,
} from 'typeorm';
import { Package } from './package.entity';

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Package, { nullable: true, onDelete: 'SET NULL', eager: false })
  @JoinColumn({ name: 'tourId' })
  tour: Package;

  @Column({ nullable: true })
  tourId: number;

  @Column({ type: 'varchar', length: 100 })
  firstName: string;

  @Column({ type: 'varchar', length: 100 })
  lastName: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 30 })
  phone: string;

  @Column({ type: 'varchar', length: 100 })
  country: string;

  @Column({ type: 'int', default: 1 })
  travelers: number;

  // The CONFIRMED departure date, set by an admin once guide coordination
  // has actually locked something in (see guideCoordinationStatus below).
  // This is distinct from preferredDate, which is only what the customer
  // asked for at checkout.
  @Column({ type: 'date', nullable: true })
  departureDate: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'varchar', length: 20 })
  paymentMethod: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  tourPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  addonsTotal: number;

  // Extra charge applied when the customer commits to an EXACT preferred
  // date rather than a flexible window. Paying this guarantees a guide is
  // assigned for that date — exact-date bookings can never end up
  // "unable to accommodate". Always 0 for flexible bookings.
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  dateSurcharge: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ type: 'json', nullable: true })
  selectedAddons: { name: string; price: number }[];

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: string;

  // Path to the uploaded receipt PDF (Khalti / eSewa payments)
  @Column({ type: 'varchar', length: 500, nullable: true })
  receiptPath: string;

  // How the customer wants to be reached after booking: 'email' or 'whatsapp'.
  @Column({ type: 'varchar', length: 20, default: 'email' })
  contactMethod: string;

  // The actual contact detail for that method — the WhatsApp number if
  // contactMethod is 'whatsapp', or the email address if it's 'email'.
  // Stored explicitly (rather than always deriving from `email`/`phone`)
  // so the admin table can show exactly what the customer chose without
  // guessing which field to display.
  @Column({ type: 'varchar', length: 255, nullable: true })
  contactValue: string;

  // Set when the person was logged in at the time of booking (resolved
  // server-side from their JWT — never trusted from client input). Guest
  // checkouts (no account, or not logged in) simply leave this null; the
  // booking is still fully identified by email/phone as before. Powers
  // "my bookings" on the user dashboard and per-user recommendations.
  @Column({ type: 'varchar', length: 36, nullable: true })
  userId: string | null;

  // ── Preferred start timing ─────────────────────────────────────────
  // What the customer asked for at checkout — either an exact date, or
  // (when dateFlexibility === 'flexible') the 1st of a preferred month
  // paired with a flexibilityWindow describing how loose that anchor is.
  @Column({ type: 'date', nullable: true })
  preferredDate: string;

  @Column({ type: 'varchar', length: 20, default: 'exact' })
  dateFlexibility: 'exact' | 'flexible';

  @Column({ type: 'varchar', length: 50, nullable: true })
  flexibilityWindow: string | undefined; // e.g. '±1 week', 'Whole month'

  @Column({ type: 'text', nullable: true })
  dateNotes: string;

  // ── Guide coordination ──────────────────────────────────────────────
  // Tracks the business's progress lining up local guides for the
  // customer's requested window. Admin-managed; each change emails the
  // customer an update. When it reaches 'guides_confirmed', departureDate
  // above gets set to the actual locked-in date.
  //
  // There is no "couldn't accommodate" terminal state: exact-date
  // bookings guarantee a guide via dateSurcharge, and flexible bookings
  // are simply worked until a departure date is confirmed within the
  // customer's window.
  @Column({ type: 'varchar', length: 30, default: 'pending_contact' })
  guideCoordinationStatus: 'pending_contact' | 'contacting_guides' | 'guides_confirmed';

  // Proof of a successful (test-mode) card charge — resolved server-side
  // from a signed cardPaymentToken by CardPaymentVerificationService, never
  // trusted directly from client input. The Card equivalent of
  // receiptPath for Khalti/eSewa. Only last4 and a generated transaction
  // id are ever stored — full card number / CVV are never persisted.
  @Column({ type: 'varchar', length: 100, nullable: true })
  cardTransactionId: string;

  @Column({ type: 'varchar', length: 4, nullable: true })
  cardLast4: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}