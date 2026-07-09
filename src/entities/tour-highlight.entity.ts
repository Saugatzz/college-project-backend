// src/entities/tour-highlight.entity.ts
import {
  Column, Entity, JoinColumn,
  ManyToOne, PrimaryGeneratedColumn,
} from 'typeorm';
import { Package } from './package.entity';

@Entity('tour_highlights')
export class TourHighlight {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 10 })
  icon: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  desc: string;

  @ManyToOne(() => Package, (p) => p.highlights, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'package_id' })
  package: Package;
}