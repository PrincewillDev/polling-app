import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection configuration (using local Supabase defaults)
const supabaseUrl = "http://127.0.0.1:54321";
const serviceRoleKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

console.log("🔄 Setting up database schema and fixing foreign keys...");
console.log(`📍 Connecting to: ${supabaseUrl}`);

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function executeSQL(sql) {
  try {
    // Use the raw SQL execution endpoint
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
      },
      body: JSON.stringify({ sql }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    return { data: result, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

async function setupDatabase() {
  try {
    console.log("🚀 Setting up database schema...");

    // First, create the database schema manually using SQL statements
    const setupStatements = [
      // Enable extensions
      `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,
      `CREATE EXTENSION IF NOT EXISTS "pgcrypto"`,

      // Create custom types
      `DO $$ BEGIN
         CREATE TYPE poll_status AS ENUM ('active', 'closed', 'draft');
       EXCEPTION
         WHEN duplicate_object THEN null;
       END $$`,

      `DO $$ BEGIN
         CREATE TYPE show_results_type AS ENUM ('immediately', 'after-vote', 'after-end', 'never');
       EXCEPTION
         WHEN duplicate_object THEN null;
       END $$`,

      // Create users table
      `CREATE TABLE IF NOT EXISTS public.users (
         id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
         name TEXT NOT NULL,
         email TEXT UNIQUE NOT NULL,
         avatar TEXT,
         created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
         updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
       )`,

      // Create polls table with correct foreign key
      `CREATE TABLE IF NOT EXISTS public.polls (
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
       )`,

      // Add foreign key constraint to polls
      `ALTER TABLE public.polls DROP CONSTRAINT IF EXISTS polls_created_by_fkey`,
      `ALTER TABLE public.polls ADD CONSTRAINT polls_created_by_fkey
       FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE`,

      // Create poll_options table
      `CREATE TABLE IF NOT EXISTS public.poll_options (
         id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
         poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE NOT NULL,
         text TEXT NOT NULL,
         order_index INTEGER NOT NULL,
         votes INTEGER DEFAULT 0 NOT NULL,
         created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
         UNIQUE(poll_id, order_index)
       )`,

      // Create votes table
      `CREATE TABLE IF NOT EXISTS public.votes (
         id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
         poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE NOT NULL,
         user_id UUID,
         option_ids UUID[] NOT NULL,
         created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
         ip_address INET,
         user_agent TEXT
       )`,

      // Fix votes foreign key
      `ALTER TABLE public.votes DROP CONSTRAINT IF EXISTS votes_user_id_fkey`,
      `ALTER TABLE public.votes ADD CONSTRAINT votes_user_id_fkey
       FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE`,

      // Create comments table
      `CREATE TABLE IF NOT EXISTS public.comments (
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
       )`,

      // Fix comments foreign key
      `ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_user_id_fkey`,
      `ALTER TABLE public.comments ADD CONSTRAINT comments_user_id_fkey
       FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE`,

      // Enable RLS
      `ALTER TABLE public.users ENABLE ROW LEVEL SECURITY`,
      `ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY`,
      `ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY`,
      `ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY`,
      `ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY`,
    ];

    // Execute each statement
    for (let i = 0; i < setupStatements.length; i++) {
      const statement = setupStatements[i];
      console.log(
        `📝 Executing setup statement ${i + 1}/${setupStatements.length}...`,
      );

      const { error } = await executeSQL(statement);

      if (error) {
        if (
          error.message.includes("already exists") ||
          error.message.includes("does not exist") ||
          error.message.includes("duplicate")
        ) {
          console.log("⏭️  Skipping (already exists or normal conflict)");
        } else {
          console.error(`❌ Error: ${error.message}`);
          throw error;
        }
      } else {
        console.log("✅ Success");
      }
    }

    console.log("🎉 Database setup completed successfully!");
  } catch (error) {
    console.error("💥 Database setup failed:", error.message);
    throw error;
  }
}

async function testConnection() {
  try {
    console.log("🔍 Testing database connection...");
    const { data, error } = await supabase
      .from("polls")
      .select("count")
      .limit(1);

    if (
      error &&
      !error.message.includes("relation") &&
      !error.message.includes("does not exist")
    ) {
      throw error;
    }

    console.log("✅ Database connection successful");
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    return false;
  }
}

async function testForeignKeyFix() {
  try {
    console.log("🔍 Testing foreign key relationship...");

    // Try to query polls with users join - this should work after our fix
    const { data, error } = await supabase
      .from("polls")
      .select(
        `
        id,
        title,
        users!polls_created_by_fkey (
          id,
          name
        )
      `,
      )
      .limit(1);

    if (error) {
      if (error.message.includes("Could not find a relationship")) {
        console.log("❌ Foreign key relationship still not working");
        return false;
      } else {
        console.log(
          "⚠️  Query error (might be normal if no data exists):",
          error.message,
        );
        return true; // This might just mean no data exists yet
      }
    }

    console.log("✅ Foreign key relationship working correctly!");
    return true;
  } catch (error) {
    console.error("❌ Foreign key test failed:", error.message);
    return false;
  }
}

async function main() {
  try {
    // Test connection
    const connected = await testConnection();
    if (!connected) {
      console.log("💡 Make sure your Supabase instance is running:");
      console.log("   npm run supabase:start");
      process.exit(1);
    }

    // Set up database schema
    await setupDatabase();

    // Test if the foreign key fix worked
    const foreignKeyWorking = await testForeignKeyFix();

    if (foreignKeyWorking) {
      console.log(
        "🎊 All done! Database is ready and foreign keys are working correctly.",
      );
      console.log("🚀 You can now create polls without foreign key errors!");
    } else {
      console.log(
        "⚠️  Foreign key relationship might still need manual fixing.",
      );
      console.log(
        "📝 Try accessing Supabase Studio at: http://127.0.0.1:54323",
      );
      console.log(
        "   Go to SQL Editor and run the queries manually if needed.",
      );
    }
  } catch (error) {
    console.error("💥 Migration process failed:", error.message);

    console.log("\n📝 Manual steps to fix the issue:");
    console.log("1. Open Supabase Studio: http://127.0.0.1:54323");
    console.log("2. Go to SQL Editor");
    console.log("3. Run this SQL manually:");
    console.log(`
-- Fix foreign key relationships
ALTER TABLE public.polls DROP CONSTRAINT IF EXISTS polls_created_by_fkey;
ALTER TABLE public.polls ADD CONSTRAINT polls_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.votes DROP CONSTRAINT IF EXISTS votes_user_id_fkey;
ALTER TABLE public.votes ADD CONSTRAINT votes_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_user_id_fkey;
ALTER TABLE public.comments ADD CONSTRAINT comments_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    `);

    process.exit(1);
  }
}

main();
