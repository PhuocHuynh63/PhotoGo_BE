import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { IGeminiResponse, ImageAnalysisResponse, TextAnalysisResponse } from './dto/gemini.response.dto';

@Injectable()
export class GeminiService {
    private readonly logger = new Logger(GeminiService.name);
    private readonly genAI: GoogleGenerativeAI;
    private readonly modelName: string;
    private readonly generationConfig: any;
    private readonly safetySettings: any;
    private readonly systemContext = `
        Bạn là trợ lý AI của ứng dụng PhotoGo, một nền tảng đặt lịch studio, freelancer về chủ đề chụp ảnh với nhiều concept và make up.
        Khi phân tích ảnh:
        - Tập trung vào các yếu tố nghệ thuật trong ảnh
        - Đề cập đến bố cục, màu sắc, ánh sáng
        - Đánh giá chất lượng ảnh
        - Gợi ý các hashtag phù hợp
        - Đưa ra gợi ý cải thiện nếu cần
        
        Khi trả lời câu hỏi:
        - Đưa ra các thông tin liên quan đến nhiếp ảnh
        - Đưa ra các thông tin (gói, concept, make up) có sẵn trong ứng dụng PhotoGo
        - Sử dụng ngôn ngữ thân thiện
        - Tập trung vào chủ đề nhiếp ảnh, concept của ảnh đã đính kèm
        - Đưa ra các gợi ý thực tế, có sẵn trong ứng dụng PhotoGo
        - Không đưa ra các thông tin không liên quan đến nhiếp ảnh
        - Không đưa ra các thông tin không có trong ảnh đã đính kèm
        - Không đưa ra các thông tin không có trong ứng dụng PhotoGo
    `;

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

    private async initializeModel(modelName?: string) {
        const model = this.genAI.getGenerativeModel({
            model: modelName || this.modelName,
            generationConfig: {
                temperature: 0.7,
                topP: 0.8,
                topK: 40,
                maxOutputTokens: 2048,
            },
        });
        return model;
    }

    async generateText(prompt: string, modelName?: string): Promise<IGeminiResponse<TextAnalysisResponse['data']>> {
        const startTime = Date.now();
        try {
            const model = await this.initializeModel(modelName);
            const enhancedPrompt = `${this.systemContext}\n\nUser: ${prompt}`;

            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: enhancedPrompt }] }],
                safetySettings: this.safetySettings,
            });

            const response = result.response.text();
            const hashtags = this.extractHashtags(response);

            return {
                success: true,
                data: {
                    text: response,
                    hashtags,
                    sentiment: await this.analyzeSentiment(response)
                },
                metadata: {
                    model: modelName || this.modelName,
                    processingTime: Date.now() - startTime
                }
            };
        } catch (error) {
            this.logger.error(`Text generation error: ${error.message}`);
            throw new Error(`Failed to generate text: ${error.message}`);
        }
    }

    async processImage(file: Express.Multer.File,prompt?: string,modelName?: string): Promise<IGeminiResponse<ImageAnalysisResponse['data']>> {
        const startTime = Date.now();
        try {
            const model = await this.initializeModel(modelName);
            const imageData = {
                inlineData: {
                    data: file.buffer.toString('base64'),
                    mimeType: file.mimetype
                }
            };

            const analysisPrompt = `
                ${this.systemContext}
                Analyze this image and provide:
                1. General description
                2. Technical analysis (composition, lighting, colors)
                3. Improvement suggestions
                4. Relevant hashtags
                ${prompt || ''}
            `;

            const result = await model.generateContent({
                contents: [{
                    role: 'user',
                    parts: [{ text: analysisPrompt }, imageData]
                }]
            });

            const analysis = await this.parseImageAnalysis(result.response.text());

            return {
                success: true,
                data: analysis,
                metadata: {
                    filename: file.originalname,
                    size: file.size,
                    mimeType: file.mimetype,
                    model: modelName || this.modelName,
                    processingTime: Date.now() - startTime
                }
            };
        } catch (error) {
            this.logger.error(`Image analysis error: ${error.message}`);
            throw new Error(`Failed to analyze image: ${error.message}`);
        }
    }

    private async parseImageAnalysis(text: string) {
        // Implement parsing logic for structured analysis
        return {
            description: text,
            technicalAnalysis: {
                composition: this.extractComposition(text),
                lighting: this.extractLighting(text),
                colors: this.extractColors(text)
            },
            suggestions: this.extractSuggestions(text),
            hashtags: this.extractHashtags(text)
        };
    }

    private extractSuggestions(text: string): string[] {
        // Simple extraction: look for lines containing 'suggestion' or 'improvement'
        const suggestions: string[] = [];
        const lines = text.split('\n');
        for (const line of lines) {
            if (/suggestion|improvement/i.test(line)) {
                suggestions.push(line.trim());
            }
        }
        return suggestions;
    }

    private extractHashtags(text: string): string[] {
        const hashtags = text.match(/#[\w\u0590-\u05ff]+/g) || [];
        return [...new Set(hashtags)];
    }

    private extractColors(text: string): string[] {
        // Simple extraction: look for color names in the text
        const colorList = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'black', 'white', 'gray', 'brown', 'cyan', 'magenta'];
        const foundColors = colorList.filter(color => new RegExp(`\\b${color}\\b`, 'i').test(text));
        return foundColors;
    }

    private extractLighting(text: string): string {
        // Simple extraction: look for lines mentioning lighting
        const lines = text.split('\n');
        for (const line of lines) {
            if (/lighting/i.test(line)) {
                return line.trim();
            }
        }
        return '';
    }

    private extractComposition(text: string): string {
        // Simple extraction: look for lines mentioning composition
        const lines = text.split('\n');
        for (const line of lines) {
            if (/composition/i.test(line)) {
                return line.trim();
            }
        }
        return '';
    }

    private async analyzeSentiment(text: string): Promise<string> {
        // Implement basic sentiment analysis
        const positiveWords = ['beautiful', 'great', 'excellent', 'good', 'amazing'];
        const negativeWords = ['poor', 'bad', 'terrible', 'worst', 'horrible'];

        const lowercaseText = text.toLowerCase();
        const positiveCount = positiveWords.filter(word => lowercaseText.includes(word)).length;
        const negativeCount = negativeWords.filter(word => lowercaseText.includes(word)).length;

        return positiveCount > negativeCount ? 'positive' :
            negativeCount > positiveCount ? 'negative' : 'neutral';
    }




}