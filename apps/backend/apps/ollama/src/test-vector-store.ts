import { NestFactory } from '@nestjs/core';
import { OllamaModule } from './ollama.module';
import { VectorStoreService } from './vector-store/vector-store.service';
import { DataIngestionService } from './data-ingestion/data-ingestion.service';

async function testVectorStore() {
  try {
    console.log('Starting vector store test...');
    
    // Create a NestJS application
    const app = await NestFactory.createApplicationContext(OllamaModule);
    
    // Get the VectorStoreService
    const vectorStoreService = app.get(VectorStoreService);
    const dataIngestionService = app.get(DataIngestionService);
    
    // First, ingest a test document to make sure we have data
    console.log('Ingesting a test document about Llama 3...');
    
    const llamaInfo = `
    Llama 3 is Meta AI's latest large language model released in April 2024. 
    It comes in various sizes from 8B to 70B parameters. 
    The model demonstrates significant improvements in reasoning, coding, and instruction following abilities.
    Llama 3 is available for commercial use and follows a responsible AI approach.
    It can be deployed through Hugging Face, Amazon Bedrock, and other platforms.
    `;
    
    const docId = await dataIngestionService.ingestText(
      llamaInfo,
      { 
        title: 'Llama 3 Information',
        source: 'Test Data'
      }
    );
    
    console.log(`Test document ingested with ID: ${docId}`);
    
    // Wait a moment for the embeddings to be processed
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Perform a search
    console.log('Searching for documents related to "Llama 3"...');
    const results = await vectorStoreService.similaritySearch('Tell me about Llama 3', 3);
    
    console.log(`Found ${results.length} documents`);
    
    if (results.length > 0) {
      console.log('Results:');
      results.forEach((doc, i) => {
        console.log(`\nDocument ${i + 1}:`);
        console.log(`ID: ${doc.id}`);
        console.log(`Title: ${doc.metadata.title}`);
        console.log(`Source: ${doc.metadata.source}`);
        console.log(`Content (first 100 chars): ${doc.content.substring(0, 100)}...`);
      });
    } else {
      console.log('No documents found in the vector store.');
    }
    
    // Close the application
    await app.close();
    console.log('Test completed.');
  } catch (error) {
    console.error('Error during vector store test:', error);
  }
}

// Run the test function
testVectorStore(); 