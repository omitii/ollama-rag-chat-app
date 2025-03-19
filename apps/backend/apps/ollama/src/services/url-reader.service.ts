import { Injectable, Logger } from '@nestjs/common';
import { DataIngestionService } from '../data-ingestion/data-ingestion.service';
import { VectorStoreService } from '../vector-store/vector-store.service';
import { OllamaService } from './ollama.service';
import axios from 'axios';
import * as cheerio from 'cheerio';

@Injectable()
export class UrlReaderService {
  private readonly logger = new Logger(UrlReaderService.name);

  constructor(
    private readonly dataIngestionService: DataIngestionService,
    private readonly vectorStoreService: VectorStoreService,
    private readonly ollamaService: OllamaService,
  ) {}

  /**
   * Reads a URL, ingests the content, and answers a question based on it
   */
  async readUrlAndAnswer(url: string, question: string): Promise<string> {
    try {
      this.logger.log(`Processing URL: ${url}`);
      
      // Extract content from URL
      const { title, content } = await this.extractContentFromUrl(url);
      
      // Create a temporary document ID to track this ingestion
      const tempDocId = `temp-url-${Date.now()}`;
      
      // Create direct context (no need to wait for vector storage)
      const context = `
      The following information is from the URL: ${url}
      Title: ${title}
      
      Content:
      ${content}
      `;
      
      // Create an enhanced prompt that directly uses the extracted content
      const enhancedPrompt = `
      I want you to answer a question based on information from a web page I just read.
      
      ${context}
      
      Question: ${question}
      
      Please answer the question specifically using information from this web page. If the information doesn't contain the answer, say so clearly.
      `;
      
      // Generate response using the direct context
      const response = await this.ollamaService.generate({
        prompt: enhancedPrompt,
        model: 'llama3.2:latest',
        stream: false
      });
      
      // Asynchronously ingest this content into the vector store for future use
      this.dataIngestionService.ingestText(content, {
        title: title || url,
        source: url
      }).catch(err => this.logger.error(`Failed to ingest URL content into vector store: ${err.message}`));
      
      return response.response || 'I processed the URL but couldn\'t generate a response.';
    } catch (error) {
      this.logger.error(`Error reading URL and answering: ${error.message}`);
      return `I encountered an error while trying to read that URL: ${error.message}`;
    }
  }

  /**
   * Extract content from a URL
   */
  private async extractContentFromUrl(url: string): Promise<{ title: string; content: string }> {
    try {
      // Special handling for Wikipedia
      if (url.includes('wikipedia.org')) {
        return this.extractWikipediaContent(url);
      }
      
      // Generic extraction for other sites
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      
      // Remove script and style elements
      $('script, style, nav, footer, header, .navigation, .sidebar, .menu, .ad, .advertisement').remove();
      
      const title = $('title').text().trim() || 'Untitled Page';
      
      // Extract meaningful content
      let content = '';
      $('p, h1, h2, h3, h4, h5, h6, li').each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 20) { // Only include meaningful paragraphs
          content += text + '\n\n';
        }
      });
      
      return { title, content };
    } catch (error) {
      this.logger.error(`Failed to extract content from URL: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Special extraction for Wikipedia
   */
  private async extractWikipediaContent(url: string): Promise<{ title: string; content: string }> {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    
    // Remove unwanted elements
    $('.mw-editsection, .reference, #toc, .infobox, .sidebar, .navbox, .metadata').remove();
    
    const title = $('h1#firstHeading').text().trim();
    
    // Extract main content
    let content = '';
    
    // Process paragraphs in the main content
    $('#mw-content-text p').each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 20) {
        content += text + '\n\n';
      }
    });
    
    // Process sections
    $('#mw-content-text h2, #mw-content-text h3').each((_, el) => {
      const heading = $(el).find('.mw-headline').text().trim();
      if (heading) {
        content += `\n## ${heading}\n\n`;
        
        let currentEl = $(el).next();
        while (currentEl.length && !currentEl.is('h2, h3')) {
          if (currentEl.is('p') && currentEl.text().trim().length > 20) {
            content += currentEl.text().trim() + '\n\n';
          }
          currentEl = currentEl.next();
        }
      }
    });
    
    return { title, content };
  }
} 