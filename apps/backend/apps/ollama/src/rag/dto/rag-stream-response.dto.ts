import { ApiProperty } from '@nestjs/swagger';
import { Readable } from 'stream';
import { DocumentContext } from './rag-response.dto';

export class RagStreamResponseDto {
  @ApiProperty({ description: 'Stream of response chunks' })
  responseStream: Readable;

  @ApiProperty({ description: 'Whether RAG was used for this response' })
  usedRag: boolean;

  @ApiProperty({ 
    description: 'Context documents used for generation if RAG was used',
    type: [DocumentContext],
    required: false
  })
  context?: DocumentContext[];
} 