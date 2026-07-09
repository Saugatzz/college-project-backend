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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}