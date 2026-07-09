// src/entities/tour-itinerary.entity.ts
import {
  Column, Entity, JoinColumn,
  ManyToOne, PrimaryGeneratedColumn,
} from 'typeorm';
import { Package } from './package.entity';

@Entity('tour_itineraries')
export class TourItinerary {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  dayNumber: number;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @ManyToOne(() => Package, (p) => p.itineraries, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'package_id' })
  package: Package;
}