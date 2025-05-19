import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GeminiService } from './gemini.service';
import { GeminiController } from './gemini.controller';
import geminiConfig from './config/gemini.config';

@Module({
    imports: [
        ConfigModule.forFeature(geminiConfig),
    ],
    controllers: [GeminiController],
    providers: [GeminiService],
    exports: [GeminiService],
})
export class GeminiModule { } 