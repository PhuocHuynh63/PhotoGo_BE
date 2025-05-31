import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pinecone } from '@pinecone-database/pinecone';

@Injectable()
export class PineconeService implements OnModuleInit {
  private readonly logger = new Logger(PineconeService.name);
  private pinecone: Pinecone;
  private index: any; // Lưu instance của index để tránh tạo lại nhiều lần
  private readonly indexName: string;

  constructor(private configService: ConfigService) {
    this.indexName = this.configService.get<string>('PINECONE_INDEX_NAME');
  }

  async onModuleInit() {
    try {
      this.pinecone = new Pinecone({
        apiKey: this.configService.get<string>('PINECONE_API_KEY'),
        // environment có thể không cần nếu dùng phiên bản mới nhất
        // environment: this.configService.get<string>('PINECONE_ENVIRONMENT'),
      });

      this.index = this.pinecone.Index(this.indexName);
      this.logger.log('Pinecone initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Pinecone', error);
      throw error;
    }
  }

  async upsertVectors(vectors: { id: string; values: number[]; metadata?: any }[]) {
    try {
      const response = await this.index.upsert(vectors);
      this.logger.log(`Upserted ${vectors.length} vectors successfully`);
      return response;
    } catch (error) {
      this.logger.error('Failed to upsert vectors', error);
      throw error;
    }
  }

  async queryVectors(queryVector: number[], topK: number = 10) {
    try {
      const results = await this.index.query({
        vector: queryVector,
        topK,
        includeMetadata: true,
      });
      this.logger.log(`Queried ${topK} nearest vectors successfully`);
      return results;
    } catch (error) {
      this.logger.error('Failed to query vectors', error);
      throw error;
    }
  }

  async deleteVectors(ids: string[]) {
    try {
      const response = await this.index.deleteMany(ids);
      this.logger.log(`Deleted ${ids.length} vectors successfully`);
      return response;
    } catch (error) {
      this.logger.error('Failed to delete vectors', error);
      throw error;
    }
  }
}