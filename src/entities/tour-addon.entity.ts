// src/entities/tour-addon.entity.ts
import {
  Column, Entity, JoinColumn,
  ManyToOne, PrimaryGeneratedColumn,
} from 'typeorm';
import { Package } from './package.entity';

@Entity('tour_addons')
export class TourAddon {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text' })
  desc: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @ManyToOne(() => Package, (p) => p.addons, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'package_id' })
  package: Package;
}