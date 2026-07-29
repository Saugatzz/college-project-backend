// src/entities/user-interaction.entity.ts
//
// Lightweight interaction log used to power personalized recommendations
// ("recommended for you") on the user dashboard. Every time a logged-in
// user views a tour or completes a booking, one row is written here. We
// deliberately keep this append-only and un-normalised (no FK relations
// loaded eagerly) — it's read in bulk and aggregated by tourId, not
// browsed row-by-row.
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type InteractionType = 'view' | 'book';

@Entity('user_interactions')
@Index(['userId', 'tourId'])
export class UserInteraction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 36 })
  userId: string;

  @Column({ type: 'int' })
  tourId: number;

  @Column({ type: 'varchar', length: 10 })
  type: InteractionType;

  // How strongly this single event should count toward the user's
  // taste profile. A booking is a far stronger signal of genuine
  // interest than a page view, so it's weighted heavily higher.
  @Column({ type: 'float', default: 1 })
  weight: number;

  @CreateDateColumn()
  createdAt: Date;
}
