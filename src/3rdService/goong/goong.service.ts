import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

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

@Injectable()
export class GoongService {
    private readonly logger = new Logger(GoongService.name);
    private readonly apiKey = process.env.GOONG_API_KEY;
    private readonly baseUrl = 'https://rsapi.goong.io';

    /**
     * Geocoding: Chuyển đổi địa chỉ thành tọa độ
     */
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

    /**
     * Reverse Geocoding: Chuyển đổi tọa độ thành địa chỉ
     */
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

    /**
     * Tìm kiếm địa điểm (Place Search)
     */
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

    /**
     * Lấy chi tiết địa điểm theo place_id
     */
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

    /**
     * Tính khoảng cách giữa hai điểm
     */
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

    /**
     * Trích xuất các thành phần địa chỉ từ response của Goong
     */
    private extractAddressComponents(addressComponents: any[]): any {
        const components: any = {};

        if (!addressComponents) return components;

        for (const component of addressComponents) {
            const types = component.types;
            const value = component.long_name;

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
} 