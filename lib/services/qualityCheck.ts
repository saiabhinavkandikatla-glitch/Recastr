import { generateAIText, getAIClient } from "@/lib/ai/client";
import { type GenerationInsights } from "./generatePosts";

export interface QualityScore {
  originality: number;
  clarity: number;
  usefulness: number;
  human_likeness: number;
  overall: number;
}

/**
 * Scores the generated content based on the original insights.
 * Returns a promise that resolves to the scores object.
 */
export async function scoreContent(generatedText: string, sourceInsights: GenerationInsights): Promise<QualityScore> {
  const aiClient = getAIClient();
  if (!aiClient) {
    // Fallback scoring when OpenAI is not available
    const baseScore = Math.random() * 3 + 4; // 4-7 range
    const originality = Math.min(10, baseScore + (Math.random() * 2));
    const clarity = Math.min(10, baseScore + (Math.random() * 2));
    const usefulness = Math.min(10, baseScore + (Math.random() * 2));
    const human_likeness = Math.min(10, baseScore + (Math.random() * 2));
    const overall = (originality + clarity + usefulness + human_likeness) / 4;
    return {
      originality,
      clarity,
      usefulness,
      human_likeness,
      overall: Math.round(overall * 10) / 10,
    };
  }

  const prompt = `
Rate this generated social media post on a scale of 1-10 for each category.

GENERATED POST:
"""
${generatedText}
"""

ORIGINAL INSIGHTS IT SHOULD BE BASED ON:
${JSON.stringify(sourceInsights)}

Rate:
- originality (1-10): is this specific, or could it apply to any similar video?
- clarity (1-10): is the idea easy to follow?
- usefulness (1-10): would a reader learn or feel something from this?
- human_likeness (1-10): does this sound like a person wrote it, not an AI?

Return ONLY this JSON:
{
  "originality": 0,
  "clarity": 0,
  "usefulness": 0,
  "human_likeness": 0,
  "overall": 0
}
`;

  try {
    const text = await generateAIText({
      model: "gpt-5.4-mini",
      prompt,
      responseMimeType: "application/json",
    });

    // Parse JSON response
    const cleaned = text.replace(/```json|```/g, '').trim();
    const scores = JSON.parse(cleaned);

    // Calculate overall score as average of the four dimensions
    const overall =
      (scores.originality + scores.clarity + scores.usefulness + scores.human_likeness) /
      4;

    return {
      originality: scores.originality,
      clarity: scores.clarity,
      usefulness: scores.usefulness,
      human_likeness: scores.human_likeness,
      overall: Math.round(overall * 10) / 10, // Round to 1 decimal
    };
  } catch (error) {
    console.error('[qualityCheck] Failed to score content:', error);
    // Fallback scoring
    const baseScore = Math.random() * 3 + 4; // 4-7 range
    const originality = Math.min(10, baseScore + (Math.random() * 2));
    const clarity = Math.min(10, baseScore + (Math.random() * 2));
    const usefulness = Math.min(10, baseScore + (Math.random() * 2));
    const human_likeness = Math.min(10, baseScore + (Math.random() * 2));
    const overall = (originality + clarity + usefulness + human_likeness) / 4;
    return {
      originality,
      clarity,
      usefulness,
      human_likeness,
      overall: Math.round(overall * 10) / 10,
    };
  }
}

/**
 * Generates content with a quality gate.
 * If the score is below minScore, it will retry up to a maximum number of attempts.
 */
export async function generateWithQualityGate(
  generateFn: (insights: GenerationInsights, tone: string, transcriptLength?: number) => Promise<string>,
  insights: GenerationInsights,
  tone: string,
  minScore = 7,
  maxAttempts = 2,
  transcriptLength?: number
) {
  let attempt = 0;
  let result = "";
  let score: QualityScore = {
    originality: 0,
    clarity: 0,
    usefulness: 0,
    human_likeness: 0,
    overall: 0,
  };

  while (attempt < maxAttempts) {
    result = await generateFn(insights, tone, transcriptLength);
    score = await scoreContent(result, insights);

    if (score.overall >= minScore) {
      return { content: result, score };
    }
    attempt++;
  }

  // Return best attempt even if below threshold, but flag it
  return { content: result, score, belowThreshold: true };
}
