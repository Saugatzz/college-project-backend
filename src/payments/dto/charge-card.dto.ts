import { IsString, IsNumber, Min, Matches } from 'class-validator';

export class ChargeCardDto {
  @IsString()
  @Matches(/^[\d\s]{13,23}$/, { message: 'Card number must be 13-19 digits' })
  cardNumber: string;

  @IsString()
  @Matches(/^(0[1-9]|1[0-2])\/\d{2}$/, { message: 'Expiry must be MM/YY' })
  expiry: string;

  @IsString()
  @Matches(/^\d{3,4}$/, { message: 'CVV must be 3-4 digits' })
  cvv: string;

  @IsNumber()
  @Min(0.01)
  amount: number;
}