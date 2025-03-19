import { Controller, Post, Body, Res, HttpStatus, Logger, Get, Query, Param, Delete } from '@nestjs/common';
import { Response } from 'express';
import { OllamaRagService } from '../services/ollama-rag.service';
import { DataIngestionService } from '../data-ingestion/data-ingestion.service';
import { WebScraperService } from '../data-ingestion/web-scraper.service';
import { RagQueryDto } from '../dto/rag-query.dto';
import { OllamaService } from '../services/ollama.service';
import { UrlReaderService } from '../services/url-reader.service';

@Controller('ollama')
export class OllamaController {
  private readonly logger = new Logger(OllamaController.name);

  constructor(
    private readonly ollamaService: OllamaService,
    private readonly ollamaRagService: OllamaRagService,
    private readonly dataIngestionService: DataIngestionService,
    private readonly webScraperService: WebScraperService,
    private readonly urlReaderService: UrlReaderService,
  ) {}

  /**
   * Legacy endpoint for Ollama generation without RAG
   */
  @Post('generate')
  async generate(@Body() data: any) {
    try {
      const result = await this.ollamaService.generate(data);
      return result;
    } catch (error) {
      this.logger.error(`Error generating response: ${error.message}`);
      throw error;
    }
  }

  /**
   * Legacy endpoint for Ollama streaming without RAG
   */
  @Post('generate-stream')
  async generateStream(@Body() data: any, @Res() response: Response) {
    try {
      const stream = await this.ollamaService.generateStream(data);

      response.setHeader('Content-Type', 'text/event-stream');
      response.setHeader('Cache-Control', 'no-cache');
      response.setHeader('Connection', 'keep-alive');

      stream.pipe(response);
      
      stream.on('end', () => {
        response.end();
      });
      
      stream.on('error', (error) => {
        this.logger.error(`Stream error: ${error.message}`);
        response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          error: 'Stream error occurred',
        });
      });
    } catch (error) {
      this.logger.error(`Error in generate-stream: ${error.message}`);
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: error.message,
      });
    }
  }

  /**
   * RAG-enabled endpoint for generation
   */
  @Post('rag/generate')
  async generateWithRag(@Body() data: RagQueryDto) {
    try {
      if (data.useRag) {
        this.logger.log(`Using RAG for generation with model: ${data.model}`);
        const result = await this.ollamaRagService.generateWithRag({
          prompt: data.prompt,
          model: data.model,
          stream: false,
        });
        return result;
      } else {
        this.logger.log(`Using normal generation with model: ${data.model}`);
        const result = await this.ollamaRagService.generateWithoutRag({
          prompt: data.prompt,
          model: data.model,
          stream: false,
        });
        return result;
      }
    } catch (error) {
      this.logger.error(`Error in RAG generation: ${error.message}`);
      throw error;
    }
  }

  /**
   * RAG-enabled endpoint for streaming
   */
  @Post('rag/generate-stream')
  async generateRagStream(@Body() data: RagQueryDto, @Res() response: Response) {
    try {
      let stream;
      
      if (data.useRag) {
        this.logger.log(`Using RAG for streaming with model: ${data.model}`);
        stream = await this.ollamaRagService.generateWithRag({
          prompt: data.prompt,
          model: data.model,
          stream: true,
        });
      } else {
        this.logger.log(`Using normal generation for streaming with model: ${data.model}`);
        stream = await this.ollamaRagService.generateWithoutRag({
          prompt: data.prompt,
          model: data.model,
          stream: true,
        });
      }

      response.setHeader('Content-Type', 'text/event-stream');
      response.setHeader('Cache-Control', 'no-cache');
      response.setHeader('Connection', 'keep-alive');

      stream.data.pipe(response);
      
      stream.data.on('end', () => {
        response.end();
      });
      
      stream.data.on('error', (error) => {
        this.logger.error(`Stream error: ${error.message}`);
        response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          error: 'Stream error occurred',
        });
      });
    } catch (error) {
      this.logger.error(`Error in RAG stream: ${error.message}`);
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: error.message,
      });
    }
  }

  /**
   * Ingest a website for RAG
   */
  @Post('ingest/website')
  async ingestWebsite(@Body() data: { url: string; title?: string }) {
    try {
      const { url, title } = data;
      const documentId = await this.dataIngestionService.ingestWebsite(url, { title });
      return { success: true, documentId };
    } catch (error) {
      this.logger.error(`Error ingesting website: ${error.message}`);
      throw error;
    }
  }

  /**
   * Scrape and ingest a website with all its linked pages
   */
  @Post('ingest/scrape')
  async scrapeWebsite(
    @Body() data: {
      url: string;
      maxPages?: number;
      maxDepth?: number;
      sameDomain?: boolean;
    },
  ) {
    try {
      const { url, maxPages, maxDepth, sameDomain } = data;
      const documentIds = await this.webScraperService.scrapeWebsite(url, {
        maxPages,
        maxDepth,
        sameDomain,
      });
      return {
        success: true,
        documentCount: documentIds.length,
        documentIds,
      };
    } catch (error) {
      this.logger.error(`Error scraping website: ${error.message}`);
      throw error;
    }
  }

  /**
   * Ingest text content
   */
  @Post('ingest/text')
  async ingestText(@Body() data: { text: string; title: string; source?: string }) {
    try {
      const { text, title, source } = data;
      const documentId = await this.dataIngestionService.ingestText(text, { title, source });
      return { success: true, documentId };
    } catch (error) {
      this.logger.error(`Error ingesting text: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a document
   */
  @Delete('documents/:id')
  async deleteDocument(@Param('id') id: string) {
    try {
      await this.dataIngestionService.deleteDocument(id);
      return { success: true };
    } catch (error) {
      this.logger.error(`Error deleting document: ${error.message}`);
      throw error;
    }
  }

  /**
   * Read a URL and answer a question based on its content
   */
  @Post('read-url')
  async readUrlAndAnswer(@Body() data: { url: string; question: string }) {
    try {
      this.logger.log(`Reading URL and answering question: ${data.url}, ${data.question}`);
      const response = await this.urlReaderService.readUrlAndAnswer(data.url, data.question);
      return { response };
    } catch (error) {
      this.logger.error(`Error in read-url endpoint: ${error.message}`);
      throw error;
    }
  }
} 