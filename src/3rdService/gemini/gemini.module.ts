import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GeminiService } from './gemini.service';
import { GeminiController } from './gemini.controller';
import geminiConfig from './config/gemini.config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ConceptVector } from '../../modules/service-package/entities/concept-vector.entity';
import { ServiceConcept } from '../../modules/service-package/entities/service-concept.entity';
import { ServiceConceptImage } from '../../modules/service-package/entities/service-concept-image.entity';

@Module({
    imports: [
        ConfigModule.forFeature(geminiConfig),
        TypeOrmModule.forFeature([ConceptVector, ServiceConcept, ServiceConceptImage]),
    ],
    controllers: [GeminiController],
    providers: [GeminiService],
    exports: [GeminiService],
})
export class GeminiModule { } 