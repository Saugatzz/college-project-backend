// src/auth/dto/register.dto.ts
import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsArray, Matches } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsEmail()
  email: string;

  // Mirrors the checklist shown on the signup page — never trust
  // client-side validation alone. At least 8 characters, one uppercase,
  // one lowercase, one number, and one special (non-alphanumeric)
  // character.
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
  @Matches(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
  @Matches(/[0-9]/, { message: 'Password must contain at least one number' })
  @Matches(/[^A-Za-z0-9]/, { message: 'Password must contain at least one special character' })
  password: string;

  // Proof that this email address was actually verified via the same
  // send-code/verify-code OTP flow used at checkout (POST
  // /bookings/email/send-code, /bookings/email/verify-code). Required —
  // an account can only ever be created for an email its owner proved
  // they control, which is what lets logged-in bookings skip
  // re-verifying email at checkout.
  @IsString()
  emailVerificationToken: string;

  // Tour categories picked during signup (e.g. ['trek', 'cultural']) —
  // seeds personalized recommendations before any real interaction
  // history exists. Optional; omit or send an empty array if the person
  // skips this step.
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredCategories?: string[];
}
