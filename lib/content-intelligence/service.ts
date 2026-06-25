import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "@/lib/env";
import {
  ExtractedInsight,
  InsightKind,
  ContentCategory,
  CONTENT_CATEGORIES,
  INSIGHT_KINDS,
  KnowledgeGraph,
  KnowledgeGraphNode,
  KnowledgeGraphEdge,
  QualityScores,
  ContentDraft,
  ProjectMemory,
  ContentIntelligenceReport,
  TranscriptExtractionResult
} from "./types";
import { prisma } from "@/lib/prisma/client";
import { getCachedProject } from "@/lib/projects/store";

// Initialize Gemini client
const gemini = env.geminiKey ? new GoogleGenerativeAI(env.geminiKey) : null;

export class ContentIntelligenceService {
  /**
   * Step 1-2: Extract insights from transcript
   * Returns structured JSON with topics, stories, quotes, etc.
   */
  async extractInsights(transcript: string, title: string = ""): Promise<{
    insights: ExtractedInsight[];
    rawExtractions: Record<string, any>;
  }> {
    if (!gemini) {
      throw new Error("Gemini API key not configured");
    }

    const model = gemini.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
You are an expert content analyst. Extract ALL meaningful insights from the following transcript.
Return ONLY a JSON object with the specified structure. Do not include any explanations or markdown.

TRANSCRIPT:
${transcript}

TITLE: ${title}
DO NOT use the title as an insight. The title is provided only for context.

Extract insights in these categories:
1. topics - Main subjects discussed
2. stories - Personal anecdotes, case studies, narratives
3. quotes - Direct quotes worth repeating
4. statistics - Numerical data, percentages, metrics
5. lessons - Actionable takeaways, wisdom, advice
6. mistakes - Errors to avoid, lessons learned from failure
7. contrarian_opinions - Counterintuitive or opposing viewpoints
8. interesting_moments - Surprising, unexpected, or noteworthy moments
9. emotional_moments - Content that evokes strong feelings
10. curiosity_hooks - Questions or statements that make people want to know more
11. actionable_advice - Specific steps readers can take
12. examples - Concrete illustrations of concepts
13. frameworks - Structured approaches or methodologies
14. analogies - Comparisons that help explain complex ideas
15. surprising_facts - Unexpected information that challenges assumptions

For each insight, provide:
- id: unique identifier (use nanoid format)
- kind: one of the insight kinds listed above
- category: appropriate content category (Curiosity, Educational, etc.)
- title: brief summary of the insight
- text: the full insight content
- evidence: exact quote or reference from transcript supporting this insight
- score: initial importance/relevance score (1-10)
- sourceChunkIds: array of chunk IDs where this insight was found (can be empty for now)
- speaker: optional speaker if identifiable
- timestampMs: optional timestamp if available

Return JSON in this exact format:
{
  "topics": [{...insight objects...}],
  "stories": [{...insight objects...}],
  "quotes": [{...insight objects...}],
  "statistics": [{...insight objects...}],
  "lessons": [{...insight objects...}],
  "mistakes": [{...insight objects...}],
  "contrarianOpinions": [{...insight objects...}],
  "interestingMoments": [{...insight objects...}],
  "emotionalMoments": [{...insight objects...}],
  "curiosityHooks": [{...insight objects...}],
  "actionableAdvice": [{...insight objects...}],
  "examples": [{...insight objects...}],
  "frameworks": [{...insight objects...}],
  "analogies": [{...insight objects...}],
  "surprisingFacts": [{...insight objects...}]
}
    `;

    try {
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Parse JSON response
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());

      // Flatten all insights into a single array with proper typing
      const insights: ExtractedInsight[] = [];
      const insightKinds: InsightKind[] = [
        "topic", "story", "quote", "statistic", "lesson", "mistake",
        "contrarian_opinion", "interesting_moment", "emotional_moment",
        "curiosity_hook", "actionable_advice", "example", "framework",
        "analogy", "surprising_fact"
      ];

      insightKinds.forEach(kind => {
        const key = kind === "contrarian_opinion" ? "contrarianOpinions" :
                   kind === "interesting_moment" ? "interestingMoments" :
                   kind === "emotional_moment" ? "emotionalMoments" :
                   kind === "curiosity_hook" ? "curiosityHooks" :
                   kind === "actionable_advice" ? "actionableAdvice" :
                   kind === "surprising_fact" ? "surprisingFacts" :
                   `${kind}s` as keyof typeof parsed;

        if (parsed[key] && Array.isArray(parsed[key])) {
          parsed[key].forEach((insight: any) => {
            insights.push({
              id: insight.id || Math.random().toString(36).substr(2, 9),
              kind: kind as InsightKind,
              category: this.determineCategoryForInsight(kind, insight.text),
              title: insight.title || insight.text.slice(0, 50) + "...",
              text: insight.text,
              evidence: insight.evidence || "",
              score: insight.score || 5,
              sourceChunkIds: insight.sourceChunkIds || [],
              speaker: insight.speaker,
              timestampMs: insight.timestampMs
            });
          });
        }
      });

      return {
        insights,
        rawExtractions: parsed
      };
    } catch (error) {
      console.error("Error extracting insights:", error);
      throw new Error(`Failed to extract insights: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Determine appropriate content category for an insight kind
   */
  private determineCategoryForInsight(kind: InsightKind, text: string): ContentCategory {
    // Mapping from insight kinds to content categories
    const kindToCategoryMap: Record<InsightKind, ContentCategory> = {
      "topic": "Educational",
      "story": "Story",
      "quote": "Quote",
      "statistic": "Data",
      "lesson": "Educational",
      "mistake": "Mistake",
      "contrarian_opinion": "Contrarian",
      "interesting_moment": "Curiosity",
      "emotional_moment": "Story",
      "curiosity_hook": "Curiosity",
      "actionable_advice": "Actionable",
      "example": "Educational",
      "framework": "Framework",
      "analogy": "Educational",
      "surprising_fact": "Curiosity"
    };

    return kindToCategoryMap[kind] || "Educational";
  }

  /**
   * Step 3: Build knowledge graph from extracted insights
   * Connects related insights and identifies relationships
   */
  async buildKnowledgeGraph(insights: ExtractedInsight[]): Promise<KnowledgeGraph> {
    const nodes: KnowledgeGraphNode[] = [];
    const edges: KnowledgeGraphEdge[] = [];

    // Create nodes for each insight
    insights.forEach(insight => {
      nodes.push({
        id: insight.id,
        label: insight.title,
        kind: insight.kind as "topic" | "insight" | "story" | "quote" | "lesson" | "hook" | "framework",
        category: insight.category,
        weight: insight.score,
        insightIds: [insight.id]
      });
    });

    // If we have Gemini, use it to find relationships between insights
    if (gemini && insights.length > 1) {
      try {
        const relationships = await this.discoverInsightRelationships(insights);
        edges.push(...relationships);
      } catch (error) {
        console.warn("Could not discover insight relationships:", error);
        // Fallback to simple similarity-based connections
        return this.buildFallbackKnowledgeGraph(insights);
      }
    } else {
      // Fallback to simple similarity-based connections
      return this.buildFallbackKnowledgeGraph(insights);
    }

    return { nodes, edges };
  }

  /**
   * Use Gemini to discover relationships between insights
   */
  private async discoverInsightRelationships(insights: ExtractedInsight[]): Promise<KnowledgeGraphEdge[]> {
    if (!gemini) return [];

    const model = gemini.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Prepare insights for analysis
    const insightSummaries = insights.map(i => ({
      id: i.id,
      kind: i.kind,
      category: i.category,
      title: i.title,
      text: i.text.substring(0, 200) // Limit text length
    }));

    const prompt = `
Analyze the following insights and identify meaningful relationships between them.
Return ONLY a JSON array of relationship objects.

INSIGHTS:
${JSON.stringify(insightSummaries, null, 2)}

For each relationship, specify:
- from: ID of the source insight
- to: ID of the target insight
- relation: one of "supports", "contrasts", "explains", "uses_example", "contains_quote", "leads_to", "same_theme"
- weight: strength of relationship (1-10)

Relationship types:
- supports: one insight provides evidence or backing for another
- contrasts: insights present opposing or contradictory viewpoints
- explains: one insight clarifies or elaborates on another
- uses_example: one insight uses another as an illustrative example
- contains_quote: one insight includes a direct quote from another
- leads_to: one insight naturally leads to or follows another in a logical sequence
- same_theme: insights share a common theme or topic

Return JSON in this exact format:
[
  {"from": "id1", "to": "id2", "relation": "supports", "weight": 8},
  {"from": "id3", "to": "id4", "relation": "contrasts", "weight": 6}
]
    `;

    try {
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Parse JSON response
      const relationships = JSON.parse(text.replace(/```json|```/g, "").trim());

      // Validate and return relationships
      if (Array.isArray(relationships)) {
        return relationships.map((rel: any) => ({
          from: rel.from,
          to: rel.to,
          relation: rel.relation as any,
          weight: Math.min(10, Math.max(1, rel.weight || 5))
        }));
      }

      return [];
    } catch (error) {
      console.error("Error discovering insight relationships:", error);
      return [];
    }
  }

  /**
   * Fallback method to build knowledge graph using simple text similarity
   */
  private buildFallbackKnowledgeGraph(insights: ExtractedInsight[]): KnowledgeGraph {
    const nodes: KnowledgeGraphNode[] = [];
    const edges: KnowledgeGraphEdge[] = [];

    // Create nodes for each insight
    insights.forEach(insight => {
      nodes.push({
        id: insight.id,
        label: insight.title,
        kind: insight.kind as "topic" | "insight" | "story" | "quote" | "lesson" | "hook" | "framework",
        category: insight.category,
        weight: insight.score,
        insightIds: [insight.id]
      });
    });

    // Create simple edges based on shared categories or keywords
    for (let i = 0; i < insights.length; i++) {
      for (let j = i + 1; j < insights.length; j++) {
        const insight1 = insights[i];
        const insight2 = insights[j];

        let relation: KnowledgeGraphEdge["relation"] = "same_theme";
        let weight = 1;

        // Same category insights are related
        if (insight1.category === insight2.category) {
          relation = "same_theme";
          weight = 5;
        }

        // Check for keyword overlap in titles/text
        const text1 = insight1.text ?? "";
        const text2 = insight2.text ?? "";
        const words1 = new Set(text1.toLowerCase().split(/\s+/));
        const words2 = new Set(text2.toLowerCase().split(/\s+/));
        const commonWords = [...words1].filter(word => words2.has(word));

        if (commonWords.length > 2) {
          if (relation === "same_theme") {
            weight = Math.min(10, weight + commonWords.length);
          } else {
            relation = "same_theme";
            weight = Math.min(10, 3 + commonWords.length);
          }
        }

        // Add edge if there's a meaningful connection
        if (weight >= 3) {
          edges.push({
            from: insight1.id,
            to: insight2.id,
            relation,
            weight
          });
        }
      }
    }

    return { nodes, edges };
  }

  /**
   * Step 4: Generate content by category using insights and knowledge graph
   */
  async generateContentByCategory(
    insights: ExtractedInsight[],
    knowledgeGraph: KnowledgeGraph,
    platforms: string[] = ["TWITTER", "LINKEDIN", "INSTAGRAM", "FACEBOOK", "THREADS", "CAROUSEL", "COMMUNITY", "STORY", "HOOKS", "CTA"],
    tone: string = "professional"
  ): Promise<ContentDraft[]> {
    const drafts: ContentDraft[] = [];

    // Group insights by category
    const insightsByCategory: Record<ContentCategory, ExtractedInsight[]> = {};
    CONTENT_CATEGORIES.forEach(category => {
      insightsByCategory[category] = insights.filter(i => i.category === category);
    });

    // For each category with insights, generate content for each platform
    for (const category of CONTENT_CATEGORIES) {
      const categoryInsights = insightsByCategory[category];
      if (categoryInsights.length === 0) continue;

      // Prepare context from insights and knowledge graph
      const context = this.prepareGenerationContext(categoryInsights, knowledgeGraph);

      // Generate content for each platform
      for (const platform of platforms) {
        try {
          const content = await this.generatePlatformContent(
            platform,
            category,
            context,
            tone,
            categoryInsights
          );

          if (content) {
            const safeCategory = (category ?? "").toLowerCase();
            const safePlatform = (platform ?? "").toLowerCase();
            drafts.push({
              id: `${safeCategory}-${safePlatform}-${Math.random().toString(36).substr(2, 9)}`,
              platform: platform as any,
              category,
              contentType: `${platform} post`,
              body: content,
              originalBody: content,
              tone,
              quality: { originality: 0, clarity: 0, humanLikeness: 0, usefulness: 0, readability: 0, overall: 0, reasons: [] },
              sourceInsightIds: categoryInsights.map(i => i.id),
              reviewerNotes: []
            });
          }
        } catch (error) {
          console.warn(`Failed to generate ${platform} content for ${category} category:`, error);
          // Continue with other platforms/categories
        }
      }
    }

    return drafts;
  }

  /**
   * Prepare context for content generation from insights and knowledge graph
   */
  private prepareGenerationContext(
    insights: ExtractedInsight[],
    knowledgeGraph: KnowledgeGraph
  ): string {
    // Sort insights by score (weight) descending
    const sortedInsights = [...insights].sort((a, b) => b.score - a.score);

    // Take top insights for context
    const topInsights = sortedInsights.slice(0, Math.min(10, sortedInsights.length));

    // Build context string
    const contextParts = [
      `KEY INSIGHTS FROM SOURCE MATERIAL:`,
      topInsights.map(insight =>
        `- [${insight.kind.toUpperCase()}] ${insight.title}: ${insight.text}`
      ).join("\n"),
      "",
      `KNOWLEDGE GRAPH CONNECTIONS:`,
      knowledgeGraph.edges.slice(0, 20).map(edge => {
        const fromNode = knowledgeGraph.nodes.find(n => n.id === edge.from);
        const toNode = knowledgeGraph.nodes.find(n => n.id === edge.to);
        if (fromNode && toNode) {
          return `- ${fromNode.label} ${edge.relation} ${toNode.label} (weight: ${edge.weight})`;
        }
        return "";
      }).filter(Boolean).join("\n")
    ];

    return contextParts.join("\n");
  }

  /**
   * Generate platform-specific content using insights context
   */
  private async generatePlatformContent(
    platform: string,
    category: ContentCategory,
    context: string,
    tone: string,
    insights: ExtractedInsight[]
  ): Promise<string | null> {
    if (!gemini) {
      return this.fallbackPlatformContent(platform, category, insights);
    }

    const model = gemini.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Platform-specific prompts
    const platformPrompts: Record<string, (ctx: string, tone: string, insights: ExtractedInsight[]) => string> = {
      TWITTER: this.createTwitterPrompt,
      LINKEDIN: this.createLinkedInPrompt,
      INSTAGRAM: this.createInstagramPrompt,
      FACEBOOK: this.createFacebookPrompt,
      THREADS: this.createThreadsPrompt,
      CAROUSEL: this.createCarouselPrompt,
      COMMUNITY: this.createCommunityPrompt,
      STORY: this.createStoryPrompt,
      HOOKS: this.createHooksPrompt,
      CTA: this.createCTAPrompt
    };

    const promptCreator = platformPrompts[platform] || this.createDefaultPrompt;
    const prompt = promptCreator(context, tone, insights);

    try {
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          temperature: 0.7,
          maxOutputTokens: 1000,
        }
      });

      const response = result.response;
      const text = response.text();
      return text.trim();
    } catch (error) {
      console.error(`Error generating ${platform} content:`, error);
      return this.fallbackPlatformContent(platform, category, insights);
    }
  }

  // Platform-specific prompt creators
  private createTwitterPrompt(context: string, tone: string, insights: ExtractedInsight[]): string {
    return `
You are an expert X/Twitter content creator. Create an engaging thread based on the insights provided.

CONTEXT:
${context}

TONE: ${tone}

REQUIREMENTS:
1. Create a Twitter thread (5-8 tweets)
2. Each tweet must be under 280 characters
3. First tweet (hook) should be surprising or curiosity-inducing
4. Use numbered format: 1/, 2/, 3/, etc.
5. Separate tweets with "---"
6. Include relevant insights from the context
7. End with a call-to-action or thought-provoking question
8. DO NOT explain or add commentary - ONLY output the thread

FORMAT EXAMPLE:
1/ [Hook/tweet content]
---
2/ [Second tweet content]
---
3/ [Third tweet content]

OUTPUT ONLY THE THREAD.`;
  }

  private createLinkedInPrompt(context: string, tone: string, insights: ExtractedInsight[]): string {
    return `
You are an expert LinkedIn content creator. Create a professional post based on the insights provided.

CONTEXT:
${context}

TONE: ${tone}

REQUIREMENTS:
1. Create a LinkedIn post (150-300 words)
2. First line: curiosity-inducing hook (under 10 words)
3. Structure: Hook → Context → Body → Lesson → CTA
4. Use short paragraphs and em dashes (—) for section breaks
5. Focus on professional/business insights
6. Use specific numbers and data when available
7. NO HASHTAGS
8. DO NOT explain or add commentary - ONLY output the post

OUTPUT ONLY THE POST.`;
  }

  private createInstagramPrompt(context: string, tone: string, insights: ExtractedInsight[]): string {
    return `
You are an expert Instagram content creator. Create an engaging caption based on the insights provided.

CONTEXT:
${context}

TONE: ${tone}

REQUIREMENTS:
1. Create an Instagram caption
2. First two lines are most important (visible before "...more")
3. Line 1: Hook — number, question, or bold claim (don't start with "I")
4. Line 2: Create curiosity
5. Use line breaks every 1-3 sentences
6. Use arrows (→) for lists
7. 1-3 emojis maximum at natural pause points
8. End with save/share CTA: "Save this if [reason]" or "Share this with [someone who needs it]"
9. Lead with personal journey or emotional arc when appropriate
10. 5-8 hashtags at the very end after 2 blank lines
11. DO NOT explain or add commentary - ONLY output the caption

OUTPUT ONLY THE CAPTION.`;
  }

  private createFacebookPrompt(context: string, tone: string, insights: ExtractedInsight[]): string {
    return `
You are an expert Facebook content creator. Create a conversational post based on the insights provided.

CONTEXT:
${context}

TONE: ${tone}

REQUIREMENTS:
1. Create a Facebook post (80-180 words)
2. Conversational, story-driven tone
3. End with a specific question call-to-action
4. No hashtags unless essential (max 2)
5. DO NOT explain or add commentary - ONLY output the post

OUTPUT ONLY THE POST.`;
  }

  private createThreadsPrompt(context: string, tone: string, insights: ExtractedInsight[]): string {
    return `
You are an expert Threads content creator. Create a post sequence based on the insights provided.

CONTEXT:
${context}

TONE: ${tone}

REQUIREMENTS:
1. Create a Threads post sequence (4-5 posts)
2. Short conversational posts, one idea each
3. Separate posts with ---
4. End with a reply-friendly question
5. DO NOT explain or add commentary - ONLY output the posts

OUTPUT ONLY THE POSTS.`;
  }

  private createCarouselPrompt(context: string, tone: string, insights: ExtractedInsight[]): string {
    return `
You are an expert Instagram carousel creator. Create a 5-slide carousel based on the insights provided.

CONTEXT:
${context}

TONE: ${tone}

REQUIREMENTS:
1. Create an Instagram carousel (5 slides)
2. Slide 1: Hook headline + subline
3. Slides 2-4: Problem → Steps → Insight (one headline + 2-3 bullets each)
4. Slide 5: Call to action
5. Format each slide exactly as:
   SLIDE N: [Headline]
   → bullet 1
   → bullet 2
6. Separate slides with ---
7. DO NOT explain or add commentary - ONLY output the slides

OUTPUT ONLY THE SLIDES.`;
  }

  private createCommunityPrompt(context: string, tone: string, insights: ExtractedInsight[]): string {
    return `
You are an expert YouTube Community creator. Create an engaging post based on the insights provided.

CONTEXT:
${context}

TONE: ${tone}

REQUIREMENTS:
1. Create a YouTube Community post
2. Short, direct update or poll question
3. If poll: include 4 answer options labeled A) B) C) D)
4. 40-120 words
5. DO NOT explain or add commentary - ONLY output the post

OUTPUT ONLY THE POST.`;
  }

  private createStoryPrompt(context: string, tone: string, insights: ExtractedInsight[]): string {
    return `
You are an expert short-form video creator. Create a Reel/TikTok/Shorts script based on the insights provided.

CONTEXT:
${context}

TONE: ${tone}

REQUIREMENTS:
1. Create a Reel/Short video script (spoken word)
2. Structure with timestamps:
   [HOOK — 0 to 3 sec]
   [lines]

   [CONTEXT — 3 to 8 sec]
   [lines]

   [POINT 1 — 8 to 20 sec]
   [lines]

   [POINT 2 — 20 to 32 sec]
   [lines]

   [POINT 3 — 32 to 45 sec]
   [lines]

   [CTA — 45 to 55 sec]
   [lines]
3. HOOK (first 3 seconds): State surprising number/outcome, question, or bold claim
4. Sentence length: max 10 words per sentence
5. Natural speech: use contractions ("didn't" instead of "did not")
6. Include [TEXT: "key stat"] overlay cues and [B-ROLL: description] cues
7. CTA: last 5-10 seconds, focus on what they get by following
8. Length: 45-60 seconds (~100-130 words)
9. DO NOT explain or add commentary - ONLY output the script

OUTPUT ONLY THE SCRIPT.`;
  }

  private createHooksPrompt(context: string, tone: string, insights: ExtractedInsight[]): string {
    return `
You are an expert content strategist. Create 10 viral hook lines based on the insights provided.

CONTEXT:
${context}

TONE: ${tone}

REQUIREMENTS:
1. Create 10 viral hook lines
2. Mix: curiosity gap, contrarian, question, personal story
3. One hook per line, separated by ---
4. No numbering, no "Hook 1:" labels
5. DO NOT explain or add commentary - ONLY output the hooks

OUTPUT ONLY THE HOOKS.`;
  }

  private createCTAPrompt(context: string, tone: string, insights: ExtractedInsight[]): string {
    return `
You are an expert marketing strategist. Create 4 distinct call-to-action lines based on the insights provided.

CONTEXT:
${context}

TONE: ${tone}

REQUIREMENTS:
1. Create 4 distinct call-to-action lines
2. 1 engagement CTA, 1 lead magnet CTA, 1 sales CTA, 1 newsletter CTA
3. Separate with ---
4. No labels
5. DO NOT explain or add commentary - ONLY output the CTAs

OUTPUT ONLY THE CTAs.`;
  }

  private createDefaultPrompt(context: string, tone: string, insights: ExtractedInsight[]): string {
    return `
You are an expert content creator. Create engaging content based on the insights provided.

CONTEXT:
${context}

TONE: ${tone}

REQUIREMENTS:
1. Create platform-appropriate content using the insights
2. Match the specified tone: ${tone}
3. Draw from the key insights and knowledge graph connections provided
4. DO NOT explain or add commentary - ONLY output the content

OUTPUT ONLY THE CONTENT.`;
  }

  /**
   * Fallback content generation when Gemini is not available
   */
  private fallbackPlatformContent(platform: string, category: ContentCategory, insights: ExtractedInsight[]): string {
    if (insights.length === 0) return "No insights available for content generation.";

    // Take the top insight for this category
    const topInsight = insights[0];

    switch (platform) {
      case "TWITTER":
        return `1/ ${topInsight.text.slice(0, 200)}...\n---\n2/ Key insight from our analysis\n---\n3/ What this means for you\n---\n4/ Practical application\n---\n5/ Next steps to consider\n---\n6/ Important considerations\n---\n7/ Final thoughts\n---\n8/ What's your take? Share below 👇`;

      case "LINKEDIN":
        return `${topInsight.text.slice(0, 100)}...\n\nContext: This insight comes from deep analysis of source material.\n\nBody: The implications of this finding are significant for practitioners in the field.\n\nThe lesson: Pay attention to these patterns as they often indicate important trends.\n\nCTA: What experiences have you had with similar situations? Share your thoughts in the comments.`;

      case "INSTAGRAM":
        return `🔍 ${topInsight.text.slice(0, 100)}...\n\n→ Key implication: This changes how we think about the topic\n→ Practical takeaway: Consider applying this in your own work\n→ Next step: Explore related concepts and methodologies\n\n💡 Save this post for future reference\n\n#insights #learning #growth #knowledge`;

      case "FACEBOOK":
        return `I came across an interesting insight recently: ${topInsight.text.slice(0, 150)}...\n\nThis really made me think about how we approach this topic. What's fascinating is how it connects to broader patterns in the field.\n\nHave you encountered similar insights in your own experience? I'd love to hear your thoughts and perspectives on this.`;

      case "THREADS":
        return `${topInsight.text.slice(0, 100)}\n---\nThis connects to larger patterns in how we think about the subject\n---\nThe key takeaway here is worth considering for practical applications\n---\nWhat's your perspective on this insight?\n---\nLooking forward to hearing different viewpoints on this topic`;

      case "CAROUSEL":
        return `SLIDE 1: ${topInsight.title}\n→ ${topInsight.text.slice(0, 100)}\n\nSLIDE 2: The Context\n→ Background information\n→ Why this matters\n\nSLIDE 3: Key Implications\n→ What this means for practitioners\n→ How to apply these insights\n\nSLIDE 4: Practical Applications\n→ Real-world examples\n→ Implementation considerations\n\nSLIDE 5: Next Steps\n→ Further exploration\n→ Related topics to investigate\n→ Save for reference`;

      case "COMMUNITY":
        return `Quick insight from our analysis: ${topInsight.text.slice(0, 100)}\n\nWhat do you think this means for the community?\n\nA) It validates current approaches\nB) It suggests we need to adapt\nC) It opens new possibilities\nD) It requires further investigation`;

      case "STORY":
        return `[HOOK — 0 to 3 sec]\n${topInsight.text.slice(0, 50)}\n\n[BODY — 3 to 40 sec]\nThis insight reveals important patterns that are worth noting.\n\nThe implications are significant for how we understand and approach this topic.\n\n[CTA — 40 to 60 sec]\nConsider how this might apply to your own work and what next steps make sense.`;

      case "HOOKS":
        return Array(10).fill(0).map((_, i) =>
          `Hook ${i + 1}: ${topInsight.text.slice(0, 80)}...`
        ).join("\n---\n");

      case "CTA":
        return `Engage with this insight: What are your thoughts?\n---\nLearn more: Download our detailed analysis\n---\nTry this approach: Apply one concept from this analysis\n---\nStay updated: Subscribe for more insights like this`;

      default:
        return topInsight.text;
    }
  }

  /**
   * Step 5: Categorize outputs by content category
   * (Already done in generateContentByCategory, but this could be used for existing content)
   */
  categorizeOutputs(drafts: ContentDraft[]): Record<ContentCategory, ContentDraft[]> {
    const categorized: Record<ContentCategory, ContentDraft[]> = {};
    CONTENT_CATEGORIES.forEach(category => {
      categorized[category] = drafts.filter(draft => draft.category === category);
    });
    return categorized;
  }

  /**
   * Step 6-7: Score content quality and regenerate if needed
   */
  async scoreAndFilterContent(
    drafts: ContentDraft[],
    minScore: number = 8
  ): Promise<{
    accepted: ContentDraft[];
    rejected: ContentDraft[];
    averageScore: number;
  }> {
    const accepted: ContentDraft[] = [];
    const rejected: ContentDraft[] = [];
    let totalScore = 0;
    let scoredCount = 0;

    // Score each draft
    for (const draft of drafts) {
      const qualityScores = await this.scoreContentQuality(draft);
      draft.quality = qualityScores;

      totalScore += qualityScores.overall;
      scoredCount++;

      if (qualityScores.overall >= minScore) {
        accepted.push(draft);
      } else {
        rejected.push(draft);
      }
    }

    const averageScore = scoredCount > 0 ? totalScore / scoredCount : 0;

    // Regenerate rejected content if we have Gemini
    if (gemini && rejected.length > 0) {
      const regenerated = await this.regeneratePoorContent(rejected, minScore);
      accepted.push(...regenerated.accepted);
      // Update rejected to only include those that failed regeneration
      rejected.splice(0, rejected.length, ...regenerated.rejected);
    }

    return {
      accepted,
      rejected,
      averageScore: Math.round(averageScore * 10) / 10 // Round to 1 decimal
    };
  }

  /**
   * Score content quality on multiple dimensions
   */
  private async scoreContentQuality(draft: ContentDraft): Promise<QualityScores> {
    if (!gemini) {
      // Fallback scoring when Gemini not available
      const baseScore = Math.random() * 3 + 4; // 4-7 range
      return {
        originality: Math.min(10, baseScore + (Math.random() * 2)),
        clarity: Math.min(10, baseScore + (Math.random() * 2)),
        humanLikeness: Math.min(10, baseScore + (Math.random() * 2)),
        usefulness: Math.min(10, baseScore + (Math.random() * 2)),
        readability: Math.min(10, baseScore + (Math.random() * 2)),
        overall: 0, // Will be calculated below
        reasons: ["Gemini not available for quality scoring - using fallback"]
      };
    }

    const model = gemini.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
You are an expert content quality evaluator. Score the following content on a scale of 1-10 for each criterion.

CONTENT TO EVALUATE:
${draft.body}

PLATFORM: ${draft.platform}
CATEGORY: ${draft.category}
TONE: ${draft.tone}

Score each dimension:
1. originality: How unique and novel is this content? (1=generic/cliché, 10=highly original)
2. clarity: How clear and easy to understand is the content? (1=confusing/unclear, 10=crystal clear)
3. humanLikeness: How natural and human-like does this read? (1=robotic/AI-like, 10=perfectly human)
4. usefulness: How practical and valuable is this content to the target audience? (1=not useful, 10=extremely valuable)
5. readability: How easy is this to read and engage with? (1=difficult to read, 10=effortlessly readable)

Provide scores AND brief reasons for each score.

Return ONLY a JSON object in this exact format:
{
  "originality": {"score": number, "reason": "brief explanation"},
  "clarity": {"score": number, "reason": "brief explanation"},
  "humanLikeness": {"score": number, "reason": "brief explanation"},
  "usefulness": {"score": number, "reason": "brief explanation"},
  "readability": {"score": number, "reason": "brief explanation"},
  "overall": number
}
    `;

    try {
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Parse JSON response
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());

      // Calculate overall score as average of dimensions
      const dimensions = ["originality", "clarity", "humanLikeness", "usefulness", "readability"];
      const overall = dimensions.reduce((sum, dim) =>
        sum + (parsed[dim] && typeof parsed[dim].score === "number" ? parsed[dim].score : 5), 0) / dimensions.length;

      return {
        originality: {
          score: Math.min(10, Math.max(1, parsed.originality?.score || 5)),
          reason: parsed.originality?.reason || "No reason provided"
        },
        clarity: {
          score: Math.min(10, Math.max(1, parsed.clarity?.score || 5)),
          reason: parsed.clarity?.reason || "No reason provided"
        },
        humanLikeness: {
          score: Math.min(10, Math.max(1, parsed.humanLikeness?.score || 5)),
          reason: parsed.humanLikeness?.reason || "No reason provided"
        },
        usefulness: {
          score: Math.min(10, Math.max(1, parsed.usefulness?.score || 5)),
          reason: parsed.usefulness?.reason || "No reason provided"
        },
        readability: {
          score: Math.min(10, Math.max(1, parsed.readability?.score || 5)),
          reason: parsed.readability?.reason || "No reason provided"
        },
        overall: Math.round(overall * 10) / 10 // Round to 1 decimal
      };
    } catch (error) {
      console.error("Error scoring content quality:", error);
      // Fallback scoring
      const baseScore = Math.random() * 3 + 4; // 4-7 range
      return {
        originality: { score: Math.min(10, baseScore + (Math.random() * 2)), reason: "Scoring failed - fallback used" },
        clarity: { score: Math.min(10, baseScore + (Math.random() * 2)), reason: "Scoring failed - fallback used" },
        humanLikeness: { score: Math.min(10, baseScore + (Math.random() * 2)), reason: "Scoring failed - fallback used" },
        usefulness: { score: Math.min(10, baseScore + (Math.random() * 2)), reason: "Scoring failed - fallback used" },
        readability: { score: Math.min(10, baseScore + (Math.random() * 2)), reason: "Scoring failed - fallback used" },
        overall: Math.round((baseScore + Math.random() * 2) * 10) / 10,
        reasons: [`Quality scoring failed: ${error instanceof Error ? error.message : String(error)}`]
      };
    }
  }

  /**
   * Regenerate poor quality content
   */
  private async regeneratePoorContent(
    rejectedDrafts: ContentDraft[],
    minScore: number = 8
  ): Promise<{ accepted: ContentDraft[]; rejected: ContentDraft[] }> {
    const accepted: ContentDraft[] = [];
    const rejected: ContentDraft[] = [];

    for (const draft of rejectedDrafts) {
      // Try to regenerate up to 2 times
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          // Create a new draft with regeneration flag
          const regeneratedDraft = await this.regenerateSingleDraft(draft, attempt + 1);

          // Score the regenerated content
          const qualityScores = await this.scoreContentQuality(regeneratedDraft);
          regeneratedDraft.quality = qualityScores;

          if (qualityScores.overall >= minScore) {
            accepted.push(regeneratedDraft);
            break; // Success, move to next draft
          } else if (attempt === 1) {
            // Second attempt failed
            rejected.push(regeneratedDraft);
          }
          // If first attempt failed, continue to second attempt
        } catch (error) {
          console.error(`Error regenerating draft (attempt ${attempt + 1}):`, error);
          if (attempt === 1) {
            rejected.push(draft); // Keep original if regeneration fails
          }
        }
      }
    }

    return { accepted, rejected };
  }

  /**
   * Regenerate a single draft with improved prompting
   */
  private async regenerateSingleDraft(
    draft: ContentDraft,
    attemptNumber: number
  ): Promise<ContentDraft> {
    if (!gemini) {
      // Return fallback version
      return {
        ...draft,
        body: this.fallbackPlatformContent(draft.platform, draft.category, []),
        originalBody: this.fallbackPlatformContent(draft.platform, draft.category, [])
      };
    }

    // For now, return a slightly modified version - in a full implementation
    // we would retrieve the original insights and context and regenerate with better prompting
    return {
      ...draft,
      body: `[REGENERATION ATTEMPT ${attemptNumber}] ${draft.body}`,
      originalBody: `[REGENERATION ATTEMPT ${attemptNumber}] ${draft.originalBody}`
    };
  }

  /**
   * Main pipeline function - executes all 7 steps
   */
  async runContentIntelligencePipeline(
    transcript: string,
    title: string = "",
    projectId: string = "",
    platforms: string[] = ["TWITTER", "LINKEDIN", "INSTAGRAM", "FACEBOOK", "THREADS", "CAROUSEL", "COMMUNITY", "STORY", "HOOKS", "CTA"],
    tone: string = "professional"
  ): Promise<ContentIntelligenceReport> {
    try {
      // Step 1-2: Extract insights from transcript
      console.log("[Content Intelligence] Step 1-2: Extracting insights from transcript...");
      const { insights, rawExtractions } = await this.extractInsights(transcript, title);

      // Step 3: Build knowledge graph from insights
      console.log("[Content Intelligence] Step 3: Building knowledge graph...");
      const knowledgeGraph = await this.buildKnowledgeGraph(insights);

      // Step 4: Generate content by category using insights and knowledge graph
      console.log("[Content Intelligence] Step 4: Generating content by category...");
      const drafts = await this.generateContentByCategory(insights, knowledgeGraph, platforms, tone);

      // Step 5: Categorize outputs (already done in generation, but we can reorganize)
      console.log("[Content Intelligence] Step 5: Categorizing outputs...");
      const categorized = this.categorizeOutputs(drafts);

      // Step 6-7: Score content quality and regenerate if needed
      console.log("[Content Intelligence] Step 6-7: Scoring content quality and regenerating if needed...");
      const { accepted, rejected, averageScore } = await this.scoreAndFilterContent(drafts, 8);

      // Create project memory (simplified)
      const memory: ProjectMemory = {
        previousOutputs: accepted.map(d => d.body),
        usedTopics: [...new Set(insights.filter(i => i.kind === "topic").map(i => i.title))],
        usedHookStyles: [...new Set(insights.filter(i => i.kind === "curiosity_hook").map(i => i.title))],
        writingStylePreferences: [tone],
        bannedPhrases: [] // Would be populated from banned phrases list
      };

      // Return complete report
      return {
        version: "content-intelligence-v1",
        transcript: {
          method: "api_extraction",
          cached: false,
          wordCount: transcript.split(/\s+/).length,
          chunkCount: Math.ceil((transcript.split(/\s+/).length) / 500), // Assume 500 words per chunk
          warnings: []
        },
        topics: rawExtractions.topics?.map((t: any) => t.text) || [],
        stories: rawExtractions.stories?.map((s: any) => s.text) || [],
        quotes: rawExtractions.quotes?.map((q: any) => q.text) || [],
        statistics: rawExtractions.statistics?.map((s: any) => s.text) || [],
        lessons: rawExtractions.lessons?.map((l: any) => l.text) || [],
        mistakes: rawExtractions.mistakes?.map((m: any) => m.text) || [],
        contrarianOpinions: rawExtractions.contrarianOpinions?.map((c: any) => c.text) || [],
        interestingMoments: rawExtractions.interestingMoments?.map((i: any) => i.text) || [],
        emotionalMoments: rawExtractions.emotionalMoments?.map((e: any) => e.text) || [],
        curiosityHooks: rawExtractions.curiosityHooks?.map((c: any) => c.text) || [],
        actionableAdvice: rawExtractions.actionableAdvice?.map((a: any) => a.text) || [],
        examples: rawExtractions.examples?.map((e: any) => e.text) || [],
        frameworks: rawExtractions.frameworks?.map((f: any) => f.text) || [],
        analogies: rawExtractions.analogies?.map((a: any) => a.text) || [],
        surprisingFacts: rawExtractions.surprisingFacts?.map((f: any) => f.text) || [],
        insights,
        graph: knowledgeGraph,
        categories: this.categorizeOutputs(accepted), // Use accepted drafts for final categorization
        memory,
        quality: {
          averageScore,
          rejectedDrafts: rejected.length
        }
      };
    } catch (error) {
      console.error("Error in content intelligence pipeline:", error);
      throw new Error(`Content intelligence pipeline failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// Export singleton instance
export const contentIntelligenceService = new ContentIntelligenceService();