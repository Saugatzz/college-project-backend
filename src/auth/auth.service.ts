// src/auth/auth.service.ts
import {
  Injectable, ConflictException,
  UnauthorizedException, NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User, UserRole } from 'src/entities/user.entity';
import { EmailVerificationService } from 'src/email-verification/email-verification.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private emailVerificationService: EmailVerificationService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.userRepository.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already in use');

    // Same proof-of-ownership requirement as booking checkout: an
    // account can only be created for an email the person actually
    // controls. Throws if the token is missing/expired/doesn't match.
    this.emailVerificationService.assertVerified(dto.email, dto.emailVerificationToken);

    const user = this.userRepository.create({
      name: dto.name,
      email: dto.email,
      password: dto.password,
      emailVerified: true,
      preferredCategories: (dto.preferredCategories ?? []).map((c) => c.trim().toLowerCase()).filter(Boolean),
    });
    await this.userRepository.save(user);

    return this.signToken(user);
  }

  async login(dto: LoginDto) {
    // explicitly select password (it's hidden by default via select: false)
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email: dto.email })
      .getOne();

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isMatch = await user.validatePassword(dto.password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    if (!user.isActive) throw new UnauthorizedException('Account is disabled');

    // Admins are completely forbidden from the user-facing login — the
    // account dashboard, checkout modal, etc. This check runs regardless
    // of password correctness having already passed, and regardless of
    // isActive, so an admin can never end up with a user-side session no
    // matter which form submitted the request.
    if (dto.audience === 'user' && user.role === UserRole.ADMIN) {
      throw new ForbiddenException('Admin accounts cannot sign in here.');
    }

    // Symmetrically, only admins may use the admin dashboard login.
    if (dto.audience === 'admin' && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('This account does not have admin access.');
    }

    return this.signToken(user);
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private signToken(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}