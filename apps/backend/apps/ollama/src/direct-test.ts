import fetch from 'node-fetch';

async function testRagSystem() {
  try {
    console.log('Testing RAG system by adding data and querying...');
    
    // Step 1: Add some data to the RAG system
    console.log('Step 1: Adding data about Llama 3...');
    
    const ingestResponse = await fetch('http://localhost:3001/ollama/ingest/text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: `
          Llama 3 is Meta AI's latest large language model released in April 2024. 
          It comes in various sizes from 8B to 70B parameters. 
          The model demonstrates significant improvements in reasoning, coding, and instruction following abilities.
          Llama 3 is available for commercial use and follows a responsible AI approach.
          It can be deployed through Hugging Face, Amazon Bedrock, and other platforms.
        `,
        title: 'Llama 3 Information',
        source: 'Test Data',
      }),
    });
    
    const ingestData = await ingestResponse.json();
    console.log('Ingestion response:', ingestData);
    
    if (ingestData.success && ingestData.documentId) {
      console.log(`Data added successfully with document ID: ${ingestData.documentId}`);
    } else {
      console.error('Failed to add data');
    }
    
    // Step 2: Wait a moment for processing
    console.log('Waiting for processing...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 3: Query the RAG system
    console.log('Step 3: Querying the RAG system about Llama 3...');
    
    const queryResponse = await fetch('http://localhost:3001/ollama/rag/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: 'What can you tell me about Llama 3?',
        model: 'llama3.2:latest',
        useRag: true,
      }),
    });
    
    const queryData = await queryResponse.json();
    console.log('Query response:', queryData);
    
    // Step 4: Compare with non-RAG response
    console.log('Step 4: Comparing with non-RAG response...');
    
    const nonRagResponse = await fetch('http://localhost:3001/ollama/rag/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: 'What can you tell me about Llama 3?',
        model: 'llama3.2:latest',
        useRag: false,
      }),
    });
    
    const nonRagData = await nonRagResponse.json();
    console.log('Non-RAG response:', nonRagData);
    
    console.log('Test completed');
  } catch (error) {
    console.error('Error during RAG system test:', error);
  }
}

testRagSystem(); 