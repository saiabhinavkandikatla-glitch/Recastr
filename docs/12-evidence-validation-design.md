# Evidence Validation Engine Design

## Overview

The Evidence Validation Engine is responsible for validating extracted facts against their source chunks to ensure only explicitly supported information enters the knowledge base. It acts as an AI fact auditor that answers the binary question: "Does this extracted fact exist in the source?"

## Core Principles

- **Accuracy over beneficence**: When in doubt, reject rather than accept potentially incorrect facts
- **No external knowledge**: Validation must rely solely on the provided chunk
- **No inference or fixing**: Must not infer missing information or "correct" facts
- **Strict verbatim matching**: Quotes, numbers, dates, and entities must match exactly
- **Traceability**: Every validation decision includes evidence, reasoning, and versioning
- **Conservative scoring**: Confidence scores are calculated from verifiable components, never guessed

## Folder Structure

```
lib/evidenceValidation/
├── providers/                 # LLM validator implementations
│   ├── anthropicValidator.ts  # Anthropic (Claude) validator
│   ├── geminiValidator.ts     # Google Gemini validator
│   └── openaiValidator.ts     # OpenAI validator
├── shared/                    # Shared utilities, types, templates
│   ├── errors.ts              # Error hierarchy
│   ├── normalizers.ts         # Text normalization functions
│   ├── promptTemplates.ts     # Prompt templates for LLMs
│   ├── rules.ts               # Validation rule engine
│   ├── scoring.ts             # Score calculation algorithms
│   └── types.ts               # TypeScript interfaces
├── validator.ts               # Main validation orchestrator
└── index.ts                   # Public exports
```

## Components

### 1. Provider Abstraction

All LLM validators implement the `EvidenceValidatorProvider` interface:

```typescript
export interface EvidenceValidatorProvider {
  validate(fact: any, chunk: string, config: ValidationConfig): Promise<ValidationResult>;
}
```

Concrete validators (`GeminiValidator`, `OpenAIValidator`, `AnthropicValidator`) handle:
- Prompt formatting using shared templates
- Provider-specific API call logic (stubbed in this implementation)
- JSON response parsing into `ValidationResult`
- Error handling (delegated to orchestrator for retries)

### 2. EvidenceValidator Orchestrator

The `EvidenceValidator` class orchestrates the validation pipeline:

1. **Input Validation**: Validates fact and chunk using `validateInput`
2. **Configuration Validation**: Applies defaults and validates using `validateConfig`
3. **Preprocessing**: Normalizes input chunk (whitespace, quotes, boilerplate, Unicode)
4. **Validation**: Calls provider with retry logic (exponential backoff)
5. **Result Validation**: Ensures provider response has correct structure
6. **Post-processing**:
   - Normalizes evidence/matched text
   - Recalculates offsets
   - Applies rule-based validation (if enabled)
   - Adjusts validation decision based on score thresholds
7. **Output**: Returns validated `ValidationResult`

### 3. Shared Types (`types.ts`)

Defines core interfaces:
- `ValidationResult`: Contains validation decision, score, evidence, metadata
- `ValidationConfig`: Configuration for thresholds, retries, timeouts
- `ValidationScore`: Breakdown of score components (evidence overlap, consistency, etc.)
- `ValidationStatus`: Enum for VALIDATED/NEEDS_REVIEW/REJECTED
- `EvidenceValidatorProvider`: Provider interface contract

### 4. Validation Pipeline

```
[Extracted Fact + Source Chunk]
        ↓
[Input Validation] ──▶ (throw if invalid)
        ↓
[Configuration Validation] ──▶ (apply defaults)
        ↓
[Chunk Normalization] (whitespace, quotes, boilerplate, Unicode)
        ↓
[Provider Validation] (with retry logic)
        ↓
[Result Validation] ──▶ (throw if invalid structure)
        ↓
[Post‑Processing]:
   ├─ Evidence/Matched Text Normalization
   ├─ Offset Recalculation
   ├─ Rule Engine Application (if enabled)
   ├─ Threshold-Based Decision Adjustment
   └─ Reason Update
        ↓
[Validated ValidationResult]
        ↓
[Store in verification_results table]
```

### 5. Rule Engine (`rules.ts`)

Implements specific validation rules that must all pass for a fact to be considered valid:

- **ExactEvidenceRule**: Requires verbatim evidence match (≥0.95 similarity)
- **QuoteVerbatimRule**: Quotes must match exactly (character-for-character)
- **NumericExactMatchRule**: Statistics values/units must match exactly
- **DateExactMatchRule**: Date references must match exactly
- **EntityExactMatchRule**: Named entities must match exactly
- **SpeakerAttributionRule**: Quote speaker attribution must match source
- **NoFabricationRule**: Facts must have supporting evidence
- **ContextAppropriatenessRule**: Adequate context must surround evidence

Each rule returns `{ passed: boolean, score: number, reason: string }`.

### 6. Scoring Architecture (`scoring.ts`)

Validation score (0.0–1.0) calculated from weighted components:

| Component | Weight | Description |
|----------|--------|-------------|
| Evidence Overlap | 0.25 | How much of the claimed evidence appears in chunk |
| Character Similarity | 0.15 | Character-level similarity between claimed/actual text |
| Numeric Consistency | 0.10 | Exact match of numbers and units (for statistics) |
| Named Entity Consistency | 0.10 | Exact match of entity names and types |
| Quote Integrity | 0.10 | Verbatim match for quoted text |
| Date Consistency | 0.10 | Exact or equivalent date representation |
| Context Completeness | 0.10 | Sufficiency of surrounding context |
| Language Confidence | 0.10 | Quality of text (penalizes OCR/transcript errors) |

**Decision Rules**:
- Score ≥ 0.95 → `VALIDATED`
- 0.80 ≤ Score < 0.95 → `NEEDS_REVIEW`  
- Score < 0.80 → `REJECTED`

### 7. Error Hierarchy (`errors.ts`)

- `ValidationError`: Base class with `code` and `recoverable` flag
- Specific errors:
  - `EvidenceMismatchError`: Evidence doesn't match source
  - `MissingEvidenceError`: No supporting evidence found
  - `NumericMismatchError`: Numeric values/units don't match
  - `QuoteMismatchError`: Quote text differs from source
  - `EntityMismatchError`: Entity name/type doesn't match
  - `ContextMismatchError`: Insufficient or incorrect context

### 8. Normalization Pipeline (`normalizers.ts`)

Text preparation functions:
- `normalizeWhitespace`: Standardizes line endings, spaces, tabs
- `normalizeQuotes`: Converts smart quotes/dashes to ASCII equivalents
- `removeBoilerplate`: Removes page numbers, headers, footers (heuristic)
- `normalizeUnicode`: Applies Unicode NFC normalization

## Data Flow

```
[Fact Extraction Output]  →  [Evidence Validation Engine]  →  [Validated Knowledge Base]
                            │
                            ├─ Input Validation
                            ├─ Configuration (with defaults)
                            ├─ Chunk Normalization
                            ├─ Provider Validation (with retries)
                            ├─ Result Validation
                            ├─ Post-processing (normalization, rules, thresholds)
                            └─ Validation Result
```

## Versioning & Reproducibility

Every validation result includes:
- `validatorProvider`: gemini/openai/anthropic
- `validatorModel`: Specific model version used (e.g., "gpt-4-turbo-preview")
- `validatorPromptVersion`: Version of validation prompt template
- `validatorVersion`: Version of this validation engine
- `ruleEngineVersion`: Version of validation rules applied (when implemented)

## Compliance with Requirements

- ✅ **No API routes**: Provider implementations are stubbed; actual API calls would be in service layer
- ✅ **No React, DB migrations, auth, embeddings, generation, verification, queues**: Pure validation layer
- ✅ **Explicit information only**: Validation based strictly on source chunk evidence
- ✅ **No hallucination/inference**: Rules and scoring penalize lack of evidence
- ✅ **Provider abstraction**: Swappable LLM validators via common interface
- ✅ **Comprehensive validation**: Multiple orthogonal validation dimensions
- ✅ **Configurable behavior**: Adjustable thresholds, retry behavior, feature flags
- ✅ **Error hierarchy**: Specific, recoverable vs. non-recoverable errors
- ✅ **Edge case handling**: Addresses OCR errors, transcripts, formatting issues via normalization
- ✅ **Version tracking**: Full provenance for reproducibility

## Future Considerations

- Integrate with actual LLM APIs (while respecting "No API routes" by keeping calls in service layer)
- Enhance rule engine with semantic similarity for fuzzy matching (when appropriate)
- Add batch validation capabilities
- Implement detailed audit trails for each validation step
- Add confidence calibration based on historical validation accuracy