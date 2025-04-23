import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FindChatDto {
    @ApiProperty({
        description: 'UUID of the chat partner',
        example: '7232321e-1cb2-4cc0-b0ef-d775a49ffeee',
    })
    @IsUUID()
    partnerId: string;
}