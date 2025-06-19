import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { IGeminiResponse, ImageAnalysisResponse, TextAnalysisResponse } from './dto/gemini.response.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConceptVector } from '../../modules/service-package/entities/concept-vector.entity';
import { GeminiModel } from './dto/gemini.enums';

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

    constructor(
        private configService: ConfigService,
        @InjectRepository(ConceptVector)
        private conceptVectorRepository: Repository<ConceptVector>,
    ) {
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

    async processImage(file: Express.Multer.File, prompt?: string, modelName?: string): Promise<IGeminiResponse<ImageAnalysisResponse['data']>> {
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

    async generateConceptVector(image: Express.Multer.File, conceptId: string): Promise<ConceptVector> {
        try {
            // Generate keywords from image
            const keywords = await this.generateKeywordsFromImage(image, GeminiModel.GEMINI_2_0_FLASH_EXP_IMAGE_GENERATION);
            this.logger.log(`Generated keywords: ${keywords.join(', ')}`);

            // Generate embedding from keywords
            const embedding = await this.generateEmbedding(keywords.join(' '));
            this.logger.log(`Generated embedding length: ${embedding.length}`);
            this.logger.log(`Generated embedding sample: ${embedding.slice(0, 10).join(', ')}...`);

            // Kiểm tra embedding trước khi lưu
            if (!Array.isArray(embedding) || embedding.length !== 768 || !embedding.every(val => typeof val === 'number' && !isNaN(val))) {
                throw new Error(`Invalid embedding: must be an array of 768 numbers`);
            }

            // Create or update concept vector
            let conceptVector = await this.conceptVectorRepository.findOne({ where: { conceptId } });
            if (!conceptVector) {
                conceptVector = this.conceptVectorRepository.create({
                    conceptId,
                    keywords,
                    embedding,
                });
            } else {
                conceptVector.keywords = keywords;
                conceptVector.embedding = embedding;
            }

            return await this.conceptVectorRepository.save(conceptVector);
        } catch (error) {
            this.logger.error(`Error generating concept vector: ${error.message}`);
            throw error;
        }
    }

    async searchConcepts(image: Express.Multer.File): Promise<ConceptVector[]> {
        try {
            // Generate keywords and embedding from the image
            const keywords = await this.generateKeywordsFromImage(image, GeminiModel.GEMINI_2_0_FLASH_EXP_IMAGE_GENERATION);
            this.logger.log(`Generated keywords for search: ${keywords.join(', ')}`);

            const queryEmbedding = await this.generateEmbedding(keywords.join(' '));
            this.logger.log(`Generated query embedding length: ${queryEmbedding.length}`);
            this.logger.log(`Query embedding sample: ${queryEmbedding.slice(0, 10).join(', ')}...`);

            // Kiểm tra tính hợp lệ của queryEmbedding
            if (!Array.isArray(queryEmbedding) || queryEmbedding.length !== 768 || !queryEmbedding.every(val => typeof val === 'number' && !isNaN(val))) {
                throw new Error(`Invalid query embedding: must be an array of 768 numbers`);
            }

            // Create a query builder for combined search
            const queryBuilder = this.conceptVectorRepository.createQueryBuilder('conceptVector');

            // Build the combined search query using pgvector functions
            queryBuilder
                .select('conceptVector')
                .addSelect(`
                    (
                        -- Keyword match score (0-1)
                        CASE 
                            WHEN EXISTS (
                                SELECT 1 
                                FROM unnest(conceptVector.keywords) keyword 
                                WHERE keyword = ANY(:keywords)
                            ) THEN 1
                            ELSE 0
                        END * 0.4 + 
                        -- Vector similarity using pgvector's cosine distance
                        (1 - (conceptVector.embedding <=> :queryEmbedding::vector)) * 0.6
                    )::float as relevance_score
                `)
                .addSelect('(conceptVector.embedding <-> :queryEmbedding::vector)::float as distance')
                .setParameter('keywords', keywords)
                .setParameter('queryEmbedding', `[${queryEmbedding.join(',')}]`) // Chuyển thành chuỗi vector
                .orderBy('relevance_score', 'DESC')
                .limit(10);

            const results = await queryBuilder.getRawAndEntities();

            // Map the results to include both relevance score and distance
            const mappedResults = results.entities.map((entity, index) => ({
                ...entity,
                relevanceScore: parseFloat(results.raw[index].relevance_score),
                distance: parseFloat(results.raw[index].distance)
            }));

            this.logger.log(`Found ${mappedResults.length} matching concepts`);
            return mappedResults;
        } catch (error) {
            this.logger.error(`Error searching concepts: ${error.message}`);
            throw new Error(`Failed to search concepts: ${error.message}`);
        }
    }

    private async generateKeywordsFromImage(image: Express.Multer.File, modelName?: string): Promise<string[]> {
        try {
            const model = await this.initializeModel(modelName);

            // Convert image to base64
            const imageData = {
                inlineData: {
                    data: image.buffer.toString('base64'),
                    mimeType: image.mimetype
                }
            };

            const prompt = `Analyze this image and provide 5-10 relevant keywords that describe its content, style, and mood. 
            Focus on visual elements, composition, and artistic aspects. 
            Return only the keywords in a comma-separated list, no additional text.`;

            const result = await model.generateContent([prompt, imageData]);
            const response = await result.response;
            const text = response.text();

            if (!text) {
                throw new Error('No text response from Gemini API');
            }

            // Clean and parse the keywords
            const keywords = text
                .split(',')
                .map(k => k.trim().toLowerCase())
                .filter(k => k.length > 0);

            return keywords;
        } catch (error) {
            if (error.message?.includes('Response was blocked')) {
                this.logger.warn('Image was blocked by safety filters, returning default keywords');
                // Return default keywords that are safe and relevant for photography
                return ['photography', 'art', 'creative', 'visual', 'design', 'studio', 'portrait', 'professional', 'quality', 'composition'];
            }
            this.logger.error(`Error generating keywords: ${error.message}`);
            throw error;
        }
    }

    private async generateEmbedding(text: string): Promise<number[]> {
        try {
            const model = await this.initializeModel();
            const prompt = `Generate a 768-dimensional embedding vector for this text: ${text}. Return only the array of numbers in JSON format, e.g., [0.1, 0.2, 0.3, ...].`;

            const result = await model.generateContent([prompt]);
            const response = await result.response;
            const responseText = response.text();

            this.logger.log(`Gemini API embedding response: ${responseText}`); // Log để debug

            try {
                // Phân tích cú pháp phản hồi
                let embedding = JSON.parse(responseText);

                // Nếu embedding là mảng chuỗi, chuyển thành mảng số
                if (embedding.every((val: any) => typeof val === 'string')) {
                    embedding = embedding.map((val: string) => parseFloat(val));
                }

                // Kiểm tra định dạng và độ dài
                if (!Array.isArray(embedding) || embedding.length !== 768 || !embedding.every((val: any) => typeof val === 'number' && !isNaN(val))) {
                    throw new Error(`Invalid embedding format or length. Expected 768 numbers, got ${embedding.length}`);
                }

                return embedding;
            } catch (parseError) {
                this.logger.warn(`Failed to parse embedding response: ${parseError.message}, using fallback embedding`);
                // Tạo vector dự phòng với 768 phần tử
                const fallbackEmbedding = new Array(768).fill(0);
                const words = text.toLowerCase().split(/\s+/);
                words.forEach((word, index) => {
                    if (index < 768) {
                        fallbackEmbedding[index] = Math.min(word.length / 10, 1); // Chuẩn hóa giá trị
                    }
                });
                return fallbackEmbedding;
            }
        } catch (error) {
            this.logger.error(`Error generating embedding: ${error.message}`);
            // Trả về vector dự phòng với 768 phần tử
            return new Array(768).fill(0);
        }
    }
}