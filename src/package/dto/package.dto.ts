// src/packages/dto/package.dto.ts
import { Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsNumber, IsOptional,
  IsString, Min, ValidateNested,
} from 'class-validator';

export class ItineraryDto {
  @IsNumber() dayNumber: number;
  @IsString() title: string;
  @IsString() description: string;
}

export class HighlightDto {
  @IsString() icon: string;
  @IsString() title: string;
  @IsString() desc: string;
}

export class InclusionDto {
  @IsString() text: string;
  @IsBoolean() included: boolean;
}

export class AddonDto {
  @IsString() name: string;
  @IsString() desc: string;
  @IsNumber() price: number;
}

export class ImageDto {
  @IsString() src: string;
  @IsString() alt: string;
  @IsOptional() @IsNumber() sortOrder?: number;
}

export class CreatePackageDto {
  @IsString() name: string;                          // was: title
  @IsString() description: string;
  @IsNumber() @Min(0) price: number;                 // was: basePrice
  @IsNumber() @Min(1) days: number;                  // was: durationDays
  @IsString() location: string;

  @IsOptional() @IsString() difficulty?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsNumber() rating?: number;
  @IsOptional() @IsString() image?: string;          
  @IsOptional() @IsString() badge?: string;
  @IsOptional() @IsString() tagline?: string;
  @IsOptional() @IsNumber() reviewCount?: number;

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ItineraryDto)
  itineraries?: ItineraryDto[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => HighlightDto)
  highlights?: HighlightDto[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => InclusionDto)
  inclusions?: InclusionDto[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => AddonDto)
  addons?: AddonDto[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ImageDto)
  images?: ImageDto[];
}