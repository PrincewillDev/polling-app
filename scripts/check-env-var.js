require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });
console.log('Attempting to read SUPABASE_SERVICE_ROLE_KEY from .env.local...');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (serviceKey) {
  console.log('Successfully loaded SUPABASE_SERVICE_ROLE_KEY.');
  // console.log('Value:', serviceKey); // Keep it masked for security
} else {
  console.log('Failed to load SUPABASE_SERVICE_ROLE_KEY.');
}
