import { IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { UserRoles } from 'src/constants/user.enum';


export class CreateAuthDto {
  @IsNotEmpty({ message: 'name is required' })
  name: string;

  avatar: string;

  @IsNotEmpty({ message: 'email is required' })
  email: string;

  @IsNotEmpty({ message: 'otp is required' })
  otp: string;

  @IsNotEmpty({ message: 'password is required' })
  password: string;

  @IsNotEmpty({ message: 'phone is required' })
  phone: string;


  @IsOptional()
  role: UserRoles;

  @IsOptional()
  status: string;
}