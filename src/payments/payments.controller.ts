import { Body, Controller, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { ChargeCardDto } from './dto/charge-card.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // Test-mode card charge. Returns a signed token proving a real charge
  // attempt succeeded — the frontend must obtain this token and pass it
  // as cardPaymentToken when creating a Card booking. BookingsService
  // re-verifies the token server-side; it never trusts raw fields sent
  // directly by the client.
  @Post('card/charge')
  chargeCard(@Body() dto: ChargeCardDto) {
    return this.paymentsService.chargeCard(dto);
  }
}