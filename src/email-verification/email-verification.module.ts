import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { EmailVerificationController } from './email-verification.controller';
import { EmailVerificationService } from './email-verification.service';

@Module({
  imports: [MailModule],
  controllers: [EmailVerificationController],
  providers: [EmailVerificationService],
  exports: [EmailVerificationService], // so BookingsModule can inject it too
})
export class EmailVerificationModule {}