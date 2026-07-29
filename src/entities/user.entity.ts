// src/users/user.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, BeforeInsert
} from 'typeorm';
import * as bcrypt from 'bcryptjs';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ unique: true, length: 150 })
  email: string;

  @Column({ select: false }) // never returned in queries by default
  password: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  // Set true only when the account was created after a real OTP
  // verification (see AuthService.register / EmailVerificationService).
  // Any account with userId attached to a request has necessarily
  // passed this — so booking creation can skip re-verifying email for
  // logged-in users and only ask guests to verify at checkout.
  @Column({ default: false })
  emailVerified: boolean;

  // Tour categories the person said they're interested in at signup
  // (e.g. ['trek', 'cultural']). Used to seed "Recommended for you"
  // before there's any real interaction history — see
  // PackagesService.getRecommendationsForUser. Optional; an empty list
  // just means recommendations fall back to top-rated tours until the
  // person starts viewing/booking things.
  @Column({ type: 'simple-array', nullable: true })
  preferredCategories: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  async hashPassword() {
    if (this.password) {
      this.password = await bcrypt.hash(this.password, 12);
    }
  }

  async validatePassword(plainPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, this.password);
  }
}