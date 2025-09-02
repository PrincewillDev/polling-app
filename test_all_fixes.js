const fetch = require('node-fetch');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TEST_POLL_ID = 'b1b3ac0f-e064-4e52-bf3c-9ec162f64ebd'; // Replace with actual poll ID
const MOCK_TOKEN = 'eyJhbGciOiJIUzI1NiIsImtpZCI6IjVYRzFnUDJOTnh2QnczOCIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzM1NjM0MTMxLCJpYXQiOjE3MzU2MzA1MzEsImlzcyI6Imh0dHBzOi8vZG5veHBibnVicWFleXFlcHJqZ2wuc3VwYWJhc2UuY28vYXV0aC92MSIsInN1YiI6ImUzMWM2MDZhLTA5NWEtNGRmNi04YmZmLWJmZWQxNzc5YTgyZiIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnt9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzM1NjMwNTMxfV0sInNlc3Npb25faWQiOiI3NGEyYjg4MS04YzE1LTQ4MzEtOWNhZS1mNmNhMzc5NmYyYWEifQ.test'; // Mock token for testing

// Test results storage
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

function recordTest(testName, passed, details = '') {
  testResults.tests.push({ testName, passed, details });
  if (passed) {
    testResults.passed++;
    log(`${testName}: PASSED ${details}`, 'success');
  } else {
    testResults.failed++;
    log(`${testName}: FAILED ${details}`, 'error');
  }
}

// Test functions
async function testPollView() {
  try {
    log('Testing poll view (GET /polls/[id])...');

    const response = await fetch(`${BASE_URL}/api/polls/${TEST_POLL_ID}`);
    const data = await response.json();

    if (response.ok && data.success) {
      recordTest('Poll View', true, `Poll found: "${data.data.title}"`);
      return data.data;
    } else {
      recordTest('Poll View', false, `Status: ${response.status}, Error: ${data.error || 'Unknown'}`);
      return null;
    }
  } catch (error) {
    recordTest('Poll View', false, `Network error: ${error.message}`);
    return null;
  }
}

async function testVoteStatus() {
  try {
    log('Testing vote status check (GET /polls/[id]/vote)...');

    const response = await fetch(`${BASE_URL}/api/polls/${TEST_POLL_ID}/vote`, {
      headers: {
        'Authorization': `Bearer ${MOCK_TOKEN}`
      }
    });

    const data = await response.json();

    if (response.ok && data.success !== undefined) {
      recordTest('Vote Status Check', true, `Has voted: ${data.data?.hasVoted || 'unknown'}`);
      return data.data;
    } else {
      recordTest('Vote Status Check', false, `Status: ${response.status}, Error: ${data.error || 'Unknown'}`);
      return null;
    }
  } catch (error) {
    recordTest('Vote Status Check', false, `Network error: ${error.message}`);
    return null;
  }
}

async function testVoting(pollData) {
  try {
    log('Testing voting (POST /polls/[id]/vote)...');

    if (!pollData || !pollData.options || pollData.options.length === 0) {
      recordTest('Voting', false, 'No poll data or options available');
      return false;
    }

    // Select first option for testing
    const selectedOption = pollData.options[0].id;

    const response = await fetch(`${BASE_URL}/api/polls/${TEST_POLL_ID}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MOCK_TOKEN}`
      },
      body: JSON.stringify({
        optionIds: [selectedOption]
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      recordTest('Voting', true, 'Vote submitted successfully');
      return true;
    } else if (response.status === 400 && data.error?.includes('already voted')) {
      recordTest('Voting', true, 'User already voted (expected behavior)');
      return true;
    } else {
      recordTest('Voting', false, `Status: ${response.status}, Error: ${data.error || 'Unknown'}`);
      return false;
    }
  } catch (error) {
    recordTest('Voting', false, `Network error: ${error.message}`);
    return false;
  }
}

async function testPollUpdate() {
  try {
    log('Testing poll update (PATCH /polls/[id])...');

    const updateData = {
      title: 'Test Updated Poll - ' + Date.now(),
      description: 'This poll was updated by the test script',
      category: 'Technology',
      status: 'active',
      allowMultipleChoice: false,
      requireAuth: true,
      isAnonymous: false,
      showResults: 'after-vote',
      isPublic: true,
      tags: ['test', 'automation']
    };

    const response = await fetch(`${BASE_URL}/api/polls/${TEST_POLL_ID}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MOCK_TOKEN}`
      },
      body: JSON.stringify(updateData)
    });

    const data = await response.json();

    if (response.ok && data.success) {
      recordTest('Poll Update', true, 'Poll updated successfully');
      return true;
    } else {
      recordTest('Poll Update', false, `Status: ${response.status}, Error: ${data.error || 'Unknown'}, Details: ${JSON.stringify(data.details || {})}`);
      return false;
    }
  } catch (error) {
    recordTest('Poll Update', false, `Network error: ${error.message}`);
    return false;
  }
}

async function testFrontendRoutes() {
  try {
    log('Testing frontend routes...');

    // Test poll view page
    const pollViewResponse = await fetch(`${BASE_URL}/polls/${TEST_POLL_ID}`);
    const pollViewContent = await pollViewResponse.text();

    if (pollViewResponse.ok && pollViewContent.includes('html')) {
      recordTest('Poll View Page', true, 'Page loads correctly');
    } else {
      recordTest('Poll View Page', false, `Status: ${pollViewResponse.status}`);
    }

    // Test poll edit page
    const editResponse = await fetch(`${BASE_URL}/polls/${TEST_POLL_ID}/edit`);
    const editContent = await editResponse.text();

    if (editResponse.ok && editContent.includes('html')) {
      recordTest('Poll Edit Page', true, 'Page loads correctly');
    } else {
      recordTest('Poll Edit Page', false, `Status: ${editResponse.status}`);
    }

  } catch (error) {
    recordTest('Frontend Routes', false, `Network error: ${error.message}`);
  }
}

async function testAuthentication() {
  try {
    log('Testing authentication...');

    // Test without token
    const noTokenResponse = await fetch(`${BASE_URL}/api/polls/${TEST_POLL_ID}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title: 'Test' })
    });

    if (noTokenResponse.status === 401) {
      recordTest('Authentication Required', true, 'Correctly rejects requests without auth');
    } else {
      recordTest('Authentication Required', false, `Expected 401, got ${noTokenResponse.status}`);
    }

    // Test with invalid token
    const invalidTokenResponse = await fetch(`${BASE_URL}/api/polls/${TEST_POLL_ID}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid_token'
      },
      body: JSON.stringify({ title: 'Test' })
    });

    if (invalidTokenResponse.status === 401) {
      recordTest('Invalid Token Rejection', true, 'Correctly rejects invalid tokens');
    } else {
      recordTest('Invalid Token Rejection', false, `Expected 401, got ${invalidTokenResponse.status}`);
    }

  } catch (error) {
    recordTest('Authentication', false, `Network error: ${error.message}`);
  }
}

// Main test runner
async function runAllTests() {
  log('🚀 Starting comprehensive polling app test suite...');
  log(`Testing against: ${BASE_URL}`);
  log(`Poll ID: ${TEST_POLL_ID}`);

  console.log('\n' + '='.repeat(60));
  console.log('POLLING APP - COMPREHENSIVE TEST SUITE');
  console.log('='.repeat(60) + '\n');

  // Test 1: Frontend Routes (404 fix verification)
  await testFrontendRoutes();

  console.log('\n' + '-'.repeat(40));

  // Test 2: API Authentication
  await testAuthentication();

  console.log('\n' + '-'.repeat(40));

  // Test 3: Poll View API
  const pollData = await testPollView();

  console.log('\n' + '-'.repeat(40));

  // Test 4: Vote Status Check
  await testVoteStatus();

  console.log('\n' + '-'.repeat(40));

  // Test 5: Voting Functionality
  await testVoting(pollData);

  console.log('\n' + '-'.repeat(40));

  // Test 6: Poll Update (the main issue we fixed)
  await testPollUpdate();

  console.log('\n' + '='.repeat(60));
  console.log('TEST RESULTS SUMMARY');
  console.log('='.repeat(60));

  testResults.tests.forEach(test => {
    const status = test.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${test.testName}: ${test.details}`);
  });

  console.log('\n' + '-'.repeat(40));
  console.log(`Total Tests: ${testResults.passed + testResults.failed}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`Success Rate: ${Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100)}%`);

  if (testResults.failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! The polling app is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the details above.');
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nTest interrupted. Exiting...');
  process.exit(0);
});

// Run the tests
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('Fatal test error:', error);
    process.exit(1);
  });
}

module.exports = { runAllTests, testResults };
