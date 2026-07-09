import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Booking } from './booking.entity';

@Entity('booking_addons')
export class BookingAddon {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column('float')
  price: number;

  @ManyToOne(() => Booking, (b) => b.selectedAddons, { onDelete: 'CASCADE' })
  booking: Booking;
}