
import { IsEmail, IsString, IsOptional, IsIn } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  // Which login surface this request came from. The admin dashboard
  // login never sends this (so it keeps working exactly as before) —
  // only the user-facing login modal sends 'user', which is what lets
  // AuthService reject admin accounts trying to sign in there.
  @IsOptional()
  @IsIn(['user', 'admin'])
  audience?: 'user' | 'admin';
}