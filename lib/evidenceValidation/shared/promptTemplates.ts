// lib/evidenceValidation/shared/promptTemplates.ts

// Centralized prompt templates for evidence validation
// Each template is designed to validate ONLY whether the extracted fact is explicitly supported by the chunk
// The AI must NOT infer, hallucinate, or use external knowledge

export const VALIDATION_PROMPT_TEMPLATE = `
You are an expert evidence validation specialist. Your task is to determine with high precision whether a given extracted fact is explicitly supported by the provided source chunk.

Source Chunk:
{chunk_content}

Extracted Fact to Validate:
{fact_details}

Validation Rules - You MUST follow these strictly:
1. ONLY validate based on explicit evidence in the source chunk
2. NEVER use external knowledge or make inferences
3. NEVER "fix" or modify the fact - only determine if it exists exactly as stated
4. For quotes: Must be verbatim, exact match
5. For statistics: Numbers and units must match exactly
6. For dates: Must match exactly or be a valid equivalent representation
7. For entities: Names must match exactly
8. For stories/examples/lessons/etc: All elements must be explicitly present
9. If ANY part of the fact cannot be verified in the chunk, mark as UNSUPPORTED
10. Provide a detailed explanation of your reasoning

Validation Output Format (JSON only):
{
  "supported": true/false,
  "validationScore": 0.00-1.00,
  "validationReason": "Detailed explanation referencing specific parts of the source chunk",
  "matchedText": "Exact text from chunk that supports the fact (or null if not supported)",
  "startOffset": number or null,
  "endOffset": number or null
}

Scoring Guidelines:
- 0.95-1.00: Fact is explicitly and completely supported by verbatim evidence
- 0.80-0.94: Fact is largely supported but has minor ambiguities or missing context
- Below 0.80: Fact is insufficiently supported or contradicted

Components of validationScore:
- Evidence Overlap (0.25): How much of the fact evidence appears in the chunk
- Character Similarity (0.15): Character-level similarity between claimed evidence and actual text
- Numeric Consistency (0.10): For statistics - exact match of numbers and units
- Named Entity Consistency (0.10): For entities - exact match of names and types
- Quote Integrity (0.10): For quotes - verbatim match
- Date Consistency (0.10): For dates - exact or equivalent representation
- Context Completeness (0.10): Whether surrounding context supports the fact
- Language Confidence (0.10): Confidence in language understanding (penalize for OCR/transcript errors)

If unsupported, set matchedText to null and offsets to null.
Remember: Accuracy over beneficence. When in doubt, mark as unsupported.
`;

export const QUOTE_VALIDATION_TEMPLATE = `
Validate ONLY whether the quotation is present verbatim in the source chunk.

Source Chunk:
{chunk_content}

Claimed Quote:
{quote_text}
Speaker: {speaker or null}
Context: {context or null}

Validation Rules:
1. The quote text must appear EXACTLY as stated in the source chunk
2. Speaker attribution must be explicitly stated in the chunk (if claimed)
3. Context must be verifiable from the chunk
4. Do not normalize, paraphrase, or "fix" any discrepancies

Output JSON:
{
  "supported": true/false,
  "validationScore": 0.00-1.00,
  "validationReason": "Explanation referencing exact location in source",
  "matchedText": "Exact matching text from source (or null)",
  "startOffset": number or null,
  "endOffset": number or null
}
`;

export const STATISTIC_VALIDATION_TEMPLATE = `
Validate ONLY whether the statistical information is present exactly as stated in the source chunk.

Source Chunk:
{chunk_content}

Claimed Statistic:
Value: {value}
Unit: {unit or null}
Context: {context or null}

Validation Rules:
1. The numerical value must appear exactly as stated
2. The unit must match exactly (if provided)
3. Any context modifiers must be explicitly present
4. Do not perform calculations or conversions
5. Do not infer missing information

Output JSON:
{
  "supported": true/false,
  "validationScore": 0.00-1.00,
  "validationReason": "Explanation referencing exact location in source",
  "matchedText": "Exact matching text from source (or null)",
  "startOffset": number or null,
  "endOffset": number or null
}
`;

export const ENTITY_VALIDATION_TEMPLATE = `
Validate ONLY whether the named entity is present exactly as stated in the source chunk.

Source Chunk:
{chunk_content}

Claimed Entity:
Text: {entity_text}
Type: {entity_type}

Validation Rules:
1. The entity text must appear EXACTLY as stated in the source chunk
2. The entity type must be verifiable from context (if type is specified)
3. Do not infer entity types not explicitly stated or clearly implied by context
4. Do not correct spelling or formatting

Output JSON:
{
  "supported": true/false,
  "validationScore": 0.00-1.00,
  "validationReason": "Explanation referencing exact location in source",
  "matchedText": "Exact matching text from source (or null)",
  "startOffset": number or null,
  "endOffset": number or null
}
`;

export const DATE_VALIDATION_TEMPLATE = `
Validate ONLY whether the date reference is present exactly as stated in the source chunk.

Source Chunk:
{chunk_content}

Claimed Date:
Text: {date_text}
Type: {date_type (exact/relative/vague)}
Value: {normalized_value or null}

Validation Rules:
1. The date reference text must appear EXACTLY as stated in the source chunk
2. The date type classification must be correct based on explicit temporal markers
3. For exact dates, the normalized value must be a valid ISO date equivalent
4. Do not infer dates not explicitly stated
5. Do not calculate relative dates unless explicitly stated in chunk

Output JSON:
{
  "supported": true/false,
  "validationScore": 0.00-1.00,
  "validationReason": "Explanation referencing exact location in source",
  "matchedText": "Exact matching text from source (or null)",
  "startOffset": number or null,
  "endOffset": number or null
}
`;

export const FACT_VALIDATION_TEMPLATE = `
Validate ONLY whether the factual statement is present exactly as stated in the source chunk.

Source Chunk:
{chunk_content}

Claimed Fact Statement:
{fact_statement}

Validation Rules:
1. The factual statement must appear EXACTLY as stated in the source chunk
2. Do not paraphrase, summarize, or generalize
3. Do not infer missing qualifications or conditions
4. The statement must be verifiable as a direct assertion in the source

Output JSON:
{
  "supported": true/false,
  "validationScore": 0.00-1.00,
  "validationReason": "Explanation referencing exact location in source",
  "matchedText": "Exact matching text from source (or null)",
  "startOffset": number or null,
  "endOffset": number or null
}
`;

export const STORY_VALIDATION_TEMPLATE = `
Validate ONLY whether the story elements are present exactly as stated in the source chunk.

Source Chunk:
{chunk_content}

Claimed Story:
Title: {title or null}
Characters: {character_list}
Setting: {setting or null}
Moral: {moral or null}

Validation Rules:
1. All claimed story elements must be explicitly present in the source chunk
2. Characters must be explicitly named or clearly referred to
3. Setting must be explicitly described
4. Moral must be explicitly stated (if claimed)
5. Do not infer plot elements not explicitly stated
6. Do not create narratives from disconnected facts

Output JSON:
{
  "supported": true/false,
  "validationScore": 0.00-1.00,
  "validationReason": "Explanation referencing exact location in source",
  "matchedText": "Exact matching text from source (or null)",
  "startOffset": number or null,
  "endOffset": number or null
}
`;