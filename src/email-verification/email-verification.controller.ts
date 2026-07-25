// src/bookings/email-verification.controller.ts
import { Body, Controller, Post } from '@nestjs/common';
import { IsEmail, IsString, Length } from 'class-validator';
import { EmailVerificationService } from './email-verification.service';

class SendCodeDto {
  @IsEmail()
  email: string;
}

class VerifyCodeDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 6)
  code: string;
}

// Mounted under /bookings/email so it groups naturally with the rest of the
// booking flow in your API — POST /bookings/email/send-code, POST /bookings/email/verify-code
@Controller('bookings/email')
export class EmailVerificationController {
  constructor(private readonly emailVerificationService: EmailVerificationService) {}

  @Post('send-code')
  async sendCode(@Body() dto: SendCodeDto) {
    await this.emailVerificationService.sendCode(dto.email);
    return { sent: true };
  }

  @Post('verify-code')
  verifyCode(@Body() dto: VerifyCodeDto) {
    const token = this.emailVerificationService.verifyCode(dto.email, dto.code);
    return { verified: true, token };
  }
}