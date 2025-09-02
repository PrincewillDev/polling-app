import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

console.log('🔍 Verifying database schema...');
console.log(`📍 Connecting to: ${supabaseUrl}`);

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkTables() {
  try {
    console.log('\n📋 Checking tables...');

    // Check if users table exists and has data
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, email')
      .limit(5);

    if (usersError) {
      console.log('❌ Users table error:', usersError.message);
    } else {
      console.log(`✅ Users table exists with ${users.length} records`);
      if (users.length > 0) {
        console.log('   Sample user:', users[0]);
      }
    }

    // Check if polls table exists and has data
    const { data: polls, error: pollsError } = await supabase
      .from('polls')
      .select('id, title, created_by')
      .limit(5);

    if (pollsError) {
      console.log('❌ Polls table error:', pollsError.message);
    } else {
      console.log(`✅ Polls table exists with ${polls.length} records`);
      if (polls.length > 0) {
        console.log('   Sample poll:', polls[0]);
      }
    }

    // Check if poll_options table exists
    const { data: options, error: optionsError } = await supabase
      .from('poll_options')
      .select('id, text, poll_id')
      .limit(5);

    if (optionsError) {
      console.log('❌ Poll options table error:', optionsError.message);
    } else {
      console.log(`✅ Poll options table exists with ${options.length} records`);
    }

    // Check if votes table exists
    const { data: votes, error: votesError } = await supabase
      .from('votes')
      .select('id, poll_id, user_id')
      .limit(5);

    if (votesError) {
      console.log('❌ Votes table error:', votesError.message);
    } else {
      console.log(`✅ Votes table exists with ${votes.length} records`);
    }

  } catch (error) {
    console.error('💥 Error checking tables:', error.message);
  }
}

async function testForeignKeyQuery() {
  try {
    console.log('\n🔗 Testing foreign key relationship...');

    // This is the exact query that's failing in the application
    const { data, error } = await supabase
      .from('polls')
      .select(`
        id,
        title,
        status,
        created_at,
        users!polls_created_by_fkey (
          id,
          name,
          avatar
        )
      `)
      .limit(5);

    if (error) {
      console.log('❌ Foreign key query failed:', error.message);
      console.log('   Error code:', error.code);
      console.log('   Error details:', error.details);

      // Try alternative query without foreign key hint
      console.log('\n🔄 Trying query without foreign key hint...');
      const { data: altData, error: altError } = await supabase
        .from('polls')
        .select(`
          id,
          title,
          status,
          created_at,
          created_by
        `)
        .limit(5);

      if (altError) {
        console.log('❌ Alternative query also failed:', altError.message);
      } else {
        console.log('✅ Alternative query works fine');
        console.log('   Sample data:', altData[0]);
      }

    } else {
      console.log('✅ Foreign key relationship works!');
      console.log('   Sample data:', data[0]);
    }

  } catch (error) {
    console.error('💥 Error testing foreign key:', error.message);
  }
}

async function checkConstraints() {
  try {
    console.log('\n🔍 Checking database constraints...');

    // Try to query constraint information - this might not work through REST API
    const { data, error } = await supabase.rpc('sql', {
      query: `
        SELECT
          tc.table_name,
          tc.constraint_name,
          tc.constraint_type,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        LEFT JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.table_schema = 'public'
          AND tc.constraint_type = 'FOREIGN KEY'
        ORDER BY tc.table_name, tc.constraint_name;
      `
    });

    if (error) {
      console.log('❌ Could not query constraints via RPC:', error.message);
      console.log('   (This is expected - RPC function might not exist)');
    } else {
      console.log('✅ Foreign key constraints found:');
      data.forEach(constraint => {
        console.log(`   ${constraint.table_name}.${constraint.column_name} -> ${constraint.foreign_table_name}.${constraint.foreign_column_name}`);
      });
    }

  } catch (error) {
    console.log('⚠️  Constraint check failed (expected):', error.message);
  }
}

async function main() {
  await checkTables();
  await testForeignKeyQuery();
  await checkConstraints();

  console.log('\n📝 Recommendations:');
  console.log('1. Check Supabase Studio at: http://127.0.0.1:54323');
  console.log('2. Go to Database > Tables to verify table structure');
  console.log('3. Go to Database > Roles & Permissions to check RLS policies');
  console.log('4. If foreign key query still fails, the constraint might need to be recreated manually');
}

main().catch(console.error);
