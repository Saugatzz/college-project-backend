import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/entities/user.entity';
import { Booking } from 'src/entities/booking.entity';

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  bookingCount: number;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
  ) {}

  async findAll(): Promise<AdminUserRow[]> {
    const users = await this.userRepo.find({ order: { createdAt: 'DESC' } });
    if (users.length === 0) return [];

    // One grouped query for booking counts across every user, rather
    // than N+1 queries per row.
    const counts = await this.bookingRepo
      .createQueryBuilder('booking')
      .select('booking.userId', 'userId')
      .addSelect('COUNT(*)', 'count')
      .where('booking.userId IS NOT NULL')
      .groupBy('booking.userId')
      .getRawMany<{ userId: string; count: string }>();

    const countByUserId = new Map(counts.map((c) => [c.userId, Number(c.count)]));

    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt,
      bookingCount: countByUserId.get(u.id) ?? 0,
    }));
  }

  private async findOneOrThrow(id: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User #${id} not found`);
    return user;
  }

  async ban(id: string): Promise<User> {
    const user = await this.findOneOrThrow(id);
    if (user.role === 'admin') {
      throw new ForbiddenException('Admin accounts cannot be banned');
    }
    user.isActive = false;
    return this.userRepo.save(user);
  }

  async unban(id: string): Promise<User> {
    const user = await this.findOneOrThrow(id);
    user.isActive = true;
    return this.userRepo.save(user);
  }
}
