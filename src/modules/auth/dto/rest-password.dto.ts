import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsEmail } from 'class-validator';

export class RestPasswordhDto {
    @IsNotEmpty({ message: 'OTP is required' })
    @ApiProperty({
        example: '123456',
        description: 'One Time Password (OTP) for verification',
    })
    otp: string;

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

    @IsNotEmpty({ message: 'Confirm password is required' })
    @ApiProperty({
        example: '123456',
        description: 'Confirm password for the user',
    })
    confirmPassword: string;
}