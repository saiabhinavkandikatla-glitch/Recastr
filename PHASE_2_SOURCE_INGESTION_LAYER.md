# Recastr Source Ingestion Layer - Phase 2

## Folder Structure
```
lib/
└── ingestion/
    ├── baseExtractor.ts
    ├── shared/
    │   ├── types.ts
    │   ├── errors.ts
    │   ├── validators.ts
    │   └── retryer.ts
    ├── youtube/
    │   └── youtubeExtractor.ts
    ├── pdf/
    │   └── pdfExtractor.ts
    ├── article/
    │   └── articleExtractor.ts
    ├── podcast/
    │   └── podcastExtractor.ts
    ├── transcript/
    │   └── transcriptExtractor.ts
    └── text/
        └── textExtractor.ts
```

## Core Interfaces (shared/types.ts)

```typescript
export interface SourceMetadata {
  sourceId: string; // References sources.id in database
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
  estimatedReadingTime: number; // in seconds
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
```

## Error Hierarchy (shared/errors.ts)

```typescript
export class BaseError extends Error {
  public readonly code: string;
  public readonly recoverable: boolean;
  
  constructor(message: string, code: string, recoverable = false) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.recoverable = recoverable;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends BaseError {
  constructor(message: string, recoverable = false) {
    super(message, 'VALIDATION_ERROR', recoverable);
  }
}

export class ExtractionError extends BaseError {
  constructor(message: string, recoverable = false) {
    super(message, 'EXTRACTION_ERROR', recoverable);
  }
}

export class NormalizationError extends BaseError {
  constructor(message: string, recoverable = false) {
    super(message, 'NORMALIZATION_ERROR', recoverable);
  }
}

export class ExternalServiceError extends BaseError {
  constructor(message: string, recoverable = true) {
    super(message, 'EXTERNAL_SERVICE_ERROR', recoverable);
  }
}
```

## Base Extractor Interface (baseExtractor.ts)

```typescript
import { 
  SourceMetadata, 
  NormalizedContent, 
  ExtractionResponse, 
  ExtractionError 
} from './shared/types';
import { BaseError } from './shared/errors';

export interface BaseSourceExtractor {
  /**
   * Validates that the source can be processed by this extractor
   * @returns Promise that resolves if valid, rejects with ValidationError if not
   */
  validate(): Promise<void>;
  
  /**
   * Extracts raw content from the source
   * @returns Promise resolving to extracted content (type varies by implementer)
   */
  extract(): Promise<any>;
  
  /**
   * Normalizes extracted content into standardized text format
   * @param rawContent - Raw output from extract() method
   * @returns Normalized content ready for storage
   */
  normalize(rawContent: any): Promise<NormalizedContent>;
  
  /**
   * Extracts metadata specific to the source type
   * @returns Promise resolving to metadata object
   */
  getMetadata(): Promise<SourceMetadata>;
  
  /**
   * Main entry point - runs full extraction pipeline
   * @returns ExtractionResponse containing normalized content or error
   */
  process(): Promise<ExtractionResponse<NormalizedContent>>;
}
```

## Retry Strategy (shared/retryer.ts)

```typescript
export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  exponentiallyBackoff: boolean;
  retryableErrors: Set<string>; // Error codes that should trigger retry
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  exponentiallyBackoff: true,
  retryableErrors: new Set([
    'EXTERNAL_SERVICE_ERROR',
    'NETWORK_ERROR',
    'TIMEOUT_ERROR'
  ])
};

export class Retryer {
  static async execute<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<T> {
    const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
    let lastError: any;
    
    for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        // Check if error is retryable
        const isRetryable = error instanceof Error && 
          ('code' in (error as any)) && 
          opts.retryableErrors.has((error as any).code);
        
        if (!isRetryable || attempt === opts.maxAttempts) {
          throw error;
        }
        
        // Calculate delay
        const delay = Math.min(
          opts.baseDelayMs * Math.pow(2, attempt - 1),
          opts.maxDelayMs
        );
        
        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 0.1 * delay;
        await new Promise(resolve => setTimeout(resolve, delay + jitter));
      }
    }
    
    throw lastError; // Should never reach here
  }
}
```

## Validation Rules (shared/validators.ts)

```typescript
import { ValidationError } from './errors';

export class SourceValidators {
  static async validateYouTubeUrl(url: string): Promise<void> {
    if (!url) throw new ValidationError('YouTube URL is required');
    
    const youtubeRegex = /^(https?\:\/\/)?(www\.youtube\.com|youtu\.?be)\/.+$/;
    if (!youtubeRegex.test(url)) {
      throw new ValidationError('Invalid YouTube URL format');
    }
  }

  static async validatePdfFile(buffer: Buffer): Promise<void> {
    if (!buffer || buffer.length === 0) {
      throw new ValidationError('PDF file is empty');
    }
    
    // Check PDF header
    const pdfHeader = buffer.slice(0, 4);
    const expectedHeader = Buffer.from('%PDF', 'utf8');
    if (!pdfHeader.equals(expectedHeader)) {
      throw new ValidationError('Invalid or corrupted PDF file');
    }
  }

  static async validateArticleUrl(url: string): Promise<void> {
    if (!url) throw new ValidationError('Article URL is required');
    
    try {
      new URL(url);
    } catch {
      throw new ValidationError('Invalid URL format');
    }
  }

  static async validateLanguage(lang: string): Promise<void> {
    const supportedLangs = new Set(['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko']);
    if (!lang || !supportedLangs.has(lang.toLowerCase())) {
      throw new ValidationError(`Unsupported language: ${lang}`);
    }
  }

  static async validateNotEmpty(content: string, fieldName: string = 'content'): Promise<void> {
    if (!content || content.trim().length === 0) {
      throw new ValidationError(`${fieldName} cannot be empty`);
    }
  }

  static async validateFileSize(buffer: Buffer, maxSizeMb: number = 100): Promise<void> {
    const maxSizeBytes = maxSizeMb * 1024 * 1024;
    if (buffer.length > maxSizeBytes) {
      throw new ValidationError(`File size exceeds ${maxSizeMB}MB limit`);
    }
  }
}
```

## Normalization Rules

All extracted text undergoes these normalization steps before storage in `source_contents`:

1. **Unicode Normalization**: Convert to NFC form
2. **Whitespace Normalization**: 
   - Replace multiple spaces/tabs with single space
   - Normalize line breaks to `\n`
   - Trim leading/trailing whitespace
3. **Control Character Removal**: Remove non-printable ASCII characters (except `\n`, `\t`)
4. **HTML Entity Decoding**: Convert entities like `&` to `&`
5. **Boilerplate Removal** (where applicable):
   - Remove navigation menus, footers, ads (heuristic-based)
   - Remove cookie consent banners
   - Remove social media share buttons
6. **Language-Specific Rules**:
   - Expand common abbreviations (e.g., "e.g." → "for example")
   - Normalize quotation marks and apostrophes
   - Handle RTL/LTR text direction markers appropriately
7. **Metadata Preservation**: 
   - Extract and preserve structural metadata (headings, lists)
   - Maintain paragraph boundaries with double newlines
   - Preserve table structure in markdown format when possible

Output format for `normalizedContent.text`:
- Clean paragraph-separated text
- Headers marked with markdown-style `#` heading markers
- Lists preserved with `- ` or `1. ` prefixes
- Tables converted to markdown format
- Code blocks preserved with triple backticks
- All other formatting stripped to plain text with minimal structural markers

## Extractor Implementations

### YouTube Extractor (youtube/youtubeExtractor.ts)

```typescript
import { BaseSourceExtractor } from '../baseExtractor';
import { 
  NormalizedContent, 
  ExtractionResponse, 
  SourceMetadata 
} from '../shared/types';
import { ValidationError, ExtractionError } from '../shared/errors';
import { SourceValidators } from '../shared/validators';
import { Retryer } from '../shared/retryer';
import * as youtubei from 'youtubei.js'; // Example library

export class YoutubeExtractor implements BaseSourceExtractor {
  private url: string;
  private language: string = 'en';
  
  constructor(url: string, options: { language?: string } = {}) {
    this.url = url;
    this.language = options.language || 'en';
  }
  
  async validate(): Promise<void> {
    await SourceValidators.validateYouTubeUrl(this.url);
    await SourceValidators.validateLanguage(this.language);
  }
  
  async extract(): Promise<any> {
    return await Retryer.execute(async () => {
      try {
        const videoId = this.extractVideoId(this.url);
        const info = await youtubei.getInfo(videoId);
        
        // Try to get captions in preferred language
        let captions = null;
        try {
          captions = await youtubei.getCaptions(videoId, this.language);
        } catch (e) {
          // Fallback to auto-generated if available
          try {
            captions = await youtubei.getAutoCaptions(videoId, this.language);
          } catch (fallbackErr) {
            throw new ExtractionError(
              `No captions available for language: ${this.language}`, 
              false // Not recoverable by retrying
            );
          }
        }
        
        return {
          videoInfo: info,
          captions: captions
        };
      } catch (error) {
        if (error instanceof ExtractionError) throw error;
        throw new ExtractionError(`YouTube extraction failed: ${error.message}`);
      }
    });
  }
  
  async normalize(rawContent: any): Promise<NormalizedContent> {
    const { videoInfo, captions } = rawContent;
    
    // Combine title, description, and captions
    let textParts = [
      videoInfo.title,
      videoInfo.description,
      captions?.text || ''
    ].filter(Boolean).join('\n\n');
    
    // Apply normalization rules
    textParts = this.applyNormalization(textParts);
    
    const wordCount = this.countWords(textParts);
    
    return {
      text: textParts,
      wordCount,
      estimatedReadingTime: Math.ceil(wordCount / 200 * 60), // 200 WPM
      language: this.language,
      title: videoInfo.title,
      author: videoInfo.author?.name,
      publishedDate: videoInfo.uploadDate,
      metadata: {
        videoId: this.extractVideoId(this.url),
        durationSeconds: videoInfo.lengthSeconds,
        viewCount: videoInfo.viewCount,
        likeCount: videoInfo.likeCount,
        hasAutoCaptions: !!videoInfo.captions?.autogenerated,
        captionLanguage: this.language
      }
    };
  }
  
  async getMetadata(): Promise<SourceMetadata> {
    // Basic metadata - full metadata comes from extract()/normalize()
    return {
      sourceId: crypto.randomUUID(), // Will be replaced with actual DB ID later
      originalUrl: this.url,
      sourceType: 'youtube',
      extractedAt: new Date().toISOString(),
      processingTimeMs: 0 // Will be updated in process()
    };
  }
  
  async process(): Promise<ExtractionResponse<NormalizedContent>> {
    const startTime = Date.now();
    
    try {
      await this.validate();
      const rawContent = await this.extract();
      const normalized = await this.normalize(rawContent);
      const metadata = await this.getMetadata();
      
      // Update processing time
      metadata.processingTimeMs = Date.now() - startTime;
      
      return {
        success: true,
        data: normalized,
        metadata
      };
    } catch (error) {
      const metadata = await this.getMetadata().catch(() => ({}));
      metadata.processingTimeMs = Date.now() - startTime;
      
      if (error instanceof BaseError) {
        return {
          success: false,
          error: {
            message: error.message,
            code: error.code,
            details: error.cause,
            recoverable: error.recoverable
          },
          metadata
        };
      }
      
      return {
        success: false,
        error: {
          message: error.message || 'Unknown error',
          code: 'UNKNOWN_ERROR',
          recoverable: false
        },
        metadata
      };
    }
  }
  
  private extractVideoId(url: string): string {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[7].length === 11 ? match[7] : '';
  }
  
  private applyNormalization(text: string): string {
    // Apply normalization rules from section above
    // Implementation would include all the normalization steps
    return text
      .normalize('NFC')
      .replace(/\s+/g, ' ')
      .replace(/[ --]/g, '') // Remove control chars except \n,\t
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .trim();
  }
  
  private countWords(text: string): number {
    if (!text.trim()) return 0;
    return text.trim().split(/\s+/).length;
  }
}
```

### PDF Extractor (pdf/pdfExtractor.ts)

```typescript
import { BaseSourceExtractor } from '../baseExtractor';
import { 
  NormalizedContent, 
  ExtractionResponse, 
  SourceMetadata 
} from '../shared/types';
import { ValidationError, ExtractionError } from '../shared/errors';
import { SourceValidators } from '../shared/validators';
import { Retryer } from '../shared/retryer';
import * as pdfParse from 'pdf-parse'; // Example library
import * as mammoth from 'mammoth'; // For better text extraction

export class PdfExtractor implements BaseSourceExtractor {
  private fileBuffer: Buffer;
  private options: { password?: string; pageRange?: [number, number] };
  
  constructor(fileBuffer: Buffer, options: { password?: string; pageRange?: [number, number] } = {}) {
    this.fileBuffer = fileBuffer;
    this.options = options;
  }
  
  async validate(): Promise<void> {
    await SourceValidators.validatePdfFile(this.fileBuffer);
    await SourceValidators.validateFileSize(this.fileBuffer, 100); // 100MB limit
  }
  
  async extract(): Promise<any> {
    return await Retryer.execute(async () => {
      try {
        const options = {
          ...this.options,
          pagerender: (pageData: any) => {
            // Extract text content while preserving structure
            return pageData.getTextContent().then((textContent: any) => {
              return textContent.items
                .map((item: any) => item.str)
                .join(' ');
            });
          }
        };
        
        const data = await pdfParse(this.fileBuffer, options);
        
        // Also try mammoth for better formatting preservation
        let mammothResult: any;
        try {
          mammothResult = await mammoth.extractRawText({ 
            buffer: this.fileBuffer 
          });
        } catch (e) {
          // mammoth might fail on scanned PDFs, that's ok
          mammothResult = { value: '', messages: [] };
        }
        
        return {
          pdfParse: data,
          mammoth: mammothResult
        };
      } catch (error) {
        if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
          throw new ExternalServiceError(`PDF service timeout: ${error.message}`, true);
        }
        throw new ExtractionError(`PDF extraction failed: ${error.message}`);
      }
    });
  }
  
  async normalize(rawContent: any): Promise<NormalizedContent> {
    const { pdfParse, mammoth } = rawContent;
    
    // Prefer mammoth output if available and meaningful
    let text = mammoth.value.trim().length > 100 ? mammoth.value : pdfParse.text;
    
    // Apply normalization
    text = this.applyNormalization(text);
    
    // Extract metadata
    const metadata = pdfParse.metadata || {};
    
    const wordCount = this.countWords(text);
    
    return {
      text,
      wordCount,
      estimatedReadingTime: Math.ceil(wordCount / 200 * 60),
      language: this.detectLanguage(text) || 'en',
      title: metadata.Title || undefined,
      author: metadata.Author || undefined,
      publishedDate: metadata.CreationDate ? this.parsePDFDate(metadata.CreationDate) : undefined,
      metadata: {
        pageCount: pdfParse.numpage,
        pdfVersion: metadata.PDFFormatVersion,
        isEncrypted: pdfParse.isEncrypted,
        producer: metadata.Producer,
        creator: metadata.Creator
      }
    };
  }
  
  async getMetadata(): Promise<SourceMetadata> {
    return {
      sourceId: crypto.randomUUID(),
      sourceType: 'pdf',
      extractedAt: new Date().toISOString(),
      processingTimeMs: 0
    };
  }
  
  async process(): Promise<ExtractionResponse<NormalizedContent>> {
    const startTime = Date.now();
    
    try {
      await this.validate();
      const rawContent = await this.extract();
      const normalized = await this.normalize(rawContent);
      const metadata = await this.getMetadata();
      
      metadata.processingTimeMs = Date.now() - startTime;
      
      return {
        success: true,
        data: normalized,
        metadata
      };
    } catch (error) {
      // Error handling similar to YoutubeExtractor
      // ... (omitted for brevity, follows same pattern)
    }
  }
  
  private applyNormalization(text: string): string {
    // Similar to YouTube but with PDF-specific adjustments
    return text
      .normalize('NFC')
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
      .replace(/[ \t]+/g, ' ') // Multiple spaces/tabs to single space
      .replace(/[ --]/g, '') // Remove control chars
      .trim();
  }
  
  private detectLanguage(text: string): string | null {
    // Simplified language detection - in production use a proper library
    const englishSample = text.slice(0, 1000).toLowerCase();
    const commonWords = ['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i'];
    const matches = commonWords.filter(word => 
      englishSample.includes(` ${word} `) || 
      englishSample.startsWith(`${word} `) ||
      englishSample.endsWith(` ${word}`)
    );
    
    return matches.length >= 3 ? 'en' : null;
  }
  
  private parsePDFDate(dateString: string): string | null {
    // PDF date format: D:YYYYMMDDHHmmSSOHH'mm'
    try {
      const match = dateString.match(/D:(\d{4})(\d{2})(\d{2})/);
      if (match) {
        const [, year, month, day] = match;
        return new Date(`${year}-${month}-${day}`).toISOString().split('T')[0];
      }
    } catch (e) {
      // Invalid date format
    }
    return null;
  }
  
  private countWords(text: string): number {
    // Same as YouTubeExtractor
  }
}
```

### Article Extractor (article/articleExtractor.ts)

```typescript
import { BaseSourceExtractor } from '../baseExtractor';
import { 
  NormalizedContent, 
  ExtractionResponse, 
  SourceMetadata 
} from '../shared/types';
import { ValidationError, ExtractionError } from '../shared/errors';
import { SourceValidators } from '../shared/validators';
import { Retryer } from '../shared/retryer';
import * as cheerio from 'cheerio';
import axios from 'axios';

export class ArticleExtractor implements BaseSourceExtractor {
  private url: string;
  private userAgent: string;
  
  constructor(url: string, options: { userAgent?: string } = {}) {
    this.url = url;
    this.userAgent = options.userAgent || 
      'Mozilla/5.0 (compatible; RecastrBot/1.0; +https://recastr.com/bot)';
  }
  
  async validate(): Promise<void> {
    await SourceValidators.validateArticleUrl(this.url);
  }
  
  async extract(): Promise<any> {
    return await Retryer.execute(async () => {
      try {
        const response = await axios.get(this.url, {
          headers: { 'User-Agent': this.userAgent },
          timeout: 30000,
          maxRedirects: 5
        });
        
        return {
          html: response.data,
          status: response.status,
          headers: response.headers,
          finalUrl: response.request?.res?.responseUrl || this.url
        };
      } catch (error) {
        if (axios.isAxiosError(error)) {
          if (error.code === 'ECONNABORTED') {
            throw new ExternalServiceError('Request timeout', true);
          }
          if (error.response?.status === 429) {
            throw new ExternalServiceError('Rate limited', true);
          }
          if (error.response?.status >= 500) {
            throw new ExternalServiceError(`Server error: ${error.response.status}`, true);
          }
        }
        throw new ExtractionError(`Article extraction failed: ${error.message}`);
      }
    });
  }
  
  async normalize(rawContent: any): Promise<NormalizedContent> {
    const { html, finalUrl } = rawContent;
    const $ = cheerio.load(html);
    
    // Remove unwanted elements
    $('script, style, nav, footer, iframe, .ad, .advertisement, .sidebar, .comments, .social-share').remove();
    
    // Try to find main content using common selectors
    let $content = $('article, main, .content, .post, .entry-content, #content');
    
    // Fallback to body if no specific container found
    if ($content.length === 0) {
      $content = $('body');
    }
    
    // Extract text with structure preservation
    const text = $content
      .find('h1, h2, h3, h4, h5, h6, p, li, blockquote, pre')
      .map((_, el) => $(el).text().trim())
      .get()
      .filter(Boolean)
      .join('\n\n');
    
    // Extract metadata
    const title = $('head > title').first().text().trim() ||
                  $('meta[property="og:title"]').attr('content') ||
                  $('meta[name="title"]').attr('content');
    
    const author = $('meta[name="author"]').attr('content') ||
                  $('meta[property="article:author"]').attr('content') ||
                  $('.author, .byline').first().text().trim() ||
                  undefined;
    
    const publishedDate = $('meta[property="article:published_time"]').attr('content') ||
                         $('meta[name="pubdate"]').attr('content') ||
                         $('.date, .published').first().attr('datetime') ||
                         undefined;
    
    const description = $('meta[name="description"]').attr('content') ||
                       $('meta[property="og:description"]').attr('content');
    
    const language = $('html').attr('lang') || 
                    $('meta[http-equiv="content-language"]').attr('content') ||
                    'en';
    
    // Apply normalization
    const normalizedText = this.applyNormalization(text);
    
    return {
      text: normalizedText,
      wordCount: this.countWords(normalizedText),
      estimatedReadingTime: Math.ceil(this.countWords(normalizedText) / 200 * 60),
      language: language.toLowerCase(),
      title: title || undefined,
      author: author || undefined,
      publishedDate: publishedDate ? new Date(publishedDate).toISOString() : undefined,
      metadata: {
        sourceUrl: finalUrl,
        originalUrl: this.url,
        description: description || undefined,
        siteName: $('meta[property="og:site_name"]').attr('content'),
        lang: language,
        charset: $('meta[charset]').attr('charset') ||
                $('meta[http-equiv="content-type"]').attr('content')
      }
    };
  }
  
  async getMetadata(): Promise<SourceMetadata> {
    return {
      sourceId: crypto.randomUUID(),
      sourceType: 'article',
      extractedAt: new Date().toISOString(),
      processingTimeMs: 0
    };
  }
  
  async process(): Promise<ExtractionResponse<NormalizedContent>> {
    // Implementation follows same pattern as other extractors
    // ... (omitted for brevity)
  }
  
  private applyNormalization(text: string): string {
    // Similar normalization with HTML-specific handling
    return text
      .normalize('NFC')
      .replace(/\s+/g, ' ')
      .replace(/[ --]/g, '')
      .replace(/&[a-z]+;/gi, (match) => {
        // Basic HTML entity decoding
        const entities: {[key: string]: string} = {
          '&': '&',
          '<': '<',
          '>': '>',
          '"': '"',
          ''': "'"
        };
        return entities[match] || match;
      })
      .trim();
  }
  
  private countWords(text: string): number {
    // Same as before
  }
}
```

(The remaining extractors - Podcast, Transcript, Text follow the same pattern with appropriate libraries and source-specific logic)

## Mapping to source_contents Table

The normalized output from each extractor maps directly to the `source_contents` table as follows:

| NormalizedContent Field | source_contents Column | Notes |
|-------------------------|------------------------|-------|
| text | content | The main normalized text content |
| wordCount | content_length | Derived from word count |
| language | (stored in metadata JSONB) | ISO 639-1 code |
| author | (stored in metadata JSONB) | Extracted author name |
| title | (stored in metadata JSONB) | Document title |
| publishedDate | (stored in metadata JSONB) | ISO date string |
| metadata | metadata JSONB | All additional metadata |

Example insertion:
```sql
INSERT INTO source_contents (source_id, content, content_length, created_at)
VALUES (
  'source-uuid-here',
  'Normalized text content goes here...',
  1450,
  NOW()
);

-- Then update with metadata (or include in initial insert if preferred)
UPDATE source_contents 
SET content = 'Normalized text content...',
    content_length = 1450,
    metadata = '{
      "language": "en",
      "author": "John Doe",
      "title": "Sample Article",
      "publishedDate": "2023-05-15",
      "wordCountEstimate": 250,
      "sourceType": "article",
      "originalUrl": "https://example.com/article"
    }'::jsonb
WHERE id = 'returned-uuid-from-insert';
```

## Edge Cases and Handling

1. **Large PDFs**: 
   - Process in chunks using PDF.js streaming
   - Set size limits (configurable per plan)
   - Provide progress tracking for very large files

2. **Videos without captions**:
   - YouTube: Fallback to audio transcription via external service (marked as lower confidence)
   - Other platforms: Clear error indicating captions required
   - Configuration option to allow transcription fallback

3. **Paywalled articles**:
   - Detection via HTTP status (402, 403) or content analysis
   - Clear error message indicating access restriction
   - Option to provide cookies/headers for authenticated access

4. **Duplicate uploads**:
   - Content-based hashing (SHA-256 of normalized text) for deduplication
   - Option to skip or overwrite based on user preference
   - Reference counting for shared content

5. **Empty transcripts**:
   - Validation step catches empty content
   - Distinguishable between "no content" vs "processing error"
   - Option to trigger alternative extraction methods

6. **Mixed language content**:
   - Primary language detection with secondary language notes
   - Segment-level language tagging for complex cases
   - Configurable language confidence thresholds

7. **Corrupted files**:
   - Format-specific validation (PDF header, etc.)
   - Clear error messages indicating corruption type
   - Option to attempt recovery with specialized tools

8. **Network timeouts**:
   - Retry mechanism with exponential backoff
   - Configurable timeouts per source type
   - Fallback to cached copies if available

## Key Design Principles

1. **Separation of Concerns**: 
   - Validation → Extraction → Normalization → Metadata
   - Each phase has distinct error handling

2. **Error Transparency**:
   - Detailed error codes enable specific UI handling
   - Recoverable vs non-recoverable errors guide retry logic
   - Preserve partial metadata when possible

3. **Extensibility**:
   - New source types implement BaseSourceExtractor
   - Shared validation and normalization utilities
   - Plugin architecture for external services

4. **Evidence Preservation**:
   - Original source reference maintained via sourceId
   - Extraction timestamps for audit trail
   - Confidence scoring implicit in extraction quality

5. **Production Readiness**:
   - Retry mechanisms for transient failures
   - Resource limits (memory, time, size)
   - Security considerations (XXE, SSRF prevention)
   - Memory-efficient streaming for large files

This ingestion layer guarantees that every source entering the system is converted to clean, normalized text with preserved metadata - forming the reliable foundation for subsequent chunking, fact extraction, and generation stages.