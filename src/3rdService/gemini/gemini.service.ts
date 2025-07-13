import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { IGeminiResponse, ImageAnalysisResponse, TextAnalysisResponse } from './dto/gemini.response.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConceptVector } from '../../modules/service-package/entities/concept-vector.entity';
import { GeminiModel } from './dto/gemini.enums';
import { ServiceConcept } from '../../modules/service-package/entities/service-concept.entity';
import { ServiceConceptImage } from '../../modules/service-package/entities/service-concept-image.entity';

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
        // ✅ ADDED: Inject ServiceConceptRepository
        @InjectRepository(ServiceConcept)
        private serviceConceptRepository: Repository<ServiceConcept>,
        // ✅ ADDED: Inject ServiceConceptImageRepository
        @InjectRepository(ServiceConceptImage)
        private serviceConceptImageRepository: Repository<ServiceConceptImage>,
    ) {
        const apiKey = this.configService.get<string>('gemini.apiKey');
        if (!apiKey) {
            this.logger.error('GEMINI_API_KEY is not defined in environment variables');
            throw new Error('GEMINI_API_KEY is required');
        }

        this.genAI = new GoogleGenerativeAI(apiKey);

        this.modelName = this.configService.get<string>('gemini.model') || 'models/gemini-2.0-flash-001';
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

    private isSuggestConceptPrompt(prompt?: string): boolean {
        if (!prompt) return false;
        function removeVietnameseTones(str: string): string {
            return str.normalize('NFD')
                .replace(/\p{Diacritic}/gu, '')
                .replace(/đ/g, 'd').replace(/Đ/g, 'D');
        }
        const suggestKeywords = [
            'gợi ý concept', 'tư vấn concept', 'concept phù hợp', 'suggest concept', 'recommend concept',
            'gợi ý concept nào', 'tư vấn concept nào', 'concept nào phù hợp', 'concept suggestion', 'concept advice'
        ];
        const promptRaw = prompt.toLowerCase();
        const promptNoTone = removeVietnameseTones(promptRaw);
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
        const shortPattern = /\b(goi\s*y|gợi\s*y|tu\s*van|tư\s*vấn)?\s*(conc(ept)?|con|c)\b/i;

        if (shortPattern.test(promptRaw) || shortPattern.test(promptNoTone)) return true;

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
        if (this.isSuggestConceptPrompt(prompt) || this.isServicePrompt(prompt)) {
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
    // ✅ UPDATED METHOD
    async analyzeImageWithConcepts(
        file: Express.Multer.File,
        prompt?: string
    ): Promise<IGeminiResponse<any>> {
        const startTime = Date.now();

        // 1. Image Analysis
        const model = await this.initializeModel(GeminiModel.GEMINI_2_0_FLASH_EXP_IMAGE_GENERATION);
        const imageData = {
            inlineData: {
                data: file.buffer.toString('base64'),
                mimeType: file.mimetype
            }
        };
        const analysisPrompt = `${this.systemContext}\nPhân tích bức ảnh này và cung cấp:\n1. Mô tả tổng quan\n2. Phân tích kỹ thuật (bố cục, ánh sáng, màu sắc)\n3. Gợi ý cải thiện\n${prompt || ''}`;
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: analysisPrompt }, imageData] }]
        });
        const analysis = await this.parseImageAnalysis(result.response.text());

        // 2. Concept Vector Search
        const keywords = await this.generateKeywordsFromImage(file);
        const queryEmbedding = await this.generateEmbedding(keywords.join(' '));
        if (!Array.isArray(queryEmbedding) || queryEmbedding.length !== 768) {
            throw new Error(`Invalid query embedding: must be an array of 768 numbers`);
        }

        const queryBuilder = this.conceptVectorRepository.createQueryBuilder('conceptVector');
        queryBuilder
            .select('conceptVector')
            .addSelect(`(CASE WHEN EXISTS (SELECT 1 FROM unnest(conceptVector.keywords) keyword WHERE keyword = ANY(:keywords)) THEN 1 ELSE 0 END * 0.4 + (1 - (conceptVector.embedding <=> :queryEmbedding::vector)) * 0.6)::float as relevance_score`)
            .addSelect('(conceptVector.embedding <-> :queryEmbedding::vector)::float as distance')
            .setParameter('keywords', keywords)
            .setParameter('queryEmbedding', `[${queryEmbedding.join(',')}]`)
            .orderBy('relevance_score', 'DESC')
            .limit(5);
        const results = await queryBuilder.getRawAndEntities();

        let concepts_same = await Promise.all(results.entities.map(async (entity, index) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { embedding, ...rest } = entity;
            let name: string | null = null;
            let price: number | null = null;
            let imageUrl: string | null = null;
            let vendorSlug: string | null = null;
            let location: string | null = null;
            let vendorId: string | null = null;

            if (entity.concept_image_id) {
                // Use injected repository
                const conceptImage = await this.serviceConceptImageRepository.findOne({ where: { id: entity.concept_image_id } });

                if (conceptImage?.serviceConceptId) {
                    // Use injected repository and fix nested relations path
                    const conceptWithImage = await this.serviceConceptRepository.findOne({
                        where: { id: conceptImage.serviceConceptId },
                        relations: [
                            'images',
                            'servicePackage',
                            'servicePackage.vendor',
                            'servicePackage.vendor.locations'
                        ],
                        order: { images: { createdAt: 'ASC' } }
                    });

                    if (conceptWithImage) {
                        name = conceptWithImage.name ?? null;
                        price = conceptWithImage.price ?? null;
                        imageUrl = conceptWithImage.images?.[0]?.imageUrl ?? null;

                        // Use optional chaining to prevent errors
                        if (conceptWithImage.servicePackage?.vendor) {
                            vendorSlug = conceptWithImage.servicePackage.vendor.slug ?? null;
                            location = conceptWithImage.servicePackage.vendor.locations?.[0]?.address ?? null;
                            vendorId = conceptWithImage.servicePackage.vendor.id ?? null;
                        }
                    }
                }
            }

            return {
                ...rest,
                name,
                price,
                imageUrl,
                vendorSlug,
                location,
                vendorId,
                keywords: Array.isArray(entity.keywords) ? entity.keywords.map(k => String(k).toLowerCase()) : [],
                relevanceScore: parseFloat(results.raw[index].relevance_score),
                distance: parseFloat(results.raw[index].distance)
            };
        }));

        // Concept filtering logic remains the same
        const landscapeKeywords = ['phong cảnh', 'landscape', 'cảnh vật', 'nature', 'outdoor', 'ngoài trời', 'thiên nhiên'];
        const peopleKeywords = ['nữ', 'nam', 'trẻ em', 'người', 'portrait', 'chân dung', 'group', 'person', 'people', 'beauty shot'];
        const isLandscape = keywords.some(k => landscapeKeywords.includes(k));
        const hasPeopleKeyword = keywords.some(k => peopleKeywords.includes(k));

        if (isLandscape) {
            concepts_same = concepts_same.filter(c =>
                c.keywords.some(k => landscapeKeywords.includes(k)) &&
                !c.keywords.some(k => peopleKeywords.includes(k))
            );
        } else if (!hasPeopleKeyword) {
            concepts_same = concepts_same.filter(c => !c.keywords.some(k => peopleKeywords.includes(k)));
        } else {
            const femaleNotChild = concepts_same.filter(c =>
                c.keywords.includes('nữ') && !c.keywords.includes('trẻ em')
            );
            if (femaleNotChild.length > 0) {
                femaleNotChild.sort((a, b) => b.relevanceScore - a.relevanceScore || a.distance - b.distance);
                concepts_same = [femaleNotChild[0]];
            }
        }

        if (!concepts_same || concepts_same.length === 0) {
            return {
                success: false,
                data: { analysis, concepts_same: [] },
                metadata: {
                    filename: file.originalname, size: file.size, mimeType: file.mimetype,
                    processingTime: Date.now() - startTime,
                    message: 'Không tìm thấy concept phù hợp với ảnh này.'
                }
            };
        }
        return {
            success: true,
            data: { analysis, concepts_same },
            metadata: {
                filename: file.originalname, size: file.size, mimeType: file.mimetype,
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
        const keywords = await this.generateKeywordsFromImage(image);
        this.logger.log(`Generated keywords: ${keywords.join(', ')}`);

        const embedding = await this.generateEmbedding(keywords.join(' '));
        this.logger.log(`Generated embedding length: ${embedding.length}`);
        this.logger.log(`Generated embedding sample: ${embedding.slice(0, 10).join(', ')}...`);

        if (!Array.isArray(embedding) || embedding.length !== 768 || !embedding.every(val => typeof val === 'number' && !isNaN(val))) {
            throw new Error(`Invalid embedding: must be an array of 768 numbers`);
        }

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
        const model = await this.initializeModel();
        const imageData = {
            inlineData: {
                data: image.buffer.toString('base64'),
                mimeType: image.mimetype
            }
        };

        const prompt = `Bạn là chuyên gia nhiếp ảnh và AI phân tích hình ảnh. Hãy phân tích thật kỹ bức ảnh này và liệt kê 5-10 từ khóa (keyword) chuyên ngành, ngắn gọn, chính xác, mô tả rõ ràng nhất về:
1. Chủ thể chính (
nếu là người: xác định rõ giới tính nam, nữ, trẻ em, người lớn, nhóm; 
nếu là cảnh: mô tả loại cảnh vật, địa điểm, môi trường cụ thể)
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

        const keywords = text
            .split(',')
            .map(k => k.trim().toLowerCase())
            .filter(k => k.length > 0);

        return keywords;
    }

    private async generateEmbedding(text: string): Promise<number[]> {
        try {
            const model = await this.initializeModel();
            const prompt = `Generate a 768-dimensional embedding vector for this text: ${text}. Return only the array of numbers in JSON format, e.g., [0.1, 0.2, 0.3, ...].`;

            const result = await model.generateContent([prompt]);
            const response = await result.response;
            const responseText = response.text();

            this.logger.log(`Gemini API embedding response: ${responseText}`);

            try {
                let embedding = JSON.parse(responseText);
                if (embedding.every((val: any) => typeof val === 'string')) {
                    embedding = embedding.map((val: string) => parseFloat(val));
                }
                if (!Array.isArray(embedding) || embedding.length !== 768 || !embedding.every((val: any) => typeof val === 'number' && !isNaN(val))) {
                    throw new Error(`Invalid embedding format or length. Expected 768 numbers, got ${embedding.length}`);
                }
                return embedding;
            } catch (parseError) {
                this.logger.warn(`Failed to parse embedding response: ${parseError.message}, using fallback embedding`);
                const fallbackEmbedding = new Array(768).fill(0);
                const words = text.toLowerCase().split(/\s+/);
                words.forEach((word, index) => {
                    if (index < 768) {
                        fallbackEmbedding[index] = Math.min(word.length / 10, 1);
                    }
                });
                return fallbackEmbedding;
            }
        } catch (error) {
            this.logger.error(`Error generating embedding: ${error.message}`);
            return new Array(768).fill(0);
        }
    }

    private isServicePrompt(prompt?: string): boolean {
        if (!prompt) return false;
        const serviceKeywords = [
            'dịch vụ gì', 'có những dịch vụ', 'service', 'các dịch vụ', 'danh sách dịch vụ',
            'bên bạn có dịch vụ', 'show dịch vụ', 'liệt kê dịch vụ', 'gói dịch vụ', 'package', 'service list'
        ];
        const promptRaw = prompt.toLowerCase();
        return serviceKeywords.some(kw => promptRaw.includes(kw));
    }
}