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
  notes?: string;

  @IsIn(['Khalti', 'eSewa', 'Card'])
  paymentMethod: 'Khalti' | 'eSewa' | 'Card';

  @IsNumber()
  @Min(0)
  tourPrice: number;

  @IsNumber()
  @Min(0)
  addonsTotal: number;

  // Surcharge for guaranteeing a guide on an exact preferred date. Should
  // be 0 or omitted when dateFlexibility is 'flexible' — the service
  // layer zeroes it out regardless, so this is mainly a safety net for
  // clients that compute it themselves.
  @IsOptional()
  @IsNumber()
  @Min(0)
  dateSurcharge?: number;

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

  // ── Preferred start timing ──────────────────────────────────
  // Required when dateFlexibility is 'exact' or 'flexible' respectively
  // (checkout always sends a value, but we don't hard-fail bookings
  // created without one so older/other clients aren't broken).
  @IsOptional()
  @IsString()
  preferredDate?: string;

  @IsOptional()
  @IsIn(['exact', 'flexible'])
  dateFlexibility?: 'exact' | 'flexible';

  @ValidateIf((o) => o.dateFlexibility === 'flexible')
  @IsString()
  flexibilityWindow?: string;

  @IsOptional()
  @IsString()
  dateNotes?: string;

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

// Admin-only: records progress coordinating with local guides for the
// customer's requested window. A guide is always eventually assigned —
// there is no "unable to accommodate" outcome. Exact-date bookings are
// guaranteed a guide via the paid dateSurcharge; flexible bookings are
// worked until a concrete departure date is confirmed within the
// customer's window.
//
// When the status is 'guides_confirmed' and a confirmedDepartureDate is
// supplied, that date is written to Booking.departureDate as the
// locked-in departure.
export class UpdateGuideCoordinationDto {
  @IsIn(['pending_contact', 'contacting_guides', 'guides_confirmed'])
  guideCoordinationStatus:
    | 'pending_contact'
    | 'contacting_guides'
    | 'guides_confirmed';

  @ValidateIf((o) => o.confirmedDepartureDate !== undefined && o.confirmedDepartureDate !== null)
  @IsString()
  confirmedDepartureDate?: string;
}