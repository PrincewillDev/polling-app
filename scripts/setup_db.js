import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the database setup SQL file
const setupSQL = fs.readFileSync(path.join(__dirname, '../database_setup.sql'), 'utf8');

// Database connection configuration (using local Supabase defaults)
const supabaseUrl = 'http://127.0.0.1:54321';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

console.log('🔄 Setting up database schema for polling app...');
console.log(`📍 Connecting to: ${supabaseUrl}`);

async function executeSQL(sql) {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        query: sql
      })
    });

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${responseText}`);
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      result = responseText;
    }

    return { data: result, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

async function executeSQLDirect(sql) {
  try {
    // Try using the direct database connection through PostgREST
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey
      },
      body: JSON.stringify({ sql })
    });

    if (response.ok) {
      const result = await response.text();
      return { data: result, error: null };
    } else {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
  } catch (error) {
    return { data: null, error };
  }
}

async function setupDatabase() {
  try {
    console.log('🚀 Executing database setup SQL...');

    // Split SQL into individual statements
    const statements = setupSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--') && stmt !== '');

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    // Try executing all at once first
    console.log('🔄 Attempting to execute all SQL at once...');
    const { data: bulkData, error: bulkError } = await executeSQLDirect(setupSQL);

    if (!bulkError) {
      console.log('✅ Bulk SQL execution successful!');
      console.log('📊 Result preview:', bulkData ? bulkData.substring(0, 200) : 'No output');
      return true;
    }

    console.log('⚠️ Bulk execution failed, trying statement by statement...');
    console.log('Error was:', bulkError.message);

    // Execute statements one by one
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`📝 Executing statement ${i + 1}/${statements.length}...`);

      // Show a preview of the statement
      const preview = statement.length > 80 ? statement.substring(0, 80) + '...' : statement;
      console.log(`   ${preview}`);

      const { data, error } = await executeSQL(statement + ';');

      if (error) {
        // Check if it's a harmless error
        const errorMsg = error.message.toLowerCase();
        if (
          errorMsg.includes('already exists') ||
          errorMsg.includes('duplicate') ||
          errorMsg.includes('does not exist') ||
          errorMsg.includes('cannot drop')
        ) {
          console.log('⏭️  Skipping (normal conflict or missing object)');
          continue;
        }

        console.error(`❌ Error executing statement: ${error.message}`);

        // Continue with non-critical errors
        if (
          !errorMsg.includes('syntax error') &&
          !errorMsg.includes('permission denied') &&
          !errorMsg.includes('relation') ||
          errorMsg.includes('create table')
        ) {
          console.log('⚠️  Continuing despite error...');
          continue;
        }

        throw error;
      }

      console.log('✅ Success');

      // If it was a SELECT statement, show some results
      if (statement.trim().toUpperCase().startsWith('SELECT') && data) {
        console.log('📊 Query results:');
        if (Array.isArray(data)) {
          data.slice(0, 5).forEach(row => {
            console.log('  ', JSON.stringify(row));
          });
        } else {
          console.log('  ', data);
        }
      }
    }

    return true;
  } catch (error) {
    console.error('💥 Database setup failed:', error.message);
    throw error;
  }
}

async function verifySetup() {
  try {
    console.log('🔍 Verifying database setup...');

    // Test basic connection by trying to query a system table
    const testQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('users', 'polls', 'poll_options', 'votes', 'comments')
      ORDER BY table_name;
    `;

    const { data, error } = await executeSQL(testQuery);

    if (error) {
      console.warn('⚠️ Could not verify tables:', error.message);
      return false;
    }

    if (data && Array.isArray(data) && data.length > 0) {
      console.log('✅ Found these tables:');
      data.forEach(row => {
        console.log(`  - ${row.table_name}`);
      });

      if (data.length >= 4) {
        console.log('✅ All main tables appear to be created!');
        return true;
      }
    }

    console.log('⚠️ Some tables might be missing');
    return false;
  } catch (error) {
    console.warn('⚠️ Verification failed:', error.message);
    return false;
  }
}

async function testForeignKeys() {
  try {
    console.log('🔍 Testing foreign key relationships...');

    // Test query that would fail if foreign keys aren't set up correctly
    const testQuery = `
      SELECT
        tc.table_name,
        tc.constraint_name,
        ccu.table_name AS foreign_table_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND ccu.table_name = 'users'
      ORDER BY tc.table_name;
    `;

    const { data, error } = await executeSQL(testQuery);

    if (error) {
      console.warn('⚠️ Could not verify foreign keys:', error.message);
      return false;
    }

    if (data && Array.isArray(data) && data.length > 0) {
      console.log('✅ Found these foreign key relationships to users table:');
      data.forEach(row => {
        console.log(`  - ${row.table_name}.${row.constraint_name} -> ${row.foreign_table_name}`);
      });
      return true;
    } else {
      console.log('❌ No foreign key relationships found to users table');
      return false;
    }
  } catch (error) {
    console.warn('⚠️ Foreign key test failed:', error.message);
    return false;
  }
}

async function main() {
  try {
    // Setup the database
    const setupSuccess = await setupDatabase();

    if (!setupSuccess) {
      throw new Error('Database setup failed');
    }

    // Verify the setup worked
    const verifySuccess = await verifySetup();

    if (verifySuccess) {
      console.log('🎉 Database setup completed successfully!');
    } else {
      console.log('⚠️ Database setup completed but verification had issues');
    }

    // Test foreign keys
    const foreignKeysWork = await testForeignKeys();

    if (foreignKeysWork) {
      console.log('🎊 Foreign key relationships are working correctly!');
      console.log('🚀 You should now be able to create polls without foreign key errors!');
    } else {
      console.log('⚠️ Foreign key relationships might need manual setup');
      console.log('📝 Manual fix: Go to http://127.0.0.1:54323 and run the SQL queries manually');
    }

  } catch (error) {
    console.error('💥 Setup process failed:', error.message);

    console.log('\n📝 Manual setup instructions:');
    console.log('1. Open Supabase Studio: http://127.0.0.1:54323');
    console.log('2. Click on "SQL Editor" in the sidebar');
    console.log('3. Copy the contents of database_setup.sql');
    console.log('4. Paste it into the SQL editor');
    console.log('5. Click "Run" to execute the SQL');

    process.exit(1);
  }
}

main();
