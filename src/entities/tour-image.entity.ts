// src/entities/tour-image.entity.ts
import {
  Column, Entity, JoinColumn,
  ManyToOne, PrimaryGeneratedColumn,
} from 'typeorm';
import { Package } from './package.entity';

@Entity('tour_images')
export class TourImage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'longtext'})
  src: string;

  @Column({ type: 'varchar', length: 255 })
  alt: string;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @ManyToOne(() => Package, (p) => p.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'package_id' })
  package: Package;
}