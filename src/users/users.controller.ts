import { Controller, Get, Patch, Param, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.gurds';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/entities/user.entity';

// Admin-only: manage registered user accounts. Guest bookings (no
// account) never show up here — see the existing "Customers" page for
// those. This is specifically for people who created a login.
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Patch(':id/ban')
  ban(@Param('id') id: string) {
    return this.usersService.ban(id);
  }

  @Patch(':id/unban')
  unban(@Param('id') id: string) {
    return this.usersService.unban(id);
  }
}
