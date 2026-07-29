import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { Booking } from 'src/entities/booking.entity';
import { BookingAddon } from 'src/entities/booking-addon.entity';
import { MailModule } from 'src/mail/mail.module';
import { EmailVerificationModule } from 'src/email-verification/email-verification.module';
import { CardPaymentVerificationService } from 'src/payments/card-payment-verification.service';
import { InteractionsModule } from 'src/interactions/interactions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, BookingAddon]),
    MailModule,
    InteractionsModule,
    // Previously this module also directly provided/declared
    // EmailVerificationService + EmailVerificationController itself,
    // which duplicated the exact same controller/service already
    // registered by EmailVerificationModule (imported separately in
    // AppModule) — routes were being mounted twice. Importing the
    // module instead gives BookingsService the shared service instance
    // without re-declaring the controller.
    EmailVerificationModule,
  ],
  providers: [BookingsService, CardPaymentVerificationService],
  controllers: [BookingsController],
})
export class BookingsModule {}
