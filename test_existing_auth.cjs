const BASE_URL = 'http://localhost:3000';

// Test data
const testUser = {
  name: 'Existing Auth Test User',
  email: 'existingtest@example.com',
  password: 'testPassword123'
};

// Helper function to make HTTP requests
async function makeRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  };

  const finalOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  try {
    console.log(`\n🔄 ${finalOptions.method || 'GET'} ${endpoint}`);
    const response = await fetch(url, finalOptions);
    let data;

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    console.log(`📊 Status: ${response.status}`);
    console.log('📦 Response:', typeof data === 'string' ? data.substring(0, 200) + '...' : JSON.stringify(data, null, 2));

    return { response, data };
  } catch (error) {
    console.error(`❌ Request failed:`, error.message);
    return { error };
  }
}

async function testLoginPage() {
  console.log('\n=== TESTING LOGIN PAGE ACCESS ===');

  // Test if login page loads
  const { response, data } = await makeRequest('/login');

  if (response && response.status === 200) {
    console.log('✅ Login page accessible');
  } else {
    console.log('❌ Login page not accessible');
  }

  return response?.status === 200;
}

async function testRegisterPage() {
  console.log('\n=== TESTING REGISTER PAGE ACCESS ===');

  // Test if register page loads
  const { response, data } = await makeRequest('/register');

  if (response && response.status === 200) {
    console.log('✅ Register page accessible');
  } else {
    console.log('❌ Register page not accessible');
  }

  return response?.status === 200;
}

async function testSupabaseConnection() {
  console.log('\n=== TESTING SUPABASE CONNECTION ===');

  // Test the health endpoint which checks Supabase
  const { data } = await makeRequest('/api/health');

  if (data && data.status === 'ok') {
    console.log('✅ Server is healthy');

    if (data.checks && data.checks.auth) {
      console.log(`📡 Auth service: ${data.checks.auth.status}`);
      if (data.checks.auth.status === 'ok') {
        console.log('✅ Supabase auth connection working');
      } else {
        console.log('❌ Supabase auth connection issues');
        console.log('Auth error:', data.checks.auth.error);
      }
    }

    if (data.checks && data.checks.database) {
      console.log(`🗄️ Database: ${data.checks.database.status}`);
      if (data.checks.database.status === 'ok') {
        console.log('✅ Database connection working');
      } else {
        console.log('❌ Database connection issues');
        console.log('Database error:', data.checks.database.error);
      }
    }

    return true;
  } else {
    console.log('❌ Server health check failed');
    return false;
  }
}

async function testDirectSupabaseCall() {
  console.log('\n=== TESTING DIRECT SUPABASE INTEGRATION ===');

  // Test if we can make a simple database query through existing API
  try {
    const { response, data } = await makeRequest('/api/polls?limit=1');

    if (response && response.status === 200) {
      console.log('✅ Direct Supabase queries working through existing API');
      return true;
    } else {
      console.log('❌ Direct Supabase queries failing');
      console.log('Response:', data);
      return false;
    }
  } catch (error) {
    console.log('❌ Error testing direct Supabase calls:', error);
    return false;
  }
}

async function testExistingAuthEndpoints() {
  console.log('\n=== TESTING EXISTING AUTH INFRASTRUCTURE ===');

  // Test middleware by accessing a protected route
  console.log('\n1. Testing Route Protection (should redirect to login)');
  const { response: dashboardResponse } = await makeRequest('/dashboard', {
    method: 'GET',
    redirect: 'manual' // Don't follow redirects automatically
  });

  if (dashboardResponse && (dashboardResponse.status === 302 || dashboardResponse.status === 307)) {
    const location = dashboardResponse.headers.get('location');
    if (location && location.includes('/login')) {
      console.log('✅ Route protection working - redirects to login');
    } else {
      console.log('❌ Route protection not working properly');
      console.log('Redirect location:', location);
    }
  } else {
    console.log('❌ Route protection not working - no redirect');
  }

  // Test if session endpoint exists (this should be from existing auth)
  console.log('\n2. Testing Session Check');
  const { response: sessionResponse, data: sessionData } = await makeRequest('/api/auth/session');

  if (sessionResponse) {
    if (sessionResponse.status === 200) {
      console.log('✅ Session endpoint accessible');
      console.log('Session authenticated:', sessionData?.authenticated || false);
    } else if (sessionResponse.status === 404) {
      console.log('ℹ️ Session endpoint not found (using direct Supabase auth)');
    } else {
      console.log('❌ Session endpoint error:', sessionResponse.status);
    }
  }
}

async function testEnvironmentSetup() {
  console.log('\n=== TESTING ENVIRONMENT SETUP ===');

  // We can't directly check environment variables from the client,
  // but we can infer from server behavior
  console.log('ℹ️ Environment variables are server-side only');
  console.log('ℹ️ Checking if Supabase client is properly configured through server responses...');

  // The health endpoint tells us if environment is properly configured
  const healthWorking = await testSupabaseConnection();

  if (healthWorking) {
    console.log('✅ Environment appears properly configured');
  } else {
    console.log('❌ Environment may have configuration issues');
    console.log('🔧 Check:');
    console.log('   - NEXT_PUBLIC_SUPABASE_URL is set');
    console.log('   - NEXT_PUBLIC_SUPABASE_ANON_KEY is set');
    console.log('   - Supabase project is accessible');
    console.log('   - Database tables exist');
  }

  return healthWorking;
}

async function runDiagnostics() {
  console.log('🔍 Running Existing Auth System Diagnostics');
  console.log('===========================================');

  const results = {
    environmentSetup: false,
    supabaseConnection: false,
    loginPageAccess: false,
    registerPageAccess: false,
    directSupabaseCall: false,
    authInfrastructure: true // assume working unless proven otherwise
  };

  try {
    // Test environment setup
    results.environmentSetup = await testEnvironmentSetup();

    // Test Supabase connection
    results.supabaseConnection = await testSupabaseConnection();

    // Test page access
    results.loginPageAccess = await testLoginPage();
    results.registerPageAccess = await testRegisterPage();

    // Test direct Supabase integration
    results.directSupabaseCall = await testDirectSupabaseCall();

    // Test existing auth infrastructure
    await testExistingAuthEndpoints();

    // Summary
    console.log('\n📊 DIAGNOSTIC SUMMARY');
    console.log('====================');
    console.log(`Environment Setup: ${results.environmentSetup ? '✅' : '❌'}`);
    console.log(`Supabase Connection: ${results.supabaseConnection ? '✅' : '❌'}`);
    console.log(`Login Page Access: ${results.loginPageAccess ? '✅' : '❌'}`);
    console.log(`Register Page Access: ${results.registerPageAccess ? '✅' : '❌'}`);
    console.log(`Direct Supabase Queries: ${results.directSupabaseCall ? '✅' : '❌'}`);

    const overallHealth = Object.values(results).every(result => result === true);

    console.log(`\n🎯 Overall System Health: ${overallHealth ? '✅ GOOD' : '❌ NEEDS ATTENTION'}`);

    if (!overallHealth) {
      console.log('\n🔧 RECOMMENDATIONS:');
      if (!results.environmentSetup || !results.supabaseConnection) {
        console.log('• Check Supabase environment variables and project configuration');
      }
      if (!results.loginPageAccess || !results.registerPageAccess) {
        console.log('• Check if Next.js app is running properly');
        console.log('• Check for route configuration issues');
      }
      if (!results.directSupabaseCall) {
        console.log('• Check Supabase database permissions and table structure');
      }
    } else {
      console.log('\n✨ The existing auth system appears to be working correctly!');
      console.log('   The issue with our new API routes may be:');
      console.log('   • Different client configuration');
      console.log('   • Missing middleware integration');
      console.log('   • Authentication flow differences');
    }

  } catch (error) {
    console.error('\n❌ Diagnostic test runner failed:', error);
  }
}

// Run diagnostics if this file is executed directly
if (require.main === module) {
  runDiagnostics().catch(console.error);
}

module.exports = {
  runDiagnostics,
  testEnvironmentSetup,
  testSupabaseConnection,
  testLoginPage,
  testRegisterPage,
  testDirectSupabaseCall,
  testExistingAuthEndpoints
};
