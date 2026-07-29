import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { PaymentsService } from './payments.service';
import { SavedCardsService } from './saved-cards.service';
import { ChargeCardDto, ChargeSavedCardDto } from './dto/charge-card.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.gurds';
import { OptionalJwtAuthGuard } from 'src/auth/guards/optional-jwt-auth.guard';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly savedCardsService: SavedCardsService,
  ) {}

  // Test-mode card charge. Returns a signed token proving a real charge
  // attempt succeeded — the frontend must obtain this token and pass it
  // as cardPaymentToken when creating a Card booking. BookingsService
  // re-verifies the token server-side; it never trusts raw fields sent
  // directly by the client. Guests can still pay by card
  // (OptionalJwtAuthGuard never blocks the request) — but "save this
  // card" only takes effect for a logged-in requester.
  @Post('card/charge')
  @UseGuards(OptionalJwtAuthGuard)
  chargeCard(@Body() dto: ChargeCardDto, @Req() req: Request) {
    const user = req.user as any;
    return this.paymentsService.chargeCard(dto, user?.id ?? null);
  }

  // A logged-in user's saved cards — display fields only (brand, last4,
  // expiry). The encrypted full number never leaves the backend.
  @Get('cards/me')
  @UseGuards(JwtAuthGuard)
  listSavedCards(@Req() req: Request) {
    const user = req.user as any;
    return this.savedCardsService.listForUser(user.id);
  }

  @Delete('cards/:id')
  @UseGuards(JwtAuthGuard)
  removeSavedCard(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as any;
    return this.savedCardsService.remove(user.id, id).then(() => ({ ok: true }));
  }

  // Charges a previously-saved card. Still requires the CVV (never
  // stored) — same security expectation as any real saved-card checkout.
  @Post('cards/:id/charge')
  @UseGuards(JwtAuthGuard)
  chargeSavedCard(
    @Param('id') id: string,
    @Body() dto: ChargeSavedCardDto,
    @Req() req: Request,
  ) {
    const user = req.user as any;
    return this.paymentsService.chargeSavedCard(user.id, id, dto.amount);
  }
}
