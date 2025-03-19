import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';

export class RagQueryDto {
  @IsString()
  prompt: string;

  @IsString()
  @IsOptional()
  model?: string = 'llama3:latest';

  @IsBoolean()
  @IsOptional()
  stream?: boolean = true;

  @IsOptional()
  @IsBoolean()
  useRag?: boolean = true;
  
  @IsOptional()
  @IsNumber()
  maxResults?: number = 5;
} 