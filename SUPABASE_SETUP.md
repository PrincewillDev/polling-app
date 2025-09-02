# Supabase Environment Setup Guide

This guide will help you set up your Supabase environment for the Polling App.

## 🚀 Quick Setup

### 1. Copy Environment Template
```bash
cp .env.example .env.local
```

### 2. Get Your Supabase Credentials

#### Option A: Using Supabase Cloud (Recommended for Production)
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for your database to be ready (2-3 minutes)
3. Go to **Settings** → **API**
4. Copy the values you need:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Project API Keys** → `anon/public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Project API Keys** → `service_role` (keep secret!) → `SUPABASE_SERVICE_ROLE_KEY`

#### Option B: Using Local Supabase (For Development)
```bash
# Install Supabase CLI if you haven't already
npm install -g supabase

# Initialize and start local Supabase
cd polling-app
supabase init
supabase start
```

Local credentials (use these in .env.local for local development):
```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
```

### 3. Configure Your .env.local File

Replace the placeholder values in `.env.local`:

```env
# Required - Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-actual-supabase-url-here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key-here

# Required - Next.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-secret-string-here

# Optional - App Configuration
APP_URL=http://localhost:3000
NODE_ENV=development
```

### 4. Set Up the Database Schema

#### For Supabase Cloud:
```bash
# Link to your cloud project
supabase link --project-ref your-project-ref-from-dashboard

# Push the schema to your cloud database
supabase db push
```

#### For Local Supabase:
```bash
# Reset database with migrations (includes seed data)
supabase db reset
```

### 5. Verify Setup

Test your connection:
```bash
# Start your Next.js app
npm run dev

# Visit http://localhost:3000
# You should be able to register/login and see polls
```

## 🔧 Environment Variables Explained

### Required Variables

| Variable | Description | Where to Find |
|----------|-------------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public API key for client-side | Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret key for server operations | Project Settings → API |
| `NEXTAUTH_URL` | Your app URL | Usually `http://localhost:3000` |
| `NEXTAUTH_SECRET` | Random secret for JWT signing | Generate with `openssl rand -base64 32` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `APP_URL` | Your app's public URL | `http://localhost:3000` |
| `NODE_ENV` | Environment mode | `development` |

## 🗄️ Database Schema Features

Your database includes:

- ✅ **User Authentication** (via Supabase Auth)
- ✅ **Poll Management** (create, edit, delete)
- ✅ **Voting System** (single/multiple choice, anonymous)
- ✅ **Comments & Discussions** (threaded conversations)
- ✅ **Analytics & Tracking** (views, engagement metrics)
- ✅ **Row Level Security** (data protection)
- ✅ **Test Data** (sample polls and users)

## 🧪 Test Your Setup

After setup, you can:

1. **Register a new account** at `/register`
2. **Login** with demo credentials: `demo@example.com` / `password`
3. **Create a poll** from the dashboard
4. **Vote on existing polls** (check the seed data)
5. **View analytics** for your polls

## 🚧 Troubleshooting

### Common Issues

#### 1. "Failed to fetch" errors
- Check your Supabase URL and keys are correct
- Ensure your Supabase project is running
- Verify CORS settings in Supabase dashboard

#### 2. Authentication not working
- Check `NEXTAUTH_URL` matches your app URL
- Ensure `NEXTAUTH_SECRET` is set
- Verify Supabase Auth is enabled

#### 3. Database connection issues
- Confirm your service role key is correct
- Check if RLS policies allow your operations
- Verify migrations have been applied

#### 4. Local Supabase not starting
```bash
# Stop and restart
supabase stop
supabase start

# Reset if needed
supabase db reset
```

### Getting Help

1. **Check Supabase Logs**: Go to your project dashboard → Logs
2. **Review Browser Console**: Look for JavaScript errors
3. **Check Network Tab**: Verify API requests are being sent
4. **Supabase Documentation**: [docs.supabase.com](https://docs.supabase.com)

## 🎯 Next Steps

Once your environment is set up:

1. **Replace Mock Data**: Update your components to use Supabase instead of mock functions
2. **Enable Real Auth**: Replace the mock auth provider with Supabase auth
3. **Add Real-time Features**: Use Supabase real-time subscriptions
4. **Deploy**: Push to production with your cloud Supabase instance

## 🔐 Security Notes

- ✅ Never commit `.env.local` to version control
- ✅ Keep service role key secret and server-side only  
- ✅ Use anon key for client-side operations
- ✅ RLS policies protect your data automatically
- ✅ All user data is encrypted at rest

Your polling app is now ready with a production-grade database! 🚀