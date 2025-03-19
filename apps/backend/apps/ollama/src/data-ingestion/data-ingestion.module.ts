import { Module } from '@nestjs/common';
import { DataIngestionController } from './data-ingestion.controller';
import { DataIngestionService } from './data-ingestion.service';
import { VectorStoreModule } from '../vector-store/vector-store.module';

@Module({
  imports: [VectorStoreModule],
  controllers: [DataIngestionController],
  providers: [DataIngestionService],
  exports: [DataIngestionService],
})
export class DataIngestionModule {} 