import { Injectable, Logger } from '@nestjs/common';
import { GeocodingService } from '../google/geocoding.service';
import { GoongService, GoongGeocodingResult } from './goong.service';

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
     * Geocoding với fallback tự động
     */
    async getCoordinatesFromAddress(
        address: string,
        district?: string,
        ward?: string,
        city?: string,
        province?: string,
        preferredProvider?: 'google' | 'goong'
    ): Promise<UnifiedGeocodingResult | null> {
        // Sắp xếp providers theo thứ tự ưu tiên
        const sortedProviders = [...this.providers].sort((a, b) => a.priority - b.priority);

        // Nếu có provider ưu tiên, đưa lên đầu
        if (preferredProvider) {
            const preferred = sortedProviders.find(p => p.name === preferredProvider);
            if (preferred) {
                sortedProviders.splice(sortedProviders.indexOf(preferred), 1);
                sortedProviders.unshift(preferred);
            }
        }

        // Thử từng provider theo thứ tự ưu tiên
        for (const provider of sortedProviders) {
            try {
                this.logger.log(`Trying ${provider.name} for geocoding: ${address}`);

                let result: any = null;

                if (provider.name === 'goong') {
                    result = await this.goongService.getCoordinatesFromAddress(
                        address, district, ward, city
                    );
                } else if (provider.name === 'google') {
                    result = await this.googleGeocodingService.getCoordinatesFromAddress(
                        address, district, ward, city, province
                    );
                }

                if (result) {
                    this.logger.log(`Success with ${provider.name}: ${result.latitude}, ${result.longitude}`);

                    return {
                        latitude: result.latitude,
                        longitude: result.longitude,
                        formattedAddress: result.formattedAddress,
                        provider: provider.name,
                        placeId: result.placeId,
                        addressComponents: result.addressComponents,
                    };
                }
            } catch (error) {
                this.logger.warn(`Failed with ${provider.name}: ${error.message}`);
                continue;
            }
        }

        this.logger.error(`All providers failed for address: ${address}`);
        return null;
    }

    /**
     * Reverse geocoding với fallback tự động
     */
    async getAddressFromCoordinates(
        latitude: number,
        longitude: number,
        preferredProvider?: 'google' | 'goong'
    ): Promise<UnifiedGeocodingResult | null> {
        const sortedProviders = [...this.providers].sort((a, b) => a.priority - b.priority);

        if (preferredProvider) {
            const preferred = sortedProviders.find(p => p.name === preferredProvider);
            if (preferred) {
                sortedProviders.splice(sortedProviders.indexOf(preferred), 1);
                sortedProviders.unshift(preferred);
            }
        }

        for (const provider of sortedProviders) {
            try {
                this.logger.log(`Trying ${provider.name} for reverse geocoding: ${latitude}, ${longitude}`);

                let result: any = null;

                if (provider.name === 'goong') {
                    result = await this.goongService.getAddressFromCoordinates(latitude, longitude);
                } else if (provider.name === 'google') {
                    // Google service không có reverse geocoding, bỏ qua
                    continue;
                }

                if (result) {
                    this.logger.log(`Success with ${provider.name}: ${result.address}`);

                    return {
                        latitude,
                        longitude,
                        formattedAddress: result.address,
                        provider: provider.name,
                        addressComponents: result.addressComponents,
                    };
                }
            } catch (error) {
                this.logger.warn(`Failed with ${provider.name}: ${error.message}`);
                continue;
            }
        }

        this.logger.error(`All providers failed for coordinates: ${latitude}, ${longitude}`);
        return null;
    }

    /**
     * Kiểm tra trạng thái của tất cả providers
     */
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

    /**
     * So sánh kết quả từ cả hai providers
     */
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

            // Tính độ tương đồng địa chỉ (đơn giản)
            const googleAddr = results.google.formattedAddress.toLowerCase();
            const goongAddr = results.goong.formattedAddress.toLowerCase();
            const similarity = this.calculateStringSimilarity(googleAddr, goongAddr);

            results.differences = {
                latitudeDiff: latDiff,
                longitudeDiff: lngDiff,
                addressSimilarity: similarity,
            };
        }

        return results;
    }

    /**
     * Tính độ tương đồng giữa hai chuỗi (đơn giản)
     */
    private calculateStringSimilarity(str1: string, str2: string): number {
        const words1 = str1.split(/\s+/);
        const words2 = str2.split(/\s+/);

        const commonWords = words1.filter(word => words2.includes(word));
        const totalWords = Math.max(words1.length, words2.length);

        return totalWords > 0 ? commonWords.length / totalWords : 0;
    }
} 