export function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeQuotes(value: string) {
  return value.replace(/[“”]/g, "\"").replace(/[‘’]/g, "'");
}

export function removeBoilerplate(value: string) {
  return value
    .replace(/\b(like and subscribe|follow for more|click the link)\b/gi, "")
    .trim();
}

export function normalizeUnicode(value: string) {
  return value.normalize("NFKC");
}

export function extractEvidenceText(fact: { evidenceText?: string; text?: string; evidence?: string }) {
  return normalizeWhitespace(fact.evidenceText ?? fact.evidence ?? fact.text ?? "");
}

export function calculateConfidence(score: number) {
  return Math.max(0, Math.min(1, score));
}
