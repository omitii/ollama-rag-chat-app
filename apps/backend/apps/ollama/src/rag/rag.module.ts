import { Module } from '@nestjs/common';
import { RagController } from './rag.controller';
import { RagService } from './rag.service';
import { VectorStoreModule } from '../vector-store/vector-store.module';
import { OllamaService } from '../services/ollama.service';

@Module({
  imports: [VectorStoreModule],
  controllers: [RagController],
  providers: [RagService, OllamaService],
  exports: [RagService],
})
export class RagModule {} 