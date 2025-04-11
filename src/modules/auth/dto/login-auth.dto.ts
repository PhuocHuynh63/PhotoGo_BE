import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsEmail } from 'class-validator';

export class LoginAuthDto {
    @IsNotEmpty({ message: 'Email is required' })
    @IsEmail({}, { message: 'Email must be valid' })
    @ApiProperty({
        example: 'admin@example.com',
        description: 'Email address of the user',
    })
    email: string;


    @IsNotEmpty({ message: 'Password is required' })
    @ApiProperty({
        example: '123456',
        description: 'Password for the user',
    })
    password: string;

}