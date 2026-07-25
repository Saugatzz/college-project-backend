import {
  IsString,
  IsNumber,
  IsOptional,
  IsIn,
  IsEmail,
  Min,
  IsArray,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BookingAddonDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;
}

export class CreateBookingDto {
  @IsNumber()
  tourId: number;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsNumber()
  @Min(1)
  travelers: number;

  @IsOptional()
  @IsString()
  departureDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsIn(['Khalti', 'eSewa', 'Card'])
  paymentMethod: 'Khalti' | 'eSewa' | 'Card';

  @IsNumber()
  @Min(0)
  tourPrice: number;

  @IsNumber()
  @Min(0)
  addonsTotal: number;

  @IsNumber()
  @Min(0)
  totalAmount: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingAddonDto)
  selectedAddons?: BookingAddonDto[];

  // ── Contact preference ──────────────────────────────────────
  @IsOptional()
  @IsIn(['email', 'whatsapp'])
  contactMethod?: 'email' | 'whatsapp';

  @IsOptional()
  @IsString()
  contactValue?: string;

  // ── Email verification ──────────────────────────────────────
  @IsString()
  emailVerificationToken: string;

  // ── Card payment verification ───────────────────────────────
  // Signed token returned by POST /payments/card/charge. Required when
  // paymentMethod is 'Card'. BookingsService verifies this
  // cryptographically (CardPaymentVerificationService) rather than
  // trusting any transactionId/last4 sent directly — so a booking can
  // never be created for a card that wasn't actually "charged" through
  // the charge endpoint.
  @ValidateIf((o) => o.paymentMethod === 'Card')
  @IsString()
  cardPaymentToken?: string;
}

export class UpdateBookingStatusDto {
  @IsIn(['pending', 'confirmed', 'cancelled'])
  status: 'pending' | 'confirmed' | 'cancelled';
}