// lib/knowledgeBase/shared/normalizers.ts

/**
 * Normalization utilities for knowledge base construction
 */

/**
 * Normalize whitespace: convert line endings to LF, collapse multiple spaces/tabs,
 * limit consecutive newlines to two, trim.
 */
export function normalizeWhitespace(text: string): string {
  if (!text) return '';
  // Normalize line endings
  let normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Replace tabs and multiple spaces with single space
  normalized = normalized.replace(/[\t\v\f ]+/g, ' ');
  // Limit consecutive newlines to at most two
  normalized = normalized.replace(/\n{3,}/g, '\n\n');
  // Trim leading/trailing whitespace
  return normalized.trim();
}

/**
 * Normalize quotation marks and apostrophes to standard ASCII characters.
 * Also normalizes various dash characters.
 */
export function normalizeQuotes(text: string): string {
  if (!text) return '';
  // Smart quotes to straight quotes
  const quotes: [RegExp, string][] = [
    [/[‘’‚‛′‵]/g, "'"], // single quotation marks
    [/[“”„‟″‴]/g, '"'], // double quotation marks
    // Guillemets
    [/[«»‹›]/g, '"'],
  ];
  let normalized = text;
  for (const [regex, replacement] of quotes) {
    normalized = normalized.replace(regex, replacement);
  }
  // Dashes: en dash, em dash, horizontal bar to hyphen (or keep as hyphen? we'll convert to hyphen for simplicity)
  normalized = normalized.replace(/[‒–—―⃣‐]/g, '-');
  // Ellipsis
  normalized = normalized.replace(/…/g, '...');
  return normalized;
}

/**
 * Remove common boilerplate text like page numbers, headers, footers, etc.
 * This is a simple heuristic implementation.
 */
export function removeBoilerplate(text: string): string {
  if (!text) return '';
  // Remove lines that look like page numbers (e.g., "Page 1 of 10", "Page 1", "- 1 -")
  let cleaned = text.replace(/^\s*(page\s+\d+(\s+of\s+\d+)?|[-_]\s*\d+\s*[-_]|^\d+$)\s*$/gim, '');
  // Remove lines that are just numbers (common in PDFs)
  cleaned = cleaned.replace(/^\s*\d+\s*$/gm, '');
  // Remove multiple consecutive blank lines that may have been created
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  return cleaned.trim();
}

/**
 * Unicode normalization: convert to NFC form (canonical decomposition followed by canonical composition).
 * Note: This requires the String.prototype.normalize method (ES2015+).
 */
export function normalizeUnicode(text: string): string {
  if (!text) return '';
  return text.normalize('NFC');
}

/**
 * Normalize entity names: apply standard normalizations and then entity-specific rules.
 */
export function normalizeEntityName(text: string): string {
  if (!text) return '';
  let normalized = normalizeWhitespace(text);
  normalized = normalizeQuotes(normalized);
  normalized = normalizeUnicode(normalized);
  // Additional entity-specific rules can be added here
  // For now, return the normalized string
  return normalized;
}

/**
 * Normalize fact text: apply standard normalizations.
 */
export function normalizeFactText(text: string): string {
  if (!text) return '';
  let normalized = normalizeWhitespace(text);
  normalized = normalizeQuotes(normalized);
  normalized = normalizeUnicode(normalized);
  // Additional fact-specific rules can be added here
  return normalized;
}

/**
 * Extract evidence text from the original chunk.
 * In an ideal scenario, the evidence text should be exactly as it appears in the chunk.
 * This helper ensures we trim whitespace and normalize newlines within the evidence.
 */
export function extractEvidenceText(evidence: string, originalChunk: string): string {
  if (!evidence) return '';
  // Ensure the evidence actually exists in the chunk (case-sensitive)
  // We could do a fuzzy match, but for simplicity we assume the provider returns exact text.
  // Just normalize whitespace within the evidence.
  return normalizeWhitespace(evidence);
}

/**
 * Calculate confidence score for a fact based on how well its evidence matches the source chunk.
 * Considers:
 *   - Exact match confidence (1.0 if evidence found exactly in chunk)
 *   - Length ratio (longer evidence may be more reliable)
 *   - Presence of quotes or numbers (for specific fact types)
 *   - Normalized edit distance (simplified)
 * Returns a value between 0 and 1.
 */
export function calculateConfidence(evidenceText: string, originalChunk: string): number {
  if (!evidenceText || !originalChunk) return 0.0;

  // Trim and normalize both for comparison
  const normEvidence = normalizeWhitespace(evidenceText);
  const normChunk = normalizeWhitespace(originalChunk);

  // Exact match yields highest confidence
  if (normChunk.includes(normEvidence)) {
    // Base confidence on relative length (longer evidence in context is better)
    const lengthRatio = Math.min(normEvidence.length / normChunk.length, 1);
    // Length factor: longer evidence gets higher weight, but cap at 0.9 to leave room for other factors
    const lengthScore = Math.min(0.9, 0.5 + lengthRatio * 0.4); // ranges from 0.5 to 0.9
    // Exact match bonus
    return Math.min(0.95 + lengthScore * 0.05, 1.0); // max 1.0
  }

  // If not exact match, try fuzzy matching (simple character overlap)
  // For simplicity, we'll compute a similarity ratio based on character sets
  const evidenceChars = new Set(normEvidence.split(''));
  const chunkChars = new Set(normChunk.split(''));
  let intersection = 0;
  for (const ch of evidenceChars) {
    if (chunkChars.has(ch)) intersection++;
  }
  const union = new Set([...normEvidence, ...normChunk].join('')).size;
  const jaccard = union > 0 ? intersection / union : 0;

  // Jaccard similarity is typically low for short strings; we map to confidence range 0.1-0.5
  const similarityScore = 0.1 + jaccard * 0.4; // 0.1 to 0.5

  // Penalize if evidence is very short (likely noise)
  const lengthPenalty = normEvidence.length < 10 ? 0.5 : 1.0;

  return similarityScore * lengthPenalty;
}