import { IsNotEmpty, IsString, IsEmail } from 'class-validator';

export class GoogleAuthDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsString()
  avatar: string;
}