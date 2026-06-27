// Validation rules for the ingestion layer

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
      throw new ValidationError(`File size exceeds ${maxSizeMb}MB limit`);
    }
  }
}
