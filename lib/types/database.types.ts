// Database TypeScript Interfaces for Recastr
// Generated from database schema

export interface Source {
  id: string;
  user_id: string;
  title: string;
  source_type: 'youtube' | 'article' | 'blog' | 'podcast' | 'pdf' | 'transcript';
  url: string | null;
  file_url: string | null;
  status: 'uploaded' | 'processing' | 'processed' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface SourceContent {
  id: string;
  source_id: string;
  content: string;
  content_length: number | null;
  created_at: string;
}

export interface SourceChunk {
  id: string;
  source_content_id: string;
  chunk_index: number;
  content: string;
  word_count: number | null;
  start_char: number | null;
  end_char: number | null;
  created_at: string;
}

export interface ExtractedFact {
  id: string;
  source_chunk_id: string;
  fact_type: 'fact' | 'quote' | 'statistic' | 'story' | 'insight';
  evidence_text: string;
  content: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface Quote {
  id: string;
  fact_id: string;
  speaker_name: string | null;
  context: string | null;
  created_at: string;
}

export interface Statistic {
  id: string;
  fact_id: string;
  value: string;
  unit: string | null;
  context: string | null;
  created_at: string;
}

export interface Story {
  id: string;
  fact_id: string;
  title: string | null;
  // character_text is stored as text but should be parsed as string[]
  character_text: string; // JSON string array, e.g., '["Alice", "Bob"]'
  setting: string | null;
  moral: string | null;
  created_at: string;
}

export interface Insight {
  id: string;
  fact_id: string;
  category: string | null;
  created_at: string;
}

export interface Embedding {
  id: string;
  target_type: 'source_chunk' | 'generated_post_sentence';
  target_id: string;
  embedding: number[]; // Vector embedding (384 dimensions)
  model: string;
  created_at: string;
}

export interface GeneratedPost {
  id: string;
  source_id: string;
  platform: 'linkedin' | 'twitter' | 'instagram' | 'facebook' | 'threads';
  style: 'educational' | 'story-based' | 'contrarian' | 'lessons-learned' | 'actionable-tips' | 'summary' | 'carousel' | 'thread';
  content: string;
  status: 'draft' | 'pending-review' | 'approved' | 'rejected' | 'published';
  created_at: string;
  updated_at: string;
}

export interface PostSentence {
  id: string;
  post_id: string;
  sentence_index: number;
  sentence_text: string;
  char_start: number | null;
  char_end: number | null;
  created_at: string;
}

export interface SentenceClaim {
  id: string;
  sentence_id: string;
  fact_id: string;
  confidence_score: number; // 0-1
  created_at: string;
}

export interface VerificationResult {
  id: string;
  sentence_claim_id: string;
  is_supported: boolean;
  supporting_text: string | null;
  verification_confidence: number; // 0-1
  verified_at: string;
  verifier_model: string | null;
}

export interface ConfidenceScore {
  id: string;
  post_id: string;
  overall_score: number; // 0-1
  claim_support_score: number; // 0-1
  factual_accuracy_score: number; // 0-1
  source_traceability_score: number; // 0-1
  confidence_level: 'high' | 'medium' | 'low';
  calculated_at: string;
}

export interface PublishingJob {
  id: string;
  post_id: string;
  platform: 'linkedin' | 'twitter' | 'instagram' | 'facebook' | 'threads';
  status: 'queued' | 'processing' | 'published' | 'failed';
  scheduled_at: string | null;
  published_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiUsage {
  id: string;
  user_id: string;
  service: string; // e.g., 'gemini', 'claude', 'gpt-4'
  operation: string; // e.g., 'fact_extraction', 'post_generation', 'verification'
  model: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  cost_usd: number | null;
  request_id: string | null;
  created_at: string;
}

// Helper types for extended entities (when joined with base tables)
export interface QuoteWithFact extends Quote, Omit<ExtractedFact, 'id' | 'created_at'> {
  fact_id: string; // Override to match the fact id
}

export interface StatisticWithFact extends Statistic, Omit<ExtractedFact, 'id' | 'created_at'> {
  fact_id: string;
}

export interface StoryWithFact extends Story, Omit<ExtractedFact, 'id' | 'created_at'> {
  fact_id: string;
}

export interface InsightWithFact extends Insight, Omit<ExtractedFact, 'id' | 'created_at'> {
  fact_id: string;
}

// Helper type for sentence with its claims
export interface SentenceWithClaims extends PostSentence {
  claims: (SentenceClaim & {
    fact: ExtractedFact &
      ({ fact_type: 'quote' } & QuoteWithFact |
        { fact_type: 'statistic' } & StatisticWithFact |
        { fact_type: 'story' } & StoryWithFact |
        { fact_type: 'insight' } & InsightWithFact |
        { fact_type: 'fact' } & Omit<ExtractedFact, 'fact_id'>)
  })[];
}

// Helper type for generated post with sentences and claims
export interface GeneratedPostWithSentences extends GeneratedPost {
  sentences: (PostSentence & {
    claims: (SentenceClaim & {
      fact: ExtractedFact &
        ({ fact_type: 'quote' } & QuoteWithFact |
         { fact_type: 'statistic' } & StatisticWithFact |
         { fact_type: 'story' } & StoryWithFact |
         { fact_type: 'insight' } & InsightWithFact |
         { fact_type: 'fact' } & Omit<ExtractedFact, 'fact_id'>)
    })[];
  })[];
}