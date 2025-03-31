import { IsNotEmpty, IsEmail } from 'class-validator';

export class LoginAuthDto {
    @IsNotEmpty({ message: 'Email is required' })
    @IsEmail({}, { message: 'Email must be valid' })
    email: string;

    @IsNotEmpty({ message: 'Password is required' })
    password: string;

}