import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly apiKey = process.env.GOOGLE_MAPS_API_KEY;
  private readonly baseUrl = 'https://maps.googleapis.com/maps/api/geocode/json';

  async getCoordinatesFromAddress(
    address: string,
    district?: string,
    ward?: string,
    city?: string,
    province?: string
  ): Promise<GeocodingResult | null> {
    try {
      if (!this.apiKey) {
        this.logger.warn('Google Maps API key not found. Please set GOOGLE_MAPS_API_KEY environment variable.');
        return null;
      }

      // Log API key (first few characters for debugging)
      const apiKeyPreview = this.apiKey.substring(0, 10) + '...';
      this.logger.log(`Using API key: ${apiKeyPreview}`);

      // Build the full address string - exclude province to avoid confusion with city
      const addressParts = [address, district, ward, city].filter(Boolean);
      const fullAddress = addressParts.join(', ');

      this.logger.log(`Geocoding address: ${fullAddress}`);

      const response = await axios.get(this.baseUrl, {
        params: {
          address: fullAddress,
          key: this.apiKey,
        },
      });

      this.logger.log(`Google Maps API response status: ${response.data.status}`);
      if (response.data.error_message) {
        this.logger.error(`Google Maps API error: ${response.data.error_message}`);
      }

      if (response.data.status === 'OK' && response.data.results.length > 0) {
        const result = response.data.results[0];
        const location = result.geometry.location;

        this.logger.log(`Found coordinates: ${location.lat}, ${location.lng} for address: ${fullAddress}`);

        return {
          latitude: location.lat,
          longitude: location.lng,
          formattedAddress: result.formatted_address,
        };
      } else {
        this.logger.warn(`No results found for address: ${fullAddress}. Status: ${response.data.status}`);
        return null;
      }
    } catch (error) {
      this.logger.error(`Error geocoding address: ${error.message}`);
      if (error.response) {
        this.logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
      }
      return null;
    }
  }

  async getCoordinatesFromComponents(
    address: string,
    district?: string,
    ward?: string,
    city?: string,
    province?: string
  ): Promise<GeocodingResult | null> {
    try {
      if (!this.apiKey) {
        this.logger.warn('Google Maps API key not found. Please set GOOGLE_MAPS_API_KEY environment variable.');
        return null;
      }

      this.logger.log(`Geocoding with components: ${address}, ${district}, ${ward}, ${city}`);

      const components = [];
      if (address) components.push(`street_address:${address}`);
      if (district) components.push(`administrative_area_level_2:${district}`);
      if (ward) components.push(`sublocality:${ward}`);
      if (city) components.push(`locality:${city}`);
      // Remove province to avoid confusion with city

      const response = await axios.get(this.baseUrl, {
        params: {
          components: components.join('|'),
          key: this.apiKey,
        },
      });

      if (response.data.status === 'OK' && response.data.results.length > 0) {
        const result = response.data.results[0];
        const location = result.geometry.location;

        this.logger.log(`Found coordinates: ${location.lat}, ${location.lng}`);

        return {
          latitude: location.lat,
          longitude: location.lng,
          formattedAddress: result.formatted_address,
        };
      } else {
        this.logger.warn(`No results found. Status: ${response.data.status}`);
        return null;
      }
    } catch (error) {
      this.logger.error(`Error geocoding with components: ${error.message}`);
      return null;
    }
  }

  async validateAndGetCoordinates(
    address: string,
    district?: string,
    ward?: string,
    city?: string,
    province?: string
  ): Promise<GeocodingResult | null> {
    // Try with components first (more accurate)
    let result = await this.getCoordinatesFromComponents(address, district, ward, city, province);
    
    // If components method fails, try with full address
    if (!result) {
      result = await this.getCoordinatesFromAddress(address, district, ward, city, province);
    }

    return result;
  }
} 