import { ApiProperty } from '@nestjs/swagger';

export class DocumentContext {
  @ApiProperty({ description: 'The ID of the document' })
  id: string;

  @ApiProperty({ description: 'A preview of the document content' })
  content: string;

  @ApiProperty({ 
    description: 'Metadata about the document',
    type: 'object',
    additionalProperties: true
  })
  metadata: Record<string, any>;
}

export class RagResponseDto {
  @ApiProperty({ description: 'The generated response text' })
  response: string;

  @ApiProperty({ description: 'Whether RAG was used for this response' })
  usedRag: boolean;

  @ApiProperty({ 
    description: 'Context documents used for generation if RAG was used',
    type: [DocumentContext],
    required: false
  })
  context?: DocumentContext[];
} 