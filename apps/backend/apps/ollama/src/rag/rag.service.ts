import { Injectable, Logger } from '@nestjs/common';
import { VectorStoreService } from '../vector-store/vector-store.service';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import { PromptTemplate } from '@langchain/core/prompts';
import { OllamaService } from '../services/ollama.service';
import { RagQueryDto } from '../dto/rag-query.dto';
import { RagResponseDto } from './dto/rag-response.dto';
import { RagStreamResponseDto } from './dto/rag-stream-response.dto';

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private readonly defaultModel = 'llama3.2:latest';

  constructor(
    private readonly ollamaService: OllamaService,
    private readonly vectorStoreService: VectorStoreService,
  ) {}

  async generateResponse(dto: RagQueryDto): Promise<RagResponseDto> {
    try {
      this.logger.log(`Generating RAG response for prompt: ${dto.prompt}`);
      
      // Get relevant documents from the vector store
      const docs = await this.vectorStoreService.similaritySearch(
        dto.prompt,
        dto.maxResults || 5
      );
      
      if (!docs.length) {
        this.logger.warn('No relevant documents found in the vector store');
        // Fall back to standard generation if no relevant docs
        const response = await this.ollamaService.generate({
          prompt: dto.prompt,
          model: dto.model || this.defaultModel,
          stream: false
        });
        return {
          response: response.response || response.message || response.content || '',
          usedRag: false,
        };
      }
      
      // Format the context from retrieved documents
      const formattedDocs = docs.map((doc, i) => 
        `Document ${i + 1}:\n${doc.content}`
      ).join('\n\n');
      
      // Create a RAG prompt
      const ragPrompt = `Answer the question based on the context provided below. If the question cannot be answered based on the context, say "I don't know" and explain why.

Context:
${formattedDocs}

Question: ${dto.prompt}

Answer:`;

      // Generate a response using the augmented prompt
      const response = await this.ollamaService.generate({
        prompt: ragPrompt,
        model: dto.model || this.defaultModel,
        stream: false
      });
      
      return {
        response: response.response || response.message || response.content || '',
        usedRag: true,
        context: docs.map(doc => ({
          id: doc.id,
          content: doc.content.substring(0, 200) + (doc.content.length > 200 ? '...' : ''),
          metadata: doc.metadata,
        })),
      };
    } catch (error) {
      this.logger.error(`Error generating RAG response: ${error.message}`);
      throw error;
    }
  }

  async generateResponseStream(dto: RagQueryDto): Promise<RagStreamResponseDto> {
    try {
      this.logger.log(`Generating streaming RAG response for prompt: ${dto.prompt}`);
      
      // Get relevant documents from the vector store
      const docs = await this.vectorStoreService.similaritySearch(
        dto.prompt,
        dto.maxResults || 5
      );
      
      if (!docs.length) {
        this.logger.warn('No relevant documents found in the vector store');
        // Fall back to standard streaming if no relevant docs
        const streamResponse = await this.ollamaService.generateStream({
          prompt: dto.prompt,
          model: dto.model || this.defaultModel
        });
        return {
          responseStream: streamResponse,
          usedRag: false,
        };
      }
      
      // Format the context from retrieved documents
      const formattedDocs = docs.map((doc, i) => 
        `Document ${i + 1}:\n${doc.content}`
      ).join('\n\n');
      
      // Create a RAG prompt
      const ragPrompt = `Answer the question based on the context provided below. If the question cannot be answered based on the context, say "I don't know" and explain why.

Context:
${formattedDocs}

Question: ${dto.prompt}

Answer:`;

      // Generate a streaming response using the augmented prompt
      const streamResponse = await this.ollamaService.generateStream({
        prompt: ragPrompt,
        model: dto.model || this.defaultModel
      });
      
      return {
        responseStream: streamResponse,
        usedRag: true,
        context: docs.map(doc => ({
          id: doc.id,
          content: doc.content.substring(0, 200) + (doc.content.length > 200 ? '...' : ''),
          metadata: doc.metadata,
        })),
      };
    } catch (error) {
      console.log(error)
      this.logger.error(`Error generating streaming RAG response: ${error.message}`);
      throw error;
    }
  }
} 