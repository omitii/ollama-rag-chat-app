import { NestFactory } from '@nestjs/core';
import { OllamaModule } from './ollama.module';
import { RagService } from './rag/rag.service';

async function testRag() {
  // Create a NestJS application
  const app = await NestFactory.create(OllamaModule);
  
  // Get the RagService instance
  const ragService = app.get(RagService);
  
  // Test RAG response
  try {
    console.log('Testing RAG response...');
    const response = await ragService.generateResponse({
      prompt: 'What is llama 3.2?',
      model: 'llama3:latest',
      stream: false,
      useRag: true,
      maxResults: 3
    });
    
    console.log('RAG Response:');
    console.log(`Used RAG: ${response.usedRag}`);
    console.log(`Response: ${response.response}`);
    
    if (response.context && response.context.length > 0) {
      console.log('Context:');
      response.context.forEach((doc, i) => {
        console.log(`Document ${i+1}: ${doc.id}`);
        console.log(`Content: ${doc.content}`);
        console.log(`Source: ${doc.metadata.source}`);
        console.log('---');
      });
    }
    
  } catch (error) {
    console.error('Error testing RAG:', error.message);
  }
  
  // Close the application
  await app.close();
}

// Run the test
testRag().catch(err => console.error('Test failed:', err)); 