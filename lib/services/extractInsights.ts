import { generateAIText, getAIClient } from "@/lib/ai/client";

/**
 * Extracts insights from a transcript.
 * Returns a promise that resolves to the insights object.
 */
export async function extractInsights(transcript: string, videoTitle: string) {
  const aiClient = getAIClient();
  if (!aiClient) {
    throw new Error('AI API key not configured. Set NVIDIA_API_KEY.');
  }

  const prompt = `
You are analyzing a video transcript to extract real, specific content
for social media posts. The video title is provided as light context
only — do not quote or reuse its exact wording anywhere in your output.

VIDEO TITLE (context only): ${videoTitle}

FULL TRANSCRIPT:
"""
${transcript}
"""

Extract the following from what was ACTUALLY SAID in the transcript:

1. main_topics — 2-4 core subjects discussed
2. interesting_moments — specific moments, turns, or reveals in the conversation
3. surprising_facts — facts or claims stated that are not common knowledge
4. quotes — up to 5 short, quotable lines actually said (verbatim or near-verbatim)
5. stories — any anecdotes, examples, or narratives mentioned
6. contrarian_opinions — any opinion that goes against common belief
7. lessons — practical takeaways a viewer would walk away with
8. actionable_advice — specific steps or advice given
9. statistics — any numbers, data points, or measurable claims mentioned
10. emotional_moments — moments of humor, frustration, excitement, or tension
11. curiosity_hooks — open questions or intriguing setups that would make
    someone want to know more

Return ONLY this JSON structure, no explanation, no markdown fences:
{
  "main_topics": ["...", "..."],
  "interesting_moments": ["...", "..."],
  "surprising_facts": ["...", "..."],
  "quotes": ["...", "..."],
  "stories": ["...", "..."],
  "contrarian_opinions": ["...", "..."],
  "lessons": ["...", "..."],
  "actionable_advice": ["...", "..."],
  "statistics": ["...", "..."],
  "emotional_moments": ["...", "..."],
  "curiosity_hooks": ["...", "..."]
}

VALIDATION: every array item must trace back to something actually said
in the transcript. If you cannot find real content for a category,
return an empty array for it — do not invent generic filler.
`;

  const text = await generateAIText({
    prompt,
    responseMimeType: "application/json",
  });

  // Parse JSON response
  const cleaned = text.replace(/```json|```/g, '').trim();
  const result = JSON.parse(cleaned);

  // Validate that we have at least some facts/insights
  const hasFacts = 
    (result.main_topics && result.main_topics.length > 0) ||
    (result.lessons && result.lessons.length > 0) ||
    (result.actionable_advice && result.actionable_advice.length > 0) ||
    (result.surprising_facts && result.surprising_facts.length > 0);

  if (!hasFacts) {
    throw new Error("Fact extraction stage returned zero insights/facts.");
  }

  return result;
}
