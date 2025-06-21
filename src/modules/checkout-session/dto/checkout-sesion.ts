import {
    IsUUID,
    IsNotEmpty,
    IsNumber,
    IsString,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export class VendorDetailsDto {
    @ApiProperty({
        description: 'ID của nhà cung cấp',
        example: 'vendor-123',
    })
    @IsUUID()
    @IsNotEmpty()
    id: string;

    @ApiProperty({
        description: 'Tên của nhà cung cấp',
        example: 'Studio ABC',
    })
    @IsString()
    @IsNotEmpty()
    name: string;
}

export class LocationDetailsDto {
    @ApiProperty({
        description: 'ID của địa điểm',
        example: 'location-456',
    })
    @IsUUID()
    @IsNotEmpty()
    id: string;

    @ApiProperty({
        description: 'Địa chỉ của địa điểm',
        example: '123 Main Street, Ho Chi Minh City',
    })
    @IsString()
    @IsNotEmpty()
    address: string;
}

export class ConceptDto {
    @ApiProperty({
        description: 'ID của khái niệm',
        example: 'concept-789',
    })
    @IsUUID()
    @IsNotEmpty()
    id: string;

    @ApiProperty({
        description: 'Tên của khái niệm',
        example: 'Wedding Photography',
    })
    @IsString()
    @IsNotEmpty()
    name: string;
}

export class BookingDetailsDto {
    @ApiProperty({
        description: 'ID của ngày làm việc',
        example: 'working-date-123',
    })
    @IsUUID()
    @IsNotEmpty()
    working_date_id: string;

    @ApiProperty({
        description: 'ID của thời gian làm việc',
        example: 'slot-time-456',
    })
    @IsUUID()
    @IsNotEmpty()
    slot_time_id: string;

    @ApiProperty({
        description: 'Ngày làm việc',
        example: '30/04/2024',
    })
    @IsString()
    @IsNotEmpty()
    date: string; // Format: "30/04/1975"

    @ApiProperty({
        description: 'Thời gian làm việc',
        example: '10:00',
    })
    @IsString()
    @IsNotEmpty()
    time: string; // Format: "10:00"

    @ApiProperty({
        description: 'Thời lượng làm việc',
        example: 60,
    })
    @IsNumber()
    @IsNotEmpty()
    duration: number; // in minutes
}

export class CreateCheckoutSessionDto {
    @ApiProperty({
        description: 'Giá của gói dịch vụ',
        example: 150000,
    })
    @ApiProperty({
        description: 'Giá của gói dịch vụ',
        example: 150000,
    })
    @IsNumber()
    @IsNotEmpty()
    price: number;

    @ApiProperty({
        description: 'Chi tiết nhà cung cấp',
        example: { id: 'vendor-123', name: 'Studio ABC' },
    })
    @ValidateNested()
    @Type(() => VendorDetailsDto)
    @IsNotEmpty()
    vendorDetails: VendorDetailsDto;

    @ApiProperty({
        description: 'Chi tiết địa điểm',
        example: { id: 'location-456', address: '123 Main Street, Ho Chi Minh City' },
    })
    @ValidateNested()
    @Type(() => LocationDetailsDto)
    @IsNotEmpty()
    locationDetails: LocationDetailsDto;

    @ApiProperty({
        description: 'Chi tiết khái niệm',
        example: { id: 'concept-789', name: 'Wedding Photography' },
    })
    @IsUUID()
    @IsNotEmpty()
    conceptId: string;

    @ApiProperty({
        description: 'Chi tiết ngày làm việc',
        example: { working_date_id: 'working-date-123', slot_time_id: 'slot-time-456', date: '30/04/2024', time: '10:00', duration: 60 },
    })
    @ValidateNested()
    @Type(() => BookingDetailsDto)
    @IsNotEmpty()
    bookingDetails: BookingDetailsDto;
}

export class CheckoutSessionDto extends CreateCheckoutSessionDto {
    @ApiProperty({
        description: 'ID của phiên đặt chỗ',
        example: 'checkout-session-123',
    })
    @IsUUID()
    @IsNotEmpty()
    checkoutSessionId: string;

    @ApiProperty({
        description: 'ID của người dùng',
        example: 'user-123',
    })
    @IsUUID()
    @IsNotEmpty()
    userId: string;
}

export class UpdateCheckoutSessionDto extends PartialType(
    CreateCheckoutSessionDto,
) { }