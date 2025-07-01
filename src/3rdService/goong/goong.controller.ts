import { Controller, Get, Query, Post, Body, Logger } from '@nestjs/common';
import { GoongService, GoongCompleteAddressResult } from './goong.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@Controller('goong')
@ApiTags('Goong')
@ApiBearerAuth('access-token')
export class GoongController {
    private readonly logger = new Logger(GoongController.name);

    constructor(private readonly goongService: GoongService) {}

    /**
     * Lấy địa chỉ hoàn chỉnh từ địa chỉ đầu vào
     */
    @Get('complete-address')
    async getCompleteAddress(
        @Query('address') address: string,
        @Query('district') district?: string,
        @Query('ward') ward?: string,
        @Query('city') city?: string,
        @Query('province') province?: string,
    ): Promise<GoongCompleteAddressResult | null> {
        this.logger.log(`Getting complete address for: ${address}`);
        return await this.goongService.getCompleteAddressFromInput(
            address,
            district,
            ward,
            city,
            province
        );
    }

    /**
     * Lấy địa chỉ hoàn chỉnh từ tọa độ
     */
    @Get('complete-address-from-coordinates')
    async getCompleteAddressFromCoordinates(
        @Query('lat') lat: number,
        @Query('lng') lng: number,
    ): Promise<GoongCompleteAddressResult | null> {
        this.logger.log(`Getting complete address for coordinates: ${lat}, ${lng}`);
        return await this.goongService.getCompleteAddressFromCoordinates(lat, lng);
    }

    /**
     * Demo endpoint để test địa chỉ hoàn chỉnh
     */
    @Post('demo-complete-address')
    async demoCompleteAddress(): Promise<{ message: string }> {
        this.logger.log('Running demo complete address');
        await this.goongService.demoCompleteAddress();
        return { message: 'Demo completed. Check logs for details.' };
    }

    /**
     * Test API key
     */
    @Get('test-api-key')
    async testApiKey(): Promise<{ isValid: boolean; message: string }> {
        const isValid = await this.goongService.validateApiKey();
        return {
            isValid,
            message: isValid ? 'API key is valid' : 'API key is invalid or missing'
        };
    }

    /**
     * Debug endpoint để xem response chi tiết từ Goong API
     */
    @Get('debug-address')
    async debugAddress(
        @Query('address') address: string,
        @Query('district') district?: string,
        @Query('ward') ward?: string,
        @Query('city') city?: string,
        @Query('province') province?: string,
    ): Promise<any> {
        this.logger.log(`Debug address: ${address}, ${district}, ${ward}, ${city}, ${province}`);
        
        try {
            const result = await this.goongService.getCompleteAddressFromInput(
                address,
                district,
                ward,
                city,
                province
            );
            
            return {
                success: true,
                result,
                debug: {
                    input: { address, district, ward, city, province },
                    timestamp: new Date().toISOString()
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                debug: {
                    input: { address, district, ward, city, province },
                    timestamp: new Date().toISOString()
                }
            };
        }
    }

    /**
     * Geocoding cơ bản
     */
    /*
    @Get('geocode')
    async geocode(
        @Query('address') address: string,
        @Query('district') district?: string,
        @Query('ward') ward?: string,
        @Query('city') city?: string,
        @Query('province') province?: string,
    ) {
        return await this.goongService.getCoordinatesFromAddress(
            address,
            district,
            ward,
            city,
            province
        );
    }
    */

    /**
     * Reverse geocoding cơ bản
     */
    /*
    @Get('reverse-geocode')
    async reverseGeocode(
        @Query('lat') lat: number,
        @Query('lng') lng: number,
    ) {
        return await this.goongService.getAddressFromCoordinates(lat, lng);
    }
    */
} 