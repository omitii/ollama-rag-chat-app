/**
 * Represents a document stored in the vector database
 */
export interface DocumentMetadata {
  source: string;
  title: string;
  url?: string;
  filePath?: string;
  createdAt: Date;
  [key: string]: any;
}

export class Document {
  /**
   * Unique identifier for the document
   */
  id: string;

  /**
   * The page content/text of the document
   */
  content: string;

  /**
   * Metadata about the document (source URL, title, etc.)
   */
  metadata: DocumentMetadata;

  /**
   * Creates a new Document instance
   */
  constructor(data: {
    id: string;
    content: string;
    metadata: DocumentMetadata;
  }) {
    this.id = data.id;
    this.content = data.content;
    this.metadata = data.metadata;
  }
} 