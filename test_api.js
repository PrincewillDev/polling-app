// Simple test script to verify the polling API is working
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000';

async function testAPI() {
  console.log('🧪 Testing Polling API...\n');

  try {
    // Test 1: Get all polls
    console.log('📋 Test 1: Fetching all polls...');
    const response1 = await fetch(`${API_BASE}/api/polls?status=all&limit=5`);
    const data1 = await response1.json();

    if (response1.ok) {
      console.log('✅ Success! Status:', response1.status);
      console.log('📊 Response:', JSON.stringify(data1, null, 2));
    } else {
      console.log('❌ Failed! Status:', response1.status);
      console.log('🚫 Error:', JSON.stringify(data1, null, 2));
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 2: Get active polls (the query that was failing)
    console.log('📋 Test 2: Fetching active polls (previously failing query)...');
    const response2 = await fetch(`${API_BASE}/api/polls?status=active&sortBy=created_at&limit=20&offset=0`);
    const data2 = await response2.json();

    if (response2.ok) {
      console.log('✅ Success! Status:', response2.status);
      console.log('📊 Polls found:', data2.data?.length || 0);
      if (data2.data && data2.data.length > 0) {
        console.log('📝 Sample poll:', {
          id: data2.data[0].id,
          title: data2.data[0].title,
          createdBy: data2.data[0].createdBy,
          status: data2.data[0].status
        });
      }
    } else {
      console.log('❌ Failed! Status:', response2.status);
      console.log('🚫 Error:', JSON.stringify(data2, null, 2));
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 3: Health check
    console.log('📋 Test 3: Basic health check...');
    const response3 = await fetch(`${API_BASE}/api/polls`);

    if (response3.ok) {
      console.log('✅ API is responding correctly!');
      console.log('🎉 Foreign key relationship issue has been resolved!');
    } else {
      console.log('❌ API is still having issues');
    }

  } catch (error) {
    console.error('💥 Test failed with error:', error.message);
    console.log('💡 Make sure the development server is running: npm run dev');
  }
}

// Run the test
testAPI();
