import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class UpdateUserDto {
    @IsOptional()
    @IsEmail()
    @ApiProperty({
        example: 'user@example.com',
        description: 'User email address',
    })
    email?: string;

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

    @IsOptional()
    @IsString()
    @Length(6, 50)
    @ApiProperty({
        example: 'newpassword123',
        description: 'Confirm New password for the user',
        minLength: 6,
        maxLength: 50,
    })
    confirmPassword?: string; // confirm mật khẩu mới

    @IsOptional()
    @IsString()
    @ApiProperty({
        example: 'oldpassword123',
        description: 'Old password for verification',
    })
    oldPasswordHash?: string; // Mật khẩu cũ để so sánh

    @IsOptional()
    @IsString()
    @ApiProperty({
        example: 'John Doe',
        description: 'Full name of the user',
    })
    fullName?: string;

    @IsOptional()
    @IsString()
    @ApiProperty({
        example: '0986056438',
        description: 'User phone number',
    })
    phoneNumber?: string;

}