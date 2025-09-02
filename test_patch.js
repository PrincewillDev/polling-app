const fetch = require('node-fetch');

async function testPatchEndpoint() {
  const pollId = 'b1b3ac0f-e064-4e52-bf3c-9ec162f64ebd'; // Replace with actual poll ID
  const baseUrl = 'http://localhost:3000';

  try {
    // First, let's get a session token (simulate user authentication)
    // For now, we'll use a mock token - in real scenario this would come from auth
    const mockToken = 'eyJhbGciOiJIUzI1NiIsImtpZCI6IjVYRzFnUDJOTnh2QnczOCIsInR5cCI6IkpXVCJ9.test';

    // Test data for updating poll
    const updateData = {
      title: 'Updated Poll Title',
      description: 'This is an updated description',
      category: 'Technology',
      status: 'active',
      allowMultipleChoice: false,
      requireAuth: true,
      isAnonymous: false,
      showResults: 'after-vote',
      isPublic: true,
      tags: ['test', 'updated']
    };

    console.log('Testing PATCH endpoint...');
    console.log('Poll ID:', pollId);
    console.log('Update data:', JSON.stringify(updateData, null, 2));

    const response = await fetch(`${baseUrl}/api/polls/${pollId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mockToken}`
      },
      body: JSON.stringify(updateData)
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers));

    const responseData = await response.text();
    console.log('Response body:', responseData);

    if (!response.ok) {
      console.error('Request failed with status:', response.status);
      try {
        const errorData = JSON.parse(responseData);
        console.error('Error details:', JSON.stringify(errorData, null, 2));
      } catch (e) {
        console.error('Could not parse error response as JSON');
      }
    } else {
      console.log('✅ PATCH request successful!');
      try {
        const successData = JSON.parse(responseData);
        console.log('Success data:', JSON.stringify(successData, null, 2));
      } catch (e) {
        console.error('Could not parse success response as JSON');
      }
    }

  } catch (error) {
    console.error('Network error:', error.message);
  }
}

// Run the test
testPatchEndpoint();
