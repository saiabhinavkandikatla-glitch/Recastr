// lib/factExtraction/shared/types.ts

// Base fact interface
export interface Fact {
  id: string;
  chunkId: string;
  evidenceText: string;
  sourceOffsets: {
    start: number;
    end: number;
  };
  confidence: number; // 0-1
  factType: 'fact' | 'quote' | 'statistic' | 'story' | 'example' | 'lesson' | 'insight' | 'entity' | 'date';
  provider: 'gemini' | 'openai' | 'anthropic';
  model: string;
  promptVersion: string;
  createdAt: string; // ISO timestamp
}

// Quote extends Fact
export interface Quote extends Fact {
  factType: 'quote';
  speaker: string | null;
  context: string | null;
}

// Statistic extends Fact
export interface Statistic extends Fact {
  factType: 'statistic';
  value: string; // e.g., "75%", "1.2M"
  unit: string | null; // e.g., '%', '$', 'users'
  context: string | null;
}

// Story extends Fact
export interface Story extends Fact {
  factType: 'story';
  title: string | null;
  characters: string[]; // Array of character names
  setting: string | null;
  moral: string | null;
}

// Example - simple fact type
export interface Example extends Fact {
  factType: 'example';
  description: string; // Description of the example
}

// Lesson - simple fact type
export interface Lesson extends Fact {
  factType: 'lesson';
  description: string; // Lesson learned
}

// Insight - simple fact type
export interface Insight extends Fact {
  factType: 'insight';
  description: string; // Insight or conclusion
}

// Entity - for named entities
export interface Entity extends Fact {
  factType: 'entity';
  entityType: string; // e.g., 'PERSON', 'ORGANIZATION', 'LOCATION'
  entityValue: string; // The actual entity text
}

// DateReference - for temporal references
export interface DateReference extends Fact {
  factType: 'date';
  dateValue: string; // e.g., "2023-05-15", "last Tuesday", "in 2020"
  dateType: string; // e.g., 'exact', 'relative', 'vague'
}

// Extraction result container
export interface ExtractionResult {
  facts: Fact[];
  quotes: Quote[];
  statistics: Statistic[];
  stories: Story[];
  examples: Example[];
  lessons: Lesson[];
  insights: Insight[];
  entities: Entity[];
  dates: DateReference[];
  success: boolean;
  error?: ExtractionError;
}

// Configuration for extraction
export interface ExtractionConfig {
  confidenceThreshold: number; // Minimum confidence to accept (0-1)
  enableDeduplication: boolean; // Whether to deduplicate results
  language: string; // ISO 639-1 language code (e.g., 'en', 'es')
  maxRetries: number; // Maximum API retry attempts
  timeoutMs: number; // Request timeout in milliseconds
}

// Provider interface
export interface FactExtractorProvider {
  extract(chunk: string, config: ExtractionConfig): Promise<ExtractionResult>;
}

// Base extractor (abstract class for shared logic)
export abstract class BaseFactExtractor {
  protected abstract provider: FactExtractorProvider;

  // Common methods that can be shared by concrete extractors
  protected validateInput(chunk: string): void {
    if (!chunk || chunk.trim().length === 0) {
      throw new Error('Chunk cannot be empty');
    }
  }

  protected validateConfig(config: ExtractionConfig): void {
    if (config.confidenceThreshold < 0 || config.confidenceThreshold > 1) {
      throw new Error('Confidence threshold must be between 0 and 1');
    }
    if (config.maxRetries < 0) {
      throw new Error('Max retries cannot be negative');
    }
    if (config.timeoutMs <= 0) {
      throw new Error('Timeout must be positive');
    }
  }

  // This would be implemented in concrete classes
  abstract extract(chunk: string, config: ExtractionConfig): Promise<ExtractionResult>;
}