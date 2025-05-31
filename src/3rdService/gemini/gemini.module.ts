import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GeminiService } from './gemini.service';
import { GeminiController } from './gemini.controller';
import geminiConfig from './config/gemini.config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConceptVector } from '../../modules/service-package/entities/concept-vector.entity';

@Module({
    imports: [
        ConfigModule.forFeature(geminiConfig),
        TypeOrmModule.forFeature([ConceptVector]),
    ],
    controllers: [GeminiController],
    providers: [GeminiService],
    exports: [GeminiService],
})
export class GeminiModule { } 