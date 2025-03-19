import { CheerioWebBaseLoader } from '@langchain/community/document_loaders/web/cheerio';
import { Injectable, Logger } from '@nestjs/common';
import { VectorStoreService } from '../vector-store/vector-store.service';
import { Document } from '../vector-store/models/document.model';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DataIngestionService {
  private readonly logger = new Logger(DataIngestionService.name);

  constructor(private readonly vectorStoreService: VectorStoreService) {}

  /**
   * Ingest content from a website URL
   */
  async ingestWebsite(url: string, options: { title?: string } = {}): Promise<string> {
    try {
      this.logger.log(`Ingesting content from URL: ${url}`);
      
      // Load the web page
      const loader = new CheerioWebBaseLoader(url);
      const docs = await loader.load();
      
      if (docs.length === 0) {
        throw new Error('No content found on the webpage');
      }
      
      // Process the main document
      const mainDoc = docs[0];
      
      // Create document for vector store
      const document = new Document({
        id: uuidv4(),
        content: mainDoc.pageContent,
        metadata: {
          source: 'web',
          title: options.title || this.extractTitle(url, mainDoc.pageContent),
          url: url,
          createdAt: new Date(),
        },
      });
      
      // Add to vector store
      await this.vectorStoreService.addDocument(document);
      
      this.logger.log(`Successfully ingested content from ${url}`);
      return document.id;
    } catch (error) {
      this.logger.error(`Failed to ingest website: ${error.message}`);
      throw error;
    }
  }

  /**
   * Ingest content from a text file
   */
  async ingestFile(filePath: string, options: { title?: string } = {}): Promise<string> {
    try {
      this.logger.log(`Ingesting content from file: ${filePath}`);
      
      // Read file content
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Create document for vector store
      const document = new Document({
        id: uuidv4(),
        content: content,
        metadata: {
          source: 'file',
          title: options.title || path.basename(filePath),
          filePath: filePath,
          createdAt: new Date(),
        },
      });
      
      // Add to vector store
      await this.vectorStoreService.addDocument(document);
      
      this.logger.log(`Successfully ingested content from file ${filePath}`);
      return document.id;
    } catch (error) {
      this.logger.error(`Failed to ingest file: ${error.message}`);
      throw error;
    }
  }

  /**
   * Ingest content from raw text
   */
  async ingestText(text: string, options: { title: string, source?: string }): Promise<string> {
    try {
      if (!text || !options.title) {
        throw new Error('Text and title are required');
      }
      
      this.logger.log(`Ingesting text content with title: ${options.title}`);
      
      // Create document for vector store
      const document = new Document({
        id: uuidv4(),
        content: text,
        metadata: {
          source: options.source || 'manual',
          title: options.title,
          createdAt: new Date(),
        },
      });
      
      // Add to vector store
      await this.vectorStoreService.addDocument(document);
      
      this.logger.log(`Successfully ingested text content: ${options.title}`);
      return document.id;
    } catch (error) {
      this.logger.error(`Failed to ingest text: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a document from the vector store
   */
  async deleteDocument(documentId: string): Promise<void> {
    return this.vectorStoreService.deleteDocument(documentId);
  }

  /**
   * Extract title from URL or content
   */
  private extractTitle(url: string, content: string): string {
    // Try to extract title from content
    const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      return titleMatch[1].trim();
    }
    
    // If no title found, use URL
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url;
    }
  }
} 