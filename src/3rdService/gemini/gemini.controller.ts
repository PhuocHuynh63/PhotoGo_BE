import { Body, Controller, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth, ApiProperty, ApiConsumes } from '@nestjs/swagger';
import { Public } from 'src/decorator/custom';
import { GenerateImageDescriptionDto, GenerateTextDto } from './dto/gemini.dto';
import { FileInterceptor } from '@nestjs/platform-express';


@Controller('ai/gemini')
@ApiBearerAuth('access-token')
export class GeminiController {
    constructor(private readonly geminiService: GeminiService) { }

    @Post('generate-text')
    @ApiOperation({ summary: 'Tạo văn bản bằng Gemini AI' })
    @Public()
    async generateText(@Query() dto: GenerateTextDto): Promise<{ text: string }> {
        const text = await this.geminiService.generateText(dto.prompt, dto.modelName);
        return { text };
    }

    @Public()
    @Post('analyze-image')
    @ApiConsumes('multipart/form-data') // Định nghĩa kiểu dữ liệu là multipart/form-data
    @UseInterceptors(FileInterceptor('file')) // Xử lý file được gửi
    @ApiOperation({ summary: 'Phân tích hình ảnh bằng Gemini AI' })
    @ApiBody({
        description: 'Upload file ảnh để phân tích',
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary', // Định nghĩa kiểu file
                },
            },
        },
    })
    async analyzeImage(
        @UploadedFile() file: Express.Multer.File, // File được tải lên
        @Query() dto: GenerateImageDescriptionDto): Promise<{ description: string }> {
        const description = await this.geminiService.processImage(file, dto.prompt, dto.modelName);
        return { description };
    }

}