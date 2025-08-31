import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';

// NOTE: The environment variables are not set by default.
// You must create a .env.local file with the following variables:
// NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
// NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
export const supabase = createPagesBrowserClient();
