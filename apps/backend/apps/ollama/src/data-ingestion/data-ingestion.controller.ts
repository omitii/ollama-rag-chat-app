import { Body, Controller, Delete, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DataIngestionService } from './data-ingestion.service';

class IngestWebsiteDto {
  url: string;
  title?: string;
}

class IngestTextDto {
  text: string;
  title: string;
  source?: string;
}

@ApiTags('Data Ingestion')
@Controller('data-ingestion')
export class DataIngestionController {
  constructor(private readonly dataIngestionService: DataIngestionService) {}

  @Post('website')
  @ApiOperation({ summary: 'Ingest content from a website URL' })
  @ApiResponse({ status: 200, description: 'Returns the document ID' })
  async ingestWebsite(@Body() dto: IngestWebsiteDto): Promise<{ documentId: string }> {
    const documentId = await this.dataIngestionService.ingestWebsite(dto.url, { title: dto.title });
    return { documentId };
  }

  @Post('text')
  @ApiOperation({ summary: 'Ingest raw text content' })
  @ApiResponse({ status: 200, description: 'Returns the document ID' })
  async ingestText(@Body() dto: IngestTextDto): Promise<{ documentId: string }> {
    const documentId = await this.dataIngestionService.ingestText(dto.text, {
      title: dto.title,
      source: dto.source,
    });
    return { documentId };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a document by ID' })
  @ApiResponse({ status: 200, description: 'Document deleted successfully' })
  async deleteDocument(@Param('id') id: string): Promise<{ success: boolean }> {
    await this.dataIngestionService.deleteDocument(id);
    return { success: true };
  }
} 