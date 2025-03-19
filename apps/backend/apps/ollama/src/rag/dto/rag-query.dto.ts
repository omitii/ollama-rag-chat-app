import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class RagQueryDto {
  @ApiProperty({ description: 'The prompt/question to send to the model' })
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @ApiProperty({ description: 'The Ollama model to use', default: 'llama3:latest' })
  @IsString()
  @IsOptional()
  model?: string = 'llama3:latest';

  @ApiProperty({ description: 'Maximum number of documents to retrieve for context', default: 5, required: false })
  @IsNumber()
  @IsOptional()
  maxResults?: number;

  @ApiProperty({ description: 'Whether to use RAG (Retrieval Augmented Generation)', default: true, required: false })
  @IsBoolean()
  @IsOptional()
  useRag?: boolean = true;
} 