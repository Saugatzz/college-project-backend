import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { CardPaymentVerificationService } from './card-payment-verification.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, CardPaymentVerificationService],
  exports: [CardPaymentVerificationService], // BookingsModule needs this to verify tokens
})
export class PaymentsModule {}