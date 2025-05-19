import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class GeminiService {
    private readonly logger = new Logger(GeminiService.name);
    private readonly genAI: GoogleGenerativeAI;
    private readonly modelName: string;
    private readonly generationConfig: any;
    private readonly safetySettings: any;

    constructor(private configService: ConfigService) {
        const apiKey = this.configService.get<string>('gemini.apiKey');
        if (!apiKey) {
            this.logger.error('GEMINI_API_KEY is not defined in environment variables');
            throw new Error('GEMINI_API_KEY is required');
        }

        this.genAI = new GoogleGenerativeAI(apiKey);

        // Lấy model từ cấu hình hoặc sử dụng model mặc định
        this.modelName = this.configService.get<string>('gemini.model') || 'models/gemini-1.5-pro-001';

        // Lấy cấu hình generation và safety từ cấu hình
        this.generationConfig = this.configService.get('gemini.generationConfig') || {};
        this.safetySettings = this.configService.get('gemini.safetySettings') || [];
    }

    async generateText(prompt: string, modelName?: string): Promise<string> {
        try {
            const modelToUse = modelName || this.modelName; // Sử dụng model được truyền vào hoặc model mặc định
            this.logger.log(`Using model: ${modelToUse} for text generation`);
            const model = this.genAI.getGenerativeModel({ model: modelToUse });

            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: this.generationConfig,
                safetySettings: this.safetySettings,
            });

            return result.response.text();
        } catch (error) {
            this.logger.error(`Error generating text from Gemini: ${error.message}`, error.stack);
            throw error;
        }
    }

    async processImage(file: Express.Multer.File, prompt?: string, modelName?: string): Promise<string> {
        try {
            const modelToUse = modelName || this.modelName;
            this.logger.log(`Using model: ${modelToUse} for image description`);

            const base64Image = file.buffer.toString('base64'); // Chuyển file thành base64
            const mimeType = file.mimetype;

            const userPrompt = prompt || 'Describe this image in detail.';

            const model = this.genAI.getGenerativeModel({ model: modelToUse });
            const result = await model.generateContent({
                contents: [
                    {
                        role: 'user',
                        parts: [
                            { text: userPrompt },
                            {
                                inlineData: {
                                    mimeType: mimeType,
                                    data: base64Image,
                                },
                            },
                        ],
                    },
                ],
            });

            return result.response.text();
        } catch (error) {
            this.logger.error(`Error analyzing image with Gemini: ${error.message}`, error.stack);
            throw error;
        }
    }


}