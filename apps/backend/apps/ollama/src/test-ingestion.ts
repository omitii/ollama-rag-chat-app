import { NestFactory } from '@nestjs/core';
import { OllamaModule } from './ollama.module';
import { DataIngestionService } from './data-ingestion/data-ingestion.service';

async function testIngestion() {
  // Create a NestJS application
  const app = await NestFactory.create(OllamaModule);
  
  // Get the DataIngestionService instance
  const dataIngestionService = app.get(DataIngestionService);
  
  // Test text ingestion
  try {
    console.log('Ingesting test data about Llama 3.2...');
    
    const llamaInfo = `
    Llama 3.2 is Meta's most advanced open-source large language model (LLM) family. Released in October 2024, Llama 3.2 comes in multiple sizes (8B, 70B, 405B) and delivers state-of-the-art performance across many benchmarks. Key improvements include:

    1. Advanced reasoning and tool use capabilities
    2. Enhanced multilingual understanding
    3. Better context utilization up to 128K tokens
    4. Improved instruction following
    5. Reduced hallucinations
    6. More accurate and nuanced responses
    
    Llama 3.2 can be deployed on various hardware platforms from data centers to laptops and mobile devices. It's designed for both text completion and multimodal applications. The model supports multiple languages and achieves high performance on reasoning and knowledge-intensive tasks.

    The model uses a transformer architecture with optimized attention mechanisms and has been trained on a diverse dataset of text and code. It's provided under a permissive license that allows commercial use while prohibiting certain harmful applications.
    `;
    
    const documentId = await dataIngestionService.ingestText(llamaInfo, {
      title: 'Llama 3.2 Overview',
      source: 'Meta AI Documentation'
    });
    
    console.log(`Successfully ingested document with ID: ${documentId}`);
    
  } catch (error) {
    console.error('Error ingesting data:', error.message);
  }
  
  // Close the application
  await app.close();
}

// Run the test
testIngestion().catch(err => console.error('Ingestion failed:', err)); 