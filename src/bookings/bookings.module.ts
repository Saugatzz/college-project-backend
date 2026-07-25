import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { Booking } from 'src/entities/booking.entity';
import { BookingAddon } from 'src/entities/booking-addon.entity';
import { MailModule } from 'src/mail/mail.module';
import { EmailVerificationController } from 'src/email-verification/email-verification.controller';
import { EmailVerificationService } from 'src/email-verification/email-verification.service';
import { CardPaymentVerificationService } from 'src/payments/card-payment-verification.service';

@Module({
  imports: [TypeOrmModule.forFeature([Booking, BookingAddon]), MailModule],
  providers: [BookingsService, EmailVerificationService, CardPaymentVerificationService],
  controllers: [BookingsController, EmailVerificationController],
})
export class BookingsModule {}