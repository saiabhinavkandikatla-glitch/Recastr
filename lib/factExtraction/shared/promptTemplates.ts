// lib/factExtraction/shared/promptTemplates.ts

// Centralized prompt templates for fact extraction
// Each template is designed to extract ONLY explicit information from the chunk
// The AI must NOT infer, hallucinate, or fill gaps

export const FACT_EXTRACTION_TEMPLATE = `
You are an expert fact extraction specialist. Your task is to extract ONLY explicitly stated information from the provided text chunk.

From the text below, extract ONLY:
- Facts: Explicit statements presented as true or factual information
- Quotes: Verbatim text spoken or written by someone, with speaker attribution if available
- Statistics: Numerical data, percentages, measurements, or quantifiable information
- Stories: Narrative elements describing events, experiences, or case studies with clear beginning, middle, and end
- Examples: Illustrative cases, demonstrations, or specific instances used to explain a point
- Lessons: Explicit takeaways, recommendations, or advice presented as learned knowledge
- Insights: Non-obvious conclusions, implications, or realizations derived from the information
- Entities: Named people, organizations, locations, or other specific named references
- Dates: Specific temporal references including exact dates, relative times, or time periods

DO NOT:
- Infer or assume information not explicitly stated in the text
- Add background knowledge not present in the chunk
- Create fictional examples, quotes, or stories
- Exaggerate or embellish any information
- Paraphrase quotes - quotes must be verbatim
- Attribute statements to people unless explicitly stated in the text
- Fill gaps with common knowledge or assumptions

Text to analyze:
{chunk_content}

Output your findings as valid JSON in this exact format:
{
  "facts": ["fact statement 1", "fact statement 2", ...],
  "quotes": [
    {"text": "exact quote text", "speaker": "speaker name or null", "context": "surrounding context or null"}
  ],
  "statistics": [
    {"value": "numerical value or percentage", "unit": "unit of measurement or null", "context": "explanatory context or null"}
  ],
  "stories": [
    {"title": "story title or null", "characters": ["character1", "character2", ...], "setting": "setting or null", "moral": "moral or null"}
  ],
  "examples": ["example description 1", "example description 2", ...],
  "lessons": ["lesson 1", "lesson 2", ...],
  "insights": ["insight 1", "insight 2", ...],
  "entities": [
    {"text": "entity text", "type": "ENTITY_TYPE e.g., PERSON, ORGANIZATION, LOCATION"}
  ],
  "dates": [
    {"text": "date reference", "type": "DATE_TYPE e.g., exact, relative, vague", "value": "normalized date value or null"}
  ]
}

If a category has no items, return an empty array for that category.
Only include information that is explicitly present in the source text.
`;

export const QUOTE_EXTRACTION_TEMPLATE = `
Focus ONLY on extracting direct quotations from the text.

Text to analyze:
{chunk_content}

For each quotation found, provide:
- The exact verbatim text of the quote
- The speaker (if explicitly identified, otherwise null)
- Any contextual information surrounding the quote

Output as JSON array of quote objects:
[
  {"text": "exact quote", "speaker": "speaker name or null", "context": "context or null"}
]

If no quotes are found, return an empty array.
`;

export const STATISTIC_EXTRACTION_TEMPLATE = `
Focus ONLY on extracting numerical data and statistics from the text.

Text to analyze:
{chunk_content}

For each statistic found, provide:
- The numerical value or percentage
- The unit of measurement (if applicable, otherwise null)
- Any explanatory context or modifiers

Output as JSON array of statistic objects:
[
  {"value": "number or percentage", "unit": "unit or null", "context": "context or null"}
]

If no statistics are found, return an empty array.
`;

export const STORY_EXTRACTION_TEMPLATE = `
Focus ONLY on extracting narrative elements that form complete stories.

Text to analyze:
{chunk_content}

For each story found, provide:
- A title (if explicitly given, otherwise null)
- The characters mentioned or involved in the story
- The setting where the story takes place (if mentioned)
- The explicit moral, lesson, or takeaway from the story (if stated)

Output as JSON array of story objects:
[
  {"title": "title or null", "characters": ["char1", "char2", ...], "setting": "setting or null", "moral": "moral or null"}
]

If no stories are found, return an empty array.
`;

export const ENTITY_EXTRACTION_TEMPLATE = `
Focus ONLY on extracting named entities from the text.

Text to analyze:
{chunk_content}

For each entity found, provide:
- The exact text of the entity
- The entity type (e.g., PERSON, ORGANIZATION, LOCATION, DATE, etc.)

Output as JSON array of entity objects:
[
  {"text": "entity text", "type": "ENTITY_TYPE"}
]

If no entities are found, return an empty array.
`;

export const DATE_EXTRACTION_TEMPLATE = `
Focus ONLY on extracting temporal references and dates from the text.

Text to analyze:
{chunk_content}

For each date reference found, provide:
- The exact text as it appears in the source
- The date type (exact, relative, vague)
- A normalized value if possible (ISO date for exact dates, otherwise null)

Output as JSON array of date objects:
[
  {"text": "date as appears", "type": "exact|relative|vague", "value": "normalized date or null"}
]

If no date references are found, return an empty array.
`;

// Combined template that extracts all fact types in one pass (more efficient)
export const COMBINED_EXTRACTION_TEMPLATE = `
You are an expert fact extraction specialist. Extract ONLY explicitly stated information from the provided text chunk.

Text to analyze:
{chunk_content}

Extract and return the following in JSON format:

{
  "facts": ["explicit factual statement 1", "explicit factual statement 2", ...],
  "quotes": [
    {"text": "exact verbatim quote", "speaker": "speaker name or null", "context": "surrounding context or null"}
  ],
  "statistics": [
    {"value": "numerical value", "unit": "unit or null", "context": "explanatory context or null"}
  ],
  "stories": [
    {"title": "story title or null", "characters": ["character1", "character2", ...], "setting": "setting or null", "moral": "explicit moral or null"}
  ],
  "examples": ["example description 1", "example description 2", ...],
  "lessons": ["explicit lesson or recommendation 1", "explicit lesson or recommendation 2", ...],
  "insights": ["non-obvious conclusion or implication 1", "non-obvious conclusion or implication 2", ...],
  "entities": [
    {"text": "entity text", "type": "ENTITY_TYPE (PERSON, ORGANIZATION, LOCATION, etc.)"}
  ],
  "dates": [
    {"text": "date reference as appears", "type": "exact|relative|vague", "value": "normalized date value (ISO format for exact dates) or null"}
  ]
}

RULES:
1. ONLY extract information that is explicitly stated in the source text
2. NEVER infer, assume, or add information not present in the chunk
3. NEVER create fictional examples, quotes, or stories
4. NEVER exaggerate or embellish any information
5. Quotes MUST be verbatim - do not paraphrase
6. ONLY attribute quotes to speakers if explicitly stated in the text
7. If no items are found for a category, return an empty array
8. Output MUST be valid JSON - no additional text or explanation
`;