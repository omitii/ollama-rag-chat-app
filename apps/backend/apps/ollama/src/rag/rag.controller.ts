import { Body, Controller, Post, Res, StreamableFile } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { RagService } from './rag.service';
import { RagQueryDto as LocalRagQueryDto } from './dto/rag-query.dto';
import { RagResponseDto } from './dto/rag-response.dto';
import { RagQueryDto as GlobalRagQueryDto } from '../dto/rag-query.dto';

@ApiTags('RAG')
@Controller('rag')
export class RagController {
  private readonly defaultModel = 'llama3.2:latest';
  constructor(private readonly ragService: RagService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate a completion with RAG' })
  @ApiResponse({ status: 200, description: 'Return the completion response', type: RagResponseDto })
  async generate(@Body() dto: LocalRagQueryDto): Promise<RagResponseDto> {
    // Map to the global DTO format
    const globalDto: GlobalRagQueryDto = {
      prompt: dto.prompt,
      model: dto.model || this.defaultModel,
      stream: false,
      useRag: dto.useRag ?? true,
      maxResults: dto.maxResults
    };
    
    return this.ragService.generateResponse(globalDto);
  }

  @Post('generate-stream')
  @ApiOperation({ summary: 'Generate a completion with RAG as a stream' })
  @ApiResponse({ status: 200, description: 'Stream the completion response' })
  async generateStream(
    @Body() dto: LocalRagQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    // Map to the global DTO format
    const globalDto: GlobalRagQueryDto = {
      prompt: dto.prompt,
      model: dto.model || this.defaultModel,
      stream: true,
      useRag: dto.useRag ?? true,
      maxResults: dto.maxResults
    };
    
    const { responseStream } = await this.ragService.generateResponseStream(globalDto);
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    return new StreamableFile(responseStream);
  }
} 