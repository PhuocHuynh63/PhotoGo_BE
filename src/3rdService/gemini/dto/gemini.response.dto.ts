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

    @ApiProperty({
        example: {
            analysis: {
                description: "Phân tích chi tiết về ảnh...",
                technicalAnalysis: {
                    composition: "Bố cục tốt...",
                    lighting: "Ánh sáng đẹp...",
                    colors: ["blue", "green"]
                },
                suggestions: ["Gợi ý 1", "Gợi ý 2"]
            },
            example: "Concept chụp ảnh cún cưng siêu cute:",
            concepts_same: [
                {
                    id: "concept-123",
                    name: "Con Vật",
                    price: "1000000",
                    relevanceScore: 0.8
                }
            ],
            isNoMatch: false,
            suggestion: "Tìm thấy concept phù hợp!"
        }
    })
    data: {
        analysis: {
            description: string;
            technicalAnalysis: {
                composition: string;
                lighting: string;
                colors: string[];
            };
            suggestions: string[];
        };
        example: string;
        concepts_same: any[];
        isNoMatch?: boolean;
        suggestion?: string;
    };

    @ApiProperty({
        example: {
            filename: "image.jpg",
            size: 123456,
            mimeType: "image/jpeg",
            processingTime: 2500,
            message: "Đã tìm thấy 3 concept phù hợp."
        }
    })
    metadata: {
        filename: string;
        size: number;
        mimeType: string;
        processingTime: number;
        message?: string;
    };
}