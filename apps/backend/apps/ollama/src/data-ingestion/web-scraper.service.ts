import { Injectable, Logger } from '@nestjs/common';
import { DataIngestionService } from './data-ingestion.service';
import { CheerioWebBaseLoader } from '@langchain/community/document_loaders/web/cheerio';
import * as cheerio from 'cheerio';
import axios from 'axios';

@Injectable()
export class WebScraperService {
  private readonly logger = new Logger(WebScraperService.name);

  constructor(private readonly dataIngestionService: DataIngestionService) {}

  /**
   * Scrape and ingest a website with its linked pages
   * @param baseUrl The starting URL to scrape
   * @param options Configuration options for the scraper
   */
  async scrapeWebsite(
    baseUrl: string,
    options: {
      maxPages?: number;
      maxDepth?: number;
      sameDomain?: boolean;
      includePatterns?: string[];
      excludePatterns?: string[];
    } = {},
  ): Promise<string[]> {
    const {
      maxPages = 20,
      maxDepth = 1,
      sameDomain = true,
      includePatterns = [],
      excludePatterns = [],
    } = options;

    this.logger.log(`Starting website scraping from: ${baseUrl}`);
    
    const visited = new Set<string>();
    const queue: Array<{ url: string; depth: number }> = [{ url: baseUrl, depth: 0 }];
    const documentIds: string[] = [];
    const baseUrlObj = new URL(baseUrl);
    
    while (queue.length > 0 && visited.size < maxPages) {
      const { url, depth } = queue.shift();
      
      // Skip if already visited or exceeds max depth
      if (visited.has(url) || depth > maxDepth) {
        continue;
      }
      
      // Mark as visited
      visited.add(url);
      
      try {
        // Ingest current page
        this.logger.log(`Scraping page ${visited.size}/${maxPages}: ${url}`);
        const documentId = await this.dataIngestionService.ingestWebsite(url);
        documentIds.push(documentId);
        
        // Don't extract more links if at max depth
        if (depth === maxDepth) {
          continue;
        }
        
        // Extract links from the page
        const links = await this.extractLinks(url);
        
        // Filter and add links to queue
        for (const link of links) {
          // Skip if already visited or in queue
          if (visited.has(link) || queue.some(item => item.url === link)) {
            continue;
          }
          
          const linkObj = new URL(link);
          
          // Check if same domain if required
          if (sameDomain && linkObj.hostname !== baseUrlObj.hostname) {
            continue;
          }
          
          // Check include/exclude patterns
          if (
            (includePatterns.length > 0 && !this.matchesAnyPattern(link, includePatterns)) ||
            (excludePatterns.length > 0 && this.matchesAnyPattern(link, excludePatterns))
          ) {
            continue;
          }
          
          queue.push({ url: link, depth: depth + 1 });
        }
      } catch (error) {
        this.logger.warn(`Error processing ${url}: ${error.message}`);
      }
    }
    
    this.logger.log(`Finished scraping. Processed ${visited.size} pages.`);
    return documentIds;
  }

  /**
   * Extract links from a webpage
   */
  private async extractLinks(url: string): Promise<string[]> {
    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      const links: string[] = [];
      
      $('a').each((_, element) => {
        const href = $(element).attr('href');
        if (href) {
          try {
            // Convert relative URLs to absolute
            const absoluteUrl = new URL(href, url).href;
            links.push(absoluteUrl);
          } catch {
            // Ignore invalid URLs
          }
        }
      });
      
      return [...new Set(links)]; // Remove duplicates
    } catch (error) {
      this.logger.error(`Failed to extract links from ${url}: ${error.message}`);
      return [];
    }
  }

  /**
   * Check if a URL matches any of the provided patterns
   */
  private matchesAnyPattern(url: string, patterns: string[]): boolean {
    return patterns.some(pattern => {
      const regex = new RegExp(pattern);
      return regex.test(url);
    });
  }
} 