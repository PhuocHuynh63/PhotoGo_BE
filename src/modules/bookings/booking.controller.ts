import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { Booking } from './entities/booking.entity';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiExtraModels } from '@nestjs/swagger/dist/decorators/api-extra-models.decorator';
import { BookingDepositType, BookingSourceType, BookingStatus } from 'src/constants/booking.enum';
import e from 'express';

@Controller('bookings')
@ApiExtraModels(CreateBookingDto)
@ApiTags('Booking')
@ApiBearerAuth('access-token')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new booking' })
  @ApiBody({ type: CreateBookingDto })
  @ApiResponse({ status: 201, description: 'Booking created successfully', type: Booking })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  create(@Body() createBookingDto: CreateBookingDto,
         @Query('userId') userId: string,
         @Query('servicePackageId') servicePackageId: string): Promise<Booking> {
    return this.bookingService.create(createBookingDto, userId, servicePackageId);
  }

  @Get()
  @ApiResponse({ status: 200, description: 'List of all bookings', type: [Booking] })
  @ApiResponse({ status: 404, description: 'No bookings found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiOperation({ summary: 'Get all bookings' })
  findAll(): Promise<Booking[]> {
    return this.bookingService.findAll();
  }

  @Get(':id')
  @ApiResponse({ status: 200, description: 'Booking found', type: Booking })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiOperation({ summary: 'Get a booking by ID' })
  findOne(@Param('id') id: string): Promise<Booking> {
    return this.bookingService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBookingDto: UpdateBookingDto): Promise<Booking> {
    return this.bookingService.update(id, updateBookingDto);
  }
  
  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.bookingService.remove(id);
  }
}