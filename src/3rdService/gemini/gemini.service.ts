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
import { ServiceConceptStatus } from '../../constants/servicePackage.enum';
import * as crypto from 'crypto';
// Import a Type-Only Location to avoid conflicts
import type { Location } from '../../modules/locations/entities/location.entity';

@Injectable()
export class GeminiService {
    private readonly logger = new Logger(GeminiService.name);
    private readonly genAI: GoogleGenerativeAI;
    private readonly modelName: string;
    private readonly generationConfig: any;
    private readonly safetySettings: any;
    // Tối ưu: Simple in-memory cache cho quick access
    private readonly cache = new Map<string, { data: any; expiry: number }>();
    private readonly CACHE_TTL = 3600000; // 1 hour

    // Tối ưu: Performance configs
    private readonly MAX_CONCURRENT_REQUESTS = 3;
    private readonly EMBEDDING_BATCH_SIZE = 10;
    private readonly RELEVANCE_THRESHOLD = 0.1;

    // Tối ưu: Image processing configs
    private readonly MAX_IMAGE_SIZE = 1024; // Max width/height in pixels
    private readonly IMAGE_QUALITY = 85; // JPEG quality for compression

    // Tối ưu: Request queue management
    private activeRequests = 0;
    private requestQueue: Array<() => Promise<any>> = [];

    // Tối ưu: Model caching
    private embeddingModel: any = null;

    private readonly systemContext = `
        Bạn là AI phân tích ảnh chuyên nghiệp của PhotoGo - nền tảng đặt lịch studio chụp ảnh.
        
        Nguyên tắc phân tích ảnh:
        - Phân tích kỹ thuật: bố cục, ánh sáng, màu sắc, composition
        - Đánh giá chất lượng nghệ thuật với tone thân thiện
        - Đưa ra gợi ý cải thiện cụ thể và khuyến khích
        - Chào hỏi ngắn gọn rồi đi thẳng vào phân tích
        
        Khi trả lời về dịch vụ:
        - Thông tin dựa trên dữ liệu thực tế của PhotoGo
        - Gợi ý concept, gói chụp có sẵn trong hệ thống
        - Ngôn ngữ thân thiện, nhiệt tình nhưng không dài dòng
        - Tập trung vào giải pháp nhiếp ảnh thực tế
    `;

    constructor(
        private configService: ConfigService,
        @InjectRepository(ConceptVector)
        private conceptVectorRepository: Repository<ConceptVector>,
        @InjectRepository(ServiceConcept)
        private serviceConceptRepository: Repository<ServiceConcept>,
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
        return this.genAI.getGenerativeModel({
            model: modelName || this.modelName,
            generationConfig: {
                temperature: 0.7,
                topP: 0.8,
                topK: 40,
                maxOutputTokens: 2048,
            },
        });
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
            'gợi ý concept nào', 'tư vấn concept nào', 'concept nào phù hợp', 'concept suggestion', 'concept advice',
            'gợi ý', 'tư vấn', 'suggest', 'recommend', 'recommendation', 'advice'
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
        const shortPattern = /\b(goi\s*y|gợi\s*y|tu\s*van|tư\s*vấn)?\s*(conc(ept)?|con|c)?\b/i;

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
    async generateText(prompt: string): Promise<IGeminiResponse<any>> {
        const startTime = Date.now();
        if (this.isSuggestConceptPrompt(prompt) || this.isServicePrompt(prompt)) {
            // Use injected repository
            let concepts = await this.serviceConceptRepository.find({
                relations: ['images', 'servicePackage', 'servicePackage.vendor', 'servicePackage.vendor.locations'],
                order: { createdAt: 'ASC' },
                take: 5
            });
            let withImage = concepts.filter(c => Array.isArray(c.images) && c.images.length > 0 && c.images[0]?.imageUrl);
            let withoutImage = concepts.filter(c => !Array.isArray(c.images) || c.images.length === 0 || !c.images[0]?.imageUrl);
            let selected = [...withImage.slice(0, 2), ...withoutImage.slice(0, 1)];
            if (selected.length < 3) {
                selected = [...withImage, ...withoutImage].slice(0, 3);
            }

            // Transform concepts to match concepts_same format from analyzeImageWithConcepts
            const concepts_same = selected.map(concept => ({
                id: concept.id,
                name: concept.name ?? null,
                price: concept.price ?? null,
                imageUrl: Array.isArray(concept.images) && concept.images.length > 0 ? concept.images[0].imageUrl : null,
                vendorSlug: concept.servicePackage?.vendor?.slug ?? null,
                location: concept.servicePackage?.vendor?.locations ?? null,
                vendorId: concept.servicePackage?.vendor?.id ?? null,
                conceptId: concept.id,
                relevanceScore: 1.0, // Default high relevance for manual suggestions
                distance: 0.0 // Default low distance for manual suggestions
            }));

            const model = this.genAI.getGenerativeModel({
                model: GeminiModel.GEMINI_2_0_FLASH_EXP_IMAGE_GENERATION,
                generationConfig: { ...this.generationConfig, maxOutputTokens: 512 },
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
                    concepts_same: concepts_same
                },
                metadata: { processingTime: Date.now() - startTime }
            };
        }

        const model = await this.initializeModel();
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
            metadata: { processingTime: Date.now() - startTime }
        };
    }
    //#endregion

    //#region Image Processing Optimization
    /**
     * Tối ưu: Resize và compress ảnh để tăng tốc API calls
     */
    private async optimizeImageForProcessing(file: Express.Multer.File): Promise<Buffer> {
        try {
            const sharp = require('sharp');

            // Check if image needs resizing
            const metadata = await sharp(file.buffer).metadata();
            const { width = 0, height = 0 } = metadata;

            if (width <= this.MAX_IMAGE_SIZE && height <= this.MAX_IMAGE_SIZE && file.size < 500000) {
                // Image is already small enough
                return file.buffer;
            }

            this.logger.debug(`Optimizing image: ${width}x${height} (${file.size} bytes) -> max ${this.MAX_IMAGE_SIZE}px`);

            // Resize và compress
            const optimizedBuffer = await sharp(file.buffer)
                .resize(this.MAX_IMAGE_SIZE, this.MAX_IMAGE_SIZE, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .jpeg({ quality: this.IMAGE_QUALITY })
                .toBuffer();

            this.logger.debug(`Image optimized: ${file.size} -> ${optimizedBuffer.length} bytes (${Math.round((1 - optimizedBuffer.length / file.size) * 100)}% reduction)`);
            return optimizedBuffer;

        } catch (error) {
            this.logger.warn(`Failed to optimize image: ${error.message}, using original`);
            return file.buffer;
        }
    }
    //#endregion

    //#region Helper Methods
    private async generateImageAnalysis(imageData: any, prompt?: string): Promise<any> {
        const model = await this.initializeModel(GeminiModel.GEMINI_2_0_FLASH_EXP_IMAGE_GENERATION);
        const analysisPrompt = `${this.systemContext}

Xin chào! Mình sẽ giúp bạn phân tích bức ảnh này một cách chuyên nghiệp:

1. **Mô tả tổng quan**: Nội dung chính của ảnh
2. **Phân tích kỹ thuật**: 
   - Bố cục và composition
   - Ánh sáng và exposure
   - Màu sắc và tông màu
3. **Gợi ý cải thiện**: Những điểm có thể nâng cao để ảnh đẹp hơn


${prompt || ''}`;

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: analysisPrompt }, imageData] }]
        });

        return await this.parseImageAnalysis(result.response.text());
    }

    // Tối ưu: Cache utilities
    private createFileHash(buffer: Buffer): string {
        return crypto.createHash('md5').update(buffer).digest('hex');
    }

    private getCached<T>(key: string): T | null {
        const cached = this.cache.get(key);
        if (cached && cached.expiry > Date.now()) {
            return cached.data as T;
        }
        if (cached) {
            this.cache.delete(key); // Remove expired
        }
        return null;
    }

    private setCached<T>(key: string, data: T): void {
        this.cache.set(key, {
            data,
            expiry: Date.now() + this.CACHE_TTL
        });
    }

    // Tối ưu: Enhanced error handling
    private async executeWithFallback<T>(
        operation: () => Promise<T>,
        fallback: () => T,
        errorMessage: string
    ): Promise<T> {
        try {
            return await operation();
        } catch (error) {
            this.logger.error(`${errorMessage}: ${error.message}`);
            return fallback();
        }
    }

    // Tối ưu: Queue management for API rate limiting
    private async executeWithQueue<T>(operation: () => Promise<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            const execute = async () => {
                if (this.activeRequests >= this.MAX_CONCURRENT_REQUESTS) {
                    this.requestQueue.push(execute);
                    return;
                }

                this.activeRequests++;
                try {
                    const result = await operation();
                    resolve(result);
                } catch (error) {
                    reject(error);
                } finally {
                    this.activeRequests--;
                    if (this.requestQueue.length > 0) {
                        const nextRequest = this.requestQueue.shift();
                        nextRequest?.();
                    }
                }
            };
            execute();
        });
    }

    // Tối ưu: Optimized vector search with better query strategy
    private async performOptimizedVectorSearch(queryEmbedding: number[], keywords: string[], limit: number = 5) {
        // Use more efficient query with proper indexing hints
        const queryBuilder = this.conceptVectorRepository.createQueryBuilder('cv');

        return queryBuilder
            .select([
                'cv.id',
                'cv.concept_image_id',
                'cv.createdAt',
                'cv.updatedAt'
            ])
            .addSelect(`(
                CASE WHEN EXISTS (
                    SELECT 1 FROM unnest(cv.keywords) keyword 
                    WHERE keyword = ANY(:keywords)
                ) THEN 1 ELSE 0 END * 0.4 + 
                (1 - (cv.embedding <-> :queryEmbedding::vector)) * 0.6
            )::float as relevance_score`)
            .addSelect('(cv.embedding <-> :queryEmbedding::vector)::float as distance')
            .where('cv.embedding <-> :queryEmbedding::vector < :threshold', {
                threshold: 1.0 // Pre-filter with distance threshold
            })
            .setParameter('keywords', keywords)
            .setParameter('queryEmbedding', `[${queryEmbedding.join(',')}]`)
            .orderBy('relevance_score', 'DESC')
            .limit(limit)
            .getRawAndEntities();
    }
    //#endregion

    //#region Batch Processing Methods
    /**
     * Tối ưu: Batch process multiple images for better performance
     */
    async batchAnalyzeImages(files: Express.Multer.File[], prompt?: string): Promise<IGeminiResponse<any>[]> {
        const batchSize = this.EMBEDDING_BATCH_SIZE;
        const results: IGeminiResponse<any>[] = [];

        for (let i = 0; i < files.length; i += batchSize) {
            const batch = files.slice(i, i + batchSize);
            const batchPromises = batch.map(file =>
                this.executeWithQueue(() => this.analyzeImageWithConcepts(file, prompt))
            );

            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);

            // Brief pause between batches to respect rate limits
            if (i + batchSize < files.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        return results;
    }

    /**
     * Tối ưu: Batch generate embeddings for multiple texts
     */
    async batchGenerateEmbeddings(texts: string[]): Promise<number[][]> {
        const results: number[][] = [];

        for (const text of texts) {
            const embedding = await this.executeWithQueue(() => this.generateEmbedding(text));
            results.push(embedding);
        }

        return results;
    }
    //#endregion

    //#region Concept Vector Generation
    async analyzeImageWithConcepts(
        file: Express.Multer.File,
        prompt?: string
    ): Promise<IGeminiResponse<any>> {
        const startTime = Date.now();
        const metrics = {
            startTime,
            fileSize: file.size,
            mimeType: file.mimetype,
            fileName: file.originalname
        };

        try {
            // Tối ưu: Optimize image trước khi process
            const optimizedBuffer = await this.optimizeImageForProcessing(file);
            const optimizedFile = { ...file, buffer: optimizedBuffer };

            const model = await this.initializeModel(GeminiModel.GEMINI_2_0_FLASH_EXP_IMAGE_GENERATION);
            const imageData = { inlineData: { data: optimizedBuffer.toString('base64'), mimeType: 'image/jpeg' } };

            // Tối ưu: Chạy song song thay vì tuần tự
            const [analysis, keywords] = await Promise.all([
                this.generateImageAnalysis(imageData, prompt),
                this.generateKeywordsFromImage(optimizedFile)
            ]);

            const queryEmbedding = await this.generateEmbedding(keywords.join(' '));
            if (!Array.isArray(queryEmbedding) || queryEmbedding.length !== 768) {
                throw new Error(`Invalid query embedding: must be an array of 768 numbers`);
            }

            // Tối ưu: Use optimized vector search
            const results = await this.performOptimizedVectorSearch(queryEmbedding, keywords, 5);

            // Tối ưu: Single query thay vì N+1 queries
            const conceptImageIds = results.entities.map(e => e.concept_image_id).filter(id => id);

            let concepts_same: any[] = [];
            if (conceptImageIds.length > 0) {
                // Tối ưu: Parallel queries để giảm thời gian chờ
                const [conceptsData, hasGoodMatches] = await Promise.all([
                    // Query concept data
                    this.serviceConceptImageRepository
                        .createQueryBuilder('sci')
                        .leftJoinAndSelect('sci.serviceConcept', 'sc')
                        .leftJoinAndSelect('sc.servicePackage', 'sp')
                        .leftJoinAndSelect('sp.vendor', 'v')
                        .leftJoinAndSelect('v.locations', 'l')
                        .leftJoinAndSelect('sc.images', 'img')
                        .where('sci.id IN (:...ids)', { ids: conceptImageIds })
                        .orderBy('img.createdAt', 'ASC')
                        .getMany(),
                    // Check relevance scores in parallel
                    Promise.resolve(results.entities.some(e => parseFloat(results.raw.find(r => r.cv_id === e.id)?.relevance_score || '0') > this.RELEVANCE_THRESHOLD))
                ]);

                // Map results efficiently
                const conceptDataMap = new Map();
                conceptsData.forEach(sci => {
                    conceptDataMap.set(sci.id, {
                        conceptId: sci.serviceConceptId,
                        name: sci.serviceConcept?.name ?? null,
                        price: sci.serviceConcept?.price ?? null,
                        imageUrl: sci.serviceConcept?.images?.[0]?.imageUrl ?? null,
                        vendorSlug: sci.serviceConcept?.servicePackage?.vendor?.slug ?? null,
                        location: sci.serviceConcept?.servicePackage?.vendor?.locations ?? null,
                        vendorId: sci.serviceConcept?.servicePackage?.vendor?.id ?? null
                    });
                });

                concepts_same = results.entities.map((entity, index) => {
                    const { embedding, ...rest } = entity;
                    const conceptData = conceptDataMap.get(entity.concept_image_id) || {};

                    return {
                        ...rest,
                        ...conceptData,
                        conceptId: conceptData.conceptId || null,
                        relevanceScore: parseFloat(results.raw[index].relevance_score),
                        distance: parseFloat(results.raw[index].distance)
                    };
                });
            }

            const peopleKeywords = ['nữ', 'nam', 'trẻ em', 'người', 'portrait', 'chân dung', 'group', 'person', 'people', 'beauty shot', 'cosplay', 'cặp đôi', 'cưới'];
            const animalKeywords = ['mèo', 'chó', 'thú cưng', 'pet', 'animal', 'cat', 'dog'];
            const landscapeKeywords = ['phong cảnh', 'landscape', 'cảnh vật', 'nature', 'outdoor', 'ngoài trời', 'thiên nhiên', 'kiến trúc'];
            const objectKeywords = ['still life', 'food photography', 'sản phẩm', 'trái cây', 'đồ vật', 'product', 'cam'];

            // Tối ưu: Check relevance score trước khi filter - nếu tất cả đều có score thấp thì không phù hợp
            const RELEVANCE_THRESHOLD = 0.1;
            const hasGoodMatches = concepts_same.some(c => c.relevanceScore > RELEVANCE_THRESHOLD);

            if (!hasGoodMatches) {
                this.logger.debug(`No concepts with good relevance scores. Best score: ${Math.max(...concepts_same.map(c => c.relevanceScore))}`);
                // Jump to fallback logic
                concepts_same = [];
            } else {
                // Chỉ filter khi có matches tốt - simplified logic without keywords filtering
                // Relevance score đã tính toán semantic similarity và keyword matching trong query
                concepts_same = concepts_same.filter(c => c.relevanceScore > this.RELEVANCE_THRESHOLD);
            }

            if (!concepts_same || concepts_same.length === 0) {
                // Khi không tìm thấy concept phù hợp, lấy một số concept ngẫu nhiên từ hệ thống
                const fallbackConcepts = await this.serviceConceptRepository.find({
                    relations: ['images', 'servicePackage', 'servicePackage.vendor', 'servicePackage.vendor.locations'],
                    where: { status: ServiceConceptStatus.ACTIVE },
                    order: { createdAt: 'DESC' },
                    take: 5
                });

                const fallbackConceptsSame = await Promise.all(fallbackConcepts.map(async (concept) => {
                    let vendorSlug: string | null = null;
                    let vendorLocations: Location[] | null = null;
                    let vendorId: string | null = null;

                    if (concept.servicePackage?.vendor) {
                        vendorSlug = concept.servicePackage.vendor.slug ?? null;
                        vendorLocations = concept.servicePackage.vendor.locations ?? null;
                        vendorId = concept.servicePackage.vendor.id ?? null;
                    }

                    return {
                        id: concept.id,
                        name: concept.name ?? null,
                        price: concept.price ?? null,
                        imageUrl: concept.images?.[0]?.imageUrl ?? null,
                        vendorSlug,
                        location: vendorLocations,
                        vendorId,
                        conceptId: concept.id,
                        relevanceScore: 0.5, // Lower relevance for fallback
                        distance: 1.0 // Higher distance for fallback
                    };
                }));

                // Tạo prompt cho AI để giải thích tại sao không tìm thấy và gợi ý
                const model = await this.initializeModel(GeminiModel.GEMINI_2_0_FLASH_EXP_IMAGE_GENERATION);
                const imageData = { inlineData: { data: file.buffer.toString('base64'), mimeType: file.mimetype } };

                const fallbackPrompt = `${this.systemContext}

Xin chào! Mình đã phân tích ảnh này và có một vài thông tin để chia sẻ:

1. **Mô tả về ảnh**: Nội dung và đặc điểm chính
2. **Về việc tìm kiếm concept**: Tại sao không tìm thấy concept hoàn toàn phù hợp trong hệ thống
3. **Gợi ý tích cực**: PhotoGo có rất nhiều concept đa dạng và thú vị khác mà bạn có thể khám phá

Tone thân thiện, tích cực và khuyến khích.`;

                const fallbackResult = await model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: fallbackPrompt }, imageData] }]
                });

                const fallbackAnalysis = await this.parseImageAnalysis(fallbackResult.response.text());

                return {
                    success: true,
                    data: {
                        analysis: fallbackAnalysis,
                        concepts_same: fallbackConceptsSame,
                        isNoMatch: true,
                        suggestion: "Mặc dù không tìm thấy concept hoàn toàn phù hợp, PhotoGo có nhiều concept thú vị khác bạn có thể tham khảo!"
                    },
                    metadata: {
                        filename: file.originalname,
                        size: file.size,
                        mimeType: file.mimetype,
                        processingTime: Date.now() - startTime,
                        message: 'Không tìm thấy concept phù hợp hoàn toàn, đã gợi ý các concept khác.'
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
        } catch (error) {
            this.logger.error(`Error analyzing image with concepts: ${error.message}`, error.stack);
            return {
                success: false,
                data: null,
                metadata: {
                    ...metrics,
                    processingTime: Date.now() - startTime,
                    message: 'Lỗi phân tích ảnh với concept.'
                }
            };
        } finally {
            // Log performance metrics
            const finalMetrics = {
                ...metrics,
                processingTime: Date.now() - startTime,
                success: true
            };
            this.logger.log('Image analysis performance', finalMetrics);

            // Clear cache if it gets too large (simple memory management)
            if (this.cache.size > 1000) {
                const oldestKeys = Array.from(this.cache.keys()).slice(0, 500);
                oldestKeys.forEach(key => this.cache.delete(key));
                this.logger.debug('Cache cleanup: removed 500 oldest entries');
            }
        }
    }
    // #endregion

    private async parseImageAnalysis(text: string) {
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
        const suggestions: string[] = [];
        const lines = text.split('\n');
        for (const line of lines) {
            if (/suggestion|improvement|gợi ý|cải thiện/i.test(line)) {
                suggestions.push(line.trim());
            }
        }
        return suggestions;
    }

    private extractColors(text: string): string[] {
        const colorList = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'black', 'white', 'gray', 'brown', 'cyan', 'magenta'];
        const foundColors = colorList.filter(color => new RegExp(`\\b${color}\\b`, 'i').test(text));
        return foundColors;
    }

    private extractLighting(text: string): string {
        const lines = text.split('\n');
        for (const line of lines) {
            if (/lighting|ánh sáng/i.test(line)) {
                return line.trim();
            }
        }
        return '';
    }

    private extractComposition(text: string): string {
        const lines = text.split('\n');
        for (const line of lines) {
            if (/composition|bố cục/i.test(line)) {
                return line.trim();
            }
        }
        return '';
    }

    private async analyzeSentiment(text: string): Promise<string> {
        const positiveWords = ['beautiful', 'great', 'excellent', 'good', 'amazing', 'đẹp', 'tuyệt vời', 'xuất sắc', 'tốt'];
        const negativeWords = ['poor', 'bad', 'terrible', 'worst', 'horrible', 'tệ', 'xấu', 'dở'];
        const lowercaseText = text.toLowerCase();
        const positiveCount = positiveWords.filter(word => lowercaseText.includes(word)).length;
        const negativeCount = negativeWords.filter(word => lowercaseText.includes(word)).length;
        return positiveCount > negativeCount ? 'positive' : negativeCount > positiveCount ? 'negative' : 'neutral';
    }

    async generateConceptVector(image: Express.Multer.File, concept_image_id: string): Promise<ConceptVector> {
        const keywords = await this.generateKeywordsFromImage(image);
        this.logger.log(`Generated keywords: ${keywords.join(', ')}`);
        const embedding = await this.generateEmbedding(keywords.join(' '));
        this.logger.log(`Generated embedding length: ${embedding.length}`);
        if (!Array.isArray(embedding) || embedding.length !== 768 || !embedding.every(val => typeof val === 'number' && !isNaN(val))) {
            throw new Error(`Invalid embedding: must be an array of 768 numbers`);
        }
        let conceptVector = await this.conceptVectorRepository.findOne({ where: { concept_image_id } });
        if (!conceptVector) {
            conceptVector = this.conceptVectorRepository.create({ concept_image_id, keywords, embedding });
        } else {
            conceptVector.keywords = keywords;
            conceptVector.embedding = embedding;
        }
        return await this.conceptVectorRepository.save(conceptVector);
    }

    private async generateKeywordsFromImage(image: Express.Multer.File): Promise<string[]> {
        // Tối ưu: Check cache first
        const fileHash = this.createFileHash(image.buffer);
        const cacheKey = `keywords:${fileHash}`;
        const cached = this.getCached<string[]>(cacheKey);
        if (cached) {
            this.logger.debug(`Cache hit for keywords: ${fileHash}`);
            return cached;
        }

        return await this.executeWithFallback(
            async () => {
                const model = await this.initializeModel();
                const imageData = { inlineData: { data: image.buffer.toString('base64'), mimeType: image.mimetype } };
                const prompt = `Vai trò: AI phân tích ảnh chuyên sâu. Tạo danh sách từ khóa toàn diện từ ảnh.

Phân tích: Chủ thể, môi trường, kỹ thuật, ánh sáng, màu sắc, phong cách, cảm xúc.

Định dạng: CHỈ trả về từ khóa phân tách bằng dấu phẩy, viết thường, không giải thích.`;

                const result = await model.generateContent([prompt, imageData]);
                const text = result.response.text();
                if (!text) {
                    throw new Error('No text response from Gemini API');
                }
                const keywords = text.split(',').map(k => k.trim().toLowerCase()).filter(k => k.length > 0);

                // Cache the result
                this.setCached(cacheKey, keywords);
                return keywords;
            },
            () => {
                // Fallback keywords
                const fallbackKeywords = ['image', 'photo', 'general'];
                if (image.mimetype.includes('jpeg')) fallbackKeywords.push('jpeg', 'photography');
                this.logger.warn(`Using fallback keywords for: ${image.originalname}`);
                return fallbackKeywords;
            },
            'Gemini keyword generation failed'
        );
    }

    private async generateEmbedding(text: string): Promise<number[]> {
        try {
            // Tối ưu: Cache embedding model để tránh tạo mới mỗi lần
            if (!this.embeddingModel) {
                this.embeddingModel = this.genAI.getGenerativeModel({ model: 'models/text-embedding-004' });
            }

            const result = await this.embeddingModel.embedContent(text);
            const embedding = result.embedding.values;
            if (!Array.isArray(embedding) || embedding.length !== 768) {
                throw new Error(`Invalid embedding format or length. Expected 768 numbers, got ${embedding.length}`);
            }
            return embedding;
        } catch (error) {
            this.logger.error(`Error generating embedding: ${error.message}`);
            this.logger.warn(`Using fallback embedding for text: "${text}"`);
            const fallbackEmbedding = new Array(768).fill(0);
            const words = text.toLowerCase().split(/\s+/);
            words.forEach((word, index) => {
                if (index < 768) {
                    let hash = 0;
                    for (let i = 0; i < word.length; i++) {
                        hash = (hash << 5) - hash + word.charCodeAt(i);
                        hash |= 0;
                    }
                    fallbackEmbedding[index] = (hash % 2000 - 1000) / 1000;
                }
            });
            return fallbackEmbedding;
        }
    }

    //#region Database Optimization Helpers
    /**
     * Tối ưu: Suggest database indexes for better performance
     * Call this during app startup or maintenance
     */
    async suggestDatabaseOptimizations(): Promise<string[]> {
        const suggestions: string[] = [];

        try {
            // Check if vector index exists
            const vectorIndexExists = await this.conceptVectorRepository.query(`
                SELECT indexname FROM pg_indexes 
                WHERE tablename = 'concept_vector' 
                AND indexname LIKE '%embedding%'
            `);

            if (vectorIndexExists.length === 0) {
                suggestions.push('CREATE INDEX CONCURRENTLY idx_concept_vector_embedding ON concept_vector USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);');
            }

            // Check if keyword index exists
            const keywordIndexExists = await this.conceptVectorRepository.query(`
                SELECT indexname FROM pg_indexes 
                WHERE tablename = 'concept_vector' 
                AND indexname LIKE '%keywords%'
            `);

            if (keywordIndexExists.length === 0) {
                suggestions.push('CREATE INDEX CONCURRENTLY idx_concept_vector_keywords ON concept_vector USING GIN (keywords);');
            }

            // Check if composite index exists
            const compositeIndexExists = await this.conceptVectorRepository.query(`
                SELECT indexname FROM pg_indexes 
                WHERE tablename = 'concept_vector' 
                AND indexname LIKE '%concept_image_id%'
            `);

            if (compositeIndexExists.length === 0) {
                suggestions.push('CREATE INDEX CONCURRENTLY idx_concept_vector_concept_image_id ON concept_vector (concept_image_id);');
            }

        } catch (error) {
            this.logger.error(`Error checking database indexes: ${error.message}`);
        }

        return suggestions;
    }
    //#endregion

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
