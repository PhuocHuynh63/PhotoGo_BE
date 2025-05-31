import { Body, Controller, HttpException, HttpStatus, Logger, Post, Query, UploadedFile, UseInterceptors, Get } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth, ApiProperty, ApiConsumes, ApiResponse } from '@nestjs/swagger';
import { Public } from 'src/decorator/custom';
import { GenerateImageDescriptionDto, GenerateTextDto } from './dto/gemini.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { IGeminiResponse, ImageAnalysisResponse, TextAnalysisResponse } from './dto/gemini.response.dto';


@ApiTags('Gemini')
@Controller('gemini')
@ApiBearerAuth('access-token')
export class GeminiController {
    private readonly logger = new Logger(GeminiController.name);

    constructor(private readonly geminiService: GeminiService) { }

    @Post('generate-text')
    @Public()
    @ApiOperation({ summary: 'Generate text using Gemini AI' })
    @ApiResponse({
        status: 200,
        type: TextAnalysisResponse,
        description: 'Text generated successfully'
    })
    async generateText(
        @Query() dto: GenerateTextDto
    ): Promise<IGeminiResponse<TextAnalysisResponse['data']>> {
        try {
            return await this.geminiService.generateText(dto.prompt, dto.modelName);
        } catch (error) {
            this.logger.error(error);
            throw new HttpException(
                error.message,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Post('analyze-image')
    @Public()
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(FileInterceptor('file'))
    @ApiOperation({ summary: 'Analyze image using Gemini AI' })
    @ApiResponse({
        status: 200,
        type: ImageAnalysisResponse,
        description: 'Image analyzed successfully'
    })
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
        @UploadedFile() file: Express.Multer.File,
        @Query() dto: GenerateImageDescriptionDto
    ): Promise<IGeminiResponse<ImageAnalysisResponse['data']>> {
        try {
            if (!file) {
                throw new HttpException(
                    'No image file provided',
                    HttpStatus.BAD_REQUEST
                );
            }
            return await this.geminiService.processImage(file, dto.prompt, dto.modelName);
        } catch (error) {
            this.logger.error(error);
            throw new HttpException(
                error.message,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Post('concept-vector/generate')
    @Public()
    @UseInterceptors(FileInterceptor('image'))
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Generate concept vector from image' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                image: {
                    type: 'string',
                    format: 'binary',
                },
                conceptId: {
                    type: 'string',
                    description: 'ID of the service concept',
                },
            },
        },
    })
    async generateConceptVector(
        @UploadedFile() image: Express.Multer.File,
        @Body('conceptId') conceptId: string,
    ) {
        return await this.geminiService.generateConceptVector(image, conceptId);
    }

    @Post('concept-vector/search')
    @Public()
    @UseInterceptors(FileInterceptor('image'))
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Search concepts using image' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                image: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    async searchConcepts(@UploadedFile() image: Express.Multer.File) {
        return await this.geminiService.searchConcepts(image);
    }
}