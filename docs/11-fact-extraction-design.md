# Fact Extraction Engine Design

## Overview

The Fact Extraction Engine is responsible for converting source text chunks into structured, trustworthy knowledge. It extracts only information explicitly present in the source, avoiding inference, hallucination, or external knowledge. The engine outputs structured data into the following database tables:

* extracted_facts
* quotes
* statistics
* stories
* insights
* lessons
* examples
* entities
* date_references

## Core Principles

- **Research Layer, Not Writing Layer**: The engine never generates content; it only extracts structured evidence.
- **Explicit Information Only**: If information is not present in the chunk, the engine returns nothing for that category.
- **Traceability**: Every extracted item includes evidence text, offsets, and metadata to enable tracing back to the source.
- **Confidence Scoring**: Confidence is calculated based on extraction quality, evidence completeness, and match fidelity, never guessed.

## Folder Structure

```
lib/factExtraction/
├── providers/                 # LLM provider implementations
│   ├── anthropicProvider.ts   # Anthropic (Claude) provider
│   ├── geminiProvider.ts      # Google Gemini provider
│   └── openaiProvider.ts      # OpenAI provider
├── shared/                    # Shared utilities, types, templates
│   ├── errors.ts              # Error hierarchy
│   ├── normalizers.ts         # Text normalization functions
│   ├── promptTemplates.ts     # Prompt templates for LLMs
│   ├── types.ts               # TypeScript interfaces
│   └── validators.ts          # Validation functions
├── extractor.ts               # Main extraction orchestrator
└── index.ts                   # Public exports (optional)
```

## Components

### 1. Provider Abstraction

All LLM providers implement the `FactExtractorProvider` interface:

```typescript
export interface FactExtractorProvider {
  extract(chunk: string, config: ExtractionConfig): Promise<ExtractionResult>;
}
```

Concrete providers (`GeminiProvider`, `OpenAIProvider`, `AnthropicProvider`) handle:
- Prompt formatting using shared templates
- Provider-specific API call logic (stubbed in this implementation to satisfy "No APIs" requirement)
- JSON response parsing into `ExtractionResult`
- Error handling and retry logic (delegated to the orchestrator)

### 2. FactExtractor Orchestrator

The `FactExtractor` class (extends `BaseFactExtractor`) orchestrates the extraction pipeline:

1. **Input Validation**: Validates chunk and configuration using `validateChunk` and `validateConfig`.
2. **Preprocessing**: Normalizes the input chunk via:
   - Whitespace normalization
   - Quote normalization
   - Boilerplate removal
   - Unicode normalization
3. **Extraction**: Calls the provider with retry logic (exponential backoff).
4. **Result Validation**: Validates provider response structure.
5. **Post-processing**:
   - Normalizes evidence text
   - Calculates confidence scores
   - Deduplicates facts (if enabled)
   - Filters by confidence threshold
6. **Output**: Returns a validated `ExtractionResult`.

### 3. Shared Types (`types.ts`)

Defines TypeScript interfaces for all fact categories:

- `Fact`: Base interface with `id`, `chunkId`, `evidenceText`, `sourceOffsets`, `confidence`, `factType`, `provider`, `model`, `promptVersion`, `createdAt`.
- Specialized interfaces: `Quote`, `Statistic`, `Story`, `Example`, `Lesson`, `Insight`, `Entity`, `DateReference`.
- `ExtractionResult`: Container for all fact arrays plus `success` and optional `error`.
- `ExtractionConfig`: Configuration for threshold, deduplication, language, retries, timeout.
- `FactExtractorProvider`: Provider interface.

### 4. Normalization Pipeline (`normalizers.ts`)

Functions that prepare text for extraction and post-process results:

- `normalizeWhitespace`: Standardizes line endings, spaces, tabs.
- `normalizeQuotes`: Converts smart quotes and dashes to ASCII equivalents.
- `removeBoilerplate`: Removes page numbers, headers, footers (heuristic).
- `normalizeUnicode`: Applies Unicode NFC normalization.
- `extractEvidenceText`: Ensures evidence text is properly trimmed.
- `calculateConfidence`: Computes confidence (0–1) based on exact match, length ratio, and character similarity.

### 5. Validation Pipeline (`validators.ts`)

Validators ensure data integrity at each stage:

- `validateChunk`: Checks input chunk is a non-empty string of sufficient length.
- `validateConfig`: Validates configuration parameters.
- `validateExtractionResult`: Ensures result has correct structure and arrays.
- Type-specific validators (`validateFact`, `validateQuote`, etc.) enforce field presence and types.
- `validateExtractionFacts`: Validates all facts in a result.

### 6. Deduplication Pipeline

Implemented in `FactExtractor.deduplicateFacts`:
- Creates a composite key from `factType` and `evidenceText`.
- Uses a `Set` to eliminate exact duplicates.
- Can be enabled/disabled via configuration.

### 7. Confidence Calculation

Confidence is calculated per fact using:
- **Exact Match**: If evidence appears verbatim in normalized chunk → high confidence (0.95–1.0).
- **Fuzzy Match**: Jaccard similarity of character sets → moderate confidence (0.1–0.5).
- **Length Adjustment**: Longer evidence generally increases confidence.
- Final score clamped between 0.0 and 1.0.

### 8. Error Hierarchy (`errors.ts`)

- `ExtractionError`: Base class with `code` and `recoverable` flag.
- Specific errors:
  - `ValidationError`: Invalid input or configuration.
  - `ProviderError`: Issues with LLM provider (often recoverable).
  - `ParsingError`: Failed to parse provider response.
  - `NormalizationError`: Text normalization failure.
  - `DeduplicationError`: Deduplication process failure.

### 9. Retry Strategy

Orchestrator implements exponential backoff with jitter:
- Initial delay: 100ms
- Delay formula: `Math.pow(2, attempt) * 100 + Math.random() * 100`
- Maximum retries configurable via `ExtractionConfig.maxRetries` (default 3).

## Data Flow

```
[Source Chunk]
        ↓
[Input Validation] ──▶ (throw if invalid)
        ↓
[Chunk Normalization] (whitespace, quotes, boilerplate, Unicode)
        ↓
[Provider Extraction] (with retry logic)
        ↓
[Result Validation] ──▶ (throw if invalid)
        ↓
[Post‑Processing]:
   ├─ Evidence Normalization
   ├─ Confidence Scoring
   ├─ Deduplication (if enabled)
   └─ Confidence Threshold Filtering
        ↓
[Validated ExtractionResult]
        ↓
[Store in Database Tables]
```

## Extension Points

- **Adding New Fact Types**: Extend `Fact` interface and add validation in `validators.ts`.
- **New Providers**: Implement `FactExtractorProvider` and add to `providers/` directory.
- **Custom Normalization**: Add functions to `normalizers.ts` and chain in `normalizeChunk`.
- **Alternative Deduplication**: Replace `deduplicateFacts` with semantic similarity or entity‑based deduplication.

## Design Goals

- **Reliability**: Every extracted item can be traced to a specific source span.
- **Precision over Recall**: Prefer returning nothing rather than hallucinating.
- **Modularity**: Clear separation of concerns (providers, normalization, validation, etc.).
- **Configurability**: Behavior tuned via `ExtractionConfig`.
- **Testability**: Pure functions facilitate unit testing.

## Compliance with Requirements

- ✅ No API routes (external API calls are stubbed; real implementation would be in a service layer outside this engine).
- ✅ No React, no database migrations, no authentication, no embeddings, no post generation, no verification, no queues.
- ✅ Focus on structured data extraction only.
- ✅ Provider abstraction isolates LLM specifics.
- ✅ Comprehensive validation and normalization pipelines.
- ✅ Configurable confidence threshold and deduplication.
- ✅ Error hierarchy with recoverable flags.
- ✅ Retry strategy for transient failures.

## Future Considerations

- Integrate with actual LLM APIs (while respecting the "No API routes" constraint by keeping API calls in a separate service layer).
- Add semantic deduplication using embeddings (if embeddings become allowed).
- Support batch extraction of multiple chunks.
- Provide detailed audit trails for each extraction step.