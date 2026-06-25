// Shared TypeScript interfaces for the ingestion layer

export interface SourceMetadata {
  sourceId: string; // Will be replaced with actual database source ID after insertion
  originalUrl?: string;
  originalFileName?: string;
  sourceType: 'youtube' | 'pdf' | 'article' | 'blog' | 'podcast' | 'transcript' | 'text';
  extractedAt: string; // ISO timestamp
  processingTimeMs: number;
  byteSize?: number;
  [key: string]: any; // For source-specific metadata
}

export interface NormalizedContent {
  text: string; // Cleaned, normalized text ready for chunking
  wordCount: number;
  estimatedReadingTime: number; // in seconds (based on average reading speed)
  language: string; // ISO 639-1 code (e.g., 'en', 'es')
  author?: string;
  title?: string;
  publishedDate?: string; // ISO date
  metadata: Record<string, any>; // Additional extracted metadata
}

export interface ExtractionResult<T = any> {
  success: true;
  data: T;
  metadata: SourceMetadata;
  errors?: Partial<Record<keyof T, string[]>>; // Field-specific validation errors
}

export interface ExtractionError {
  success: false;
  error: {
    message: string;
    code: string; // Error code for handling
    details?: any;
    recoverable: boolean; // Whether retrying might help
  };
  metadata?: SourceMetadata; // Partial metadata if available
}

export type ExtractionResponse<T> = ExtractionResult<T> | ExtractionError;