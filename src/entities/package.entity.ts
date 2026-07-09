// src/entities/package.entity.ts
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TourItinerary } from './tour-itinerary.entity';
import { TourHighlight } from './tour-highlight.entity';
import { TourInclusion } from './tour-inclusion.entity';
import { TourAddon } from './tour-addon.entity';
import { TourImage } from './tour-image.entity';

@Entity('packages')
export class Package {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  slug: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'int' })
  days: number;

  @Column({ type: 'varchar', length: 100 })
  location: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  difficulty: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  category: string;

  @Column({ type: 'decimal', precision: 2, scale: 1, default: 5.0 })
  rating: number;

  @Column({ type: 'longtext'})
  image: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  badge: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  tagline: string;

  @Column({ type: 'int', default: 0 })
  reviewCount: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ default: false })
  freeCancellation: boolean;

  @Column({ default: false })
  familyFriendly: boolean;

  @Column({ default: false })
  hasDeal: boolean;

  @Column({ default: false })
  isNew: boolean;

  @OneToMany(() => TourItinerary, (i) => i.package, { cascade: true, eager: true })
  itineraries: TourItinerary[];

  @OneToMany(() => TourHighlight, (h) => h.package, { cascade: true, eager: true })
  highlights: TourHighlight[];

  @OneToMany(() => TourInclusion, (inc) => inc.package, { cascade: true, eager: true })
  inclusions: TourInclusion[];

  @OneToMany(() => TourAddon, (a) => a.package, { cascade: true, eager: true })
  addons: TourAddon[];

  @OneToMany(() => TourImage, (img) => img.package, { cascade: true, eager: true })
  images: TourImage[];

  @BeforeInsert()
  @BeforeUpdate()
  generateSlug() {
    if (this.name) {
      this.slug = this.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-');
    }
  }
}