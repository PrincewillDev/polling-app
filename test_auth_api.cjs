const BASE_URL = 'http://localhost:3000';

// Test data
const testUser = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'testPassword123'
};

const testUser2 = {
  name: 'Test User 2',
  email: 'test2@example.com',
  password: 'testPassword456'
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
    const data = await response.json();

    console.log(`📊 Status: ${response.status}`);
    console.log('📦 Response:', JSON.stringify(data, null, 2));

    return { response, data };
  } catch (error) {
    console.error(`❌ Request failed:`, error.message);
    return { error };
  }
}

// Test functions
async function testHealthCheck() {
  console.log('\n=== HEALTH CHECK ===');
  const { data } = await makeRequest('/api/health');
  return data;
}

async function testRegistration() {
  console.log('\n=== REGISTRATION TESTS ===');

  // Test valid registration
  console.log('\n1. Valid Registration');
  const { data: registerData } = await makeRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(testUser)
  });

  if (registerData?.success) {
    console.log('✅ Registration successful');
  } else {
    console.log('❌ Registration failed:', registerData?.error);
  }

  // Test duplicate registration
  console.log('\n2. Duplicate Registration (should fail)');
  const { data: duplicateData } = await makeRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(testUser)
  });

  if (!duplicateData?.success && duplicateData?.error?.includes('already exists')) {
    console.log('✅ Duplicate registration properly rejected');
  } else {
    console.log('❌ Duplicate registration not handled correctly');
  }

  // Test invalid email
  console.log('\n3. Invalid Email Format');
  const { data: invalidEmailData } = await makeRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      ...testUser,
      email: 'invalid-email'
    })
  });

  if (!invalidEmailData?.success && invalidEmailData?.error?.includes('valid email')) {
    console.log('✅ Invalid email properly rejected');
  } else {
    console.log('❌ Invalid email not handled correctly');
  }

  // Test missing fields
  console.log('\n4. Missing Required Fields');
  const { data: missingFieldsData } = await makeRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: 'test3@example.com'
    })
  });

  if (!missingFieldsData?.success && missingFieldsData?.error?.includes('required')) {
    console.log('✅ Missing fields properly rejected');
  } else {
    console.log('❌ Missing fields not handled correctly');
  }

  // Test password too short
  console.log('\n5. Password Too Short');
  const { data: shortPasswordData } = await makeRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      ...testUser,
      email: 'test4@example.com',
      password: '123'
    })
  });

  if (!shortPasswordData?.success && shortPasswordData?.error?.includes('6 characters')) {
    console.log('✅ Short password properly rejected');
  } else {
    console.log('❌ Short password not handled correctly');
  }

  return registerData;
}

async function testLogin() {
  console.log('\n=== LOGIN TESTS ===');

  // Test valid login
  console.log('\n1. Valid Login');
  const { data: loginData } = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: testUser.email,
      password: testUser.password
    })
  });

  if (loginData?.success && loginData?.user && loginData?.session) {
    console.log('✅ Login successful');
    console.log('👤 User ID:', loginData.user.id);
    console.log('📧 Email:', loginData.user.email);
    console.log('🎭 Name:', loginData.user.name);
  } else {
    console.log('❌ Login failed:', loginData?.error);
  }

  // Test invalid credentials
  console.log('\n2. Invalid Credentials');
  const { data: invalidLoginData } = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: testUser.email,
      password: 'wrongpassword'
    })
  });

  if (!invalidLoginData?.success && invalidLoginData?.error?.includes('Invalid')) {
    console.log('✅ Invalid credentials properly rejected');
  } else {
    console.log('❌ Invalid credentials not handled correctly');
  }

  // Test missing fields
  console.log('\n3. Missing Fields');
  const { data: missingLoginData } = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: testUser.email
    })
  });

  if (!missingLoginData?.success && missingLoginData?.error?.includes('required')) {
    console.log('✅ Missing fields properly rejected');
  } else {
    console.log('❌ Missing fields not handled correctly');
  }

  // Test invalid email format
  console.log('\n4. Invalid Email Format');
  const { data: invalidEmailLoginData } = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'invalid-email',
      password: testUser.password
    })
  });

  if (!invalidEmailLoginData?.success && invalidEmailLoginData?.error?.includes('valid email')) {
    console.log('✅ Invalid email format properly rejected');
  } else {
    console.log('❌ Invalid email format not handled correctly');
  }

  return loginData;
}

async function testSession() {
  console.log('\n=== SESSION TESTS ===');

  // Test session check
  console.log('\n1. Session Check');
  const { data: sessionData } = await makeRequest('/api/auth/session');

  if (sessionData?.success) {
    if (sessionData.authenticated) {
      console.log('✅ User is authenticated');
      console.log('👤 User:', sessionData.user?.email);
    } else {
      console.log('ℹ️ No active session');
    }
  } else {
    console.log('❌ Session check failed:', sessionData?.error);
  }

  return sessionData;
}

async function testRefresh() {
  console.log('\n=== TOKEN REFRESH TESTS ===');

  // Test token refresh
  console.log('\n1. Token Refresh');
  const { data: refreshData } = await makeRequest('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({})
  });

  if (refreshData?.success && refreshData?.session) {
    console.log('✅ Token refresh successful');
    console.log('🔑 New token expires at:', new Date(refreshData.session.expires_at * 1000));
  } else {
    console.log('❌ Token refresh failed:', refreshData?.error);
  }

  return refreshData;
}

async function testResetPassword() {
  console.log('\n=== PASSWORD RESET TESTS ===');

  // Test password reset request
  console.log('\n1. Password Reset Request');
  const { data: resetData } = await makeRequest('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({
      email: testUser.email
    })
  });

  if (resetData?.success && resetData?.message) {
    console.log('✅ Password reset request successful');
    console.log('📧 Message:', resetData.message);
  } else {
    console.log('❌ Password reset request failed:', resetData?.error);
  }

  // Test invalid email
  console.log('\n2. Invalid Email for Reset');
  const { data: invalidResetData } = await makeRequest('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({
      email: 'invalid-email'
    })
  });

  if (!invalidResetData?.success && invalidResetData?.error?.includes('valid email')) {
    console.log('✅ Invalid email properly rejected');
  } else {
    console.log('❌ Invalid email not handled correctly');
  }

  // Test missing email
  console.log('\n3. Missing Email for Reset');
  const { data: missingResetData } = await makeRequest('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({})
  });

  if (!missingResetData?.success && missingResetData?.error?.includes('required')) {
    console.log('✅ Missing email properly rejected');
  } else {
    console.log('❌ Missing email not handled correctly');
  }

  return resetData;
}

async function testLogout() {
  console.log('\n=== LOGOUT TESTS ===');

  // Test logout
  console.log('\n1. Logout');
  const { data: logoutData } = await makeRequest('/api/auth/logout', {
    method: 'POST'
  });

  if (logoutData?.success) {
    console.log('✅ Logout successful');
  } else {
    console.log('❌ Logout failed:', logoutData?.error);
  }

  // Verify session is gone
  console.log('\n2. Verify Session Cleared');
  const { data: sessionAfterLogout } = await makeRequest('/api/auth/session');

  if (sessionAfterLogout?.success && !sessionAfterLogout.authenticated) {
    console.log('✅ Session properly cleared after logout');
  } else {
    console.log('❌ Session not properly cleared');
  }

  return logoutData;
}

async function testMethodNotAllowed() {
  console.log('\n=== METHOD NOT ALLOWED TESTS ===');

  // Test GET on POST-only endpoints
  const endpoints = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/logout',
    '/api/auth/reset-password',
    '/api/auth/refresh'
  ];

  for (const endpoint of endpoints) {
    console.log(`\n${endpoint} - GET request (should fail)`);
    const { data } = await makeRequest(endpoint, { method: 'GET' });

    if (data?.error?.includes('Method not allowed')) {
      console.log('✅ Properly rejected GET request');
    } else {
      console.log('❌ GET request not properly rejected');
    }
  }

  // Test POST on GET-only endpoints
  console.log('\n/api/auth/session - POST request (should fail)');
  const { data: sessionPostData } = await makeRequest('/api/auth/session', {
    method: 'POST',
    body: JSON.stringify({})
  });

  if (sessionPostData?.error?.includes('Method not allowed')) {
    console.log('✅ Properly rejected POST request on session endpoint');
  } else {
    console.log('❌ POST request not properly rejected on session endpoint');
  }
}

async function testRateLimiting() {
  console.log('\n=== RATE LIMITING TESTS ===');
  console.log('ℹ️ Making multiple rapid requests to test rate limiting...');

  const testEmail = 'ratelimit@example.com';
  const rapidRequests = [];

  // Make 10 rapid login requests with wrong password
  for (let i = 0; i < 10; i++) {
    rapidRequests.push(
      makeRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: testEmail,
          password: 'wrongpassword'
        })
      })
    );
  }

  const results = await Promise.all(rapidRequests);

  let rateLimitedCount = 0;
  results.forEach((result, index) => {
    if (result.data?.error?.includes('Too many') || result.data?.error?.includes('rate limit')) {
      rateLimitedCount++;
    }
  });

  if (rateLimitedCount > 0) {
    console.log(`✅ Rate limiting activated after multiple attempts (${rateLimitedCount}/10 requests blocked)`);
  } else {
    console.log('ℹ️ Rate limiting not triggered (may be disabled in development)');
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Authentication API Tests');
  console.log('=====================================');

  try {
    // Health check first
    const health = await testHealthCheck();
    if (!health || health.status !== 'ok') {
      console.log('❌ Health check failed, aborting tests');
      return;
    }

    // Run registration tests
    await testRegistration();

    // Run login tests
    const loginResult = await testLogin();

    // If login successful, test authenticated endpoints
    if (loginResult?.success) {
      await testSession();
      await testRefresh();
      await testResetPassword();
      await testLogout();
    }

    // Test method not allowed
    await testMethodNotAllowed();

    // Test rate limiting (may not trigger in development)
    await testRateLimiting();

    console.log('\n✅ All authentication API tests completed!');
    console.log('=====================================');

  } catch (error) {
    console.error('\n❌ Test runner failed:', error);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  runAllTests,
  testRegistration,
  testLogin,
  testSession,
  testRefresh,
  testResetPassword,
  testLogout,
  testMethodNotAllowed,
  testRateLimiting
};
