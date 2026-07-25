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