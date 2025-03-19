# Ollama with Retrieval Augmented Generation (RAG)

This is a NestJS implementation of RAG for Ollama that enables your local LLM to answer questions based on specific websites or custom data.

## Features

- **RAG-enabled endpoints**: Use context from your documents to enhance LLM responses
- **Web scraping**: Ingest content from websites, including automatic exploration of linked pages
- **Text ingestion**: Add custom text content to your knowledge base
- **Vector search**: Semantic search through your document collection
- **Streaming responses**: Real-time streaming of LLM outputs with context

## API Endpoints

### RAG Endpoints

- `POST /ollama/rag/generate`: Generate a response using RAG (non-streaming)
- `POST /ollama/rag/generate-stream`: Generate a streaming response using RAG

### Data Ingestion Endpoints

- `POST /ollama/ingest/website`: Ingest content from a single website URL
- `POST /ollama/ingest/scrape`: Scrape and ingest content from a website and its linked pages
- `POST /ollama/ingest/text`: Ingest custom text content
- `DELETE /ollama/documents/:id`: Delete a document from the vector store

### Legacy Endpoints (without RAG)

- `POST /ollama/generate`: Generate a response directly from Ollama
- `POST /ollama/generate-stream`: Generate a streaming response directly from Ollama

## Getting Started

### Prerequisites

- Node.js v16+
- Ollama running locally (http://localhost:11434)
- ChromaDB for vector storage

### Installation

1. Install dependencies:
```bash
npm install
```

2. Make sure Ollama is running with your preferred model:
```bash
ollama run llama3.2
```

3. Start chromadb
```bash
docker run -p 8000:8000 chromadb/chroma
```

4. Start the application:
```bash
npm run start
```

## Usage Examples

### Adding a website to your knowledge base

```bash
curl -X POST http://localhost:3001/ollama/ingest/website \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/page-with-important-info",
    "title": "Important Information"
  }'
```

### Asking a question with RAG

```bash
curl -X POST http://localhost:3001/ollama/rag/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What are the key points from the example.com website?",
    "model": "llama3",
    "useRag": true
  }'
```

### Scraping a website and its linked pages

```bash
curl -X POST http://localhost:3001/ollama/ingest/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "maxPages": 10,
    "maxDepth": 2,
    "sameDomain": true
  }'
```

## Frontend Integration

To use the RAG-enabled endpoints with the React frontend, update your API calls to use the `/ollama/rag/generate-stream` endpoint:

```jsx
const response = await fetch("http://localhost:3001/ollama/rag/generate-stream", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    prompt: "Your question here",
    model: "llama3.2",
    stream: true,
    useRag: true
  }),
});
```

## Architecture

The RAG implementation consists of:

1. **Vector Store**: ChromaDB to store document embeddings
2. **Data Ingestion**: Processing websites and text into searchable chunks
3. **Retrieval**: Finding relevant context based on user queries
4. **Augmentation**: Enhancing prompts with retrieved context
5. **Generation**: Using Ollama to generate informed responses 