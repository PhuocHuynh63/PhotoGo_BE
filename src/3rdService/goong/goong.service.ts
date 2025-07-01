import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

/*
export interface GoongGeocodingResult {
    latitude: number;
    longitude: number;
    formattedAddress: string;
    placeId?: string;
    addressComponents?: {
        streetNumber?: string;
        route?: string;
        sublocality?: string;
        locality?: string;
        administrativeAreaLevel1?: string;
        administrativeAreaLevel2?: string;
        country?: string;
    };
}

export interface GoongReverseGeocodingResult {
    address: string;
    addressComponents: {
        streetNumber?: string;
        route?: string;
        sublocality?: string;
        locality?: string;
        administrativeAreaLevel1?: string;
        administrativeAreaLevel2?: string;
        country?: string;
    };
}
*/

export interface GoongCompleteAddressResult {
    completeAddress: string;
    addressComponents: {
        streetNumber?: string;
        route?: string;
        sublocality?: string;
        locality?: string;
        administrativeAreaLevel1?: string;
        administrativeAreaLevel2?: string;
        country?: string;
    };
    formattedAddress: string;
    latitude?: number;
    longitude?: number;
    placeId?: string;
}

@Injectable()
export class GoongService {
    private readonly logger = new Logger(GoongService.name);
    private readonly apiKey = process.env.GOONG_API_KEY;
    private readonly baseUrl = 'https://rsapi.goong.io';

    /**
     * Geocoding: Chuyển đổi địa chỉ thành tọa độ
     */
    /*
    async getCoordinatesFromAddress(
        address: string,
        district?: string,
        ward?: string,
        city?: string,
        province?: string
    ): Promise<GoongGeocodingResult | null> {
        try {
            if (!this.apiKey) {
                this.logger.warn('Goong API key not found. Please set GOONG_API_KEY environment variable.');
                return null;
            }

            // Log API key (first few characters for debugging)
            const apiKeyPreview = this.apiKey.substring(0, 10) + '...';
            this.logger.log(`Using Goong API key: ${apiKeyPreview}`);

            // Build the full address string - exclude province to avoid confusion with city
            const addressParts = [address, district, ward, city].filter(Boolean);
            const fullAddress = addressParts.join(', ');

            this.logger.log(`Goong geocoding address: ${fullAddress}`);

            const response = await axios.get(`${this.baseUrl}/geocode`, {
                params: {
                    address: fullAddress,
                    api_key: this.apiKey,
                },
            });

            this.logger.log(`Goong API response status: ${response.data.status}`);

            if (response.data.status === 'OK' && response.data.results.length > 0) {
                const result = response.data.results[0];
                const location = result.geometry.location;

                this.logger.log(`Found coordinates: ${location.lat}, ${location.lng} for address: ${fullAddress}`);

                return {
                    latitude: location.lat,
                    longitude: location.lng,
                    formattedAddress: result.formatted_address,
                    placeId: result.place_id,
                    addressComponents: this.extractAddressComponents(result.address_components),
                };
            } else {
                this.logger.warn(`No results found for address: ${fullAddress}. Status: ${response.data.status}`);
                return null;
            }
        } catch (error) {
            this.logger.error(`Error geocoding address with Goong: ${error.message}`);
            if (error.response) {
                this.logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
            }
            return null;
        }
    }
    */

    /**
     * Reverse Geocoding: Chuyển đổi tọa độ thành địa chỉ
     */
    /*
    async getAddressFromCoordinates(
        latitude: number,
        longitude: number
    ): Promise<GoongReverseGeocodingResult | null> {
        try {
            if (!this.apiKey) {
                this.logger.warn('Goong API key not found. Please set GOONG_API_KEY environment variable.');
                return null;
            }

            this.logger.log(`Goong reverse geocoding coordinates: ${latitude}, ${longitude}`);

            const response = await axios.get(`${this.baseUrl}/geocode`, {
                params: {
                    latlng: `${latitude},${longitude}`,
                    api_key: this.apiKey,
                },
            });

            if (response.data.status === 'OK' && response.data.results.length > 0) {
                const result = response.data.results[0];

                this.logger.log(`Found address: ${result.formatted_address}`);

                return {
                    address: result.formatted_address,
                    addressComponents: this.extractAddressComponents(result.address_components),
                };
            } else {
                this.logger.warn(`No results found for coordinates: ${latitude}, ${longitude}. Status: ${response.data.status}`);
                return null;
            }
        } catch (error) {
            this.logger.error(`Error reverse geocoding with Goong: ${error.message}`);
            return null;
        }
    }
    */

    /**
     * Tìm kiếm địa điểm (Place Search)
     */
    /*
    async searchPlaces(
        query: string,
        location?: { lat: number; lng: number },
        radius?: number
    ): Promise<any[]> {
        try {
            if (!this.apiKey) {
                this.logger.warn('Goong API key not found. Please set GOONG_API_KEY environment variable.');
                return [];
            }

            this.logger.log(`Goong place search: ${query}`);

            const params: any = {
                input: query,
                api_key: this.apiKey,
            };

            if (location) {
                params.location = `${location.lat},${location.lng}`;
            }

            if (radius) {
                params.radius = radius;
            }

            const response = await axios.get(`${this.baseUrl}/place/autocomplete`, {
                params,
            });

            if (response.data.status === 'OK') {
                this.logger.log(`Found ${response.data.predictions.length} places`);
                return response.data.predictions;
            } else {
                this.logger.warn(`No places found. Status: ${response.data.status}`);
                return [];
            }
        } catch (error) {
            this.logger.error(`Error searching places with Goong: ${error.message}`);
            return [];
        }
    }
    */

    /**
     * Lấy chi tiết địa điểm theo place_id
     */
    /*
    async getPlaceDetails(placeId: string): Promise<any | null> {
        try {
            if (!this.apiKey) {
                this.logger.warn('Goong API key not found. Please set GOONG_API_KEY environment variable.');
                return null;
            }

            this.logger.log(`Goong place details: ${placeId}`);

            const response = await axios.get(`${this.baseUrl}/place/detail`, {
                params: {
                    place_id: placeId,
                    api_key: this.apiKey,
                },
            });

            if (response.data.status === 'OK') {
                this.logger.log(`Found place details for: ${placeId}`);
                return response.data.result;
            } else {
                this.logger.warn(`No place details found. Status: ${response.data.status}`);
                return null;
            }
        } catch (error) {
            this.logger.error(`Error getting place details with Goong: ${error.message}`);
            return null;
        }
    }
    */

    /**
     * Tính khoảng cách giữa hai điểm
     */
    /*
    async calculateDistance(
        origin: { lat: number; lng: number },
        destination: { lat: number; lng: number },
        mode: 'driving' | 'walking' | 'bicycling' | 'transit' = 'driving'
    ): Promise<{
        distance: number;
        duration: number;
        distanceText: string;
        durationText: string;
    } | null> {
        try {
            if (!this.apiKey) {
                this.logger.warn('Goong API key not found. Please set GOONG_API_KEY environment variable.');
                return null;
            }

            this.logger.log(`Goong distance calculation: ${origin.lat},${origin.lng} to ${destination.lat},${destination.lng}`);

            const response = await axios.get(`${this.baseUrl}/direction`, {
                params: {
                    origin: `${origin.lat},${origin.lng}`,
                    destination: `${destination.lat},${destination.lng}`,
                    vehicle: mode,
                    api_key: this.apiKey,
                },
            });

            if (response.data.status === 'OK' && response.data.routes.length > 0) {
                const route = response.data.routes[0];
                const leg = route.legs[0];

                this.logger.log(`Distance: ${leg.distance.text}, Duration: ${leg.duration.text}`);

                return {
                    distance: leg.distance.value, // meters
                    duration: leg.duration.value, // seconds
                    distanceText: leg.distance.text,
                    durationText: leg.duration.text,
                };
            } else {
                this.logger.warn(`No route found. Status: ${response.data.status}`);
                return null;
            }
        } catch (error) {
            this.logger.error(`Error calculating distance with Goong: ${error.message}`);
            return null;
        }
    }
    */

    /**
     * Trích xuất các thành phần địa chỉ từ response của Goong
     */
    private extractAddressComponents(addressComponents: any[]): any {
        const components: any = {};

        if (!addressComponents || !Array.isArray(addressComponents)) {
            this.logger.warn('Invalid address components provided');
            return components;
        }

        for (const component of addressComponents) {
            // Kiểm tra component có hợp lệ không
            if (!component || typeof component !== 'object') {
                this.logger.warn('Invalid component found in address components');
                continue;
            }

            const types = component.types;
            const value = component.long_name;

            // Kiểm tra types có hợp lệ không
            if (!types || !Array.isArray(types)) {
                this.logger.warn('Invalid types found in component');
                continue;
            }

            // Kiểm tra value có hợp lệ không
            if (!value || typeof value !== 'string') {
                this.logger.warn('Invalid value found in component');
                continue;
            }

            if (types.includes('street_number')) {
                components.streetNumber = value;
            } else if (types.includes('route')) {
                components.route = value;
            } else if (types.includes('sublocality')) {
                components.sublocality = value;
            } else if (types.includes('locality')) {
                components.locality = value;
            } else if (types.includes('administrative_area_level_1')) {
                components.administrativeAreaLevel1 = value;
            } else if (types.includes('administrative_area_level_2')) {
                components.administrativeAreaLevel2 = value;
            } else if (types.includes('country')) {
                components.country = value;
            }
        }

        return components;
    }

    /**
     * Tạo địa chỉ hoàn chỉnh từ các thành phần địa chỉ
     */
    private buildCompleteAddress(addressComponents: any): string {
        const parts: string[] = [];

        // Kiểm tra nếu addressComponents trống
        if (!addressComponents || Object.keys(addressComponents).length === 0) {
            this.logger.warn('No address components available for building complete address');
            return '';
        }

        // Số nhà và đường
        if (addressComponents.streetNumber && addressComponents.route) {
            parts.push(`${addressComponents.streetNumber} ${addressComponents.route}`);
        } else if (addressComponents.route) {
            parts.push(addressComponents.route);
        }

        // Phường/Xã
        if (addressComponents.sublocality) {
            parts.push(addressComponents.sublocality);
        }

        // Quận/Huyện
        if (addressComponents.administrativeAreaLevel2) {
            parts.push(addressComponents.administrativeAreaLevel2);
        }

        // Thành phố/Tỉnh
        if (addressComponents.administrativeAreaLevel1) {
            parts.push(addressComponents.administrativeAreaLevel1);
        }

        // Quốc gia
        if (addressComponents.country) {
            parts.push(addressComponents.country);
        }

        const result = parts.join(', ');
        this.logger.log(`Built complete address from components: ${result}`);
        return result;
    }

    /**
     * Lấy địa chỉ hoàn chỉnh từ tọa độ (Reverse Geocoding với địa chỉ chi tiết)
     */
    async getCompleteAddressFromCoordinates(
        latitude: number,
        longitude: number
    ): Promise<GoongCompleteAddressResult | null> {
        try {
            if (!this.apiKey) {
                this.logger.warn('Goong API key not found. Please set GOONG_API_KEY environment variable.');
                return null;
            }

            this.logger.log(`Getting complete address for coordinates: ${latitude}, ${longitude}`);

            const response = await axios.get(`${this.baseUrl}/geocode`, {
                params: {
                    latlng: `${latitude},${longitude}`,
                    api_key: this.apiKey,
                },
            });

            if (response.data.status === 'OK' && response.data.results.length > 0) {
                const result = response.data.results[0];
                
                // Log response để debug
                this.logger.log(`Goong API response: ${JSON.stringify({
                    status: response.data.status,
                    formatted_address: result.formatted_address,
                    address_components_count: result.address_components?.length || 0,
                    address_components: result.address_components
                }, null, 2)}`);
                
                const addressComponents = this.extractAddressComponents(result.address_components);
                const completeAddress = this.buildCompleteAddress(addressComponents);

                this.logger.log(`Extracted address components: ${JSON.stringify(addressComponents, null, 2)}`);
                this.logger.log(`Complete address: ${completeAddress}`);

                // Ưu tiên sử dụng formatted_address từ Goong API
                // Nếu completeAddress trống hoặc không hợp lệ, sử dụng formatted_address
                const finalCompleteAddress = completeAddress && completeAddress.trim() !== '' 
                    ? completeAddress 
                    : result.formatted_address;

                return {
                    completeAddress: finalCompleteAddress,
                    addressComponents,
                    formattedAddress: result.formatted_address,
                    latitude: result.geometry.location.lat,
                    longitude: result.geometry.location.lng,
                    placeId: result.place_id,
                };
            } else {
                this.logger.warn(`No results found for coordinates: ${latitude}, ${longitude}. Status: ${response.data.status}`);
                return null;
            }
        } catch (error) {
            this.logger.error(`Error getting complete address with Goong: ${error.message}`);
            return null;
        }
    }

    /**
     * Lấy địa chỉ hoàn chỉnh từ địa chỉ đầu vào (Geocoding với địa chỉ chi tiết)
     */
    async getCompleteAddressFromInput(
        address: string,
        district?: string,
        ward?: string,
        city?: string,
        province?: string
    ): Promise<GoongCompleteAddressResult | null> {
        try {
            if (!this.apiKey) {
                this.logger.warn('Goong API key not found. Please set GOONG_API_KEY environment variable.');
                return null;
            }

            // Build the full address string - exclude province to avoid confusion with city
            const addressParts = [address, district, ward, city].filter(Boolean);
            const fullAddress = addressParts.join(', ');

            this.logger.log(`Getting complete address for: ${fullAddress}`);

            const response = await axios.get(`${this.baseUrl}/geocode`, {
                params: {
                    address: fullAddress,
                    api_key: this.apiKey,
                },
            });

            if (response.data.status === 'OK' && response.data.results.length > 0) {
                const result = response.data.results[0];
                const location = result.geometry.location;
                const addressComponents = this.extractAddressComponents(result.address_components);
                const completeAddress = this.buildCompleteAddress(addressComponents);

                this.logger.log(`Complete address: ${completeAddress}`);

                return {
                    completeAddress,
                    addressComponents,
                    formattedAddress: result.formatted_address,
                    latitude: location.lat,
                    longitude: location.lng,
                    placeId: result.place_id,
                };
            } else {
                this.logger.warn(`No results found for address: ${fullAddress}. Status: ${response.data.status}`);
                return null;
            }
        } catch (error) {
            this.logger.error(`Error getting complete address with Goong: ${error.message}`);
            if (error.response) {
                this.logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
            }
            return null;
        }
    }

    /**
     * Kiểm tra trạng thái API key
     */
    async validateApiKey(): Promise<boolean> {
        try {
            if (!this.apiKey) {
                return false;
            }

            // Thực hiện một request đơn giản để kiểm tra API key
            const response = await axios.get(`${this.baseUrl}/geocode`, {
                params: {
                    address: 'Hanoi, Vietnam',
                    api_key: this.apiKey,
                },
            });

            return response.data.status === 'OK';
        } catch (error) {
            this.logger.error(`Error validating Goong API key: ${error.message}`);
            return false;
        }
    }

    /**
     * Demo method để test lấy địa chỉ hoàn chỉnh
     */
    async demoCompleteAddress(): Promise<void> {
        this.logger.log('=== Demo Complete Address ===');
        
        // Test với địa chỉ cụ thể
        const testAddress = '127 Ni Sư Huỳnh Liên';
        const testDistrict = 'Tân Bình';
        const testWard = 'Phường 10';
        const testCity = 'Hồ Chí Minh';
        
        try {
            const result = await this.getCompleteAddressFromInput(
                testAddress,
                testDistrict,
                testWard,
                testCity
            );
            
            if (result) {
                this.logger.log('✅ Complete Address Result:');
                this.logger.log(`📍 Complete Address: ${result.completeAddress}`);
                this.logger.log(`📍 Formatted Address: ${result.formattedAddress}`);
                this.logger.log(`📍 Coordinates: ${result.latitude}, ${result.longitude}`);
                this.logger.log(`📍 Place ID: ${result.placeId}`);
                this.logger.log('📍 Address Components:');
                this.logger.log(`   - Street Number: ${result.addressComponents.streetNumber}`);
                this.logger.log(`   - Route: ${result.addressComponents.route}`);
                this.logger.log(`   - Sublocality: ${result.addressComponents.sublocality}`);
                this.logger.log(`   - Administrative Area Level 2: ${result.addressComponents.administrativeAreaLevel2}`);
                this.logger.log(`   - Administrative Area Level 1: ${result.addressComponents.administrativeAreaLevel1}`);
                this.logger.log(`   - Country: ${result.addressComponents.country}`);
            } else {
                this.logger.error('❌ Failed to get complete address');
            }
        } catch (error) {
            this.logger.error(`❌ Demo error: ${error.message}`);
        }
        
        this.logger.log('=== End Demo ===');
    }
} 