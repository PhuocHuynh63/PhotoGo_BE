
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { IGeminiResponse, ImageAnalysisResponse, TextAnalysisResponse } from './dto/gemini.response.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConceptVector } from '../../modules/service-package/entities/concept-vector.entity';
import { GeminiModel } from './dto/gemini.enums';
import { ServiceConcept } from '../../modules/service-package/entities/service-concept.entity';

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
        this.modelName = this.configService.get<string>('gemini.model') || 'models/gemini-2.0-flash-001';

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

    /**
     * Kiểm tra prompt có phải gợi ý/tư vấn concept không
     */
    private isSuggestConceptPrompt(prompt?: string): boolean {
        if (!prompt) return false;
        // Hàm loại bỏ dấu tiếng Việt
        function removeVietnameseTones(str: string): string {
            return str.normalize('NFD')
                .replace(/\p{Diacritic}/gu, '')
                .replace(/đ/g, 'd').replace(/Đ/g, 'D');
        }
        // Từ khóa chính, không cần liệt kê biến thể thủ công
        const suggestKeywords = [
            'gợi ý concept', 'tư vấn concept', 'concept phù hợp', 'suggest concept', 'recommend concept',
            'gợi ý concept nào', 'tư vấn concept nào', 'concept nào phù hợp', 'concept suggestion', 'concept advice'
        ];
        const promptRaw = prompt.toLowerCase();
        const promptNoTone = removeVietnameseTones(promptRaw);
        // Fuzzy match: chấp nhận sai dấu, sai chính tả nhẹ (Levenshtein <= 4)
        function levenshtein(a: string, b: string): number {
            const matrix = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
            for (let j = 1; j <= b.length; j++) matrix[0][j] = j;
            for (let i = 1; i <= a.length; i++) {
                for (let j = 1; j <= b.length; j++) {
                    if (a[i - 1] === b[j - 1]) matrix[i][j] = matrix[i - 1][j - 1];
                    else matrix[i][j] = Math.min(
                        matrix[i - 1][j] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j - 1] + 1
                    );
                }
            }
            return matrix[a.length][b.length];
        }
        // Regex nhận diện các biến thể rút gọn/viết tắt phổ biến
        const shortPattern = /\b(goi\s*y|gợi\s*y|tu\s*van|tư\s*vấn)?\s*(conc(ept)?|con|c)\b/i;

        // Nếu match regex rút gọn thì coi là gợi ý concept
        if (shortPattern.test(promptRaw) || shortPattern.test(promptNoTone)) return true;

        // So khớp từ khóa chính (có dấu, không dấu, fuzzy)
        return suggestKeywords.some(kw => {
            const kwRaw = kw.toLowerCase();
            const kwNoTone = removeVietnameseTones(kwRaw);
            if (promptNoTone.includes(kwNoTone)) return true;
            if (levenshtein(promptNoTone, kwNoTone) <= 4) return true;
            if (promptRaw.includes(kwRaw)) return true;
            if (levenshtein(promptRaw, kwRaw) <= 4) return true;
            return false;
        });
    }

    //#region Text Generation
    async generateText(prompt: string): Promise<IGeminiResponse<
        | TextAnalysisResponse['data']
        | {
            text: string;
            example: string;
            concepts: Array<{
                conceptId: string;
                name: string | null;
                price: number | null;
                imageUrl: string | null;
            }>;
        }
    >> {
        const startTime = Date.now();
        // Nếu prompt là gợi ý/tư vấn concept thì trả về concept mẫu (chỉ trả về concept, không trả về text)
        if (this.isSuggestConceptPrompt(prompt) || this.isServicePrompt(prompt)) {
            // Lấy tối đa 3 concept/dịch vụ mẫu (ưu tiên có hình)
            const conceptRepo = this.conceptVectorRepository.manager.getRepository(ServiceConcept);
            let concepts = await conceptRepo.find({
                relations: ['images'],
                order: { createdAt: 'ASC' },
                take: 5
            });
            let withImage = concepts.filter(c => Array.isArray(c.images) && c.images.length > 0 && c.images[0]?.imageUrl);
            let withoutImage = concepts.filter(c => !Array.isArray(c.images) || c.images.length === 0 || !c.images[0]?.imageUrl);
            let selected = [...withImage.slice(0, 2), ...withoutImage.slice(0, 1)];
            if (selected.length < 3) {
                selected = [...withImage, ...withoutImage].slice(0, 3);
            }
            // Gọi AI sinh text giới thiệu dịch vụ/concept
            const model = this.genAI.getGenerativeModel({
                model: GeminiModel.GEMINI_2_0_FLASH_EXP_IMAGE_GENERATION,
                generationConfig: {
                    temperature: 0.7,
                    topP: 0.8,
                    topK: 40,
                    maxOutputTokens: 512,
                },
            });
            const enhancedPrompt = `${this.systemContext}\n\nUser: ${prompt}`;
            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: enhancedPrompt }] }],
                safetySettings: this.safetySettings,
            });
            const response = result.response.text();

            return {
                success: true,
                data: {
                    text: response,
                    example: this.isServicePrompt(prompt)
                        ? "Một số dịch vụ nổi bật của PhotoGo:"
                        : "Một số concept nổi bật của PhotoGo:",
                    concepts: selected.map(concept => ({
                        conceptId: concept.id,
                        name: concept.name ?? null,
                        price: concept.price ?? null,
                        imageUrl: Array.isArray(concept.images) && concept.images.length > 0 ? concept.images[0].imageUrl : null
                    }))
                },
                metadata: {
                    processingTime: Date.now() - startTime
                }
            };
        }
        // Xử lý bình thường: dùng model Flash (nhanh), giảm maxOutputTokens
        const model = this.genAI.getGenerativeModel({
            model: GeminiModel.GEMINI_2_0_FLASH_EXP_IMAGE_GENERATION,
            generationConfig: {
                temperature: 0.7,
                topP: 0.8,
                topK: 40,
                maxOutputTokens: 512,
            },
        });
        const enhancedPrompt = `${this.systemContext}\n\nUser: ${prompt}`;
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: enhancedPrompt }] }],
            safetySettings: this.safetySettings,
        });
        const response = result.response.text();
        return {
            success: true,
            data: {
                text: response,
                sentiment: await this.analyzeSentiment(response)
            },
            metadata: {
                processingTime: Date.now() - startTime
            }
        };
    }
    //#endregion

    //#region Concept Vector Generation
    async analyzeImageWithConcepts(
        file: Express.Multer.File,
        prompt?: string
    ): Promise<IGeminiResponse<{
        analysis: ImageAnalysisResponse['data']
        concepts_same: (Omit<ConceptVector, 'embedding'> & { relevanceScore: number; distance: number })[]
    }>> {
        const startTime = Date.now();
        // 1. Image analysis (reuse processImage logic, but inline for efficiency)
        const model = await this.initializeModel(GeminiModel.GEMINI_2_0_FLASH_EXP_IMAGE_GENERATION);
        const imageData = {
            inlineData: {
                data: file.buffer.toString('base64'),
                mimeType: file.mimetype
            }
        };
        const analysisPrompt = `
                ${this.systemContext}
                Phân tích bức ảnh này và cung cấp:
                1. Mô tả tổng quan
                2. Phân tích kỹ thuật (bố cục, ánh sáng, màu sắc)
                3. Gợi ý cải thiện
                ${prompt || ''}
            `;
        const result = await model.generateContent({
            contents: [{
                role: 'user',
                parts: [{ text: analysisPrompt }, imageData]
            }]
        });
        const analysis = await this.parseImageAnalysis(result.response.text());

        // 2. Concept vector search (reuse searchConcepts logic, but inline for efficiency)
        let concepts_same: (Omit<ConceptVector, 'embedding'> & { relevanceScore: number; distance: number; name: string | null; price: number | null; imageUrl: string | null })[] = [];

        const keywords = await this.generateKeywordsFromImage(file);
        const queryEmbedding = await this.generateEmbedding(keywords.join(' '));
        if (!Array.isArray(queryEmbedding) || queryEmbedding.length !== 768 || !queryEmbedding.every(val => typeof val === 'number' && !isNaN(val))) {
            throw new Error(`Invalid query embedding: must be an array of 768 numbers`);
        }
        const queryBuilder = this.conceptVectorRepository.createQueryBuilder('conceptVector');
        queryBuilder
            .select('conceptVector')
            .addSelect(`
                    (
                        CASE 
                            WHEN EXISTS (
                                SELECT 1 
                                FROM unnest(conceptVector.keywords) keyword 
                                WHERE keyword = ANY(:keywords)
                            ) THEN 1
                            ELSE 0
                        END * 0.4 + 
                        (1 - (conceptVector.embedding <=> :queryEmbedding::vector)) * 0.6
                    )::float as relevance_score
                `)
            .addSelect('(conceptVector.embedding <-> :queryEmbedding::vector)::float as distance')
            .setParameter('keywords', keywords)
            .setParameter('queryEmbedding', `[${queryEmbedding.join(',')}]`)
            .orderBy('relevance_score', 'DESC')
            .limit(5);
        const results = await queryBuilder.getRawAndEntities();


        // For each concept, fetch name, price, and first imageUrl, and attach keywords for filtering
        concepts_same = await Promise.all(results.entities.map(async (entity, index) => {
            // Remove embedding from the returned object
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { embedding, concept_image_id, keywords: conceptKeywords, ...rest } = entity;

            // Fetch concept info and first image
            let name: string | null = null;
            let price: number | null = null;
            let imageUrl: string | null = null;
            let keywords: string[] = Array.isArray(conceptKeywords) ? conceptKeywords.map((k: any) => String(k).toLowerCase()) : [];
            if (concept_image_id) {
                    // Sử dụng repository với relations để tránh lỗi joinColumns
                    const conceptWithImage = await this.conceptVectorRepository.manager.getRepository(ServiceConcept).findOne({
                        where: { id: concept_image_id },
                        relations: ['images'],
                        order: { images: { createdAt: 'ASC' } }
                    });
                    if (conceptWithImage) {
                        name = conceptWithImage.name ?? null;
                        price = conceptWithImage.price ?? null;
                        if (Array.isArray(conceptWithImage.images) && conceptWithImage.images.length > 0 && conceptWithImage.images[0]?.imageUrl) {
                            imageUrl = conceptWithImage.images[0].imageUrl;
                        }
                        // Nếu ServiceConcept có keywords riêng, có thể lấy thêm ở đây nếu cần
                    }
            }
            return {
                ...rest,
                concept_image_id,
                name,
                price,
                imageUrl,
                keywords,
                relevanceScore: parseFloat(results.raw[index].relevance_score),
                distance: parseFloat(results.raw[index].distance)
            };
        }));

        // Nếu trong keywords có "nữ" và không có "trẻ em", chỉ trả về concept gần nhất thỏa mãn điều kiện này
        const femaleNotChild = concepts_same.filter(c =>
            Array.isArray(c.keywords) &&
            c.keywords.includes('nữ') &&
            !c.keywords.includes('trẻ em')
        );
        if (femaleNotChild.length > 0) {
            // Sắp xếp theo relevanceScore giảm dần, distance tăng dần
            femaleNotChild.sort((a, b) => b.relevanceScore - a.relevanceScore || a.distance - b.distance);
            concepts_same = [femaleNotChild[0]];
        }


        if (!concepts_same || concepts_same.length === 0) {
            return {
                success: false,
                data: {
                    analysis,
                    concepts_same: []
                },
                metadata: {
                    filename: file.originalname,
                    size: file.size,
                    mimeType: file.mimetype,
                    processingTime: Date.now() - startTime,
                    message: 'Không tìm thấy concept phù hợp với ảnh này.'
                }
            };
        }
        return {
            success: true,
            data: {
                analysis,
                concepts_same
            },
            metadata: {
                filename: file.originalname,
                size: file.size,
                mimeType: file.mimetype,
                processingTime: Date.now() - startTime
            }
        };
    }
    // #endregion


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

    async generateConceptVector(image: Express.Multer.File, concept_image_id: string): Promise<ConceptVector> {
        // Generate keywords from image
        const keywords = await this.generateKeywordsFromImage(image);
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
        let conceptVector = await this.conceptVectorRepository.findOne({ where: { concept_image_id } });
        if (!conceptVector) {
            conceptVector = this.conceptVectorRepository.create({
                concept_image_id,
                keywords,
                embedding,
            });
        } else {
            conceptVector.keywords = keywords;
            conceptVector.embedding = embedding;
        }

        return await this.conceptVectorRepository.save(conceptVector);

    }

    private async generateKeywordsFromImage(image: Express.Multer.File): Promise<string[]> {
        try {
            const model = await this.initializeModel();

            // Convert image to base64
            const imageData = {
                inlineData: {
                    data: image.buffer.toString('base64'),
                    mimeType: image.mimetype
                }
            };

            const prompt = `Bạn là chuyên gia nhiếp ảnh và AI phân tích hình ảnh. Hãy phân tích thật kỹ bức ảnh này và liệt kê 5-10 từ khóa (keyword) chuyên ngành, ngắn gọn, chính xác, mô tả rõ ràng nhất về:
1. Chủ thể (nếu là người: xác định rõ giới tính nam, nữ, trẻ em, người lớn, nhóm, hoặc cả hai; nếu là cảnh: mô tả loại cảnh vật, địa điểm, môi trường cụ thể)
2. Thể loại ảnh (ví dụ: chân dung, phong cảnh, đời thường, nghệ thuật, sự kiện...)
3. Phong cách, cảm xúc, ánh sáng, màu sắc nổi bật, bố cục, kỹ thuật đặc biệt nếu có
4. Tuyệt đối không dùng từ chung chung như "ảnh", "hình", "photo", "picture", "nice", "beautiful"...
5. Chỉ sử dụng các thuật ngữ chuyên ngành nhiếp ảnh, không thêm bất kỳ văn bản nào khác ngoài danh sách từ khóa, phân tách bằng dấu phẩy.`;

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

    /**
    * Kiểm tra prompt có phải hỏi về dịch vụ không
    */
    private isServicePrompt(prompt?: string): boolean {
        if (!prompt) return false;
        const serviceKeywords = [
            'dịch vụ gì', 'có những dịch vụ', 'service', 'các dịch vụ', 'danh sách dịch vụ',
            'bên bạn có dịch vụ', 'show dịch vụ', 'liệt kê dịch vụ', 'gói dịch vụ', 'package', 'service list'
        ];
        const promptRaw = prompt.toLowerCase();
        // Fuzzy match đơn giản
        return serviceKeywords.some(kw => promptRaw.includes(kw));
    }

}