#!/usr/bin/env node

// Environment Configuration Checker for Polling App
// Run with: node scripts/check-env.js

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking Polling App Environment Configuration...\n');

// Check if .env.local exists
const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local file not found!');
    console.log('📝 Create .env.local by copying from .env.example:');
    console.log('   cp .env.example .env.local\n');
    process.exit(1);
}

// Load environment variables
require('dotenv').config({ path: envPath });

const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
];

const optionalVars = [
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
    'APP_URL'
];

let allGood = true;

console.log('📋 Required Environment Variables:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
        console.log(`✅ ${varName}: ${value.substring(0, 20)}...`);
    } else {
        console.log(`❌ ${varName}: MISSING`);
        allGood = false;
    }
});

console.log('\n📋 Optional Environment Variables:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

optionalVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
        console.log(`✅ ${varName}: ${value}`);
    } else {
        console.log(`⚠️  ${varName}: Not set (using default)`);
    }
});

console.log('\n🔗 Supabase Connection Test:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Basic URL validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (supabaseUrl) {
    try {
        const url = new URL(supabaseUrl);
        if (url.hostname.includes('supabase.co') || url.hostname === '127.0.0.1') {
            console.log(`✅ Supabase URL format looks valid: ${url.hostname}`);
        } else {
            console.log(`⚠️  Unusual Supabase URL: ${url.hostname}`);
        }
    } catch (e) {
        console.log(`❌ Invalid Supabase URL format: ${supabaseUrl}`);
        allGood = false;
    }
}

// Key format validation
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (anonKey && anonKey.startsWith('eyJ')) {
    console.log('✅ Anon key format looks valid (JWT)');
} else if (anonKey) {
    console.log('⚠️  Anon key format unusual (should be JWT starting with "eyJ")');
} else {
    console.log('❌ Anon key missing');
    allGood = false;
}

if (serviceKey && serviceKey.startsWith('eyJ')) {
    console.log('✅ Service role key format looks valid (JWT)');
} else if (serviceKey) {
    console.log('⚠️  Service role key format unusual (should be JWT starting with "eyJ")');
} else {
    console.log('❌ Service role key missing - this is critical for user management!');
    allGood = false;
}

console.log('\n🎯 Quick Setup Guide:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

if (!allGood) {
    console.log('\n❌ Issues found! Here\'s how to fix them:\n');

    console.log('1. 🏗️  For Supabase Cloud:');
    console.log('   • Go to https://supabase.com/dashboard');
    console.log('   • Select your project');
    console.log('   • Go to Settings → API');
    console.log('   • Copy "Project URL" to NEXT_PUBLIC_SUPABASE_URL');
    console.log('   • Copy "anon/public" key to NEXT_PUBLIC_SUPABASE_ANON_KEY');
    console.log('   • Copy "service_role" key to SUPABASE_SERVICE_ROLE_KEY');

    console.log('\n2. 🖥️  For Local Development:');
    console.log('   • Run: supabase start');
    console.log('   • Use these local values:');
    console.log('     NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321');
    console.log('     NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0');
    console.log('     SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU');
} else {
    console.log('✅ All required environment variables are set!');
    console.log('🚀 You should be ready to run the app.');
}

console.log('\n📚 Need more help?');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('• Check SUPABASE_SETUP.md for detailed instructions');
console.log('• Run: npm run dev (after fixing any issues)');
console.log('• Visit: http://localhost:3000');

console.log('\n' + '='.repeat(50));
if (allGood) {
    console.log('🎉 Environment check passed! Ready to go!');
    process.exit(0);
} else {
    console.log('🔧 Please fix the issues above and run this check again.');
    process.exit(1);
}
