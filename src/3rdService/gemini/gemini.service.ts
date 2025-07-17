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

            // Keywords chi tiết cho CON NGƯỜI
            const peopleKeywords = [
                // Giới tính & độ tuổi
                'nữ', 'nam', 'girl', 'boy', 'woman', 'man', 'người', 'person', 'people', 'human',
                'trẻ em', 'children', 'kid', 'child', 'thiếu niên', 'teenager', 'teen', 'adult', 'người lớn',
                'bé', 'baby', 'infant', 'newborn', 'trẻ sơ sinh', 'toddler', 'bé yêu',
                'người cao tuổi', 'elderly', 'senior', 'grandmother', 'grandfather', 'bà', 'ông',

                // Loại chụp người
                'portrait', 'chân dung', 'headshot', 'selfie', 'group photo', 'group', 'nhóm',
                'family', 'gia đình', 'couple', 'cặp đôi', 'duo', 'team', 'đội nhóm',

                // Sự kiện & dịp đặc biệt
                'wedding', 'cưới', 'bride', 'cô dâu', 'groom', 'chú rể', 'engagement', 'đính hôn',
                'maternity', 'bầu bí', 'mang thai', 'pregnancy', 'thai sản',
                'graduation', 'tốt nghiệp', 'birthday', 'sinh nhật', 'anniversary', 'kỷ niệm',

                // Phong cách & thể loại
                'fashion', 'thời trang', 'model', 'modeling', 'beauty', 'makeup', 'trang điểm',
                'cosplay', 'costume', 'trang phục', 'áo dài', 'traditional dress',
                'street style', 'đường phố', 'casual', 'formal', 'trang trọng',

                // Cảm xúc & biểu cảm
                'smile', 'cười', 'laugh', 'happy', 'vui vẻ', 'sad', 'buồn', 'serious', 'nghiêm túc',
                'emotion', 'cảm xúc', 'expression', 'biểu cảm', 'eyes', 'mắt', 'face', 'khuôn mặt'
            ];

            // Keywords chi tiết cho CON VẬT
            const animalKeywords = [
                // Thú cưng phổ biến
                'pet', 'thú cưng', 'domestic animal', 'động vật nuôi',
                'cat', 'mèo', 'kitten', 'mèo con', 'feline', 'persian cat', 'british shorthair',
                'dog', 'chó', 'puppy', 'chó con', 'canine', 'golden retriever', 'husky', 'poodle',
                'rabbit', 'thỏ', 'bunny', 'hamster', 'chuột hamster', 'guinea pig',
                'bird', 'chim', 'parrot', 'vẹt', 'canary', 'chim cảnh',

                // Động vật hoang dã
                'wildlife', 'động vật hoang dã', 'wild animal', 'safari',
                'elephant', 'voi', 'lion', 'sư tử', 'tiger', 'hổ', 'leopard', 'báo',
                'bear', 'gấu', 'wolf', 'sói', 'fox', 'cáo', 'deer', 'hươu',
                'monkey', 'khỉ', 'gorilla', 'đười ươi', 'panda', 'gấu trúc',

                // Động vật biển
                'marine animal', 'động vật biển', 'fish', 'cá', 'dolphin', 'cá heo',
                'whale', 'cá voi', 'shark', 'cá mập', 'sea turtle', 'rùa biển',

                // Côn trùng & động vật nhỏ
                'insect', 'côn trùng', 'butterfly', 'bướm', 'bee', 'ong', 'spider', 'nhện',
                'lizard', 'thằn lằn', 'snake', 'rắn', 'frog', 'ếch',

                // Hành vi động vật
                'playing', 'chơi đùa', 'sleeping', 'ngủ', 'eating', 'ăn', 'running', 'chạy',
                'flying', 'bay', 'swimming', 'bơi', 'hunting', 'săn mồi', 'cute', 'dễ thương',
                'animal portrait', 'chân dung động vật', 'animal behavior', 'hành vi động vật'
            ];

            // Keywords chi tiết cho CẢNH VẬT & THIÊN NHIÊN
            const landscapeKeywords = [
                // Địa hình & cảnh quan
                'landscape', 'phong cảnh', 'scenery', 'cảnh đẹp', 'natural scenery', 'cảnh thiên nhiên',
                'mountain', 'núi', 'hill', 'đồi', 'valley', 'thung lũng', 'canyon', 'hẻm núi',
                'beach', 'bãi biển', 'ocean', 'đại dương', 'sea', 'biển', 'lake', 'hồ',
                'river', 'sông', 'stream', 'suối', 'waterfall', 'thác nước', 'pond', 'ao',
                'forest', 'rừng', 'jungle', 'rừng nhiệt đới', 'woods', 'khu rừng',
                'desert', 'sa mạc', 'field', 'cánh đồng', 'meadow', 'đồng cỏ',
                'island', 'đảo', 'archipelago', 'quần đảo', 'peninsula', 'bán đảo',

                // Thời tiết & khí hậu
                'sunrise', 'bình minh', 'sunset', 'hoàng hôn', 'dawn', 'rạng đông', 'dusk', 'chạng vạng',
                'cloudy', 'nhiều mây', 'storm', 'bão', 'rain', 'mưa', 'snow', 'tuyết',
                'fog', 'sương mù', 'mist', 'sương', 'rainbow', 'cầu vồng',
                'sunny', 'nắng', 'clear sky', 'trời trong', 'blue sky', 'trời xanh',

                // Thực vật
                'tree', 'cây', 'flower', 'hoa', 'grass', 'cỏ', 'leaf', 'lá',
                'cherry blossom', 'hoa anh đào', 'lotus', 'hoa sen', 'sunflower', 'hoa hướng dương',
                'garden', 'vườn', 'park', 'công viên', 'botanical', 'thực vật học',

                // Môi trường ngoài trời
                'outdoor', 'ngoài trời', 'nature', 'thiên nhiên', 'wilderness', 'hoang dã',
                'countryside', 'nông thôn', 'rural', 'vùng quê', 'natural', 'tự nhiên',
                'environment', 'môi trường', 'ecosystem', 'hệ sinh thái',

                // Kiến trúc & công trình
                'architecture', 'kiến trúc', 'building', 'tòa nhà', 'skyscraper', 'tòa nhà chọc trời',
                'bridge', 'cầu', 'tower', 'tháp', 'castle', 'lâu đài', 'temple', 'đền',
                'church', 'nhà thờ', 'pagoda', 'chùa', 'monument', 'tượng đài',
                'cityscape', 'cảnh thành phố', 'urban', 'đô thị', 'street', 'đường phố'
            ];

            // Keywords chi tiết cho ĐỒ VẬT & SẢN PHẨM
            const objectKeywords = [
                // Đồ vật sinh hoạt
                'object', 'đồ vật', 'item', 'vật phẩm', 'thing', 'stuff', 'belongings', 'đồ đạc',
                'furniture', 'nội thất', 'chair', 'ghế', 'table', 'bàn', 'bed', 'giường',
                'lamp', 'đèn', 'mirror', 'gương', 'clock', 'đồng hồ', 'vase', 'lọ hoa',

                // Đồ ăn & thức uống
                'food', 'đồ ăn', 'meal', 'bữa ăn', 'dish', 'món ăn', 'cuisine', 'ẩm thực',
                'fruit', 'trái cây', 'apple', 'táo', 'orange', 'cam', 'banana', 'chuối',
                'vegetable', 'rau củ', 'tomato', 'cà chua', 'carrot', 'cà rốt',
                'bread', 'bánh mì', 'cake', 'bánh', 'coffee', 'cà phê', 'tea', 'trà',
                'wine', 'rượu vang', 'beer', 'bia', 'cocktail', 'đồ uống pha chế',
                'dessert', 'tráng miệng', 'chocolate', 'sô cô la', 'ice cream', 'kem',

                // Sản phẩm & hàng hóa
                'product', 'sản phẩm', 'merchandise', 'hàng hóa', 'goods', 'commodity',
                'still life', 'tĩnh vật', 'product photography', 'chụp sản phẩm',
                'commercial', 'thương mại', 'advertising', 'quảng cáo', 'marketing',

                // Công nghệ & thiết bị
                'technology', 'công nghệ', 'device', 'thiết bị', 'gadget', 'đồ chơi công nghệ',
                'phone', 'điện thoại', 'computer', 'máy tính', 'laptop', 'máy tính xách tay',
                'camera', 'máy ảnh', 'headphone', 'tai nghe', 'watch', 'đồng hồ đeo tay',

                // Phương tiện & xe cộ
                'vehicle', 'phương tiện', 'car', 'ô tô', 'motorcycle', 'xe máy',
                'bicycle', 'xe đạp', 'truck', 'xe tải', 'bus', 'xe buýt',
                'boat', 'thuyền', 'ship', 'tàu', 'airplane', 'máy bay',

                // Quần áo & phụ kiện
                'clothing', 'quần áo', 'fashion item', 'vật phẩm thời trang',
                'shoes', 'giày', 'bag', 'túi', 'hat', 'mũ', 'glasses', 'kính',
                'jewelry', 'trang sức', 'watch', 'đồng hồ', 'accessory', 'phụ kiện',

                // Đồ chơi & giải trí
                'toy', 'đồ chơi', 'game', 'trò chơi', 'book', 'sách', 'magazine', 'tạp chí',
                'music instrument', 'nhạc cụ', 'guitar', 'đàn guitar', 'piano', 'đàn piano',

                // Văn phòng phẩm & học tập
                'stationery', 'văn phòng phẩm', 'pen', 'bút', 'pencil', 'bút chì',
                'notebook', 'sổ tay', 'paper', 'giấy', 'document', 'tài liệu',

                // Đồ trang trí & nghệ thuật
                'decoration', 'đồ trang trí', 'artwork', 'tác phẩm nghệ thuật',
                'painting', 'tranh', 'sculpture', 'điêu khắc', 'craft', 'thủ công',
                'antique', 'đồ cổ', 'vintage', 'cổ điển', 'collectible', 'đồ sưu tập'
            ];

            // Cải thiện: Tăng threshold và thêm semantic filtering
            const RELEVANCE_THRESHOLD = 0.4; // Tăng từ 0.1 lên 0.4 để chỉ lấy matches tốt

            // Phân loại ảnh input dựa trên keywords
            const inputImageType = this.categorizeImageByKeywords(keywords, peopleKeywords, animalKeywords, landscapeKeywords, objectKeywords);
            this.logger.debug(`Image categorized as: ${inputImageType}, keywords: ${keywords.join(', ')}`);

            const hasGoodMatches = concepts_same.some(c => c.relevanceScore > RELEVANCE_THRESHOLD);

            if (!hasGoodMatches) {
                this.logger.debug(`No concepts with good relevance scores. Best score: ${Math.max(...concepts_same.map(c => c.relevanceScore))}`);
                // Jump to fallback logic
                concepts_same = [];
            } else {
                // Filter với logic thông minh hơn
                concepts_same = concepts_same.filter(c => {
                    // Điều kiện 1: Relevance score đủ cao
                    if (c.relevanceScore <= RELEVANCE_THRESHOLD) {
                        return false;
                    }

                    // Điều kiện 2: Semantic filtering - loại bỏ concepts không phù hợp với loại ảnh
                    const conceptType = this.categorizeConceptByName(c.name || '');

                    // Nếu ảnh là động vật nhưng concept là người -> loại bỏ
                    if (inputImageType === 'animal' && conceptType === 'people') {
                        this.logger.debug(`Filtered out people concept "${c.name}" for animal image`);
                        return false;
                    }

                    // Nếu ảnh là người nhưng concept là động vật -> loại bỏ  
                    if (inputImageType === 'people' && conceptType === 'animal') {
                        this.logger.debug(`Filtered out animal concept "${c.name}" for people image`);
                        return false;
                    }

                    return true;
                });

                this.logger.debug(`After semantic filtering: ${concepts_same.length} concepts remaining`);
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
                const prompt = `Vai trò: Bạn là một AI phân tích hình ảnh chuyên sâu, có kiến thức sâu rộng về nhiếp ảnh, lịch sử nghệ thuật, và ký hiệu học văn hóa. Nhiệm vụ của bạn là "giải phẫu" một bức ảnh và chuyển hóa mọi chi tiết hình ảnh thành một danh sách từ khóa (keywords) toàn diện và có cấu trúc.

Nhiệm vụ: Hãy phân tích thật kỹ lưGỡng bức ảnh được cung cấp và tạo ra một danh sách từ khóa chi tiết nhất có thể, bao quát tất cả các khía cạnh có thể quan sát và suy luận được. Hãy suy nghĩ vượt ra ngoài những gì hiển nhiên và đi sâu vào các chi tiết tinh tế.

Các hạng mục phân tích (Bắt buộc):

Chủ thể & Nội dung:

Con người: Xác định chi tiết giới tính, độ tuổi ước tính (trẻ sơ sinh, thiếu niên, người trưởng thành, người cao tuổi), dân tộc, trang phục (loại quần áo, phong cách, thương hiệu nếu có), phụ kiện, cảm xúc (vui, buồn, tức giận, trầm tư), hành động (đang chạy, ngồi, nói chuyện), và mối quan hệ giữa các chủ thể (gia đình, bạn bè, đồng nghiệp).

Động vật: Loài, giống, hành động.

Vật thể: Tên gọi của các vật thể chính và phụ, chất liệu (gỗ, kim loại, thủy tinh), tình trạng (mới, cũ, hỏng).

Bối cảnh & Môi trường:

Địa điểm: Cụ thể hóa địa điểm (ví dụ: thay vì "ngoài trời", hãy ghi "bãi biển nhiệt đới lúc hoàng hôn"; thay vì "trong nhà", hãy ghi "phòng khách phong cách tối giản").

Thời gian: Thời gian trong ngày (bình minh, giữa trưa, hoàng hôn, ban đêm), mùa trong năm.

Kiến trúc & Thiên nhiên: Phong cách kiến trúc (cổ điển, hiện đại, brutalism), các yếu tố tự nhiên (cây cối, núi, sông, hồ), thời tiết (nắng, mưa, tuyết, sương mù).

Bố cục & Kỹ thuật nhiếp ảnh:

Bố cục: Quy tắc 1/3, đường dẫn, đối xứng, khung trong khung (framing), tiền cảnh, trung cảnh, hậu cảnh.

Góc máy: Toàn cảnh, trung cảnh, cận cảnh, góc cao, góc thấp, góc nhìn ngang.

Kỹ thuật: Độ sâu trường ảnh (nông/sâu), bokeh, lia máy (panning), phơi sáng dài, phơi sáng kép, hiệu ứng lens flare.

Ánh sáng & Màu sắc:

Ánh sáng: Nguồn sáng (tự nhiên, nhân tạo), chất lượng ánh sáng (gắt, mềm, khuếch tán), hướng sáng (chính diện, ngược sáng, chiếu xiên), ánh sáng viền (rim light), giờ vàng (golden hour), giờ xanh (blue hour).

Màu sắc: Tông màu chủ đạo (ấm, lạnh), bảng màu (đơn sắc, tương phản, tương đồng), màu sắc nổi bật, độ bão hòa (cao/thấp), màu đen trắng.

Thể loại, Phong cách & Cảm xúc:

Thể loại: Chân dung, phong cảnh, đường phố, kiến trúc, thời trang, đời thường, trừu tượng, báo chí, macro.

Phong cách: Tối giản, cổ điển (vintage), hiện đại, tương lai (futuristic), lãng mạn, kịch tính, ma mị (moody), siêu thực.

Không khí & Cảm xúc: Yên bình, hỗn loạn, vui vẻ, u buồn, hoài niệm, năng động, tĩnh lặng, bí ẩn.

Khái niệm & Biểu tượng:

Phân tích các ý nghĩa ẩn dụ, biểu tượng văn hóa, chủ đề (ví dụ: sự cô đơn, tình yêu, sự xung đột, sự phát triển).

Yêu cầu định dạng đầu ra (Rất quan trọng):

CHỈ trả về một danh sách các từ khóa.

Mỗi từ khóa phải ngắn gọn, súc tích, viết bằng chữ thường.

Phân tách các từ khóa bằng dấu phẩy (,).

TUYỆT ĐỐI KHÔNG thêm bất kỳ đầu mục, số thứ tự, câu chữ giải thích, hay bất kỳ văn bản nào khác ngoài danh sách từ khóa.

TUYỆT ĐỐI KHÔNG sử dụng các từ chung chung như "ảnh", "hình", "photo", "picture", "nice", "beautiful", "nghệ thuật".`;

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

    /**
     * Tối ưu: Download ảnh từ URL và tạo concept vector
     */
    async regenerateVectorFromUrl(imageUrl: string, conceptImageId: string): Promise<void> {
        try {
            this.logger.log(`Downloading image from URL: ${imageUrl}`);

            // Download image from URL
            const response = await fetch(imageUrl);
            if (!response.ok) {
                throw new Error(`Failed to download image: ${response.statusText}`);
            }

            const buffer = Buffer.from(await response.arrayBuffer());

            // Create a mock file object
            const mockFile: Express.Multer.File = {
                fieldname: 'image',
                originalname: 'downloaded-image.jpg',
                encoding: '7bit',
                mimetype: 'image/jpeg',
                buffer: buffer,
                size: buffer.length,
                stream: null as any,
                destination: '',
                filename: '',
                path: ''
            };

            // Generate concept vector
            await this.generateConceptVector(mockFile, conceptImageId);
            this.logger.log(`Vector regenerated successfully for image: ${imageUrl}`);

        } catch (error) {
            this.logger.error(`Failed to regenerate vector from URL ${imageUrl}: ${error.message}`);
            // Don't throw to prevent the update process from failing
        }
    }

    /**
     * Tối ưu: Regenerate vectors for all existing images of a concept
     */
    async regenerateAllVectorsForConcept(conceptId: string): Promise<void> {
        try {
            this.logger.log(`Starting vector regeneration for all images of concept: ${conceptId}`);

            // Get all images for this concept
            const conceptImages = await this.serviceConceptImageRepository.find({
                where: { serviceConceptId: conceptId }
            });

            if (conceptImages.length === 0) {
                this.logger.log(`No images found for concept: ${conceptId}`);
                return;
            }

            this.logger.log(`Found ${conceptImages.length} images to regenerate vectors for`);

            // Regenerate vector for each image
            for (let i = 0; i < conceptImages.length; i++) {
                const image = conceptImages[i];
                this.logger.log(`Regenerating vector for image ${i + 1}/${conceptImages.length}: ${image.id}`);

                await this.regenerateVectorFromUrl(image.imageUrl, image.id);

                // Add small delay between requests to avoid overwhelming the API
                if (i < conceptImages.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

            this.logger.log(`Completed vector regeneration for concept: ${conceptId}`);

        } catch (error) {
            this.logger.error(`Failed to regenerate vectors for concept ${conceptId}: ${error.message}`);
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

    /**
     * Phân loại ảnh dựa trên keywords được tạo từ AI
     */
    private categorizeImageByKeywords(
        keywords: string[],
        peopleKeywords: string[],
        animalKeywords: string[],
        landscapeKeywords: string[],
        objectKeywords: string[]
    ): string {
        const keywordString = keywords.join(' ').toLowerCase();

        let peopleScore = 0;
        let animalScore = 0;
        let landscapeScore = 0;
        let objectScore = 0;

        // Đếm số lượng keywords match với từng category
        peopleKeywords.forEach(kw => {
            if (keywordString.includes(kw.toLowerCase())) {
                peopleScore++;
            }
        });

        animalKeywords.forEach(kw => {
            if (keywordString.includes(kw.toLowerCase())) {
                animalScore++;
            }
        });

        landscapeKeywords.forEach(kw => {
            if (keywordString.includes(kw.toLowerCase())) {
                landscapeScore++;
            }
        });

        objectKeywords.forEach(kw => {
            if (keywordString.includes(kw.toLowerCase())) {
                objectScore++;
            }
        });

        // Trả về category có score cao nhất
        const maxScore = Math.max(peopleScore, animalScore, landscapeScore, objectScore);

        if (maxScore === 0) {
            return 'unknown'; // Không xác định được loại
        }

        if (animalScore === maxScore) {
            return 'animal';
        }
        if (peopleScore === maxScore) {
            return 'people';
        }
        if (landscapeScore === maxScore) {
            return 'landscape';
        }
        if (objectScore === maxScore) {
            return 'object';
        }

        return 'unknown';
    }

    /**
     * Phân loại concept dựa trên tên concept
     */
    private categorizeConceptByName(conceptName: string): string {
        const name = conceptName.toLowerCase();

        // Keywords chi tiết để identify concept CON NGƯỜI
        const peopleIndicators = [
            // Giới tính & độ tuổi
            'bé yêu', 'bé', 'baby', 'newborn', 'trẻ sơ sinh', 'infant', 'toddler',
            'trẻ em', 'children', 'kid', 'child', 'thiếu niên', 'teenager', 'teen',
            'người', 'nam', 'nữ', 'girl', 'boy', 'woman', 'man', 'adult', 'người lớn',
            'elderly', 'senior', 'grandmother', 'grandfather', 'bà', 'ông',

            // Loại chụp & sự kiện
            'portrait', 'chân dung', 'headshot', 'selfie', 'family', 'gia đình',
            'couple', 'cặp đôi', 'group', 'nhóm', 'team', 'đội nhóm',
            'wedding', 'cưới', 'bride', 'cô dâu', 'groom', 'chú rể', 'engagement', 'đính hôn',
            'maternity', 'bầu bí', 'mang thai', 'pregnancy', 'thai sản',
            'graduation', 'tốt nghiệp', 'birthday', 'sinh nhật', 'anniversary', 'kỷ niệm',

            // Phong cách
            'beauty', 'fashion', 'thời trang', 'model', 'modeling', 'makeup', 'trang điểm',
            'cosplay', 'costume', 'trang phục', 'áo dài', 'traditional dress',
            'street style', 'casual', 'formal', 'trang trọng'
        ];

        // Keywords chi tiết để identify concept CON VẬT
        const animalIndicators = [
            // Thú cưng
            'pet', 'thú cưng', 'domestic animal', 'động vật nuôi',
            'cat', 'mèo', 'kitten', 'mèo con', 'feline', 'persian', 'british shorthair',
            'dog', 'chó', 'puppy', 'chó con', 'canine', 'golden retriever', 'husky', 'poodle',
            'rabbit', 'thỏ', 'bunny', 'hamster', 'guinea pig', 'bird', 'chim', 'parrot', 'vẹt',

            // Động vật hoang dã
            'wildlife', 'động vật hoang dã', 'wild animal', 'safari', 'animal',
            'elephant', 'voi', 'lion', 'sư tử', 'tiger', 'hổ', 'bear', 'gấu',
            'monkey', 'khỉ', 'panda', 'gấu trúc', 'deer', 'hươu',

            // Động vật biển & khác
            'fish', 'cá', 'dolphin', 'cá heo', 'whale', 'cá voi', 'marine animal',
            'insect', 'côn trùng', 'butterfly', 'bướm', 'động vật', 'animal portrait'
        ];

        // Keywords chi tiết để identify concept CẢNH VẬT & KIẾN TRÚC
        const landscapeIndicators = [
            // Cảnh quan thiên nhiên
            'landscape', 'phong cảnh', 'scenery', 'cảnh đẹp', 'natural scenery',
            'mountain', 'núi', 'hill', 'đồi', 'beach', 'bãi biển', 'ocean', 'biển',
            'lake', 'hồ', 'river', 'sông', 'waterfall', 'thác', 'forest', 'rừng',
            'sunset', 'hoàng hôn', 'sunrise', 'bình minh', 'nature', 'thiên nhiên',

            // Kiến trúc & công trình
            'architecture', 'kiến trúc', 'building', 'tòa nhà', 'bridge', 'cầu',
            'tower', 'tháp', 'castle', 'lâu đài', 'temple', 'đền', 'church', 'nhà thờ',
            'pagoda', 'chùa', 'cityscape', 'cảnh thành phố', 'urban', 'đô thị',

            // Môi trường
            'outdoor', 'ngoài trời', 'countryside', 'nông thôn', 'park', 'công viên',
            'garden', 'vườn', 'street', 'đường phố'
        ];

        // Keywords chi tiết để identify concept ĐỒ VẬT & SẢN PHẨM
        const objectIndicators = [
            // Sản phẩm & thương mại
            'product', 'sản phẩm', 'still life', 'tĩnh vật', 'commercial', 'thương mại',
            'merchandise', 'hàng hóa', 'advertising', 'quảng cáo',

            // Đồ ăn & thức uống
            'food', 'đồ ăn', 'cuisine', 'ẩm thực', 'fruit', 'trái cây', 'cake', 'bánh',
            'coffee', 'cà phê', 'wine', 'rượu', 'dessert', 'tráng miệng',

            // Công nghệ & thiết bị
            'technology', 'công nghệ', 'device', 'thiết bị', 'phone', 'điện thoại',
            'computer', 'máy tính', 'camera', 'máy ảnh', 'watch', 'đồng hồ',

            // Phương tiện & xe cộ
            'vehicle', 'phương tiện', 'car', 'ô tô', 'motorcycle', 'xe máy',
            'bicycle', 'xe đạp', 'boat', 'thuyền', 'airplane', 'máy bay',

            // Thời trang & phụ kiện
            'fashion item', 'shoes', 'giày', 'bag', 'túi', 'jewelry', 'trang sức',
            'clothing', 'quần áo', 'accessory', 'phụ kiện',

            // Nội thất & trang trí
            'furniture', 'nội thất', 'decoration', 'trang trí', 'artwork', 'nghệ thuật',
            'antique', 'đồ cổ', 'vintage', 'cổ điển'
        ];

        // Check animal indicators first (most specific)
        for (const indicator of animalIndicators) {
            if (name.includes(indicator)) {
                return 'animal';
            }
        }

        // Check people indicators
        for (const indicator of peopleIndicators) {
            if (name.includes(indicator)) {
                return 'people';
            }
        }

        // Check landscape/architecture indicators
        for (const indicator of landscapeIndicators) {
            if (name.includes(indicator)) {
                return 'landscape';
            }
        }

        // Check object/product indicators
        for (const indicator of objectIndicators) {
            if (name.includes(indicator)) {
                return 'object';
            }
        }

        return 'unknown';
    }
}
