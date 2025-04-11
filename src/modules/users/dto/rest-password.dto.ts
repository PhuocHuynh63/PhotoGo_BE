import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class ResetPasswordDto {
    @IsOptional()
    @IsString()
    @ApiProperty({
        example: '123456',
        description: 'Verification code sent to the user',
    })
    otp?: string;

    @IsOptional()
    @IsString()
    @Length(6, 50)
    @ApiProperty({
        example: 'newpassword123',
        description: 'New password for the user',
        minLength: 6,
        maxLength: 50,
    })
    passwordHash?: string; // Mật khẩu mới

}