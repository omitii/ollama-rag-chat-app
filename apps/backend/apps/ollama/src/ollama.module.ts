import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { OllamaController } from './controllers/ollama.controller';
import { OllamaService } from './services/ollama.service';
import { OllamaRagService } from './services/ollama-rag.service';
import { VectorStoreModule } from './vector-store/vector-store.module';
import { DataIngestionModule } from './data-ingestion/data-ingestion.module';
import { WebScraperService } from './data-ingestion/web-scraper.service';
import { RagModule } from './rag/rag.module';
import { UrlReaderService } from './services/url-reader.service';

@Module({
  imports: [
    HttpModule,
    VectorStoreModule,
    DataIngestionModule,
    RagModule
  ],
  controllers: [OllamaController],
  providers: [OllamaService, OllamaRagService, WebScraperService, UrlReaderService],
})
export class OllamaModule {}
