import { Injectable, Logger } from '@nestjs/common';
import { GeocodingService } from '../google/geocoding.service';
import { GoongService } from './goong.service';

export interface GeocodingProvider {
    name: 'google' | 'goong';
    priority: number;
}

export interface UnifiedGeocodingResult {
    latitude: number;
    longitude: number;
    formattedAddress: string;
    provider: string;
    placeId?: string;
    addressComponents?: any;
}

@Injectable()
export class GeocodingWrapperService {
    private readonly logger = new Logger(GeocodingWrapperService.name);
    private readonly providers: GeocodingProvider[] = [
        { name: 'goong', priority: 1 }, // Ưu tiên GoongAPI cho Việt Nam
        { name: 'google', priority: 2 },
    ];

    constructor(
        private readonly googleGeocodingService: GeocodingService,
        private readonly goongService: GoongService,
    ) { }

    /**
     * Kiểm tra trạng thái của tất cả providers
     */
    /*
    async checkProvidersStatus(): Promise<{
        google: boolean;
        goong: boolean;
    }> {
        const status = {
            google: false,
            goong: false,
        };

        try {
            // Kiểm tra Google Maps API
            const googleResult = await this.googleGeocodingService.getCoordinatesFromAddress('Hanoi, Vietnam');
            status.google = googleResult !== null;
        } catch (error) {
            this.logger.warn('Google Maps API check failed');
        }

        try {
            // Kiểm tra GoongAPI
            status.goong = await this.goongService.validateApiKey();
        } catch (error) {
            this.logger.warn('GoongAPI check failed');
        }

        this.logger.log(`Provider status: Google=${status.google}, Goong=${status.goong}`);
        return status;
    }
    */

    /**
     * So sánh kết quả từ cả hai providers
     */
    /*
    async compareProviders(
        address: string,
        district?: string,
        ward?: string,
        city?: string,
        province?: string
    ): Promise<{
        google?: UnifiedGeocodingResult;
        goong?: UnifiedGeocodingResult;
        differences?: {
            latitudeDiff: number;
            longitudeDiff: number;
            addressSimilarity: number;
        };
    }> {
        const results: any = {};

        try {
            const googleResult = await this.googleGeocodingService.getCoordinatesFromAddress(
                address, district, ward, city, province
            );
            if (googleResult) {
                results.google = {
                    latitude: googleResult.latitude,
                    longitude: googleResult.longitude,
                    formattedAddress: googleResult.formattedAddress,
                    provider: 'google',
                };
            }
        } catch (error) {
            this.logger.warn('Google geocoding failed in comparison');
        }

        try {
            const goongResult = await this.goongService.getCoordinatesFromAddress(
                address, district, ward, city
            );
            if (goongResult) {
                results.goong = {
                    latitude: goongResult.latitude,
                    longitude: goongResult.longitude,
                    formattedAddress: goongResult.formattedAddress,
                    provider: 'goong',
                };
            }
        } catch (error) {
            this.logger.warn('Goong geocoding failed in comparison');
        }

        // Tính toán sự khác biệt nếu có cả hai kết quả
        if (results.google && results.goong) {
            const latDiff = Math.abs(results.google.latitude - results.goong.latitude);
            const lngDiff = Math.abs(results.google.longitude - results.goong.longitude);
            const addressSimilarity = this.calculateStringSimilarity(
                results.google.formattedAddress,
                results.goong.formattedAddress
            );

            results.differences = {
                latitudeDiff: latDiff,
                longitudeDiff: lngDiff,
                addressSimilarity: addressSimilarity,
            };
        }

        return results;
    }
    */

    /**
     * Tính độ tương đồng giữa hai chuỗi
     */
    /*
    private calculateStringSimilarity(str1: string, str2: string): number {
        if (!str1 || !str2) return 0;
        
        const s1 = str1.toLowerCase();
        const s2 = str2.toLowerCase();
        
        if (s1 === s2) return 1;
        
        const longer = s1.length > s2.length ? s1 : s2;
        const shorter = s1.length > s2.length ? s2 : s1;
        
        if (longer.length === 0) return 1;
        
        return (longer.length - this.editDistance(longer, shorter)) / longer.length;
    }
    
    private editDistance(s1: string, s2: string): number {
        s1 = s1.toLowerCase();
        s2 = s2.toLowerCase();
        
        const costs = [];
        for (let i = 0; i <= s1.length; i++) {
            let lastValue = i;
            for (let j = 0; j <= s2.length; j++) {
                if (i === 0) {
                    costs[j] = j;
                } else if (j > 0) {
                    let newValue = costs[j - 1];
                    if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
                        newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                    }
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }
            if (i > 0) {
                costs[s2.length] = lastValue;
            }
        }
        return costs[s2.length];
    }
    */
} 