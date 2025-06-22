import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsOptional, IsArray, IsUUID } from "class-validator";

export class CreateUserCampaignDto {
    @ApiProperty({
        description: 'Trạng thái khả dụng của user trong campaign',
        example: true,
        default: true,
      })
    @IsBoolean()
    @IsOptional()
    isAvailable?: boolean = true;
}

export class CreateMultipleUserCampaignDto {
    @ApiProperty({
        description: 'Danh sách ID của các user',
        type: [String],
        example: ['123e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174001']
    })
    @IsArray({ message: 'Danh sách user phải là một mảng' })
    @IsOptional()
    @Transform(({ value }) => {
      if (typeof value === 'string') {
        return value.split(',').map(id => id.trim());
      }
      return value;
    })
    @IsUUID('4', { each: true, message: 'ID user không hợp lệ' })
    userIds: string[];
}