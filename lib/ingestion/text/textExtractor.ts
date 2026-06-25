// Plain text extractor
import { BaseSourceExtractor } from '../baseExtractor';
import {
  NormalizedContent,
  ExtractionResponse,
  SourceMetadata
} from './shared/types';
import { ValidationError } from './shared/errors';
import { SourceValidators } from './shared/validators';
import { Retryer } from './shared/retryer';

export class TextExtractor implements BaseSourceExtractor {
  private fileBuffer: Buffer;
  private fileName: string;

  constructor(fileBuffer: Buffer, fileName: string) {
    this.fileBuffer = fileBuffer;
    this.fileName = fileName;
  }

  async validate(): Promise<void> {
    if (!this.fileBuffer || this.fileBuffer.length === 0) {
      throw new ValidationError('Text file is empty');
    }
  }

  async extract(): Promise<any> {
    return await Retryer.execute(async () => {
      // For plain text, we just read the buffer as UTF-8
      const text = this.fileBuffer.toString('utf8');
      return {
        rawText: text,
        size: this.fileBuffer.length
      };
    });
  }

  async normalize(rawContent: any): Promise<NormalizedContent> {
    // Implementation would:
    // 1. Apply text normalization rules
    // 2. Calculate word count and reading time
    // 3. Extract metadata (if available from filename or content)
    return await Retryer.execute(async () => {
      let text = rawContent.rawText;

      // Apply normalization rules
      text = this.applyNormalization(text);

      return {
        text: text,
        wordCount: this.countWords(text),
        estimatedReadingTime: Math.ceil(this.countWords(text) / 200 * 60), // 200 WPM
        language: this.detectLanguage(text) || 'en', // Simple detection
        title: this.fileName.replace(/\.[^/.]+$/, ""), // Remove extension
        metadata: {
          originalFilename: this.fileName,
          fileSize: this.fileBuffer.length,
          format: 'txt'
        }
      };
    });
  }

  private applyNormalization(text: string): string {
    // Apply normalization rules
    return text
      .normalize('NFC')
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
      .replace(/[ \t]+/g, ' ') // Multiple spaces/tabs to single space
      .replace(/[--]/g, '') // Remove control characters (except \n,\t which we handled)
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

  private countWords(text: string): number {
    if (!text.trim()) return 0;
    return text.trim().split(/\s+/).length;
  }

  async getMetadata(): Promise<SourceMetadata> {
    return {
      sourceId: crypto.randomUUID(),
      sourceType: 'text',
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
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: error instanceof Error && 'code' in error ? (error as any).code : 'UNKNOWN_ERROR',
          recoverable: error instanceof Error && 'recoverable' in error ? (error as any).recoverable : false
        },
        metadata: await this.getMetadata().catch(() => ({}))
      };
    }
  }
}