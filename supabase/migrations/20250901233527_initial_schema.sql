-- Complete Database Setup for Polling App
-- Execute this in Supabase Studio SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
DO $$ BEGIN
    CREATE TYPE poll_status AS ENUM ('active', 'closed', 'draft');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE show_results_type AS ENUM ('immediately', 'after-vote', 'after-end', 'never');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    avatar TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Polls table
CREATE TABLE IF NOT EXISTS public.polls (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status poll_status DEFAULT 'draft' NOT NULL,
    category TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    end_date TIMESTAMPTZ,
    created_by UUID NOT NULL,
    allow_multiple_choice BOOLEAN DEFAULT FALSE NOT NULL,
    require_auth BOOLEAN DEFAULT TRUE NOT NULL,
    is_anonymous BOOLEAN DEFAULT FALSE NOT NULL,
    show_results show_results_type DEFAULT 'after-vote' NOT NULL,
    total_votes INTEGER DEFAULT 0 NOT NULL,
    total_views INTEGER DEFAULT 0 NOT NULL,
    unique_voters INTEGER DEFAULT 0 NOT NULL,
    tags TEXT[],
    is_public BOOLEAN DEFAULT TRUE NOT NULL,
    share_code TEXT UNIQUE
);

-- Poll options table
CREATE TABLE IF NOT EXISTS public.poll_options (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE NOT NULL,
    text TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    votes INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(poll_id, order_index)
);

-- Votes table
CREATE TABLE IF NOT EXISTS public.votes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE NOT NULL,
    user_id UUID,
    option_ids UUID[] NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    ip_address INET,
    user_agent TEXT
);

-- Comments table
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE NOT NULL,
    user_id UUID,
    user_name TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    likes INTEGER DEFAULT 0 NOT NULL,
    dislikes INTEGER DEFAULT 0 NOT NULL
);

-- Fix foreign key relationships
-- Drop existing foreign key constraints if they exist
ALTER TABLE public.polls DROP CONSTRAINT IF EXISTS polls_created_by_fkey;
ALTER TABLE public.votes DROP CONSTRAINT IF EXISTS votes_user_id_fkey;
ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_user_id_fkey;

-- Add correct foreign key constraints pointing to public.users
ALTER TABLE public.polls ADD CONSTRAINT polls_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.votes ADD CONSTRAINT votes_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.comments ADD CONSTRAINT comments_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_polls_status ON public.polls(status);
CREATE INDEX IF NOT EXISTS idx_polls_created_by ON public.polls(created_by);
CREATE INDEX IF NOT EXISTS idx_polls_category ON public.polls(category);
CREATE INDEX IF NOT EXISTS idx_polls_created_at ON public.polls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_polls_end_date ON public.polls(end_date);
CREATE INDEX IF NOT EXISTS idx_polls_is_public ON public.polls(is_public);

CREATE INDEX IF NOT EXISTS idx_poll_options_poll_id ON public.poll_options(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_options_order ON public.poll_options(poll_id, order_index);

CREATE INDEX IF NOT EXISTS idx_votes_poll_id ON public.votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_id ON public.votes(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_created_at ON public.votes(created_at);

CREATE INDEX IF NOT EXISTS idx_comments_poll_id ON public.comments(poll_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments(parent_id);

-- Ensure unique vote per user per poll (for authenticated users)
DROP INDEX IF EXISTS votes_poll_user_uniq;
CREATE UNIQUE INDEX votes_poll_user_uniq ON public.votes(poll_id, user_id) WHERE user_id IS NOT NULL;

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;

-- Users policies
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Drop existing poll policies
DROP POLICY IF EXISTS "Anyone can view public polls" ON public.polls;
DROP POLICY IF EXISTS "Users can create polls" ON public.polls;
DROP POLICY IF EXISTS "Users can update their own polls" ON public.polls;
DROP POLICY IF EXISTS "Users can delete their own polls" ON public.polls;

-- Polls policies
CREATE POLICY "Anyone can view public polls" ON public.polls
    FOR SELECT USING (is_public = true OR auth.uid() = created_by);

CREATE POLICY "Users can create polls" ON public.polls
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own polls" ON public.polls
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own polls" ON public.polls
    FOR DELETE USING (auth.uid() = created_by);

-- Drop existing poll options policies
DROP POLICY IF EXISTS "Poll options visible if poll is accessible" ON public.poll_options;
DROP POLICY IF EXISTS "Users can manage options of their polls" ON public.poll_options;

-- Poll options policies
CREATE POLICY "Poll options visible if poll is accessible" ON public.poll_options
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.polls
            WHERE polls.id = poll_options.poll_id
            AND (polls.is_public = true OR auth.uid() = polls.created_by)
        )
    );

CREATE POLICY "Users can manage options of their polls" ON public.poll_options
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.polls
            WHERE polls.id = poll_options.poll_id
            AND auth.uid() = polls.created_by
        )
    );

-- Drop existing vote policies
DROP POLICY IF EXISTS "Users can view votes for accessible polls" ON public.votes;
DROP POLICY IF EXISTS "Users can vote on accessible polls" ON public.votes;

-- Votes policies
CREATE POLICY "Users can view votes for accessible polls" ON public.votes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.polls
            WHERE polls.id = votes.poll_id
            AND (polls.is_public = true OR auth.uid() = polls.created_by)
        )
    );

CREATE POLICY "Users can vote on accessible polls" ON public.votes
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.polls
            WHERE polls.id = votes.poll_id
            AND polls.is_public = true
            AND polls.status = 'active'
            AND (polls.end_date IS NULL OR polls.end_date > NOW())
        )
    );

-- Drop existing comment policies
DROP POLICY IF EXISTS "Anyone can view comments on public polls" ON public.comments;
DROP POLICY IF EXISTS "Authenticated users can comment on public polls" ON public.comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;

-- Comments policies
CREATE POLICY "Anyone can view comments on public polls" ON public.comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.polls
            WHERE polls.id = comments.poll_id
            AND polls.is_public = true
        )
    );

CREATE POLICY "Authenticated users can comment on public polls" ON public.comments
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.polls
            WHERE polls.id = comments.poll_id
            AND polls.is_public = true
            AND polls.status = 'active'
        )
    );

CREATE POLICY "Users can update their own comments" ON public.comments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON public.comments
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to safely create user profiles (bypasses RLS)
CREATE OR REPLACE FUNCTION public.create_user_profile(
    user_id UUID,
    user_name TEXT,
    user_email TEXT,
    user_avatar TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.users (id, name, email, avatar, created_at, updated_at)
    VALUES (user_id, user_name, user_email, user_avatar, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_user_profile(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_profile(UUID, TEXT, TEXT, TEXT) TO anon;

-- Verify foreign key constraints
SELECT
    tc.table_name,
    tc.constraint_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema='public'
    AND ccu.table_name = 'users';

-- Success message
SELECT 'Database schema setup complete! Foreign keys now point to public.users table.' AS status;
