import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { CardPaymentVerificationService } from './card-payment-verification.service';
import { SavedCardsService } from './saved-cards.service';
import { SavedCard } from 'src/entities/saved-card.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SavedCard])],
  controllers: [PaymentsController],
  providers: [PaymentsService, CardPaymentVerificationService, SavedCardsService],
  exports: [CardPaymentVerificationService], // BookingsModule needs this to verify tokens
})
export class PaymentsModule {}
