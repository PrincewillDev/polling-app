-- Fix Foreign Key Relationships Migration
-- This script fixes the foreign key relationship between polls and users tables

-- First, we need to drop the existing foreign key constraint
ALTER TABLE public.polls DROP CONSTRAINT IF EXISTS polls_created_by_fkey;

-- Add the correct foreign key constraint that references public.users instead of auth.users
ALTER TABLE public.polls ADD CONSTRAINT polls_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;

-- Also update other tables that might have similar issues

-- Fix votes table foreign key
ALTER TABLE public.votes DROP CONSTRAINT IF EXISTS votes_user_id_fkey;
ALTER TABLE public.votes ADD CONSTRAINT votes_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Fix comments table foreign key
ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_user_id_fkey;
ALTER TABLE public.comments ADD CONSTRAINT comments_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Fix poll_analytics table foreign key
ALTER TABLE public.poll_analytics DROP CONSTRAINT IF EXISTS poll_analytics_user_id_fkey;
ALTER TABLE public.poll_analytics ADD CONSTRAINT poll_analytics_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- Fix user_poll_interactions table foreign key
ALTER TABLE public.user_poll_interactions DROP CONSTRAINT IF EXISTS user_poll_interactions_user_id_fkey;
ALTER TABLE public.user_poll_interactions ADD CONSTRAINT user_poll_interactions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Verify the foreign keys exist
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE
    tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND ccu.table_name = 'users'
ORDER BY tc.table_name;

-- Success message
SELECT 'Foreign key relationships fixed successfully!' AS status;
