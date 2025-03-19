import { Injectable, Logger } from '@nestjs/common';
import { VectorStoreService } from '../vector-store/vector-store.service';
import axios from 'axios';

@Injectable()
export class OllamaRagService {
  private readonly logger = new Logger(OllamaRagService.name);
  private readonly ollamaUrl = 'http://localhost:11434/api/generate';

  constructor(private readonly vectorStoreService: VectorStoreService) {}

  /**
   * Generate a response using RAG (Retrieval Augmented Generation)
   */
  async generateWithRag(options: {
    prompt: string;
    model: string;
    stream?: boolean;
    contextCount?: number;
  }) {
    const { prompt, model, stream = false, contextCount = 4 } = options;

    try {
      // Retrieve relevant documents from vector store
      this.logger.log(`Retrieving relevant documents for query: ${prompt}`);
      const relevantDocs = await this.vectorStoreService.similaritySearch(prompt, contextCount);
      
      // Extract content from documents
      const context = relevantDocs.map(doc => {
        const source = doc.metadata.source 
          ? `Source: ${doc.metadata.title || doc.metadata.source}`
          : '';
        
        return `${doc.content}\n${source}`;
      }).join('\n\n');
      
      // Create enhanced prompt with context
      const enhancedPrompt = `
You are a helpful AI assistant. Use the following information to answer the user's question.
If the information provided doesn't contain the answer, just say you don't know based on the available information.
Don't make up answers that aren't supported by the provided context.

Context information:
${context}

User question: ${prompt}

Answer:`.trim();
      
      this.logger.log('Sending enhanced prompt to Ollama');
      
      // Non-streaming response
      if (!stream) {
        const response = await axios.post(this.ollamaUrl, {
          model,
          prompt: enhancedPrompt,
          stream: false,
        });
        
        return response.data;
      }
      
      // For streaming, return response directly
      return axios.post(this.ollamaUrl, {
        model,
        prompt: enhancedPrompt,
        stream: true,
      }, {
        responseType: 'stream',
      });
    } catch (error) {
      this.logger.error(`Error in RAG generation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate a response using the normal Ollama API without RAG
   */
  async generateWithoutRag(options: {
    prompt: string;
    model: string;
    stream?: boolean;
  }) {
    const { prompt, model, stream = false } = options;

    try {
      // Non-streaming response
      if (!stream) {
        const response = await axios.post(this.ollamaUrl, {
          model,
          prompt,
          stream: false,
        });
        
        return response.data;
      }
      
      // For streaming, return response directly
      return axios.post(this.ollamaUrl, {
        model,
        prompt,
        stream: true,
      }, {
        responseType: 'stream',
      });
    } catch (error) {
      this.logger.error(`Error in normal generation: ${error.message}`);
      throw error;
    }
  }
} 