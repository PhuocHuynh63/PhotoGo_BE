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
// Import a Type-Only Location to avoid conflicts
import type { Location } from '../../modules/locations/entities/location.entity';

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
    async generateText(prompt: string): Promise<IGeminiResponse<any>> {
        const startTime = Date.now();
        if (this.isSuggestConceptPrompt(prompt) || this.isServicePrompt(prompt)) {
            // Use injected repository
            let concepts = await this.serviceConceptRepository.find({
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
                    concepts: selected.map(concept => ({
                        conceptId: concept.id,
                        name: concept.name ?? null,
                        price: concept.price ?? null,
                        imageUrl: Array.isArray(concept.images) && concept.images.length > 0 ? concept.images[0].imageUrl : null
                    }))
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

    //#region Concept Vector Generation
    async analyzeImageWithConcepts(
        file: Express.Multer.File,
        prompt?: string
    ): Promise<IGeminiResponse<any>> {
        const startTime = Date.now();
        const model = await this.initializeModel(GeminiModel.GEMINI_2_0_FLASH_EXP_IMAGE_GENERATION);
        const imageData = { inlineData: { data: file.buffer.toString('base64'), mimeType: file.mimetype } };
        const analysisPrompt = `${this.systemContext}\nPhân tích bức ảnh này và cung cấp:\n1. Mô tả tổng quan\n2. Phân tích kỹ thuật (bố cục, ánh sáng, màu sắc)\n3. Gợi ý cải thiện\n${prompt || ''}`;
        const result = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: analysisPrompt }, imageData] }] });
        const analysis = await this.parseImageAnalysis(result.response.text());

        const keywords = await this.generateKeywordsFromImage(file);
        const queryEmbedding = await this.generateEmbedding(keywords.join(' '));
        if (!Array.isArray(queryEmbedding) || queryEmbedding.length !== 768) {
            throw new Error(`Invalid query embedding: must be an array of 768 numbers`);
        }

        const queryBuilder = this.conceptVectorRepository.createQueryBuilder('conceptVector');
        queryBuilder
            .select('conceptVector')
            .addSelect(`(CASE WHEN EXISTS (SELECT 1 FROM unnest(conceptVector.keywords) keyword WHERE keyword = ANY(:keywords)) THEN 1 ELSE 0 END * 0.4 + (1 - (conceptVector.embedding <-> :queryEmbedding::vector)) * 0.6)::float as relevance_score`)
            .addSelect('(conceptVector.embedding <-> :queryEmbedding::vector)::float as distance')
            .setParameter('keywords', keywords)
            .setParameter('queryEmbedding', `[${queryEmbedding.join(',')}]`)
            .orderBy('relevance_score', 'DESC')
            .limit(5);
        const results = await queryBuilder.getRawAndEntities();

        let concepts_same = await Promise.all(results.entities.map(async (entity, index) => {
            const { embedding, ...rest } = entity;
            let name: string | null = null;
            let price: number | null = null;
            let imageUrl: string | null = null;
            let vendorSlug: string | null = null;
            let vendorLocations: Location[] | null = null;
            let vendorId: string | null = null;

            if (entity.concept_image_id) {
                const conceptImage = await this.serviceConceptImageRepository.findOne({ where: { id: entity.concept_image_id } });

                if (conceptImage?.serviceConceptId) {
                    const conceptWithImage = await this.serviceConceptRepository.findOne({
                        where: { id: conceptImage.serviceConceptId },
                        relations: ['images', 'servicePackage', 'servicePackage.vendor', 'servicePackage.vendor.locations'],
                        order: { images: { createdAt: 'ASC' } }
                    });

                    if (conceptWithImage) {
                        name = conceptWithImage.name ?? null;
                        price = conceptWithImage.price ?? null;
                        imageUrl = conceptWithImage.images?.[0]?.imageUrl ?? null;

                        if (conceptWithImage.servicePackage?.vendor) {
                            vendorSlug = conceptWithImage.servicePackage.vendor.slug ?? null;
                            vendorLocations = conceptWithImage.servicePackage.vendor.locations ?? null;
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
                location: vendorLocations,
                vendorId,
                keywords: Array.isArray(entity.keywords) ? entity.keywords.map(k => String(k).toLowerCase()) : [],
                relevanceScore: parseFloat(results.raw[index].relevance_score),
                distance: parseFloat(results.raw[index].distance)
            };
        }));

        // ✅ IMPROVEMENT V2: Stricter category-based filtering.
        const peopleKeywords = ['nữ', 'nam', 'trẻ em', 'người', 'portrait', 'chân dung', 'group', 'person', 'people', 'beauty shot', 'cosplay', 'cặp đôi', 'cưới'];
        const animalKeywords = ['mèo', 'chó', 'thú cưng', 'pet', 'animal', 'cat', 'dog'];
        const landscapeKeywords = ['phong cảnh', 'landscape', 'cảnh vật', 'nature', 'outdoor', 'ngoài trời', 'thiên nhiên', 'kiến trúc'];
        const objectKeywords = ['still life', 'food photography', 'sản phẩm', 'trái cây', 'đồ vật', 'product', 'cam'];

        const isInputPeople = keywords.some(k => peopleKeywords.includes(k));
        const isInputAnimal = keywords.some(k => animalKeywords.includes(k));
        const isInputLandscape = keywords.some(k => landscapeKeywords.includes(k));
        const isInputObject = keywords.some(k => objectKeywords.includes(k));

        if (isInputPeople) {
            // If the input is a person, results MUST also be about people.
            concepts_same = concepts_same.filter(c =>
                c.keywords.some(k => peopleKeywords.includes(k)) &&
                !c.keywords.some(k => animalKeywords.includes(k) || objectKeywords.includes(k))
            );
        } else if (isInputAnimal) {
            // If the input is an animal, results MUST also be about animals.
            concepts_same = concepts_same.filter(c =>
                c.keywords.some(k => animalKeywords.includes(k)) &&
                !c.keywords.some(k => peopleKeywords.includes(k))
            );
        } else if (isInputObject) {
            // If the input is an object, results should be about objects.
            concepts_same = concepts_same.filter(c =>
                c.keywords.some(k => objectKeywords.includes(k)) &&
                !c.keywords.some(k => peopleKeywords.includes(k) || animalKeywords.includes(k))
            );
        } else if (isInputLandscape) {
            // If it's a landscape, filter out results with people, animals, or objects.
            concepts_same = concepts_same.filter(c =>
                c.keywords.some(k => landscapeKeywords.includes(k)) &&
                !c.keywords.some(k => peopleKeywords.includes(k) || animalKeywords.includes(k) || objectKeywords.includes(k))
            );
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
        return text.split(',').map(k => k.trim().toLowerCase()).filter(k => k.length > 0);
    }

    private async generateEmbedding(text: string): Promise<number[]> {
        try {
            const model = this.genAI.getGenerativeModel({ model: 'models/text-embedding-004' });
            const result = await model.embedContent(text);
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
