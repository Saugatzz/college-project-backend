import {
  IsString,
  IsNumber,
  IsOptional,
  IsIn,
  IsEmail,
  Min,
  IsArray,
  ValidateNested,
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
}

export class UpdateBookingStatusDto {
  @IsIn(['pending', 'confirmed', 'cancelled'])
  status: 'pending' | 'confirmed' | 'cancelled';
}