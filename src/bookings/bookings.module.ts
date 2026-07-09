import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { Booking } from 'src/entities/booking.entity';
import { BookingAddon } from 'src/entities/booking-addon.entity';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [TypeOrmModule.forFeature([Booking, BookingAddon]), MailModule],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}