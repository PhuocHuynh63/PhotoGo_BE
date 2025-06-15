import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLocationWorkingDateDto {
    @ApiProperty({
        description: 'Ngày làm việc',
        example: '01/01/2025',
        required: true,
    })
    @IsString()
    @IsNotEmpty()
    @Matches(/^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/, {
        message: 'Date must be in DD/MM/YYYY format'
    })
    date: string;
}    