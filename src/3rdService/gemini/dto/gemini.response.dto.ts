import { ApiProperty } from '@nestjs/swagger';

export interface IGeminiResponse<T> {
    success: boolean;
    data: T;
    metadata?: Record<string, any>;
    error?: string;
}

export class TextAnalysisResponse {
    @ApiProperty({ example: true })
    success: boolean;

    @ApiProperty({
        example: {
            text: "Phân tích chi tiết...",
            sentiment: "positive",
            hashtags: ["#photography", "#art"]
        }
    })
    data: {
        text: string;
        sentiment?: string;
        hashtags?: string[];
    };

    @ApiProperty()
    metadata?: {
        model: string;
        processingTime: number;
    };
}

export class ImageAnalysisResponse {
    @ApiProperty({ example: true })
    success: boolean;

    @ApiProperty()
    data: {
        description: string;
        technicalAnalysis: {
            composition: string;
            lighting: string;
            colors: string[];
        };
        suggestions: string[];
    };

    @ApiProperty()
    metadata: {
        filename: string;
        size: number;
        mimeType: string;
        model: string;
        processingTime: number;
    };
}