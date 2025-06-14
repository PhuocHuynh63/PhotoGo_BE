import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";

export class UpdateCampaignStatusDto {
    @ApiProperty({
        description: 'Trạng thái của campaign',
        type: Boolean,
        example: true,
        required: true,
    })
    @IsBoolean()
    @IsOptional()
    status: boolean;
}

export class UpdateUserCampaignStatusDto {
    @ApiProperty({
        description: 'Trạng thái của user campaign',
        type: Boolean,
        example: true,
        required: true,
    })
    @IsBoolean()
    @IsOptional()
    status: boolean;
}

export class CampaignVoucherStatusDto {
    @ApiProperty({
        description: 'Trạng thái của campaign voucher',
        type: Boolean,
        example: true,
        required: true,
    })
    @IsBoolean()
    @IsOptional()
    status: boolean;
}