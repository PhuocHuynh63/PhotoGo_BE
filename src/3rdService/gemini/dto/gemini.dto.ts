import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, IsEnum } from "class-validator";
import { GeminiModel } from "./gemini.enums";

export class GenerateTextDto {
    @IsOptional()
    @IsString()
    @ApiProperty({
        example: 'chào bạn',
        description: 'Nội dung văn bản đầu vào để Gemini AI tạo ra văn bản mới.',
    })
    prompt: string;

    @IsOptional()
    @IsEnum(GeminiModel) // Đảm bảo đây là enum
    @ApiProperty({
        enum: GeminiModel, // Chỉ định enum để Swagger hiển thị dropdown
        description: 'Chọn model Gemini AI để sử dụng cho việc tạo văn bản.',
        example: GeminiModel.GEMINI_1_5_PRO_001,
        required: false,
    })
    modelName?: GeminiModel; // Kiểu dữ liệu là enum
}

export class GenerateImageDescriptionDto {
    @IsOptional()
    @IsString()
    @ApiProperty({
        example: 'chào bạn',
        description: 'Nội dung văn bản đầu vào để Gemini AI tạo ra văn bản mới.',
    })
    prompt: string;

    @IsOptional()
    @IsEnum(GeminiModel) // Đảm bảo đây là enum
    @ApiProperty({
        enum: GeminiModel, // Chỉ định enum để Swagger hiển thị dropdown
        description: 'Chọn model Gemini AI để sử dụng cho việc tạo văn bản.',
        example: GeminiModel.GEMINI_1_5_PRO_001,
        required: false,
    })
    modelName?: GeminiModel; // Kiểu dữ liệu là enum
}