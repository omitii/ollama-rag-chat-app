import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class OllamaService {
  private readonly logger = new Logger(OllamaService.name);
  private readonly ollamaUrl = 'http://localhost:11434/api/generate';
  private readonly defaultModel = 'llama3.2:latest';

  /**
   * Generate a response from Ollama
   */
  async generate(data: { prompt: string; model?: string; stream?: boolean }) {
    try {
      const response = await axios.post(this.ollamaUrl, {
        ...data,
        model: data.model || this.defaultModel,
        stream: false,
      });
      
      return response.data;
    } catch (error) {
      this.logger.error(`Error generating response: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate a streaming response from Ollama
   */
  async generateStream(data: { prompt: string; model?: string; stream?: boolean }) {
    try {
      const response = await axios.post(this.ollamaUrl, {
        ...data,
        model: data.model || this.defaultModel,
        stream: true,
      }, {
        responseType: 'stream',
      });
      
      return response.data;
    } catch (error) {
      this.logger.error(`Error generating stream: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Compatibility method for older code using generateCompletion
   */
  async generateCompletion(data: any) {
    const result = await this.generate(data);
    return {
      response: result.response || result.message || result.content || '',
    };
  }
  
  /**
   * Compatibility method for older code using generateCompletionStream
   */
  async generateCompletionStream(data: any) {
    const stream = await this.generateStream(data);
    return {
      responseStream: stream,
    };
  }
} 