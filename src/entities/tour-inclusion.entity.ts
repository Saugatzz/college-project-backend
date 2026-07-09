// src/entities/tour-inclusion.entity.ts
import {
  Column, Entity, JoinColumn,
  ManyToOne, PrimaryGeneratedColumn,
} from 'typeorm';
import { Package } from './package.entity';

@Entity('tour_inclusions')
export class TourInclusion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  text: string;

  @Column({ type: 'boolean', default: true })
  included: boolean; // true = includes, false = excludes

  @ManyToOne(() => Package, (p) => p.inclusions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'package_id' })
  package: Package;
}