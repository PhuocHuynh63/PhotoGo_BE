import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class UpdateUserDto {
    @IsOptional()
    @IsEmail()
    @ApiProperty({
        example: 'user@example.com',
        description: 'Địa chỉ email của người dùng',
    })
    email?: string;

    @IsOptional()
    @IsString()
    @Length(6, 50)
    @ApiProperty({
        example: 'newpassword123',
        description: 'Mật khẩu mới cho người dùng',
        minLength: 6,
        maxLength: 50,
    })
    password?: string; // Mật khẩu mới

    @IsOptional()
    @IsString()
    @Length(6, 50)
    @ApiProperty({
        example: 'newpassword123',
        description: 'Xác nhận mật khẩu mới cho người dùng',
        minLength: 6,
        maxLength: 50,
    })
    confirmPassword?: string; // confirm mật khẩu mới

    @IsOptional()
    @IsString()
    @ApiProperty({
        example: 'oldpassword123',
        description: 'Mật khẩu cũ để xác thực',
    })
    oldPasswordHash?: string; // Mật khẩu cũ để so sánh

    @IsOptional()
    @IsString()
    @ApiProperty({
        example: 'John Doe',
        description: 'Tên đầy đủ của người dùng',
    })
    fullName?: string;

    @IsOptional()
    @IsString()
    @ApiProperty({
        example: '0986056438',
        description: 'Số điện thoại của người dùng',
    })
    phoneNumber?: string;

    @IsOptional()
    @ApiProperty({
        example: 1.5,
        description: 'Hệ số nhân cho điểm thưởng',
        required: false,
        type: Number,
    })
    multiplier?: number;

}