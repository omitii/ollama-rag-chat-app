import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Document, DocumentMetadata } from './models/document.model';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { OllamaEmbeddings } from '@langchain/community/embeddings/ollama';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class VectorStoreService implements OnModuleInit {
  private vectorStore: Chroma;
  private embeddings: OllamaEmbeddings;
  private readonly logger = new Logger(VectorStoreService.name);
  private readonly collectionName = 'ollama_documents';
  private readonly splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  private readonly dbDirectory = path.join(process.cwd(), 'data', 'chroma');
  private readonly embeddingModel = 'llama3.2:latest';

  constructor() {
    this.embeddings = new OllamaEmbeddings({
      model: 'llama3.2:latest', // Use embedding model
      baseUrl: 'http://localhost:11434', // Ollama API endpoint
    });

    // Ensure data directory exists
    if (!fs.existsSync(this.dbDirectory)) {
      fs.mkdirSync(this.dbDirectory, { recursive: true });
    }
  }

  async onModuleInit() {
    await this.initVectorStore();
  }

  /**
   * Initialize the vector store
   */
  private async initVectorStore() {
    try {
      this.logger.log(`Initializing vector store at ${this.dbDirectory}`);
      
      const embeddings = new OllamaEmbeddings({
        model: this.embeddingModel,
        baseUrl: 'http://localhost:11434', // Default Ollama URL
      });
      
      // Create or open existing vector store
      this.vectorStore = await Chroma.fromExistingCollection(
        embeddings,
        {
          collectionName: this.collectionName,
          url: 'http://localhost:8000', // Default Chroma URL
          collectionMetadata: {
            'hnsw:space': 'cosine',
          },
        }
      );
      
      this.logger.log('Vector store initialized successfully');
    } catch (error) {
      this.logger.error(`Failed to initialize vector store: ${error.message}`);
      throw error;
    }
  }

  /**
   * Add a document to the vector store
   */
  async addDocument(document: Document): Promise<void> {
    try {
      if (!this.vectorStore) {
        await this.initVectorStore();
      }
      
      this.logger.log(`Adding document to vector store: ${document.id}`);
      
      // Split text into chunks for better retrieval
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });
      
      const textChunks = await splitter.splitText(document.content);
      
      // Add metadata to each chunk for tracing back to the original document
      const docs = textChunks.map(chunk => ({
        pageContent: chunk,
        metadata: {
          ...document.metadata,
          documentId: document.id,
        },
      }));
      
      // Add to vector store
      await this.vectorStore.addDocuments(docs);
      
      this.logger.log(`Document added to vector store: ${document.id}`);
    } catch (error) {
      this.logger.error(`Failed to add document: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search for similar documents
   */
  async similaritySearch(query: string, k = 5): Promise<Document[]> {
    try {
      if (!this.vectorStore) {
        await this.initVectorStore();
      }
      
      this.logger.log(`Performing similarity search for query: ${query}`);
      
      // Search for similar documents
      const results = await this.vectorStore.similaritySearch(query, k);
      
      // Group chunks by document ID and combine them
      const documentMap = new Map<string, Document>();
      
      for (const result of results) {
        const { documentId, ...metadataProps } = result.metadata;
        
        // Ensure we have the required metadata properties
        const metadata: DocumentMetadata = {
          source: metadataProps.source || 'unknown',
          title: metadataProps.title || 'Untitled',
          createdAt: metadataProps.createdAt ? new Date(metadataProps.createdAt) : new Date(),
          ...metadataProps
        };
        
        if (!documentMap.has(documentId)) {
          documentMap.set(documentId, new Document({
            id: documentId,
            content: result.pageContent,
            metadata: metadata,
          }));
        } else {
          // Append content if this is another chunk from the same document
          const doc = documentMap.get(documentId);
          doc.content += '\n\n' + result.pageContent;
        }
      }
      
      return Array.from(documentMap.values());
    } catch (error) {
      this.logger.error(`Failed to perform similarity search: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a document from the vector store
   */
  async deleteDocument(documentId: string): Promise<void> {
    try {
      if (!this.vectorStore) {
        await this.initVectorStore();
      }
      
      this.logger.log(`Deleting document from vector store: ${documentId}`);
      
      // Delete all chunks with matching document ID
      await this.vectorStore.delete({
        filter: { documentId: documentId },
      });
      
      this.logger.log(`Document deleted from vector store: ${documentId}`);
    } catch (error) {
      this.logger.error(`Failed to delete document: ${error.message}`);
      throw error;
    }
  }
} 