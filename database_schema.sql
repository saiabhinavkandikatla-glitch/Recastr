-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Table: sources
CREATE TABLE sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('youtube', 'article', 'blog', 'podcast', 'pdf', 'transcript')),
    url TEXT,
    file_url TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'processed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: source_contents
CREATE TABLE source_contents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    content_length INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: source_chunks
CREATE TABLE source_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_content_id UUID NOT NULL REFERENCES source_contents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    word_count INTEGER,
    start_char INTEGER,
    end_char INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(source_content_id, chunk_index)
);

-- Table: extracted_facts (base table for all facts)
CREATE TABLE extracted_facts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_chunk_id UUID NOT NULL REFERENCES source_chunks(id) ON DELETE CASCADE,
    fact_type VARCHAR(20) NOT NULL CHECK (fact_type IN ('fact', 'quote', 'statistic', 'story', 'insight')),
    evidence_text TEXT NOT NULL,  -- Exact text from source chunk supporting this fact
    content TEXT NOT NULL,        -- Concise fact statement for knowledge base
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: quotes (extends extracted_facts)
CREATE TABLE quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fact_id UUID NOT NULL REFERENCES extracted_facts(id) ON DELETE CASCADE,
    speaker_name VARCHAR(255),
    context TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: statistics (extends extracted_facts)
CREATE TABLE statistics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fact_id UUID NOT NULL REFERENCES extracted_facts(id) ON DELETE CASCADE,
    value TEXT NOT NULL,          -- Number or percentage as string (e.g., "75%", "1.2M")
    unit VARCHAR(50),             -- e.g., '%', '$', 'users', 'times'
    context TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: stories (extends extracted_facts)
CREATE TABLE stories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fact_id UUID NOT NULL REFERENCES extracted_facts(id) ON DELETE CASCADE,
    title VARCHAR(255),
    character_text TEXT,          -- JSON array of character names stored as text for simplicity
    setting TEXT,
    moral TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: insights (extends extracted_facts)
CREATE TABLE insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fact_id UUID NOT NULL REFERENCES extracted_facts(id) ON DELETE CASCADE,
    category VARCHAR(50),         -- e.g., 'lesson', 'tip', 'warning', 'recommendation'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: embeddings (for vector storage)
CREATE TABLE embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('source_chunk', 'generated_post_sentence')),
    target_id UUID NOT NULL,      -- References either source_chunks.id or generated_post_sentences.id
    embedding VECTOR(384) NOT NULL, -- Using 384 dimensions for sentence-transformers
    model VARCHAR(100) NOT NULL,    -- e.g., 'sentence-transformers/all-MiniLM-L6-v2'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: generated_posts
CREATE TABLE generated_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('linkedin', 'twitter', 'instagram', 'facebook', 'threads')),
    style VARCHAR(20) NOT NULL CHECK (style IN ('educational', 'story-based', 'contrarian', 'lessons-learned', 'actionable-tips', 'summary', 'carousel', 'thread')),
    content TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending-review', 'approved', 'rejected', 'published')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: post_sentences (one per sentence in generated_posts)
CREATE TABLE post_sentences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES generated_posts(id) ON DELETE CASCADE,
    sentence_index INTEGER NOT NULL,
    sentence_text TEXT NOT NULL,
    char_start INTEGER,           -- Character position in post content
    char_end INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, sentence_index)
);

-- Table: sentence_claims (links sentences to facts)
CREATE TABLE sentence_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sentence_id UUID NOT NULL REFERENCES post_sentences(id) ON DELETE CASCADE,
    fact_id UUID NOT NULL REFERENCES extracted_facts(id) ON DELETE CASCADE,
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(sentence_id, fact_id)  -- Prevent duplicate fact claims for same sentence
);

-- Table: verification_results
CREATE TABLE verification_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sentence_claim_id UUID NOT NULL REFERENCES sentence_claims(id) ON DELETE CASCADE,
    is_supported BOOLEAN NOT NULL,
    supporting_text TEXT,         -- Text from knowledge base that supports the claim
    verification_confidence DECIMAL(3,2) CHECK (verification_confidence >= 0 AND verification_confidence <= 1),
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verifier_model VARCHAR(100),  -- e.g., 'gpt-4', 'claude-3-opus'
    CONSTRAINT chk_verification CHECK (
        (is_supported = TRUE AND supporting_text IS NOT NULL) OR
        (is_supported = FALSE AND supporting_text IS NULL)
    )
);

-- Table: confidence_scores
CREATE TABLE confidence_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES generated_posts(id) ON DELETE CASCADE,
    overall_score DECIMAL(3,2) NOT NULL CHECK (overall_score >= 0 AND overall_score <= 1),
    claim_support_score DECIMAL(3,2) NOT NULL CHECK (claim_support_score >= 0 AND claim_support_score <= 1),
    factual_accuracy_score DECIMAL(3,2) NOT NULL CHECK (factual_accuracy_score >= 0 AND factual_accuracy_score <= 1),
    source_traceability_score DECIMAL(3,2) NOT NULL CHECK (source_traceability_score >= 0 AND source_traceability_score <= 1),
    confidence_level VARCHAR(10) NOT NULL CHECK (confidence_level IN ('high', 'medium', 'low')),
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: publishing_jobs
CREATE TABLE publishing_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES generated_posts(id) ON DELETE CASCADE,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('linkedin', 'twitter', 'instagram', 'facebook', 'threads')),
    status VARCHAR(20) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'published', 'failed')),
    scheduled_at TIMESTAMP WITH TIME ZONE,
    published_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: ai_usage (for tracking AI API costs and usage)
CREATE TABLE ai_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    service VARCHAR(50) NOT NULL, -- e.g., 'gemini', 'claude', 'gpt-4'
    operation VARCHAR(50) NOT NULL, -- e.g., 'fact_extraction', 'post_generation', 'verification'
    model VARCHAR(100),           -- Specific model used
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER,
    cost_usd DECIMAL(10,6),       -- Cost in USD
    request_id VARCHAR(255),      -- Provider's request ID for tracing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
-- Sources
CREATE INDEX idx_sources_user_id ON sources(user_id);
CREATE INDEX idx_sources_status ON sources(status);
CREATE INDEX idx_sources_source_type ON sources(source_type);

-- Source contents
CREATE INDEX idx_source_contents_source_id ON source_contents(source_id);

-- Source chunks
CREATE INDEX idx_source_chunks_source_content_id ON source_chunks(source_content_id);
CREATE INDEX idx_source_chunks_chunk_index ON source_chunks(chunk_index);

-- Extracted facts
CREATE INDEX idx_extracted_facts_source_chunk_id ON extracted_facts(source_chunk_id);
CREATE INDEX idx_extracted_facts_fact_type ON extracted_facts(fact_type);
CREATE INDEX idx_extracted_facts_created_at ON extracted_facts(created_at);

-- Quotes
CREATE INDEX idx_quotes_fact_id ON quotes(fact_id);

-- Statistics
CREATE INDEX idx_statistics_fact_id ON statistics(fact_id);

-- Stories
CREATE INDEX idx_stories_fact_id ON stories(fact_id);

-- Insights
CREATE INDEX idx_insights_fact_id ON insights(fact_id);

-- Embeddings
CREATE INDEX idx_embeddings_target_type_target_id ON embeddings(target_type, target_id);
CREATE INDEX idx_embeddings_model ON embeddings(model);
-- Create index for vector similarity search (using ivfflat for efficiency)
CREATE INDEX idx_embeddings_embedding ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Generated posts
CREATE INDEX idx_generated_posts_source_id ON generated_posts(source_id);
CREATE INDEX idx_generated_posts_platform ON generated_posts(platform);
CREATE INDEX idx_generated_posts_style ON generated_posts(style);
CREATE INDEX idx_generated_posts_status ON generated_posts(status);
CREATE INDEX idx_generated_posts_created_at ON generated_posts(created_at);

-- Post sentences
CREATE INDEX idx_post_sentences_post_id ON post_sentences(post_id);
CREATE INDEX idx_post_sentences_sentence_index ON post_sentences(sentence_index);

-- Sentence claims
CREATE INDEX idx_sentence_claims_sentence_id ON sentence_claims(sentence_id);
CREATE INDEX idx_sentence_claims_fact_id ON sentence_claims(fact_id);
CREATE INDEX idx_sentence_claims_confidence ON sentence_claims(confidence_score);

-- Verification results
CREATE INDEX idx_verification_results_sentence_claim_id ON verification_results(sentence_claim_id);
CREATE INDEX idx_verification_results_is_supported ON verification_results(is_supported);
CREATE INDEX idx_verification_results_verified_at ON verification_results(verified_at);

-- Confidence scores
CREATE INDEX idx_confidence_scores_post_id ON confidence_scores(post_id);
CREATE INDEX idx_confidence_scores_confidence_level ON confidence_scores(confidence_level);
CREATE INDEX idx_confidence_scores_calculated_at ON confidence_scores(calculated_at);

-- Publishing jobs
CREATE INDEX idx_publishing_jobs_post_id ON publishing_jobs(post_id);
CREATE INDEX idx_publishing_jobs_platform ON publishing_jobs(platform);
CREATE INDEX idx_publishing_jobs_status ON publishing_jobs(status);
CREATE INDEX idx_publishing_jobs_scheduled_at ON publishing_jobs(scheduled_at);
CREATE INDEX idx_publishing_jobs_created_at ON publishing_jobs(created_at);

-- AI usage
CREATE INDEX idx_ai_usage_user_id ON ai_usage(user_id);
CREATE INDEX idx_ai_usage_service ON ai_usage(service);
CREATE INDEX idx_ai_usage_operation ON ai_usage(operation);
CREATE INDEX idx_ai_usage_created_at ON ai_usage(created_at);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE extracted_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_sentences ENABLE ROW LEVEL SECURITY;
ALTER TABLE sentence_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE confidence_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE publishing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

-- Create policies for each table (assuming users can only access their own data)
-- Policy: Users can only see their own sources
CREATE POLICY "Users can view own sources" ON sources
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sources" ON sources
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sources" ON sources
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sources" ON sources
    FOR DELETE USING (auth.uid() = user_id);

-- Policy: Users can only see their own source contents
CREATE POLICY "Users can view own source contents" ON source_contents
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM sources WHERE sources.id = source_contents.source_id AND sources.user_id = auth.uid()
    ));
CREATE POLICY "Users can insert own source contents" ON source_contents
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM sources WHERE sources.id = source_contents.source_id AND sources.user_id = auth.uid()
    ));
CREATE POLICY "Users can update own source contents" ON source_contents
    FOR UPDATE USING (EXISTS (
        SELECT 1 FROM sources WHERE sources.id = source_contents.source_id AND sources.user_id = auth.uid()
    ));
CREATE POLICY "Users can delete own source contents" ON source_contents
    FOR DELETE USING (EXISTS (
        SELECT 1 FROM sources WHERE sources.id = source_contents.source_id AND sources.user_id = auth.uid()
    ));

-- Policy: Users can only see their own source chunks
CREATE POLICY "Users can view own source chunks" ON source_chunks
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM sources
        JOIN source_contents ON source_contents.source_id = sources.id
        WHERE source_contents.id = source_chunks.source_content_id AND sources.user_id = auth.uid()
    ));
CREATE POLICY "Users can insert own source chunks" ON source_chunks
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM sources
        JOIN source_contents ON source_contents.source_id = sources.id
        WHERE source_contents.id = source_chunks.source_content_id AND sources.user_id = auth.uid()
    ));
CREATE POLICY "Users can update own source chunks" ON source_chunks
    FOR UPDATE USING (EXISTS (
        SELECT 1 FROM sources
        JOIN source_contents ON source_contents.source_id = sources.id
        WHERE source_contents.id = source_chunks.source_content_id AND sources.user_id = auth.uid()
    ));
CREATE POLICY "Users can delete own source chunks" ON source_chunks
    FOR DELETE USING (EXISTS (
        SELECT 1 FROM sources
        JOIN source_contents ON source_contents.source_id = sources.id
        WHERE source_contents.id = source_chunks.source_content_id AND sources.user_id = auth.uid()
    ));

-- Policy: Users can only see their own extracted facts
CREATE POLICY "Users can view own extracted facts" ON extracted_facts
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM sources
        JOIN source_contents ON source_contents.source_id = sources.id
        JOIN source_chunks ON source_chunks.source_content_id = source_contents.id
        WHERE source_chunks.id = extracted_facts.source_chunk_id AND sources.user_id = auth.uid()
    ));
CREATE POLICY "Users can insert own extracted facts" ON extracted_facts
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM sources
        JOIN source_contents ON source_contents.source_id = sources.id
        JOIN source_chunks ON source_chunks.source_content_id = source_contents.id
        WHERE source_chunks.id = extracted_facts.source_chunk_id AND sources.user_id = auth.uid()
    ));
CREATE POLICY "Users can update own extracted facts" ON extracted_facts
    FOR UPDATE USING (EXISTS (
        SELECT 1 FROM sources
        JOIN source_contents ON source_contents.source_id = sources.id
        JOIN source_chunks ON source_chunks.source_content_id = source_contents.id
        WHERE source_chunks.id = extracted_facts.source_chunk_id AND sources.user_id = auth.uid()
    ));
CREATE POLICY "Users can delete own extracted facts" ON extracted_facts
    FOR DELETE USING (EXISTS (
        SELECT 1 FROM sources
        JOIN source_contents ON source_contents.source_id = sources.id
        JOIN source_chunks ON source_chunks.source_content_id = source_contents.id
        WHERE source_chunks.id = extracted_facts.source_chunk_id AND sources.user_id = auth.uid()
    ));

-- Policy: Users can only see their own quotes
CREATE POLICY "Users can view own quotes" ON quotes
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM sources
        JOIN source_contents ON source_contents.source_id = sources.id
        JOIN source_chunks ON source_chunks.source_content_id = source_contents.id
        JOIN extracted_facts ON extracted_facts.source_chunk_id = source_chunks.id
        WHERE extracted_facts.id = quotes.fact_id AND sources.user_id = auth.uid()
    ));
CREATE POLICY "Users can insert own quotes" ON quotes
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM sources
        JOIN source_contents ON source_contents.source_id = sources.id
        JOIN source_chunks ON source_chunks.source_content_id = source_contents.id
        JOIN extracted_facts ON extracted_facts.source_chunk_id = source_chunks.id
        WHERE extracted_facts.id = quotes.fact_id AND sources.user_id = auth.uid()
    ));
CREATE POLICY "Users can update own quotes" ON quotes
    FOR UPDATE USING (EXISTS (
        SELECT 1 FROM sources
        JOIN source_contents ON source_contents.source_id = sources.id
        JOIN source_chunks ON source_chunks.source_content_id = source_contents.id
        JOIN extracted_facts ON extracted_facts.source_chunk_id = source_chunks.id
        WHERE extracted_facts.id = quotes.fact_id AND sources.user_id = auth.uid()
    ));
CREATE POLICY "Users can delete own quotes" ON quotes
    FOR DELETE USING (EXISTS (
        SELECT 1 FROM sources
        JOIN source_contents ON source_contents.source_id = sources.id
        JOIN source_chunks ON source_chunks.source_content_id = source_contents.id
        JOIN extracted_facts ON extracted_facts.source_chunk_id = source_chunks.id
        WHERE extracted_facts.id = quotes.fact_id AND sources.user_id = auth.uid()
    ));

-- Policy: Users can only see their own statistics
CREATE POLICY "Users can view own statistics" ON statistics
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM sources
        JOIN source_contents ON source_contents.source_id = sources.id
        JOIN source_chunks ON source_chunks.source_content_id = source_contents.id
        JOIN extracted_facts ON extracted_facts.source_chunk_id = source_chunks.id
        WHERE extracted_facts.id = statistics.fact_id AND sources.user_id = auth.uid()
    ));
CREATE POLICY "Users can insert own statistics" ON statistics
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM sources
        JOIN source_contents ON source_contents.source_id = sources.id
        JOIN source_chunks ON source_chunks.source_content_id = source_contents.id
        JOIN extracted_facts ON extracted_facts.source_chunk_id = source_chunks.id
        WHERE extracted_facts.id = statistics.fact_id AND sources.user_id = auth.uid()
    ));
CREATE POLICY "Users can update own statistics" ON statistics
    FOR UPDATE USING (EXISTS (
        SELECT 1 FROM sources
        JOIN source_contents ON source_contents.source_id = sources.id
        JOIN source_chunks ON source_chunks.source_content_id = source_contents.id
        JOIN extracted_facts ON extracted_facts.source_chunk_id = source_chunks.id
        WHERE extracted_facts.id = statistics.fact_id AND sources.user_id = auth.uid()
    ));
CREATE POLICY "Users can delete own statistics" ON statistics
    FOR DELETE USING (EXISTS (
        SELECT 1 FROM sources
        JOIN source_contents ON source_contents.source_id = sources.id
        JOIN source_chunks ON source_chunks.source_content_id = source_contents.id
        JOIN extracted_facts ON extracted_facts.source_chunk_id = source_chunks.id
        WHERE extracted_facts.id = statistics.fact_id AND sources.user_id = auth.uid()
    ));

-- Policy: Users can only see their own stories
CREATE POLICY "Users can view own stories" ON stories
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM sources
        JOIN source_contents ON source_contents.source_id = sources.id
        JOIN source_chunks ON source_chunks.source_content_id = source_contents.id
        JOIN extracted_facts ON extracted_facts.source_chunk_id = source_chunks.id
        WHERE extracted_facts.id = stories.fact_id AND sources.user_id = auth.uid()
    ));
CREATE POLICY "Users can insert own stories" ON stories
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM sources
        JOIN source_contents ON source_contents.source_id = sources.id
        JOIN source_chunks ON source_chunks.source_content_id = source_contents.id
        JOIN extracted_facts ON extracted_facts.source_chunk_id = source_chunks.id
        WHERE extracted_facts.id = stories.fact_id AND sources.user_id = auth.uid()
    ));
CREATE POLICY "Users can update own stories" ON stories
    FOR UPDATE USING (EXISTS (
        SELECT 1 FROM sources
        JOIN source_contents ON source_contents.source_id = sources.id
        JOIN source_chunks ON source_chunks.source_content_id = source_contents.id
        JOIN extracted_facts ON extracted_facts.source_chunk_id = source_chunks.id
        WHERE extracted_facts.id = stories.fact_id AND sources.user_id = auth.uid()
    ));
CREATE POLICY "Users can delete own stories" ON stories
    FOR DELETE USING (EXISTS (
        SELECT 1 FROM sources
        JOIN source_contents ON source_contents.source_id = sources.id
        JOIN source_chunks ON source_chunks.source_content_id = source_contents.id
        JOIN extracted_facts ON extracted_facts.source_chunk_id = source_chunks.id
        WHERE extracted_facts.id = stories.fact_id AND sources.user_id = auth.uid()
    ));

-- Policy: Users can only see their own insights
CREATE POLICY "Users can view own insights" ON insights
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM sources
        JOIN source_contents ON source_contents.source_id = sources.id
        JOIN source_chunks ON source_chunks.source_content_id = source_contents.id
        JOIN extracted_facts ON extracted_facts.source_chunk_id = source_chunks.id
        WHERE extracted_facts.id = insights.fact_id AND sources.user_id = auth.uid()
    ));
CREATE POLICY "Users can insert own insights" ON insights
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM sources
        JOIN source_contents ON source_contents.source_id = sources.id
        JOIN source_chunks ON source_chunks.source_content_id = source_contents.id
        JOIN extracted_facts ON extracted_facts.source_chunk_id = source_chunks.id
        WHERE extracted_facts.id = insights.fact_id AND sources.user_id = auth.uid()
    ));
CREATE POLICY "Users can update own insights" ON insights
    FOR UPDATE USING (EXISTS (
        SELECT 1 FROM sources
        JOIN source_contents ON source_contents.source_id = sources.id
        JOIN source_chunks ON source_chunks.source_content_id = source_contents.id
        JOIN extracted_facts ON extracted_facts.source_chunk_id = source_chunks.id
        WHERE extracted_facts.id = insights.fact_id AND sources.user_id = auth.uid()
    ));
CREATE POLICY "Users can delete own insights" ON insights
    FOR DELETE USING (EXISTS (
        SELECT 1 FROM sources
        JOIN source_contents ON source_contents.source_id = sources.id
        JOIN source_chunks ON source_chunks.source_content_id = source_contents.id
        JOIN extracted_facts ON extracted_facts.source_chunk_id = source_chunks.id
        WHERE extracted_facts.id = insights.fact_id AND sources.user_id = auth.uid()
    ));

-- Policy: Users can only see their own embeddings
CREATE POLICY "Users can view own embeddings" ON embeddings
    FOR SELECT USING (
        (target_type = 'source_chunk' AND EXISTS (
            SELECT 1 FROM sources
            JOIN source_contents ON source_contents.source_id = sources.id
            JOIN source_chunks ON source_chunks.source_content_id = source_contents.id
            WHERE source_chunks.id = embeddings.target_id AND sources.user_id = auth.uid()
        )) OR
        (target_type = 'generated_post_sentence' AND EXISTS (
            SELECT 1 FROM generated_posts
            WHERE generated_posts.id = embeddings.target_id AND generated_posts.source_id IN (
                SELECT id FROM sources WHERE user_id = auth.uid()
            )
        ))
    );
CREATE POLICY "Users can insert own embeddings" ON embeddings
    FOR INSERT WITH CHECK (
        (target_type = 'source_chunk' AND EXISTS (
            SELECT 1 FROM sources
            JOIN source_contents ON source_contents.source_id = sources.id
            JOIN source_chunks ON source_chunks.source_content_id = source_contents.id
            WHERE source_chunks.id = NEW.target_id AND sources.user_id = auth.uid()
        )) OR
        (target_type = 'generated_post_sentence' AND EXISTS (
            SELECT 1 FROM generated_posts
            WHERE generated_posts.id = NEW.target_id AND generated_posts.source_id IN (
                SELECT id FROM sources WHERE user_id = auth.uid()
            )
        ))
    );
CREATE POLICY "Users can update own embeddings" ON embeddings
    FOR UPDATE USING (
        (target_type = 'source_chunk' AND EXISTS (
            SELECT 1 FROM sources
            JOIN source_contents ON source_contents.source_id = sources.id
            JOIN source_chunks ON source_chunks.source_content_id = source_contents.id
            WHERE source_chunks.id = OLD.target_id AND sources.user_id = auth.uid()
        )) OR
        (target_type = 'generated_post_sentence' AND EXISTS (
            SELECT 1 FROM generated_posts
            WHERE generated_posts.id = OLD.target_id AND generated_posts.source_id IN (
                SELECT id FROM sources WHERE user_id = auth.uid()
            )
        ))
    );
CREATE POLICY "Users can delete own embeddings" ON embeddings
    FOR DELETE USING (
        (target_type = 'source_chunk' AND EXISTS (
            SELECT 1 FROM sources
            JOIN source_contents ON source_contents.source_id = sources.id
            JOIN source_chunks ON source_chunks.source_content_id = source_contents.id
            WHERE source_chunks.id = OLD.target_id AND sources.user_id = auth.uid()
        )) OR
        (target_type = 'generated_post_sentence' AND EXISTS (
            SELECT 1 FROM generated_posts
            WHERE generated_posts.id = OLD.target_id AND generated_posts.source_id IN (
                SELECT id FROM sources WHERE user_id = auth.uid()
            )
        ))
    );

-- Policy: Users can only see their own generated posts
CREATE POLICY "Users can view own generated posts" ON generated_posts
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM sources WHERE sources.id = generated_posts.source_id AND sources.user_id = auth.uid()
    ));
CREATE POLICY "Users can insert own generated posts" ON generated_posts
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM sources WHERE sources.id = NEW.source_id AND sources.user_id = auth.uid()
    ));
CREATE POLICY "Users can update own generated posts" ON generated_posts
    FOR UPDATE USING (EXISTS (
        SELECT 1 FROM sources WHERE sources.id = OLD.source_id AND sources.user_id = auth.uid()
    ));
CREATE POLICY "Users can delete own generated posts" ON generated_posts
    FOR DELETE USING (EXISTS (
        SELECT 1 FROM sources WHERE sources.id = OLD.source_id AND sources.user_id = auth.uid()
    ));

-- Policy: Users can only see their own post sentences
CREATE POLICY "Users can view own post sentences" ON post_sentences
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM generated_posts
        WHERE generated_posts.id = post_sentences.post_id AND generated_posts.source_id IN (
            SELECT id FROM sources WHERE user_id = auth.uid()
        )
    ));
CREATE POLICY "Users can insert own post sentences" ON post_sentences
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM generated_posts
        WHERE generated_posts.id = NEW.post_id AND generated_posts.source_id IN (
            SELECT id FROM sources WHERE user_id = auth.uid()
        )
    ));
CREATE POLICY "Users can update own post sentences" ON post_sentences
    FOR UPDATE USING (EXISTS (
        SELECT 1 FROM generated_posts
        WHERE generated_posts.id = OLD.post_id AND generated_posts.source_id IN (
            SELECT id FROM sources WHERE user_id = auth.uid()
        )
    ));
CREATE POLICY "Users can delete own post sentences" ON post_sentences
    FOR DELETE USING (EXISTS (
        SELECT 1 FROM generated_posts
        WHERE generated_posts.id = OLD.post_id AND generated_posts.source_id IN (
            SELECT id FROM sources WHERE user_id = auth.uid()
        )
    ));

-- Policy: Users can only see their own sentence claims
CREATE POLICY "Users can view own sentence claims" ON sentence_claims
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM post_sentences
        JOIN generated_posts ON generated_posts.id = post_sentences.post_id
        WHERE post_sentences.id = sentence_claims.sentence_id AND generated_posts.source_id IN (
            SELECT id FROM sources WHERE user_id = auth.uid()
        )
    ));
CREATE POLICY "Users can insert own sentence claims" ON sentence_claims
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM post_sentences
        JOIN generated_posts ON generated_posts.id = post_sentences.post_id
        WHERE post_sentences.id = NEW.sentence_id AND generated_posts.source_id IN (
            SELECT id FROM sources WHERE user_id = auth.uid()
        )
    ));
CREATE POLICY "Users can update own sentence claims" ON sentence_claims
    FOR UPDATE USING (EXISTS (
        SELECT 1 FROM post_sentences
        JOIN generated_posts ON generated_posts.id = post_sentences.post_id
        WHERE post_sentences.id = OLD.sentence_id AND generated_posts.source_id IN (
            SELECT id FROM sources WHERE user_id = auth.uid()
        )
    ));
CREATE POLICY "Users can delete own sentence claims" ON sentence_claims
    FOR DELETE USING (EXISTS (
        SELECT 1 FROM post_sentences
        JOIN generated_posts ON generated_posts.id = post_sentences.post_id
        WHERE post_sentences.id = OLD.sentence_id AND generated_posts.source_id IN (
            SELECT id FROM sources WHERE user_id = auth.uid()
        )
    ));

-- Policy: Users can only see their own verification results
CREATE POLICY "Users can view own verification results" ON verification_results
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM sentence_claims
        JOIN post_sentences ON post_sentences.id = sentence_claims.sentence_id
        JOIN generated_posts ON generated_posts.id = post_sentences.post_id
        WHERE sentence_claims.id = verification_results.sentence_claim_id AND generated_posts.source_id IN (
            SELECT id FROM sources WHERE user_id = auth.uid()
        )
    ));
CREATE POLICY "Users can insert own verification results" ON verification_results
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM sentence_claims
        JOIN post_sentences ON post_sentences.id = sentence_claims.sentence_id
        JOIN generated_posts ON generated_posts.id = post_sentences.post_id
        WHERE sentence_claims.id = NEW.sentence_claim_id AND generated_posts.source_id IN (
            SELECT id FROM sources WHERE user_id = auth.uid()
        )
    ));
CREATE POLICY "Users can update own verification results" ON verification_results
    FOR UPDATE USING (EXISTS (
        SELECT 1 FROM sentence_claims
        JOIN post_sentences ON post_sentences.id = sentence_claims.sentence_id
        JOIN generated_posts ON generated_posts.id = post_sentences.post_id
        WHERE sentence_claims.id = OLD.sentence_claim_id AND generated_posts.source_id IN (
            SELECT id FROM sources WHERE user_id = auth.uid()
        )
    ));
CREATE POLICY "Users can delete own verification results" ON verification_results
    FOR DELETE USING (EXISTS (
        SELECT 1 FROM sentence_claims
        JOIN post_sentences ON post_sentences.id = sentence_claims.sentence_id
        JOIN generated_posts ON generated_posts.id = post_sentences.post_id
        WHERE sentence_claims.id = OLD.sentence_claim_id AND generated_posts.source_id IN (
            SELECT id FROM sources WHERE user_id = auth.uid()
        )
    ));

-- Policy: Users can only see their own confidence scores
CREATE POLICY "Users can view own confidence scores" ON confidence_scores
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM generated_posts
        WHERE generated_posts.id = confidence_scores.post_id AND generated_posts.source_id IN (
            SELECT id FROM sources WHERE user_id = auth.uid()
        )
    ));
CREATE POLICY "Users can insert own confidence scores" ON confidence_scores
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM generated_posts
        WHERE generated_posts.id = NEW.post_id AND generated_posts.source_id IN (
            SELECT id FROM sources WHERE user_id = auth.uid()
        )
    ));
CREATE POLICY "Users can update own confidence scores" ON confidence_scores
    FOR UPDATE USING (EXISTS (
        SELECT 1 FROM generated_posts
        WHERE generated_posts.id = OLD.post_id AND generated_posts.source_id IN (
            SELECT id FROM sources WHERE user_id = auth.uid()
        )
    ));
CREATE POLICY "Users can delete own confidence scores" ON confidence_scores
    FOR DELETE USING (EXISTS (
        SELECT 1 FROM generated_posts
        WHERE generated_posts.id = OLD.post_id AND generated_posts.source_id IN (
            SELECT id FROM sources WHERE user_id = auth.uid()
        )
    ));

-- Policy: Users can only see their own publishing jobs
CREATE POLICY "Users can view own publishing jobs" ON publishing_jobs
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM generated_posts
        WHERE generated_posts.id = publishing_jobs.post_id AND generated_posts.source_id IN (
            SELECT id FROM sources WHERE user_id = auth.uid()
        )
    ));
CREATE POLICY "Users can insert own publishing jobs" ON publishing_jobs
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM generated_posts
        WHERE generated_posts.id = NEW.post_id AND generated_posts.source_id IN (
            SELECT id FROM sources WHERE user_id = auth.uid()
        )
    ));
CREATE POLICY "Users can update own publishing jobs" ON publishing_jobs
    FOR UPDATE USING (EXISTS (
        SELECT 1 FROM generated_posts
        WHERE generated_posts.id = OLD.post_id AND generated_posts.source_id IN (
            SELECT id FROM sources WHERE user_id = auth.uid()
        )
    ));
CREATE POLICY "Users can delete own publishing jobs" ON publishing_jobs
    FOR DELETE USING (EXISTS (
        SELECT 1 FROM generated_posts
        WHERE generated_posts.id = OLD.post_id AND generated_posts.source_id IN (
            SELECT id FROM sources WHERE user_id = auth.uid()
        )
    ));

-- Policy: Users can only see their own AI usage
CREATE POLICY "Users can view own AI usage" ON ai_usage
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own AI usage" ON ai_usage
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own AI usage" ON ai_usage
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own AI usage" ON ai_usage
    FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at triggers for tables that have updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sources_updated_at BEFORE UPDATE ON sources
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_generated_posts_updated_at BEFORE UPDATE ON generated_posts
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_publishing_jobs_updated_at BEFORE UPDATE ON publishing_jobs
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();